import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';

/**
 * The colour-scheme preference (presentation only).
 *
 * Stored in a cookie so the very first render of a request knows the choice
 * and the page paints cleanly without flash.
 *
 * Nothing outside the interface reads any of this. No permission, posting rule,
 * period lock or printed document changes because somebody prefers dark.
 */

export type Theme = 'system' | 'light' | 'dark';

export const THEME_COOKIE = 'uniflow_theme';

/** A year: the preference is not a session, and re-picking it every morning is
 *  how a preference stops being used. */
const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

const THEMES: readonly Theme[] = ['system', 'light', 'dark'];

export const isTheme = (v: unknown): v is Theme =>
  typeof v === 'string' && (THEMES as readonly string[]).includes(v);

/**
 * What this request should render in.
 *
 * Cached per request so the layout and the toggle inside it resolve once.
 */
export const currentTheme = cache(async (): Promise<Theme> => {
  const raw = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(raw) ? raw : 'system';
});

/**
 * Record a choice.
 *
 * The cookie is always written — works for authenticated staff, students,
 * and unauthenticated public visitors.
 */
export async function saveTheme(theme: Theme): Promise<void> {
  const jar = await cookies();
  jar.set(THEME_COOKIE, theme, {
    httpOnly: false,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: THEME_COOKIE_MAX_AGE,
  });
}
