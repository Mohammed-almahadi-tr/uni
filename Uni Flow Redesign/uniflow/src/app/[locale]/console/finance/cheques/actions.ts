'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import {
  bounceCheque,
  cancelCheque,
  clearCheques,
  depositCheques,
} from '@/lib/cheques/pipeline';

/**
 * The cheque pipeline's server actions (Track D2, SRS REQ-CHQ-01/02/03).
 *
 * ## The screen this replaces, in full
 *
 * ```vb
 * If CInt(Reader.Item("CheqClear")) = 0 Then
 *     Status = "Rejected"
 * ElseIf CInt(Reader.Item("CheqClear")) = 1 Then
 *     Status = "Cleared"
 * End If
 * ```
 * ([frmCheqClearingSystem.vb:29-34](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Financial%20System/Forms/frmCheqClearingSystem.vb#L29-L34))
 *
 * A cheque's entire state was one boolean. There was no third value, so
 * **every cheque sitting in the drawer waiting for its due date was displayed
 * to staff as "Rejected"** — the same word as a cheque the bank had actually
 * refused. A clerk reading that screen could not tell an unpresented cheque
 * from a returned one, and the radio filter labelled `RPending` selected
 * `CheqClear=0`, which is to say both.
 *
 * And the transition:
 *
 * ```vb
 * Dim cmd As New SqlCommand("Update Transactions Set CheqClear=1 Where TransNo=" &
 *     Me.GridVouchers.Rows(e.RowIndex).Cells(0).Value, cnn)
 * ```
 * ([frmCheqClearingSystem.vb:77](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Financial%20System/Forms/frmCheqClearingSystem.vb#L77))
 *
 * One click on a grid cell ran that `UPDATE` and nothing else. Clearing a
 * cheque never moved the bank balance. Bouncing one never reinstated the
 * student's debt. Neither recorded a date, a reason, an actor or a voucher,
 * and because both cells were always live, clicking "Rejected" on a cleared
 * cheque silently un-cleared it: a toggle, not a state machine.
 *
 * Every action below posts. That is the difference, and it is enforced in
 * `pipeline.ts` rather than here.
 */

export interface ChequeState {
  error: string | null;
  message: 'deposited' | 'cleared' | 'bounced' | 'handedBack' | null;
  voucherRef: string | null;
  count: number;
  total: string | null;
  /** Debt put back on the account. */
  reinstated: string | null;
  /** Credit balance taken back off it. A bounce splits its debit exactly the
   *  way the original receipt split its credit; showing only the reinstated
   *  half would leave the operator unable to reconcile the two figures. */
  creditWithdrawn: string | null;
}

const blank = (): ChequeState => ({
  error: null,
  message: null,
  voucherRef: null,
  count: 0,
  total: null,
  reinstated: null,
  creditWithdrawn: null,
});

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : new Date();
};

const ids = (f: FormData): string[] =>
  f.getAll('cheque').filter((v): v is string => typeof v === 'string' && v.length > 0);

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[cheques]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/finance/cheques');
  revalidatePath('/console/finance/receipts');
}

/** A batch to the bank. One slip, one voucher. */
export async function deposit(_prev: ChequeState, form: FormData): Promise<ChequeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const chequeIds = ids(form);
  if (chequeIds.length === 0) return { ...blank(), error: 'Tick the cheques to send.' };

  try {
    const r = await depositCheques(ctx.principal, chequeIds, {
      bankAccountId: str(form, 'bankAccountId'),
      docDate: date(form, 'docDate'),
      reference: str(form, 'reference') || null,
    });
    refresh();
    return {
      ...blank(),
      message: 'deposited',
      voucherRef: r.voucherRef,
      count: r.chequeCount,
      total: r.total,
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** The bank paid them. `DR Bank · CR Cheques with Bank` — the entry the
 *  legacy screen's `Set CheqClear=1` did not make. */
export async function clear(_prev: ChequeState, form: FormData): Promise<ChequeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const chequeIds = ids(form);
  if (chequeIds.length === 0) return { ...blank(), error: 'Tick the cheques that cleared.' };

  try {
    const r = await clearCheques(ctx.principal, chequeIds, {
      docDate: date(form, 'docDate'),
      reference: str(form, 'reference') || null,
    });
    refresh();
    return {
      ...blank(),
      message: 'cleared',
      voucherRef: r.voucherRef,
      count: r.chequeCount,
      total: r.total,
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * The bank refused it.
 *
 * The reason is the bank's own words and is mandatory — without it,
 * repeat-drawer reporting is guesswork and the student has nothing to take
 * back to their bank. The penalty is optional and needs `charge.create`,
 * because raising it is billing somebody.
 */
export async function bounce(_prev: ChequeState, form: FormData): Promise<ChequeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const feeItemId = str(form, 'penaltyFeeItemId');
  const penaltyAmount = str(form, 'penaltyAmount');

  try {
    const r = await bounceCheque(ctx.principal, str(form, 'chequeId'), {
      docDate: date(form, 'docDate'),
      reason: str(form, 'reason'),
      reasonCode: str(form, 'reasonCode') || null,
      penalty: feeItemId && penaltyAmount ? { feeItemId, amount: penaltyAmount } : null,
    });
    refresh();
    return {
      ...blank(),
      message: 'bounced',
      voucherRef: r.voucherRef,
      reinstated: r.reinstated,
      creditWithdrawn: r.creditWithdrawn,
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Hand an unpresented cheque back to its drawer.
 *
 * Discretionary — no bank has refused anything — so it demands a second
 * factor and the segregation matrix bars it from being held with
 * `receipt.create`. Otherwise one person could take a cheque, hand it back,
 * and leave the student's account looking settled.
 */
export async function handBack(_prev: ChequeState, form: FormData): Promise<ChequeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    const r = await cancelCheque(ctx.principal, str(form, 'chequeId'), {
      docDate: date(form, 'docDate'),
      reason: str(form, 'reason'),
    });
    refresh();
    return {
      ...blank(),
      message: 'handedBack',
      voucherRef: r.voucherRef,
      reinstated: r.reinstated,
      creditWithdrawn: r.creditWithdrawn,
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
