import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { ZERO, type Money } from '@/lib/money';
import { ledgerSlice, twoSided, iso, ReportRangeError } from './balances';
import { loadReportChart, rollUp, isEmpty, type ReportAccount, type Totals } from './chart';

/**
 * Trial balance (ميزان المراجعة) — SRS REQ-RPT-03.
 *
 * Opening, movement and closing, each as a debit and a credit column, for
 * every level of the chart from 1 to 5.
 *
 * Two properties make this report worth trusting, and both are asserted rather
 * than assumed:
 *
 *   1. **It balances.** Total debits equal total credits in all three column
 *      pairs. If they ever do not, something has written to the ledger outside
 *      the posting engine, and `balanced: false` is the alarm.
 *   2. **Totals come from postable accounts only.** Parent rows are shown
 *      because REQ-RPT-03 asks for levels 1-5, but they are aggregates of the
 *      rows beneath them. Adding them into the total would count every figure
 *      five times.
 *
 * The legacy system could not produce this at all. It had no fiscal period
 * model, so there was nothing to open a balance *from*; the report screen
 * summed `TotalIn` and `TotalOut` over the whole of one of its two ledger
 * tables, which is a closing balance since inception and nothing else.
 */

export interface TrialBalanceOptions {
  /** Inclusive start of the movement window. */
  from: Date;
  /** Inclusive end of the movement window. */
  to: Date;
  /** Restrict to one cost centre. A segment does not balance — see below. */
  costCenterId?: string | null;
  /** Deepest level to include, 1-5. Defaults to 5 (every account). */
  maxLevel?: number;
  /** Include accounts with no opening balance and no movement. Default false. */
  includeZeroRows?: boolean;
  /** Include deactivated accounts that still carry a balance. Default true —
   *  an account is deactivated, never deleted, and hiding a deactivated
   *  account that still holds money is how a balance goes missing. */
  includeInactive?: boolean;
}

export interface TrialBalanceRow {
  accountId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  level: number;
  parentId: string | null;
  /** Only postable rows contribute to the totals. */
  isPostable: boolean;
  isActive: boolean;
  openingDebit: string;
  openingCredit: string;
  movementDebit: string;
  movementCredit: string;
  closingDebit: string;
  closingCredit: string;
}

export interface TrialBalanceTotals {
  openingDebit: string;
  openingCredit: string;
  movementDebit: string;
  movementCredit: string;
  closingDebit: string;
  closingCredit: string;
}

export interface TrialBalance {
  from: string;
  to: string;
  currency: string;
  costCenterId: string | null;
  rows: TrialBalanceRow[];
  totals: TrialBalanceTotals;
  /**
   * All three column pairs agree. False is a data-integrity alarm, not a
   * rounding nuisance.
   *
   * Always false-able for a cost-centre-filtered run, and legitimately so: a
   * segment of the ledger is not a ledger. A salary posting debits an expense
   * carrying a faculty cost centre and credits a bank account carrying none,
   * so filtering to that faculty keeps one side of the entry and drops the
   * other. `segmented` says which situation you are looking at.
   */
  balanced: boolean;
  /** True when a cost-centre filter was applied, so `balanced` is not expected. */
  segmented: boolean;
}

export async function trialBalance(
  principal: Principal,
  opts: TrialBalanceOptions,
): Promise<TrialBalance> {
  requirePermission(principal, 'report.financial');
  return withTenant(principal.tenantId, (tx) =>
    buildTrialBalance(tx, principal.tenantId, opts),
  );
}

/** The same report without a principal, for composition inside a transaction
 *  that is already doing other work — the period-close checklist, chiefly. */
