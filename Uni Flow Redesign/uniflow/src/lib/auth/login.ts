import 'server-only';
import { withSystem, withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { dummyHash, verifyPassword } from './password';
import { createSessionToken, type Session, verifySessionToken } from './session';
import { loadPermissions, type Principal } from './rbac';
import { verifyCode } from './mfa';

/**
 * Login (SRS REQ-NFR-05).
 *
 * The legacy flow, for contrast: `frmLogin.vb` asked for a serial number,
 * looked up the full name from it and displayed it, then compared a cleartext
 * password in application code. Anyone could enumerate staff by typing serial
 * numbers, and the password never left the workstation as anything but plain
 * text.
 */

/** Failed attempts before the account is locked. */
const MAX_FAILED = 5;
/** How long the lock lasts. Long enough to make guessing pointless, short
 *  enough that a genuine user is not stuck waiting for an administrator. */
const LOCK_MINUTES = 15;

export type LoginResult =
  | { ok: true; token: string; expiresAt: Date; mfaRequired: boolean; userId: string }
  | { ok: false; reason: 'invalid' | 'locked' | 'inactive' };

/**
 * Authenticate.
 *
 * `reason` never distinguishes "no such account" from "wrong password" —
 * both are `invalid`. The timing does not distinguish them either: a missing
 * account still pays for one Argon2 verification against a dummy hash.
 * Without that, response time alone turns the login form into a staff
 * directory.
 */
export async function login(
  tenantId: string,
  email: string,
  password: string,
  ip?: string,
): Promise<LoginResult> {
  const normalised = email.trim().toLowerCase();

  const user = await withTenant(tenantId, (tx) =>
    tx.user.findUnique({
      where: { tenantId_email: { tenantId, email: normalised } },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        failedLoginCount: true,
        lockedUntil: true,
        sessionVersion: true,
        mfaSecret: true,
        mfaEnrolledAt: true,
      },
    }),
  );

  if (!user) {
    // Equalise timing against the no-such-account case.
    await verifyPassword(password, await dummyHash());
    return { ok: false, reason: 'invalid' };
  }

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, reason: 'locked' };
  }
  if (!user.isActive) {
    return { ok: false, reason: 'inactive' };
  }

  const valid = await verifyPassword(password, user.passwordHash);

  if (!valid) {
    const failed = user.failedLoginCount + 1;
    await withTenant(tenantId, (tx) =>
      tx.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: failed,
          lockedUntil:
            failed >= MAX_FAILED ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null,
        },
      }),
    );
    return { ok: false, reason: 'invalid' };
  }

  const mfaEnrolled = Boolean(user.mfaSecret && user.mfaEnrolledAt);

  const { token, expiresAt } = await createSessionToken({
    tenantId,
    userId: user.id,
    // A password alone never satisfies the second factor, even for a user who
    // has not enrolled. Enrolment is what MFA-gated actions demand; see
    // requirePermission.
    mfaVerified: false,
    version: user.sessionVersion,
  });

  await withTenant(tenantId, async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
    });
    await audit(tx, tenantId, {
      actorId: user.id,
      ip,
      action: 'LOGIN',
      resourceType: 'user',
      resourceId: user.id,
      after: { email: normalised, mfaEnrolled },
    });
  });

  return { ok: true, token, expiresAt, mfaRequired: mfaEnrolled, userId: user.id };
}

/**
 * Upgrade a session to mfaVerified by presenting a TOTP code.
 *
 * The accepted time step is recorded and a repeat of the same step refused,
 * so a code seen over someone's shoulder cannot be replayed within its
 * 30-second window.
 */
export async function verifyMfa(
  tenantId: string,
  userId: string,
  code: string,
  universityName: string,
): Promise<{ ok: boolean; token?: string; expiresAt?: Date; reason?: string }> {
  const user = await withTenant(tenantId, (tx) =>
    tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        email: true,
        mfaSecret: true,
        mfaEnrolledAt: true,
        mfaLastStep: true,
        sessionVersion: true,
      },
    }),
  );

  if (!user.mfaSecret || !user.mfaEnrolledAt) {
    return { ok: false, reason: 'not-enrolled' };
  }

  const result = verifyCode(user.mfaSecret, code, user.email, universityName);
  if (!result.valid || result.timeStep === undefined) {
    return { ok: false, reason: 'invalid-code' };
  }

  if (user.mfaLastStep !== null && BigInt(result.timeStep) <= user.mfaLastStep) {
    return { ok: false, reason: 'code-already-used' };
  }

  await withTenant(tenantId, (tx) =>
    tx.user.update({
      where: { id: userId },
      data: { mfaLastStep: BigInt(result.timeStep!) },
    }),
  );

  const { token, expiresAt } = await createSessionToken({
    tenantId,
    userId,
    mfaVerified: true,
    version: user.sessionVersion,
  });

  return { ok: true, token, expiresAt };
}

/**
 * Resolve a session token into a principal with live permissions.
 *
 * Returns null when the token is invalid, the user is gone or deactivated, or
 * the session version is stale. The version check is what makes revocation
 * immediate: bumping `sessionVersion` invalidates every live session for that
 * user at their next request, without waiting for the token to expire.
 */
export async function resolvePrincipal(token: string | undefined): Promise<Principal | null> {
  const session: Session | null = await verifySessionToken(token);
  if (!session) return null;

  return withTenant(session.tenantId, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: session.userId },
      select: { isActive: true, sessionVersion: true },
    });
    if (!user || !user.isActive || user.sessionVersion !== session.version) return null;

    return {
      tenantId: session.tenantId,
      userId: session.userId,
      mfaVerified: session.mfaVerified,
      permissions: await loadPermissions(tx, session.userId),
    };
  });
}

/**
 * Invalidate every live session for a user.
 *
 * Called on password reset, role change, and deactivation — the three cases
 * where a session that keeps working is a security hole rather than a
 * convenience.
 */
export async function revokeSessions(tenantId: string, userId: string): Promise<void> {
  await withTenant(tenantId, (tx) =>
    tx.user.update({
      where: { id: userId },
      data: { sessionVersion: { increment: 1 } },
    }),
  );
}

/** Resolve a tenant from its subdomain slug. Runs as owner: no tenant context
 *  exists yet, which is precisely what this call establishes. */
export async function resolveTenantBySlug(
  slug: string,
): Promise<{ id: string; nameEn: string; nameAr: string } | null> {
  return withSystem((tx) =>
    tx.tenant.findFirst({
      where: { slug, isActive: true },
      select: { id: true, nameEn: true, nameAr: true },
    }),
  );
}
