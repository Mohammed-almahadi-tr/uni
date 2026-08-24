import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import { resolvePeriod, toDateOnly } from '@/lib/ledger/period';
import { sum, type Money, type MoneyInput } from '@/lib/money';
import { checkBudget } from '@/lib/budget/control';
import { closeForOrder, reserve } from '@/lib/budget/encumbrance';
import { allocateProcurementNumber } from './numbering';
import { priceLines } from './requisition';
import { requirePayableVendor } from './vendors';

/**
 * Purchase orders (SRS REQ-PRC-02, REQ-PRC-03).
 *
 * The moment that matters in this whole module is **approval**, because that
 * is when the institution becomes committed. Three things happen together, in
 * one transaction:
 *
 *   1. availability is checked against the approved budget;
 *   2. an encumbrance is created against each line's budget line;
 *   3. the order becomes APPROVED and its lines stop being editable.
 *
 * The legacy system had none of this — no purchase order at all — and the
 * consequence is worth stating because it is the reason REQ-BDG-02 exists: an
 * institution that has signed for 400,000 of equipment and not yet been
 * invoiced has spent that money in every sense that matters, and a budget
 * report that cannot see it will happily authorise the next purchase too.
 * By the time the invoice arrives, refusing it means breaking a contract.
 */

export class PurchaseOrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PurchaseOrderError';
  }
}

export interface OrderLineInput {
  description: string;
  accountId: string;
  costCenterId?: string | null;
  quantity: MoneyInput;
  unitPrice: MoneyInput;
}

export interface CreateOrderInput {
  vendorId: string;
  orderDate: Date;
  expectedDate?: Date;
  terms?: string;
  requisitionId?: string;
  lines: OrderLineInput[];
}

export interface OrderRecord {
  id: string;
  poNo: string;
  state: string;
  totalAmount: string;
  lineCount: number;
}

