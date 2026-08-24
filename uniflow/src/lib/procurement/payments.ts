import 'server-only';
import type { PaymentChannel } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import { resolvePeriod, toDateOnly } from '@/lib/ledger/period';
import { post, type PostingLine } from '@/lib/ledger/posting';
import { requireAccount } from '@/lib/coa/mapping';
import { sum, toStorage, type Money, type MoneyInput } from '@/lib/money';
import { allocateProcurementNumber } from './numbering';
import { lockInvoice } from './invoices';
import { requirePayableVendor } from './vendors';

/**
 * Payment vouchers (SRS REQ-PRC-05).
 *
 *     DR  Vendor AP        the payable being cleared
 *       CR  Cash / Bank      where the money came from
 *
 * The legacy `frmMakePayBill` posted the *expense* straight against cash, with
 * no payable in between and no vendor anywhere, so there was never a moment at
 * which the institution could state what it owed. This is the third and last
 * step of the accrual chain the receipt started.
 *
 * Two people, always. `payment.create` prepares; `payment.approve` releases,
 * and approval is what posts — a voucher that is approved but unposted would
 * be a decision to pay with no payment, and the two are the same act. The
 * second factor is required on approval rather than on preparation, because
 * drafting moves nothing.
 *
 * A payment settles specific invoices rather than a vendor balance. Paying
 * "the vendor" and letting the system decide is how a disputed invoice gets
 * quietly settled: the allocation is the record of which bills this money
 * answered.
 */

export class PaymentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}

export interface PaymentAllocationInput {
  invoiceId: string;
  amount: MoneyInput;
}

export interface DraftPaymentInput {
  vendorId: string;
  paymentDate: Date;
  channel: Extract<PaymentChannel, 'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>;
  /** The cash or bank account the money leaves. */
  bankAccountId: string;
  chequeNo?: string;
  reference?: string;
  allocations: PaymentAllocationInput[];
}

export interface PaymentRecord {
  id: string;
  pvNo: string;
  state: string;
  amount: string;
  invoiceCount: number;
}

export async function draftPayment(
  principal: Principal,
  input: DraftPaymentInput,
): Promise<PaymentRecord> {
  requirePermission(principal, 'payment.create');
  const { tenantId } = principal;

  if (input.allocations.length === 0) {
    throw new PaymentError(
      'A payment voucher must say which invoices it settles. Paying a vendor balance ' +
        'without naming the bills is how a disputed invoice gets quietly settled.',
    );
  }
  if (input.channel === 'CHEQUE' && !input.chequeNo?.trim()) {
    throw new PaymentError(
      'A cheque payment needs its cheque number, or the bank reconciliation has nothing ' +
        'to match on.',
    );
  }

  return withTenant(tenantId, async (tx) => {
    const vendor = await requirePayableVendor(tx, tenantId, input.vendorId);
    const paymentDate = toDateOnly(input.paymentDate);
    const { fiscalYearId } = await resolvePeriod(tx, tenantId, paymentDate);
    const year = await tx.fiscalYear.findUniqueOrThrow({
      where: { id: fiscalYearId },
      select: { name: true },
    });

    const bank = await tx.account.findUnique({
      where: { id: input.bankAccountId },
      select: { id: true, tenantId: true, code: true, isPostable: true, isActive: true },
    });
    if (!bank || bank.tenantId !== tenantId) {
      throw new PaymentError('That cash or bank account is not in this chart.');
    }
    if (!bank.isActive || !bank.isPostable) {
      throw new PaymentError(`Account ${bank.code} cannot receive a posting.`);
    }

    const total = await validateAllocations(tx, tenantId, vendor.id, input.allocations);

    const { docNo } = await allocateProcurementNumber(
      tx,
      tenantId,
      fiscalYearId,
      year.name,
      'PAYMENT_VOUCHER',
    );

    const pv = await tx.paymentVoucher.create({
      data: {
        tenantId,
        pvNo: docNo,
        vendorId: vendor.id,
        paymentDate,
        channel: input.channel,
        bankAccountId: bank.id,
        chequeNo: input.chequeNo?.trim() || null,
        reference: input.reference?.trim() || null,
        currency: (
          await tx.tenant.findUniqueOrThrow({
            where: { id: tenantId },
            select: { functionalCurrency: true },
          })
        ).functionalCurrency.trim(),
        amount: total,
        createdById: principal.userId,
        allocations: {
          create: input.allocations.map((a) => ({
            tenantId,
            invoiceId: a.invoiceId,
            amount: toStorage(a.amount),
          })),
        },
      },
      select: { id: true },
    });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'payment_voucher',
      resourceId: pv.id,
      after: {
        pvNo: docNo,
        vendor: vendor.code,
        amount: total.toFixed(4),
        channel: input.channel,
        invoices: input.allocations.length,
      },
    });

    return {
      id: pv.id,
      pvNo: docNo,
      state: 'DRAFT',
      amount: total.toFixed(4),
      invoiceCount: input.allocations.length,
    };
  });
}

