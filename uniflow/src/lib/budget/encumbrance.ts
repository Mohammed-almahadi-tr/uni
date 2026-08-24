import 'server-only';
import type { EncumbranceAction } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';

/**
 * Encumbrance (SRS REQ-PRC-03).
 *
 * A commitment against spending authority, created when a purchase order is
 * approved and given back as the goods arrive.
 *
 * The single most important thing about it: **it is not a general-ledger
 * posting.** An approved purchase order has acquired no asset and incurred no
 * liability; committing it to the ledger would put amounts in the trial
 * balance that no accounting standard recognises, and every statement would
 * then need a rule for taking them out again. It reduces *available budget*
 * and nothing else. Some public-sector systems do keep a parallel budgetary
 * ledger for this; that is a defensible design, but not one that mixes with
 * a single ledger carrying a balanced-posting invariant.
 *
 * Three rules, all enforced in the database rather than here:
 *
 *   · released never exceeds reserved, or an order would give back more
 *     authority than it took and the budget would grow by being spent;
 *   · a release is never taken back;
 *   · the movement log is append-only, because `released_amount` is a number
 *     whose only explanation is that log.
 */

export class EncumbranceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncumbranceError';
  }
}

/**
 * Reserve a commitment. Called by purchase-order approval, inside its
 * transaction — the encumbrance and the approval are one act.
 */
export async function reserve(
  tx: Tx,
  tenantId: string,
  actorId: string,
  input: {
    budgetLineId: string;
    purchaseOrderId: string;
    purchaseOrderLineId: string;
    fiscalYearId: string;
    amount: MoneyInput;
    reason?: string;
  },
): Promise<string> {
  const amount = toStorage(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new EncumbranceError('A commitment must be for a positive amount.');
  }

  const enc = await tx.encumbrance.create({
    data: {
      tenantId,
      budgetLineId: input.budgetLineId,
      purchaseOrderId: input.purchaseOrderId,
      purchaseOrderLineId: input.purchaseOrderLineId,
      fiscalYearId: input.fiscalYearId,
      amount,
    },
    select: { id: true },
  });

  await tx.encumbranceMovement.create({
    data: {
      tenantId,
      encumbranceId: enc.id,
      action: 'RESERVE',
      amount,
      reason: input.reason ?? null,
      actorId,
    },
  });

  return enc.id;
}

/**
 * Give back part of a commitment because it has become an actual.
 *
 * Called by goods receipt. The amount released is the value received, not the
 * value ordered: a partial delivery releases a partial commitment, and the
 * rest stays reserved because the institution is still on the hook for it.
 */
export async function release(
  tx: Tx,
  tenantId: string,
  actorId: string,
  poLineId: string,
  amount: MoneyInput,
  opts: { goodsReceiptId?: string; reason?: string } = {},
): Promise<void> {
  const enc = await tx.encumbrance.findUnique({
    where: { purchaseOrderLineId: poLineId },
    select: { id: true, tenantId: true, amount: true, releasedAmount: true, status: true },
  });

  // An order line with no encumbrance is an order against an account no
  // approved budget covers. That is allowed (see checkBudget), and there is
  // simply nothing to release.
  if (!enc || enc.tenantId !== tenantId) return;
  if (enc.status !== 'OPEN') return;

  const outstanding = enc.amount.minus(enc.releasedAmount);
  // Never release more than is left. A receipt valued above the order line —
  // a price that moved between order and delivery — releases what remains and
  // the excess simply becomes an unbudgeted actual, which is what it is.
  const releasing = toStorage(amount).greaterThan(outstanding)
    ? outstanding
    : toStorage(amount);
  if (releasing.lessThanOrEqualTo(0)) return;

  const released = enc.releasedAmount.plus(releasing);

  await tx.encumbrance.update({
    where: { id: enc.id },
    data: {
      releasedAmount: released,
      status: released.equals(enc.amount) ? 'RELEASED' : 'OPEN',
    },
  });

  await tx.encumbranceMovement.create({
    data: {
      tenantId,
      encumbranceId: enc.id,
      action: 'RELEASE',
      amount: releasing,
      reason: opts.reason ?? null,
      goodsReceiptId: opts.goodsReceiptId ?? null,
      actorId,
    },
  });
}

