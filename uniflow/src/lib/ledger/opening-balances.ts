import 'server-only';
import type { SubledgerType } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { money, sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import { post, type PostedVoucher, type PostingLine } from './posting';
import { toDateOnly } from './period';

/**
 * Go-live opening balances (SRS REQ-PER-03).
 *
 * This is the entire data-onboarding story. The scope decision recorded in SRS
 * §6 is that no historical transactions are migrated: a university arrives with
 * a position, not a history. Every balance it brings enters here, once, as one
 * voucher.
 *
 * Three properties, each enforced rather than advised:
 *
 *   1. **It balances.** Debits equal credits before anything is written. A
 *      university that goes live out of balance never finds out where the
 *      difference came from, because there is no prior period to compare with.
 *   2. **Control accounts carry their parties.** A balance on Student AR
 *      without a student attached is a number nobody can chase. The database
 *      refuses it (postability) and `checkOpeningBalances` reports it before
 *      the refusal, so the message names the account rather than a constraint.
 *   3. **It is not movement.** The voucher is flagged `isOpeningEntry`, which
 *      routes it into the `opening_*` columns of the period aggregates. A
 *      trial balance therefore shows the university's starting position as an
 *      opening balance, not as January activity — which would report the whole
 *      institution as having come into existence in one month.
 *
 * Once entered it can be corrected only by reversal, like any other posting.
 * There is no edit mode, because there is no such thing as quietly adjusting
 * where the books started.
 */

export class OpeningBalanceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OpeningBalanceError';
  }
}

export interface OpeningBalanceLine {
  accountId: string;
  /** Exactly one of debit/credit, positive. */
  debit?: MoneyInput;
  credit?: MoneyInput;
  costCenterId?: string | null;
  /** Required on a control account: whose balance this is. */
  subledgerType?: SubledgerType | null;
  subledgerId?: string | null;
  description?: string | null;
}

export interface EnterOpeningBalancesInput {
  /** The day the books open. Must fall in an OPEN period. */
  asOf: Date;
  lines: OpeningBalanceLine[];
  /** Shown on the voucher. Defaults to a stated go-live description. */
  description?: string;
}

export interface OpeningBalanceIssue {
  code:
    | 'UNBALANCED'
    | 'NO_LINES'
    | 'BOTH_SIDES'
    | 'NO_SIDE'
    | 'NEGATIVE'
    | 'NOT_POSTABLE'
    | 'INACTIVE'
    | 'CONTROL_WITHOUT_PARTY'
    | 'SUBLEDGER_TYPE_MISMATCH'
    | 'ALREADY_ENTERED';
  accountId?: string;
  accountCode?: string;
  message: string;
}

export interface OpeningBalanceCheck {
  ok: boolean;
  totalDebit: string;
  totalCredit: string;
  difference: string;
  issues: OpeningBalanceIssue[];
}

/**
 * Validate a proposed opening position without writing anything.
 *
 * The go-live screen calls this on every keystroke-settled edit so the person
 * entering a hundred balances sees the difference shrink to zero as they work,
 * rather than being told at the end that the total is out by 4,317.
 */
export async function checkOpeningBalances(
  principal: Principal,
  input: EnterOpeningBalancesInput,
): Promise<OpeningBalanceCheck> {
  requirePermission(principal, 'openingbalance.manage');
  return withTenant(principal.tenantId, (tx) =>
    validateOpeningBalances(tx, principal.tenantId, input),
  );
}

