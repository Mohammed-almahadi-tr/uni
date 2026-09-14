'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { approveAndPost, rejectDraft, reviewDraft } from '@/lib/voucher/draft';

/**
 * The maker-checker queue's server actions (Track D2, SRS REQ-FIN-04).
 *
 * ## What approval used to be
 *
 * ```vb
 * cmd.CommandText = "Delete From TempVouchers Where MoveNo=" &
 *     Me.ListVouchers.SelectedItems(0).Text
 * cmd.ExecuteNonQuery()
 * ```
 * ([frmApprovingVouchers.vb:989-991](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Financial%20System/Forms/frmApprovingVouchers.vb#L941-L991))
 *
 * Insert the lines into `Transactionees`, delete the staged rows, show
 * "Approved Successfully". There was no reviewer stage, no reject path, no
 * comment, and no record of who approved anything — the delete destroyed the
 * only evidence that the voucher had ever been reviewed. Anyone who could
 * open the screen could approve their own work, because there were no roles
 * at all: `Priv` was read at login and never consulted.
 *
 * The balance check guarding it was
 * `CDbl(Me.txtCrd.Text - Me.txtDep.Text) <> 0` (line 946) — two text boxes,
 * subtracted, on values already rounded for display.
 *
 * ## What it is now
 *
 * Three separate controls stand between one person and a voucher of their
 * own, and none of them is in this file:
 *
 *   · the SoD matrix, which stops `voucher.create` and `voucher.approve`
 *     being held together at all, checked when the role is saved rather than
 *     when it is used;
 *   · `assertNotSelfApproval`, against the actual people who acted on this
 *     document rather than the roles they hold today;
 *   · the reviewer check, which stops one person taking both checker stages.
 *
 * Plus a second factor, and the posting in the same transaction as the state
 * change — so a voucher marked POSTED whose ledger entry rolled back cannot
 * exist.
 */

export interface ApprovalState {
  error: string | null;
  /** True when the refusal was specifically "verify your second factor",
   *  which the screen answers with a link rather than a red box. */
  mfaRequired: boolean;
  reviewed: boolean;
  rejected: boolean;
  voucherRef: string | null;
}

function blank(): ApprovalState {
  return { error: null, mfaRequired: false, reviewed: false, rejected: false, voucherRef: null };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function fail(e: unknown): ApprovalState {
  if (e instanceof Error && e.name === 'MfaRequiredError') {
    return { ...blank(), mfaRequired: true };
  }
  if (e instanceof Error && e.name !== 'Error' && e.message) {
    return { ...blank(), error: e.message };
  }
  console.error('[approvals]', e);
  return { ...blank(), error: 'That could not be completed.' };
}

function refresh(draftId: string): void {
  revalidatePath('/console/finance/approvals');
  revalidatePath('/console/finance/vouchers');
  revalidatePath(`/console/finance/vouchers/${draftId}`);
}

/** The first check. Passes the voucher to the approver, and cannot be the
 *  maker — which is the entire purpose of the stage, and the stage the legacy
 *  system had no equivalent of. */
export async function review(_prev: ApprovalState, form: FormData): Promise<ApprovalState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const draftId = str(form, 'draftId');
  try {
    await reviewDraft(ctx.principal, draftId, str(form, 'comment') || undefined);
    refresh(draftId);
    return { ...blank(), reviewed: true };
  } catch (e) {
    return fail(e);
  }
}

/** The second check, and the posting, in one transaction. */
export async function approve(_prev: ApprovalState, form: FormData): Promise<ApprovalState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const draftId = str(form, 'draftId');
  try {
    const posted = await approveAndPost(ctx.principal, draftId, {
      comment: str(form, 'comment') || undefined,
    });
    refresh(draftId);
    return { ...blank(), voucherRef: posted.voucherRef };
  } catch (e) {
    return fail(e);
  }
}

/**
 * Send it back, with a reason.
 *
 * `rejectDraft` demands the reason, and it is the whole message the maker
 * gets. A rejection with no comment teaches people to resubmit unchanged and
 * hope for a different checker.
 */
export async function reject(_prev: ApprovalState, form: FormData): Promise<ApprovalState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const draftId = str(form, 'draftId');
  try {
    await rejectDraft(ctx.principal, draftId, str(form, 'reason'));
    refresh(draftId);
    return { ...blank(), rejected: true };
  } catch (e) {
    return fail(e);
  }
}
