'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import {
  approveOrder,
  cancelOrder,
  draftOrder,
  rejectOrder,
  submitOrder,
  type OrderLineInput,
} from '@/lib/procurement/orders';

/**
 * Purchase orders (Track D4, SRS REQ-PRC-02).
 *
 * **Approving an order commits budget.** That is the part with no legacy
 * counterpart: there was no order entity, so nothing reserved money, and a
 * department discovered it had overspent when the invoices arrived. The
 * commitment is released as goods arrive and as the invoice lands, so the
 * same order is never counted twice against the same line.
 *
 * Raising and approving are different permissions and the approver may not be
 * the person who raised it — checked in `approveOrder` against the actual
 * maker, not against the roles they hold today.
 */

export interface OrderState {
  error: string | null;
  message: string | null;
  approved: { encumbered: string } | null;
}

function blank(): OrderState {
  return { error: null, message: null, approved: null };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date | null => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : null;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[orders]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/procurement/orders');
  revalidatePath('/console/procurement/receiving');
  revalidatePath('/console/procurement/budgets');
}

/** Lines arrive as `line_<i>_*`. Quantities and prices stay strings. */
function collectLines(form: FormData): OrderLineInput[] {
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^line_(\d+)_description$/);
    if (m) indices.add(Number(m[1]));
  }
  const out: OrderLineInput[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const description = str(form, `line_${i}_description`);
    const quantity = str(form, `line_${i}_quantity`);
    const unitPrice = str(form, `line_${i}_unitPrice`);
    if (!description || !quantity || !unitPrice) continue;
    out.push({
      description,
      accountId: str(form, `line_${i}_accountId`),
      costCenterId: str(form, `line_${i}_costCenterId`) || null,
      quantity,
      unitPrice,
    });
  }
  return out;
}

export async function draft(_prev: OrderState, form: FormData): Promise<OrderState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const orderDate = date(form, 'orderDate');
  if (!orderDate) return { ...blank(), error: 'Give the date of the order.' };

  try {
    await draftOrder(ctx.principal, {
      vendorId: str(form, 'vendorId'),
      orderDate,
      expectedDate: date(form, 'expectedDate') ?? undefined,
      terms: str(form, 'terms') || undefined,
      lines: collectLines(form),
    });
    refresh();
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Submit, approve, reject or cancel — the state decides which is offered. */
export async function transition(_prev: OrderState, form: FormData): Promise<OrderState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const orderId = str(form, 'orderId');
  const how = str(form, 'how');

  try {
    if (how === 'submit') {
      await submitOrder(ctx.principal, orderId);
      refresh();
      return { ...blank(), message: 'submitted' };
    }
    if (how === 'approve') {
      const result = await approveOrder(ctx.principal, orderId, {
        note: str(form, 'note') || undefined,
      });
      refresh();
      return { ...blank(), approved: { encumbered: result.encumbered } };
    }
    if (how === 'reject') {
      await rejectOrder(ctx.principal, orderId, str(form, 'note'));
      refresh();
      return { ...blank(), message: 'rejected' };
    }
    if (how === 'cancel') {
      await cancelOrder(ctx.principal, orderId, str(form, 'note'));
      refresh();
      return { ...blank(), message: 'cancelled' };
    }
    return { ...blank(), error: 'Unknown action.' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
