'use server';

import { revalidatePath } from 'next/cache';
import type { NationalityCategory } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import {
  approveFeeSchedule,
  draftFeeSchedule,
  reviseFeeSchedule,
  type FeeScheduleLineInput,
} from '@/lib/academic/fee-matrix';

/**
 * The fee matrix (Track D4, SRS REQ-FEE-01).
 *
 * ## What the legacy screen did to a price change
 *
 * It deleted the rows and inserted new ones. There was one set of figures per
 * cohort and no record of what they had been, so the answer to "what were we
 * charging this batch when they registered" was whatever the table said
 * today — and a registration raised in October against September's prices
 * reconciled against neither.
 *
 * ## What this screen cannot do
 *
 * **Edit an approved version.** Nothing here offers it, because nothing in
 * the module offers it. A price change is a new version with its own
 * effective date; approving it closes the previous one the day before, stamps
 * it SUPERSEDED, and leaves every registration that resolved against it
 * resolving to the same figures forever.
 *
 * **Approve its own draft.** `feematrix.manage` and `feematrix.approve` are
 * different permissions held by different people — the fee schedule is the
 * document that decides what every student in a cohort pays, and one person
 * deciding it alone is the same exposure as one person approving their own
 * voucher.
 */

export interface MatrixState {
  error: string | null;
  draftedVersion: number | null;
  approved: { versionNo: number; effectiveFrom: string; supersededVersionNo: number | null } | null;
}

function blank(): MatrixState {
  return { error: null, draftedVersion: null, approved: null };
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
  console.error('[fee matrix]', e);
  return 'That could not be completed.';
}

/**
 * Read the line grid.
 *
 * Amounts stay strings all the way to `toStorage`. A schedule is the document
 * that decides what a whole cohort pays; putting a float anywhere in that
 * path would be the one place it could never be noticed, because every
 * individual bill would look plausible.
 */
function collectLines(form: FormData): FeeScheduleLineInput[] {
  const out: FeeScheduleLineInput[] = [];
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const m = key.match(/^amount_(.+)$/);
    if (!m) continue;
    const feeItemId = m[1];
    out.push({
      feeItemId,
      amount: value.trim(),
      isMandatory: form.get(`mandatory_${feeItemId}`) === 'on',
      sortOrder: out.length,
    });
  }
  return out;
}

function refresh(): void {
  revalidatePath('/console/academic/fees');
  revalidatePath('/console/registry/register');
}

/** Draft a first version for a cohort, or a fresh one alongside the others. */
export async function draft(_prev: MatrixState, form: FormData): Promise<MatrixState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const effectiveFrom = date(form, 'effectiveFrom');
  if (!effectiveFrom) return { ...blank(), error: 'Give the date the prices take effect.' };

  const nationality = str(form, 'nationalityCategory');

  try {
    const saved = await draftFeeSchedule(ctx.principal, {
      programmeId: str(form, 'programmeId'),
      batchId: str(form, 'batchId'),
      admissionCategoryId: str(form, 'admissionCategoryId'),
      nationalityCategory: (nationality || null) as NationalityCategory | null,
      currency: str(form, 'currency'),
      effectiveFrom,
      lines: collectLines(form),
      note: str(form, 'note') || undefined,
    });
    refresh();
    return { ...blank(), draftedVersion: saved.versionNo };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Revise an existing version.
 *
 * Copies its lines into a new draft rather than editing it — which is what
 * the legacy delete-and-reinsert was reaching for. The difference is that the
 * old rows stay exactly where they are.
 */
export async function revise(_prev: MatrixState, form: FormData): Promise<MatrixState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const effectiveFrom = date(form, 'effectiveFrom');
  if (!effectiveFrom) return { ...blank(), error: 'Give the date the new prices take effect.' };

  const lines = collectLines(form);

  try {
    const saved = await reviseFeeSchedule(ctx.principal, str(form, 'feeScheduleId'), {
      effectiveFrom,
      // Omitted entirely when the grid was left alone, so the module copies
      // the source version's lines rather than being handed a rebuilt set
      // that only looks the same.
      lines: lines.length > 0 ? lines : undefined,
      note: str(form, 'note') || undefined,
    });
    refresh();
    return { ...blank(), draftedVersion: saved.versionNo };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Put a draft in force, closing whichever version it replaces. */
export async function approve(_prev: MatrixState, form: FormData): Promise<MatrixState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    const result = await approveFeeSchedule(ctx.principal, str(form, 'feeScheduleId'));
    refresh();
    return {
      ...blank(),
      approved: {
        versionNo: result.versionNo,
        effectiveFrom: result.effectiveFrom,
        supersededVersionNo: result.supersededVersionNo,
      },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
