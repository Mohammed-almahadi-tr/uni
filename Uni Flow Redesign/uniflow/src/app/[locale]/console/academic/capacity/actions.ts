'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { setSeatQuota } from '@/lib/admissions/quota';

/**
 * Seat quotas (Track D4, SRS REQ-ADM-06).
 *
 * The legacy build had no capacity concept at all: offers went out until
 * somebody noticed. This screen is the first place an institution can say how
 * many places a programme has, and the first place it can see how many are
 * already spoken for.
 *
 * A quota's three dimensions — programme, intake, admission category — are
 * immutable, enforced by trigger. Moving one sideways would move every offer
 * already counted against it, so the form adjusts the seat count and nothing
 * else.
 */

export interface QuotaState {
  error: string | null;
  seats: number | null;
}

const blank = (): QuotaState => ({ error: null, seats: null });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const num = (f: FormData, k: string, fallback: number): number => {
  const n = Number.parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : fallback;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[capacity]', e);
  return 'That could not be completed.';
}

export async function setQuota(_prev: QuotaState, form: FormData): Promise<QuotaState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    const result = await setSeatQuota(ctx.principal, {
      programmeId: str(form, 'programmeId'),
      batchId: str(form, 'batchId'),
      admissionCategoryId: str(form, 'admissionCategoryId'),
      seats: num(form, 'seats', 0),
      reservedSeats: num(form, 'reservedSeats', 0),
      // Off by default. A quota that permits override on creation is a quota
      // nobody has decided about; turning it on is a stated policy, and the
      // override itself still demands `admission.override` and a reason
      // recorded against the offer.
      allowOverride: form.get('allowOverride') === 'on',
    });
    revalidatePath('/console/academic/capacity');
    revalidatePath('/console/registry/admissions');
    return { error: null, seats: result.seats };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
