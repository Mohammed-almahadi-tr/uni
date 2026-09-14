import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { publicSite, type PublicSite } from './public';
import { resolveTenantByHost, type ResolvedTenant } from './hosts';

/**
 * The tenant for the request being served (Track C1).
 *
 * Both helpers are wrapped in React's `cache`, so a page and its layout that
 * each ask for the site share one resolution and one database transaction per
 * request rather than one each.
 *
 * Reading `headers()` opts the route into dynamic rendering, which is correct
 * and not incidental: the response depends on the host, so there is no such
 * thing as a prerendered version of these pages. That is also why the locale
 * layout no longer declares `generateStaticParams`.
 *
 * `x-forwarded-host` is preferred over `host` because in every deployment
 * this product targets there is a proxy in front — Supabase, Vercel, or an
 * institution's own nginx — and `host` there is the internal address.
 */
export const currentTenant = cache(async (): Promise<ResolvedTenant | null> => {
  const h = await headers();
  return resolveTenantByHost(h.get('x-forwarded-host') ?? h.get('host'));
});

export const currentSite = cache(async (): Promise<PublicSite | null> => {
  const h = await headers();
  return publicSite(h.get('x-forwarded-host') ?? h.get('host'));
});
