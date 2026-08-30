'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import {
  approveAward,
  createScheme,
  proposeAward,
  rejectAward,
} from '@/lib/sponsors/scholarships';

/**
 * Scholarships (Track D4, SRS REQ-SCH-01/02).
 *
 * ## What a scholarship used to be
 *
 * The word `"منحة مجانية"` selected in a combo box on the registration form,
 * with no scheme behind it, no eligibility on file, no budget it came out of
 * and nobody's signature against it. So "how much did we give away last year"
 * and "who decided this one" were both unanswerable, and a discount typed at
 * the desk was indistinguishable from an awarded scholarship.
 *
 * Three consequences, all enforced in the module rather than here:
 *
 *   · an award names a **scheme**, and the scheme has a budget;
 *   · proposing and approving are different permissions — a scholarship is
 *     money the institution gives away, and one person deciding it alone is
 *     the exposure maker-checker exists for;
 *   · approval is serialised against the scheme and re-checked at COMMIT, so
 *     two officers cannot each see the same headroom and both spend it.
 */

export interface ScholarshipState {
  error: string | null;
  message: string | null;
  approved: { awarded: string; remaining: string | null } | null;
}

function blank(): ScholarshipState {
  return { error: null, message: null, approved: null };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[scholarships]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/academic/scholarships');
}

/** A scheme, with or without a budget — the absence is a decision. */
export async function addScheme(
  _prev: ScholarshipState,
  form: FormData,
): Promise<ScholarshipState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await createScheme(ctx.principal, {
      code: str(form, 'code'),
      nameAr: str(form, 'nameAr'),
      nameEn: str(form, 'nameEn'),
      academicYearId: str(form, 'academicYearId') || null,
      budgetCap: str(form, 'budgetCap') || null,
      eligibilityNote: str(form, 'eligibilityNote') || null,
    });
    refresh();
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Propose. Covers nothing until somebody else approves it. */
export async function propose(
  _prev: ScholarshipState,
  form: FormData,
): Promise<ScholarshipState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await proposeAward(ctx.principal, {
      schemeId: str(form, 'schemeId'),
      studentId: str(form, 'studentId'),
      academicYearId: str(form, 'academicYearId') || null,
      amount: str(form, 'amount'),
      reason: str(form, 'reason'),
    });
    refresh();
    return { ...blank(), message: 'proposed' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Approve, against the scheme's remaining budget. */
export async function approve(
  _prev: ScholarshipState,
  form: FormData,
): Promise<ScholarshipState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    const result = await approveAward(
      ctx.principal,
      str(form, 'awardId'),
      str(form, 'note') || undefined,
    );
    refresh();
    return {
      ...blank(),
      approved: { awarded: result.awarded, remaining: result.remaining },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Refuse it, with a reason the student can be told and, if they wish, appeal. */
export async function reject(
  _prev: ScholarshipState,
  form: FormData,
): Promise<ScholarshipState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await rejectAward(ctx.principal, str(form, 'awardId'), str(form, 'note'));
    refresh();
    return { ...blank(), message: 'rejected' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
