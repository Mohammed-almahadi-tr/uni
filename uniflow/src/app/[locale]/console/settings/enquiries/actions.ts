'use server';

import { revalidatePath } from 'next/cache';
import type { InquiryStatus } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import { handleInquiry } from '@/lib/cms/inquiries';

/**
 * The enquiry inbox (tenant administration, SRS REQ-LP-06).
 *
 * C1 built the public contact form and the storage behind it; this is the
 * other end. `chk_inquiry_handled` refuses any status but NEW without a
 * handler and a timestamp, so "closed by nobody at no time" is not a state
 * the table can hold — the same shape as every other verdict in this system.
 */

export interface EnquiryState {
  error: string | null;
  handled: boolean;
}

const blank = (): EnquiryState => ({ error: null, handled: false });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[enquiries]', e);
  return 'That could not be completed.';
}

export async function handle(_prev: EnquiryState, form: FormData): Promise<EnquiryState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const status = str(form, 'status');
  if (status !== 'ACKNOWLEDGED' && status !== 'CLOSED') {
    return { ...blank(), error: 'Choose what was done.' };
  }

  try {
    await handleInquiry(ctx.principal, str(form, 'inquiryId'), {
      status: status as Exclude<InquiryStatus, 'NEW'>,
      note: str(form, 'note') || null,
    });
    revalidatePath('/console/settings/enquiries');
    return { error: null, handled: true };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
