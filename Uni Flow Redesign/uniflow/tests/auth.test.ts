/**
 * Auth, RBAC and segregation of duties (plan §4.8).
 *
 * The legacy system had no roles at all — `Users` carried an Enable/Disable
 * flag and every authenticated user could open every screen, including
 * voucher approval. These tests establish the controls that replace it.
 */
import { afterAll, describe, expect, it } from 'vitest';
import {
  DEFAULT_ROLES,
  PERMISSIONS,
  PERMISSION_KEYS,
  SOD_CONFLICTS,
  assertNoSodViolation,
  findSodViolations,
  isPermissionKey,
  SodViolationError,
  type PermissionKey,
} from '@/lib/auth/permissions';
import {
  checkPasswordStrength,
  hashPassword,
  verifyPassword,
  WeakPasswordError,
} from '@/lib/auth/password';
import { createSessionToken, verifySessionToken } from '@/lib/auth/session';
import {
  ForbiddenError,
  MfaRequiredError,
  SelfApprovalError,
  assertNotSelfApproval,
  can,
  requirePermission,
  MFA_REQUIRED_PERMISSIONS,
  type Principal,
} from '@/lib/auth/rbac';
import { beginEnrolment, generateRecoveryCodes, verifyCode } from '@/lib/auth/mfa';
import { disconnectAll } from './helpers';

afterAll(async () => {
  await disconnectAll();
});

function principal(perms: PermissionKey[], mfaVerified = true): Principal {
  return {
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: '00000000-0000-0000-0000-000000000002',
    mfaVerified,
    permissions: new Set(perms),
  };
}

describe('permission catalogue', () => {
  it('has unique keys', () => {
    expect(new Set(PERMISSION_KEYS).size).toBe(PERMISSION_KEYS.length);
  });

  it('every key is dotted resource.action', () => {
    for (const p of PERMISSIONS) {
      expect(p.key).toMatch(/^[a-z]+\.[a-z]+$/);
      expect(p.description.length).toBeGreaterThan(10);
    }
  });

  it('recognises real keys and rejects invented ones', () => {
    expect(isPermissionKey('voucher.approve')).toBe(true);
    expect(isPermissionKey('voucher.yolo')).toBe(false);
  });

  it('every SoD conflict names real permissions', () => {
    for (const c of SOD_CONFLICTS) {
      expect(isPermissionKey(c.a)).toBe(true);
      expect(isPermissionKey(c.b)).toBe(true);
      expect(c.reason.length).toBeGreaterThan(20);
    }
  });

  it('every MFA-gated permission is a real permission', () => {
    for (const p of MFA_REQUIRED_PERMISSIONS) expect(isPermissionKey(p)).toBe(true);
  });
});

