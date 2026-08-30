'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { cancelReceipt } from '@/lib/cashier/receipt';

/**
 * Cancelling a receipt (Track D2, SRS REQ-CSH-06).
 *
 * The whole control is in `cancelReceipt`, and it is worth naming what it
 * refuses, because none of it existed before:
 *
 *   · the day of issue only — after that the correction is a voucher
 *     reversal, which carries the full maker-checker workflow;
 *   · `receipt.cancel`, which the segregation matrix forbids anyone holding
 *     `receipt.create` from also holding, because a cashier who can take a
 *     payment and erase it can pocket the cash;
 *   · a second factor, since this is one of the two ways a recorded debt
 *     stops being recorded;
 *   · a stated reason, stored;
 *   · and the receipt row survives, cancelled. A gap in a receipt book is a
 *     question an auditor asks.
 *
 * The legacy system had no cancellation at all. A receipt was two rows in
 * `Transactionees` and the way to undo one was to delete them.
 */

export interface CancelState {
  error: string | null;
  voucherRef: string | null;
}

const blank = (): CancelState => ({ error: null, voucherRef: null });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[receipts]', e);
  return 'That could not be completed.';
}

export async function cancel(_prev: CancelState, form: FormData): Promise<CancelState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    const { voucherRef } = await cancelReceipt(
      ctx.principal,
      str(form, 'receiptId'),
      str(form, 'reason'),
    );
    revalidatePath('/console/finance/receipts');
    revalidatePath('/console/finance/cashier');
    return { error: null, voucherRef };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
