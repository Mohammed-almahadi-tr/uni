import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { currentContext } from './session';

/**
 * The colour-scheme preference (presentation only).
 *
 * Two stores, deliberately, and they are not redundant:
 *
 * - The **user row** is the record. It is what makes the choice follow a member
 *   of staff from the cashier terminal to their own laptop, which a browser
 *   store cannot do.
 * - The **cookie** is a cache of that record, so the very first render of a
 *   request already knows the answer and the page does not paint light and then
 *   repaint dark. It is also what carries the preference on the public pages,
 *   where there is no session to read.
 *
 * The row wins whenever they disagree, which is exactly the case that matters:
 * a device that has never seen this user has no cookie, so the first authenticated
 * render reads the row and writes the cookie back.
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

/** Database enum ↔ the lower-case value the interface and the cookie use. */
const fromRow = (v: 'SYSTEM' | 'LIGHT' | 'DARK'): Theme =>
  v === 'DARK' ? 'dark' : v === 'LIGHT' ? 'light' : 'system';

const toRow = (v: Theme): 'SYSTEM' | 'LIGHT' | 'DARK' =>
  v === 'dark' ? 'DARK' : v === 'light' ? 'LIGHT' : 'SYSTEM';

/**
 * What this request should render in.
 *
 * Cached per request so the layout and the toggle inside it resolve once.
 */
export const currentTheme = cache(async (): Promise<Theme> => {
  const ctx = await currentContext();

  if (ctx) {
    const { withTenant } = await import('@/lib/db/client');
    const row = await withTenant(ctx.principal.tenantId, (tx) =>
      tx.user.findUnique({
        where: { id: ctx.principal.userId },
        select: { themePreference: true },
      }),
    );
    if (row) return fromRow(row.themePreference);
  }

  const raw = (await cookies()).get(THEME_COOKIE)?.value;
  return isTheme(raw) ? raw : 'system';
});

/**
 * Record a choice.
 *
 * The cookie is always written — an unauthenticated visitor on the public site
 * still gets their choice honoured for the rest of the visit. The row is written
 * only when there is a session to attach it to.
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

  const ctx = await currentContext();
  if (!ctx) return;

  const { withTenant } = await import('@/lib/db/client');
  await withTenant(ctx.principal.tenantId, (tx) =>
    tx.user.update({
      where: { id: ctx.principal.userId },
      data: { themePreference: toRow(theme) },
    }),
  );
}
