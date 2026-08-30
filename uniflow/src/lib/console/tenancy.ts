import type { Principal } from '@/lib/auth/rbac';
import type { ResolvedTenant } from '@/lib/cms/hosts';

/**
 * Does this session belong to the university whose address the request
 * arrived on? (Track D1.)
 *
 * **The session is bound to the host.** A token issued for one university is
 * refused on another university's address, even though it verifies and its
 * user is live. Without that rule a platform operator holding an account at
 * one tenant would carry it onto every other tenant's console, and the cookie
 * — scoped to a domain the browser is happy to send — would do it silently.
 * The tenant a request is *for* comes from the host, exactly as it does on
 * the public site; the tenant a session is *from* comes from the token; and
 * they must agree.
 *
 * It lives here, apart from `session.ts`, because it is a rule rather than
 * transport: nothing about it needs a cookie jar or a request, so it can be
 * asserted directly against two real tenants instead of only through a
 * rendered page. Both imports are type-only and erase at compile time.
 */
export function sessionServes(
  principal: Pick<Principal, 'tenantId'>,
  tenant: Pick<ResolvedTenant, 'tenantId'>,
): boolean {
  return principal.tenantId === tenant.tenantId;
}
