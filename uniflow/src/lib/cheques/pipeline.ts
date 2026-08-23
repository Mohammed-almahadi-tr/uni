import 'server-only';
import type { ChequeStatus, SubledgerType } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { requireAccounts } from '@/lib/coa/mapping';
import { post, type PostingLine } from '@/lib/ledger/posting';
import { raiseChargesInTx } from '@/lib/billing/charge';
import { toDateOnly } from '@/lib/ledger/period';
import { buildSearchKey } from '@/lib/i18n/arabic';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';

/**
 * The cheque clearing pipeline (SRS Module 7, REQ-CHQ-01/02/03).
 *
 *     RECEIVED ──deposit──> SENT_TO_BANK ──clear──> CLEARED
 *        │                       │
 *        │                       └──bounce──> BOUNCED
 *        ├──bounce──> BOUNCED        (a post-dated cheque refused on presentation)
 *        └──cancel──> CANCELLED      (handed back before it was ever presented)
 *
 * **Every transition posts.** That is the whole point, and it is what the
 * legacy system did not do: `CheqClear` was a boolean on the `Transactions`
 * row, flipped by clicking a grid cell, which ran an `UPDATE` and nothing
 * else. Clearing a cheque never moved the bank balance. A bounced cheque never
 * reinstated the student's debt. And because `0` meant both "not presented
 * yet" and "refused", every cheque waiting in the drawer was displayed to
 * staff as bounced.
 *
 * The ledger consequences:
 *
 *   deposit  DR Cheques with Bank      CR Cheques on Hand
 *   clear    DR Bank                   CR Cheques with Bank
 *   bounce   DR Student AR / Credit    CR Cheques on Hand or with Bank
 *   cancel   DR Student AR / Credit    CR Cheques on Hand
 *
 * Bouncing splits its debit the same way the original receipt split its
 * credit: whatever the receipt had matched to charges goes back onto the
 * student's receivable, and whatever was left over as a credit balance comes
 * back off that liability. Anything else leaves the sub-ledger disagreeing
 * with its control accounts.
 */

export class ChequeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChequeError';
  }
}

/**
 * Identity of the person who wrote the cheque, normalised.
 *
 * Repeat-bounce reporting groups on this (REQ-CHQ-03), so it has to survive
 * the same Arabic spelling variance student names do. Falls back to the payer
 * when the drawer is not recorded — a cheque with no drawer named is still
 * somebody's cheque.
 */
export function drawerKeyFor(
  drawerName: string | null | undefined,
  bankName: string | null | undefined,
  subledgerId: string,
): string {
  const key = buildSearchKey(drawerName, bankName);
  return key || subledgerId;
}

export interface RegisterChequeInput {
  chequeNo: string;
  bankName?: string | null;
  branch?: string | null;
  drawerName?: string | null;
  dueDate: Date;
  amount: MoneyInput;
  currency: string;
  subledgerType: SubledgerType;
  subledgerId: string;
  receivedOn: Date;
  receiptId?: string | null;
  /** The refused cheque this one was handed over to replace. */
  replacesChequeId?: string | null;
}

/**
 * Record a cheque into the portfolio.
 *
 * Posts nothing of its own: the receipt that took it has already debited
 * cheques-on-hand. This is the portfolio entry that the legacy system never
 * had, and without which there is nothing to run a clearing cycle against.
 *
 * Called inside the caller's transaction so the cheque and the receipt that
 * created it either both exist or neither does.
 */
