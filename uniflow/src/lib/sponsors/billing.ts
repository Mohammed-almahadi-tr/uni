import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { requireAccounts } from '@/lib/coa/mapping';
import { post, type PostingLine } from '@/lib/ledger/posting';
import { toDateOnly } from '@/lib/ledger/period';
import { idempotent } from '@/lib/idempotency';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import type { PaymentChannel } from '@/generated/prisma/enums';
import { SponsorError } from './contracts';

/**
 * Sponsor invoicing, settlement, aging and default (SRS REQ-SPN-03, B6).
 *
 * ## An invoice consolidates; it does not post
 *
 * The Sponsor AR was debited the moment each charge was split, at billing
 * time (REQ-SPN-02). An invoice that posted again would bill the sponsor
 * twice for the same students. So `SponsorInvoice` has no `postedHeaderId`
 * and this module raises no voucher for one: it is a statement over shares
 * that already exist, and it exists so that a sponsor has one document to pay
 * against and the aging report has a due date to age from.
 *
 * That is worth stating because the obvious implementation — treat an invoice
 * like a sales document and post it — is exactly how a system ends up with a
 * receivable of twice the contracted amount, and it is the shape of mistake
 * the legacy build made in the other direction: it billed the student for the
 * sponsor's share and posted nothing to any counterparty at all.
 *
 * ## Settlement mirrors the student side
 *
 * A sponsor receipt debits cash or bank and credits Sponsor AR under the
 * sponsor's own sub-ledger identity, then allocates across the shares it
 * pays for, oldest first. It carries an idempotency key for the same reason a
 * student receipt does.
 */

export class SponsorBillingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SponsorBillingError';
  }
}

// ---------------------------------------------------------------------------
// Invoicing (REQ-SPN-03)
// ---------------------------------------------------------------------------

export interface RaiseInvoiceInput {
  sponsorId: string;
  /** Charges dated in this window, inclusive. */
  periodFrom: Date;
  periodTo: Date;
  docDate?: Date;
  /** Overrides the sponsor's payment terms. */
  dueDate?: Date;
}

export interface SponsorInvoiceResult {
  id: string;
  invoiceNo: string;
  totalAmount: string;
  dueDate: string;
  studentCount: number;
  lineCount: number;
}

/**
 * Consolidate everything a sponsor has accrued in a period into one invoice.
 *
 * Only shares that are not already on an invoice are picked up — the
 * `invoice_id` on a share is set once, so a sponsor cannot be billed twice
 * for the same student's term by running the consolidation again.
 */
export async function raiseSponsorInvoice(
  principal: Principal,
  input: RaiseInvoiceInput,
): Promise<SponsorInvoiceResult> {
  requirePermission(principal, 'sponsor.invoice');

  const periodFrom = toDateOnly(input.periodFrom);
  const periodTo = toDateOnly(input.periodTo);
  if (periodTo < periodFrom) {
    throw new SponsorBillingError('The invoice period ends before it starts.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const sponsor = await tx.sponsor.findFirst({
      where: { id: input.sponsorId, tenantId: principal.tenantId },
      select: { id: true, code: true, nameEn: true, paymentTermDays: true },
    });
    if (!sponsor) {
      throw new SponsorBillingError('That sponsor does not belong to this university.');
    }

    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: principal.tenantId },
      select: { functionalCurrency: true },
    });

    const shares = await tx.chargeSponsorship.findMany({
      where: {
        tenantId: principal.tenantId,
        sponsorId: sponsor.id,
        invoiceId: null,
        charge: {
          reversedAt: null,
          docDate: { gte: periodFrom, lte: periodTo },
        },
      },
      select: {
        id: true,
        amount: true,
        writtenBackAmount: true,
        charge: { select: { studentId: true } },
      },
    });

    const billable = shares.filter((s) => s.amount.minus(s.writtenBackAmount).greaterThan(0));
    if (billable.length === 0) {
      throw new SponsorBillingError(
        `${sponsor.nameEn} has nothing outstanding for ${iso(periodFrom)}–${iso(periodTo)} ` +
          `that is not already invoiced.`,
      );
    }

    const totalAmount = sum(billable.map((s) => s.amount.minus(s.writtenBackAmount)));
    const docDate = toDateOnly(input.docDate ?? new Date());
    const dueDate = input.dueDate
      ? toDateOnly(input.dueDate)
      : addDays(docDate, sponsor.paymentTermDays);

    const invoiceNo = await allocateSponsorDocumentNo(tx, principal.tenantId, 'INV');

    const invoice = await tx.sponsorInvoice.create({
      data: {
        tenantId: principal.tenantId,
        sponsorId: sponsor.id,
        invoiceNo,
        periodFrom,
        periodTo,
        docDate,
        dueDate,
        currency: tenant.functionalCurrency.trim(),
        totalAmount,
        status: 'ISSUED',
        createdById: principal.userId,
      },
      select: { id: true },
    });

    for (const share of billable) {
      await tx.chargeSponsorship.update({
        where: { id: share.id },
        data: { invoiceId: invoice.id },
      });
    }

    const studentCount = new Set(billable.map((s) => s.charge.studentId)).size;

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'sponsor_invoice',
      resourceId: invoice.id,
      after: {
        invoiceNo,
        sponsor: sponsor.code,
        period: `${iso(periodFrom)}–${iso(periodTo)}`,
        totalAmount: totalAmount.toFixed(4),
        students: studentCount,
        lines: billable.length,
      },
    });

    return {
      id: invoice.id,
      invoiceNo,
      totalAmount: totalAmount.toFixed(4),
      dueDate: iso(dueDate),
      studentCount,
      lineCount: billable.length,
    };
  });
}

