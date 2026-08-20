import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

/**
 * Locale negotiation.
 *
 * Note the filename: Next.js 16 renamed Middleware to Proxy. The behaviour is
 * unchanged, but a file called `middleware.ts` is no longer picked up.
 *
 * Auth is deliberately NOT enforced here. Next's own guidance is that Proxy
 * is for optimistic checks, not for session management or authorisation — it
 * runs before the request completes and cannot be the place a financial
 * system decides who may post a voucher. Authorisation lives in the data
 * access layer, via requirePermission().
 */
export default createMiddleware(routing);

export const config = {
  matcher: '/((?!api|_next|_vercel|.*\..*).*)',
};