export async function registerCheque(
  tx: Tx,
  tenantId: string,
  actorId: string,
  input: RegisterChequeInput,
): Promise<{ id: string }> {
  const chequeNo = input.chequeNo?.trim();
  if (!chequeNo) throw new ChequeError('A cheque needs its number.');

  const amount = toStorage(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new ChequeError('A cheque must be for a positive amount.');
  }

  if (input.replacesChequeId) {
    const previous = await tx.cheque.findUnique({
      where: { id: input.replacesChequeId },
      select: { status: true, chequeNo: true },
    });
    if (!previous) throw new ChequeError('The cheque being replaced is not in this portfolio.');
    if (previous.status !== 'BOUNCED' && previous.status !== 'CANCELLED') {
      throw new ChequeError(
        `Cheque ${previous.chequeNo} is ${previous.status} and has not been returned. ` +
          `A replacement is for a cheque that came back.`,
      );
    }
  }

  const cheque = await tx.cheque.create({
    data: {
      tenantId,
      chequeNo,
      bankName: input.bankName?.trim() || null,
      branch: input.branch?.trim() || null,
      drawerName: input.drawerName?.trim() || null,
      drawerKey: drawerKeyFor(input.drawerName, input.bankName, input.subledgerId),
      dueDate: toDateOnly(input.dueDate),
      amount,
      currency: input.currency.trim(),
      subledgerType: input.subledgerType,
      subledgerId: input.subledgerId,
      status: 'RECEIVED',
      custody: 'VAULT',
      receiptId: input.receiptId ?? null,
      receivedOn: toDateOnly(input.receivedOn),
      replacesChequeId: input.replacesChequeId ?? null,
      createdById: actorId,
    },
    select: { id: true },
  });

  await audit(tx, tenantId, {
    actorId,
    action: 'INSERT',
    resourceType: 'cheque',
    resourceId: cheque.id,
    after: {
      chequeNo,
      bankName: input.bankName ?? null,
      dueDate: toDateOnly(input.dueDate).toISOString().slice(0, 10),
      amount: amount.toFixed(4),
      status: 'RECEIVED',
    },
  });

  return cheque;
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

interface LoadedCheque {
  id: string;
  chequeNo: string;
  amount: Money;
  status: ChequeStatus;
  subledgerType: SubledgerType;
  subledgerId: string;
  receiptId: string | null;
  depositAccountId: string | null;
  drawerName: string | null;
}

async function loadForTransition(
  tx: Tx,
  tenantId: string,
  chequeIds: string[],
  expected: ChequeStatus[],
): Promise<LoadedCheque[]> {
  if (chequeIds.length === 0) {
    throw new ChequeError('No cheques were selected.');
  }

  // Locked for the duration, so two clerks working the same bank advice do not
  // both post the same clearance.
  await tx.$queryRaw`
    SELECT id FROM cheques
     WHERE tenant_id = ${tenantId}::uuid AND id = ANY(${chequeIds}::uuid[])
     ORDER BY id
     FOR UPDATE
  `;

  const rows = await tx.cheque.findMany({
    where: { tenantId, id: { in: chequeIds } },
    select: {
      id: true,
      chequeNo: true,
      amount: true,
      status: true,
      subledgerType: true,
      subledgerId: true,
      receiptId: true,
      depositAccountId: true,
      drawerName: true,
    },
  });

  if (rows.length !== chequeIds.length) {
    throw new ChequeError('One or more of those cheques is not in this portfolio.');
  }
  const wrong = rows.filter((r) => !expected.includes(r.status));
  if (wrong.length > 0) {
    throw new ChequeError(
      `Cheque ${wrong[0].chequeNo} is ${wrong[0].status}; this action needs it to be ` +
        `${expected.join(' or ')}. Reload the list — somebody may have acted on it.`,
    );
  }
  return rows;
}

async function recordEvent(
  tx: Tx,
  tenantId: string,
  chequeId: string,
  from: ChequeStatus,
  to: ChequeStatus,
  actorId: string,
  docDate: Date,
  opts: { reasonCode?: string | null; comment?: string | null; postedHeaderId?: string | null } = {},
): Promise<void> {
  await tx.chequeEvent.create({
    data: {
      tenantId,
      chequeId,
      fromStatus: from,
      toStatus: to,
      docDate,
      actorId,
      reasonCode: opts.reasonCode ?? null,
      comment: opts.comment ?? null,
      postedHeaderId: opts.postedHeaderId ?? null,
    },
  });
}

export interface DepositResult {
  headerId: string;
  voucherRef: string;
  chequeCount: number;
  total: string;
}

/**
 * Send a batch of cheques to the bank for collection.
 *
 * A deposit slip carries many cheques and the bank credits it as one item, so
 * this posts one voucher for the batch. Doing it per cheque would make the
 * ledger impossible to tie back to the slip.
 */
export async function depositCheques(
  principal: Principal,
  chequeIds: string[],
  opts: { bankAccountId: string; docDate: Date; reference?: string | null },
): Promise<DepositResult> {
  requirePermission(principal, 'cheque.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const { tenantId } = principal;
    const cheques = await loadForTransition(tx, tenantId, chequeIds, ['RECEIVED']);

    const bank = await tx.account.findUnique({
      where: { id: opts.bankAccountId },
      select: { code: true, isActive: true, isPostable: true },
    });
    if (!bank) throw new ChequeError('That bank account is not in this tenant’s chart.');
    if (!bank.isActive || !bank.isPostable) {
      throw new ChequeError(`Account ${bank.code} cannot receive postings.`);
    }

    const accounts = await requireAccounts(tx, tenantId, [
      'CHEQUES_RECEIVABLE',
      'CHEQUES_WITH_BANK',
    ] as const);

    const total = sum(cheques.map((c) => c.amount));
    const docDate = toDateOnly(opts.docDate);

    const posted = await post(tx, tenantId, {
      voucherType: 'CHEQUE_MOVEMENT',
      docDate,
      description:
        `Cheques deposited for collection — ${cheques.length} cheque(s)` +
        (opts.reference ? ` — slip ${opts.reference}` : ''),
      sourceModule: 'CHEQUES',
      sourceRef: opts.reference ?? null,
      postedById: principal.userId,
      lines: [
        {
          accountId: accounts.CHEQUES_WITH_BANK,
          debit: total,
          description: 'Cheques lodged with the bank',
        },
        {
          accountId: accounts.CHEQUES_RECEIVABLE,
          credit: total,
          description: 'Cheques out of the vault',
        },
      ],
    });

    for (const c of cheques) {
      await tx.cheque.update({
        where: { id: c.id },
        data: {
          status: 'SENT_TO_BANK',
          custody: 'WITH_BANK',
          sentToBankOn: docDate,
          depositAccountId: opts.bankAccountId,
        },
      });
      await recordEvent(tx, tenantId, c.id, 'RECEIVED', 'SENT_TO_BANK', principal.userId, docDate, {
        comment: opts.reference ? `Deposit slip ${opts.reference}` : null,
        postedHeaderId: posted.headerId,
      });
    }

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'POST',
      resourceType: 'cheque.deposit',
      resourceId: posted.headerId,
      after: {
        voucherRef: posted.voucherRef,
        cheques: cheques.length,
        total: total.toFixed(4),
        bankAccount: bank.code,
        reference: opts.reference ?? null,
      },
    });

    return {
      headerId: posted.headerId,
      voucherRef: posted.voucherRef,
      chequeCount: cheques.length,
      total: total.toFixed(4),
    };
  });
}

