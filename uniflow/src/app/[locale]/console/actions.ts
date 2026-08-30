'use server';

import { getLocale } from 'next-intl/server';
import { clearSessionCookie } from '@/lib/console/session';
import { redirectLocalised } from '@/lib/console/redirect';

/**
 * Sign out (Track D1).
 *
 * Clears the cookie and nothing else. It deliberately does **not** bump
 * `sessionVersion`: that is the revocation lever, used when roles change or
 * an account is disabled, and it invalidates every session that user has
 * anywhere. Signing out of one browser should not log the same person out of
 * the cashier's terminal they left running down the corridor — those are
 * different acts and conflating them makes the real revocation less likely to
 * be used, because it looks like an ordinary button.
 */
export async function signOut(): Promise<void> {
  await clearSessionCookie();
  redirectLocalised(await getLocale(), '/login');
}
