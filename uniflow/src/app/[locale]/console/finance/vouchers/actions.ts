'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getPathname } from '@/i18n/navigation';
import { currentContext } from '@/lib/console/session';
import type { PostingLine } from '@/lib/ledger/lines';
import {
  cancelDraft,
  createDraft,
  submitForReview,
  updateDraft,
  type DraftSaved,
} from '@/lib/voucher/draft';

/**
 * The journal voucher grid's server actions (Track D2, SRS REQ-FIN-04).
 *
 * ## Why the totals come back from the server
 *
 * The legacy grid computed its own, from its own display strings:
 *
 * ```vb
 * Me.txtCrd.Text = Format(Crd, "##,###.##")
 * ...
 * ElseIf CDbl(Me.txtCrd.Text - Me.txtDep.Text) <> 0 Then
 *     Me.ErrProv.SetError(Me.txtBalance, "Please complete voucher")
 * ```
 * ([frmMakeVoucher.vb:24, 126](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Financial%20System/Forms/frmMakeVoucher.vb#L123-L128))
 *
 * The balance test subtracts one **text box** from another. The values in
 * those boxes have already been through `Format(…, "##,###.##")`, so a
 * voucher whose two sides differ by a fraction of a piastre displays as
 * balanced, passes the check, and is stored out of balance. `Crd` and `Dep`
 * are also accumulated from cells 9 and 10 — the columns the INSERT writes to
 * `TotalValueOut` and `TotalValueIn` respectively — so the totals shown to
 * the maker are labelled the wrong way round.
 *
 * Here there is one balance. `summariseLines` computes it, `createDraft` and
 * `updateDraft` return it, and `submitForReview` refuses on the same figures.
 * A grid that says "balanced" against a server that says "out by 0.01" is the
 * worst available outcome, and the only way to be sure of avoiding it is for
 * there to be a single implementation — which is why `lines.ts` exists.
 *
 * ## And the description
 *
 * ```vb
 * cmd.Parameters.AddWithValue("@Descr", Me.GridVouchers.Rows(i).Cells(6).Value)
 * cmd.Parameters.AddWithValue("@StudName", Me.GridVouchers.Rows(i).Cells(6).Value)
 * ```
 * ([frmMakeVoucher.vb:154, 161](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Financial%20System/Forms/frmMakeVoucher.vb#L148-L168))
 *
 * The same cell, twice. Cell 6 is the student name; the description the clerk
 * typed is cell 8 and is never stored. Every hand-typed voucher in that
 * database has a student's name where its narrative should be.
 */

export interface VoucherState {
  error: string | null;
  saved: DraftSaved | null;
  submitted: boolean;
  abandoned: boolean;
}

function blank(): VoucherState {
  return { error: null, saved: null, submitted: false, abandoned: false };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : new Date();
};

/**
 * Read the whole grid out of the form.
 *
 * Every line is resubmitted on every change, because `updateDraft` replaces
 * the set rather than patching it — which is the right shape for a document
 * that must be frozen wholesale the moment it is submitted.
 *
 * Amounts are passed through as **strings**. `toStorage` parses them into
 * `Decimal`; turning them into a JavaScript number on the way past would put
 * a float in the middle of a path whose entire purpose is not having one.
 */
function collectLines(form: FormData, skipIndex: number | null): PostingLine[] {
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^line_(\d+)_accountId$/);
    if (m) indices.add(Number(m[1]));
  }

  const out: PostingLine[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    if (i === skipIndex) continue;
    const accountId = str(form, `line_${i}_accountId`);
    if (!accountId) continue;
    const debit = str(form, `line_${i}_debit`);
    const credit = str(form, `line_${i}_credit`);
    out.push({
      accountId,
      costCenterId: str(form, `line_${i}_costCenterId`) || null,
      debit: debit || 0,
      credit: credit || 0,
      description: str(form, `line_${i}_description`) || null,
    });
  }
  return out;
}