/**
 * The bank paid them.
 *
 * `DR Bank · CR Cheques with Bank`. This is the entry the legacy system never
 * made: clicking "Cleared" there updated a boolean and left the bank balance
 * exactly where it was.
 */
export async function clearCheques(
  principal: Principal,
  chequeIds: string[],
  opts: { docDate: Date; reference?: string | null },
): Promise<DepositResult> {
  requirePermission(principal, 'cheque.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const { tenantId } = principal;
    const cheques = await loadForTransition(tx, tenantId, chequeIds, ['SENT_TO_BANK']);

    const accounts = await requireAccounts(tx, tenantId, ['CHEQUES_WITH_BANK'] as const);
    const docDate = toDateOnly(opts.docDate);

    // Cheques may have gone to different bank accounts in the same batch; each
    // bank is debited for its own.
    const byBank = new Map<string, Money>();
    for (const c of cheques) {
      if (!c.depositAccountId) {
        throw new ChequeError(
          `Cheque ${c.chequeNo} is marked as with the bank but records no bank account.`,
        );
      }
      byBank.set(
        c.depositAccountId,
        (byBank.get(c.depositAccountId) ?? ZERO).plus(c.amount),
      );
    }

    const total = sum(cheques.map((c) => c.amount));
    const lines: PostingLine[] = [];
    for (const [accountId, amount] of byBank) {
      lines.push({ accountId, debit: amount, description: 'Cheques cleared' });
    }
    lines.push({
      accountId: accounts.CHEQUES_WITH_BANK,
      credit: total,
      description: 'Cheques collected',
    });

    const posted = await post(tx, tenantId, {
      voucherType: 'CHEQUE_MOVEMENT',
      docDate,
      description:
        `Cheques cleared — ${cheques.length} cheque(s)` +
        (opts.reference ? ` — advice ${opts.reference}` : ''),
      sourceModule: 'CHEQUES',
      sourceRef: opts.reference ?? null,
      postedById: principal.userId,
      lines,
    });

    for (const c of cheques) {
      await tx.cheque.update({
        where: { id: c.id },
        data: { status: 'CLEARED', custody: 'SETTLED', settledOn: docDate },
      });
      await recordEvent(tx, tenantId, c.id, 'SENT_TO_BANK', 'CLEARED', principal.userId, docDate, {
        comment: opts.reference ? `Bank advice ${opts.reference}` : null,
        postedHeaderId: posted.headerId,
      });
    }

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'POST',
      resourceType: 'cheque.clearing',
      resourceId: posted.headerId,
      after: {
        voucherRef: posted.voucherRef,
        cheques: cheques.length,
        total: total.toFixed(4),
        reference: opts.reference ?? null,
      },
    });

    return {
      headerId: posted.headerId,
      voucherRef: posted.voucherRef,
      chequeCount: cheques.length,
      total: total.toFixed(4),
    };
  });
}

