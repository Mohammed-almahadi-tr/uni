import 'server-only';
import { headers } from 'next/headers';
import { currentSite } from '@/lib/cms/request';
import type { PublicSite } from '@/lib/cms/public';
import { localeOf, type Locale } from '@/components/site/chrome';
import { currentPortalAccount, selectStudent, type PortalPrincipal, type PortalStudent } from './guard';

/**
 * The three questions every portal page asks first (Track C3).
 *
 * Which university is this host, is anybody signed in, and which of their
 * students is this page about. Every page needs all three and none of them is
 * a judgement call, so they are resolved once here rather than eleven times
 * with eleven chances to get the third one wrong.
 *
 * It is not a layout, deliberately. A Next layout does not receive
 * `searchParams`, and the student a guardian is looking at travels in one —
 * so a layout could render the header for one child while the page below it
 * rendered the account of another. Every page calls this and passes the
 * answer down.
 */

export type PortalPageState =
  | { ok: false; reason: 'noSite'; host: string | null }
  | { ok: false; reason: 'signedOut' }
  | { ok: false; reason: 'noStudent' }
  | {
      ok: true;
      locale: Locale;
      site: PublicSite;
      principal: PortalPrincipal;
      /** The student this page is about — the one asked for, or the only one. */
      student: PortalStudent;
    };

export async function portalPage(
  rawLocale: string,
  studentId?: string | null,
): Promise<PortalPageState> {
  const site = await currentSite();
  if (!site) {
    const h = await headers();
    return {
      ok: false,
      reason: 'noSite',
      host: h.get('x-forwarded-host') ?? h.get('host'),
    };
  }

  const principal = await currentPortalAccount();
  if (!principal) return { ok: false, reason: 'signedOut' };

  // A `?student=` the account is not linked to is a 404, not a silent
  // fallback to one it is. Quietly showing a different child than the one
  // asked for is how somebody pays the wrong fee — and answering "not found"
  // rather than "not yours" is the same choice C2 makes about application
  // numbers, so the page cannot be used to learn which ids exist.
  let student: PortalStudent;
  try {
    student = selectStudent(principal, studentId);
  } catch {
    return { ok: false, reason: 'noStudent' };
  }

  return { ok: true, locale: localeOf(rawLocale), site, principal, student };
}