export interface SponsorInvoiceDetail {
  invoiceNo: string;
  sponsorCode: string;
  sponsorNameEn: string;
  periodFrom: string;
  periodTo: string;
  docDate: string;
  dueDate: string;
  currency: string;
  totalAmount: string;
  settledAmount: string;
  status: string;
  lines: Array<{
    studentNo: string;
    studentNameEn: string;
    feeItemCode: string;
    termLabel: string | null;
    amount: string;
    settled: string;
  }>;
}

export async function sponsorInvoice(
  principal: Principal,
  invoiceId: string,
): Promise<SponsorInvoiceDetail> {
  requirePermission(principal, 'sponsor.invoice');

  return withTenant(principal.tenantId, async (tx) => {
    const inv = await tx.sponsorInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        tenantId: true,
        invoiceNo: true,
        periodFrom: true,
        periodTo: true,
        docDate: true,
        dueDate: true,
        currency: true,
        totalAmount: true,
        settledAmount: true,
        status: true,
        sponsor: { select: { code: true, nameEn: true } },
      },
    });
    if (!inv || inv.tenantId !== principal.tenantId) {
      throw new SponsorBillingError('That invoice does not belong to this university.');
    }

    const shares = await tx.chargeSponsorship.findMany({
      where: { invoiceId },
      select: {
        amount: true,
        settledAmount: true,
        writtenBackAmount: true,
        charge: {
          select: {
            termLabel: true,
            feeItem: { select: { code: true } },
            student: { select: { studentNo: true, fullNameEn: true } },
          },
        },
      },
    });

    return {
      invoiceNo: inv.invoiceNo,
      sponsorCode: inv.sponsor.code,
      sponsorNameEn: inv.sponsor.nameEn,
      periodFrom: iso(inv.periodFrom),
      periodTo: iso(inv.periodTo),
      docDate: iso(inv.docDate),
      dueDate: iso(inv.dueDate),
      currency: inv.currency.trim(),
      totalAmount: inv.totalAmount.toFixed(4),
      settledAmount: inv.settledAmount.toFixed(4),
      status: inv.status,
      lines: shares
        .map((s) => ({
          studentNo: s.charge.student.studentNo,
          studentNameEn: s.charge.student.fullNameEn,
          feeItemCode: s.charge.feeItem.code,
          termLabel: s.charge.termLabel,
          amount: s.amount.minus(s.writtenBackAmount).toFixed(4),
          settled: s.settledAmount.toFixed(4),
        }))
        .sort((a, b) => a.studentNo.localeCompare(b.studentNo)),
    };
  });
}

