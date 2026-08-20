import 'server-only';
import { Secret, TOTP } from 'otpauth';

/**
 * Second factor for financial approvals (SRS REQ-NFR-05).
 *
 * TOTP rather than SMS. SMS one-time codes depend on a mobile network that is
 * not reliable at these campuses and on a delivery cost per message; TOTP
 * works from an app that is already on the approver's phone and keeps working
 * when the network does not.
 *
 * Scope: this gates the actions in MFA_REQUIRED_PERMISSIONS — approving and
 * reversing vouchers, raising payments, closing periods, changing vendor bank
 * details, and editing roles. It is not required to log in and look at a
 * report, because a control people resent is a control people route around.
 */

const PERIOD_SECONDS = 30;
const DIGITS = 6;
/** One step either side. Accepts a code up to ~30s stale, which covers a
 *  phone whose clock has drifted and a user who typed slowly. Wider than this
 *  and a shoulder-surfed code stays usable too long. */
const WINDOW = 1;

function totp(secretBase32: string, accountLabel: string, issuer: string): TOTP {
  return new TOTP({
    issuer,
    label: accountLabel,
    algorithm: 'SHA1', // what authenticator apps universally implement
    digits: DIGITS,
    period: PERIOD_SECONDS,
    secret: Secret.fromBase32(secretBase32),
  });
}

export interface MfaEnrolment {
  /** Store on the user record. Encrypt at rest — it is a bearer credential. */
  secret: string;
  /** otpauth:// URI to render as a QR code. */
  uri: string;
}

/**
 * Begin enrolment. The secret is not active until a code generated from it has
 * been verified — otherwise a mistyped scan locks the user out of their own
 * approvals.
 */
export function beginEnrolment(userEmail: string, universityName: string): MfaEnrolment {
  const secret = new Secret({ size: 20 }); // 160-bit, per RFC 4226
  const t = totp(secret.base32, userEmail, universityName);
  return { secret: secret.base32, uri: t.toString() };
}

/**
 * Check a code.
 *
 * Returns the matched time step so the caller can store it and refuse to
 * accept the same step twice. Without that, a code remains valid for its
 * whole 30-second window and can be replayed by anyone who saw it — which,
 * for an approval screen at a shared desk, is a realistic way to lose the
 * control entirely.
 */
export function verifyCode(
  secretBase32: string,
  code: string,
  userEmail: string,
  universityName: string,
): { valid: boolean; timeStep?: number } {
  const cleaned = code.replace(/\s+/g, '');
  if (!/^\d{6}$/.test(cleaned)) return { valid: false };

  const t = totp(secretBase32, userEmail, universityName);
  const delta = t.validate({ token: cleaned, window: WINDOW });
  if (delta === null) return { valid: false };

  const currentStep = Math.floor(Date.now() / 1000 / PERIOD_SECONDS);
  return { valid: true, timeStep: currentStep + delta };
}

/**
 * Recovery codes, for the phone that was lost or reset.
 *
 * Single-use, and stored hashed exactly as passwords are — a recovery code is
 * a password that bypasses the second factor, and storing them in clear would
 * quietly undo the control.
 */
export function generateRecoveryCodes(count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const s = new Secret({ size: 10 }).base32.slice(0, 10).toLowerCase();
    codes.push(`${s.slice(0, 5)}-${s.slice(5, 10)}`);
  }
  return codes;
}
