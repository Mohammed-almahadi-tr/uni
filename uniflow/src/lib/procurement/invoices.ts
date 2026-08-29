import 'server-only';
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
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import { allocateProcurementNumber } from './numbering';
import { priceLines } from './requisition';
import { requirePayableVendor } from './vendors';

/**
 * Vendor invoices and the three-way match (SRS REQ-PRC-04).
 *
 *     DR  Goods Received Not Invoiced   the accrual the receipt raised
 *       CR  Vendor AP                     what we now formally owe
 *
 * so the expense keeps the date it was incurred and the payable appears on
 * the day the bill does. Nothing about the expense moves.
 *
 * The match compares three independent records of the same purchase — what
 * was ordered, what arrived, and what is being billed — and the reason it is
 * three rather than two is that each comes from a different person. The SoD
 * matrix keeps `po.create`, `grn.create` and `apinvoice.record` apart for
 * exactly this reason; a match between two documents written by the same
 * hand proves nothing.
 *
 * A failed match **holds** the invoice rather than rejecting it, because most
 * failures are a price change somebody authorised verbally and nobody wrote
 * down. Releasing a held invoice is a separate permission, and the person who
 * releases it is recorded — that is the whole content of the control: an
 * invoice being paid on somebody's judgement rather than on the evidence, and
 * a name against that judgement.
 */

export class InvoiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvoiceError';
  }
}

/** How far an invoice may differ from the order before it is held. */
export interface MatchTolerance {
  /** Fractional price variance per line, e.g. 0.02 for 2%. */
  pricePct: number;
  /** Absolute money variance per line, whichever is larger. */
  priceAbs: MoneyInput;
}

/**
 * The default, and the reasoning: a couple of percent covers rounding and a
 * modest exchange or freight movement, and a small absolute floor stops a
 * percentage tolerance being meaningless on a 40-unit line item.
 */
export const DEFAULT_TOLERANCE: MatchTolerance = { pricePct: 0.02, priceAbs: '10' };

export interface InvoiceLineInput {
  description: string;
  /** Null for a non-PO invoice — a utility bill has no purchase order. */
  poLineId?: string | null;
  accountId: string;
  costCenterId?: string | null;
  quantity: MoneyInput;
  unitPrice: MoneyInput;
}

export interface RecordInvoiceInput {
  vendorId: string;
  vendorInvoiceNo: string;
  purchaseOrderId?: string | null;
  invoiceDate: Date;
  dueDate?: Date;
  lines: InvoiceLineInput[];
  tolerance?: MatchTolerance;
}

export interface InvoiceRecord {
  id: string;
  internalNo: string;
  state: string;
  totalAmount: string;
  voucherRef: string | null;
  holdReason: string | null;
  matchIssues: string[];
}

