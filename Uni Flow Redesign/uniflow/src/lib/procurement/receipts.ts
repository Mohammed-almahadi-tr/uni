import 'server-only';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { idempotent } from '@/lib/idempotency';
import { toDateOnly } from '@/lib/ledger/period';
import { post, type PostingLine } from '@/lib/ledger/posting';
import { requireAccount } from '@/lib/coa/mapping';
import { sum, toStorage, type Money, type MoneyInput } from '@/lib/money';
import { release } from '@/lib/budget/encumbrance';
import { allocateProcurementNumber } from './numbering';
import { lockOrder } from './orders';

/**
 * Goods and service receipts (SRS REQ-PRC-02).
 *
 * This is where an expense is recognised, and it is the single largest
 * accounting difference between this module and the legacy system.
 *
 *     DR  Expense / Asset                what arrived
 *       CR  Goods Received Not Invoiced     the obligation it created
 *
 * The legacy `frmMakePayBill` had no receipt step. It debited the expense and
 * credited cash in one document, at payment time, so goods received in March
 * and paid for in June were reported as a June expense — and between those two
 * dates there was no record anywhere that the institution owed anything. An
 * income statement for the March quarter was wrong by everything that had been
 * delivered and not yet paid for.
 *
 * The receipt also releases the matching encumbrance: a commitment that has
 * become an actual must stop being counted as both, or the budget report
 * double-counts every delivery.
 *
 * A receipt is never edited and never deleted, enforced by trigger. It posted
 * to the ledger; correcting it is a reversal, exactly as with any other
 * posting.
 */

export class GoodsReceiptError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoodsReceiptError';
  }
}

export interface ReceiptLineInput {
  poLineId: string;
  /** How many arrived. Never more than is still outstanding on the line. */
  quantity: MoneyInput;
}

export interface ReceiveInput {
  purchaseOrderId: string;
  receivedOn: Date;
  note?: string;
  lines: ReceiptLineInput[];
}

export interface GoodsReceiptRecord {
  id: string;
  grnNo: string;
  voucherRef: string;
  totalAmount: string;
  released: string;
  orderState: string;
}

/**
 * Record a delivery.
 *
 * Idempotency is required rather than optional, for the same reason it is on
 * cashiering: the stores officer is on a phone at a loading bay, and a second
 * tap would otherwise accrue the same delivery twice and release the
 * encumbrance twice with it.
 */
