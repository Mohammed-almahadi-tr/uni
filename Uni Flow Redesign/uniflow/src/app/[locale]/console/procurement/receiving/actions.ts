'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { receiveGoods, type ReceiptLineInput } from '@/lib/procurement/receipts';

/**
 * Goods received (Track D4, SRS REQ-PRC-03).
 *
 * **The one independent piece of evidence in the three-way match.** It is
 * worth nothing if the person giving it also placed the order or waived the
 * bill, which is why the shipped Stores Officer role holds `grn.create` and
 * `voucher.read` and deliberately nothing else.
 *
 * The idempotency key is required, not optional, for the same reason it is on
 * cashiering: the stores officer is on a phone at a loading bay, and a second
 * tap would otherwise accrue the delivery twice and release the encumbrance
 * twice with it. It is minted here per submission — the form is filled in
 * once and pressed once, and the retry that matters is the one the network
 * causes, which arrives as the same request.
 */

export interface ReceiveState {
  error: string | null;
  received: { grnNo: string; voucherRef: string } | null;
}

const blank = (): ReceiveState => ({ error: null, received: null });

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
  console.error('[receiving]', e);
  return 'That could not be completed.';
}

/** `qty_<poLineId>`. A blank or zero line did not arrive and is not sent. */
function collectLines(form: FormData): ReceiptLineInput[] {
  const out: ReceiptLineInput[] = [];
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const m = key.match(/^qty_(.+)$/);
    if (!m) continue;
    if (Number(value) <= 0) continue;
    out.push({ poLineId: m[1], quantity: value.trim() });
  }
  return out;
}

export async function receive(_prev: ReceiveState, form: FormData): Promise<ReceiveState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const receivedOn = date(form, 'receivedOn');
  if (!receivedOn) return { ...blank(), error: 'Give the date it arrived.' };

  const lines = collectLines(form);
  if (lines.length === 0) {
    return { ...blank(), error: 'Enter what arrived on at least one line.' };
  }

  // The key is derived from what is being recorded rather than randomly, so
  // the same delivery submitted twice is one goods receipt. A random key
  // would make every retry a fresh accrual, which is the failure the key
  // exists to prevent.
  const idempotencyKey = [
    'grn',
    str(form, 'purchaseOrderId'),
    receivedOn.toISOString().slice(0, 10),
    ...lines.map((l) => `${l.poLineId}:${l.quantity}`),
  ].join('|');

  try {
    const result = await receiveGoods(
      ctx.principal,
      {
        purchaseOrderId: str(form, 'purchaseOrderId'),
        receivedOn,
        note: str(form, 'note') || undefined,
        lines,
      },
      idempotencyKey,
    );
    revalidatePath('/console/procurement/receiving');
    revalidatePath('/console/procurement/orders');
    revalidatePath('/console/procurement/invoices');
    return { error: null, received: { grnNo: result.grnNo, voucherRef: result.voucherRef } };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
