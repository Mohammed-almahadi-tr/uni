import 'server-only';
import type { PaymentChannel } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { requireAccounts } from '@/lib/coa/mapping';
import { post, reverse, type PostingLine } from '@/lib/ledger/posting';
import { toDateOnly } from '@/lib/ledger/period';
import { idempotent } from '@/lib/idempotency';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import { registerCheque } from '@/lib/cheques/pipeline';

/**
 * The cashier's desk (SRS REQ-CSH-01, REQ-CSH-06).
 *
 * What one receipt posts:
 *
 *     DR  Cash / Bank / Cheques Receivable    amount
 *       CR  Student AR control                  allocated to charges
 *       CR  Student Overpayments                the rest
 *
 * The split matters. Money that is not matched to a charge is not revenue and
 * is not a reduction of a debt that does not exist — it is a liability the
 * institution owes back. Crediting the whole receipt to AR would leave the
 * control account carrying a negative student balance, which is a liability
 * reported as an asset. The legacy system had no control account at all: it
 * kept a `Remain` column on the registration row, maintained by whichever
 * screen last touched it.
 *
 * The legacy receipt screen was also hardcoded to two fee rows, wrote English
 * literals into an Arabic account tree, and numbered its vouchers with
 * `MAX(MoveNo) + 1` read inside the transaction — so two cashiers taking money
 * at the same moment issued the same receipt number.
 *
 * **Every call carries an idempotency key.** A cashier on an unreliable link
 * presses Save, sees nothing, and presses it again. That is the expected
 * condition at these campuses, not the exceptional one, and it is the single
 * highest-risk duplicate-creation path in the product.
 */

export class ReceiptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReceiptError';
  }
}

export interface ChequeDetail {
  chequeNo: string;
  bank?: string | null;
  branch?: string | null;
  dueDate: Date;
  drawerName?: string | null;
}

export interface TakeReceiptInput {
  studentId: string;
  docDate: Date;
  channel: PaymentChannel;
  amount: MoneyInput;
  /** Bank slip number, transfer reference, or gateway payment id. */
  reference?: string | null;
  /** Required for BANK_TRANSFER when the tenant banks in more than one place. */
  bankAccountId?: string | null;
  cheque?: ChequeDetail;
  /** The refused cheque this one was handed over to replace. */
  replacesChequeId?: string | null;
  /**
   * Explicit allocation across charges. Omit to settle oldest-due first,
   * which is what a cashier means by "put it against what he owes" and what
   * makes the aging report honest.
   */
  allocations?: Array<{ chargeId: string; amount: MoneyInput }>;
  note?: string | null;
}

export interface ReceiptResult {
  receiptId: string;
  receiptNo: string;
  headerId: string;
  amount: string;
  allocated: string;
  /** Left on the student's account as a credit balance. */
  unallocated: string;
  settledCharges: Array<{ chargeId: string; amount: string }>;
}

/**
 * Take money from a student.
 *
 * `idempotencyKey` is required, not optional. Making it optional would mean
 * every future caller decides afresh whether duplicate receipts matter, and
 * the answer is always the same.
 */
export async function takeReceipt(
  principal: Principal,
  input: TakeReceiptInput,
  idempotencyKey: string,
): Promise<ReceiptResult> {
  requirePermission(principal, 'receipt.create');

  if (!idempotencyKey?.trim()) {
    throw new ReceiptError('A receipt must be submitted with an idempotency key.');
  }
  if (input.channel === 'CREDIT_BALANCE') {
    throw new ReceiptError(
      'A credit balance is money the student has already paid. Apply it with ' +
        'applyCreditBalance rather than issuing a second receipt for it.',
    );
  }

  const { result } = await idempotent(
    principal.tenantId,
    idempotencyKey,
    'cashier.takeReceipt',
    {
      studentId: input.studentId,
      docDate: toDateOnly(input.docDate).toISOString(),
      channel: input.channel,
      amount: toStorage(input.amount).toFixed(4),
      reference: input.reference ?? null,
      chequeNo: input.cheque?.chequeNo ?? null,
      cashier: principal.userId,
    },
    (tx) => takeReceiptInTx(tx, principal, input),
  );
  return result;
}

