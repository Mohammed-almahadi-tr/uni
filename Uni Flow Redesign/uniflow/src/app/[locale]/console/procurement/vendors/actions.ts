'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import {
  approveBankChange,
  blockVendor,
  createVendor,
  rejectBankChange,
  requestBankChange,
} from '@/lib/procurement/vendors';

/**
 * Suppliers and their bank details (Track D4, SRS REQ-PRC-01).
 *
 * ## The one that matters
 *
 * Changing where a supplier's money goes is the highest-value fraud in
 * accounts payable, and it is committed by an email that looks like it came
 * from the supplier. So:
 *
 *   · proposing a change and approving it are **different permissions**;
 *   · both are in `MFA_REQUIRED_PERMISSIONS`, because a stolen session is the
 *     usual way in;
 *   · the proposal does not take effect — the old details stay live until a
 *     second person approves, and the previous account number is retained
 *     beside the proposed one so the approver can see what is changing;
 *   · the reason is mandatory and stored.
 *
 * None of that is enforced here. This action reads a form.
 */

export interface VendorState {
  error: string | null;
  message: string | null;
}

const blank = (): VendorState => ({ error: null, message: null });

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
  console.error('[vendors]', e);
  return 'That could not be completed.';
}

const refresh = () => revalidatePath('/console/procurement/vendors');

export async function addVendor(_prev: VendorState, form: FormData): Promise<VendorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await createVendor(ctx.principal, {
      code: str(form, 'code'),
      nameAr: str(form, 'nameAr'),
      nameEn: str(form, 'nameEn'),
      taxRegistrationNo: str(form, 'taxRegistrationNo') || undefined,
      category: str(form, 'category') || undefined,
      contactName: str(form, 'contactName') || undefined,
      phone: str(form, 'phone') || undefined,
      email: str(form, 'email') || undefined,
      address: str(form, 'address') || undefined,
      paymentTermsDays: num(form, 'paymentTermsDays', 30),
    });
    refresh();
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Propose. The live details are untouched until somebody else approves. */
export async function proposeBank(
  _prev: VendorState,
  form: FormData,
): Promise<VendorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await requestBankChange(
      ctx.principal,
      str(form, 'vendorId'),
      {
        bankName: str(form, 'bankName'),
        bankAccountName: str(form, 'bankAccountName'),
        bankAccountNo: str(form, 'bankAccountNo'),
        bankIban: str(form, 'bankIban') || undefined,
      },
      str(form, 'reason'),
    );
    refresh();
    return { ...blank(), message: 'requested' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** The second signature, or its refusal. */
export async function decideBank(_prev: VendorState, form: FormData): Promise<VendorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const requestId = str(form, 'requestId');
  try {
    if (str(form, 'how') === 'reject') {
      await rejectBankChange(ctx.principal, requestId, str(form, 'reason'));
    } else {
      await approveBankChange(ctx.principal, requestId, {
        note: str(form, 'reason') || undefined,
      });
    }
    refresh();
    return { ...blank(), message: 'decided' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Stop dealing with them. No payment can be raised against a blocked supplier. */
export async function block(_prev: VendorState, form: FormData): Promise<VendorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await blockVendor(ctx.principal, str(form, 'vendorId'), str(form, 'reason'));
    refresh();
    return { ...blank(), message: 'blocked' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