describe('segregation of duties', () => {
  it('blocks maker and checker on one role', () => {
    const v = findSodViolations(['voucher.create', 'voucher.approve']);
    expect(v).toHaveLength(1);
    expect(v[0].reason).toMatch(/maker-checker/i);
  });

  it('blocks fee-setting combined with discount approval', () => {
    expect(findSodViolations(['feematrix.manage', 'discount.approve'])).toHaveLength(1);
  });

  it('blocks vendor bank details combined with raising payments', () => {
    const v = findSodViolations(['vendor.manage', 'payment.create']);
    expect(v).toHaveLength(1);
    expect(v[0].reason).toMatch(/invoice-redirection/i);
  });

  it('blocks taking a payment and cancelling it', () => {
    expect(findSodViolations(['receipt.create', 'receipt.cancel'])).toHaveLength(1);
  });

  it('allows a clean combination', () => {
    expect(findSodViolations(['voucher.create', 'coa.read', 'report.financial'])).toHaveLength(0);
  });

  it('reports every conflict, not just the first', () => {
    const v = findSodViolations([
      'voucher.create',
      'voucher.approve',
      'po.create',
      'po.approve',
    ]);
    expect(v.length).toBeGreaterThanOrEqual(2);
  });

  it('throws with a reason a registrar can act on', () => {
    try {
      assertNoSodViolation(['voucher.create', 'voucher.approve']);
      throw new Error('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(SodViolationError);
      expect((e as Error).message).toMatch(/must not be the one who approves/i);
    }
  });

  it('EVERY shipped default role is SoD-clean', () => {
    // A shipped default that violates the matrix would be adopted by every
    // tenant, which is worse than any single bad role an admin might build.
    for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
      const violations = findSodViolations(def.permissions);
      expect(violations, `default role "${name}" is not SoD-clean`).toHaveLength(0);
    }
  });

  it('default roles only reference real permissions', () => {
    for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
      for (const p of def.permissions) {
        expect(isPermissionKey(p), `role "${name}" references unknown "${p}"`).toBe(true);
      }
    }
  });

  it('catches the combination that two clean roles produce together', () => {
    // Cashier and Cashier Supervisor are each clean; together they let one
    // person take a payment and cancel it. This is why the check has to run
    // against the person's union, not against each role.
    const union = [
      ...DEFAULT_ROLES['Cashier'].permissions,
      ...DEFAULT_ROLES['Cashier Supervisor'].permissions,
    ];
    expect(findSodViolations(union).length).toBeGreaterThan(0);
  });
});

describe('passwords', () => {
  it('rejects short passwords', () => {
    expect(checkPasswordStrength('Ab1')).toContainEqual(
      expect.stringMatching(/at least 12/),
    );
  });

  it('accepts a reasonable password', () => {
    expect(checkPasswordStrength('Khartoum2026Uni')).toHaveLength(0);
  });

  it('rejects leading or trailing whitespace', () => {
    expect(checkPasswordStrength('Khartoum2026Uni ')).toContainEqual(
      expect.stringMatching(/space/),
    );
  });

  it('hashes with argon2id and verifies', async () => {
    const h = await hashPassword('Khartoum2026Uni');
    expect(h.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword('Khartoum2026Uni', h)).toBe(true);
    expect(await verifyPassword('wrong-password-here', h)).toBe(false);
  });

  it('produces a different hash each time (salted)', async () => {
    const a = await hashPassword('Khartoum2026Uni');
    const b = await hashPassword('Khartoum2026Uni');
    expect(a).not.toBe(b);
    expect(await verifyPassword('Khartoum2026Uni', a)).toBe(true);
    expect(await verifyPassword('Khartoum2026Uni', b)).toBe(true);
  });

  it('refuses to hash a weak password rather than storing it', async () => {
    await expect(hashPassword('short')).rejects.toThrow(WeakPasswordError);
  });

  it('returns false on a corrupted hash instead of throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
    expect(await verifyPassword('anything', '')).toBe(false);
  });
});

describe('sessions', () => {
  it('round-trips claims', async () => {
    const { token, expiresAt } = await createSessionToken({
      tenantId: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      mfaVerified: true,
      version: 3,
    });
    const s = await verifySessionToken(token);
    expect(s).not.toBeNull();
    expect(s!.tenantId).toBe('11111111-1111-1111-1111-111111111111');
    expect(s!.mfaVerified).toBe(true);
    expect(s!.version).toBe(3);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects a tampered token', async () => {
    const { token } = await createSessionToken({
      tenantId: '11111111-1111-1111-1111-111111111111',
      userId: '22222222-2222-2222-2222-222222222222',
      mfaVerified: false,
      version: 1,
    });
    const [h, p, sig] = token.split('.');
    // Flip a bit in the payload, keep the signature.
    const forged = `${h}.${Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), mfaVerified: true }),
    ).toString('base64url')}.${sig}`;
    expect(await verifySessionToken(forged)).toBeNull();
  });

  it('rejects garbage and undefined', async () => {
    expect(await verifySessionToken(undefined)).toBeNull();
    expect(await verifySessionToken('not.a.token')).toBeNull();
  });
});

