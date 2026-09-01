'use server';

import { cookies } from 'next/headers';
import { currentTenant } from '@/lib/cms/request';
import { portalLogin } from '@/lib/portal/account';
import { PORTAL_COOKIE, PORTAL_TTL_SECONDS } from '@/lib/portal/session';

/**
 * Portal sign-in (Track C3).
 *
 * The tenant comes from the **host**, never from the form — the same rule
 * every sessionless write in C1 and C2 follows, and here it also decides
 * which university's students the address is looked up among. Two people at
 * two universities may share an email address, and a form field naming the
 * university would let either of them try the other's password.
 *
 * `noAccess` is returned only after a *correct* password, and it is the one
 * failure that is told apart from the rest: an account whose grants have all
 * been withdrawn is told it has no students rather than that its password is
 * wrong, because the second sends somebody to reset a password that was never
 * the problem. It discloses nothing an attacker does not already have —
 * they would have had to know the password to see it.
 */

export interface PortalSignInState {
  ok: boolean;
  /** A key under `portal.signIn.errors`, so the failure is bilingual. */
  error: 'invalid' | 'locked' | 'inactive' | 'noAccess' | 'noSite' | null;
}

export const blankSignIn: PortalSignInState = { ok: false, error: null };

const field = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

export async function portalSignIn(
  _prev: PortalSignInState,
  form: FormData,
): Promise<PortalSignInState> {
  const tenant = await currentTenant();
  if (!tenant) return { ok: false, error: 'noSite' };

  const result = await portalLogin(
    tenant.tenantId,
    field(form, 'email'),
    field(form, 'password'),
  );
  if (!result.ok) return { ok: false, error: result.reason };

  await setPortalCookie(result.token);
  return { ok: true, error: null };
}

export async function setPortalCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(PORTAL_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: PORTAL_TTL_SECONDS,
  });
}

export async function portalSignOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(PORTAL_COOKIE);
}
