import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { resolvePrincipal } from '@/lib/auth/login';
import { SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import type { Principal } from '@/lib/auth/rbac';
import { currentTenant } from '@/lib/cms/request';
import type { ResolvedTenant } from '@/lib/cms/hosts';
import { sessionServes } from './tenancy';

/**
 * The console's session surface (Track D1).
 *
 * The engine underneath — `login`, `verifyMfa`, `resolvePrincipal`,
 * `revokeSessions` — was built in Phase 0. This file is only the web layer:
 * where the token lives, how a request turns into a `Principal`, and the one
 * rule that could not exist until C1 gave the platform hostnames.
 *
 * ## The legacy session, for contrast
 *
 * ```vb
 * CurrentUser = Me.txtUserName.Text
 * PWD = Pass
 * ```
 * ([frmLogin.vb](Nile%20College%20E-University%20System/Oasis%20-%20E-University/frmLogin.vb))
 *
 * Three things in two lines. The identity kept for the session is the
 * contents of an **editable text box**, not the row that authenticated — and
 * that same variable is what the login log records as `FullName`, so the
 * audit trail stores what the user typed rather than who they are. The
 * cleartext password is held in a module-level global for the life of the
 * process. And the lookup that filled the box,
 * `Select FullName From Users Where SNo=` on the serial number's `Leave`
 * event, runs **before any authentication at all**: typing numbers into the
 * first field and tabbing out enumerates every member of staff by name.
 *
 * ## The session here
 *
 * A signed, short-lived token in a Secure/HttpOnly/SameSite cookie, carrying
 * identity and nothing else. Permissions are read from the database on every
 * request so a revoked role takes effect immediately (see auth/session.ts for
 * why that trade is made), and `sessionVersion` invalidates every live
 * session for a user the moment their roles change.
 */

/**
 * The cookie.
 *
 * `sameSite: 'lax'` rather than 'strict': a member of staff following a link
 * from an email to an approval queue must arrive logged in, or they will find
 * a way to stay logged in that is worse. `secure` is off only in development,
 * where there is no TLS to be secure over.
 */
export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export interface ConsoleContext {
  principal: Principal;
  tenant: ResolvedTenant;
}

export { sessionServes };

/**
 * Resolve the request into a principal, or null.
 *
 * The host binding is `sessionServes` — see tenancy.ts for why a token that
 * verifies is still not a session for every address.
 *
 * Cached per request, so a layout and its page share one resolution.
 */
export const currentContext = cache(async (): Promise<ConsoleContext | null> => {
  const tenant = await currentTenant();
  if (!tenant) return null;

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const principal = await resolvePrincipal(token);
  if (!principal) return null;

  if (!sessionServes(principal, tenant)) return null;

  return { principal, tenant };
});

/** The signed-in user's display details, for the console header. */
export const currentUser = cache(
  async (): Promise<{ fullName: string; email: string } | null> => {
    const ctx = await currentContext();
    if (!ctx) return null;
    const { withTenant } = await import('@/lib/db/client');
    return withTenant(ctx.principal.tenantId, (tx) =>
      tx.user.findUnique({
        where: { id: ctx.principal.userId },
        select: { fullName: true, email: true },
      }),
    );
  },
);
