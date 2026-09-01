'use server';

import { currentTenant } from '@/lib/cms/request';
import { trackApplication, type TrackedApplication } from '@/lib/admissions/portal';

/**
 * Checking an application (SRS REQ-LP-04, Track C2).
 *
 * ## Why this is a server action and not a link
 *
 * The tracking token is a secret. A page reached at
 * `/apply/status?no=X&token=Y` puts it in the browser's history, in the
 * `Referer` header of every request the page then makes, and in whatever
 * access log sits in front of the application. So the pair is **posted**, the
 * result is rendered in place, and nothing about the application appears in a
 * URL.
 *
 * ## One answer for two failures
 *
 * A wrong number and a wrong token return the same "not found". The
 * difference between them is exactly what an enumeration attack needs: told
 * which half was wrong, an attacker walks the sequential application numbers
 * until one says "wrong token" and knows that application exists.
 */

export interface StatusState {
  application: TrackedApplication | null;
  /** A catalogue key the client renders, so the failure is bilingual. */
  errorKey: string | null;
  /** Whether a lookup has been attempted at all — an empty form is not a miss. */
  searched: boolean;
}

export const blankStatusState: StatusState = {
  application: null,
  errorKey: null,
  searched: false,
};

export async function lookupApplication(
  _prev: StatusState,
  form: FormData,
): Promise<StatusState> {
  const tenant = await currentTenant();
  if (!tenant) return { ...blankStatusState, errorKey: 'noSite', searched: true };

  const value = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' ? v.trim() : '';
  };

  try {
    const application = await trackApplication(
      tenant.tenantId,
      value('applicationNo'),
      value('trackingToken'),
    );
    if (!application) {
      return { ...blankStatusState, errorKey: 'notFound', searched: true };
    }
    return { application, errorKey: null, searched: true };
  } catch (e) {
    console.error('[apply/status]', e);
    return { ...blankStatusState, errorKey: 'failed', searched: true };
  }
}