export async function validateOpeningBalances(
  tx: Tx,
  tenantId: string,
  input: EnterOpeningBalancesInput,
): Promise<OpeningBalanceCheck> {
  const issues: OpeningBalanceIssue[] = [];

  if (input.lines.length === 0) {
    issues.push({ code: 'NO_LINES', message: 'An opening position needs at least one balance.' });
  }

  const existing = await tx.transactionHeader.count({
    where: { tenantId, isOpeningEntry: true, reversedAt: null },
  });
  if (existing > 0) {
    issues.push({
      code: 'ALREADY_ENTERED',
      message:
        `This university already has ${existing} live opening entr${existing === 1 ? 'y' : 'ies'}. ` +
        `Reverse the existing one before entering a new position, so the two are never both live.`,
    });
  }

  const ids = [...new Set(input.lines.map((l) => l.accountId))];
  const accounts = await tx.account.findMany({
    where: { tenantId, id: { in: ids } },
    select: {
      id: true,
      code: true,
      isPostable: true,
      isActive: true,
      isControlAccount: true,
      subledgerType: true,
    },
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));

  let totalDebit = ZERO;
  let totalCredit = ZERO;

  for (const l of input.lines) {
    const a = byId.get(l.accountId);
    const code = a?.code;

    const hasDebit = l.debit !== undefined && l.debit !== null && l.debit !== '';
    const hasCredit = l.credit !== undefined && l.credit !== null && l.credit !== '';

    if (hasDebit && hasCredit) {
      issues.push({
        code: 'BOTH_SIDES',
        accountId: l.accountId,
        accountCode: code,
        message: `Account ${code ?? l.accountId} carries both a debit and a credit. An opening balance sits on one side.`,
      });
      continue;
    }
    if (!hasDebit && !hasCredit) {
      issues.push({
        code: 'NO_SIDE',
        accountId: l.accountId,
        accountCode: code,
        message: `Account ${code ?? l.accountId} has no amount.`,
      });
      continue;
    }

    const amount = toStorage(money((hasDebit ? l.debit : l.credit) as MoneyInput));
    if (amount.isNegative() || amount.isZero()) {
      issues.push({
        code: 'NEGATIVE',
        accountId: l.accountId,
        accountCode: code,
        message:
          `Account ${code ?? l.accountId} has an opening amount of ${amount.toFixed(4)}. ` +
          `Opening balances are entered as positive amounts on the side they belong on; ` +
          `a negative debit is a credit and should be entered as one.`,
      });
      continue;
    }

    if (!a) {
      issues.push({
        code: 'NOT_POSTABLE',
        accountId: l.accountId,
        message: `No account ${l.accountId} in this university's chart.`,
      });
      continue;
    }
    if (!a.isPostable) {
      issues.push({
        code: 'NOT_POSTABLE',
        accountId: a.id,
        accountCode: a.code,
        message: `Account ${a.code} is a heading, not a postable account. Enter the balance on the detail accounts beneath it.`,
      });
    }
    if (!a.isActive) {
      issues.push({
        code: 'INACTIVE',
        accountId: a.id,
        accountCode: a.code,
        message: `Account ${a.code} is deactivated. Reactivate it or move the balance elsewhere.`,
      });
    }
    if (a.isControlAccount && !l.subledgerId) {
      issues.push({
        code: 'CONTROL_WITHOUT_PARTY',
        accountId: a.id,
        accountCode: a.code,
        message:
          `Account ${a.code} is a control account, so every opening balance on it belongs to ` +
          `a named ${(a.subledgerType ?? 'party').toLowerCase()}. A lump sum here is a debt ` +
          `nobody can be asked to pay.`,
      });
    }
    if (a.isControlAccount && l.subledgerType && a.subledgerType && l.subledgerType !== a.subledgerType) {
      issues.push({
        code: 'SUBLEDGER_TYPE_MISMATCH',
        accountId: a.id,
        accountCode: a.code,
        message: `Account ${a.code} tracks ${a.subledgerType} balances; this line carries a ${l.subledgerType}.`,
      });
    }

    if (hasDebit) totalDebit = totalDebit.plus(amount);
    else totalCredit = totalCredit.plus(amount);
  }

  const difference = totalDebit.minus(totalCredit);
  if (!difference.isZero()) {
    issues.push({
      code: 'UNBALANCED',
      message:
        `Opening debits ${totalDebit.toFixed(2)} do not equal opening credits ` +
        `${totalCredit.toFixed(2)} — out by ${difference.toFixed(2)}. ` +
        `The university cannot go live from an unbalanced position: there is no earlier ` +
        `period to reconcile the difference against.`,
    });
  }

  return {
    ok: issues.length === 0,
    totalDebit: totalDebit.toFixed(4),
    totalCredit: totalCredit.toFixed(4),
    difference: difference.toFixed(4),
    issues,
  };
}

export interface EnteredOpeningBalances {
  voucher: PostedVoucher;
  lineCount: number;
  total: string;
}

/**
 * Post the opening position.
 *
 * Validates first and refuses the whole set on any issue — a partially entered
 * opening position is worse than none, because it looks like a complete one.
 */
export async function enterOpeningBalances(
  principal: Principal,
  input: EnterOpeningBalancesInput,
): Promise<EnteredOpeningBalances> {
  requirePermission(principal, 'openingbalance.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const check = await validateOpeningBalances(tx, principal.tenantId, input);
    if (!check.ok) {
      throw new OpeningBalanceError(
        `Opening balances rejected (${check.issues.length} issue${check.issues.length === 1 ? '' : 's'}): ` +
          check.issues.map((i) => i.message).join(' '),
      );
    }

    const asOf = toDateOnly(input.asOf);
    const lines: PostingLine[] = input.lines.map((l) => ({
      accountId: l.accountId,
      costCenterId: l.costCenterId ?? null,
      subledgerType: l.subledgerType ?? null,
      subledgerId: l.subledgerId ?? null,
      debit: l.debit ?? undefined,
      credit: l.credit ?? undefined,
      description: l.description ?? 'Opening balance',
    }));

    const voucher = await post(tx, principal.tenantId, {
      voucherType: 'OPENING_BALANCE',
      docDate: asOf,
      description: input.description ?? `Opening balances as at ${asOf.toISOString().slice(0, 10)}`,
      sourceModule: 'ONBOARDING',
      postedById: principal.userId,
      isOpeningEntry: true,
      lines,
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'POST',
      resourceType: 'opening_balances',
      resourceId: voucher.headerId,
      after: {
        voucherRef: voucher.voucherRef,
        asOf: asOf.toISOString().slice(0, 10),
        lines: lines.length,
        total: voucher.totalAmount,
      },
    });

    return { voucher, lineCount: lines.length, total: voucher.totalAmount };
  });
}

