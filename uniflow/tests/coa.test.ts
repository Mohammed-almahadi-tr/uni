/**
 * Chart of accounts (Track A1, SRS REQ-FIN-01).
 *
 * The legacy chart was five denormalised text columns with no codes and no
 * parent keys, and its tree was rebuilt by five nested cursors on five
 * connections. These tests pin the structure that replaces it, and the rules
 * that stop it degenerating back.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  AccountValidationError,
  createAccount,
  deactivateAccount,
  flatten,
  loadTree,
  updateAccount,
} from '@/lib/coa/tree';
import {
  DEFAULT_COST_CENTERS,
  installChartOfAccounts,
  UNIVERSITY_COA,
  walkTemplate,
} from '@/lib/coa/template';
import { provisionTenant, syncPermissions } from '@/lib/auth/provisioning';
import { loadPermissions } from '@/lib/auth/rbac';
import { ForbiddenError } from '@/lib/auth/rbac';
import { post } from '@/lib/ledger/posting';
import { verifyChain } from '@/lib/audit/log';
import { asSystem, asTenant, disconnectAll } from './helpers';
import type { Principal } from '@/lib/auth/rbac';

let tenantId: string;
let accountant: Principal;
let cashier: Principal;

beforeAll(async () => {
  await syncPermissions();
  const t = await provisionTenant({
    slug: `coa${Date.now().toString(36)}`,
    nameEn: 'COA Test University',
    nameAr: 'جامعة اختبار الدليل',
    admin: { email: 'admin@coa.test', fullName: 'Admin', password: 'Khartoum2026Uni' },
  });
  tenantId = t.tenantId;

  await installChartOfAccounts(tenantId, t.adminUserId);

  const senior = await asTenant(tenantId, async (tx) => {
    const u = await tx.user.create({
      data: {
        tenantId,
        email: 'acct@coa.test',
        fullName: 'Senior Accountant',
        passwordHash: 'x',
      },
      select: { id: true },
    });
    await tx.userRole.create({
      data: { userId: u.id, roleId: t.roleIds['Senior Accountant'] },
    });
    return { id: u.id, perms: await loadPermissions(tx, u.id) };
  });
  accountant = {
    tenantId,
    userId: senior.id,
    mfaVerified: true,
    permissions: senior.perms,
  };

  const till = await asTenant(tenantId, async (tx) => {
    const u = await tx.user.create({
      data: { tenantId, email: 'till@coa.test', fullName: 'Cashier', passwordHash: 'x' },
      select: { id: true },
    });
    await tx.userRole.create({ data: { userId: u.id, roleId: t.roleIds['Cashier'] } });
    return { id: u.id, perms: await loadPermissions(tx, u.id) };
  });
  cashier = { tenantId, userId: till.id, mfaVerified: true, permissions: till.perms };
});

afterAll(async () => {
  await disconnectAll();
});

describe('the shipped template', () => {
  it('has unique codes throughout', () => {
    const all = walkTemplate();
    const codes = all.map((a) => a.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('nests codes under their parent, so the code encodes the position', () => {
    const check = (nodes = UNIVERSITY_COA, parentCode = ''): void => {
      for (const n of nodes) {
        if (parentCode) {
          expect(n.code.startsWith(parentCode), `${n.code} is not under ${parentCode}`).toBe(true);
        }
        check(n.children ?? [], n.code);
      }
    };
    check();
  });

  it('never nests deeper than five levels', () => {
    for (const a of walkTemplate()) expect(a.level).toBeLessThanOrEqual(5);
  });

  it('gives every account both an Arabic and an English name', () => {
    // The legacy database ended up half in each language, which is how the
    // same receipt screen came to query Arabic account names and write
    // English ones.
    for (const a of walkTemplate()) {
      expect(a.nameAr.trim(), `${a.code} has no Arabic name`).not.toBe('');
      expect(a.nameEn.trim(), `${a.code} has no English name`).not.toBe('');
      expect(/[؀-ۿ]/.test(a.nameAr), `${a.code} nameAr is not Arabic`).toBe(true);
    }
  });

  it('declares a sub-ledger on every control account', () => {
    for (const a of walkTemplate()) {
      if (a.isControlAccount) expect(a.subledgerType).toBeTruthy();
    }
  });

  it('ships the three control accounts the sub-ledgers need', () => {
    const controls = walkTemplate().filter((a) => a.isControlAccount);
    expect(controls.map((c) => c.subledgerType).sort()).toEqual(['SPONSOR', 'STUDENT', 'VENDOR']);
  });

  it('carries accumulated depreciation as a contra-asset', () => {
    // Under Assets but credit-normal. The legacy depreciation routine had no
    // accumulated-depreciation account at all, so net book value could not be
    // derived from the ledger.
    const acc = walkTemplate().find((a) => a.code === '122');
    expect(acc).toBeTruthy();
    expect(acc!.normalBalance).toBe('CREDIT');
  });

  it('carries unearned fees, so revenue can be deferred', () => {
    expect(walkTemplate().some((a) => a.code === '21111')).toBe(true);
  });
});

describe('installing the template', () => {
  it('creates every template account plus the cost centres', async () => {
    const expected = walkTemplate().length;
    const actual = await asTenant(tenantId, (tx) => tx.account.count());
    expect(actual).toBe(expected);

    const cc = await asTenant(tenantId, (tx) => tx.costCenter.count());
    expect(cc).toBe(DEFAULT_COST_CENTERS.length);
  });

  it('sets levels from the tree, not from the input', async () => {
    const rows = await asTenant(tenantId, (tx) =>
      tx.account.findMany({
        where: { code: { in: ['1', '11', '111', '1111', '11111'] } },
        orderBy: { code: 'asc' },
        select: { code: true, level: true },
      }),
    );
    expect(rows.map((r) => r.level)).toEqual([1, 2, 3, 4, 5]);
  });

  it('makes only level-5 leaves postable', async () => {
    const bad = await asTenant(tenantId, (tx) =>
      tx.account.count({ where: { isPostable: true, level: { not: 5 } } }),
    );
    expect(bad).toBe(0);

    const postable = await asTenant(tenantId, (tx) =>
      tx.account.count({ where: { isPostable: true } }),
    );
    expect(postable).toBeGreaterThan(20);
  });

  it('inherits the normal balance down each branch, except where overridden', async () => {
    const rows = await asTenant(tenantId, (tx) =>
      tx.account.findMany({
        where: { code: { in: ['11111', '12211', '21111', '41111', '51111'] } },
        select: { code: true, normalBalance: true },
        orderBy: { code: 'asc' },
      }),
    );
    const by = Object.fromEntries(rows.map((r) => [r.code, r.normalBalance]));
    expect(by['11111']).toBe('DEBIT'); // cash
    expect(by['12211']).toBe('CREDIT'); // accumulated depreciation — the override
    expect(by['21111']).toBe('CREDIT'); // unearned fees
    expect(by['41111']).toBe('CREDIT'); // tuition revenue
    expect(by['51111']).toBe('DEBIT'); // salaries
  });

  it('is idempotent — re-running creates nothing further', async () => {
    const before = await asTenant(tenantId, (tx) => tx.account.count());
    const result = await installChartOfAccounts(tenantId);
    const after = await asTenant(tenantId, (tx) => tx.account.count());
    expect(result.accounts).toBe(0);
    expect(after).toBe(before);
  });

  it('produces a chart that can actually be posted to', async () => {
    // The real test of a chart: raise a tuition bill against it.
    const ids = await asTenant(tenantId, async (tx) => {
      const rows = await tx.account.findMany({
        where: { code: { in: ['11211', '21111'] } },
        select: { code: true, id: true },
      });
      return Object.fromEntries(rows.map((r) => [r.code, r.id]));
    });

    const fy = await asSystem(async (tx) => {
      const year = await tx.fiscalYear.create({
        data: {
          tenantId,
          name: '2026',
          startDate: new Date(Date.UTC(2026, 0, 1)),
          endDate: new Date(Date.UTC(2026, 11, 31)),
          status: 'OPEN',
        },
        select: { id: true },
      });
      await tx.fiscalPeriod.create({
        data: {
          fiscalYearId: year.id,
          seq: 1,
          startDate: new Date(Date.UTC(2026, 0, 1)),
          endDate: new Date(Date.UTC(2026, 0, 31)),
          status: 'OPEN',
        },
      });
      await tx.documentSequence.create({
        data: {
          tenantId,
          fiscalYearId: year.id,
          docType: 'REGISTRATION',
          prefix: 'REG-2026-',
          padding: 6,
        },
      });
      return year.id;
    });
    expect(fy).toBeTruthy();

    const posted = await asTenant(tenantId, (tx) =>
      post(tx, tenantId, {
        voucherType: 'REGISTRATION',
        docDate: new Date(Date.UTC(2026, 0, 15)),
        description: 'Tuition billed on registration',
        sourceModule: 'REGISTRATION',
        lines: [
          {
            accountId: ids['11211'],
            debit: '5000.00',
            subledgerType: 'STUDENT',
            subledgerId: 'STU-2026-MED-001',
          },
          // Credit unearned fees, not revenue — SRS REQ-FEE-02.
          { accountId: ids['21111'], credit: '5000.00' },
        ],
      }),
    );
    expect(posted.voucherRef).toMatch(/^REG-2026-\d{6}$/);
  });
});

describe('tree assembly', () => {
  it('returns five roots in code order', async () => {
    const tree = await asTenant(tenantId, (tx) => loadTree(tx, tenantId));
    expect(tree.map((n) => n.code)).toEqual(['1', '2', '3', '4', '5']);
  });

  it('flattens in tree order with depth', async () => {
    const tree = await asTenant(tenantId, (tx) => loadTree(tx, tenantId));
    const flat = flatten(tree);
    expect(flat[0].code).toBe('1');
    expect(flat[0].depth).toBe(0);
    expect(flat.length).toBe(walkTemplate().length);
    // A child never appears before its parent.
    const seen = new Set<string>();
    for (const n of flat) {
      if (n.parentId) expect(seen.has(n.parentId)).toBe(true);
      seen.add(n.id);
    }
  });
});

describe('creating accounts', () => {
  it('derives the level from the parent', async () => {
    const parent = await asTenant(tenantId, (tx) =>
      tx.account.findUniqueOrThrow({
        where: { tenantId_code: { tenantId, code: '4111' } },
        select: { id: true },
      }),
    );
    const created = await createAccount(accountant, {
      code: '41119',
      nameAr: 'رسوم دراسية — الطب',
      nameEn: 'Tuition — Medicine',
      parentId: parent.id,
    });
    expect(created.level).toBe(5);
  });

  it('refuses a sixth level', async () => {
    const leaf = await asTenant(tenantId, (tx) =>
      tx.account.findUniqueOrThrow({
        where: { tenantId_code: { tenantId, code: '11111' } },
        select: { id: true },
      }),
    );
    await expect(
      createAccount(accountant, {
        code: '111111',
        nameAr: 'اختبار',
        nameEn: 'Too Deep',
        parentId: leaf.id,
      }),
    ).rejects.toThrow(/level 5, the deepest level|postable detail account/i);
  });

  it('refuses a postable account above level 5', async () => {
    const parent = await asTenant(tenantId, (tx) =>
      tx.account.findUniqueOrThrow({
        where: { tenantId_code: { tenantId, code: '411' } },
        select: { id: true },
      }),
    );
    await expect(
      createAccount(accountant, {
        code: '4119',
        nameAr: 'اختبار',
        nameEn: 'Wrongly Postable',
        parentId: parent.id,
        isPostable: true,
      }),
    ).rejects.toThrow(/Only level-5 detail accounts are postable/i);
  });

  it('refuses a control account with no sub-ledger declared', async () => {
    const parent = await asTenant(tenantId, (tx) =>
      tx.account.findUniqueOrThrow({
        where: { tenantId_code: { tenantId, code: '1121' } },
        select: { id: true },
      }),
    );
    await expect(
      createAccount(accountant, {
        code: '11219',
        nameAr: 'اختبار',
        nameEn: 'Control Without Subledger',
        parentId: parent.id,
        isControlAccount: true,
      }),
    ).rejects.toThrow(/must declare which sub-ledger/i);
  });

  it('requires both names', async () => {
    const parent = await asTenant(tenantId, (tx) =>
      tx.account.findUniqueOrThrow({
        where: { tenantId_code: { tenantId, code: '4111' } },
        select: { id: true },
      }),
    );
    await expect(
      createAccount(accountant, {
        code: '41198',
        nameAr: '',
        nameEn: 'English Only',
        parentId: parent.id,
      }),
    ).rejects.toThrow(AccountValidationError);
  });

  it('rejects a malformed code', async () => {
    await expect(
      createAccount(accountant, {
        code: 'has spaces',
        nameAr: 'اختبار',
        nameEn: 'Bad Code',
        parentId: null,
        normalBalance: 'DEBIT',
      }),
    ).rejects.toThrow(/is invalid/i);
  });

  it('requires a normal balance on a root account', async () => {
    await expect(
      createAccount(accountant, {
        code: '9',
        nameAr: 'اختبار',
        nameEn: 'Rootless Sign',
        parentId: null,
      }),
    ).rejects.toThrow(/must state its normal balance/i);
  });
});

describe('authorization', () => {
  it('refuses a cashier the chart of accounts', async () => {
    // The legacy system had no roles, so any user could edit the chart.
    await expect(
      createAccount(cashier, {
        code: '41197',
        nameAr: 'اختبار',
        nameEn: 'Cashier Attempt',
        parentId: null,
        normalBalance: 'DEBIT',
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe('deactivation, never deletion', () => {
  it('refuses to deactivate a parent with active children', async () => {
    const parent = await asTenant(tenantId, (tx) =>
      tx.account.findUniqueOrThrow({
        where: { tenantId_code: { tenantId, code: '1111' } },
        select: { id: true },
      }),
    );
    await expect(deactivateAccount(accountant, parent.id)).rejects.toThrow(
      /active child account/i,
    );
  });

  it('deactivates a leaf and hides it from the default tree', async () => {
    const leaf = await asTenant(tenantId, (tx) =>
      tx.account.findUniqueOrThrow({
        where: { tenantId_code: { tenantId, code: '41215' } },
        select: { id: true },
      }),
    );
    await deactivateAccount(accountant, leaf.id);

    const visible = await asTenant(tenantId, (tx) => loadTree(tx, tenantId));
    expect(flatten(visible).some((n) => n.id === leaf.id)).toBe(false);

    // Still there, still auditable — deactivated, not deleted.
    const withInactive = await asTenant(tenantId, (tx) => loadTree(tx, tenantId, true));
    expect(flatten(withInactive).some((n) => n.id === leaf.id)).toBe(true);
  });
});

describe('audit', () => {
  it('records every change and the chain stays intact', async () => {
    const acc = await asTenant(tenantId, (tx) =>
      tx.account.findUniqueOrThrow({
        where: { tenantId_code: { tenantId, code: '51215' } },
        select: { id: true },
      }),
    );
    await updateAccount(accountant, acc.id, { nameEn: 'Bank Charges and Fees' });

    const entries = await asTenant(tenantId, (tx) =>
      tx.auditLog.findMany({
        where: { resourceType: 'account', resourceId: acc.id },
        orderBy: { seq: 'asc' },
      }),
    );
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.at(-1)!.action).toBe('UPDATE');

    const v = await asTenant(tenantId, (tx) => verifyChain(tx, tenantId));
    expect(v.ok).toBe(true);
  });
});