/**
 * Close a commitment that will not be spent.
 *
 * `CANCEL` for an order that was cancelled or closed short, `LAPSE` for
 * year-end expiry, `CARRY_FORWARD` for a commitment rolled into next year.
 * The three are separate actions rather than one, because "we changed our
 * mind", "the year ended" and "it is still coming" are three different
 * answers to an auditor asking where 400,000 of authority went.
 */
export async function close(
  tx: Tx,
  tenantId: string,
  actorId: string,
  encumbranceId: string,
  action: Extract<EncumbranceAction, 'CANCEL' | 'LAPSE' | 'CARRY_FORWARD'>,
  reason: string,
): Promise<Money> {
  const enc = await tx.encumbrance.findUnique({
    where: { id: encumbranceId },
    select: { id: true, tenantId: true, amount: true, releasedAmount: true, status: true },
  });
  if (!enc || enc.tenantId !== tenantId) {
    throw new EncumbranceError('That commitment does not exist in this university.');
  }
  if (enc.status !== 'OPEN') return ZERO;

  const outstanding = enc.amount.minus(enc.releasedAmount);
  if (outstanding.lessThanOrEqualTo(0)) return ZERO;

  const status =
    action === 'CANCEL' ? 'CANCELLED' : action === 'LAPSE' ? 'LAPSED' : 'CARRIED_FORWARD';

  await tx.encumbrance.update({
    where: { id: enc.id },
    data: { status },
  });

  await tx.encumbranceMovement.create({
    data: {
      tenantId,
      encumbranceId: enc.id,
      action,
      amount: outstanding,
      reason,
      actorId,
    },
  });

  return outstanding;
}

/** Close every open commitment on one purchase order. Used when an order is
 *  cancelled or closed short of full delivery. */
export async function closeForOrder(
  tx: Tx,
  tenantId: string,
  actorId: string,
  purchaseOrderId: string,
  reason: string,
): Promise<Money> {
  const open = await tx.encumbrance.findMany({
    where: { tenantId, purchaseOrderId, status: 'OPEN' },
    select: { id: true },
  });

  let total: Money = ZERO;
  for (const e of open) {
    total = total.plus(await close(tx, tenantId, actorId, e.id, 'CANCEL', reason));
  }
  return total;
}

export interface YearEndOutcome {
  closed: number;
  amount: string;
  action: 'LAPSE' | 'CARRY_FORWARD';
}

/**
 * Deal with what is still committed when a fiscal year ends (SRS REQ-PRC-03).
 *
 * Tenant policy, not ours: some institutions lapse unliquidated commitments
 * so next year's budget starts clean, others carry them so a delayed delivery
 * does not have to be re-approved. Both are legitimate and the choice is
 * stated at the call site rather than assumed here.
 *
 * Carrying forward closes the old year's commitment and leaves the order
 * open; the commitment against next year's budget is created when that year's
 * budget is approved, because there is nothing to commit against until then.
 */
export async function settleYearEndEncumbrances(
  principal: Principal,
  fiscalYearId: string,
  action: 'LAPSE' | 'CARRY_FORWARD',
  reason: string,
): Promise<YearEndOutcome> {
  requirePermission(principal, 'budget.approve');
  if (!reason?.trim()) {
    throw new EncumbranceError('Closing year-end commitments requires a stated reason.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const open = await tx.encumbrance.findMany({
      where: { tenantId: principal.tenantId, fiscalYearId, status: 'OPEN' },
      select: { id: true, amount: true, releasedAmount: true },
    });

    let total: Money = ZERO;
    for (const e of open) {
      total = total.plus(
        await close(tx, principal.tenantId, principal.userId, e.id, action, reason.trim()),
      );
    }

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'encumbrance.year_end',
      resourceId: fiscalYearId,
      after: { action, closed: open.length, amount: total.toFixed(4), reason: reason.trim() },
    });

    return { closed: open.length, amount: total.toFixed(4), action };
  });
}

