import 'server-only';
import type { InquiryStatus } from '@/generated/prisma/enums';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';

/**
 * The public enquiry form (SRS REQ-LP-06, Track C1).
 *
 * This is the only path in the system by which a request carrying no session
 * writes a row. Everything about it is therefore narrower than it would
 * otherwise be:
 *
 *   · It writes to exactly one table, which holds nothing but what the sender
 *     typed. No relation to a student, an applicant or an account.
 *   · Its bounds are `chk_inquiry_bounds` in the database, not only in the
 *     form component — the form component is not what an attacker uses.
 *   · It requires a way to reply, `chk_inquiry_reachable`. An enquiry nobody
 *     can answer is a queue that only grows.
 *   · It still runs under `withTenant`, as the app role, confined by RLS. A
 *     public write is not a privileged one.
 *
 * What it deliberately does **not** do: send mail, create an application, or
 * touch the admissions queue. An enquiry is a question, and turning questions
 * into applications is how an admissions committee ends up screening people
 * who asked about parking.
 */

export class InquiryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InquiryError';
  }
}

export interface SubmitInquiryInput {
  senderName: string;
  email?: string | null;
  phone?: string | null;
  subject: string;
  message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Take an enquiry from the public form.
 *
 * `tenantId` comes from the resolved host, never from the form body. A hidden
 * field naming the tenant would let anyone post into any university's queue.
 */
export async function submitInquiry(
  tenantId: string,
  input: SubmitInquiryInput,
): Promise<{ id: string }> {
  const senderName = input.senderName?.trim() ?? '';
  const subject = input.subject?.trim() ?? '';
  const message = input.message?.trim() ?? '';
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;

  if (senderName.length < 2 || senderName.length > 120) {
    throw new InquiryError('Please give a name we can address a reply to.');
  }
  if (subject.length < 3 || subject.length > 200) {
    throw new InquiryError('Please give a short subject.');
  }
  if (message.length < 10 || message.length > 4000) {
    throw new InquiryError('Please write between 10 and 4000 characters.');
  }
  if (!email && !phone) {
    throw new InquiryError('Please give an email address or a telephone number so we can reply.');
  }
  if (email && !EMAIL_RE.test(email)) {
    throw new InquiryError(`"${email}" does not look like an email address.`);
  }
  if (phone && (phone.length < 6 || phone.length > 32)) {
    throw new InquiryError('That telephone number does not look right.');
  }

  return withTenant(tenantId, async (tx) => {
    const row = await tx.inquiry.create({
      data: { tenantId, senderName, email, phone, subject, message },
      select: { id: true },
    });
    // Audited with no actor: nobody was authenticated. The chain still covers
    // it, which is what makes "when did this arrive" answerable later.
    await audit(tx, tenantId, {
      actorId: null,
      action: 'INSERT',
      resourceType: 'Inquiry',
      resourceId: row.id,
      after: { subject },
    });
    return row;
  });
}

export interface InquiryRow {
  id: string;
  senderName: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: InquiryStatus;
  createdAt: Date;
  handledAt: Date | null;
  responseNote: string | null;
}

export async function listInquiries(
  principal: Principal,
  filter: { status?: InquiryStatus; limit?: number } = {},
): Promise<InquiryRow[]> {
  requirePermission(principal, 'inquiry.handle');
  return withTenant(principal.tenantId, (tx) =>
    tx.inquiry.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
      take: filter.limit ?? 100,
      select: {
        id: true,
        senderName: true,
        email: true,
        phone: true,
        subject: true,
        message: true,
        status: true,
        createdAt: true,
        handledAt: true,
        responseNote: true,
      },
    }),
  );
}

/**
 * Record that somebody has dealt with an enquiry.
 *
 * `chk_inquiry_handled` refuses any status but NEW without a handler and a
 * timestamp, so "closed by nobody at no time" is not a state this table can
 * hold. It is the same shape as every other verdict in this system: whoever
 * decided, and when.
 */
export async function handleInquiry(
  principal: Principal,
  inquiryId: string,
  input: { status: Exclude<InquiryStatus, 'NEW'>; note?: string | null },
): Promise<void> {
  requirePermission(principal, 'inquiry.handle');

  await withTenant(principal.tenantId, async (tx) => {
    const before = await tx.inquiry.findUnique({
      where: { id: inquiryId },
      select: { id: true, status: true, subject: true },
    });
    if (!before) throw new InquiryError('No such enquiry.');

    await tx.inquiry.update({
      where: { id: inquiryId },
      data: {
        status: input.status,
        handledById: principal.userId,
        handledAt: new Date(),
        responseNote: input.note?.trim() || null,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'Inquiry',
      resourceId: inquiryId,
      before: { status: before.status },
      after: { status: input.status },
    });
  });
}
