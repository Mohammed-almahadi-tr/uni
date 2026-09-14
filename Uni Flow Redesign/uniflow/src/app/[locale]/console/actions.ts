'use server';

import { getLocale } from 'next-intl/server';
import { clearSessionCookie } from '@/lib/console/session';
import { redirectLocalised } from '@/lib/console/redirect';
import { isTheme, saveTheme, type Theme } from '@/lib/console/theme';

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

/**
 * Record the colour-scheme preference (presentation only).
 *
 * An action rather than a client-side store because the preference lives on the
 * user's row, so it follows them to the next device. It touches nothing else:
 * no permission is consulted beyond having a session, and there is no session
 * to write to when there isn't one — `saveTheme` degrades to the cookie.
 */
export async function setTheme(theme: Theme): Promise<void> {
  if (!isTheme(theme)) return;
  await saveTheme(theme);
}
