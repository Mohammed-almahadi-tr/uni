'use server';

import { revalidatePath } from 'next/cache';
import type { PaymentChannel } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import {
  applyCreditBalance,
  previewAllocation,
  takeReceipt,
  type AllocationPreview,
  type ReceiptResult,
} from '@/lib/cashier/receipt';
import { studentBalance, type StudentBalance } from '@/lib/students/account';

/**
 * The cashier desk's server actions (Track D2, SRS REQ-CSH-01).
 *
 * ## What the legacy desk did with the same click
 *
 * ```vb
 * cmd.CommandText = "Select IsNull(Max(MoveNo),0) From Transactionees " &
 *                   "Where Year(TransDate)=Year(Getdate())"
 * MoveNo = CInt(cmd.ExecuteScalar) + 1
 * ```
 * ([frmStudantReceiptVoucher.vb:366-367](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Financial%20System/Forms/frmStudantReceiptVoucher.vb#L366-L367))
 *
 * Four defects in one handler, all of which this action inherits the fix for
 * rather than solving again:
 *
 *   1. **The number.** `MAX(MoveNo) + 1` read inside the transaction. Two
 *      cashiers pressing Save in the same second get the same receipt number.
 *      A3 replaced it with an allocation the database serialises.
 *   2. **The date.** `TransDate` is built at line 266 as the string
 *      `dd/MM/yyyy` with a fabricated time of `10:10:10` — and then does not
 *      appear in the INSERT's column list at all, so the ledger date is
 *      whenever the row happened to be written. The date picker on that form
 *      changes nothing. (The approvals form builds the same literal as
 *      `MM/dd/yyyy`; two screens in one application, and they cannot both be
 *      right.)
 *   3. **The accounts.** `AddWithValue("@Acc4", "Cash on Hand")` — an English
 *      name, in a chart whose commented-out predecessor used the Arabic
 *      branch. Here the account is an id and the till is the cashier's own.
 *   4. **The money.** `CDbl(row.Cells(5).Value)` on a string already
 *      formatted to two places. `numeric(19,4)` throughout, here.
 *
 * ## Price and take are the same path
 *
 * `previewAllocation` and `takeReceipt` both call `outstandingCharges` and
 * then either `fifoAllocation` or `explicitAllocation` — the same functions,
 * in the same file. So the split a cashier is shown before saving is computed
 * by the code that saves. Nothing priced crosses the wire: the form carries
 * the amount the cashier typed and the allocations they typed, and the server
 * works out the rest again.
 */

export interface DeskState {
  error: string | null;
  balance: StudentBalance | null;
  preview: AllocationPreview | null;
  result: ReceiptResult | null;
  /** Set by "apply the credit balance" rather than by taking money. */
  applied: string | null;
}

function blank(): DeskState {
  return { error: null, balance: null, preview: null, result: null, applied: null };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date | undefined => {
  const v = str(f, k);
  // Parsed as UTC midnight: a receipt is dated by a day, not a moment, and
  // letting the server's zone decide would move a payment taken late on the
  // 31st into the following month.
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : undefined;
};

/** Allocation boxes come back as `alloc_<chargeId>`. Empty boxes are absent,
 *  and an entirely empty grid means "oldest first" — which is what a cashier
 *  means by "put it against what he owes". */
function collectAllocations(form: FormData): Array<{ chargeId: string; amount: string }> {
  const out: Array<{ chargeId: string; amount: string }> = [];
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const m = key.match(/^alloc_(.+)$/);
    if (m) out.push({ chargeId: m[1], amount: value.trim() });
  }
  return out;
}

/**
 * Deliberate refusals are written for a cashier and are safe to show. Anything
 * else would describe the shape of the system to whoever provoked it.
 */
function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[cashier desk]', e);
  return 'That could not be completed.';
}

export async function priceOrTake(_prev: DeskState, form: FormData): Promise<DeskState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const principal = ctx.principal;
  const studentId = str(form, 'studentId');
  if (!studentId) return { ...blank(), error: 'Choose a student.' };

  const amount = str(form, 'amount');
  const commit = str(form, 'intent') === 'commit';
  const allocations = collectAllocations(form);

  try {
    const balance = await studentBalance(principal, studentId);

    if (!commit) {
      const preview = await previewAllocation(
        principal,
        studentId,
        amount || 0,
        allocations.length > 0 ? allocations : undefined,
      );
      return { error: null, balance, preview, result: null, applied: null };
    }

    // Required, not optional. A cashier on an unreliable link presses Save,
    // sees nothing, and presses it again; the key is minted once per receipt
    // in the browser and resent unchanged, so the retry returns the first
    // receipt rather than issuing a second one.
    const idempotencyKey = str(form, 'idempotencyKey');
    if (!idempotencyKey) {
      return { ...blank(), balance, error: 'This form is stale. Reload the page and try again.' };
    }

    const channel = str(form, 'channel') as PaymentChannel;
    const chequeNo = str(form, 'chequeNo');
    const chequeDue = date(form, 'chequeDueDate');

    const result = await takeReceipt(
      principal,
      {
        studentId,
        docDate: date(form, 'docDate') ?? new Date(),
        channel,
        amount,
        reference: str(form, 'reference') || null,
        bankAccountId: str(form, 'bankAccountId') || null,
        cheque:
          channel === 'CHEQUE' && chequeNo && chequeDue
            ? {
                chequeNo,
                bank: str(form, 'chequeBank') || null,
                branch: str(form, 'chequeBranch') || null,
                dueDate: chequeDue,
                drawerName: str(form, 'drawerName') || null,
              }
            : undefined,
        allocations: allocations.length > 0 ? allocations : undefined,
        note: str(form, 'note') || null,
      },
      idempotencyKey,
    );

    revalidatePath('/console/finance/cashier');
    revalidatePath('/console/finance/receipts');
    revalidatePath(`/console/registry/students/${studentId}`);

    return {
      error: null,
      balance: await studentBalance(principal, studentId),
      preview: null,
      result,
      applied: null,
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Put a credit balance against what the student now owes (SRS REQ-FEE-04).
 *
 * No receipt and no receipt number, because nothing entered the institution —
 * the money was already here, sitting in the overpayment liability. The
 * legacy build had neither the liability nor the concept: an overpayment was
 * a negative `Remain`.
 */
export async function applyCredit(_prev: DeskState, form: FormData): Promise<DeskState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const studentId = str(form, 'studentId');
  if (!studentId) return { ...blank(), error: 'Choose a student.' };

  try {
    const { applied } = await applyCreditBalance(ctx.principal, studentId);
    revalidatePath('/console/finance/cashier');
    revalidatePath(`/console/registry/students/${studentId}`);
    return {
      error: null,
      balance: await studentBalance(ctx.principal, studentId),
      preview: null,
      result: null,
      applied,
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
