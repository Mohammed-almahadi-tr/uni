import 'server-only';
import type { PermissionKey } from '@/lib/auth/permissions';
import { redirectLocalised } from './redirect';
import { ruleFor, safeNext, satisfies } from './navigation';
import { currentContext, type ConsoleContext } from './session';

/**
 * The console route guard (Track D1).
 *
 * Reads the **same** declaration the navigation renders from
 * (`CONSOLE_ROUTES`), so a menu item and its page cannot disagree about who
 * may see it. Hiding a control while leaving its route open is the shape of
 * access control that looks correct in a demonstration and is not one — and
 * the legacy build did not even hide: `Priv` was loaded at login and never
 * consulted, so every authenticated user could open every screen.
 *
 * This is a **convenience over** `requirePermission()`, not a replacement for
 * it. The permission that actually protects the money is the one checked in
 * the data access layer when the mutation runs; this stops a user reaching a
 * screen they have no business on, which is a different and lesser job. Every
 * D2-D5 screen still calls the module function that checks again.
 */

export type GuardResult =
  | { ok: true; ctx: ConsoleContext }
  | { ok: false; ctx: ConsoleContext; anyOf: readonly PermissionKey[] };

/**
 * Guard a console path.
 *
 * Redirects to the sign-in page when there is no usable session — which
 * includes a session belonging to a different university than the host
 * resolves to (see `currentContext`).
 *
 * An **undeclared** path is refused rather than served. A route
 * `CONSOLE_ROUTES` does not describe is a route for which nobody decided the
 * access rules, and the safe reading of that is no.
 */
export async function guardConsole(
  locale: string,
  path: string,
): Promise<GuardResult> {
  const ctx = await currentContext();
  if (!ctx) {
    // Carry where they were going, so signing in lands them there rather than
    // at the dashboard. Only a console path is ever carried, never an
    // arbitrary URL — an open redirect on a login form is how a phishing page
    // borrows a real domain.
    const next = path ? `/console/${path}` : '/console';
    redirectLocalised(locale, { pathname: '/login', query: { next } });
  }

  const rule = ruleFor(path);
  if (!rule) return { ok: false, ctx, anyOf: [] };

  return satisfies(ctx.principal.permissions, rule.anyOf)
    ? { ok: true, ctx }
    : { ok: false, ctx, anyOf: rule.anyOf };
}

/** Re-exported so a page guards and resolves its landing path from one
 *  import. The implementation is beside the route table it consults. */
export { safeNext };