/** A line typed into the "add" row, if it was filled in. */
function newLine(form: FormData): PostingLine | null {
  const accountId = str(form, 'new_accountId');
  if (!accountId) return null;
  const side = str(form, 'new_side');
  const amount = str(form, 'new_amount');
  if (!amount) return null;
  return {
    accountId,
    costCenterId: str(form, 'new_costCenterId') || null,
    debit: side === 'debit' ? amount : 0,
    credit: side === 'credit' ? amount : 0,
    description: str(form, 'new_description') || null,
  };
}

function explain(e: unknown): string {
  // A validation failure carries its issues; the first one is the sentence
  // worth showing, and the rest are rendered from the draft's own `issues`.
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[vouchers]', e);
  return 'That could not be completed.';
}

/**
 * Start one.
 *
 * A journal voucher, and only a journal voucher. Every other voucher type is
 * produced by the module that owns the document it records — a receipt is a
 * receipt, a payment is a payment — and offering the type as a dropdown here
 * would let a clerk file a hand-typed entry as something the cashiering
 * module is supposed to have created.
 */
export async function create(_prev: VoucherState, form: FormData): Promise<VoucherState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const locale = str(form, 'locale') || 'ar';

  let draftId: string;
  try {
    const saved = await createDraft(ctx.principal, {
      voucherType: 'JOURNAL',
      docDate: date(form, 'docDate'),
      description: str(form, 'description'),
      // Deliberately empty. A draft is allowed to be incomplete: a clerk
      // entering forty lines from a paper journal saves halfway through and
      // goes to lunch, and refusing to keep their work is how people end up
      // keeping it in a spreadsheet instead.
      lines: [],
    });
    draftId = saved.draftId;
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }

  revalidatePath('/console/finance/vouchers');
  redirect(getPathname({ href: `/console/finance/vouchers/${draftId}`, locale }));
}

/** Save the grid — adding a line, removing one, or just keeping the work. */
export async function save(_prev: VoucherState, form: FormData): Promise<VoucherState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const draftId = str(form, 'draftId');
  const removeRaw = str(form, 'remove');
  const remove = removeRaw === '' ? null : Number(removeRaw);

  const lines = collectLines(form, Number.isFinite(remove) ? remove : null);
  const added = newLine(form);
  if (added) lines.push(added);

  try {
    const saved = await updateDraft(ctx.principal, draftId, {
      docDate: date(form, 'docDate'),
      description: str(form, 'description'),
      lines,
    });
    revalidatePath(`/console/finance/vouchers/${draftId}`);
    return { error: null, saved, submitted: false, abandoned: false };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Hand it to a reviewer.
 *
 * This is where the voucher stops being work in progress, so this is where it
 * has to be complete: balanced, and postable against the chart as it stands
 * today. `submitForReview` checks both and lists everything wrong at once —
 * handing a reviewer a voucher that cannot post wastes their time and teaches
 * them to approve without looking.
 */
export async function submit(_prev: VoucherState, form: FormData): Promise<VoucherState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const draftId = str(form, 'draftId');
  try {
    await submitForReview(ctx.principal, draftId, str(form, 'comment') || undefined);
    revalidatePath('/console/finance/vouchers');
    revalidatePath('/console/finance/approvals');
    revalidatePath(`/console/finance/vouchers/${draftId}`);
    return { error: null, saved: null, submitted: true, abandoned: false };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Abandon it. Nothing is deleted; the number stays spoken for. */
export async function abandon(_prev: VoucherState, form: FormData): Promise<VoucherState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const draftId = str(form, 'draftId');
  try {
    await cancelDraft(ctx.principal, draftId, str(form, 'comment') || undefined);
    revalidatePath('/console/finance/vouchers');
    revalidatePath(`/console/finance/vouchers/${draftId}`);
    return { error: null, saved: null, submitted: false, abandoned: true };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