describe('authorization', () => {
  it('allows a held permission', () => {
    const p = principal(['voucher.read']);
    expect(can(p, 'voucher.read')).toBe(true);
    expect(() => requirePermission(p, 'voucher.read')).not.toThrow();
  });

  it('refuses one that is not held', () => {
    const p = principal(['voucher.read']);
    expect(can(p, 'voucher.approve')).toBe(false);
    expect(() => requirePermission(p, 'voucher.approve')).toThrow(ForbiddenError);
  });

  it('demands a second factor for approvals even when the permission is held', () => {
    const p = principal(['voucher.approve'], false);
    expect(() => requirePermission(p, 'voucher.approve')).toThrow(MfaRequiredError);
  });

  it('allows the same action once the session is MFA-verified', () => {
    const p = principal(['voucher.approve'], true);
    expect(() => requirePermission(p, 'voucher.approve')).not.toThrow();
  });

  it('does not demand a second factor for reading a report', () => {
    const p = principal(['report.financial'], false);
    expect(() => requirePermission(p, 'report.financial')).not.toThrow();
  });

  it('distinguishes "ask an administrator" from "enter your code"', () => {
    // Two different remedies, so two different errors.
    expect(() => requirePermission(principal([], false), 'voucher.approve')).toThrow(
      ForbiddenError,
    );
    expect(() =>
      requirePermission(principal(['voucher.approve'], false), 'voucher.approve'),
    ).toThrow(MfaRequiredError);
  });
});

describe('maker-checker at document level', () => {
  it('refuses to let the drafter approve their own voucher', () => {
    const p = principal(['voucher.approve']);
    expect(() => assertNotSelfApproval(p, p.userId, 'JV-2026-000042')).toThrow(
      SelfApprovalError,
    );
  });

  it('allows a different person to approve', () => {
    const p = principal(['voucher.approve']);
    expect(() =>
      assertNotSelfApproval(p, '00000000-0000-0000-0000-000000000099', 'JV-2026-000042'),
    ).not.toThrow();
  });

  it('names the document so the message is actionable', () => {
    const p = principal(['voucher.approve']);
    try {
      assertNotSelfApproval(p, p.userId, 'JV-2026-000042');
    } catch (e) {
      expect((e as Error).message).toContain('JV-2026-000042');
    }
  });
});

describe('second factor', () => {
  const UNI = 'Nile College';

  it('issues an enrolment secret and a scannable uri', () => {
    const e = beginEnrolment('cashier@nile.edu', UNI);
    expect(e.secret).toMatch(/^[A-Z2-7]+$/);
    expect(e.uri.startsWith('otpauth://totp/')).toBe(true);
    expect(e.uri).toContain('Nile%20College');
  });

  it('accepts a code generated from the secret', async () => {
    const e = beginEnrolment('cashier@nile.edu', UNI);
    const { TOTP, Secret } = await import('otpauth');
    const t = new TOTP({
      issuer: UNI,
      label: 'cashier@nile.edu',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: Secret.fromBase32(e.secret),
    });
    const r = verifyCode(e.secret, t.generate(), 'cashier@nile.edu', UNI);
    expect(r.valid).toBe(true);
    expect(typeof r.timeStep).toBe('number');
  });

  it('rejects a wrong code and malformed input', () => {
    const e = beginEnrolment('cashier@nile.edu', UNI);
    expect(verifyCode(e.secret, '000000', 'cashier@nile.edu', UNI).valid).toBe(false);
    expect(verifyCode(e.secret, 'abcdef', 'cashier@nile.edu', UNI).valid).toBe(false);
    expect(verifyCode(e.secret, '12345', 'cashier@nile.edu', UNI).valid).toBe(false);
  });

  it('issues distinct single-use recovery codes', () => {
    const codes = generateRecoveryCodes(10);
    expect(codes).toHaveLength(10);
    expect(new Set(codes).size).toBe(10);
    for (const c of codes) expect(c).toMatch(/^[a-z2-7]{5}-[a-z2-7]{5}$/);
  });
});
