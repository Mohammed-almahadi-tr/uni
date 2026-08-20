/**
 * Audit trail (SRS REQ-ADM-03).
 *
 * An audit log that can be quietly edited is worse than none, because it
 * invites reliance. The legacy approval flow deleted the draft row on
 * approval, destroying the only record that a voucher had ever been reviewed;
 * nothing in that system could have told you it happened.
 *
 * These tests establish two things: the log physically rejects mutation, and
 * if someone with database access mutates it anyway, the chain says so and
 * points at where.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { audit, verifyChain, GENESIS_HASH } from '@/lib/audit/log';
import { asSystem, asTenant, makeTenant, disconnectAll } from './helpers';

afterAll(async () => {
  await disconnectAll();
});

describe('the chain', () => {
  it('starts at genesis and links each entry to its predecessor', async () => {
    const f = await makeTenant();

    const a = await asTenant(f.tenantId, (tx) =>
      audit(tx, f.tenantId, {
        actorId: f.userId,
        action: 'POST',
        resourceType: 'voucher',
        resourceId: 'v1',
        after: { amount: '100.00' },
      }),
    );
    const b = await asTenant(f.tenantId, (tx) =>
      audit(tx, f.tenantId, {
        actorId: f.userId,
        action: 'APPROVE',
        resourceType: 'voucher',
        resourceId: 'v1',
      }),
    );

    expect(a.seq).toBe(1n);
    expect(b.seq).toBe(2n);

    const entries = await asTenant(f.tenantId, (tx) =>
      tx.auditLog.findMany({ where: { tenantId: f.tenantId }, orderBy: { seq: 'asc' } }),
    );
    expect(entries[0].prevHash).toBe(GENESIS_HASH);
    expect(entries[1].prevHash).toBe(entries[0].hash);
  });

  it('verifies clean', async () => {
    const f = await makeTenant();
    for (let i = 0; i < 25; i += 1) {
      await asTenant(f.tenantId, (tx) =>
        audit(tx, f.tenantId, {
          actorId: f.userId,
          action: 'UPDATE',
          resourceType: 'student',
          resourceId: `s${i}`,
          before: { status: 'ACTIVE' },
          after: { status: 'DEFERRED' },
        }),
      );
    }
    const v = await asTenant(f.tenantId, (tx) => verifyChain(tx, f.tenantId, 10));
    expect(v.ok).toBe(true);
    expect(v.entriesChecked).toBe(25);
  });

  it('survives jsonb reordering the keys of a multi-key payload', async () => {
    // Regression. Postgres jsonb normalises object keys by length then
    // bytewise, so a payload written as {nameAr, nameEn, requiresCostCenter,
    // code} reads back as {code, nameAr, nameEn, requiresCostCenter}. Hashing
    // the raw JSON.stringify made the verifier report tampering on every
    // multi-key change — which is nearly every real change. The hash is now
    // taken over a canonical, key-sorted serialisation.
    const f = await makeTenant();
    await asTenant(f.tenantId, (tx) =>
      audit(tx, f.tenantId, {
        actorId: f.userId,
        action: 'UPDATE',
        resourceType: 'account',
        resourceId: 'a1',
        before: { nameAr: 'x', nameEn: 'y', requiresCostCenter: false, code: '51215' },
        after: { nameAr: 'x', nameEn: 'z', requiresCostCenter: true, code: '51215' },
      }),
    );

    const v = await asTenant(f.tenantId, (tx) => verifyChain(tx, f.tenantId));
    expect(v.ok, v.reason).toBe(true);
  });

  it('survives nested and array payloads', async () => {
    const f = await makeTenant();
    await asTenant(f.tenantId, (tx) =>
      audit(tx, f.tenantId, {
        actorId: f.userId,
        action: 'UPDATE',
        resourceType: 'role.permissions',
        resourceId: 'r1',
        before: { permissions: ['voucher.read', 'coa.read'], meta: { z: 1, a: 2 } },
        after: { meta: { a: 2, z: 3 }, permissions: ['coa.read', 'voucher.read'] },
      }),
    );
    const v = await asTenant(f.tenantId, (tx) => verifyChain(tx, f.tenantId));
    expect(v.ok, v.reason).toBe(true);
  });

  it('allocates sequences without forking under concurrent writes', async () => {
    const f = await makeTenant();
    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        asTenant(f.tenantId, (tx) =>
          audit(tx, f.tenantId, {
            actorId: f.userId,
            action: 'POST',
            resourceType: 'voucher',
            resourceId: `c${i}`,
          }),
        ),
      ),
    );
    // Without the advisory lock, concurrent writers read the same tail and
    // produce two entries claiming the same predecessor — a fork that the
    // verifier would report as tampering when it was only a race.
    const v = await asTenant(f.tenantId, (tx) => verifyChain(tx, f.tenantId));
    expect(v.ok).toBe(true);
    expect(v.entriesChecked).toBe(20);
  });
});

describe('the log is append-only', () => {
  it('rejects UPDATE, even from the owner role', async () => {
    const f = await makeTenant();
    await asTenant(f.tenantId, (tx) =>
      audit(tx, f.tenantId, { action: 'POST', resourceType: 'v', resourceId: 'x' }),
    );
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE audit_log SET resource_id = 'tampered' WHERE tenant_id = ${f.tenantId}::uuid`,
      ),
    ).rejects.toThrow(/append-only/i);
  });

  it('rejects DELETE, even from the owner role', async () => {
    const f = await makeTenant();
    await asTenant(f.tenantId, (tx) =>
      audit(tx, f.tenantId, { action: 'POST', resourceType: 'v', resourceId: 'x' }),
    );
    await expect(
      asSystem((tx) => tx.$executeRaw`DELETE FROM audit_log WHERE tenant_id = ${f.tenantId}::uuid`),
    ).rejects.toThrow(/append-only/i);
  });
});

describe('tampering is detected', () => {
  it('reports a removed entry as a sequence gap, at the right position', async () => {
    const f = await makeTenant();
    for (let i = 0; i < 5; i += 1) {
      await asTenant(f.tenantId, (tx) =>
        audit(tx, f.tenantId, { action: 'POST', resourceType: 'v', resourceId: `r${i}` }),
      );
    }

    // Simulate an attacker with enough access to disable triggers — the
    // scenario the hash chain exists for. The trigger stops casual edits; the
    // chain is what survives a determined one.
    await asSystem(async (tx) => {
      await tx.$executeRaw`ALTER TABLE audit_log DISABLE TRIGGER trg_audit_append_only`;
      await tx.$executeRaw`DELETE FROM audit_log WHERE tenant_id = ${f.tenantId}::uuid AND seq = 3`;
      await tx.$executeRaw`ALTER TABLE audit_log ENABLE TRIGGER trg_audit_append_only`;
    });

    const v = await asTenant(f.tenantId, (tx) => verifyChain(tx, f.tenantId));
    expect(v.ok).toBe(false);
    expect(v.brokenAtSeq).toBe(4n);
    expect(v.reason).toMatch(/sequence gap/i);
  });

  it('reports an altered entry as a content change', async () => {
    const f = await makeTenant();
    for (let i = 0; i < 4; i += 1) {
      await asTenant(f.tenantId, (tx) =>
        audit(tx, f.tenantId, {
          action: 'POST',
          resourceType: 'voucher',
          resourceId: `r${i}`,
          after: { amount: '100.00' },
        }),
      );
    }

    await asSystem(async (tx) => {
      await tx.$executeRaw`ALTER TABLE audit_log DISABLE TRIGGER trg_audit_append_only`;
      // Change the recorded amount but leave the stored hash alone — the
      // classic quiet edit.
      await tx.$executeRaw`
        UPDATE audit_log SET after_json = '{"amount":"1.00"}'::jsonb
         WHERE tenant_id = ${f.tenantId}::uuid AND seq = 2
      `;
      await tx.$executeRaw`ALTER TABLE audit_log ENABLE TRIGGER trg_audit_append_only`;
    });

    const v = await asTenant(f.tenantId, (tx) => verifyChain(tx, f.tenantId));
    expect(v.ok).toBe(false);
    expect(v.brokenAtSeq).toBe(2n);
    expect(v.reason).toMatch(/content altered/i);
  });
});