export async function buildTrialBalance(
  tx: Tx,
  tenantId: string,
  opts: TrialBalanceOptions,
): Promise<TrialBalance> {
  const maxLevel = opts.maxLevel ?? 5;
  if (maxLevel < 1 || maxLevel > 5) {
    throw new ReportRangeError(`Account levels run 1 to 5; asked for ${maxLevel}.`);
  }
  const includeInactive = opts.includeInactive ?? true;

  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });

  const accounts = await loadReportChart(tx, tenantId);
  const slices = await ledgerSlice(tx, tenantId, {
    from: opts.from,
    to: opts.to,
    costCenterId: opts.costCenterId,
  });
  const totals = rollUp(accounts, slices);

  const rows: TrialBalanceRow[] = [];
  const grand = {
    openingDebit: ZERO,
    openingCredit: ZERO,
    movementDebit: ZERO,
    movementCredit: ZERO,
    closingDebit: ZERO,
    closingCredit: ZERO,
  };

  for (const a of accounts) {
    if (a.level > maxLevel) continue;
    if (!a.isActive && !includeInactive) continue;

    const t = totals.get(a.id);
    if (!t) continue;
    if (!opts.includeZeroRows && isEmpty(t)) continue;

    const row = presentRow(a, t);
    rows.push(row);

    // Postable accounts are the leaves; everything above them is a sum of
    // them. Totalling both would count each figure once per level it appears.
    if (a.isPostable) {
      const c = columns(t);
      grand.openingDebit = grand.openingDebit.plus(c.openingDebit);
      grand.openingCredit = grand.openingCredit.plus(c.openingCredit);
      grand.movementDebit = grand.movementDebit.plus(c.movementDebit);
      grand.movementCredit = grand.movementCredit.plus(c.movementCredit);
      grand.closingDebit = grand.closingDebit.plus(c.closingDebit);
      grand.closingCredit = grand.closingCredit.plus(c.closingCredit);
    }
  }

  const segmented = Boolean(opts.costCenterId);
  const balanced =
    grand.openingDebit.equals(grand.openingCredit) &&
    grand.movementDebit.equals(grand.movementCredit) &&
    grand.closingDebit.equals(grand.closingCredit);

  return {
    from: iso(opts.from),
    to: iso(opts.to),
    currency: tenant.functionalCurrency.trim(),
    costCenterId: opts.costCenterId ?? null,
    rows,
    totals: {
      openingDebit: grand.openingDebit.toFixed(4),
      openingCredit: grand.openingCredit.toFixed(4),
      movementDebit: grand.movementDebit.toFixed(4),
      movementCredit: grand.movementCredit.toFixed(4),
      closingDebit: grand.closingDebit.toFixed(4),
      closingCredit: grand.closingCredit.toFixed(4),
    },
    balanced,
    segmented,
  };
}

interface Columns {
  openingDebit: Money;
  openingCredit: Money;
  movementDebit: Money;
  movementCredit: Money;
  closingDebit: Money;
  closingCredit: Money;
}

/**
 * Net each pair down to one side.
 *
 * Note this nets on the RAW direction — debits minus credits — not on the
 * account's normal balance. A trial balance's two columns are debit and
 * credit, so a revenue account with a net credit belongs in the credit column
 * whatever its normal balance says it ought to be. Presenting it by normal
 * balance instead would hide the one thing a reader is looking for: an account
 * sitting on the wrong side.
 */
function columns(t: Totals): Columns {
  const opening = twoSided(t.openingDebit.minus(t.openingCredit));
  const movement = twoSided(t.movementDebit.minus(t.movementCredit));
  const closing = twoSided(
    t.openingDebit.plus(t.movementDebit).minus(t.openingCredit).minus(t.movementCredit),
  );
  return {
    openingDebit: opening.debit,
    openingCredit: opening.credit,
    movementDebit: movement.debit,
    movementCredit: movement.credit,
    closingDebit: closing.debit,
    closingCredit: closing.credit,
  };
}

function presentRow(a: ReportAccount, t: Totals): TrialBalanceRow {
  const c = columns(t);
  return {
    accountId: a.id,
    code: a.code,
    nameAr: a.nameAr,
    nameEn: a.nameEn,
    level: a.level,
    parentId: a.parentId,
    isPostable: a.isPostable,
    isActive: a.isActive,
    openingDebit: c.openingDebit.toFixed(4),
    openingCredit: c.openingCredit.toFixed(4),
    movementDebit: c.movementDebit.toFixed(4),
    movementCredit: c.movementCredit.toFixed(4),
    closingDebit: c.closingDebit.toFixed(4),
    closingCredit: c.closingCredit.toFixed(4),
  };
}