export async function recordInvoice(
  principal: Principal,
  input: RecordInvoiceInput,
): Promise<InvoiceRecord> {
  requirePermission(principal, 'apinvoice.record');
  const { tenantId } = principal;

  if (input.lines.length === 0) {
    throw new InvoiceError('An invoice needs at least one line.');
  }
  if (!input.vendorInvoiceNo?.trim()) {
    throw new InvoiceError(
      "The vendor's own invoice number is required. It is what stops the same bill being " +
        'paid twice.',
    );
  }

  return withTenant(tenantId, async (tx) => {
    const vendor = await requirePayableVendor(tx, tenantId, input.vendorId);
    const invoiceDate = toDateOnly(input.invoiceDate);
    const { fiscalYearId } = await resolvePeriod(tx, tenantId, invoiceDate);
    const year = await tx.fiscalYear.findUniqueOrThrow({
      where: { id: fiscalYearId },
      select: { name: true },
    });

    const vendorInvoiceNo = input.vendorInvoiceNo.trim();
    const duplicate = await tx.vendorInvoice.findFirst({
      where: { tenantId, vendorId: vendor.id, vendorInvoiceNo },
      select: { internalNo: true, state: true },
    });
    if (duplicate) {
      throw new InvoiceError(
        `Invoice ${vendorInvoiceNo} from ${vendor.code} has already been entered as ` +
          `${duplicate.internalNo} (${duplicate.state}). Paying the same bill twice is the ` +
          `most common single loss in accounts payable, and it is nearly always this.`,
      );
    }

    const priced = await priceLines(tx, tenantId, input.lines);
    const total = sum(priced.map((l) => l.amount));
    const dueDate = input.dueDate
      ? toDateOnly(input.dueDate)
      : addDays(invoiceDate, vendor.paymentTermsDays);
    if (dueDate < invoiceDate) {
      throw new InvoiceError('An invoice cannot fall due before it was issued.');
    }

    const match = await runThreeWayMatch(
      tx,
      tenantId,
      input.purchaseOrderId ?? null,
      input.lines,
      priced,
      input.tolerance ?? DEFAULT_TOLERANCE,
    );

    const { docNo } = await allocateProcurementNumber(
      tx,
      tenantId,
      fiscalYearId,
      year.name,
      'VENDOR_INVOICE',
    );

    const held = match.issues.length > 0;
    const holdReason = held ? match.issues.join(' · ') : null;

    // A held invoice does NOT post. That is the whole of the control: the
    // payable does not exist until somebody has taken responsibility for the
    // difference between what was ordered and what is being billed.
    const voucher = held
      ? null
      : await postInvoice(tx, tenantId, principal.userId, {
          docNo,
          vendorId: vendor.id,
          vendorCode: vendor.code,
          invoiceDate,
          total,
          lines: priced.map((l, i) => ({
            accountId: l.accountId,
            costCenterId: l.costCenterId,
            amount: l.amount,
            description: l.description,
            poLineId: input.lines[i].poLineId ?? null,
          })),
        });

    const invoice = await tx.vendorInvoice.create({
      data: {
        tenantId,
        internalNo: docNo,
        vendorInvoiceNo,
        vendorId: vendor.id,
        purchaseOrderId: input.purchaseOrderId ?? null,
        invoiceDate,
        dueDate,
        currency: priced[0].currency,
        totalAmount: total,
        state: held ? 'ON_HOLD' : 'MATCHED',
        holdReason,
        postedHeaderId: voucher?.headerId ?? null,
        createdById: principal.userId,
        lines: {
          create: priced.map((l, i) => ({
            tenantId,
            lineNo: i + 1,
            description: l.description,
            poLineId: input.lines[i].poLineId ?? null,
            accountId: l.accountId,
            costCenterId: l.costCenterId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amount: l.amount,
          })),
        },
      },
      select: { id: true },
    });

    if (!held) {
      await advanceInvoicedQuantities(tx, input.lines, priced);
    }

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'vendor_invoice',
      resourceId: invoice.id,
      after: {
        internalNo: docNo,
        vendorInvoiceNo,
        vendor: vendor.code,
        total: total.toFixed(4),
        state: held ? 'ON_HOLD' : 'MATCHED',
        voucherRef: voucher?.voucherRef ?? null,
        matchIssues: match.issues,
      },
    });

    return {
      id: invoice.id,
      internalNo: docNo,
      state: held ? 'ON_HOLD' : 'MATCHED',
      totalAmount: total.toFixed(4),
      voucherRef: voucher?.voucherRef ?? null,
      holdReason,
      matchIssues: match.issues,
    };
  });
}

/**
 * Release a held invoice and post it (SRS REQ-PRC-04).
 *
 * Separate permission, second person, reason recorded. The invoice keeps its
 * hold reason as well as the approval, so the file shows both what was wrong
 * and who decided to pay it anyway.
 */
