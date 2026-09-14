'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { clearHold, placeHold } from '@/lib/students/holds';
import type { HoldType } from '@/generated/prisma/enums';

/**
 * Placing and clearing holds (Track D3, SRS REQ-REG-06).
 *
 * The rule that matters is not in this file: `clearHold` refuses a clearance
 * by the person who placed the hold, and refuses one by anybody outside the
 * clearance role when a role was named. B5 put that in the module and the
 * database — `chk_hold_second_signature` — so the screen does not get to be
 * the control, only the way in.
 */

export interface HoldState {
  error: string | null;
  placed: boolean;
  cleared: boolean;
}

const blank = (): HoldState => ({ error: null, placed: false, cleared: false });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date | undefined => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : undefined;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[holds]', e);
  return 'That could not be completed.';
}

export async function place(_prev: HoldState, form: FormData): Promise<HoldState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const studentId = str(form, 'studentId');
  try {
    await placeHold(ctx.principal, {
      studentId,
      holdType: str(form, 'holdType') as HoldType,
      reason: str(form, 'reason'),
      effectiveFrom: date(form, 'effectiveFrom'),
      // An unticked checkbox sends nothing, so absence means "warn only".
      blocksRegistration: form.get('blocksRegistration') !== null,
      clearanceRoleId: str(form, 'clearanceRoleId') || null,
    });
    revalidatePath(`/console/registry/holds`);
    revalidatePath(`/console/registry/students/${studentId}`);
    return { error: null, placed: true, cleared: false };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

export async function clear(_prev: HoldState, form: FormData): Promise<HoldState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const studentId = str(form, 'studentId');
  try {
    await clearHold(ctx.principal, str(form, 'holdId'), str(form, 'note'));
    revalidatePath(`/console/registry/holds`);
    revalidatePath(`/console/registry/students/${studentId}`);
    return { error: null, placed: false, cleared: true };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