async function takeReceiptInTx(
  tx: Tx,
  principal: Principal,
  input: TakeReceiptInput,
): Promise<ReceiptResult> {
  const { tenantId } = principal;

  const amount = toStorage(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new ReceiptError('A receipt must be for a positive amount.');
  }

  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });
  const currency = tenant.functionalCurrency.trim();

  const student = await tx.student.findUnique({
    where: { id: input.studentId },
    select: { id: true, studentNo: true, fullNameEn: true, isActive: true },
  });
  if (!student) throw new ReceiptError('Student not found in this tenant.');
  if (!student.isActive) {
    throw new ReceiptError(`${student.studentNo} is not an active record.`);
  }

  const accounts = await requireAccounts(tx, tenantId, [
    'STUDENT_AR_CONTROL',
    'STUDENT_CREDIT_CONTROL',
  ] as const);

  const debitAccountId = await resolveDebitAccount(tx, principal, input);
  const docDate = toDateOnly(input.docDate);

  if (input.channel === 'CHEQUE' && !input.cheque?.chequeNo?.trim()) {
    throw new ReceiptError(
      'A cheque receipt needs the cheque number and due date, or the cheque cannot enter ' +
        'the clearing pipeline and will be discovered missing weeks later.',
    );
  }

  // --- work out what this payment settles ---------------------------------
  const outstanding = await outstandingCharges(tx, tenantId, student.id);
  const plan =
    input.allocations && input.allocations.length > 0
      ? explicitAllocation(input.allocations, outstanding)
      : fifoAllocation(amount, outstanding);

  const allocated = sum(plan.map((p) => p.amount));
  if (allocated.greaterThan(amount)) {
    throw new ReceiptError(
      `The allocation totals ${allocated.toFixed(2)} but the receipt is for ` +
        `${amount.toFixed(2)}. A receipt cannot pay more than it collects.`,
    );
  }
  const unallocated = amount.minus(allocated);

  // --- post it ------------------------------------------------------------
  const lines: PostingLine[] = [
    {
      accountId: debitAccountId,
      debit: amount,
      description: `Fees received — ${student.studentNo} ${student.fullNameEn}`,
    },
  ];
  if (!allocated.isZero()) {
    lines.push({
      accountId: accounts.STUDENT_AR_CONTROL,
      subledgerType: 'STUDENT',
      subledgerId: student.id,
      credit: allocated,
      description: `Fees received — ${student.studentNo}`,
    });
  }
  if (!unallocated.isZero()) {
    lines.push({
      accountId: accounts.STUDENT_CREDIT_CONTROL,
      subledgerType: 'STUDENT',
      subledgerId: student.id,
      credit: unallocated,
      description: `Credit balance — ${student.studentNo}`,
    });
  }

  const posted = await post(tx, tenantId, {
    voucherType: 'STUDENT_RECEIPT',
    docDate,
    description:
      input.note?.trim() || `Student fee receipt — ${student.studentNo} ${student.fullNameEn}`,
    sourceModule: 'CASHIERING',
    sourceRef: student.id,
    postedById: principal.userId,
    lines,
  });

  const receipt = await tx.studentReceipt.create({
    data: {
      tenantId,
      studentId: student.id,
      receiptNo: posted.voucherRef,
      docDate,
      channel: input.channel,
      amount,
      currency,
      debitAccountId,
      reference: input.reference?.trim() || null,
      chequeNo: input.cheque?.chequeNo?.trim() || null,
      chequeBank: input.cheque?.bank?.trim() || null,
      chequeBranch: input.cheque?.branch?.trim() || null,
      chequeDueDate: input.cheque?.dueDate ? toDateOnly(input.cheque.dueDate) : null,
      drawerName: input.cheque?.drawerName?.trim() || null,
      allocatedAmount: allocated,
      postedHeaderId: posted.headerId,
      createdById: principal.userId,
    },
    select: { id: true },
  });

  // A cheque is a promise, not money. It enters the portfolio here so that
  // the clearing pipeline has something to work with — the legacy system had
  // no cheque entity at all, only a boolean on the ledger row.
  if (input.channel === 'CHEQUE' && input.cheque) {
    await registerCheque(tx, tenantId, principal.userId, {
      chequeNo: input.cheque.chequeNo,
      bankName: input.cheque.bank,
      branch: input.cheque.branch,
      drawerName: input.cheque.drawerName,
      dueDate: input.cheque.dueDate,
      amount,
      currency,
      subledgerType: 'STUDENT',
      subledgerId: student.id,
      receivedOn: docDate,
      receiptId: receipt.id,
      replacesChequeId: input.replacesChequeId ?? null,
    });
  }

  for (const p of plan) {
    await tx.receiptAllocation.create({
      data: { tenantId, receiptId: receipt.id, chargeId: p.chargeId, amount: p.amount },
    });
    await tx.studentCharge.update({
      where: { id: p.chargeId },
      data: { settledAmount: { increment: p.amount } },
    });
  }

  await audit(tx, tenantId, {
    actorId: principal.userId,
    action: 'POST',
    resourceType: 'student.receipt',
    resourceId: receipt.id,
    after: {
      receiptNo: posted.voucherRef,
      studentNo: student.studentNo,
      channel: input.channel,
      amount: amount.toFixed(4),
      allocated: allocated.toFixed(4),
      unallocated: unallocated.toFixed(4),
    },
  });

  return {
    receiptId: receipt.id,
    receiptNo: posted.voucherRef,
    headerId: posted.headerId,
    amount: amount.toFixed(4),
    allocated: allocated.toFixed(4),
    unallocated: unallocated.toFixed(4),
    settledCharges: plan.map((p) => ({ chargeId: p.chargeId, amount: p.amount.toFixed(4) })),
  };
}