export async function receiveGoods(
  principal: Principal,
  input: ReceiveInput,
  idempotencyKey: string,
): Promise<GoodsReceiptRecord> {
  requirePermission(principal, 'grn.create');
  const { tenantId } = principal;

  if (input.lines.length === 0) {
    throw new GoodsReceiptError('A goods receipt needs at least one line.');
  }

  const { result } = await idempotent(
    tenantId,
    idempotencyKey,
    'procurement.receiveGoods',
    { ...input, receivedOn: toDateOnly(input.receivedOn).toISOString(), by: principal.userId },
    async (tx) => {
      const po = await lockOrder(tx, tenantId, input.purchaseOrderId);
      if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(po.state)) {
        throw new GoodsReceiptError(
          `Purchase order ${po.poNo} is ${po.state}. Goods are received against an ` +
            `approved order.`,
        );
      }

      const receivedOn = toDateOnly(input.receivedOn);
      const grniId = await requireAccount(tx, tenantId, 'GRNI_ACCRUAL');

      const poLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: po.id },
        select: {
          id: true,
          lineNo: true,
          description: true,
          accountId: true,
          costCenterId: true,
          quantity: true,
          unitPrice: true,
          receivedQty: true,
        },
      });
      const byId = new Map(poLines.map((l) => [l.id, l]));

      const seen = new Set<string>();
      const posted: Array<{
        poLineId: string;
        accountId: string;
        costCenterId: string | null;
        lineNo: number;
        description: string;
        quantity: Money;
        amount: Money;
      }> = [];

      for (const line of input.lines) {
        const poLine = byId.get(line.poLineId);
        if (!poLine) {
          throw new GoodsReceiptError(
            'A receipt line names an order line that is not on this purchase order.',
          );
        }
        if (seen.has(line.poLineId)) {
          throw new GoodsReceiptError(
            `Order line ${poLine.lineNo} appears twice on this receipt. Record one quantity ` +
              `for it.`,
          );
        }
        seen.add(line.poLineId);

        const quantity = toStorage(line.quantity);
        if (quantity.lessThanOrEqualTo(0)) {
          throw new GoodsReceiptError(
            `Order line ${poLine.lineNo}: a receipt quantity must be greater than zero.`,
          );
        }

        const outstanding = poLine.quantity.minus(poLine.receivedQty);
        if (quantity.greaterThan(outstanding)) {
          // Over-delivery is a real thing, but it is a change to the order
          // rather than something a stores officer settles by typing a bigger
          // number. Amend the order, then receive against it.
          throw new GoodsReceiptError(
            `Order line ${poLine.lineNo} has ${outstanding.toFixed(2)} outstanding and ` +
              `${quantity.toFixed(2)} was received. Amend the order if more was delivered ` +
              `than was bought.`,
          );
        }

        posted.push({
          poLineId: poLine.id,
          accountId: poLine.accountId,
          costCenterId: poLine.costCenterId,
          lineNo: poLine.lineNo,
          description: poLine.description,
          quantity,
          amount: toStorage(quantity.times(poLine.unitPrice)),
        });
      }

      const total = sum(posted.map((l) => l.amount));

      // One debit per (account, cost centre); a single credit to GRNI. A
      // forty-line delivery against one account should not produce forty
      // identical journal lines.
      const debits = new Map<
        string,
        { accountId: string; costCenterId: string | null; amount: Money; label: string }
      >();
      for (const l of posted) {
        const key = `${l.accountId}::${l.costCenterId ?? ''}`;
        const cur = debits.get(key);
        if (cur) cur.amount = cur.amount.plus(l.amount);
        else
          debits.set(key, {
            accountId: l.accountId,
            costCenterId: l.costCenterId,
            amount: l.amount,
            label: l.description,
          });
      }

      const year = await tx.fiscalYear.findUniqueOrThrow({
        where: { id: po.fiscalYearId },
        select: { name: true },
      });
      const { docNo } = await allocateProcurementNumber(
        tx,
        tenantId,
        po.fiscalYearId,
        year.name,
        'GOODS_RECEIPT',
      );

      const lines: PostingLine[] = [];
      for (const d of debits.values()) {
        lines.push({
          accountId: d.accountId,
          debit: d.amount,
          costCenterId: d.costCenterId,
          description: `${docNo} — ${d.label}`,
        });
      }
      lines.push({
        accountId: grniId,
        credit: total,
        description: `Goods received on ${po.poNo}, not yet invoiced`,
      });

      const voucher = await post(tx, tenantId, {
        voucherType: 'GOODS_RECEIPT',
        docDate: receivedOn,
        description: `Goods receipt ${docNo} against ${po.poNo}`,
        sourceModule: 'PROCUREMENT',
        sourceRef: po.id,
        postedById: principal.userId,
        lines,
      });

      const grn = await tx.goodsReceipt.create({
        data: {
          tenantId,
          grnNo: docNo,
          purchaseOrderId: po.id,
          receivedOn,
          note: input.note?.trim() || null,
          totalAmount: total,
          postedHeaderId: voucher.headerId,
          receivedById: principal.userId,
          lines: {
            create: posted.map((l) => ({
              tenantId,
              poLineId: l.poLineId,
              quantity: l.quantity,
              amount: l.amount,
            })),
          },
        },
        select: { id: true },
      });

      let released: Money = sum([]);
      for (const l of posted) {
        const poLine = byId.get(l.poLineId)!;
        await tx.purchaseOrderLine.update({
          where: { id: l.poLineId },
          data: { receivedQty: poLine.receivedQty.plus(l.quantity) },
        });
        // Release the value received, not the value ordered. A partial
        // delivery releases a partial commitment; the rest stays reserved
        // because the institution is still on the hook for it.
        await release(tx, tenantId, principal.userId, l.poLineId, l.amount, {
          goodsReceiptId: grn.id,
          reason: `Received on ${docNo}`,
        });
        released = released.plus(l.amount);
      }

      const remaining = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: po.id },
        select: { quantity: true, receivedQty: true },
      });
      const complete = remaining.every((l) => l.receivedQty.equals(l.quantity));
      const orderState = complete ? 'RECEIVED' : 'PARTIALLY_RECEIVED';

      await tx.purchaseOrder.update({
        where: { id: po.id },
        data: { state: orderState },
      });

      // A fully received order still commits whatever was ordered above what
      // arrived — nothing, when every line is complete, but the release above
      // may have been capped. Close out the remainder so the budget gets it
      // back at the moment the order is done rather than at year-end.
      if (complete) {
        const open = await tx.encumbrance.findMany({
          where: { tenantId, purchaseOrderId: po.id, status: 'OPEN' },
          select: { id: true, amount: true, releasedAmount: true },
        });
        for (const e of open) {
          const outstanding = e.amount.minus(e.releasedAmount);
          if (outstanding.lessThanOrEqualTo(0)) continue;
          await tx.encumbrance.update({
            where: { id: e.id },
            data: { status: 'CANCELLED' },
          });
          await tx.encumbranceMovement.create({
            data: {
              tenantId,
              encumbranceId: e.id,
              action: 'CANCEL',
              amount: outstanding,
              reason: `Order ${po.poNo} fully received; residual commitment released`,
              actorId: principal.userId,
            },
          });
        }
      }

      await audit(tx, tenantId, {
        actorId: principal.userId,
        action: 'INSERT',
        resourceType: 'goods_receipt',
        resourceId: grn.id,
        after: {
          grnNo: docNo,
          poNo: po.poNo,
          voucherRef: voucher.voucherRef,
          total: total.toFixed(4),
          released: released.toFixed(4),
          orderState,
        },
      });

      return {
        id: grn.id,
        grnNo: docNo,
        voucherRef: voucher.voucherRef,
        totalAmount: total.toFixed(4),
        released: released.toFixed(4),
        orderState,
      };
    },
  );

  return result;
}