export async function draftOrder(
  principal: Principal,
  input: CreateOrderInput,
): Promise<OrderRecord> {
  requirePermission(principal, 'po.create');
  const { tenantId } = principal;

  if (input.lines.length === 0) {
    throw new PurchaseOrderError('A purchase order needs at least one line.');
  }

  return withTenant(tenantId, async (tx) => {
    const vendor = await requirePayableVendor(tx, tenantId, input.vendorId);
    const orderDate = toDateOnly(input.orderDate);
    const { fiscalYearId } = await resolvePeriod(tx, tenantId, orderDate);
    const year = await tx.fiscalYear.findUniqueOrThrow({
      where: { id: fiscalYearId },
      select: { name: true },
    });

    if (input.requisitionId) {
      const req = await tx.purchaseRequisition.findUnique({
        where: { id: input.requisitionId },
        select: { tenantId: true, reqNo: true, state: true },
      });
      if (!req || req.tenantId !== tenantId) {
        throw new PurchaseOrderError('That requisition does not exist in this university.');
      }
      if (req.state !== 'APPROVED') {
        throw new PurchaseOrderError(
          `Requisition ${req.reqNo} is ${req.state}. Only an approved requisition becomes ` +
            `an order.`,
        );
      }
    }

    const priced = await priceLines(tx, tenantId, input.lines);
    const total = sum(priced.map((l) => l.amount));

    const { docNo } = await allocateProcurementNumber(
      tx,
      tenantId,
      fiscalYearId,
      year.name,
      'PURCHASE_ORDER',
    );

    const po = await tx.purchaseOrder.create({
      data: {
        tenantId,
        poNo: docNo,
        fiscalYearId,
        vendorId: vendor.id,
        requisitionId: input.requisitionId ?? null,
        orderDate,
        expectedDate: input.expectedDate ? toDateOnly(input.expectedDate) : null,
        currency: priced[0].currency,
        terms: input.terms?.trim() || null,
        totalAmount: total,
        createdById: principal.userId,
        lines: {
          create: priced.map((l, i) => ({
            tenantId,
            lineNo: i + 1,
            description: l.description,
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

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'purchase_order',
      resourceId: po.id,
      after: {
        poNo: docNo,
        vendor: vendor.code,
        lines: priced.length,
        total: total.toFixed(4),
      },
    });

    return {
      id: po.id,
      poNo: docNo,
      state: 'DRAFT',
      totalAmount: total.toFixed(4),
      lineCount: priced.length,
    };
  });
}

export async function submitOrder(principal: Principal, orderId: string): Promise<void> {
  requirePermission(principal, 'po.create');

  await withTenant(principal.tenantId, async (tx) => {
    const po = await lockOrder(tx, principal.tenantId, orderId);
    if (po.state !== 'DRAFT') {
      throw new PurchaseOrderError(`Purchase order ${po.poNo} is ${po.state}, not a draft.`);
    }

    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: { state: 'PENDING_APPROVAL', submittedAt: new Date() },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'purchase_order',
      resourceId: orderId,
      before: { state: 'DRAFT' },
      after: { state: 'PENDING_APPROVAL' },
    });
  });
}

export interface OrderApproval {
  poNo: string;
  encumbered: string;
  /** Lines whose account no approved budget covers. Not an error — reported. */
  unbudgetedLines: number;
  /** Overruns permitted because the budget line's policy is WARN. */
  warnings: string[];
}

/**
 * Approve an order: check the budget, reserve the commitment, freeze the
 * lines.
 *
 * Availability is checked line by line rather than on the order total,
 * because the lines can hit different accounts and different cost centres,
 * and an order that fits in aggregate can still exhaust one department's
 * allocation while leaving another's untouched.
 */
export async function approveOrder(
  principal: Principal,
  orderId: string,
  opts: { note?: string } = {},
): Promise<OrderApproval> {
  requirePermission(principal, 'po.approve');
  const { tenantId } = principal;

  return withTenant(tenantId, async (tx) => {
    const po = await lockOrder(tx, tenantId, orderId);
    if (po.state !== 'PENDING_APPROVAL') {
      throw new PurchaseOrderError(
        `Purchase order ${po.poNo} is ${po.state} and is not awaiting approval.`,
      );
    }

    assertNotSelfApproval(principal, po.createdById, `purchase order ${po.poNo}`);

    await requirePayableVendor(tx, tenantId, po.vendorId);

    const lines = await tx.purchaseOrderLine.findMany({
      where: { purchaseOrderId: orderId },
      select: {
        id: true,
        lineNo: true,
        accountId: true,
        costCenterId: true,
        amount: true,
        account: { select: { code: true } },
      },
      orderBy: { lineNo: 'asc' },
    });

    const warnings: string[] = [];
    let encumbered: Money = sum([]);
    let unbudgetedLines = 0;

    for (const line of lines) {
      // Throws BudgetExceededError when the line's policy is BLOCK, which
      // rolls the whole approval back — an order half-committed against a
      // budget would be worse than one refused.
      const check = await checkBudget(
        tx,
        tenantId,
        line.accountId,
        line.costCenterId,
        line.amount,
        po.orderDate,
        line.account.code,
      );
      if (check.warning) warnings.push(`Line ${line.lineNo}: ${check.warning}`);

      if (!check.position.budgetLineId) {
        unbudgetedLines += 1;
        continue;
      }

      await reserve(tx, tenantId, principal.userId, {
        budgetLineId: check.position.budgetLineId,
        purchaseOrderId: orderId,
        purchaseOrderLineId: line.id,
        fiscalYearId: po.fiscalYearId,
        amount: line.amount,
        reason: `Purchase order ${po.poNo} line ${line.lineNo}`,
      });
      await tx.purchaseOrderLine.update({
        where: { id: line.id },
        data: { budgetLineId: check.position.budgetLineId },
      });
      encumbered = encumbered.plus(line.amount);
    }

    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: {
        state: 'APPROVED',
        approvedById: principal.userId,
        approvedAt: new Date(),
        decisionNote: opts.note?.trim() || null,
      },
    });

    if (po.requisitionId) {
      await tx.purchaseRequisition.update({
        where: { id: po.requisitionId },
        data: { state: 'CONVERTED' },
      });
    }

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'purchase_order',
      resourceId: orderId,
      before: { state: 'PENDING_APPROVAL' },
      after: {
        state: 'APPROVED',
        poNo: po.poNo,
        encumbered: encumbered.toFixed(4),
        unbudgetedLines,
        warnings,
      },
    });

    return { poNo: po.poNo, encumbered: encumbered.toFixed(4), unbudgetedLines, warnings };
  });
}