// ---------------------------------------------------------------------------
// Settlement (REQ-SPN-03)
// ---------------------------------------------------------------------------

export interface SponsorReceiptInput {
  sponsorId: string;
  docDate: Date;
  channel: PaymentChannel;
  amount: MoneyInput;
  reference?: string | null;
  note?: string | null;
  /** Where the money landed. Defaults to the tenant's default bank account. */
  depositAccountId?: string | null;
  /**
   * Settle these shares explicitly. Omit to settle oldest invoiced first,
   * which is what a treasurer means by "put it against what they owe".
   */
  allocations?: Array<{ chargeSponsorshipId: string; amount: MoneyInput }>;
}

export interface SponsorReceiptResult {
  id: string;
  receiptNo: string;
  voucherRef: string;
  amount: string;
  allocated: string;
  unallocated: string;
}

export async function takeSponsorReceipt(
  principal: Principal,
  input: SponsorReceiptInput,
  idempotencyKey: string,
): Promise<SponsorReceiptResult> {
  requirePermission(principal, 'sponsor.invoice');

  if (!idempotencyKey?.trim()) {
    throw new SponsorBillingError('A sponsor receipt must carry an idempotency key.');
  }
  const amount = toStorage(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new SponsorBillingError('A receipt is for a positive amount.');
  }

  const { result } = await idempotent(
    principal.tenantId,
    idempotencyKey,
    'sponsor.takeReceipt',
    {
      sponsorId: input.sponsorId,
      docDate: toDateOnly(input.docDate).toISOString(),
      channel: input.channel,
      amount: amount.toFixed(4),
      reference: input.reference ?? null,
      actor: principal.userId,
    },
    (tx) => takeSponsorReceiptInTx(tx, principal, input, amount),
  );
  return result;
}

async function takeSponsorReceiptInTx(
  tx: Tx,
  principal: Principal,
  input: SponsorReceiptInput,
  amount: Money,
): Promise<SponsorReceiptResult> {
  const { tenantId } = principal;

  const sponsor = await tx.sponsor.findFirst({
    where: { id: input.sponsorId, tenantId },
    select: { id: true, code: true, nameEn: true },
  });
  if (!sponsor) {
    throw new SponsorBillingError('That sponsor does not belong to this university.');
  }

  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });

  const accounts = await requireAccounts(tx, tenantId, [
    'SPONSOR_AR_CONTROL',
    'DEFAULT_BANK',
    'DEFAULT_CASH',
  ] as const);

  const debitAccountId =
    input.depositAccountId ??
    (input.channel === 'CASH' ? accounts.DEFAULT_CASH : accounts.DEFAULT_BANK);

  const docDate = toDateOnly(input.docDate);

  const plan = input.allocations
    ? await explicitAllocation(tx, tenantId, sponsor.id, input.allocations, amount)
    : await fifoAllocation(tx, tenantId, sponsor.id, amount);

  const allocated = sum(plan.map((p) => p.amount));

  const lines: PostingLine[] = [
    {
      accountId: debitAccountId,
      debit: amount,
      description: `Sponsor receipt — ${sponsor.nameEn}`,
    },
    {
      accountId: accounts.SPONSOR_AR_CONTROL,
      subledgerType: 'SPONSOR',
      subledgerId: sponsor.id,
      credit: amount,
      description: `Sponsor receipt — ${sponsor.code}`,
    },
  ];

  const posted = await post(tx, tenantId, {
    voucherType: 'GENERAL_RECEIPT',
    docDate,
    description: `Sponsor receipt — ${sponsor.nameEn}${input.reference ? ` (${input.reference})` : ''}`,
    sourceModule: 'CASHIERING',
    sourceRef: sponsor.id,
    postedById: principal.userId,
    lines,
  });

  const receiptNo = await allocateSponsorDocumentNo(tx, tenantId, 'SR');

  const receipt = await tx.sponsorReceipt.create({
    data: {
      tenantId,
      sponsorId: sponsor.id,
      receiptNo,
      docDate,
      channel: input.channel,
      amount,
      allocatedAmount: allocated,
      currency: tenant.functionalCurrency.trim(),
      reference: input.reference?.trim() || null,
      note: input.note?.trim() || null,
      postedHeaderId: posted.headerId,
      createdById: principal.userId,
    },
    select: { id: true },
  });

  for (const p of plan) {
    await tx.sponsorReceiptAllocation.create({
      data: {
        tenantId,
        receiptId: receipt.id,
        chargeSponsorshipId: p.chargeSponsorshipId,
        amount: p.amount,
      },
    });
    await tx.chargeSponsorship.update({
      where: { id: p.chargeSponsorshipId },
      data: { settledAmount: { increment: p.amount } },
    });
  }

  await refreshInvoiceSettlement(tx, plan.map((p) => p.chargeSponsorshipId));

  await audit(tx, tenantId, {
    actorId: principal.userId,
    action: 'POST',
    resourceType: 'sponsor_receipt',
    resourceId: receipt.id,
    after: {
      receiptNo,
      sponsor: sponsor.code,
      amount: amount.toFixed(4),
      allocated: allocated.toFixed(4),
      voucherRef: posted.voucherRef,
    },
  });

  return {
    id: receipt.id,
    receiptNo,
    voucherRef: posted.voucherRef,
    amount: amount.toFixed(4),
    allocated: allocated.toFixed(4),
    unallocated: amount.minus(allocated).toFixed(4),
  };
}