export async function submitPayment(principal: Principal, paymentId: string): Promise<void> {
  requirePermission(principal, 'payment.create');

  await withTenant(principal.tenantId, async (tx) => {
    const pv = await lockPayment(tx, principal.tenantId, paymentId);
    if (pv.state !== 'DRAFT') {
      throw new PaymentError(`Payment voucher ${pv.pvNo} is ${pv.state}, not a draft.`);
    }

    await tx.paymentVoucher.update({
      where: { id: paymentId },
      data: { state: 'PENDING_APPROVAL', submittedAt: new Date() },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'payment_voucher',
      resourceId: paymentId,
      before: { state: 'DRAFT' },
      after: { state: 'PENDING_APPROVAL' },
    });
  });
}

export interface PaymentApproval {
  pvNo: string;
  voucherRef: string;
  amount: string;
  invoicesSettled: number;
}

/**
 * Approve and pay.
 *
 * The allocations are re-validated here rather than trusted from the draft.
 * Between drafting and approval another payment may have settled the same
 * invoice, and an approver signing an amount that no longer matches what is
 * owed is precisely the case a second signature is supposed to catch.
 */
export async function approvePayment(
  principal: Principal,
  paymentId: string,
  opts: { note?: string } = {},
): Promise<PaymentApproval> {
  requirePermission(principal, 'payment.approve');
  const { tenantId } = principal;

  return withTenant(tenantId, async (tx) => {
    const pv = await lockPayment(tx, tenantId, paymentId);
    if (pv.state !== 'PENDING_APPROVAL') {
      throw new PaymentError(
        `Payment voucher ${pv.pvNo} is ${pv.state} and is not awaiting approval.`,
      );
    }

    assertNotSelfApproval(principal, pv.createdById, `payment voucher ${pv.pvNo}`);

    const vendor = await requirePayableVendor(tx, tenantId, pv.vendorId);

    const allocations = await tx.paymentAllocation.findMany({
      where: { paymentVoucherId: paymentId },
      select: { invoiceId: true, amount: true },
    });

    const total = await validateAllocations(tx, tenantId, vendor.id, allocations);
    if (!total.equals(pv.amount)) {
      throw new PaymentError(
        `Payment voucher ${pv.pvNo} is for ${pv.amount.toFixed(2)} but its allocations now ` +
          `come to ${total.toFixed(2)}. Something else settled one of these invoices in the ` +
          `meantime — redraft it.`,
      );
    }

    const apId = await requireAccount(tx, tenantId, 'VENDOR_AP_CONTROL');

    const lines: PostingLine[] = [
      {
        accountId: apId,
        debit: total,
        subledgerType: 'VENDOR',
        subledgerId: vendor.id,
        description: `${pv.pvNo} — ${vendor.code}`,
      },
      {
        accountId: pv.bankAccountId,
        credit: total,
        description:
          pv.channel === 'CHEQUE'
            ? `${pv.pvNo} — cheque ${pv.chequeNo}`
            : `${pv.pvNo} — ${pv.channel}`,
      },
    ];

    const voucher = await post(tx, tenantId, {
      voucherType: 'PAYMENT',
      docDate: pv.paymentDate,
      description: `Payment ${pv.pvNo} to ${vendor.nameEn}`,
      sourceModule: 'PROCUREMENT',
      sourceRef: paymentId,
      postedById: principal.userId,
      lines,
    });

    for (const a of allocations) {
      const invoice = await lockInvoice(tx, tenantId, a.invoiceId);
      const settled = invoice.settledAmount.plus(a.amount);
      await tx.vendorInvoice.update({
        where: { id: a.invoiceId },
        data: {
          settledAmount: settled,
          state: settled.equals(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID',
        },
      });
    }

    await tx.paymentVoucher.update({
      where: { id: paymentId },
      data: {
        state: 'PAID',
        approvedById: principal.userId,
        approvedAt: new Date(),
        decisionNote: opts.note?.trim() || null,
        postedHeaderId: voucher.headerId,
      },
    });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'payment_voucher',
      resourceId: paymentId,
      before: { state: 'PENDING_APPROVAL' },
      after: {
        state: 'PAID',
        pvNo: pv.pvNo,
        voucherRef: voucher.voucherRef,
        amount: total.toFixed(4),
        invoices: allocations.length,
        preparedById: pv.createdById,
      },
    });

    return {
      pvNo: pv.pvNo,
      voucherRef: voucher.voucherRef,
      amount: total.toFixed(4),
      invoicesSettled: allocations.length,
    };
  });
}