/**
 * Which account the money lands in.
 *
 * Cash goes to the till assigned to the cashier who took it — not to one
 * shared safe. Without that, "which cashier is short today" cannot be answered
 * from the ledger, which is the question the legacy `IncomeListByCollecter`
 * report had to reconstruct from a name column.
 */
async function resolveDebitAccount(
  tx: Tx,
  principal: Principal,
  input: TakeReceiptInput,
): Promise<string> {
  const { tenantId } = principal;

  if (input.channel === 'CASH') {
    const till = await tx.cashierTill.findUnique({
      where: { userId: principal.userId },
      select: { cashAccountId: true, isActive: true },
    });
    if (!till || !till.isActive) {
      throw new ReceiptError(
        'You have no cash till assigned, so there is nowhere for this money to be recorded. ' +
          'An administrator assigns a safe account to each cashier.',
      );
    }
    return till.cashAccountId;
  }

  if (input.channel === 'CHEQUE') {
    const { CHEQUES_RECEIVABLE } = await requireAccounts(tx, tenantId, [
      'CHEQUES_RECEIVABLE',
    ] as const);
    return CHEQUES_RECEIVABLE;
  }

  // BANK_TRANSFER and GATEWAY both land in a bank account. A gateway
  // settlement is not cleared funds until it is reconciled against the
  // provider's report (REQ-CSH-05); that reconciliation lands with the
  // provider adapters.
  if (input.bankAccountId) {
    const account = await tx.account.findUnique({
      where: { id: input.bankAccountId },
      select: { code: true, isPostable: true, isActive: true },
    });
    if (!account) throw new ReceiptError('That bank account is not in this tenant’s chart.');
    if (!account.isActive || !account.isPostable) {
      throw new ReceiptError(`Account ${account.code} cannot receive postings.`);
    }
    return input.bankAccountId;
  }
  const { DEFAULT_BANK } = await requireAccounts(tx, tenantId, ['DEFAULT_BANK'] as const);
  return DEFAULT_BANK;
}

interface OutstandingCharge {
  id: string;
  outstanding: Money;
  // Carried so the desk can name what a payment is about to settle. The
  // allocation itself uses only `id` and `outstanding`; these ride along so
  // that the list a cashier reads and the list the engine allocates over are
  // the same list in the same order, rather than two queries that could
  // diverge.
  code: string;
  nameAr: string;
  nameEn: string;
  termLabel: string | null;
  docDate: Date;
  dueDate: Date | null;
}

async function outstandingCharges(
  tx: Tx,
  tenantId: string,
  studentId: string,
): Promise<OutstandingCharge[]> {
  const rows = await tx.studentCharge.findMany({
    where: { tenantId, studentId, reversedAt: null },
    orderBy: [
      // Oldest due first. A charge with no due date is treated as due on the
      // day it was raised, which is what "payable on demand" means.
      { dueDate: { sort: 'asc', nulls: 'last' } },
      { docDate: 'asc' },
      { createdAt: 'asc' },
    ],
    select: {
      id: true,
      netAmount: true,
      sponsoredAmount: true,
      settledAmount: true,
      termLabel: true,
      docDate: true,
      dueDate: true,
      feeItem: { select: { code: true, nameAr: true, nameEn: true } },
    },
  });

  // A student's money settles the student's portion. The sponsored part of a
  // charge is the sponsor's debt, and letting a student's receipt clear it
  // would leave the sponsor's sub-ledger saying it was still owed.
  return rows
    .map((r) => ({
      id: r.id,
      outstanding: r.netAmount.minus(r.sponsoredAmount).minus(r.settledAmount),
      code: r.feeItem.code,
      nameAr: r.feeItem.nameAr,
      nameEn: r.feeItem.nameEn,
      termLabel: r.termLabel,
      docDate: r.docDate,
      dueDate: r.dueDate,
    }))
    .filter((r) => r.outstanding.greaterThan(0));
}