export interface BounceResult {
  headerId: string;
  voucherRef: string;
  /** Debt put back on the student's account. */
  reinstated: string;
  /** Credit balance taken back off. */
  creditWithdrawn: string;
  penaltyChargeId: string | null;
}

/**
 * The bank refused it (SRS REQ-CHQ-03).
 *
 * Reinstates the debt, hands the paper back to the drawer, records the bank's
 * refusal code verbatim, and optionally raises a returned-cheque fee. In the
 * legacy system marking a cheque "Rejected" set a boolean and did none of
 * this, so a student whose cheque bounced continued to show as paid.
 */
export async function bounceCheque(
  principal: Principal,
  chequeId: string,
  opts: {
    docDate: Date;
    reason: string;
    reasonCode?: string | null;
    /** Raise a returned-cheque fee at the same time. */
    penalty?: { feeItemId: string; amount: MoneyInput; costCenterId?: string | null } | null;
  },
): Promise<BounceResult> {
  requirePermission(principal, 'cheque.manage');
  // Raising the returned-cheque fee is billing a student, so it needs the
  // billing permission — recording the bounce itself does not.
  if (opts.penalty) requirePermission(principal, 'charge.create');

  const reason = opts.reason?.trim();
  if (!reason) {
    throw new ChequeError(
      'A bounce needs the bank’s reason. Without it, repeat-bounce reporting is guesswork ' +
        'and the student has nothing to take back to their bank.',
    );
  }

  return settleUnpaid(principal, chequeId, 'BOUNCED', {
    docDate: opts.docDate,
    reason,
    reasonCode: opts.reasonCode ?? null,
    penalty: opts.penalty ?? null,
  });
}

/**
 * Hand an unpresented cheque back to its drawer.
 *
 * Discretionary — the bank has not refused anything — so it demands a second
 * factor and is barred by the segregation matrix from being held with
 * `receipt.create`. Otherwise one person could take a cheque, hand it back,
 * and leave the student's account looking settled.
 */
export async function cancelCheque(
  principal: Principal,
  chequeId: string,
  opts: { docDate: Date; reason: string },
): Promise<BounceResult> {
  requirePermission(principal, 'cheque.cancel');

  const reason = opts.reason?.trim();
  if (!reason) throw new ChequeError('Returning a cheque to its drawer requires a stated reason.');

  return settleUnpaid(principal, chequeId, 'CANCELLED', {
    docDate: opts.docDate,
    reason,
    reasonCode: null,
    penalty: null,
  });
}

/**
 * The shared body of "this cheque will never turn into money".
 *
 * Bounce and cancel differ in who decided and whether a penalty follows; the
 * ledger consequence is the same, and writing it twice is how the two would
 * drift apart.
 */