// ---------------------------------------------------------------------------
// Default (REQ-SPN-03)
// ---------------------------------------------------------------------------

export interface DefaultResult {
  sponsorCode: string;
  voucherRef: string;
  transferred: string;
  studentsAffected: number;
}

/**
 * Move a sponsor's uncollected balance back onto the students it covered.
 *
 * The SRS calls this "an authorised action" and it is: a separate permission,
 * held by neither the person who wrote the contract nor the person who
 * collects against it. Whoever can declare a debt uncollectable and move it
 * onto somebody who already paid is a fraud risk, which is why
 * `sponsor.invoice` and `sponsor.default` are an SoD pair.
 *
 * It posts DR Student AR / CR Sponsor AR — the debt changes counterparty, it
 * is not forgiven — and reduces each charge's `sponsoredAmount` so the
 * student's statement starts showing it.
 */
export async function transferSponsorDefault(
  principal: Principal,
  input: {
    sponsorId: string;
    reason: string;
    /** Limit to one contract. Omit for everything this sponsor still owes. */
    sponsorshipId?: string;
    docDate?: Date;
  },
): Promise<DefaultResult> {
  requirePermission(principal, 'sponsor.default');

  const reason = input.reason?.trim();
  if (!reason) {
    throw new SponsorBillingError(
      'Transferring a sponsor default requires a stated reason. A student is about to be ' +
        'asked for money somebody else undertook to pay.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const { tenantId } = principal;

    const sponsor = await tx.sponsor.findFirst({
      where: { id: input.sponsorId, tenantId },
      select: { id: true, code: true, nameEn: true },
    });
    if (!sponsor) {
      throw new SponsorBillingError('That sponsor does not belong to this university.');
    }

    const shares = await tx.chargeSponsorship.findMany({
      where: {
        tenantId,
        sponsorId: sponsor.id,
        ...(input.sponsorshipId ? { sponsorshipId: input.sponsorshipId } : {}),
        charge: { reversedAt: null },
      },
      select: {
        id: true,
        amount: true,
        settledAmount: true,
        writtenBackAmount: true,
        sponsorshipId: true,
        chargeId: true,
        charge: {
          select: {
            studentId: true,
            feeItem: { select: { nameEn: true } },
            student: { select: { studentNo: true } },
          },
        },
      },
    });

    const owing = shares
      .map((s) => ({
        ...s,
        due: s.amount.minus(s.settledAmount).minus(s.writtenBackAmount),
      }))
      .filter((s) => s.due.greaterThan(0));

    if (owing.length === 0) {
      throw new SponsorBillingError(
        `${sponsor.nameEn} has nothing uncollected to transfer.`,
      );
    }

    const accounts = await requireAccounts(tx, tenantId, [
      'STUDENT_AR_CONTROL',
      'SPONSOR_AR_CONTROL',
    ] as const);

    const lines: PostingLine[] = [];
    for (const s of owing) {
      lines.push({
        accountId: accounts.STUDENT_AR_CONTROL,
        subledgerType: 'STUDENT',
        subledgerId: s.charge.studentId,
        debit: s.due,
        description:
          `Sponsor default — ${s.charge.feeItem.nameEn} — ${s.charge.student.studentNo}`,
      });
      lines.push({
        accountId: accounts.SPONSOR_AR_CONTROL,
        subledgerType: 'SPONSOR',
        subledgerId: sponsor.id,
        credit: s.due,
        description: `Sponsor default — ${sponsor.code} — ${s.charge.student.studentNo}`,
      });
    }

    const transferred = sum(owing.map((s) => s.due));

    const posted = await post(tx, tenantId, {
      voucherType: 'JOURNAL',
      docDate: toDateOnly(input.docDate ?? new Date()),
      description: `Sponsor default transferred to students — ${sponsor.nameEn}: ${reason}`,
      sourceModule: 'CASHIERING',
      sourceRef: sponsor.id,
      postedById: principal.userId,
      lines,
    });

    for (const s of owing) {
      await tx.chargeSponsorship.update({
        where: { id: s.id },
        data: { writtenBackAmount: { increment: s.due } },
      });
      // The student's own portion grows by exactly what the sponsor stopped
      // carrying. The deferred split trigger checks the two agree at COMMIT.
      await tx.studentCharge.update({
        where: { id: s.chargeId },
        data: { sponsoredAmount: { decrement: s.due } },
      });
      await tx.sponsorship.update({
        where: { id: s.sponsorshipId },
        data: { consumedAmount: { decrement: s.due } },
      });
    }

    const studentsAffected = new Set(owing.map((s) => s.charge.studentId)).size;

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'POST',
      resourceType: 'sponsor.default',
      resourceId: sponsor.id,
      after: {
        sponsor: sponsor.code,
        reason,
        transferred: transferred.toFixed(4),
        students: studentsAffected,
        voucherRef: posted.voucherRef,
      },
    });

    return {
      sponsorCode: sponsor.code,
      voucherRef: posted.voucherRef,
      transferred: transferred.toFixed(4),
      studentsAffected,
    };
  });
}