function fifoAllocation(
  amount: Money,
  outstanding: OutstandingCharge[],
): Array<{ chargeId: string; amount: Money }> {
  const plan: Array<{ chargeId: string; amount: Money }> = [];
  let left = amount;

  for (const charge of outstanding) {
    if (left.lessThanOrEqualTo(0)) break;
    const take = left.greaterThan(charge.outstanding) ? charge.outstanding : left;
    plan.push({ chargeId: charge.id, amount: take });
    left = left.minus(take);
  }
  return plan;
}

function explicitAllocation(
  requested: Array<{ chargeId: string; amount: MoneyInput }>,
  outstanding: OutstandingCharge[],
): Array<{ chargeId: string; amount: Money }> {
  const byId = new Map(outstanding.map((o) => [o.id, o]));

  return requested.map((r) => {
    const amount = toStorage(r.amount);
    if (amount.lessThanOrEqualTo(0)) {
      throw new ReceiptError('An allocation must be for a positive amount.');
    }
    const charge = byId.get(r.chargeId);
    if (!charge) {
      throw new ReceiptError(
        'One of the charges named is not outstanding for this student — it may have been ' +
          'paid or reversed since the screen was opened. Reload and try again.',
      );
    }
    if (amount.greaterThan(charge.outstanding)) {
      throw new ReceiptError(
        `Allocating ${amount.toFixed(2)} to a charge with ${charge.outstanding.toFixed(2)} ` +
          `outstanding would overpay it. Put the excess on another charge or leave it as credit.`,
      );
    }
    return { chargeId: r.chargeId, amount };
  });
}

/**
 * Cancel a receipt issued today (SRS REQ-CSH-06).
 *
 * Same day only, and only by someone holding `receipt.cancel` — which the
 * segregation matrix forbids anyone with `receipt.create` from also holding,
 * because a cashier who can take a payment and cancel it can pocket the cash
 * and erase the record. After the day of issue the correction is a voucher
 * reversal, which carries the full maker-checker workflow.
 *
 * The receipt row is kept, cancelled. Its number is never reused and never
 * disappears — a gap in a receipt book is a question an auditor will ask.
 */