export async function rejectOrder(
  principal: Principal,
  orderId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'po.approve');
  if (!reason?.trim()) {
    throw new PurchaseOrderError('Rejecting a purchase order requires a stated reason.');
  }

  await withTenant(principal.tenantId, async (tx) => {
    const po = await lockOrder(tx, principal.tenantId, orderId);
    if (po.state !== 'PENDING_APPROVAL') {
      throw new PurchaseOrderError(
        `Purchase order ${po.poNo} is ${po.state} and is not awaiting approval.`,
      );
    }

    // Back to DRAFT rather than to a REJECTED terminal state: a rejected
    // order is normally re-priced and re-submitted, and the decision note
    // carries why. An order abandoned for good is cancelled.
    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: { state: 'DRAFT', submittedAt: null, decisionNote: reason.trim() },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REJECT',
      resourceType: 'purchase_order',
      resourceId: orderId,
      after: { state: 'DRAFT', reason: reason.trim() },
    });
  });
}

/**
 * Cancel an order nothing has been received against, releasing its
 * commitment.
 *
 * An order that *has* taken delivery cannot be cancelled — the goods are here
 * and the accrual is posted. The database refuses it; `closeOrder` is the
 * right operation there.
 */
export async function cancelOrder(
  principal: Principal,
  orderId: string,
  reason: string,
): Promise<{ released: string }> {
  requirePermission(principal, 'po.approve');
  if (!reason?.trim()) {
    throw new PurchaseOrderError('Cancelling a purchase order requires a stated reason.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const po = await lockOrder(tx, principal.tenantId, orderId);
    if (po.state === 'CANCELLED' || po.state === 'CLOSED') {
      throw new PurchaseOrderError(`Purchase order ${po.poNo} is already ${po.state}.`);
    }

    const released = await closeForOrder(
      tx,
      principal.tenantId,
      principal.userId,
      orderId,
      `Purchase order ${po.poNo} cancelled: ${reason.trim()}`,
    );

    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: { state: 'CANCELLED', closedAt: new Date(), closureReason: reason.trim() },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'purchase_order',
      resourceId: orderId,
      before: { state: po.state },
      after: { state: 'CANCELLED', released: released.toFixed(4), reason: reason.trim() },
    });

    return { released: released.toFixed(4) };
  });
}

/**
 * Close an order that will receive no more, releasing whatever it still
 * commits.
 *
 * The common case is a short delivery the department has accepted. Leaving
 * the order open would hold spending authority against goods nobody expects,
 * which is how a budget silently runs out with money still in it.
 */