// ---------------------------------------------------------------------------
// Aging (REQ-SPN-03, mirroring REQ-RPT-02)
// ---------------------------------------------------------------------------

export interface SponsorAgingRow {
  sponsorId: string;
  sponsorCode: string;
  sponsorNameEn: string;
  total: string;
  buckets: string[];
}

export interface SponsorAging {
  asOf: string;
  bucketLabels: string[];
  rows: SponsorAgingRow[];
  total: string;
}

/**
 * What each sponsor owes, aged from the **invoice due date**.
 *
 * Uninvoiced shares are deliberately in the "current" bucket however old the
 * charge is: a sponsor is not late for a bill nobody has sent them, and aging
 * them from the charge date would produce a dunning list of the institution's
 * own administrative backlog.
 */
export async function sponsorAging(
  principal: Principal,
  asOfDate: Date = new Date(),
): Promise<SponsorAging> {
  requirePermission(principal, 'report.financial');

  const asOf = toDateOnly(asOfDate);
  const bounds = [30, 60, 90];
  const bucketLabels = ['Current', '31-60', '61-90', '>90'];

  return withTenant(principal.tenantId, async (tx) => {
    const shares = await tx.chargeSponsorship.findMany({
      where: { tenantId: principal.tenantId, charge: { reversedAt: null } },
      select: {
        amount: true,
        settledAmount: true,
        writtenBackAmount: true,
        sponsorId: true,
        sponsor: { select: { code: true, nameEn: true } },
        invoice: { select: { dueDate: true, status: true } },
      },
    });

    const perSponsor = new Map<
      string,
      { code: string; nameEn: string; total: Money; buckets: Money[] }
    >();
    let grand = ZERO;

    for (const s of shares) {
      const due = s.amount.minus(s.settledAmount).minus(s.writtenBackAmount);
      if (due.lessThanOrEqualTo(0)) continue;
      if (s.invoice?.status === 'CANCELLED') continue;

      const row =
        perSponsor.get(s.sponsorId) ??
        {
          code: s.sponsor.code,
          nameEn: s.sponsor.nameEn,
          total: ZERO,
          buckets: bucketLabels.map(() => ZERO),
        };

      const daysLate = s.invoice
        ? Math.floor((asOf.getTime() - toDateOnly(s.invoice.dueDate).getTime()) / 86_400_000)
        : 0;

      let idx = 0;
      if (daysLate > bounds[2]) idx = 3;
      else if (daysLate > bounds[1]) idx = 2;
      else if (daysLate > bounds[0]) idx = 1;

      row.buckets[idx] = row.buckets[idx].plus(due);
      row.total = row.total.plus(due);
      perSponsor.set(s.sponsorId, row);
      grand = grand.plus(due);
    }

    return {
      asOf: iso(asOf),
      bucketLabels,
      total: grand.toFixed(4),
      rows: [...perSponsor.entries()]
        .map(([sponsorId, r]) => ({
          sponsorId,
          sponsorCode: r.code,
          sponsorNameEn: r.nameEn,
          total: r.total.toFixed(4),
          buckets: r.buckets.map((b) => b.toFixed(4)),
        }))
        .sort((a, b) => a.sponsorCode.localeCompare(b.sponsorCode)),
    };
  });
}