export async function approveHeldInvoice(
  principal: Principal,
  invoiceId: string,
  reason: string,
): Promise<{ voucherRef: string }> {
  requirePermission(principal, 'apinvoice.approve');
  if (!reason?.trim()) {
    throw new InvoiceError(
      'Releasing an invoice that failed the three-way match requires a stated reason. ' +
        'It is being paid on judgement rather than on evidence, and the file should say ' +
        'whose judgement and why.',
    );
  }
  const { tenantId } = principal;

  return withTenant(tenantId, async (tx) => {
    const invoice = await lockInvoice(tx, tenantId, invoiceId);
    if (invoice.state !== 'ON_HOLD') {
      throw new InvoiceError(
        `Invoice ${invoice.internalNo} is ${invoice.state} and is not on hold.`,
      );
    }

    assertNotSelfApproval(principal, invoice.createdById, `invoice ${invoice.internalNo}`);

    const full = await tx.vendorInvoice.findUniqueOrThrow({
      where: { id: invoiceId },
      select: {
        invoiceDate: true,
        totalAmount: true,
        vendor: { select: { id: true, code: true } },
        lines: {
          select: {
            lineNo: true,
            description: true,
            poLineId: true,
            accountId: true,
            costCenterId: true,
            quantity: true,
            unitPrice: true,
            amount: true,
          },
          orderBy: { lineNo: 'asc' },
        },
      },
    });

    const voucher = await postInvoice(tx, tenantId, principal.userId, {
      docNo: invoice.internalNo,
      vendorId: full.vendor.id,
      vendorCode: full.vendor.code,
      invoiceDate: full.invoiceDate,
      total: full.totalAmount,
      lines: full.lines.map((l) => ({
        accountId: l.accountId,
        costCenterId: l.costCenterId,
        amount: l.amount,
        description: l.description,
        poLineId: l.poLineId,
      })),
    });

    await tx.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        state: 'APPROVED',
        postedHeaderId: voucher.headerId,
        approvedById: principal.userId,
        approvedAt: new Date(),
      },
    });

    await advanceInvoicedQuantities(
      tx,
      full.lines.map((l) => ({ poLineId: l.poLineId })),
      full.lines.map((l) => ({ quantity: l.quantity })),
    );

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'vendor_invoice',
      resourceId: invoiceId,
      before: { state: 'ON_HOLD', holdReason: invoice.holdReason },
      after: {
        state: 'APPROVED',
        voucherRef: voucher.voucherRef,
        reason: reason.trim(),
        recordedById: invoice.createdById,
      },
    });

    return { voucherRef: voucher.voucherRef };
  });
}

/** Refuse a held invoice outright — a bill for something that never arrived. */
export async function rejectHeldInvoice(
  principal: Principal,
  invoiceId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'apinvoice.approve');
  if (!reason?.trim()) {
    throw new InvoiceError('Rejecting an invoice requires a stated reason.');
  }

  await withTenant(principal.tenantId, async (tx) => {
    const invoice = await lockInvoice(tx, principal.tenantId, invoiceId);
    if (invoice.state !== 'ON_HOLD') {
      throw new InvoiceError(
        `Invoice ${invoice.internalNo} is ${invoice.state}. Only a held invoice is refused ` +
          `this way; a posted one is cancelled, which reverses its entry.`,
      );
    }

    await tx.vendorInvoice.update({
      where: { id: invoiceId },
      data: {
        state: 'CANCELLED',
        cancelledAt: new Date(),
        cancellationReason: reason.trim(),
        approvedById: principal.userId,
        approvedAt: new Date(),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REJECT',
      resourceType: 'vendor_invoice',
      resourceId: invoiceId,
      after: { state: 'CANCELLED', reason: reason.trim() },
    });
  });
}

export interface MatchOutcome {
  issues: string[];
}

/**
 * Compare the bill against the order and the receipt.
 *
 * Three checks per line, and each corresponds to a distinct way of being
 * charged for something the institution did not get:
 *
 *   · **quantity against the order** — billed for more than was bought;
 *   · **quantity against receipts** — billed for more than arrived, which is
 *     the check that catches a delivery that never happened;
 *   · **price against the order** — the agreed price moved.
 *
 * A non-PO invoice skips all three by construction. That is not a hole: a
 * utility bill has no order and no delivery note, and inventing them would
 * make the match a formality everywhere rather than a control somewhere.
 */
