'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { approveRegistrationDiscount, cancelRegistration } from '@/lib/registration/engine';

/**
 * Registration decisions (Track D3).
 *
 * Both actions are thin. The approval refuses self-approval, checks the
 * MFA-gated permission and posts inside one transaction; the cancellation
 * raises a linked reversal. None of that is decided here — this file reads a
 * form and calls the function that owns the rule, which is the whole of what
 * §8 says Track D is allowed to be.
 */

export interface DecisionState {
  error: string | null;
  message: string | null;
}

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
  console.error('[registration decision]', e);
  return 'That could not be completed.';
}

export async function approveDiscount(
  _prev: DecisionState,
  form: FormData,
): Promise<DecisionState> {
  const ctx = await currentContext();
  if (!ctx) return { error: 'Your session has ended. Sign in again.', message: null };

  try {
    const result = await approveRegistrationDiscount(ctx.principal, str(form, 'registrationId'));
    revalidatePath(`/console/registry/registrations/${str(form, 'registrationId')}`);
    return { error: null, message: result.voucherRef ?? '—' };
  } catch (e) {
    return { error: explain(e), message: null };
  }
}

export async function cancel(_prev: DecisionState, form: FormData): Promise<DecisionState> {
  const ctx = await currentContext();
  if (!ctx) return { error: 'Your session has ended. Sign in again.', message: null };

  const registrationId = str(form, 'registrationId');
  try {
    const result = await cancelRegistration(ctx.principal, registrationId, str(form, 'reason'), {
      reversalDate: date(form, 'reversalDate'),
    });
    revalidatePath(`/console/registry/registrations/${registrationId}`);
    return { error: null, message: result.voucherRef ?? '—' };
  } catch (e) {
    return { error: explain(e), message: null };
  }
}