export async function cancelReceipt(
  principal: Principal,
  receiptId: string,
  reason: string,
  opts: { on?: Date } = {},
): Promise<{ reversalHeaderId: string; voucherRef: string }> {
  requirePermission(principal, 'receipt.cancel');

  const trimmed = reason?.trim();
  if (!trimmed) throw new ReceiptError('Cancelling a receipt requires a stated reason.');

  return withTenant(principal.tenantId, async (tx) => {
    const receipt = await tx.studentReceipt.findUnique({
      where: { id: receiptId },
      select: {
        id: true,
        receiptNo: true,
        docDate: true,
        amount: true,
        cancelledAt: true,
        postedHeaderId: true,
        student: { select: { studentNo: true } },
        allocations: { select: { id: true, chargeId: true, amount: true } },
      },
    });
    if (!receipt) throw new ReceiptError('Receipt not found in this tenant.');
    if (receipt.cancelledAt) {
      throw new ReceiptError(`Receipt ${receipt.receiptNo} has already been cancelled.`);
    }

    const on = toDateOnly(opts.on ?? new Date());
    if (on.getTime() !== receipt.docDate.getTime()) {
      throw new ReceiptError(
        `Receipt ${receipt.receiptNo} was issued on ` +
          `${receipt.docDate.toISOString().slice(0, 10)} and can no longer be cancelled at the ` +
          `till. Reverse it through the voucher workflow, where it gets a second signature.`,
      );
    }

    const reversal = await reverse(
      tx,
      principal.tenantId,
      receipt.postedHeaderId,
      `Receipt ${receipt.receiptNo} cancelled: ${trimmed}`,
      { reversalDate: on, postedById: principal.userId },
    );

    // Order matters here, and the database enforces it. A cancelled receipt's
    // allocations are frozen — that is what stops anyone quietly re-pointing
    // dead money at a live charge — so they have to be released *before* the
    // cancellation is stamped, not after.
    for (const a of receipt.allocations) {
      await tx.studentCharge.update({
        where: { id: a.chargeId },
        data: { settledAmount: { decrement: a.amount } },
      });
    }
    await tx.receiptAllocation.deleteMany({ where: { receiptId } });

    await tx.studentReceipt.update({
      where: { id: receiptId },
      data: {
        allocatedAmount: ZERO,
        cancelledAt: new Date(),
        cancelledById: principal.userId,
        cancellationReason: trimmed,
        cancellationHeaderId: reversal.headerId,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REVERSE',
      resourceType: 'student.receipt',
      resourceId: receiptId,
      before: { receiptNo: receipt.receiptNo, amount: receipt.amount.toFixed(4) },
      after: { cancelled: true, reason: trimmed, reversalRef: reversal.voucherRef },
    });

    return { reversalHeaderId: reversal.headerId, voucherRef: reversal.voucherRef };
  });
}

/**
 * Put a student's credit balance against what they now owe (SRS REQ-FEE-04).
 *
 * Called after registration bills the next term. Moves money from the
 * overpayment liability back to the receivable it now settles; nothing enters
 * or leaves the institution, so there is no receipt and no receipt number.
 */
export async function applyCreditBalance(
  principal: Principal,
  studentId: string,
  opts: { docDate?: Date } = {},
): Promise<{ applied: string; headerId: string | null }> {
  requirePermission(principal, 'receipt.create');

  return withTenant(principal.tenantId, (tx) =>
    applyCreditBalanceInTx(tx, principal, studentId, opts),
  );
}

/**
 * The body of `applyCreditBalance`, for callers already inside a transaction
 * that has established the right to do it — a withdrawal (B5) re-billing the
 * retained portion of a term and settling it from the money the student had
 * already paid. REQ-FEE-04 requires a credit balance to be applied
 * automatically to what the student next owes; doing it in the same
 * transaction is what stops the account reading as a debt and a credit of
 * comparable size that nobody has matched.
 */
export async function applyCreditBalanceInTx(
  tx: Tx,
  principal: Principal,
  studentId: string,
  opts: { docDate?: Date } = {},
): Promise<{ applied: string; headerId: string | null }> {
  {
    const { tenantId } = principal;

    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: { id: true, studentNo: true },
    });
    if (!student) throw new ReceiptError('Student not found in this tenant.');

    const receipts = await tx.studentReceipt.findMany({
      // A dishonoured receipt is money that never arrived, so its unmatched
      // balance is not a credit the student can spend.
      where: { tenantId, studentId, cancelledAt: null, dishonouredAt: null },
      orderBy: { docDate: 'asc' },
      select: { id: true, amount: true, allocatedAmount: true },
    });
    const withCredit = receipts
      .map((r) => ({ id: r.id, spare: r.amount.minus(r.allocatedAmount) }))
      .filter((r) => r.spare.greaterThan(0));

    const credit = sum(withCredit.map((r) => r.spare));
    if (credit.isZero()) return { applied: '0.0000', headerId: null };

    const outstanding = await outstandingCharges(tx, tenantId, studentId);
    if (outstanding.length === 0) return { applied: '0.0000', headerId: null };

    const plan = fifoAllocation(credit, outstanding);
    const applied = sum(plan.map((p) => p.amount));
    if (applied.isZero()) return { applied: '0.0000', headerId: null };

    const accounts = await requireAccounts(tx, tenantId, [
      'STUDENT_AR_CONTROL',
      'STUDENT_CREDIT_CONTROL',
    ] as const);

    const posted = await post(tx, tenantId, {
      voucherType: 'JOURNAL',
      docDate: opts.docDate ?? new Date(),
      description: `Credit balance applied — ${student.studentNo}`,
      sourceModule: 'CASHIERING',
      sourceRef: student.id,
      postedById: principal.userId,
      lines: [
        {
          accountId: accounts.STUDENT_CREDIT_CONTROL,
          subledgerType: 'STUDENT',
          subledgerId: student.id,
          debit: applied,
          description: `Credit balance applied — ${student.studentNo}`,
        },
        {
          accountId: accounts.STUDENT_AR_CONTROL,
          subledgerType: 'STUDENT',
          subledgerId: student.id,
          credit: applied,
          description: `Credit balance applied — ${student.studentNo}`,
        },
      ],
    });

    // Spread the applied total back across the receipts that held the credit,
    // oldest first, so each receipt's allocations still add up to its own
    // allocated figure.
    let remaining = applied;
    let sourceIdx = 0;
    for (const p of plan) {
      let toPlace = p.amount;
      while (toPlace.greaterThan(0)) {
        const source = withCredit[sourceIdx];
        const take = source.spare.greaterThan(toPlace) ? toPlace : source.spare;

        const existing = await tx.receiptAllocation.findUnique({
          where: { receiptId_chargeId: { receiptId: source.id, chargeId: p.chargeId } },
          select: { id: true, amount: true },
        });
        if (existing) {
          await tx.receiptAllocation.update({
            where: { id: existing.id },
            data: { amount: existing.amount.plus(take) },
          });
        } else {
          await tx.receiptAllocation.create({
            data: { tenantId, receiptId: source.id, chargeId: p.chargeId, amount: take },
          });
        }
        await tx.studentReceipt.update({
          where: { id: source.id },
          data: { allocatedAmount: { increment: take } },
        });

        source.spare = source.spare.minus(take);
        toPlace = toPlace.minus(take);
        remaining = remaining.minus(take);
        if (source.spare.isZero()) sourceIdx += 1;
      }

      await tx.studentCharge.update({
        where: { id: p.chargeId },
        data: { settledAmount: { increment: p.amount } },
      });
    }

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'POST',
      resourceType: 'student.credit',
      resourceId: student.id,
      after: {
        studentNo: student.studentNo,
        applied: applied.toFixed(4),
        voucherRef: posted.voucherRef,
      },
    });

    return { applied: applied.toFixed(4), headerId: posted.headerId };
  }
}