async function settleUnpaid(
  principal: Principal,
  chequeId: string,
  to: 'BOUNCED' | 'CANCELLED',
  opts: {
    docDate: Date;
    reason: string;
    reasonCode: string | null;
    penalty: { feeItemId: string; amount: MoneyInput; costCenterId?: string | null } | null;
  },
): Promise<BounceResult> {
  const { tenantId } = principal;

  return withTenant(tenantId, async (tx) => {
    const expected: ChequeStatus[] = to === 'CANCELLED' ? ['RECEIVED'] : ['RECEIVED', 'SENT_TO_BANK'];
    const [cheque] = await loadForTransition(tx, tenantId, [chequeId], expected);

    const accounts = await requireAccounts(tx, tenantId, [
      'CHEQUES_RECEIVABLE',
      'CHEQUES_WITH_BANK',
      'STUDENT_AR_CONTROL',
      'STUDENT_CREDIT_CONTROL',
    ] as const);

    const docDate = toDateOnly(opts.docDate);
    const creditAccountId =
      cheque.status === 'SENT_TO_BANK'
        ? accounts.CHEQUES_WITH_BANK
        : accounts.CHEQUES_RECEIVABLE;

    // Split the debit exactly as the receipt split its credit, or the
    // sub-ledger stops agreeing with its control accounts.
    let reinstated: Money = cheque.amount;
    let creditWithdrawn: Money = ZERO;
    let receipt: { id: string; receiptNo: string; allocatedAmount: Money } | null = null;

    if (cheque.receiptId) {
      const r = await tx.studentReceipt.findUniqueOrThrow({
        where: { id: cheque.receiptId },
        select: {
          id: true,
          receiptNo: true,
          amount: true,
          allocatedAmount: true,
          cancelledAt: true,
          dishonouredAt: true,
        },
      });
      if (r.cancelledAt) {
        throw new ChequeError(
          `Receipt ${r.receiptNo} was already cancelled, which reversed this cheque. ` +
            `There is nothing further to unwind.`,
        );
      }
      if (r.dishonouredAt) {
        throw new ChequeError(`Receipt ${r.receiptNo} has already been recorded as dishonoured.`);
      }
      receipt = { id: r.id, receiptNo: r.receiptNo, allocatedAmount: r.allocatedAmount };
      reinstated = r.allocatedAmount;
      creditWithdrawn = r.amount.minus(r.allocatedAmount);
    }

    const lines: PostingLine[] = [];
    if (!reinstated.isZero()) {
      lines.push({
        accountId: accounts.STUDENT_AR_CONTROL,
        subledgerType: cheque.subledgerType,
        subledgerId: cheque.subledgerId,
        debit: reinstated,
        description: `Cheque ${cheque.chequeNo} ${to === 'BOUNCED' ? 'returned unpaid' : 'withdrawn'}`,
      });
    }
    if (!creditWithdrawn.isZero()) {
      lines.push({
        accountId: accounts.STUDENT_CREDIT_CONTROL,
        subledgerType: cheque.subledgerType,
        subledgerId: cheque.subledgerId,
        debit: creditWithdrawn,
        description: `Credit balance withdrawn — cheque ${cheque.chequeNo}`,
      });
    }
    lines.push({
      accountId: creditAccountId,
      credit: cheque.amount,
      description: `Cheque ${cheque.chequeNo} ${to === 'BOUNCED' ? 'returned by the bank' : 'returned to drawer'}`,
    });

    const posted = await post(tx, tenantId, {
      voucherType: 'CHEQUE_MOVEMENT',
      docDate,
      description:
        to === 'BOUNCED'
          ? `Cheque ${cheque.chequeNo} returned unpaid: ${opts.reason}`
          : `Cheque ${cheque.chequeNo} returned to drawer: ${opts.reason}`,
      sourceModule: 'CHEQUES',
      sourceRef: cheque.id,
      postedById: principal.userId,
      lines,
    });

    // Release the settlements this money was paying for. Ordering matters:
    // the allocations have to go before the receipt is stamped, because a
    // stamped receipt's allocations are frozen.
    if (receipt) {
      const allocations = await tx.receiptAllocation.findMany({
        where: { receiptId: receipt.id },
        select: { id: true, chargeId: true, amount: true },
      });
      for (const a of allocations) {
        await tx.studentCharge.update({
          where: { id: a.chargeId },
          data: { settledAmount: { decrement: a.amount } },
        });
      }
      await tx.receiptAllocation.deleteMany({ where: { receiptId: receipt.id } });

      await tx.studentReceipt.update({
        where: { id: receipt.id },
        data: {
          allocatedAmount: ZERO,
          dishonouredAt: new Date(),
          dishonouredById: principal.userId,
          dishonourHeaderId: posted.headerId,
        },
      });
    }

    await tx.cheque.update({
      where: { id: cheque.id },
      data: {
        status: to,
        custody: 'RETURNED_TO_DRAWER',
        settledOn: docDate,
        bounceReason: opts.reason,
        bounceReasonCode: opts.reasonCode,
      },
    });
    await recordEvent(tx, tenantId, cheque.id, cheque.status, to, principal.userId, docDate, {
      reasonCode: opts.reasonCode,
      comment: opts.reason,
      postedHeaderId: posted.headerId,
    });

    // The penalty is a separate document with its own number: it is a new
    // charge on the student, not part of unwinding the old one.
    let penaltyChargeId: string | null = null;
    if (opts.penalty && cheque.subledgerType === 'STUDENT') {
      const raised = await raiseChargesInTx(tx, principal, {
        studentId: cheque.subledgerId,
        docDate,
        description: `Returned cheque fee — ${cheque.chequeNo}`,
        lines: [
          {
            feeItemId: opts.penalty.feeItemId,
            grossAmount: opts.penalty.amount,
            costCenterId: opts.penalty.costCenterId ?? null,
          },
        ],
        sourceModule: 'CHEQUES',
        sourceRef: cheque.id,
      });
      penaltyChargeId = raised.chargeIds[0] ?? null;
    }

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: to === 'BOUNCED' ? 'REVERSE' : 'UPDATE',
      resourceType: 'cheque',
      resourceId: cheque.id,
      before: { status: cheque.status, chequeNo: cheque.chequeNo },
      after: {
        status: to,
        reason: opts.reason,
        reasonCode: opts.reasonCode,
        voucherRef: posted.voucherRef,
        reinstated: reinstated.toFixed(4),
        creditWithdrawn: creditWithdrawn.toFixed(4),
        receiptNo: receipt?.receiptNo ?? null,
        penaltyChargeId,
      },
    });

    return {
      headerId: posted.headerId,
      voucherRef: posted.voucherRef,
      reinstated: reinstated.toFixed(4),
      creditWithdrawn: creditWithdrawn.toFixed(4),
      penaltyChargeId,
    };
  });
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

