'use server';

import { currentTenant } from '@/lib/cms/request';
import { WeakPasswordError } from '@/lib/auth/password';
import {
  acceptInvitation,
  PortalAccountError,
  previewInvitation,
  type InvitationPreview,
} from '@/lib/portal/account';
import { setPortalCookie } from '../login/actions';

/**
 * Turning an invitation into an account (Track C3).
 *
 * ## Why the code is posted rather than put in a link
 *
 * The obvious design is an emailed URL — `/portal/activate/<code>` — and it
 * is the wrong one for the same reason C2's tracking token is posted rather
 * than linked: a secret in a path is a secret in the browser's history, in
 * the `Referer` header of every request the page then makes, and in whatever
 * access log sits in front of the application. This code is worth more than a
 * tracking token, because what it mints reads a student's money for as long
 * as the account lives.
 *
 * It also has to survive being read out over a telephone and typed at home,
 * which a URL does not.
 *
 * ## One answer for four failures
 *
 * Unknown, expired, withdrawn and already accepted all return the same thing.
 * The differences are exactly what somebody guessing codes wants to learn.
 */

export interface ActivateState {
  step: 'code' | 'password';
  preview: InvitationPreview | null;
  /** The code is held across the two steps in the form's own state rather
   *  than in a cookie: it is a one-time secret, and putting it anywhere
   *  durable is the thing this flow is avoiding. */
  code: string;
  error: string | null;
  /** Password policy failures, in the words the policy uses. */
  problems: string[];
  ok: boolean;
}

export const blankActivate: ActivateState = {
  step: 'code',
  preview: null,
  code: '',
  error: null,
  problems: [],
  ok: false,
};

const field = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === 'string' ? v.trim() : '';
};

export async function submitActivation(
  prev: ActivateState,
  form: FormData,
): Promise<ActivateState> {
  const tenant = await currentTenant();
  if (!tenant) return { ...blankActivate, error: 'noSite' };

  const code = field(form, 'code') || prev.code;

  // Step one: does this code mean anything?
  if (field(form, 'stage') === 'code' || !prev.preview) {
    const preview = await previewInvitation(tenant.tenantId, code);
    if (!preview) return { ...blankActivate, error: 'badCode' };
    return { ...blankActivate, step: 'password', preview, code };
  }

  // Step two: set — or prove — the password.
  const password = form.get('password');
  const confirm = form.get('confirm');
  if (typeof password !== 'string' || password.length === 0) {
    return { ...prev, error: 'needPassword' };
  }
  // Only when creating an account. Confirming a password the holder already
  // knows would be asking them to type it twice for no reason.
  if (!prev.preview.accountExists && password !== confirm) {
    return { ...prev, error: 'mismatch' };
  }

  try {
    const result = await acceptInvitation(tenant.tenantId, code, password);
    await setPortalCookie(result.token);
    return { ...prev, error: null, problems: [], ok: true };
  } catch (e) {
    if (e instanceof WeakPasswordError) {
      return { ...prev, error: 'weak', problems: e.problems };
    }
    if (e instanceof PortalAccountError) {
      // The library's message here is the useful one — it distinguishes "that
      // code is not valid" from "an account exists at this address, enter its
      // password" — and both are things the person in front of the form needs
      // to be able to act on.
      return { ...prev, error: 'rejected', problems: [e.message] };
    }
    console.error('[portal/activate]', e);
    return { ...prev, error: 'failed' };
  }
}
