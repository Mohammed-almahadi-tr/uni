'use server';

import { login, verifyMfa } from '@/lib/auth/login';
import { currentTenant } from '@/lib/cms/request';
import { currentContext, setSessionCookie } from '@/lib/console/session';
import { safeNext } from '@/lib/console/guard';

/**
 * Sign-in (Track D1).
 *
 * ## What this replaces
 *
 * ```vb
 * Dim cmd As New SqlCommand(
 *   "Select PWD,Priv From Users Where UserName=N'" & Me.txtUserName.Text & "'", cnn)
 * ...
 * If Pass = CStr(Me.txtPass.Text) Then
 * ```
 * ([frmLogin.vb:44-51](Nile%20College%20System%20-%20Ribat%20Univ/Rebat%20University%20Application/Form/frmLogin.vb#L44-L51))
 *
 * The username is concatenated straight into SQL on the one form that is
 * reachable without credentials, and the password is compared in application
 * code against a column holding it in clear. The Nile build adds a
 * `Select FullName From Users Where SNo=` on the serial-number field's
 * `Leave` event, so tabbing through the form enumerates staff by name before
 * anyone has authenticated.
 *
 * ## Here
 *
 * The tenant comes from the **host**, never from the form. Argon2id verifies
 * the hash, a missing account still pays for one verification so response
 * time is not a staff directory, and `reason` never distinguishes "no such
 * account" from "wrong password" — all of that is in `lib/auth/login.ts`
 * from Phase 0. This action is the transport: it puts the returned token in
 * an HttpOnly cookie and decides where to send the browser.
 */

export interface SignInState {
  ok: boolean;
  /** A message key under `console.signIn`, never a sentence — the client
   *  renders it, so the failure is bilingual like the rest of the page. */
  error: 'invalid' | 'locked' | 'inactive' | 'noSite' | null;
  /** Set when the account has an authenticator enrolled and the session is
   *  therefore only half-established. */
  mfaRequired?: boolean;
  next?: string;
}

const field = (form: FormData, key: string): string => {
  const v = form.get(key);
  return typeof v === 'string' ? v : '';
};

export async function signIn(_prev: SignInState, form: FormData): Promise<SignInState> {
  const tenant = await currentTenant();
  if (!tenant) return { ok: false, error: 'noSite' };

  const next = safeNext(field(form, 'next'));

  const result = await login(tenant.tenantId, field(form, 'email'), field(form, 'password'));
  if (!result.ok) return { ok: false, error: result.reason };

  await setSessionCookie(result.token);
  return { ok: true, error: null, mfaRequired: result.mfaRequired, next };
}

export interface MfaState {
  ok: boolean;
  error: 'invalid' | 'replayed' | 'notEnrolled' | 'noSite' | null;
  next?: string;
}

/**
 * Raise the current session to `mfaVerified`.
 *
 * The session already exists — a password alone establishes it — so this is a
 * step-up rather than a second half of the login. That matters for what the
 * user can do while they are here: everything except the actions in
 * `MFA_REQUIRED_PERMISSIONS`, which is why the form offers to continue
 * without verifying. A control people resent is a control people route
 * around.
 */
export async function submitMfa(_prev: MfaState, form: FormData): Promise<MfaState> {
  const ctx = await currentContext();
  if (!ctx) return { ok: false, error: 'noSite' };

  const next = safeNext(field(form, 'next'));

  const result = await verifyMfa(
    ctx.principal.tenantId,
    ctx.principal.userId,
    field(form, 'code'),
    ctx.tenant.nameEn,
  );

  if (!result.ok || !result.token) {
    const error =
      result.reason === 'code-already-used'
        ? 'replayed'
        : result.reason === 'not-enrolled'
          ? 'notEnrolled'
          : 'invalid';
    return { ok: false, error };
  }

  await setSessionCookie(result.token);
  return { ok: true, error: null, next };
}