/** Assign a cashier the safe their cash receipts post to. */
export async function assignTill(
  principal: Principal,
  userId: string,
  cashAccountId: string,
): Promise<void> {
  requirePermission(principal, 'coa.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: cashAccountId },
      select: { code: true, isPostable: true, isActive: true },
    });
    if (!account) throw new ReceiptError('That account is not in this tenant’s chart.');
    if (!account.isActive || !account.isPostable) {
      throw new ReceiptError(
        `Account ${account.code} cannot receive postings, so it cannot be a till.`,
      );
    }

    await tx.cashierTill.upsert({
      where: { userId },
      create: { tenantId: principal.tenantId, userId, cashAccountId },
      update: { cashAccountId, isActive: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'cashier.till',
      resourceId: userId,
      after: { cashAccountCode: account.code },
    });
  });
}

// ---------------------------------------------------------------------------
// Reads for the desk (Track D2)
//
// No rule lives here that is not already above. `previewAllocation` calls the
// same `outstandingCharges`, `fifoAllocation` and `explicitAllocation` that
// `takeReceipt` calls, so what the cashier is shown before saving is produced
// by the code that will do the saving — not by a second implementation that
// agrees with it today.
//
// The legacy desk showed a grid of two hardcoded rows:
//
//     Me.GridVouchers.Rows.Add(New String() {"Current Assets", "Debtors",
//         "Students Fees", "Students Fees", "Tuition Fees", tutfee})
//     Me.GridVouchers.Rows.Add(New String() {..., "Registration Fees", RegFees})
//
// (frmStudantReceiptVoucher.vb:105-106). Two fee kinds, English literals in an
// Arabic chart, and no relationship to what this student had actually been
// billed — because nothing had billed them. There was no charge to allocate
// against, which is why the balance lived in a `Remain` column that whichever
// screen touched it last would rewrite.
// ---------------------------------------------------------------------------

/** One outstanding charge, as the desk lists it. */
export interface OutstandingChargeLine {
  chargeId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  termLabel: string | null;
  docDate: Date;
  dueDate: Date | null;
  outstanding: string;
}

export interface AllocationPreview {
  /** Every charge the money could go against, oldest due first. */
  charges: OutstandingChargeLine[];
  /** What this amount would settle, and against what. */
  plan: Array<{ chargeId: string; code: string; nameAr: string; nameEn: string; amount: string }>;
  allocated: string;
  /** Left over, and therefore a credit balance the institution owes back. */
  unallocated: string;
}

