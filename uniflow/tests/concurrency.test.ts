/**
 * Concurrency (plan §8.2).
 *
 * The legacy system allocated voucher numbers with MAX(n)+1 read inside the
 * transaction. Two cashiers posting at the same moment both read the same
 * maximum and both wrote it. This suite is the regression test for that
 * defect, and it must run against a real server with real parallel
 * connections — a mocked database cannot exhibit a lost update.
 */
import { afterAll, describe, expect, it } from 'vitest';
import { post } from '@/lib/ledger/posting';
import { idempotent } from '@/lib/idempotency';
import { withTenant } from '@/lib/db/client';
import { asTenant, makeTenant, disconnectAll, JAN } from './helpers';

afterAll(async () => {
  await disconnectAll();
});

describe('voucher numbering under concurrency', () => {
  it('N parallel postings yield N distinct, gapless numbers', async () => {
    const f = await makeTenant();
    const N = 60;

    const results = await Promise.all(
      Array.from({ length: N }, (_, i) =>
        withTenant(
          f.tenantId,
          (tx) =>
            post(tx, f.tenantId, {
              voucherType: 'STUDENT_RECEIPT',
              docDate: JAN,
              description: `Concurrent receipt ${i}`,
              sourceModule: 'CASHIERING',
              lines: [
                { accountId: f.accounts.cash, debit: '100.00' },
                {
                  accountId: f.accounts.studentAr,
                  credit: '100.00',
                  subledgerType: 'STUDENT',
                  subledgerId: `STU-${i}`,
                },
              ],
            }),
        ),
      ),
    );

    const numbers = results.map((r) => r.voucherNo).sort((a, b) => a - b);
    expect(new Set(numbers).size).toBe(N);
    // Gapless: statutory receipt books cannot skip a number.
    expect(numbers).toEqual(Array.from({ length: N }, (_, i) => i + 1));

    const refs = new Set(results.map((r) => r.voucherRef));
    expect(refs.size).toBe(N);
  });

  it('separate document types have independent series and do not block each other', async () => {
    const f = await makeTenant();

    const mixed = await Promise.all([
      ...Array.from({ length: 10 }, () =>
        withTenant(
          f.tenantId,
          (tx) =>
            post(tx, f.tenantId, {
              voucherType: 'JOURNAL',
              docDate: JAN,
              description: 'journal',
              lines: [
                { accountId: f.accounts.expense, debit: '10.00' },
                { accountId: f.accounts.cash, credit: '10.00' },
              ],
            }),
        ),
      ),
      ...Array.from({ length: 10 }, () =>
        withTenant(
          f.tenantId,
          (tx) =>
            post(tx, f.tenantId, {
              voucherType: 'PAYMENT',
              docDate: JAN,
              description: 'payment',
              lines: [
                { accountId: f.accounts.expense, debit: '20.00' },
                { accountId: f.accounts.bank, credit: '20.00' },
              ],
            }),
        ),
      ),
    ]);

    const jv = mixed.filter((r) => r.voucherRef.startsWith('JV-')).map((r) => r.voucherNo);
    const pv = mixed.filter((r) => r.voucherRef.startsWith('PV-')).map((r) => r.voucherNo);

    // Each series counts from 1 independently.
    expect(jv.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(pv.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('a rolled-back posting does not consume a number', async () => {
    const f = await makeTenant();

    await withTenant(
      f.tenantId,
      (tx) =>
        post(tx, f.tenantId, {
          voucherType: 'JOURNAL',
          docDate: JAN,
          description: 'first',
          lines: [
            { accountId: f.accounts.expense, debit: '10.00' },
            { accountId: f.accounts.cash, credit: '10.00' },
          ],
        }),
    );

    // Force a rollback after the number is allocated.
    await expect(
      withTenant(
        f.tenantId,
        async (tx) => {
          await post(tx, f.tenantId, {
            voucherType: 'JOURNAL',
            docDate: JAN,
            description: 'doomed',
            lines: [
              { accountId: f.accounts.expense, debit: '10.00' },
              { accountId: f.accounts.cash, credit: '10.00' },
            ],
          });
          throw new Error('deliberate rollback');
        },
      ),
    ).rejects.toThrow('deliberate rollback');

    const next = await withTenant(
      f.tenantId,
      (tx) =>
        post(tx, f.tenantId, {
          voucherType: 'JOURNAL',
          docDate: JAN,
          description: 'third',
          lines: [
            { accountId: f.accounts.expense, debit: '10.00' },
            { accountId: f.accounts.cash, credit: '10.00' },
          ],
        }),
    );

    // 2, not 3 — the rolled-back allocation went back with its transaction.
    expect(next.voucherNo).toBe(2);
  });
});

describe('idempotency under concurrent retry', () => {
  it('a cashier double-pressing Save creates exactly one receipt', async () => {
    const f = await makeTenant();
    const body = { studentId: 'STU-001', amount: '5000.00', channel: 'CASH' };
    const key = 'receipt-abc-123';

    const attempt = () =>
      idempotent(
        f.tenantId,
        key,
        'POST /cashier/receipt',
        body,
        (tx) =>
          post(tx, f.tenantId, {
            voucherType: 'STUDENT_RECEIPT',
            docDate: JAN,
            description: 'Fee receipt',
            sourceModule: 'CASHIERING',
            lines: [
              { accountId: f.accounts.cash, debit: body.amount },
              {
                accountId: f.accounts.studentAr,
                credit: body.amount,
                subledgerType: 'STUDENT',
                subledgerId: body.studentId,
              },
            ],
          }),
      );

    const first = await attempt();
    expect(first.executed).toBe(true);

    const replay = await attempt();
    expect(replay.executed).toBe(false);
    expect(replay.result.headerId).toBe(first.result.headerId);

    const count = await asTenant(f.tenantId, (tx) =>
      tx.transactionHeader.count({
        where: { tenantId: f.tenantId, voucherType: 'STUDENT_RECEIPT' },
      }),
    );
    expect(count).toBe(1);
  });

  it('the same key with a different body is an error, not a replay', async () => {
    const f = await makeTenant();
    const key = 'receipt-xyz-1';

    await idempotent(
      f.tenantId,
      key,
      'POST /cashier/receipt',
      { amount: '100.00' },
      (tx) =>
        post(tx, f.tenantId, {
          voucherType: 'STUDENT_RECEIPT',
          docDate: JAN,
          description: 'r',
          lines: [
            { accountId: f.accounts.cash, debit: '100.00' },
            {
              accountId: f.accounts.studentAr,
              credit: '100.00',
              subledgerType: 'STUDENT',
              subledgerId: 'S1',
            },
          ],
        }),
    );

    await expect(
      idempotent(
        f.tenantId,
        key,
        'POST /cashier/receipt',
        { amount: '999.00' },
        async () => ({ nope: true }),
      ),
    ).rejects.toThrow(/different request body/i);
  });

  it('key order in the request body does not change the hash', async () => {
    const f = await makeTenant();
    const key = 'order-independent';

    const run = (body: unknown) =>
      idempotent(f.tenantId, key, 'POST /x', body, (tx) =>
        post(tx, f.tenantId, {
          voucherType: 'JOURNAL',
          docDate: JAN,
          description: 'j',
          lines: [
            { accountId: f.accounts.expense, debit: '5.00' },
            { accountId: f.accounts.cash, credit: '5.00' },
          ],
        }),
      );

    const a = await run({ alpha: 1, beta: 2 });
    const b = await run({ beta: 2, alpha: 1 });
    expect(b.executed).toBe(false);
    expect(b.result.headerId).toBe(a.result.headerId);
  });

  it('a failed operation releases the key so a genuine retry can proceed', async () => {
    const f = await makeTenant();
    const key = 'transient-failure';

    await expect(
      idempotent(f.tenantId, key, 'POST /x', { a: 1 }, async () => {
        throw new Error('database went away');
      }),
    ).rejects.toThrow('database went away');

    const retry = await idempotent(f.tenantId, key, 'POST /x', { a: 1 }, (tx) =>
      post(tx, f.tenantId, {
        voucherType: 'JOURNAL',
        docDate: JAN,
        description: 'retried',
        lines: [
          { accountId: f.accounts.expense, debit: '7.00' },
          { accountId: f.accounts.cash, credit: '7.00' },
        ],
      }),
    );
    expect(retry.executed).toBe(true);
  });
});