// ---------------------------------------------------------------------------
// Go-live readiness
// ---------------------------------------------------------------------------

export interface GoLiveCheckItem {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface GoLiveReadiness {
  ok: boolean;
  checks: GoLiveCheckItem[];
}

/**
 * The go-live checklist (SRS §6 step 4).
 *
 * Deliberately a report rather than a gate that flips a flag. Whether a
 * university is ready to go live is a judgement its bursar makes; what this
 * removes is the possibility of making that judgement without knowing that the
 * books do not balance.
 */
export async function goLiveReadiness(principal: Principal): Promise<GoLiveReadiness> {
  requirePermission(principal, 'openingbalance.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const checks: GoLiveCheckItem[] = [];

    const openings = await tx.transactionHeader.findMany({
      where: { tenantId: principal.tenantId, isOpeningEntry: true, reversedAt: null },
      select: { id: true, voucherRef: true, docDate: true, totalAmount: true },
    });

    checks.push({
      key: 'opening-entered',
      label: 'Opening balances entered',
      ok: openings.length === 1,
      detail:
        openings.length === 0
          ? 'No opening position has been entered.'
          : openings.length === 1
            ? `${openings[0].voucherRef} as at ${openings[0].docDate.toISOString().slice(0, 10)}, ${openings[0].totalAmount.toFixed(2)}.`
            : `${openings.length} live opening entries. Exactly one is expected; reverse the others.`,
    });

    // The engine refuses an unbalanced posting, so a posted opening entry
    // balances by construction. This re-reads the ledger anyway: the check is
    // worth nothing if it only re-asserts what the writer already guaranteed.
    const balance = await tx.transactionLine.aggregate({
      where: { header: { tenantId: principal.tenantId, isOpeningEntry: true, reversedAt: null } },
      _sum: { debitAmount: true, creditAmount: true },
    });
    const od = balance._sum.debitAmount ?? ZERO;
    const oc = balance._sum.creditAmount ?? ZERO;
    checks.push({
      key: 'opening-balanced',
      label: 'Opening debits equal opening credits',
      ok: od.equals(oc),
      detail: `Debits ${od.toFixed(2)}, credits ${oc.toFixed(2)}, difference ${od.minus(oc).toFixed(2)}.`,
    });

    const controls = await controlAccountVariances(tx, principal.tenantId);
    for (const c of controls) {
      checks.push({
        key: `control-${c.code}`,
        label: `${c.code} ${c.nameEn} agrees with its sub-ledger`,
        ok: c.variance.isZero(),
        detail: c.variance.isZero()
          ? `${c.parties} part${c.parties === 1 ? 'y' : 'ies'}, ${c.control.toFixed(2)}.`
          : `Control ${c.control.toFixed(2)} against ${c.subledger.toFixed(2)} across ${c.parties} ` +
            `part${c.parties === 1 ? 'y' : 'ies'} — out by ${c.variance.toFixed(2)}.`,
      });
    }

    const openPeriods = await tx.fiscalPeriod.count({
      where: { fiscalYear: { tenantId: principal.tenantId }, status: 'OPEN' },
    });
    checks.push({
      key: 'period-open',
      label: 'An open fiscal period exists',
      ok: openPeriods > 0,
      detail:
        openPeriods > 0
          ? `${openPeriods} period(s) open.`
          : 'No period is open, so nothing can be posted on day one.',
    });

    return { ok: checks.every((c) => c.ok), checks };
  });
}

interface ControlVariance {
  code: string;
  nameEn: string;
  control: Money;
  subledger: Money;
  parties: number;
  variance: Money;
}

/**
 * Every control account's own balance against the sum of the party balances
 * posted to it.
 *
 * This is the *within-ledger* form of the check: both sides come from
 * `transaction_lines`, so it proves that every balance on a control account
 * carries a party, not that the ledger agrees with the student or vendor
 * master. That second comparison is REQ-RPT-06 and lives in
 * `reports/reconciliation.ts`. At go-live the first is the one that matters —
 * there is no transaction history for the sub-ledger to disagree about yet.
 */
async function controlAccountVariances(
  tx: Tx,
  tenantId: string,
): Promise<ControlVariance[]> {
  const controls = await tx.account.findMany({
    where: { tenantId, isControlAccount: true },
    select: { id: true, code: true, nameEn: true },
    orderBy: { code: 'asc' },
  });

  const out: ControlVariance[] = [];
  for (const c of controls) {
    const lines = await tx.transactionLine.findMany({
      where: { accountId: c.id, header: { tenantId, reversedAt: null } },
      select: { debitAmount: true, creditAmount: true, subledgerId: true },
    });
    if (lines.length === 0) continue;

    const control = sum(lines.map((l) => l.debitAmount.minus(l.creditAmount)));
    const withParty = lines.filter((l) => l.subledgerId !== null);
    const subledger = sum(withParty.map((l) => l.debitAmount.minus(l.creditAmount)));

    out.push({
      code: c.code,
      nameEn: c.nameEn,
      control,
      subledger,
      parties: new Set(withParty.map((l) => l.subledgerId)).size,
      variance: control.minus(subledger),
    });
  }
  return out;
}
