/**
 * Tenant isolation (plan §8.3).
 *
 * The assertions here run at the DATABASE layer. A test that checks the API
 * returns 403 proves only that the API remembered to check; it says nothing
 * about the query that forgot a WHERE. These tests issue queries directly
 * under a tenant's session context and require the rows to be invisible.
 *
 * The failure this guards against is the worst one available to a
 * multi-tenant product: one university reading another's student ledger.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { post } from '@/lib/ledger/posting';
import { asSystem, asTenant, makeTenant, testDb, disconnectAll, JAN, type Fixture } from './helpers';

let alpha: Fixture;
let beta: Fixture;

beforeAll(async () => {
  alpha = await makeTenant();
  beta = await makeTenant();

  // Give each tenant a voucher, so there is something to fail to see.
  await asTenant(alpha.tenantId, (tx) =>
    post(tx, alpha.tenantId, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'ALPHA CONFIDENTIAL',
      lines: [
        { accountId: alpha.accounts.expense, debit: '111.00' },
        { accountId: alpha.accounts.cash, credit: '111.00' },
      ],
    }),
  );

  await asTenant(beta.tenantId, (tx) =>
    post(tx, beta.tenantId, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'BETA CONFIDENTIAL',
      lines: [
        { accountId: beta.accounts.expense, debit: '222.00' },
        { accountId: beta.accounts.cash, credit: '222.00' },
      ],
    }),
  );
});

afterAll(async () => {
  await disconnectAll();
});

describe('a tenant cannot read another tenant', () => {
  it('sees only its own vouchers on an unfiltered query', async () => {
    // Note: no WHERE tenant_id. This is the query a careless developer
    // writes, and RLS is what makes it safe.
    const rows = await asTenant(alpha.tenantId, (tx) =>
      tx.$queryRaw<Array<{ description: string }>>`
        SELECT description FROM transaction_headers
      `,
    );
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.description === 'ALPHA CONFIDENTIAL')).toBe(true);
    expect(rows.some((r) => r.description === 'BETA CONFIDENTIAL')).toBe(false);
  });

  it('cannot read the other tenant even when naming its id explicitly', async () => {
    const rows = await asTenant(alpha.tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: bigint }>>`
        SELECT COUNT(*) AS n FROM transaction_headers
         WHERE tenant_id = ${beta.tenantId}::uuid
      `,
    );
    expect(Number(rows[0].n)).toBe(0);
  });

  it('cannot fetch another tenant voucher by its primary key', async () => {
    const betaHeaderId = await asSystem(async (tx) => {
      const h = await tx.transactionHeader.findFirstOrThrow({
        where: { tenantId: beta.tenantId },
        select: { id: true },
      });
      return h.id;
    });

    const found = await asTenant(alpha.tenantId, (tx) =>
      tx.transactionHeader.findUnique({ where: { id: betaHeaderId } }),
    );
    expect(found).toBeNull();
  });

  it('isolates transaction_lines, which are reached through the header', async () => {
    const rows = await asTenant(alpha.tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: bigint }>>`SELECT COUNT(*) AS n FROM transaction_lines`,
    );
    const total = await asSystem((tx) =>
      tx.$queryRaw<Array<{ n: bigint }>>`SELECT COUNT(*) AS n FROM transaction_lines`,
    );
    expect(Number(rows[0].n)).toBeGreaterThan(0);
    expect(Number(rows[0].n)).toBeLessThan(Number(total[0].n));
  });

  it('isolates the chart of accounts, cost centres and fiscal calendar', async () => {
    // Assert the property, not a magic number: what the tenant can see equals
    // exactly what it owns, and is strictly less than what exists. Hardcoding
    // fixture sizes here would break on every fixture change and would prove
    // less.
    const visible = await asTenant(alpha.tenantId, async (tx) => ({
      accounts: await tx.account.count(),
      costCenters: await tx.costCenter.count(),
      fiscalYears: await tx.fiscalYear.count(),
      periods: await tx.fiscalPeriod.count(),
      users: await tx.user.count(),
    }));

    const owned = await asSystem(async (tx) => ({
      accounts: await tx.account.count({ where: { tenantId: alpha.tenantId } }),
      costCenters: await tx.costCenter.count({ where: { tenantId: alpha.tenantId } }),
      fiscalYears: await tx.fiscalYear.count({ where: { tenantId: alpha.tenantId } }),
      periods: await tx.fiscalPeriod.count({
        where: { fiscalYear: { tenantId: alpha.tenantId } },
      }),
      users: await tx.user.count({ where: { tenantId: alpha.tenantId } }),
    }));

    const everything = await asSystem(async (tx) => ({
      accounts: await tx.account.count(),
      costCenters: await tx.costCenter.count(),
      fiscalYears: await tx.fiscalYear.count(),
      periods: await tx.fiscalPeriod.count(),
      users: await tx.user.count(),
    }));

    expect(visible).toEqual(owned);
    for (const k of Object.keys(visible) as Array<keyof typeof visible>) {
      expect(visible[k]).toBeGreaterThan(0);
      expect(everything[k]).toBeGreaterThan(visible[k]);
    }
  });

  it('isolates the audit log and idempotency keys', async () => {
    const n = await asTenant(alpha.tenantId, async (tx) => ({
      audit: await tx.auditLog.count(),
      keys: await tx.idempotencyKey.count(),
    }));
    expect(n.audit).toBe(0);
    expect(n.keys).toBe(0);
  });

  it('sees only itself in the tenants table', async () => {
    const rows = await asTenant(alpha.tenantId, (tx) => tx.tenant.findMany());
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(alpha.tenantId);
  });
});

describe('a tenant cannot write into another tenant', () => {
  it('cannot post a voucher onto another tenant', async () => {
    await expect(
      asTenant(alpha.tenantId, (tx) =>
        post(tx, beta.tenantId, {
          voucherType: 'JOURNAL',
          docDate: JAN,
          description: 'cross-tenant write attempt',
          lines: [
            { accountId: beta.accounts.expense, debit: '50.00' },
            { accountId: beta.accounts.cash, credit: '50.00' },
          ],
        }),
      ),
    ).rejects.toThrow();
  });

  it('cannot mix another tenant account into its own voucher', async () => {
    await expect(
      asTenant(alpha.tenantId, (tx) =>
        post(tx, alpha.tenantId, {
          voucherType: 'JOURNAL',
          docDate: JAN,
          description: 'account laundering',
          lines: [
            { accountId: alpha.accounts.expense, debit: '50.00' },
            { accountId: beta.accounts.cash, credit: '50.00' },
          ],
        }),
      ),
    ).rejects.toThrow();
  });

  it('cannot UPDATE another tenant row', async () => {
    const affected = await asTenant(alpha.tenantId, (tx) =>
      tx.$executeRaw`
        UPDATE chart_of_accounts SET name_en = 'hijacked'
         WHERE tenant_id = ${beta.tenantId}::uuid
      `,
    );
    expect(affected).toBe(0);

    const stillFine = await asSystem((tx) =>
      tx.account.count({ where: { tenantId: beta.tenantId, nameEn: 'hijacked' } }),
    );
    expect(stillFine).toBe(0);
  });

  it('cannot DELETE another tenant row', async () => {
    const affected = await asTenant(alpha.tenantId, (tx) =>
      tx.$executeRaw`DELETE FROM cost_centers WHERE tenant_id = ${beta.tenantId}::uuid`,
    );
    expect(affected).toBe(0);

    const survived = await asSystem((tx) =>
      tx.costCenter.count({ where: { tenantId: beta.tenantId } }),
    );
    expect(survived).toBe(1);
  });
});

describe('missing tenant context is closed by default', () => {
  it('shows no rows at all when app.tenant_id is unset', async () => {
    // A connection with no tenant context must be blind, not omniscient.
    // current_setting returns NULL, the policy predicate is NULL, nothing
    // matches. This is the behaviour that makes a forgotten withTenant() a
    // visible failure rather than a silent full-table read.
    const rows = await testDb.$queryRaw<Array<{ n: bigint }>>`
      SELECT COUNT(*) AS n FROM transaction_headers
    `;
    expect(Number(rows[0].n)).toBe(0);
  });

  it('rejects a tenant id that is not a uuid rather than interpolating it', async () => {
    await expect(
      asTenant("' OR '1'='1", async () => 'unreachable'),
    ).rejects.toThrow(/not a uuid/i);
  });
});

describe('RLS coverage is structural, not per-table goodwill', () => {
  // The tests above check the tables that existed when they were written. This
  // one checks the tables that exist now. Adding a table and forgetting its
  // policy is silent — the new table simply has no isolation, and every query
  // against it returns every tenant's rows. Nothing else in the system would
  // report that.
  //
  // Two tables are global on purpose: `permissions` is a catalogue of
  // capability keys shared by every tenant, and `_prisma_migrations` is the
  // migration ledger. Anything else appearing here is an omission.
  const INTENTIONALLY_GLOBAL = new Set(['permissions', '_prisma_migrations']);

  it('protects every table in the schema, or declares it global', async () => {
    const rows = await asSystem(
      (tx) => tx.$queryRaw<Array<{ table_name: string; rls: boolean; policies: bigint }>>`
        SELECT c.relname AS table_name,
               c.relrowsecurity AS rls,
               (SELECT count(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind = 'r'
         ORDER BY c.relname
      `,
    );

    expect(rows.length).toBeGreaterThan(20);

    const unprotected = rows
      .filter((r) => !INTENTIONALLY_GLOBAL.has(r.table_name))
      .filter((r) => !r.rls || Number(r.policies) === 0)
      .map((r) => r.table_name);

    expect(unprotected).toEqual([]);
  });

  it('confines the newest tables too, not just the ones the suite names', async () => {
    // Written when draft_sequences and voucher_attachments were added, and
    // kept as the pattern for the next module: prove the confinement with a
    // query, from inside another tenant's session.
    const alphaDraft = await asSystem((tx) =>
      tx.voucherDraft.create({
        data: {
          tenantId: alpha.tenantId,
          draftNo: 'ISO-0001',
          voucherType: 'JOURNAL',
          docDate: JAN,
          description: 'ALPHA DRAFT',
          linesJson: [],
          fiscalYearId: alpha.fiscalYearId,
          createdById: alpha.userId,
        },
        select: { id: true },
      }),
    );

    await asSystem((tx) =>
      tx.voucherAttachment.create({
        data: {
          tenantId: alpha.tenantId,
          draftId: alphaDraft.id,
          fileName: 'alpha-secret.pdf',
          contentType: 'application/pdf',
          byteSize: 10,
          storageKey: `iso/${alpha.tenantId}/secret.pdf`,
          sha256: 'b'.repeat(64),
          uploadedById: alpha.userId,
        },
      }),
    );

    const seen = await asTenant(beta.tenantId, async (tx) => ({
      drafts: await tx.voucherDraft.count(),
      attachments: await tx.voucherAttachment.count(),
      sequences: await tx.$queryRaw<Array<{ n: bigint }>>`
        SELECT count(*) AS n FROM draft_sequences WHERE tenant_id = ${alpha.tenantId}::uuid
      `,
    }));

    expect(seen.drafts).toBe(0);
    expect(seen.attachments).toBe(0);
    expect(Number(seen.sequences[0].n)).toBe(0);
  });
});
