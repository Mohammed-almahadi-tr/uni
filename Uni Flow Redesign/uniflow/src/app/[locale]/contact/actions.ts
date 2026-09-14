'use server';

import { currentTenant } from '@/lib/cms/request';
import { InquiryError, submitInquiry } from '@/lib/cms/inquiries';

/**
 * The public enquiry form's server action (SRS REQ-LP-06, Track C1).
 *
 * The tenant is taken from the resolved host and **never** from the form
 * body. A hidden field naming the university would let anyone post into any
 * university's queue on the platform; the host is the one piece of the
 * request the sender does not control the meaning of.
 */

export interface InquiryFormState {
  ok: boolean;
  message: string | null;
}

export async function sendInquiry(
  _prev: InquiryFormState,
  formData: FormData,
): Promise<InquiryFormState> {
  const tenant = await currentTenant();
  if (!tenant) {
    return { ok: false, message: 'No site is configured at this address.' };
  }

  const value = (k: string) => {
    const v = formData.get(k);
    return typeof v === 'string' ? v : '';
  };

  try {
    await submitInquiry(tenant.tenantId, {
      senderName: value('senderName'),
      email: value('email') || null,
      phone: value('phone') || null,
      subject: value('subject'),
      message: value('message'),
    });
    return { ok: true, message: null };
  } catch (e) {
    // A validation message is written for the sender and is safe to show. Any
    // other failure is not: it would leak the shape of the system to an
    // unauthenticated caller.
    if (e instanceof InquiryError) return { ok: false, message: e.message };
    // A sentinel rather than a sentence: the client renders it from the
    // message catalogue, so the generic failure is bilingual like everything
    // else on the page.
    return { ok: false, message: 'FAILED' };
  }
}