/**
 * What a payment of this size would settle, without taking it.
 *
 * The cashier sees the split before the money is recorded: how much lands on
 * the receivable and how much becomes a credit balance. That distinction is
 * the one the legacy chart could not express — every receipt was credited
 * whole against a student *name*, in a tree with no control account, so an
 * overpayment read as a negative asset.
 */
export async function previewAllocation(
  principal: Principal,
  studentId: string,
  amount: MoneyInput,
  allocations?: Array<{ chargeId: string; amount: MoneyInput }>,
): Promise<AllocationPreview> {
  requirePermission(principal, 'student.read');

  const total = toStorage(amount);

  return withTenant(principal.tenantId, async (tx) => {
    const outstanding = await outstandingCharges(tx, principal.tenantId, studentId);

    const listed: OutstandingChargeLine[] = outstanding.map((c) => ({
      chargeId: c.id,
      code: c.code,
      nameAr: c.nameAr,
      nameEn: c.nameEn,
      termLabel: c.termLabel,
      docDate: c.docDate,
      dueDate: c.dueDate,
      outstanding: c.outstanding.toFixed(4),
    }));

    if (total.lessThanOrEqualTo(0)) {
      return {
        charges: listed,
        plan: [],
        allocated: ZERO.toFixed(4),
        unallocated: ZERO.toFixed(4),
      };
    }

    const plan =
      allocations && allocations.length > 0
        ? explicitAllocation(allocations, outstanding)
        : fifoAllocation(total, outstanding);

    const byId = new Map(outstanding.map((c) => [c.id, c]));
    const allocated = sum(plan.map((p) => p.amount));

    return {
      charges: listed,
      plan: plan.map((p) => {
        const c = byId.get(p.chargeId);
        return {
          chargeId: p.chargeId,
          code: c?.code ?? '',
          nameAr: c?.nameAr ?? '',
          nameEn: c?.nameEn ?? '',
          amount: p.amount.toFixed(4),
        };
      }),
      allocated: allocated.toFixed(4),
      unallocated: total.minus(allocated).toFixed(4),
    };
  });
}

export interface ReceiptRow {
  id: string;
  receiptNo: string;
  docDate: Date;
  channel: PaymentChannel;
  amount: string;
  allocated: string;
  reference: string | null;
  chequeNo: string | null;
  studentId: string;
  studentNo: string;
  fullNameAr: string;
  fullNameEn: string;
  cashierName: string;
  cancelledAt: Date | null;
  dishonouredAt: Date | null;
  /** True when the receipt still sits inside the day-of-issue window that
   *  `cancelReceipt` will accept. Shown so the register does not offer a
   *  button the module is going to refuse. */
  cancellableToday: boolean;
}

/**
 * The receipt register.
 *
 * `mine` is the default view for a cashier, because the question they ask of
 * this screen is "what did I take". Nothing here decides who may cancel what:
 * that is `cancelReceipt`, which refuses anything but the day of issue and
 * demands `receipt.cancel` — a permission the SoD matrix forbids anyone
 * holding `receipt.create` from also holding.
 */