export async function closeOrder(
  principal: Principal,
  orderId: string,
  reason: string,
): Promise<{ released: string }> {
  requirePermission(principal, 'po.approve');
  if (!reason?.trim()) {
    throw new PurchaseOrderError('Closing a purchase order requires a stated reason.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const po = await lockOrder(tx, principal.tenantId, orderId);
    if (!['APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(po.state)) {
      throw new PurchaseOrderError(
        `Purchase order ${po.poNo} is ${po.state} and there is nothing to close.`,
      );
    }

    const released = await closeForOrder(
      tx,
      principal.tenantId,
      principal.userId,
      orderId,
      `Purchase order ${po.poNo} closed: ${reason.trim()}`,
    );

    await tx.purchaseOrder.update({
      where: { id: orderId },
      data: { state: 'CLOSED', closedAt: new Date(), closureReason: reason.trim() },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'purchase_order',
      resourceId: orderId,
      before: { state: po.state },
      after: { state: 'CLOSED', released: released.toFixed(4), reason: reason.trim() },
    });

    return { released: released.toFixed(4) };
  });
}

export interface OrderLineStatus {
  lineNo: number;
  description: string;
  accountCode: string;
  quantity: string;
  unitPrice: string;
  amount: string;
  receivedQty: string;
  invoicedQty: string;
  outstandingQty: string;
}

export interface OrderStatus {
  poNo: string;
  vendorName: string;
  state: string;
  orderDate: Date;
  totalAmount: string;
  receivedValue: string;
  invoicedValue: string;
  encumbranceOutstanding: string;
  lines: OrderLineStatus[];
}

/** Where one order stands: ordered, received, invoiced and still committed. */
export async function orderStatus(
  principal: Principal,
  orderId: string,
): Promise<OrderStatus> {
  requirePermission(principal, 'po.create');

  return withTenant(principal.tenantId, async (tx) => {
    // Two relation loads per query, no more. Prisma 7's query interpreter
    // runs a query's relation loads concurrently on the transaction's single
    // connection; `pg` answers that with a deprecation warning today and will
    // refuse outright at pg 9. Nested loads count, so `lines.account` and the
    // encumbrances are resolved as their own lookups below.
    const po = await tx.purchaseOrder.findUnique({
      where: { id: orderId },
      select: {
        tenantId: true,
        poNo: true,
        state: true,
        orderDate: true,
        totalAmount: true,
        vendor: { select: { nameEn: true } },
        lines: {
          select: {
            lineNo: true,
            description: true,
            accountId: true,
            quantity: true,
            unitPrice: true,
            amount: true,
            receivedQty: true,
            invoicedQty: true,
          },
          orderBy: { lineNo: 'asc' },
        },
      },
    });
    if (!po || po.tenantId !== principal.tenantId) {
      throw new PurchaseOrderError('That purchase order does not exist in this university.');
    }

    const accounts = await tx.account.findMany({
      where: { id: { in: [...new Set(po.lines.map((l) => l.accountId))] } },
      select: { id: true, code: true },
    });
    const codeById = new Map(accounts.map((a) => [a.id, a.code]));

    const encumbrances = await tx.encumbrance.findMany({
      where: { tenantId: principal.tenantId, purchaseOrderId: orderId, status: 'OPEN' },
      select: { amount: true, releasedAmount: true },
    });

    return {
      poNo: po.poNo,
      vendorName: po.vendor.nameEn,
      state: po.state,
      orderDate: po.orderDate,
      totalAmount: po.totalAmount.toFixed(4),
      receivedValue: sum(po.lines.map((l) => l.receivedQty.times(l.unitPrice))).toFixed(4),
      invoicedValue: sum(po.lines.map((l) => l.invoicedQty.times(l.unitPrice))).toFixed(4),
      encumbranceOutstanding: sum(
        encumbrances.map((e) => e.amount.minus(e.releasedAmount)),
      ).toFixed(4),
      lines: po.lines.map((l) => ({
        lineNo: l.lineNo,
        description: l.description,
        accountCode: codeById.get(l.accountId) ?? '',
        quantity: l.quantity.toFixed(4),
        unitPrice: l.unitPrice.toFixed(4),
        amount: l.amount.toFixed(4),
        receivedQty: l.receivedQty.toFixed(4),
        invoicedQty: l.invoicedQty.toFixed(4),
        outstandingQty: l.quantity.minus(l.receivedQty).toFixed(4),
      })),
    };
  });
}

export async function lockOrder(
  tx: Tx,
  tenantId: string,
  orderId: string,
): Promise<{
  id: string;
  poNo: string;
  state: string;
  createdById: string;
  vendorId: string;
  fiscalYearId: string;
  requisitionId: string | null;
  orderDate: Date;
  currency: string;
}> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      po_no: string;
      state: string;
      created_by_id: string;
      vendor_id: string;
      fiscal_year_id: string;
      requisition_id: string | null;
      order_date: Date;
      currency: string;
    }>
  >`
    SELECT id, po_no, state::text, created_by_id, vendor_id, fiscal_year_id,
           requisition_id, order_date, currency
      FROM purchase_orders
     WHERE id = ${orderId}::uuid AND tenant_id = ${tenantId}::uuid
       FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new PurchaseOrderError('That purchase order does not exist in this university.');
  }
  const r = rows[0];
  return {
    id: r.id,
    poNo: r.po_no,
    state: r.state,
    createdById: r.created_by_id,
    vendorId: r.vendor_id,
    fiscalYearId: r.fiscal_year_id,
    requisitionId: r.requisition_id,
    orderDate: r.order_date,
    currency: r.currency.trim(),
  };
}