async function runThreeWayMatch(
  tx: Tx,
  tenantId: string,
  purchaseOrderId: string | null,
  raw: Array<{ poLineId?: string | null }>,
  priced: Array<{ quantity: Money; unitPrice: Money; amount: Money }>,
  tolerance: MatchTolerance,
): Promise<MatchOutcome> {
  const issues: string[] = [];

  const linked = raw
    .map((l, i) => ({ poLineId: l.poLineId ?? null, index: i }))
    .filter((l): l is { poLineId: string; index: number } => l.poLineId !== null);

  if (purchaseOrderId && linked.length === 0) {
    issues.push('The invoice names a purchase order but no line is matched to an order line.');
  }
  if (linked.length === 0) return { issues };

  const poLines = await tx.purchaseOrderLine.findMany({
    where: { id: { in: linked.map((l) => l.poLineId) }, tenantId },
    select: {
      id: true,
      lineNo: true,
      purchaseOrderId: true,
      quantity: true,
      unitPrice: true,
      receivedQty: true,
      invoicedQty: true,
    },
  });
  const byId = new Map(poLines.map((l) => [l.id, l]));

  const pct = toStorage(tolerance.pricePct);
  const abs = toStorage(tolerance.priceAbs);

  for (const { poLineId, index } of linked) {
    const poLine = byId.get(poLineId);
    if (!poLine) {
      issues.push(`Line ${index + 1} names an order line that does not exist.`);
      continue;
    }
    if (purchaseOrderId && poLine.purchaseOrderId !== purchaseOrderId) {
      issues.push(`Line ${index + 1} is matched to a line on a different purchase order.`);
      continue;
    }

    const inv = priced[index];

    const stillToInvoice = poLine.quantity.minus(poLine.invoicedQty);
    if (inv.quantity.greaterThan(stillToInvoice)) {
      issues.push(
        `Line ${index + 1}: billed ${inv.quantity.toFixed(2)} against order line ` +
          `${poLine.lineNo}, which has ${stillToInvoice.toFixed(2)} left to invoice.`,
      );
    }

    const notYetBilled = poLine.receivedQty.minus(poLine.invoicedQty);
    if (inv.quantity.greaterThan(notYetBilled)) {
      issues.push(
        `Line ${index + 1}: billed ${inv.quantity.toFixed(2)} but only ` +
          `${notYetBilled.toFixed(2)} has been received and not yet invoiced on order line ` +
          `${poLine.lineNo}.`,
      );
    }

    const variance = inv.unitPrice.minus(poLine.unitPrice).abs();
    // Whichever tolerance is larger, so a percentage is not meaningless on a
    // cheap line and an absolute floor is not meaningless on an expensive one.
    const allowed = maxOf(poLine.unitPrice.times(pct), abs);
    if (variance.greaterThan(allowed)) {
      issues.push(
        `Line ${index + 1}: billed at ${inv.unitPrice.toFixed(2)} against an ordered price ` +
          `of ${poLine.unitPrice.toFixed(2)} — outside the ${allowed.toFixed(2)} tolerance.`,
      );
    }
  }

  return { issues };
}

/**
 * Post the payable. Shared by the matched path and the exception-approval
 * path, so both produce an identical entry.
 *
 * Which account is debited depends on whether a goods receipt already
 * recognised the expense:
 *
 *   · a line matched to an order line clears the accrual that receipt raised
 *     (DR GRNI), leaving the expense on the date it was incurred;
 *   · a line with no order line — a utility bill, a subscription — has no
 *     accrual to clear, so the expense is recognised here (DR expense).
 *
 * Getting this wrong in the second case would debit GRNI for something that
 * never went through it, leaving a permanent balance in a clearing account
 * that is supposed to net to what has arrived and not been billed.
 */