export async function receiptRegister(
  principal: Principal,
  filter: {
    from?: Date;
    to?: Date;
    studentId?: string;
    channel?: PaymentChannel;
    mine?: boolean;
    /** Substring of the receipt number, the bank reference or the cheque number. */
    q?: string;
    take?: number;
  } = {},
): Promise<ReceiptRow[]> {
  requirePermission(principal, 'student.read');

  const today = toDateOnly(new Date()).getTime();
  const q = filter.q?.trim();

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.studentReceipt.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(filter.studentId ? { studentId: filter.studentId } : {}),
        ...(filter.channel ? { channel: filter.channel } : {}),
        ...(filter.mine ? { createdById: principal.userId } : {}),
        ...(filter.from || filter.to
          ? {
              docDate: {
                ...(filter.from ? { gte: toDateOnly(filter.from) } : {}),
                ...(filter.to ? { lte: toDateOnly(filter.to) } : {}),
              },
            }
          : {}),
        ...(q
          ? {
              OR: [
                { receiptNo: { contains: q, mode: 'insensitive' as const } },
                { reference: { contains: q, mode: 'insensitive' as const } },
                { chequeNo: { contains: q, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: [{ docDate: 'desc' }, { createdAt: 'desc' }],
      take: filter.take ?? 100,
      select: {
        id: true,
        receiptNo: true,
        docDate: true,
        channel: true,
        amount: true,
        allocatedAmount: true,
        reference: true,
        chequeNo: true,
        cancelledAt: true,
        dishonouredAt: true,
        student: { select: { id: true, studentNo: true, fullNameAr: true, fullNameEn: true } },
        cashier: { select: { fullName: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      receiptNo: r.receiptNo,
      docDate: r.docDate,
      channel: r.channel,
      amount: r.amount.toFixed(4),
      allocated: r.allocatedAmount.toFixed(4),
      reference: r.reference,
      chequeNo: r.chequeNo,
      studentId: r.student.id,
      studentNo: r.student.studentNo,
      fullNameAr: r.student.fullNameAr,
      fullNameEn: r.student.fullNameEn,
      cashierName: r.cashier.fullName,
      cancelledAt: r.cancelledAt,
      dishonouredAt: r.dishonouredAt,
      cancellableToday:
        r.cancelledAt === null && r.dishonouredAt === null && r.docDate.getTime() === today,
    }));
  });
}

export interface DaySheet {
  date: Date;
  cashierName: string;
  /** Null when no till has been assigned — which is also why cash cannot be
   *  taken at all; see `resolveDebitAccount`. */
  till: { accountCode: string; accountNameAr: string; accountNameEn: string } | null;
  byChannel: Array<{ channel: PaymentChannel; count: number; total: string }>;
  /** Cash only: the figure to count the drawer against. */
  cashTotal: string;
  total: string;
  cancelledCount: number;
  cancelledTotal: string;
}

/**
 * What one cashier took on one day (SRS REQ-CSH-04).
 *
 * Reads the receipts rather than the ledger, and reads one cashier's, because
 * "who is short today" is the question — and it is the question the legacy
 * `IncomeListByCollecter` report had to answer by grouping on a **name
 * column**, since every cashier's cash was posted to one account literally
 * called `"Cash on Hand"` (frmStudantReceiptVoucher.vb:430).
 *
 * This is a day sheet, not a shift close. Nothing here is counted, asserted,
 * signed or retained — see §8.1, where the declared close is recorded as a
 * finding held open against A3, because a cash count that is stored and
 * compared is a business rule and Track D does not write those.
 */
export async function cashierDaySheet(
  principal: Principal,
  opts: { on?: Date; userId?: string } = {},
): Promise<DaySheet> {
  requirePermission(principal, 'student.read');

  // Reading another cashier's day is a supervisor's act, not a peer's.
  const userId = opts.userId ?? principal.userId;
  if (userId !== principal.userId) requirePermission(principal, 'report.financial');

  const date = toDateOnly(opts.on ?? new Date());

  return withTenant(principal.tenantId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { fullName: true },
    });
    const till = await tx.cashierTill.findUnique({
      where: { userId },
      select: {
        isActive: true,
        cashAccount: { select: { code: true, nameAr: true, nameEn: true } },
      },
    });
    const rows = await tx.studentReceipt.findMany({
      where: { tenantId: principal.tenantId, docDate: date, createdById: userId },
      select: { channel: true, amount: true, cancelledAt: true },
    });

    const live = rows.filter((r) => r.cancelledAt === null);
    const cancelled = rows.filter((r) => r.cancelledAt !== null);

    const byChannel = new Map<PaymentChannel, { count: number; total: Money }>();
    for (const r of live) {
      const entry = byChannel.get(r.channel) ?? { count: 0, total: ZERO };
      byChannel.set(r.channel, { count: entry.count + 1, total: entry.total.plus(r.amount) });
    }

    return {
      date,
      cashierName: user?.fullName ?? '',
      till:
        till && till.isActive
          ? {
              accountCode: till.cashAccount.code,
              accountNameAr: till.cashAccount.nameAr,
              accountNameEn: till.cashAccount.nameEn,
            }
          : null,
      byChannel: [...byChannel.entries()].map(([channel, v]) => ({
        channel,
        count: v.count,
        total: v.total.toFixed(4),
      })),
      cashTotal: (byChannel.get('CASH')?.total ?? ZERO).toFixed(4),
      total: sum(live.map((r) => r.amount)).toFixed(4),
      cancelledCount: cancelled.length,
      cancelledTotal: sum(cancelled.map((r) => r.amount)).toFixed(4),
    };
  });
}
