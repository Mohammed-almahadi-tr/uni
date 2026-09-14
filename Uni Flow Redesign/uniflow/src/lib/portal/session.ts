import 'server-only';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

/**
 * The student and guardian session (SRS REQ-LP-05, Track C3).
 *
 * A sibling of `lib/auth/session.ts` and deliberately not a reuse of it. The
 * two differ in three ways, and each difference is the point:
 *
 * ## 1. A different audience, so the tokens are not interchangeable
 *
 * A staff token is signed `aud: uniflow-app`; a portal token `aud:
 * uniflow-portal`. The verifiers demand their own, so a portal token
 * presented at the console is refused before anything looks up a user, and a
 * console token presented at the portal is refused before anything looks up
 * an account. Sharing the signing secret between two populations without
 * separating the audience is how one of them ends up holding the other's
 * capabilities.
 *
 * ## 2. A different cookie
 *
 * `uniflow_portal`, not `uniflow_session`. A member of staff who is also a
 * parent — common at a university — can be signed into both at once without
 * either logging the other out. Sharing one cookie name would mean signing in
 * as a parent silently signs you out of the desk you are working at.
 *
 * ## 3. A shorter life
 *
 * Eight hours is a cashier's shift, and a cashier is at their own desk. A
 * student is on a telephone that is often shared and frequently borrowed, and
 * a browser left open in a computer lab is the ordinary case rather than the
 * exceptional one. Two hours.
 *
 * What the token carries is identity and nothing else — no student id and no
 * list of the children a guardian may read. Those are looked up per request
 * from `portal_access`, so a grant revoked at the registry desk this morning
 * is not still live in somebody's pocket until teatime. The same trade
 * `lib/auth/session.ts` makes for permissions, for the same reason.
 */

const ALG = 'HS256';
export const PORTAL_COOKIE = 'uniflow_portal';
export const PORTAL_AUDIENCE = 'uniflow-portal';

/** Two hours. See above. */
export const PORTAL_TTL_SECONDS = 2 * 60 * 60;

export interface PortalClaims {
  tenantId: string;
  accountId: string;
  /** Rotation counter, bumped when access is revoked or the password changes,
   *  so a live session is refused at its next request rather than at expiry. */
  version: number;
}

export interface PortalSession extends PortalClaims {
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

export async function createPortalToken(
  claims: PortalClaims,
): Promise<{ token: string; expiresAt: Date }> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + PORTAL_TTL_SECONDS;

  const token = await new SignJWT({ ...claims } as unknown as JWTPayload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setIssuer('uniflow')
    .setAudience(PORTAL_AUDIENCE)
    .sign(secret());

  return { token, expiresAt: new Date(exp * 1000) };
}

/**
 * Verify a portal token. Null for anything not currently valid — expired,
 * tampered, wrong audience, malformed — because the caller does the same
 * thing with all of them and telling them apart only invites leaking the
 * distinction to the client.
 */
export async function verifyPortalToken(
  token: string | undefined,
): Promise<PortalSession | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: [ALG],
      issuer: 'uniflow',
      audience: PORTAL_AUDIENCE,
    });

    const { tenantId, accountId, version, iat, exp } = payload as JWTPayload &
      Partial<PortalClaims>;

    if (typeof tenantId !== 'string' || typeof accountId !== 'string') return null;

    return {
      tenantId,
      accountId,
      version: typeof version === 'number' ? version : 0,
      issuedAt: new Date((iat ?? 0) * 1000),
      expiresAt: new Date((exp ?? 0) * 1000),
    };
  } catch {
    return null;
  }
}

export function portalCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt,
  };
}
