'use server';

import { currentTenant } from '@/lib/cms/request';
import { WeakPasswordError } from '@/lib/auth/password';
import { currentPortalAccount } from '@/lib/portal/guard';
import { changePortalPassword, PortalAccountError } from '@/lib/portal/account';
import { setPortalCookie, portalSignOut } from '../login/actions';

/**
 * Changing a portal password, and signing out (Track C3).
 *
 * The current password is asked for even though the person is already signed
 * in, because the threat here is a borrowed telephone with a live session on
 * it — not a stranger with none. Changing the password bumps the account's
 * session version, which kills **every** session including the one making the
 * request, so a fresh token is issued and the cookie replaced. Without that,
 * changing your password would log you out of the device you were changing it
 * on, which teaches people not to.
 */

export interface PasswordState {
  ok: boolean;
  error: 'noSite' | 'signedOut' | 'mismatch' | 'weak' | 'rejected' | 'failed' | null;
  problems: string[];
}

export const blankPassword: PasswordState = { ok: false, error: null, problems: [] };

const field = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

export async function changePassword(
  _prev: PasswordState,
  form: FormData,
): Promise<PasswordState> {
  const tenant = await currentTenant();
  if (!tenant) return { ...blankPassword, error: 'noSite' };

  const principal = await currentPortalAccount();
  if (!principal) return { ...blankPassword, error: 'signedOut' };

  const next = field(form, 'password');
  if (next !== field(form, 'confirm')) {
    return { ...blankPassword, error: 'mismatch' };
  }

  try {
    const { token } = await changePortalPassword(
      principal.tenantId,
      principal.accountId,
      field(form, 'current'),
      next,
    );
    await setPortalCookie(token);
    return { ok: true, error: null, problems: [] };
  } catch (e) {
    if (e instanceof WeakPasswordError) {
      return { ok: false, error: 'weak', problems: e.problems };
    }
    if (e instanceof PortalAccountError) {
      return { ok: false, error: 'rejected', problems: [e.message] };
    }
    console.error('[portal/settings]', e);
    return { ...blankPassword, error: 'failed' };
  }
}

export async function signOut(): Promise<void> {
  await portalSignOut();
}
