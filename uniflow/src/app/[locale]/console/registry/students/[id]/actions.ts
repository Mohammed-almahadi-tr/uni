'use server';

import { revalidatePath } from 'next/cache';
import type { PortalRole } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import {
  invitePortalAccount,
  PortalAccountError,
  revokeInvitation,
  revokePortalAccess,
} from '@/lib/portal/account';

/**
 * Granting and withdrawing portal access, from the student's record (C3).
 *
 * It lives on the student screen rather than in a settings section of its own
 * because it is a fact **about this student** — who may read their account —
 * and the registrar deciding it is looking at their record when they decide.
 * A separate screen would mean searching for the student twice.
 *
 * `student.manage`, the same authority as editing the record. Deciding who
 * may read a student's file is not a lesser act than editing it, and a
 * distinct permission nobody thinks to grant is a portal nobody can be let
 * into.
 */

export interface PortalAccessState {
  ok: boolean;
  error: string | null;
  /** The invitation code, shown to the registrar **once**, to hand over. It
   *  is never stored in clear and cannot be shown again — a second look
   *  means issuing a second invitation, which is the correct amount of
   *  friction for handing somebody a credential. */
  code: string | null;
  expiresAt: string | null;
}

export const blankAccess: PortalAccessState = {
  ok: false,
  error: null,
  code: null,
  expiresAt: null,
};

const field = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
};

export async function invite(
  _prev: PortalAccessState,
  form: FormData,
): Promise<PortalAccessState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blankAccess, error: 'Your session has ended. Sign in again.' };
  const studentId = field(form, 'studentId');

  try {
    const invitation = await invitePortalAccount(ctx.principal, {
      studentId,
      role: field(form, 'role') === 'GUARDIAN' ? 'GUARDIAN' : ('STUDENT' as PortalRole),
      email: field(form, 'email'),
      fullName: field(form, 'fullName'),
      relationship: field(form, 'relationship') || null,
    });
    revalidatePath(`/console/registry/students/${studentId}`);
    return {
      ok: true,
      error: null,
      code: invitation.code,
      expiresAt: invitation.expiresAt.toISOString().slice(0, 10),
    };
  } catch (e) {
    if (e instanceof PortalAccountError) return { ...blankAccess, error: e.message };
    console.error('[portal-access/invite]', e);
    return { ...blankAccess, error: 'Could not issue that invitation.' };
  }
}

export async function withdraw(
  _prev: PortalAccessState,
  form: FormData,
): Promise<PortalAccessState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blankAccess, error: 'Your session has ended. Sign in again.' };
  const studentId = field(form, 'studentId');

  try {
    const accessId = field(form, 'accessId');
    if (accessId) {
      await revokePortalAccess(ctx.principal, accessId);
    } else {
      await revokeInvitation(ctx.principal, field(form, 'invitationId'));
    }
    revalidatePath(`/console/registry/students/${studentId}`);
    return { ...blankAccess, ok: true };
  } catch (e) {
    if (e instanceof PortalAccountError) return { ...blankAccess, error: e.message };
    console.error('[portal-access/withdraw]', e);
    return { ...blankAccess, error: 'Could not withdraw that access.' };
  }
}