/**
 * The sponsor sub-ledger against its control account.
 *
 * The same check A3 built for students, on the other counterparty. Without it
 * a sponsor's shares and the Sponsor AR balance drift with nothing able to
 * detect it — which is precisely how the legacy student balances behaved.
 */
export async function reconcileSponsorSubledger(
  tx: Tx,
  tenantId: string,
): Promise<{ ok: boolean; subledger: string; control: string; variance: string }> {
  const accounts = await requireAccounts(tx, tenantId, ['SPONSOR_AR_CONTROL'] as const);

  const shares = await tx.chargeSponsorship.findMany({
    where: { tenantId, charge: { reversedAt: null } },
    select: { amount: true, settledAmount: true, writtenBackAmount: true },
  });
  const subledger = sum(
    shares.map((s) => s.amount.minus(s.settledAmount).minus(s.writtenBackAmount)),
  );

  const agg = await tx.accountPeriodBalance.aggregate({
    where: { tenantId, accountId: accounts.SPONSOR_AR_CONTROL },
    _sum: {
      openingDebit: true,
      openingCredit: true,
      movementDebit: true,
      movementCredit: true,
    },
  });
  const debit = (agg._sum.openingDebit ?? ZERO).plus(agg._sum.movementDebit ?? ZERO);
  const credit = (agg._sum.openingCredit ?? ZERO).plus(agg._sum.movementCredit ?? ZERO);
  const control = debit.minus(credit);

  const variance = subledger.minus(control);
  return {
    ok: variance.isZero(),
    subledger: subledger.toFixed(4),
    control: control.toFixed(4),
    variance: variance.toFixed(4),
  };
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function fifoAllocation(
  tx: Tx,
  tenantId: string,
  sponsorId: string,
  amount: Money,
): Promise<Array<{ chargeSponsorshipId: string; amount: Money }>> {
  const shares = await tx.chargeSponsorship.findMany({
    where: { tenantId, sponsorId, charge: { reversedAt: null } },
    orderBy: [{ invoiceId: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
    select: {
      id: true,
      amount: true,
      settledAmount: true,
      writtenBackAmount: true,
      invoice: { select: { dueDate: true } },
    },
  });

  // Invoiced shares first, oldest due date first. An uninvoiced share is not
  // yet something the sponsor has been asked for.
  const open = shares
    .map((s) => ({
      id: s.id,
      due: s.amount.minus(s.settledAmount).minus(s.writtenBackAmount),
      dueDate: s.invoice?.dueDate ?? null,
    }))
    .filter((s) => s.due.greaterThan(0))
    .sort((a, b) => {
      if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return 0;
    });

  const plan: Array<{ chargeSponsorshipId: string; amount: Money }> = [];
  let left = amount;
  for (const s of open) {
    if (left.lessThanOrEqualTo(0)) break;
    const take = left.greaterThan(s.due) ? s.due : left;
    plan.push({ chargeSponsorshipId: s.id, amount: take });
    left = left.minus(take);
  }
  return plan;
}

async function explicitAllocation(
  tx: Tx,
  tenantId: string,
  sponsorId: string,
  requested: Array<{ chargeSponsorshipId: string; amount: MoneyInput }>,
  receiptAmount: Money,
): Promise<Array<{ chargeSponsorshipId: string; amount: Money }>> {
  const plan = requested.map((r) => ({
    chargeSponsorshipId: r.chargeSponsorshipId,
    amount: toStorage(r.amount),
  }));

  const total = sum(plan.map((p) => p.amount));
  if (total.greaterThan(receiptAmount)) {
    throw new SponsorBillingError(
      `The allocations total ${total.toFixed(2)} against a receipt of ` +
        `${receiptAmount.toFixed(2)}. Money cannot pay for more than arrived.`,
    );
  }

  for (const p of plan) {
    if (p.amount.lessThanOrEqualTo(0)) {
      throw new SponsorBillingError('An allocation is for a positive amount.');
    }
    const share = await tx.chargeSponsorship.findFirst({
      where: { id: p.chargeSponsorshipId, tenantId, sponsorId },
      select: { amount: true, settledAmount: true, writtenBackAmount: true },
    });
    if (!share) {
      throw new SponsorBillingError(
        'An allocation names a share that does not belong to this sponsor.',
      );
    }
    const due = share.amount.minus(share.settledAmount).minus(share.writtenBackAmount);
    if (p.amount.greaterThan(due)) {
      throw new SponsorBillingError(
        `An allocation of ${p.amount.toFixed(2)} exceeds the ${due.toFixed(2)} still owed ` +
          `on that share. Overpayment is held on the sponsor account, not forced onto a line.`,
      );
    }
  }
  return plan;
}

/** Roll an invoice's settled figure and status forward from its shares. */
async function refreshInvoiceSettlement(tx: Tx, shareIds: string[]): Promise<void> {
  if (shareIds.length === 0) return;

  const shares = await tx.chargeSponsorship.findMany({
    where: { id: { in: shareIds }, invoiceId: { not: null } },
    select: { invoiceId: true },
  });
  const invoiceIds = [...new Set(shares.map((s) => s.invoiceId!))];

  for (const invoiceId of invoiceIds) {
    const rows = await tx.chargeSponsorship.findMany({
      where: { invoiceId },
      select: { amount: true, settledAmount: true, writtenBackAmount: true },
    });
    const settled = sum(rows.map((r) => r.settledAmount));
    const billed = sum(rows.map((r) => r.amount.minus(r.writtenBackAmount)));

    await tx.sponsorInvoice.update({
      where: { id: invoiceId },
      data: {
        settledAmount: settled,
        status: settled.greaterThanOrEqualTo(billed)
          ? 'SETTLED'
          : settled.greaterThan(0)
            ? 'PARTIALLY_SETTLED'
            : 'ISSUED',
      },
    });
  }
}

/**
 * `SPONSOR-INV-00001`, allocated under an advisory lock per tenant.
 *
 * Not the fiscal-year voucher sequence: an invoice is not a voucher and does
 * not post. Not `MAX+1` on an autocommit connection either — the mistake B4
 * found in the registration screen.
 */
async function allocateSponsorDocumentNo(
  tx: Tx,
  tenantId: string,
  kind: 'INV' | 'SR',
): Promise<string> {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${tenantId + ':sponsor:' + kind}::text, 0))
  `;

  const prefix = `${kind}-`;
  if (kind === 'INV') {
    const last = await tx.sponsorInvoice.findFirst({
      where: { tenantId, invoiceNo: { startsWith: prefix } },
      orderBy: { invoiceNo: 'desc' },
      select: { invoiceNo: true },
    });
    const next = last ? Number(last.invoiceNo.slice(prefix.length)) + 1 : 1;
    return `${prefix}${String(next).padStart(5, '0')}`;
  }

  const last = await tx.sponsorReceipt.findFirst({
    where: { tenantId, receiptNo: { startsWith: prefix } },
    orderBy: { receiptNo: 'desc' },
    select: { receiptNo: true },
  });
  const next = last ? Number(last.receiptNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export { SponsorError };