export interface PortfolioItem {
  id: string;
  chequeNo: string;
  bankName: string | null;
  drawerName: string | null;
  dueDate: Date;
  amount: string;
  status: ChequeStatus;
  custody: string;
  subledgerId: string;
  receiptNo: string | null;
  daysToDue: number;
}

/**
 * The portfolio, filtered.
 *
 * `dueBy` is what a clerk actually asks for on a Sunday morning: which
 * post-dated cheques can go to the bank this week.
 */
export async function chequePortfolio(
  principal: Principal,
  filter: {
    status?: ChequeStatus | ChequeStatus[];
    dueBy?: Date;
    subledgerId?: string;
    take?: number;
  } = {},
): Promise<PortfolioItem[]> {
  requirePermission(principal, 'cheque.manage');

  const asOf = toDateOnly(new Date());
  const statuses = filter.status
    ? Array.isArray(filter.status)
      ? filter.status
      : [filter.status]
    : undefined;

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.cheque.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(statuses ? { status: { in: statuses } } : {}),
        ...(filter.dueBy ? { dueDate: { lte: toDateOnly(filter.dueBy) } } : {}),
        ...(filter.subledgerId ? { subledgerId: filter.subledgerId } : {}),
      },
      orderBy: [{ dueDate: 'asc' }, { chequeNo: 'asc' }],
      take: filter.take ?? 200,
      select: {
        id: true,
        chequeNo: true,
        bankName: true,
        drawerName: true,
        dueDate: true,
        amount: true,
        status: true,
        custody: true,
        subledgerId: true,
        receiptId: true,
      },
    });

    const receiptIds = rows.map((r) => r.receiptId).filter((id): id is string => id !== null);
    const receipts =
      receiptIds.length > 0
        ? await tx.studentReceipt.findMany({
            where: { id: { in: receiptIds } },
            select: { id: true, receiptNo: true },
          })
        : [];
    const receiptNoById = new Map(receipts.map((r) => [r.id, r.receiptNo]));

    return rows.map((r) => ({
      id: r.id,
      chequeNo: r.chequeNo,
      bankName: r.bankName,
      drawerName: r.drawerName,
      dueDate: r.dueDate,
      amount: r.amount.toFixed(4),
      status: r.status,
      custody: r.custody,
      subledgerId: r.subledgerId,
      receiptNo: r.receiptId ? (receiptNoById.get(r.receiptId) ?? null) : null,
      daysToDue: Math.round((r.dueDate.getTime() - asOf.getTime()) / 86_400_000),
    }));
  });
}