async function postInvoice(
  tx: Tx,
  tenantId: string,
  actorId: string,
  doc: {
    docNo: string;
    vendorId: string;
    vendorCode: string;
    invoiceDate: Date;
    total: Money;
    lines: Array<{
      accountId: string;
      costCenterId: string | null;
      amount: Money;
      description: string;
      /** Null when the line is not against a purchase order. */
      poLineId: string | null;
    }>;
  },
): Promise<{ headerId: string; voucherRef: string }> {
  const apId = await requireAccount(tx, tenantId, 'VENDOR_AP_CONTROL');

  const accrued = doc.lines.filter((l) => l.poLineId !== null);
  const direct = doc.lines.filter((l) => l.poLineId === null);

  const lines: PostingLine[] = [];

  if (accrued.length > 0) {
    const grniId = await requireAccount(tx, tenantId, 'GRNI_ACCRUAL');
    lines.push({
      accountId: grniId,
      debit: sum(accrued.map((l) => l.amount)),
      description: `Invoice ${doc.docNo} clears the accrual`,
    });
  }

  // One debit per (account, cost centre), for the same reason the receipt
  // collapses its lines: a bill with thirty lines against one account should
  // not produce thirty identical journal entries.
  const grouped = new Map<
    string,
    { accountId: string; costCenterId: string | null; amount: Money; label: string }
  >();
  for (const l of direct) {
    const key = `${l.accountId}::${l.costCenterId ?? ''}`;
    const cur = grouped.get(key);
    if (cur) cur.amount = cur.amount.plus(l.amount);
    else
      grouped.set(key, {
        accountId: l.accountId,
        costCenterId: l.costCenterId,
        amount: l.amount,
        label: l.description,
      });
  }
  for (const g of grouped.values()) {
    lines.push({
      accountId: g.accountId,
      debit: g.amount,
      costCenterId: g.costCenterId,
      description: `${doc.docNo} — ${g.label}`,
    });
  }

  lines.push({
    accountId: apId,
    credit: doc.total,
    subledgerType: 'VENDOR',
    subledgerId: doc.vendorId,
    description: `Invoice ${doc.docNo} — ${doc.vendorCode}`,
  });

  const posted = await post(tx, tenantId, {
    voucherType: 'VENDOR_INVOICE',
    docDate: doc.invoiceDate,
    description: `Vendor invoice ${doc.docNo} — ${doc.vendorCode}`,
    sourceModule: 'PROCUREMENT',
    sourceRef: doc.docNo,
    postedById: actorId,
    lines,
  });

  return { headerId: posted.headerId, voucherRef: posted.voucherRef };
}

/** Move the cumulative invoiced quantity on each matched order line. */
async function advanceInvoicedQuantities(
  tx: Tx,
  raw: Array<{ poLineId?: string | null }>,
  priced: Array<{ quantity: Money }>,
): Promise<void> {
  for (let i = 0; i < raw.length; i += 1) {
    const poLineId = raw[i].poLineId;
    if (!poLineId) continue;
    await tx.purchaseOrderLine.update({
      where: { id: poLineId },
      data: { invoicedQty: { increment: priced[i].quantity } },
    });
  }
}

export interface AgingBucket {
  vendorCode: string;
  vendorName: string;
  current: string;
  days1to30: string;
  days31to60: string;
  days61to90: string;
  over90: string;
  total: string;
}

/**
 * Accounts payable aging (SRS REQ-PRC-05), bucketed by **due date** rather
 * than by invoice date — the same discipline as the student receivables
 * aging, and for the same reason: an invoice on 60-day terms raised sixty-one
 * days ago is one day late, not two months late.
 */
export async function apAging(
  principal: Principal,
  asOf: Date = new Date(),
): Promise<AgingBucket[]> {
  requirePermission(principal, 'report.financial');
  const today = toDateOnly(asOf);

  return withTenant(principal.tenantId, async (tx) => {
    const invoices = await tx.vendorInvoice.findMany({
      where: {
        tenantId: principal.tenantId,
        state: { in: ['MATCHED', 'APPROVED', 'PARTIALLY_PAID'] },
      },
      select: {
        dueDate: true,
        totalAmount: true,
        settledAmount: true,
        vendor: { select: { code: true, nameEn: true } },
      },
    });

    const byVendor = new Map<string, AgingBucket & { _key: string }>();

    for (const inv of invoices) {
      const outstanding = inv.totalAmount.minus(inv.settledAmount);
      if (outstanding.lessThanOrEqualTo(0)) continue;

      const key = inv.vendor.code;
      const row =
        byVendor.get(key) ??
        ({
          _key: key,
          vendorCode: inv.vendor.code,
          vendorName: inv.vendor.nameEn,
          current: '0',
          days1to30: '0',
          days31to60: '0',
          days61to90: '0',
          over90: '0',
          total: '0',
        } as AgingBucket & { _key: string });

      const overdueDays = Math.floor(
        (today.getTime() - toDateOnly(inv.dueDate).getTime()) / 86_400_000,
      );
      const bucket: keyof AgingBucket =
        overdueDays <= 0
          ? 'current'
          : overdueDays <= 30
            ? 'days1to30'
            : overdueDays <= 60
              ? 'days31to60'
              : overdueDays <= 90
                ? 'days61to90'
                : 'over90';

      row[bucket] = toStorage(row[bucket]).plus(outstanding).toFixed(4);
      row.total = toStorage(row.total).plus(outstanding).toFixed(4);
      byVendor.set(key, row);
    }

    return [...byVendor.values()]
      .map(({ _key, ...rest }) => {
        void _key;
        return rest;
      })
      .sort((a, b) => a.vendorCode.localeCompare(b.vendorCode));
  });
}