export interface UninvoicedRow {
  poNo: string;
  vendorName: string;
  grnNo: string;
  receivedOn: Date;
  receivedValue: string;
  invoicedValue: string;
  uninvoiced: string;
}

/**
 * What has arrived but not yet been billed.
 *
 * The GRNI account balance should equal the total of this report. When it
 * does not, either a receipt posted without updating the order or an invoice
 * cleared more accrual than its receipt raised — and the whole point of a
 * clearing account is that the discrepancy is visible rather than absorbed.
 */
export async function uninvoicedReceipts(principal: Principal): Promise<UninvoicedRow[]> {
  requirePermission(principal, 'report.financial');

  return withTenant(principal.tenantId, async (tx) => {
    // Two relation loads per query at most, nested ones included: Prisma 7
    // runs them concurrently on the transaction's single connection, which
    // `pg` deprecates now and rejects at pg 9.
    const receipts = await tx.goodsReceipt.findMany({
      where: { tenantId: principal.tenantId },
      select: {
        grnNo: true,
        receivedOn: true,
        totalAmount: true,
        purchaseOrderId: true,
        lines: { select: { poLineId: true, quantity: true, amount: true } },
      },
      orderBy: { receivedOn: 'asc' },
    });
    if (receipts.length === 0) return [];

    const orders = await tx.purchaseOrder.findMany({
      where: { id: { in: [...new Set(receipts.map((r) => r.purchaseOrderId))] } },
      select: { id: true, poNo: true, vendor: { select: { nameEn: true } } },
    });
    const orderById = new Map(orders.map((o) => [o.id, o]));

    const poLineIds = [...new Set(receipts.flatMap((r) => r.lines.map((l) => l.poLineId)))];
    const poLines = await tx.purchaseOrderLine.findMany({
      where: { id: { in: poLineIds } },
      select: { id: true, unitPrice: true, receivedQty: true, invoicedQty: true },
    });
    const byLine = new Map(poLines.map((l) => [l.id, l]));

    return receipts.map((r) => {
      // Invoicing is against the order line, not the receipt, so a receipt's
      // invoiced share is its proportion of what the line has received.
      const invoiced = sum(
        r.lines.map((l) => {
          const po = byLine.get(l.poLineId);
          if (!po || po.receivedQty.isZero()) return toStorage(0);
          const share = l.quantity.dividedBy(po.receivedQty);
          const invoicedOnLine = po.invoicedQty.times(po.unitPrice);
          return toStorage(invoicedOnLine.times(share));
        }),
      );
      const capped = invoiced.greaterThan(r.totalAmount) ? r.totalAmount : invoiced;

      const order = orderById.get(r.purchaseOrderId)!;
      return {
        poNo: order.poNo,
        vendorName: order.vendor.nameEn,
        grnNo: r.grnNo,
        receivedOn: r.receivedOn,
        receivedValue: r.totalAmount.toFixed(4),
        invoicedValue: capped.toFixed(4),
        uninvoiced: r.totalAmount.minus(capped).toFixed(4),
      };
    });
  });
}