export async function rejectPayment(
  principal: Principal,
  paymentId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'payment.approve');
  if (!reason?.trim()) {
    throw new PaymentError('Refusing a payment requires a stated reason.');
  }

  await withTenant(principal.tenantId, async (tx) => {
    const pv = await lockPayment(tx, principal.tenantId, paymentId);
    if (pv.state !== 'PENDING_APPROVAL') {
      throw new PaymentError(
        `Payment voucher ${pv.pvNo} is ${pv.state} and is not awaiting approval.`,
      );
    }

    await tx.paymentVoucher.update({
      where: { id: paymentId },
      data: {
        state: 'REJECTED',
        approvedById: principal.userId,
        approvedAt: new Date(),
        decisionNote: reason.trim(),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REJECT',
      resourceType: 'payment_voucher',
      resourceId: paymentId,
      after: { state: 'REJECTED', reason: reason.trim() },
    });
  });
}

/**
 * Check that a set of allocations can actually be paid.
 *
 * Every invoice must belong to this vendor, be posted, be live, and have at
 * least the allocated amount still outstanding. All four, because each is a
 * different way of paying money that is not owed — and the last one is the
 * one that produces a negative payable, which reconciles to nothing.
 */
async function validateAllocations(
  tx: Tx,
  tenantId: string,
  vendorId: string,
  allocations: Array<{ invoiceId: string; amount: MoneyInput }>,
): Promise<Money> {
  const seen = new Set<string>();
  for (const a of allocations) {
    if (seen.has(a.invoiceId)) {
      throw new PaymentError(
        'The same invoice appears twice on this payment. Combine the amounts.',
      );
    }
    seen.add(a.invoiceId);
    if (toStorage(a.amount).lessThanOrEqualTo(0)) {
      throw new PaymentError('An allocation must be for a positive amount.');
    }
  }

  const invoices = await tx.vendorInvoice.findMany({
    where: { id: { in: allocations.map((a) => a.invoiceId) } },
    select: {
      id: true,
      tenantId: true,
      internalNo: true,
      vendorId: true,
      state: true,
      totalAmount: true,
      settledAmount: true,
    },
  });
  const byId = new Map(invoices.map((i) => [i.id, i]));

  let total: Money = toStorage(0);
  for (const a of allocations) {
    const invoice = byId.get(a.invoiceId);
    if (!invoice || invoice.tenantId !== tenantId) {
      throw new PaymentError('An allocation names an invoice that is not in this university.');
    }
    if (invoice.vendorId !== vendorId) {
      throw new PaymentError(
        `Invoice ${invoice.internalNo} belongs to a different vendor. One payment settles ` +
          `one vendor's bills.`,
      );
    }
    if (invoice.state === 'ON_HOLD') {
      throw new PaymentError(
        `Invoice ${invoice.internalNo} failed the three-way match and is on hold. It has ` +
          `not been posted, so there is nothing to pay yet.`,
      );
    }
    if (invoice.state === 'CANCELLED') {
      throw new PaymentError(`Invoice ${invoice.internalNo} is cancelled.`);
    }

    const outstanding = invoice.totalAmount.minus(invoice.settledAmount);
    const amount = toStorage(a.amount);
    if (amount.greaterThan(outstanding)) {
      throw new PaymentError(
        `Invoice ${invoice.internalNo} has ${outstanding.toFixed(2)} outstanding and ` +
          `${amount.toFixed(2)} is allocated to it.`,
      );
    }
    total = total.plus(amount);
  }

  return total;
}

export interface PaymentProposalRow {
  invoiceId: string;
  internalNo: string;
  vendorInvoiceNo: string;
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  dueDate: Date;
  outstanding: string;
  daysOverdue: number;
}

/**
 * The payment run (SRS REQ-PRC-05): what is due, and to whom.
 *
 * A proposal, not an action. It selects; a person decides. An automatic
 * payment run that also pays is a single point at which one compromised
 * account empties a bank balance.
 *
 * Held invoices are excluded by construction — they have not posted, so
 * nothing is owed on them yet.
 */
