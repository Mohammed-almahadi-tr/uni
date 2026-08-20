/**
 * Auth against the real database (plan §4.8).
 *
 * tests/auth.test.ts covers the pure logic. This covers what only shows up
 * with a database behind it: lockout counters, session revocation, SoD
 * enforced at assignment time, and tenant isolation of the user table.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { login, resolvePrincipal, revokeSessions, verifyMfa } from '@/lib/auth/login';
import { createUser, provisionTenant, syncPermissions } from '@/lib/auth/provisioning';
import { assignRole, setRolePermissions, loadPermissions } from '@/lib/auth/rbac';
import { SodViolationError } from '@/lib/auth/permissions';
import { verifyChain } from '@/lib/audit/log';
import { asTenant, disconnectAll } from './helpers';

const PASSWORD = 'Khartoum2026Uni';
let t: Awaited<ReturnType<typeof provisionTenant>>;
let slug: string;

beforeAll(async () => {
  await syncPermissions();
  slug = `auth${Date.now().toString(36)}`;
  t = await provisionTenant({
    slug,
    nameEn: 'Nile College',
    nameAr: 'كلية النيل',
    admin: { email: 'admin@nile.edu', fullName: 'Ayman Admin', password: PASSWORD },
  });
});

afterAll(async () => {
  await disconnectAll();
});

describe('provisioning', () => {
  it('creates the tenant with all default roles', async () => {
    const roles = await asTenant(t.tenantId, (tx) => tx.role.findMany());
    expect(roles.length).toBeGreaterThanOrEqual(9);
    expect(roles.map((r) => r.name)).toContain('Cashier');
    // Arabic names survive the round trip — the reason the cluster is UTF8.
    expect(roles.find((r) => r.name === 'Cashier')!.nameAr).toBe('أمين الصندوق');
  });

  it('gives the admin their permissions', async () => {
    const perms = await asTenant(t.tenantId, (tx) => loadPermissions(tx, t.adminUserId));
    expect(perms.has('user.manage')).toBe(true);
    expect(perms.has('role.manage')).toBe(true);
    // The admin is not a financial approver by default.
    expect(perms.has('voucher.approve')).toBe(false);
  });

  it('writes an audit entry for the tenant creation', async () => {
    const v = await asTenant(t.tenantId, (tx) => verifyChain(tx, t.tenantId));
    expect(v.ok).toBe(true);
    expect(v.entriesChecked).toBeGreaterThan(0);
  });
});

describe('login', () => {
  it('succeeds with the right password', async () => {
    const r = await login(t.tenantId, 'admin@nile.edu', PASSWORD, '10.0.0.1');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.userId).toBe(t.adminUserId);
      // No MFA enrolled yet, so nothing further is demanded at login.
      expect(r.mfaRequired).toBe(false);
    }
  });

  it('is case-insensitive on email', async () => {
    const r = await login(t.tenantId, '  ADMIN@Nile.EDU  ', PASSWORD);
    expect(r.ok).toBe(true);
  });

  it('fails with the wrong password', async () => {
    const r = await login(t.tenantId, 'admin@nile.edu', 'wrong-password-x');
    expect(r).toEqual({ ok: false, reason: 'invalid' });
  });

  it('gives the same answer for a nonexistent account', async () => {
    // "invalid" either way. Distinguishing them would turn the login form
    // into a staff directory.
    const r = await login(t.tenantId, 'nobody@nile.edu', PASSWORD);
    expect(r).toEqual({ ok: false, reason: 'invalid' });
  });

  it('locks the account after repeated failures, then reports locked', async () => {
    const u = await createUser(
      t.tenantId,
      {
        email: 'lockme@nile.edu',
        fullName: 'Lock Me',
        password: PASSWORD,
        roleIds: [t.roleIds['Cashier']],
      },
      t.adminUserId,
    );

    for (let i = 0; i < 5; i += 1) {
      const r = await login(t.tenantId, 'lockme@nile.edu', 'wrong-password-x');
      expect(r.ok).toBe(false);
    }

    // Now even the CORRECT password is refused — that is the point of a lock.
    const r = await login(t.tenantId, 'lockme@nile.edu', PASSWORD);
    expect(r).toEqual({ ok: false, reason: 'locked' });

    const row = await asTenant(t.tenantId, (tx) =>
      tx.user.findUniqueOrThrow({
        where: { id: u.userId },
        select: { failedLoginCount: true, lockedUntil: true },
      }),
    );
    expect(row.failedLoginCount).toBe(5);
    expect(row.lockedUntil).not.toBeNull();
  });

  it('refuses a deactivated account', async () => {
    const u = await createUser(
      t.tenantId,
      {
        email: 'gone@nile.edu',
        fullName: 'Departed Staff',
        password: PASSWORD,
        roleIds: [],
      },
      t.adminUserId,
    );
    await asTenant(t.tenantId, (tx) =>
      tx.user.update({ where: { id: u.userId }, data: { isActive: false } }),
    );
    const r = await login(t.tenantId, 'gone@nile.edu', PASSWORD);
    expect(r).toEqual({ ok: false, reason: 'inactive' });
  });

  it('resets the failure counter on a successful login', async () => {
    const u = await createUser(
      t.tenantId,
      {
        email: 'reset@nile.edu',
        fullName: 'Reset Me',
        password: PASSWORD,
        roleIds: [],
      },
      t.adminUserId,
    );
    await login(t.tenantId, 'reset@nile.edu', 'wrong-password-x');
    await login(t.tenantId, 'reset@nile.edu', PASSWORD);
    const row = await asTenant(t.tenantId, (tx) =>
      tx.user.findUniqueOrThrow({
        where: { id: u.userId },
        select: { failedLoginCount: true, lastLoginAt: true },
      }),
    );
    expect(row.failedLoginCount).toBe(0);
    expect(row.lastLoginAt).not.toBeNull();
  });
});

describe('sessions resolve to live permissions', () => {
  it('resolves a principal carrying current permissions', async () => {
    const r = await login(t.tenantId, 'admin@nile.edu', PASSWORD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const p = await resolvePrincipal(r.token);
    expect(p).not.toBeNull();
    expect(p!.userId).toBe(t.adminUserId);
    expect(p!.permissions.has('user.manage')).toBe(true);
  });

  it('revocation invalidates a live session immediately', async () => {
    const u = await createUser(
      t.tenantId,
      {
        email: 'revoke@nile.edu',
        fullName: 'Revoke Me',
        password: PASSWORD,
        roleIds: [t.roleIds['Cashier']],
      },
      t.adminUserId,
    );
    const r = await login(t.tenantId, 'revoke@nile.edu', PASSWORD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(await resolvePrincipal(r.token)).not.toBeNull();

    await revokeSessions(t.tenantId, u.userId);

    // The token is still cryptographically valid and unexpired. It is refused
    // anyway, because the session version moved on. This is what makes
    // "remove their access now" mean now.
    expect(await resolvePrincipal(r.token)).toBeNull();
  });

  it('a permission removed from a role disappears without re-login', async () => {
    const u = await createUser(
      t.tenantId,
      {
        email: 'live@nile.edu',
        fullName: 'Live Perms',
        password: PASSWORD,
        roleIds: [],
      },
      t.adminUserId,
    );
    const role = await asTenant(t.tenantId, (tx) =>
      tx.role.create({
        data: { tenantId: t.tenantId, name: `Temp ${Date.now()}`, nameAr: 'مؤقت' },
        select: { id: true },
      }),
    );
    await setRolePermissions(t.tenantId, role.id, ['report.financial'], t.adminUserId);
    await assignRole(t.tenantId, u.userId, role.id, t.adminUserId);

    const r = await login(t.tenantId, 'live@nile.edu', PASSWORD);
    if (!r.ok) throw new Error('login failed');

    let p = await resolvePrincipal(r.token);
    expect(p!.permissions.has('report.financial')).toBe(true);

    await setRolePermissions(t.tenantId, role.id, [], t.adminUserId);

    // Same token, no re-login. Permissions are read per request, so this is
    // gone at once rather than at token expiry.
    p = await resolvePrincipal(r.token);
    expect(p!.permissions.has('report.financial')).toBe(false);
  });

  it('refuses a session for a deactivated user', async () => {
    const u = await createUser(
      t.tenantId,
      {
        email: 'deact@nile.edu',
        fullName: 'Deactivate Me',
        password: PASSWORD,
        roleIds: [],
      },
      t.adminUserId,
    );
    const r = await login(t.tenantId, 'deact@nile.edu', PASSWORD);
    if (!r.ok) throw new Error('login failed');
    await asTenant(t.tenantId, (tx) =>
      tx.user.update({ where: { id: u.userId }, data: { isActive: false } }),
    );
    expect(await resolvePrincipal(r.token)).toBeNull();
  });
});

describe('segregation of duties is enforced when roles are saved', () => {
  it('refuses a role holding both maker and checker', async () => {
    const role = await asTenant(t.tenantId, (tx) =>
      tx.role.create({
        data: { tenantId: t.tenantId, name: `Bad ${Date.now()}`, nameAr: 'سيئ' },
        select: { id: true },
      }),
    );
    await expect(
      setRolePermissions(
        t.tenantId,
        role.id,
        ['voucher.create', 'voucher.approve'],
        t.adminUserId,
      ),
    ).rejects.toThrow(SodViolationError);
  });

  it('refuses a SECOND role that conflicts with one the user already holds', async () => {
    // The case the per-role check cannot see. Cashier alone is fine; Cashier
    // Supervisor alone is fine; one person holding both can take a payment
    // and cancel it.
    const u = await createUser(
      t.tenantId,
      {
        email: 'both@nile.edu',
        fullName: 'Wants Both',
        password: PASSWORD,
        roleIds: [t.roleIds['Cashier']],
      },
      t.adminUserId,
    );
    await expect(
      assignRole(t.tenantId, u.userId, t.roleIds['Cashier Supervisor'], t.adminUserId),
    ).rejects.toThrow(SodViolationError);
  });

  it('refuses to create a user with a conflicting pair of roles up front', async () => {
    await expect(
      createUser(
        t.tenantId,
        {
          email: 'conflict@nile.edu',
          fullName: 'Conflicted',
          password: PASSWORD,
          roleIds: [t.roleIds['Cashier'], t.roleIds['Cashier Supervisor']],
        },
        t.adminUserId,
      ),
    ).rejects.toThrow(SodViolationError);
  });

  it('allows a non-conflicting second role', async () => {
    const u = await createUser(
      t.tenantId,
      {
        email: 'fine@nile.edu',
        fullName: 'No Conflict',
        password: PASSWORD,
        roleIds: [t.roleIds['Cashier']],
      },
      t.adminUserId,
    );
    await expect(
      assignRole(t.tenantId, u.userId, t.roleIds['Dean'], t.adminUserId),
    ).resolves.not.toThrow();
  });
});

describe('second factor end to end', () => {
  it('upgrades a session to mfaVerified and refuses a replayed code', async () => {
    const u = await createUser(
      t.tenantId,
      {
        email: 'mfa@nile.edu',
        fullName: 'MFA User',
        password: PASSWORD,
        roleIds: [t.roleIds['Financial Controller']],
      },
      t.adminUserId,
    );

    const { beginEnrolment } = await import('@/lib/auth/mfa');
    const enrol = beginEnrolment('mfa@nile.edu', 'Nile College');
    await asTenant(t.tenantId, (tx) =>
      tx.user.update({
        where: { id: u.userId },
        data: { mfaSecret: enrol.secret, mfaEnrolledAt: new Date() },
      }),
    );

    const r = await login(t.tenantId, 'mfa@nile.edu', PASSWORD);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mfaRequired).toBe(true);

    // Password alone never satisfies the second factor.
    const beforeMfa = await resolvePrincipal(r.token);
    expect(beforeMfa!.mfaVerified).toBe(false);

    const { TOTP, Secret } = await import('otpauth');
    const totp = new TOTP({
      issuer: 'Nile College',
      label: 'mfa@nile.edu',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(enrol.secret),
    });
    const code = totp.generate();

    const ok = await verifyMfa(t.tenantId, u.userId, code, 'Nile College');
    expect(ok.ok).toBe(true);

    const afterMfa = await resolvePrincipal(ok.token!);
    expect(afterMfa!.mfaVerified).toBe(true);

    // Same code again inside its 30-second window: refused. Without this, a
    // code read over someone's shoulder at a shared approval desk stays usable.
    const replay = await verifyMfa(t.tenantId, u.userId, code, 'Nile College');
    expect(replay.ok).toBe(false);
    expect(replay.reason).toBe('code-already-used');
  });

  it('refuses a code for a user who has not enrolled', async () => {
    const r = await verifyMfa(t.tenantId, t.adminUserId, '123456', 'Nile College');
    expect(r).toEqual({ ok: false, reason: 'not-enrolled' });
  });
});

describe('users are tenant-isolated', () => {
  it('a second tenant cannot see or authenticate the first tenant users', async () => {
    const other = await provisionTenant({
      slug: `other${Date.now().toString(36)}`,
      nameEn: 'Ribat University',
      nameAr: 'جامعة الرباط',
      admin: { email: 'admin@ribat.edu', fullName: 'Other Admin', password: PASSWORD },
    });

    // Same email, other tenant: no such user here.
    const r = await login(other.tenantId, 'admin@nile.edu', PASSWORD);
    expect(r).toEqual({ ok: false, reason: 'invalid' });

    const visible = await asTenant(other.tenantId, (tx) =>
      tx.user.findMany({ select: { email: true } }),
    );
    expect(visible.map((u) => u.email)).not.toContain('admin@nile.edu');
  });
});
