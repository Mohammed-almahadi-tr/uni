'use server';

import { revalidatePath } from 'next/cache';
import type { PaymentChannel } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import {
  approvePayment,
  draftPayment,
  rejectPayment,
  submitPayment,
  type PaymentAllocationInput,
} from '@/lib/procurement/payments';

/**
 * Paying suppliers (Track D4, SRS REQ-PRC-05).
 *
 * D2 handed this screen back to D4: it sits in the finance menu, but it is
 * the last leg of procure-to-pay and it depends on invoices existing.
 *
 * Three controls, none of them here:
 *
 *   · `payment.approve` is in `MFA_REQUIRED_PERMISSIONS` — this is money
 *     leaving the institution;
 *   · the approver may not be the person who drafted it;
 *   · `requirePayableVendor` refuses a blocked supplier, and refuses to pay
 *     to bank details that are still awaiting a second signature. That last
 *     one is the whole point of the vendor screen's maker-checker: a change
 *     nobody approved must not be able to receive a payment.
 */

export interface PaymentState {
  error: string | null;
  message: string | null;
  drafted: { paymentNo: string } | null;
  approved: { voucherRef: string } | null;
  mfaRequired: boolean;
}

function blank(): PaymentState {
  return { error: null, message: null, drafted: null, approved: null, mfaRequired: false };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date | null => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : null;
};

function fail(e: unknown): PaymentState {
  if (e instanceof Error && e.name === 'MfaRequiredError') {
    return { ...blank(), mfaRequired: true };
  }
  if (e instanceof Error && e.name !== 'Error' && e.message) {
    return { ...blank(), error: e.message };
  }
  console.error('[payments]', e);
  return { ...blank(), error: 'That could not be completed.' };
}

function refresh(): void {
  revalidatePath('/console/finance/payments');
  revalidatePath('/console/procurement/invoices');
}

/** `pay_<invoiceId>`. Blank means this invoice is not in this payment. */
function collectAllocations(form: FormData): PaymentAllocationInput[] {
  const out: PaymentAllocationInput[] = [];
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const m = key.match(/^pay_(.+)$/);
    if (!m || Number(value) <= 0) continue;
    out.push({ invoiceId: m[1], amount: value.trim() });
  }
  return out;
}

export async function draft(_prev: PaymentState, form: FormData): Promise<PaymentState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const paymentDate = date(form, 'paymentDate');
  if (!paymentDate) return { ...blank(), error: 'Give the date of the payment.' };

  const allocations = collectAllocations(form);
  if (allocations.length === 0) {
    return { ...blank(), error: 'Enter what is being paid against at least one invoice.' };
  }

  try {
    const result = await draftPayment(ctx.principal, {
      vendorId: str(form, 'vendorId'),
      paymentDate,
      channel: str(form, 'channel') as Extract<
        PaymentChannel,
        'CASH' | 'BANK_TRANSFER' | 'CHEQUE'
      >,
      bankAccountId: str(form, 'bankAccountId'),
      chequeNo: str(form, 'chequeNo') || undefined,
      reference: str(form, 'reference') || undefined,
      allocations,
    });
    refresh();
    return { ...blank(), drafted: { paymentNo: result.pvNo } };
  } catch (e) {
    return fail(e);
  }
}

/** Submit, approve or reject — the state decides which is offered. */
export async function transition(
  _prev: PaymentState,
  form: FormData,
): Promise<PaymentState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const paymentId = str(form, 'paymentId');
  const how = str(form, 'how');

  try {
    if (how === 'submit') {
      await submitPayment(ctx.principal, paymentId);
      refresh();
      return { ...blank(), message: 'submitted' };
    }
    if (how === 'approve') {
      const result = await approvePayment(ctx.principal, paymentId, {
        note: str(form, 'note') || undefined,
      });
      refresh();
      return { ...blank(), approved: { voucherRef: result.voucherRef } };
    }
    if (how === 'reject') {
      await rejectPayment(ctx.principal, paymentId, str(form, 'note'));
      refresh();
      return { ...blank(), message: 'rejected' };
    }
    return { ...blank(), error: 'Unknown action.' };
  } catch (e) {
    return fail(e);
  }
}
