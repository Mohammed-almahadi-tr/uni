'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { assignTill } from '@/lib/cashier/receipt';

/**
 * Assigning a cashier's till (Track D2, SRS REQ-CSH-04).
 *
 * The legacy build posted every cashier's cash to one account:
 *
 * ```vb
 * If RCash.Checked = True Then 'Cash
 *     cmd.Parameters.AddWithValue("@Acc3", "Cash")
 *     cmd.Parameters.AddWithValue("@Acc4", "Cash on Hand")
 * ```
 * ([frmStudantReceiptVoucher.vb:428-430](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Financial%20System/Forms/frmStudantReceiptVoucher.vb#L428-L434))
 *
 * A literal string, the same one for everybody. So "which cashier is short
 * today" could not be answered from the ledger at all — the
 * `IncomeListByCollecter` report had to reconstruct it by grouping on the
 * `UserName` column, which held whatever had been typed into the login box.
 *
 * One safe per cashier makes it a balance rather than a report.
 */

export interface TillState {
  error: string | null;
  assigned: boolean;
}

const blank = (): TillState => ({ error: null, assigned: false });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[tills]', e);
  return 'That could not be completed.';
}

export async function assign(_prev: TillState, form: FormData): Promise<TillState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await assignTill(ctx.principal, str(form, 'userId'), str(form, 'cashAccountId'));
    revalidatePath('/console/finance/tills');
    revalidatePath('/console/finance/cashier');
    return { error: null, assigned: true };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