/**
 * The check on the payables sub-ledger: what the invoices say is outstanding
 * must equal the Vendor AP control account.
 *
 * The A6 analogue of the student sub-ledger reconciliation, and impossible
 * against the legacy design for the same reason — there was neither a vendor
 * sub-ledger nor a payable, so there were not two numbers to compare.
 */
export async function reconcileVendorSubledger(
  principal: Principal,
): Promise<{ subledger: string; control: string; variance: string }> {
  requirePermission(principal, 'report.financial');
  return withTenant(principal.tenantId, (tx) =>
    vendorSubledgerVariance(tx, principal.tenantId),
  );
}

/**
 * The same comparison inside a caller's transaction, so the consolidated
 * reconciliation report (REQ-RPT-06) can run every sub-ledger check against
 * one consistent snapshot of the ledger rather than three successive ones.
 */
export async function vendorSubledgerVariance(
  tx: Tx,
  tenantId: string,
): Promise<{ subledger: string; control: string; variance: string }> {
  const apId = await requireAccount(tx, tenantId, 'VENDOR_AP_CONTROL');

  const invoices = await tx.vendorInvoice.findMany({
    where: {
      tenantId,
      state: { in: ['MATCHED', 'APPROVED', 'PARTIALLY_PAID', 'PAID'] },
    },
    select: { totalAmount: true, settledAmount: true },
  });
  const subledger = sum(invoices.map((i) => i.totalAmount.minus(i.settledAmount)));

  const balances = await tx.accountPeriodBalance.findMany({
    where: { tenantId, accountId: apId },
    select: { movementDebit: true, movementCredit: true, openingDebit: true, openingCredit: true },
  });
  // AP is a credit-balance account, so its balance is credits less debits.
  const control = balances.reduce(
    (acc: Money, b) =>
      acc
        .plus(b.openingCredit)
        .plus(b.movementCredit)
        .minus(b.openingDebit)
        .minus(b.movementDebit),
    ZERO,
  );

  return {
    subledger: subledger.toFixed(4),
    control: control.toFixed(4),
    variance: subledger.minus(control).toFixed(4),
  };
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

function maxOf(a: Money, b: Money): Money {
  return a.greaterThan(b) ? a : b;
}

export async function lockInvoice(
  tx: Tx,
  tenantId: string,
  invoiceId: string,
): Promise<{
  id: string;
  internalNo: string;
  state: string;
  createdById: string;
  vendorId: string;
  holdReason: string | null;
  totalAmount: Money;
  settledAmount: Money;
}> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      internal_no: string;
      state: string;
      created_by_id: string;
      vendor_id: string;
      hold_reason: string | null;
      total_amount: Money;
      settled_amount: Money;
    }>
  >`
    SELECT id, internal_no, state::text, created_by_id, vendor_id, hold_reason,
           total_amount, settled_amount
      FROM vendor_invoices
     WHERE id = ${invoiceId}::uuid AND tenant_id = ${tenantId}::uuid
       FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new InvoiceError('That invoice does not exist in this university.');
  }
  const r = rows[0];
  return {
    id: r.id,
    internalNo: r.internal_no,
    state: r.state,
    createdById: r.created_by_id,
    vendorId: r.vendor_id,
    holdReason: r.hold_reason,
    totalAmount: toStorage(r.total_amount),
    settledAmount: toStorage(r.settled_amount),
  };
}