export async function paymentProposal(
  principal: Principal,
  opts: { dueBy?: Date; vendorId?: string } = {},
): Promise<PaymentProposalRow[]> {
  requirePermission(principal, 'payment.create');
  const dueBy = toDateOnly(opts.dueBy ?? new Date());

  return withTenant(principal.tenantId, async (tx) => {
    const invoices = await tx.vendorInvoice.findMany({
      where: {
        tenantId: principal.tenantId,
        state: { in: ['MATCHED', 'APPROVED', 'PARTIALLY_PAID'] },
        dueDate: { lte: dueBy },
        ...(opts.vendorId ? { vendorId: opts.vendorId } : {}),
      },
      select: {
        id: true,
        internalNo: true,
        vendorInvoiceNo: true,
        dueDate: true,
        totalAmount: true,
        settledAmount: true,
        vendor: { select: { id: true, code: true, nameEn: true, isBlocked: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    return invoices
      .filter((i) => !i.vendor.isBlocked)
      .map((i) => ({
        invoiceId: i.id,
        internalNo: i.internalNo,
        vendorInvoiceNo: i.vendorInvoiceNo,
        vendorId: i.vendor.id,
        vendorCode: i.vendor.code,
        vendorName: i.vendor.nameEn,
        dueDate: i.dueDate,
        outstanding: i.totalAmount.minus(i.settledAmount).toFixed(4),
        daysOverdue: Math.max(
          0,
          Math.floor((dueBy.getTime() - toDateOnly(i.dueDate).getTime()) / 86_400_000),
        ),
      }))
      .filter((r) => toStorage(r.outstanding).greaterThan(0));
  });
}

export interface VendorStatementRow {
  date: Date;
  kind: 'INVOICE' | 'PAYMENT';
  ref: string;
  description: string;
  charged: string;
  paid: string;
}

/** What one vendor billed and what was paid, in date order. */
export async function vendorStatement(
  principal: Principal,
  vendorId: string,
): Promise<{ rows: VendorStatementRow[]; outstanding: string }> {
  requirePermission(principal, 'report.financial');

  return withTenant(principal.tenantId, async (tx) => {
    const invoices = await tx.vendorInvoice.findMany({
      where: {
        tenantId: principal.tenantId,
        vendorId,
        state: { in: ['MATCHED', 'APPROVED', 'PARTIALLY_PAID', 'PAID'] },
      },
      select: {
        internalNo: true,
        vendorInvoiceNo: true,
        invoiceDate: true,
        totalAmount: true,
        settledAmount: true,
      },
    });

    const payments = await tx.paymentVoucher.findMany({
      where: { tenantId: principal.tenantId, vendorId, state: 'PAID' },
      select: { pvNo: true, paymentDate: true, amount: true, channel: true },
    });

    const rows: VendorStatementRow[] = [
      ...invoices.map((i) => ({
        date: i.invoiceDate,
        kind: 'INVOICE' as const,
        ref: i.internalNo,
        description: `Invoice ${i.vendorInvoiceNo}`,
        charged: i.totalAmount.toFixed(4),
        paid: '0.0000',
      })),
      ...payments.map((p) => ({
        date: p.paymentDate,
        kind: 'PAYMENT' as const,
        ref: p.pvNo,
        description: `Payment by ${p.channel}`,
        charged: '0.0000',
        paid: p.amount.toFixed(4),
      })),
    ].sort((a, b) => a.date.getTime() - b.date.getTime() || a.ref.localeCompare(b.ref));

    const outstanding = sum(invoices.map((i) => i.totalAmount.minus(i.settledAmount)));

    return { rows, outstanding: outstanding.toFixed(4) };
  });
}

async function lockPayment(
  tx: Tx,
  tenantId: string,
  paymentId: string,
): Promise<{
  id: string;
  pvNo: string;
  state: string;
  createdById: string;
  vendorId: string;
  bankAccountId: string;
  paymentDate: Date;
  channel: PaymentChannel;
  chequeNo: string | null;
  amount: Money;
}> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      pv_no: string;
      state: string;
      created_by_id: string;
      vendor_id: string;
      bank_account_id: string;
      payment_date: Date;
      channel: PaymentChannel;
      cheque_no: string | null;
      amount: Money;
    }>
  >`
    SELECT id, pv_no, state::text, created_by_id, vendor_id, bank_account_id,
           payment_date, channel, cheque_no, amount
      FROM payment_vouchers
     WHERE id = ${paymentId}::uuid AND tenant_id = ${tenantId}::uuid
       FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new PaymentError('That payment voucher does not exist in this university.');
  }
  const r = rows[0];
  return {
    id: r.id,
    pvNo: r.pv_no,
    state: r.state,
    createdById: r.created_by_id,
    vendorId: r.vendor_id,
    bankAccountId: r.bank_account_id,
    paymentDate: r.payment_date,
    channel: r.channel,
    chequeNo: r.cheque_no,
    amount: toStorage(r.amount),
  };
}
