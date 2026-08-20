/**
 * Ledger property tests (plan §8.1).
 *
 * Every case here corresponds to something the legacy VB.NET system permitted.
 * They are written against the database, not against mocks, because the point
 * is that the *database* refuses — not that our TypeScript remembered to ask.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { post, reverse, UnbalancedVoucherError, InvalidVoucherError } from '@/lib/ledger/posting';
import { PeriodNotOpenError } from '@/lib/ledger/period';
import { asSystem, asTenant, makeTenant, testDb, disconnectAll, JAN, MAR, type Fixture } from './helpers';

let f: Fixture;

beforeAll(async () => {
  f = await makeTenant();
});

afterAll(async () => {
  await disconnectAll();
});

/** A balanced two-line journal: Dr expense / Cr cash. */
function simpleJournal(fx: Fixture, amount = '1000.00', docDate = JAN) {
  return {
    voucherType: 'JOURNAL' as const,
    docDate,
    description: 'Test journal',
    lines: [
      { accountId: fx.accounts.expense, debit: amount },
      { accountId: fx.accounts.cash, credit: amount },
    ],
  };
}

describe('a posted voucher balances', () => {
  it('accepts a balanced voucher and returns its allocated number', async () => {
    const r = await asTenant(f.tenantId, (tx) => post(tx, f.tenantId, simpleJournal(f)));
    expect(r.voucherRef).toMatch(/^JV-2026-\d{6}$/);
    expect(r.totalAmount).toBe('1000.0000');
  });

  it('rejects debits <> credits in the application layer', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [
            { accountId: f.accounts.expense, debit: '1000.00' },
            { accountId: f.accounts.cash, credit: '999.99' },
          ],
        }),
      ),
    ).rejects.toThrow(UnbalancedVoucherError);
  });

  it('rejects an unbalanced voucher at the DATABASE, bypassing the engine entirely', async () => {
    // This is the test that matters. The legacy system checked balance in the
    // UI only, so any code path that was not the voucher screen could post a
    // one-sided entry. Here we deliberately write raw SQL — the deferred
    // constraint trigger must still refuse at COMMIT.
    await expect(
      asSystem(async (tx) => {
        const [{ id: headerId }] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO transaction_headers
            (id, tenant_id, fiscal_year_id, fiscal_period_id, voucher_type,
             voucher_no, voucher_ref, doc_date, description, currency, total_amount)
          VALUES (gen_random_uuid(), ${f.tenantId}::uuid, ${f.fiscalYearId}::uuid,
                  ${f.periodIds[0]}::uuid, 'JOURNAL', 999001, 'RAW-999001',
                  '2026-01-15', 'smuggled in behind the engine', 'SDG', 500)
          RETURNING id
        `;
        // Two lines, deliberately out of balance by 200 — so this exercises
        // the debits<>credits path rather than the line-count path.
        await tx.$executeRaw`
          INSERT INTO transaction_lines
            (id, header_id, line_no, account_id, txn_currency, txn_amount, fx_rate, debit_amount, credit_amount)
          VALUES (gen_random_uuid(), ${headerId}::uuid, 1, ${f.accounts.expense}::uuid, 'SDG', 500, 1, 500, 0)
        `;
        await tx.$executeRaw`
          INSERT INTO transaction_lines
            (id, header_id, line_no, account_id, txn_currency, txn_amount, fx_rate, debit_amount, credit_amount)
          VALUES (gen_random_uuid(), ${headerId}::uuid, 2, ${f.accounts.cash}::uuid, 'SDG', 300, 1, 0, 300)
        `;
        // The deferred constraint trigger fires at COMMIT, not at INSERT.
      }),
    ).rejects.toThrow(/debits 500.* <> credits 300.*out by 200/i);
  });

  it('rejects a one-sided voucher at the DATABASE', async () => {
    await expect(
      asSystem(async (tx) => {
        const [{ id: headerId }] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO transaction_headers
            (id, tenant_id, fiscal_year_id, fiscal_period_id, voucher_type,
             voucher_no, voucher_ref, doc_date, description, currency, total_amount)
          VALUES (gen_random_uuid(), ${f.tenantId}::uuid, ${f.fiscalYearId}::uuid,
                  ${f.periodIds[0]}::uuid, 'JOURNAL', 999003, 'RAW-999003',
                  '2026-01-15', 'one-sided', 'SDG', 500)
          RETURNING id
        `;
        await tx.$executeRaw`
          INSERT INTO transaction_lines
            (id, header_id, line_no, account_id, txn_currency, txn_amount, fx_rate, debit_amount, credit_amount)
          VALUES (gen_random_uuid(), ${headerId}::uuid, 1, ${f.accounts.expense}::uuid, 'SDG', 500, 1, 500, 0)
        `;
      }),
    ).rejects.toThrow(/needs at least two lines/i);
  });

  it('rejects a header with no lines at all at the DATABASE', async () => {
    await expect(
      asSystem(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO transaction_headers
            (id, tenant_id, fiscal_year_id, fiscal_period_id, voucher_type,
             voucher_no, voucher_ref, doc_date, description, currency, total_amount)
          VALUES (gen_random_uuid(), ${f.tenantId}::uuid, ${f.fiscalYearId}::uuid,
                  ${f.periodIds[0]}::uuid, 'JOURNAL', 999004, 'RAW-999004',
                  '2026-01-15', 'no lines', 'SDG', 0)
        `;
      }),
    ).rejects.toThrow(/needs at least two lines, found 0/i);
  });

  it('rejects a single-line voucher — a double entry needs two sides', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [{ accountId: f.accounts.expense, debit: '100.00' }],
        }),
      ),
    ).rejects.toThrow(InvalidVoucherError);
  });

  it('rejects a voucher totalling zero', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [
            { accountId: f.accounts.expense, debit: '0' },
            { accountId: f.accounts.cash, credit: '0' },
          ],
        }),
      ),
    ).rejects.toThrow(InvalidVoucherError);
  });

  it('rejects a negative debit — that is a credit, and must be entered as one', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [
            { accountId: f.accounts.expense, debit: '-100.00' },
            { accountId: f.accounts.cash, credit: '-100.00' },
          ],
        }),
      ),
    ).rejects.toThrow(InvalidVoucherError);
  });

  it('rejects a line carrying both a debit and a credit', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [
            { accountId: f.accounts.expense, debit: '100.00', credit: '50.00' },
            { accountId: f.accounts.cash, credit: '50.00' },
          ],
        }),
      ),
    ).rejects.toThrow(InvalidVoucherError);
  });
});

describe('nothing posts into a period that is not open', () => {
  it('rejects a document dated in a FUTURE period', async () => {
    await expect(
      asTenant(f.tenantId, (tx) => post(tx, f.tenantId, simpleJournal(f, '100.00', MAR))),
    ).rejects.toThrow(PeriodNotOpenError);
  });

  it('rejects a document dated in a CLOSED period, at the database', async () => {
    const fx = await makeTenant();
    await asSystem(async (tx) => {
      await tx.fiscalPeriod.update({
        where: { id: fx.periodIds[0] },
        data: { status: 'CLOSED' },
      });
    });
    await expect(
      asTenant(fx.tenantId, (tx) => post(tx, fx.tenantId, simpleJournal(fx))),
    ).rejects.toThrow(/CLOSED|must be OPEN/i);
  });

  it('rejects a document date outside the period it claims', async () => {
    // Straight to SQL: claim period 1 (January) but date the document in June.
    await expect(
      asSystem(async (tx) => {
        await tx.$executeRaw`
          INSERT INTO transaction_headers
            (id, tenant_id, fiscal_year_id, fiscal_period_id, voucher_type,
             voucher_no, voucher_ref, doc_date, description, currency, total_amount)
          VALUES (gen_random_uuid(), ${f.tenantId}::uuid, ${f.fiscalYearId}::uuid,
                  ${f.periodIds[0]}::uuid, 'JOURNAL', 999002, 'RAW-999002',
                  '2026-06-15', 'wrong period', 'SDG', 100)
        `;
      }),
    ).rejects.toThrow(/outside period/i);
  });
});

describe('only level-5 detail accounts receive postings', () => {
  it('rejects a posting to a level-4 parent account', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [
            { accountId: f.accounts.parentNotPostable, debit: '100.00' },
            { accountId: f.accounts.cash, credit: '100.00' },
          ],
        }),
      ),
    ).rejects.toThrow(/not postable|level 4/i);
  });
});

describe('control accounts cannot drift from their sub-ledger', () => {
  it('rejects a control-account line with no sub-ledger identity', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [
            { accountId: f.accounts.studentAr, debit: '100.00' },
            { accountId: f.accounts.tuitionRevenue, credit: '100.00' },
          ],
        }),
      ),
    ).rejects.toThrow(/control account and requires sub-ledger/i);
  });

  it('accepts a control-account line carrying sub-ledger identity', async () => {
    const r = await asTenant(f.tenantId, (tx) =>
      post(tx, f.tenantId, {
        ...simpleJournal(f),
        description: 'Tuition billed to student',
        lines: [
          {
            accountId: f.accounts.studentAr,
            debit: '5000.00',
            subledgerType: 'STUDENT',
            subledgerId: 'STU-2026-MED-001',
          },
          { accountId: f.accounts.tuitionRevenue, credit: '5000.00' },
        ],
      }),
    );
    expect(r.voucherRef).toMatch(/^JV-2026-/);
  });

  it('rejects a sub-ledger type that does not match the control account', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [
            {
              accountId: f.accounts.studentAr,
              debit: '100.00',
              subledgerType: 'VENDOR',
              subledgerId: 'V-1',
            },
            { accountId: f.accounts.tuitionRevenue, credit: '100.00' },
          ],
        }),
      ),
    ).rejects.toThrow(/controls the STUDENT sub-ledger/i);
  });
});

describe('cost centre requirements are enforced', () => {
  it('rejects a posting that omits a required cost centre', async () => {
    await expect(
      asTenant(f.tenantId, (tx) =>
        post(tx, f.tenantId, {
          ...simpleJournal(f),
          lines: [
            { accountId: f.accounts.needsCostCenter, debit: '100.00' },
            { accountId: f.accounts.cash, credit: '100.00' },
          ],
        }),
      ),
    ).rejects.toThrow(/requires a cost centre/i);
  });

  it('accepts it when the cost centre is supplied', async () => {
    const r = await asTenant(f.tenantId, (tx) =>
      post(tx, f.tenantId, {
        ...simpleJournal(f),
        lines: [
          { accountId: f.accounts.needsCostCenter, debit: '100.00', costCenterId: f.costCenterId },
          { accountId: f.accounts.cash, credit: '100.00' },
        ],
      }),
    );
    expect(r.headerId).toBeTruthy();
  });
});

describe('posted vouchers are immutable', () => {
  it('refuses UPDATE of a posted header', async () => {
    const r = await asTenant(f.tenantId, (tx) => post(tx, f.tenantId, simpleJournal(f, '250.00')));
    await expect(
      asSystem(async (tx) => {
        await tx.$executeRaw`
          UPDATE transaction_headers SET description = 'tampered' WHERE id = ${r.headerId}::uuid
        `;
      }),
    ).rejects.toThrow(/cannot be edited|immutable/i);
  });

  it('refuses DELETE of a posted header', async () => {
    const r = await asTenant(f.tenantId, (tx) => post(tx, f.tenantId, simpleJournal(f, '260.00')));
    await expect(
      asSystem(async (tx) => {
        await tx.$executeRaw`DELETE FROM transaction_headers WHERE id = ${r.headerId}::uuid`;
      }),
    ).rejects.toThrow(/cannot be deleted|immutable/i);
  });

  it('refuses UPDATE of a posted line', async () => {
    const r = await asTenant(f.tenantId, (tx) => post(tx, f.tenantId, simpleJournal(f, '270.00')));
    await expect(
      asSystem(async (tx) => {
        await tx.$executeRaw`
          UPDATE transaction_lines SET debit_amount = 1 WHERE header_id = ${r.headerId}::uuid
        `;
      }),
    ).rejects.toThrow(/immutable/i);
  });
});

describe('reversal', () => {
  it('creates a linked opposite entry and stamps the original', async () => {
    const original = await asTenant(f.tenantId, (tx) =>
      post(tx, f.tenantId, simpleJournal(f, '750.00')),
    );

    const rev = await asTenant(f.tenantId, (tx) =>
      reverse(tx, f.tenantId, original.headerId, 'Posted to the wrong cost centre', {
        reversalDate: JAN,
      }),
    );

    expect(rev.voucherRef).toMatch(/^REVR-2026-/);

    const [orig, reversal] = await asTenant(f.tenantId, async (tx) => [
      await tx.transactionHeader.findUniqueOrThrow({ where: { id: original.headerId } }),
      await tx.transactionHeader.findUniqueOrThrow({
        where: { id: rev.headerId },
        include: { lines: { orderBy: { lineNo: 'asc' } } },
      }),
    ]);

    expect(orig.reversedAt).not.toBeNull();
    expect(reversal.reversesId).toBe(original.headerId);
    expect(reversal.reversalReason).toBe('Posted to the wrong cost centre');

    // Sides swapped: the original debited expense, the reversal credits it.
    const expenseLine = reversal.lines.find((l) => l.accountId === f.accounts.expense)!;
    expect(expenseLine.creditAmount.toFixed(2)).toBe('750.00');
    expect(expenseLine.debitAmount.toFixed(2)).toBe('0.00');
  });

  it('refuses to reverse the same voucher twice', async () => {
    const original = await asTenant(f.tenantId, (tx) =>
      post(tx, f.tenantId, simpleJournal(f, '800.00')),
    );
    await asTenant(f.tenantId, (tx) =>
      reverse(tx, f.tenantId, original.headerId, 'first reversal', { reversalDate: JAN }),
    );
    await expect(
      asTenant(f.tenantId, (tx) =>
        reverse(tx, f.tenantId, original.headerId, 'second reversal', { reversalDate: JAN }),
      ),
    ).rejects.toThrow(/already been reversed/i);
  });

  it('refuses to reverse a reversal', async () => {
    const original = await asTenant(f.tenantId, (tx) =>
      post(tx, f.tenantId, simpleJournal(f, '810.00')),
    );
    const rev = await asTenant(f.tenantId, (tx) =>
      reverse(tx, f.tenantId, original.headerId, 'reason', { reversalDate: JAN }),
    );
    await expect(
      asTenant(f.tenantId, (tx) =>
        reverse(tx, f.tenantId, rev.headerId, 'reason', { reversalDate: JAN }),
      ),
    ).rejects.toThrow(/itself a reversal/i);
  });

  it('requires a stated reason', async () => {
    const original = await asTenant(f.tenantId, (tx) =>
      post(tx, f.tenantId, simpleJournal(f, '820.00')),
    );
    await expect(
      asTenant(f.tenantId, (tx) =>
        reverse(tx, f.tenantId, original.headerId, '   ', { reversalDate: JAN }),
      ),
    ).rejects.toThrow(/requires a stated reason/i);
  });

  it('leaves the ledger net zero after a reversal', async () => {
    const fx = await makeTenant();
    const original = await asTenant(fx.tenantId, (tx) =>
      post(tx, fx.tenantId, simpleJournal(fx, '1234.56')),
    );
    await asTenant(fx.tenantId, (tx) =>
      reverse(tx, fx.tenantId, original.headerId, 'cancelled', { reversalDate: JAN }),
    );

    const net = await asTenant(fx.tenantId, async (tx) => {
      const rows = await tx.$queryRaw<Array<{ d: string; c: string }>>`
        SELECT COALESCE(SUM(l.debit_amount),0)::text AS d,
               COALESCE(SUM(l.credit_amount),0)::text AS c
          FROM transaction_lines l
          JOIN transaction_headers h ON h.id = l.header_id
         WHERE h.tenant_id = ${fx.tenantId}::uuid
           AND l.account_id = ${fx.accounts.expense}::uuid
      `;
      return rows[0];
    });
    expect(Number(net.d)).toBe(Number(net.c));
  });
});

describe('period balance aggregates track the ledger', () => {
  it('movements equal the sum of posted lines for the account', async () => {
    const fx = await makeTenant();
    await asTenant(fx.tenantId, (tx) => post(tx, fx.tenantId, simpleJournal(fx, '300.00')));
    await asTenant(fx.tenantId, (tx) => post(tx, fx.tenantId, simpleJournal(fx, '450.50')));

    const { agg, raw } = await asTenant(fx.tenantId, async (tx) => {
      const aggRows = await tx.$queryRaw<Array<{ md: string }>>`
        SELECT movement_debit::text AS md
          FROM account_period_balances
         WHERE tenant_id = ${fx.tenantId}::uuid
           AND account_id = ${fx.accounts.expense}::uuid
           AND fiscal_period_id = ${fx.periodIds[0]}::uuid
      `;
      const rawRows = await tx.$queryRaw<Array<{ d: string }>>`
        SELECT COALESCE(SUM(l.debit_amount),0)::text AS d
          FROM transaction_lines l
          JOIN transaction_headers h ON h.id = l.header_id
         WHERE h.tenant_id = ${fx.tenantId}::uuid
           AND l.account_id = ${fx.accounts.expense}::uuid
      `;
      return { agg: aggRows[0], raw: rawRows[0] };
    });

    expect(Number(agg.md)).toBeCloseTo(750.5, 4);
    expect(Number(agg.md)).toBeCloseTo(Number(raw.d), 4);
  });

  it('collapses a null cost centre onto one row rather than many', async () => {
    const fx = await makeTenant();
    for (let i = 0; i < 3; i += 1) {
      await asTenant(fx.tenantId, (tx) => post(tx, fx.tenantId, simpleJournal(fx, '100.00')));
    }
    const rows = await asTenant(fx.tenantId, (tx) =>
      tx.$queryRaw<Array<{ n: bigint }>>`
        SELECT COUNT(*) AS n
          FROM account_period_balances
         WHERE tenant_id = ${fx.tenantId}::uuid
           AND account_id = ${fx.accounts.cash}::uuid
           AND cost_center_id IS NULL
      `,
    );
    expect(Number(rows[0].n)).toBe(1);
  });
});
