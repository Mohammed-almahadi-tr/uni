import 'server-only';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * Sessions (SRS REQ-NFR-05).
 *
 * A signed, short-lived token in a Secure/HttpOnly/SameSite cookie.
 *
 * What the token carries and what it does not: it carries identity (tenant,
 * user) and nothing else. Permissions are read from the database on every
 * request. Putting the permission set in the token would mean a revoked role
 * stays live until the token expires — for a financial system where the
 * response to suspected fraud is "remove their access now", that is the wrong
 * trade. The cost is a query per request, which is cheap next to the ledger
 * work each request already does.
 *
 * `mfaVerified` is in the token because it is a property of *this session*
 * rather than of the user, and it is what gates approvals above the tenant's
 * threshold.
 */

const ALG = 'HS256';
export const SESSION_COOKIE = 'uniflow_session';

/** Eight hours — one working day at a cashier desk, so a teller is not logged
 *  out mid-shift, and a session left open overnight is dead by morning. */
export const SESSION_TTL_SECONDS = 8 * 60 * 60;

export interface SessionClaims {
  /** Tenant the session belongs to. Every query made under it is scoped here. */
  tenantId: string;
  userId: string;
  /** Whether this session has completed a second factor. Not whether the user
   *  has MFA configured. */
  mfaVerified: boolean;
  /** Rotation counter — bumped when the user's roles change, so a live
   *  session picks up a revocation at its next check rather than at expiry. */
  version: number;
}

export interface Session extends SessionClaims {
  issuedAt: Date;
  expiresAt: Date;
}

function secret(): Uint8Array {
  const raw = process.env.SESSION_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      'SESSION_SECRET must be set to at least 32 characters. ' +
        'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))"',
    );
  }
  return new TextEncoder().encode(raw);
}

export async function createSessionToken(claims: SessionClaims): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + SESSION_TTL_SECONDS;

  const token = await new SignJWT({ ...claims } as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setIssuer('uniflow')
    .setAudience('uniflow-app')
    .sign(secret());

  return { token, expiresAt: new Date(exp * 1000) };
}

/**
 * Verify a token. Returns null for anything not currently valid — expired,
 * tampered, wrong issuer, malformed. The caller treats all of those the same
 * way (send them to the login screen), and distinguishing them in the return
 * type would only invite someone to leak the distinction to the client.
 */
export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: [ALG],
      issuer: 'uniflow',
      audience: 'uniflow-app',
    });

    const { tenantId, userId, mfaVerified, version, iat, exp } = payload as JWTPayload &
      Partial<SessionClaims>;

    if (typeof tenantId !== 'string' || typeof userId !== 'string') return null;

    return {
      tenantId,
      userId,
      mfaVerified: mfaVerified === true,
      version: typeof version === 'number' ? version : 0,
      issuedAt: new Date((iat ?? 0) * 1000),
      expiresAt: new Date((exp ?? 0) * 1000),
    };
  } catch {
    return null;
  }
}

/** Cookie attributes. `secure` is off only when not in production, because a
 *  Secure cookie will not be set over plain http and local development has no
 *  TLS. */
export function sessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}