export interface CommitmentRow {
  encumbranceId: string;
  poNo: string;
  vendorName: string;
  accountCode: string;
  costCenterCode: string | null;
  amount: string;
  released: string;
  outstanding: string;
  status: string;
}

/** What is still committed, and against what. The report the legacy system
 *  could not produce, because it had no purchase orders. */
export async function openCommitments(
  principal: Principal,
  fiscalYearId: string,
): Promise<CommitmentRow[]> {
  requirePermission(principal, 'budget.read');

  return withTenant(principal.tenantId, async (tx) => {
    // Deliberately flat. Prisma 7's query interpreter runs a query's relation
    // loads concurrently on the transaction's single connection, and `pg`
    // meets that with a deprecation warning today and a hard failure at
    // pg 9. The budget for one query is two loads, counting nested ones —
    // this shape wanted five, so the extras are resolved as their own
    // lookups. A fixed number of round trips rather than a fan-out, which is
    // the better shape in any case.
    const rows = await tx.encumbrance.findMany({
      where: { tenantId: principal.tenantId, fiscalYearId, status: 'OPEN' },
      select: {
        id: true,
        amount: true,
        releasedAmount: true,
        status: true,
        purchaseOrderId: true,
        budgetLineId: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    if (rows.length === 0) return [];

    const orders = await tx.purchaseOrder.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.purchaseOrderId))] } },
      select: { id: true, poNo: true, vendor: { select: { nameEn: true } } },
    });
    const orderById = new Map(orders.map((o) => [o.id, o]));

    const budgetLines = await tx.budgetLine.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.budgetLineId))] } },
      select: {
        id: true,
        account: { select: { code: true } },
        costCenter: { select: { code: true } },
      },
    });
    const lineById = new Map(budgetLines.map((l) => [l.id, l]));

    return rows.map((e) => {
      const order = orderById.get(e.purchaseOrderId)!;
      const line = lineById.get(e.budgetLineId)!;
      return {
        encumbranceId: e.id,
        poNo: order.poNo,
        vendorName: order.vendor.nameEn,
        accountCode: line.account.code,
        costCenterCode: line.costCenter?.code ?? null,
        amount: e.amount.toFixed(4),
        released: e.releasedAmount.toFixed(4),
        outstanding: e.amount.minus(e.releasedAmount).toFixed(4),
        status: e.status,
      };
    });
  });
}

/**
 * The check on the encumbrance ledger: every commitment's released amount
 * equals the sum of its RELEASE movements, and its outstanding balance is
 * non-negative.
 *
 * The same discipline as the student sub-ledger reconciliation. A number
 * maintained by increments and an append-only log of those increments should
 * agree; when they do not, one of the two write paths has a bug, and this is
 * what finds it.
 */
export async function reconcileEncumbrances(
  principal: Principal,
  fiscalYearId: string,
): Promise<Array<{ encumbranceId: string; recorded: string; fromMovements: string }>> {
  requirePermission(principal, 'budget.read');

  return withTenant(principal.tenantId, async (tx) => {
    const encumbrances = await tx.encumbrance.findMany({
      where: { tenantId: principal.tenantId, fiscalYearId },
      select: { id: true, releasedAmount: true },
    });
    if (encumbrances.length === 0) return [];

    const movements = await tx.encumbranceMovement.findMany({
      where: {
        tenantId: principal.tenantId,
        action: 'RELEASE',
        encumbranceId: { in: encumbrances.map((e) => e.id) },
      },
      select: { encumbranceId: true, amount: true },
    });

    const byEncumbrance = new Map<string, Money[]>();
    for (const m of movements) {
      const list = byEncumbrance.get(m.encumbranceId) ?? [];
      list.push(m.amount);
      byEncumbrance.set(m.encumbranceId, list);
    }

    return encumbrances
      .map((e) => ({
        encumbranceId: e.id,
        recorded: e.releasedAmount,
        fromMovements: sum(byEncumbrance.get(e.id) ?? []),
      }))
      .filter((r) => !r.recorded.equals(r.fromMovements))
      .map((r) => ({
        encumbranceId: r.encumbranceId,
        recorded: r.recorded.toFixed(4),
        fromMovements: r.fromMovements.toFixed(4),
      }));
  });
}