export interface DrawerBounceRecord {
  drawerKey: string;
  drawerName: string | null;
  bankName: string | null;
  bounces: number;
  totalBounced: string;
  lastBounceOn: Date | null;
  reasons: string[];
}

/**
 * Who keeps bouncing cheques (SRS REQ-CHQ-03).
 *
 * An institution that cannot answer this goes on accepting paper from the same
 * payer indefinitely. Grouped on the normalised drawer key, so a drawer whose
 * name is spelled two ways is still one drawer.
 */
export async function drawerBounceHistory(
  principal: Principal,
  opts: { minBounces?: number; since?: Date } = {},
): Promise<DrawerBounceRecord[]> {
  requirePermission(principal, 'cheque.manage');

  const minBounces = opts.minBounces ?? 1;

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.cheque.findMany({
      where: {
        tenantId: principal.tenantId,
        status: 'BOUNCED',
        ...(opts.since ? { settledOn: { gte: toDateOnly(opts.since) } } : {}),
      },
      select: {
        drawerKey: true,
        drawerName: true,
        bankName: true,
        amount: true,
        settledOn: true,
        bounceReasonCode: true,
        bounceReason: true,
      },
    });

    const byDrawer = new Map<string, DrawerBounceRecord & { total: Money }>();
    for (const r of rows) {
      const existing = byDrawer.get(r.drawerKey);
      const reason = r.bounceReasonCode ?? r.bounceReason ?? 'unspecified';
      if (existing) {
        existing.bounces += 1;
        existing.total = existing.total.plus(r.amount);
        if (r.settledOn && (!existing.lastBounceOn || r.settledOn > existing.lastBounceOn)) {
          existing.lastBounceOn = r.settledOn;
        }
        if (!existing.reasons.includes(reason)) existing.reasons.push(reason);
      } else {
        byDrawer.set(r.drawerKey, {
          drawerKey: r.drawerKey,
          drawerName: r.drawerName,
          bankName: r.bankName,
          bounces: 1,
          total: r.amount,
          totalBounced: '0',
          lastBounceOn: r.settledOn,
          reasons: [reason],
        });
      }
    }

    return [...byDrawer.values()]
      .filter((d) => d.bounces >= minBounces)
      .map(({ total, ...d }) => ({ ...d, totalBounced: total.toFixed(4) }))
      .sort((a, b) => b.bounces - a.bounces || Number(b.totalBounced) - Number(a.totalBounced));
  });
}

/** One cheque with its full transition history. */
export async function chequeHistory(
  principal: Principal,
  chequeId: string,
): Promise<{
  chequeNo: string;
  status: ChequeStatus;
  amount: string;
  events: Array<{
    from: ChequeStatus;
    to: ChequeStatus;
    docDate: Date;
    actorId: string;
    reasonCode: string | null;
    comment: string | null;
    voucherRef: string | null;
  }>;
}> {
  requirePermission(principal, 'cheque.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const cheque = await tx.cheque.findUniqueOrThrow({
      where: { id: chequeId },
      select: { chequeNo: true, status: true, amount: true },
    });
    const events = await tx.chequeEvent.findMany({
      where: { chequeId },
      orderBy: { occurredAt: 'asc' },
      select: {
        fromStatus: true,
        toStatus: true,
        docDate: true,
        actorId: true,
        reasonCode: true,
        comment: true,
        postedHeaderId: true,
      },
    });

    const headerIds = events
      .map((e) => e.postedHeaderId)
      .filter((id): id is string => id !== null);
    const headers =
      headerIds.length > 0
        ? await tx.transactionHeader.findMany({
            where: { id: { in: headerIds } },
            select: { id: true, voucherRef: true },
          })
        : [];
    const refById = new Map(headers.map((h) => [h.id, h.voucherRef]));

    return {
      chequeNo: cheque.chequeNo,
      status: cheque.status,
      amount: cheque.amount.toFixed(4),
      events: events.map((e) => ({
        from: e.fromStatus,
        to: e.toStatus,
        docDate: e.docDate,
        actorId: e.actorId,
        reasonCode: e.reasonCode,
        comment: e.comment,
        voucherRef: e.postedHeaderId ? (refById.get(e.postedHeaderId) ?? null) : null,
      })),
    };
  });
}
