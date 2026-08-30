'use server';

import { revalidatePath } from 'next/cache';
import type { PeriodStatus } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import { setPeriodStatus } from '@/lib/ledger/fiscal-year';

/**
 * Opening and closing fiscal periods (Track D4, SRS REQ-PER-01).
 *
 * Closing a period refuses every posting dated inside it — `resolveOpenPeriod`
 * raises `PeriodNotOpenError` and nothing in the application can post around
 * it. That is the control the whole ledger design rests on: correcting a
 * January error in March belongs in March, and back-dating it into a closed
 * January is exactly what the lock exists to prevent.
 *
 * `period.close` demands a second factor. It is the permission that decides
 * whether the books can still be changed.
 */

export interface PeriodState {
  error: string | null;
  changed: boolean;
}

const blank = (): PeriodState => ({ error: null, changed: false });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

export async function changeStatus(
  _prev: PeriodState,
  form: FormData,
): Promise<PeriodState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const status = str(form, 'status');
  if (status !== 'OPEN' && status !== 'CLOSED') {
    // PERMANENTLY_CLOSED is deliberately not reachable from this screen. It is
    // the year-end seal, and it belongs with the close checklist rather than
    // with a button beside every month.
    return { ...blank(), error: 'A period is opened or closed here, nothing else.' };
  }

  try {
    await setPeriodStatus(ctx.principal, str(form, 'periodId'), status as PeriodStatus);
    revalidatePath('/console/finance/periods');
    return { error: null, changed: true };
  } catch (e) {
    if (e instanceof Error && e.name !== 'Error' && e.message) {
      return { ...blank(), error: e.message };
    }
    console.error('[periods]', e);
    return { ...blank(), error: 'That could not be completed.' };
  }
}
