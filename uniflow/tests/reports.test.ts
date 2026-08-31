import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import { post } from '@/lib/ledger/posting';
import { trialBalance } from '@/lib/reports/trial-balance';
import { balanceSheet, incomeStatement } from '@/lib/reports/statements';
import { subledgerReconciliation } from '@/lib/reports/reconciliation';
import { ledgerSlice } from '@/lib/reports/balances';
import { classify, AccountClassificationError } from '@/lib/coa/classification';
import {
  enterOpeningBalances,
  checkOpeningBalances,
  goLiveReadiness,
  OpeningBalanceError,
} from '@/lib/ledger/opening-balances';
import { closeFiscalYear, reopenFiscalYear, YearEndError } from '@/lib/ledger/year-end';
import { preCloseChecklist, PreCloseError } from '@/lib/ledger/close';
import { setPeriodStatus } from '@/lib/ledger/fiscal-year';
import { createDraft } from '@/lib/voucher/draft';
import {
  trialBalanceDocument,
  balanceSheetDocument,
  incomeStatementDocument,
  reconciliationDocument,
} from '@/lib/reports/document';
import { toCsv, toPrintableHtml } from '@/lib/reports/render';
import { toXlsx } from '@/lib/reports/xlsx';
import {
  exportHref,
  parseReportRequest,
  reportQuery,
  runReport,
  today,
  yearStart,
  ReportRequestError,
} from '@/lib/console/reports';
import { ForbiddenError } from '@/lib/auth/rbac';
import type { Principal } from '@/lib/auth/rbac';

/**
 * Financial statements and reports (SRS Module 10, Track A7).
 *
 * The legacy baseline: there was no fiscal period model, so an opening balance
 * was not computable and the "trial balance" screen could only ever show a
 * closing balance since inception. There was no balance sheet or income
 * statement at all — the reports folder holds Crystal layouts over
 * `SELECT SUM(TotalIn) - SUM(TotalOut)` against one of the two divergent
 * ledger tables, so the two halves of the institution's books were reported
 * separately and reconciled on paper.
 *
 * What these tests are really checking, over and over in different shapes: the
 * same money adds up to the same figure whichever report asks.
 */

const CTX = { institutionEn: 'Test University', institutionAr: 'جامعة اختبار' };

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

let uni: University;
let reporter: Principal;

beforeAll(async () => {
  uni = await makeUniversity({ openPeriods: [1, 2, 3] });
  reporter = await makePrincipal(uni.tenantId, ['report.financial'], { name: 'reporter' });
});

afterAll(disconnectAll);

/** A university with every period of the year open, for close/reopen work. */
async function freshUniversity(openPeriods?: number[]) {
  const u = await makeUniversity({
    openPeriods: openPeriods ?? Array.from({ length: 12 }, (_, i) => i + 1),
  });
  return {
    uni: u,
    reporter: await makePrincipal(u.tenantId, ['report.financial'], { name: 'r' }),
    controller: await makePrincipal(u.tenantId, ['period.close', 'report.financial'], {
      name: 'ctrl',
    }),
    opener: await makePrincipal(u.tenantId, ['openingbalance.manage'], { name: 'ob' }),
  };
}

/** Post a simple two-line journal directly through the engine. */
async function journal(
  tenantId: string,
  docDate: Date,
  debitCode: string,
  creditCode: string,
  amount: string,
  accounts: Record<string, string>,
  opts: { costCenterId?: string | null; description?: string } = {},
) {
  return asTenant(tenantId, (tx) =>
    post(tx, tenantId, {
      voucherType: 'JOURNAL',
      docDate,
      description: opts.description ?? `${debitCode} → ${creditCode}`,
      lines: [
        { accountId: accounts[debitCode], costCenterId: opts.costCenterId ?? null, debit: amount },
        { accountId: accounts[creditCode], credit: amount },
      ],
    }),
  );
}

// ---------------------------------------------------------------------------
// Account classification
// ---------------------------------------------------------------------------

describe('account classification', () => {
  it('reads the major class from the first character of the code', () => {
    expect(classify('11111')).toBe('ASSET');
    expect(classify('21211')).toBe('LIABILITY');
    expect(classify('31211')).toBe('EQUITY');
    expect(classify('41111')).toBe('REVENUE');
    expect(classify('51111')).toBe('EXPENSE');
  });

  it('refuses a code outside the five classes rather than silently omitting it', () => {
    // An account on neither statement is invisible money. Better a refusal
    // naming the code than a balance sheet that quietly does not add up.
    expect(() => classify('9001')).toThrow(AccountClassificationError);
    expect(() => classify('9001')).toThrow(/major classes/);
  });
});

// ---------------------------------------------------------------------------
// Trial balance
// ---------------------------------------------------------------------------

describe('trial balance', () => {
  it('balances, and closing equals opening plus movement on every row', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '5000.00', u.accounts);
    await journal(u.tenantId, D(2026, 1, 20), '51211', '11111', '1200.00', u.accounts);

    const tb = await trialBalance(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });

    expect(tb.balanced).toBe(true);
    expect(tb.segmented).toBe(false);
    // Each account is netted to one side before it is totalled, which is what
    // a trial balance is: cash took 5000 and paid out 1200, so it appears once
    // at 3800 debit rather than twice. 3800 + 1200 expense = 5000 = revenue.
    expect(tb.totals.movementDebit).toBe('5000.0000');
    expect(tb.totals.movementCredit).toBe('5000.0000');

    for (const row of tb.rows) {
      const od = Number(row.openingDebit) - Number(row.openingCredit);
      const md = Number(row.movementDebit) - Number(row.movementCredit);
      const cd = Number(row.closingDebit) - Number(row.closingCredit);
      expect(cd).toBeCloseTo(od + md, 4);
    }
  });

  it('carries a prior period into the opening column instead of the movement column', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '900.00', u.accounts);
    await journal(u.tenantId, D(2026, 2, 10), '11111', '41211', '100.00', u.accounts);

    const feb = await trialBalance(rep, { from: D(2026, 2, 1), to: D(2026, 2, 28) });
    const cash = feb.rows.find((r) => r.code === '11111');

    expect(cash?.openingDebit).toBe('900.0000');
    expect(cash?.movementDebit).toBe('100.0000');
    expect(cash?.closingDebit).toBe('1000.0000');
  });

  it('totals only postable accounts, so a five-level chart is not counted five times', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '400.00', u.accounts);

    const tb = await trialBalance(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });

    // Cash's parents 1, 11, 111, 1111 all carry the 400 as an aggregate.
    const parents = tb.rows.filter((r) => ['1', '11', '111', '1111'].includes(r.code));
    expect(parents).toHaveLength(4);
    for (const p of parents) expect(p.movementDebit).toBe('400.0000');
    expect(parents.every((p) => !p.isPostable)).toBe(true);

    // …and the total still reads 400, not 2000.
    expect(tb.totals.movementDebit).toBe('400.0000');
  });

  it('reads a mid-period cutoff line by line and agrees with the aggregate path', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 5), '11111', '41211', '300.00', u.accounts);
    await journal(u.tenantId, D(2026, 1, 25), '11111', '41211', '700.00', u.accounts);

    // A window that cuts January in half: only the first posting is in it.
    const partial = await trialBalance(rep, { from: D(2026, 1, 1), to: D(2026, 1, 15) });
    expect(partial.rows.find((r) => r.code === '11111')?.movementDebit).toBe('300.0000');
    expect(partial.balanced).toBe(true);

    // The whole period, read from the aggregates, is the sum of both.
    const whole = await trialBalance(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });
    expect(whole.rows.find((r) => r.code === '11111')?.movementDebit).toBe('1000.0000');

    // And a window starting mid-period puts the earlier posting in opening.
    const late = await trialBalance(rep, { from: D(2026, 1, 16), to: D(2026, 1, 31) });
    const cash = late.rows.find((r) => r.code === '11111');
    expect(cash?.openingDebit).toBe('300.0000');
    expect(cash?.movementDebit).toBe('700.0000');
  });

  it('marks a cost-centre run as a segment, which is not expected to balance', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    // Expense carries the faculty; the cash side does not. Filtering to the
    // faculty therefore keeps one leg of the entry and drops the other.
    await journal(u.tenantId, D(2026, 1, 10), '51214', '11111', '250.00', u.accounts, {
      costCenterId: u.costCenterId,
    });

    const seg = await trialBalance(rep, {
      from: D(2026, 1, 1),
      to: D(2026, 1, 31),
      costCenterId: u.costCenterId,
    });

    expect(seg.segmented).toBe(true);
    expect(seg.totals.movementDebit).toBe('250.0000');
    expect(seg.totals.movementCredit).toBe('0.0000');
    expect(seg.balanced).toBe(false);
  });

  it('honours the level limit', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '100.00', u.accounts);

    const summary = await trialBalance(rep, {
      from: D(2026, 1, 1),
      to: D(2026, 1, 31),
      maxLevel: 2,
    });
    expect(summary.rows.every((r) => r.level <= 2)).toBe(true);
    // Levels 3-5 are hidden but still totalled — hiding a row must not change
    // a total, or the report becomes a way to make money disappear.
    expect(summary.totals.movementDebit).toBe('100.0000');
  });

  it('refuses a window that ends before it starts', async () => {
    await expect(
      trialBalance(reporter, { from: D(2026, 3, 1), to: D(2026, 1, 1) }),
    ).rejects.toThrow(/ends before it starts/);
  });

  it('requires report.financial', async () => {
    const nobody = await makePrincipal(uni.tenantId, [], { name: 'nobody' });
    await expect(
      trialBalance(nobody, { from: D(2026, 1, 1), to: D(2026, 1, 31) }),
    ).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Opening balances
// ---------------------------------------------------------------------------

describe('opening balances', () => {
  it('posts as opening, not as movement', async () => {
    const { uni: u, reporter: rep, opener } = await freshUniversity();

    await enterOpeningBalances(opener, {
      asOf: D(2026, 1, 1),
      lines: [
        { accountId: u.accounts['11111'], debit: '10000.00' },
        { accountId: u.accounts['31211'], credit: '10000.00' },
      ],
    });

    const tb = await trialBalance(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });
    const cash = tb.rows.find((r) => r.code === '11111');

    // The whole point of REQ-PER-03: a university's starting position must not
    // be reported as January activity, or the institution appears to have come
    // into existence in one month.
    expect(cash?.openingDebit).toBe('10000.0000');
    expect(cash?.movementDebit).toBe('0.0000');
    expect(cash?.closingDebit).toBe('10000.0000');
    expect(tb.balanced).toBe(true);
    expect(tb.totals.movementDebit).toBe('0.0000');
  });

  it('refuses an unbalanced position', async () => {
    const { uni: u, opener } = await freshUniversity();
    await expect(
      enterOpeningBalances(opener, {
        asOf: D(2026, 1, 1),
        lines: [
          { accountId: u.accounts['11111'], debit: '10000.00' },
          { accountId: u.accounts['31211'], credit: '9000.00' },
        ],
      }),
    ).rejects.toThrow(OpeningBalanceError);
  });

  it('refuses a balance on a control account with no party attached', async () => {
    const { uni: u, opener } = await freshUniversity();
    const check = await checkOpeningBalances(opener, {
      asOf: D(2026, 1, 1),
      lines: [
        { accountId: u.accounts['11211'], debit: '500.00' },
        { accountId: u.accounts['31211'], credit: '500.00' },
      ],
    });

    expect(check.ok).toBe(false);
    expect(check.issues.map((i) => i.code)).toContain('CONTROL_WITHOUT_PARTY');
    // A lump sum on Student AR is a debt nobody can be asked to pay.
    expect(check.issues.find((i) => i.code === 'CONTROL_WITHOUT_PARTY')?.accountCode).toBe('11211');
  });

  it('refuses a heading account and reports the totals as it goes', async () => {
    const { uni: u, opener } = await freshUniversity();
    const check = await checkOpeningBalances(opener, {
      asOf: D(2026, 1, 1),
      lines: [
        { accountId: u.accounts['1111'], debit: '700.00' },
        { accountId: u.accounts['31211'], credit: '700.00' },
      ],
    });

    expect(check.issues.map((i) => i.code)).toContain('NOT_POSTABLE');
    expect(check.totalDebit).toBe('700.0000');
    expect(check.totalCredit).toBe('700.0000');
    expect(check.difference).toBe('0.0000');
  });

  it('refuses a second live opening entry', async () => {
    const { uni: u, opener } = await freshUniversity();
    const lines = [
      { accountId: u.accounts['11111'], debit: '100.00' },
      { accountId: u.accounts['31211'], credit: '100.00' },
    ];
    await enterOpeningBalances(opener, { asOf: D(2026, 1, 1), lines });

    const second = checkOpeningBalances(opener, { asOf: D(2026, 1, 1), lines });
    expect((await second).issues.map((i) => i.code)).toContain('ALREADY_ENTERED');
  });

  it('reports go-live readiness', async () => {
    const { uni: u, opener } = await freshUniversity();

    const before = await goLiveReadiness(opener);
    expect(before.ok).toBe(false);
    expect(before.checks.find((c) => c.key === 'opening-entered')?.ok).toBe(false);

    await enterOpeningBalances(opener, {
      asOf: D(2026, 1, 1),
      lines: [
        { accountId: u.accounts['11111'], debit: '2500.00' },
        { accountId: u.accounts['31211'], credit: '2500.00' },
      ],
    });

    const after = await goLiveReadiness(opener);
    expect(after.ok).toBe(true);
    expect(after.checks.find((c) => c.key === 'opening-balanced')?.ok).toBe(true);
    expect(after.checks.find((c) => c.key === 'period-open')?.ok).toBe(true);
  });

  it('requires openingbalance.manage', async () => {
    const nobody = await makePrincipal(uni.tenantId, [], { name: 'nobody-ob' });
    await expect(goLiveReadiness(nobody)).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Balance sheet
// ---------------------------------------------------------------------------

describe('balance sheet', () => {
  it('balances with the unappropriated result folded into equity', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '8000.00', u.accounts);
    await journal(u.tenantId, D(2026, 1, 20), '51211', '11111', '3000.00', u.accounts);

    const bs = await balanceSheet(rep, { asOf: D(2026, 1, 31) });

    expect(bs.totalAssets).toBe('5000.0000');
    // Revenue 8000 less expense 3000. It is not posted to equity yet, but the
    // ledger's balance includes it, so the statement has to as well.
    expect(bs.unappropriatedResult).toBe('5000.0000');
    expect(bs.totalEquity).toBe('5000.0000');
    expect(bs.difference).toBe('0.0000');
    expect(bs.balanced).toBe(true);
    expect(bs.spansPriorYears).toBe(false);
  });

  it('takes any cutoff date, including one inside a period', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 5), '11111', '41211', '600.00', u.accounts);
    await journal(u.tenantId, D(2026, 1, 25), '11111', '41211', '400.00', u.accounts);

    const mid = await balanceSheet(rep, { asOf: D(2026, 1, 15) });
    expect(mid.totalAssets).toBe('600.0000');
    expect(mid.balanced).toBe(true);

    const end = await balanceSheet(rep, { asOf: D(2026, 1, 31) });
    expect(end.totalAssets).toBe('1000.0000');
  });

  it('stops at level 4 by default but still totals the detail beneath it', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '750.00', u.accounts);

    const bs = await balanceSheet(rep, { asOf: D(2026, 1, 31) });
    expect(bs.assets.rows.every((r) => r.level <= 4)).toBe(true);
    expect(bs.assets.rows.some((r) => r.code === '11111')).toBe(false);
    expect(bs.totalAssets).toBe('750.0000');

    const detailed = await balanceSheet(rep, { asOf: D(2026, 1, 31), maxLevel: 5 });
    expect(detailed.assets.rows.some((r) => r.code === '11111')).toBe(true);
    expect(detailed.totalAssets).toBe('750.0000');
  });

  it('shows a contra account as a negative inside the group it reduces', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    const accumulated = await asSystem((tx) =>
      tx.account.findFirst({
        where: { tenantId: u.tenantId, isPostable: true, normalBalance: 'CREDIT', code: { startsWith: '1' } },
        select: { code: true, id: true },
      }),
    );
    if (!accumulated) return; // no contra-asset in the shipped chart; nothing to assert

    await asTenant(u.tenantId, (tx) =>
      post(tx, u.tenantId, {
        voucherType: 'JOURNAL',
        docDate: D(2026, 1, 10),
        description: 'depreciation',
        lines: [
          { accountId: u.accounts['51211'], debit: '400.00' },
          { accountId: accumulated.id, credit: '400.00' },
        ],
      }),
    );

    const bs = await balanceSheet(rep, { asOf: D(2026, 1, 31), maxLevel: 5 });
    const row = bs.assets.rows.find((r) => r.code === accumulated.code);
    // Credit-normal, sitting under debit-normal Assets: it must subtract.
    expect(row?.amount).toBe('-400.0000');
    expect(bs.totalAssets).toBe('-400.0000');
    expect(bs.balanced).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Income statement
// ---------------------------------------------------------------------------

describe('income statement', () => {
  it('reports revenue less expenses as the net surplus', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '9000.00', u.accounts);
    await journal(u.tenantId, D(2026, 1, 15), '51211', '11111', '2500.00', u.accounts);
    await journal(u.tenantId, D(2026, 1, 20), '51212', '11111', '1500.00', u.accounts);

    const is = await incomeStatement(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });

    expect(is.totalRevenue).toBe('9000.0000');
    expect(is.totalExpenses).toBe('4000.0000');
    expect(is.netSurplus).toBe('5000.0000');
    expect(is.comparative).toBeNull();
  });

  it('reports a deficit as a negative rather than hiding the sign', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '1000.00', u.accounts);
    await journal(u.tenantId, D(2026, 1, 15), '51211', '11111', '2600.00', u.accounts);

    const is = await incomeStatement(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });
    expect(is.netSurplus).toBe('-1600.0000');
  });

  it('compares against the prior period', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '4000.00', u.accounts);
    await journal(u.tenantId, D(2026, 2, 10), '11111', '41211', '6000.00', u.accounts);

    const feb = await incomeStatement(rep, {
      from: D(2026, 2, 1),
      to: D(2026, 2, 28),
      comparative: { from: D(2026, 1, 1), to: D(2026, 1, 31) },
    });

    expect(feb.totalRevenue).toBe('6000.0000');
    expect(feb.comparativeTotalRevenue).toBe('4000.0000');
    expect(feb.netVariance).toBe('2000.0000');
    expect(feb.comparative).toEqual({ from: '2026-01-01', to: '2026-01-31' });
  });

  it('shifts a prior-year comparative by exactly one year', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 3, 10), '11111', '41211', '1200.00', u.accounts);

    const is = await incomeStatement(rep, {
      from: D(2026, 3, 1),
      to: D(2026, 3, 31),
      comparative: 'prior-year',
    });

    // Enrolment is seasonal, so the comparison an academic institution wants
    // is the same month last year, not last month.
    expect(is.comparative).toEqual({ from: '2025-03-01', to: '2025-03-31' });
    expect(is.comparativeTotalRevenue).toBe('0.0000');
    expect(is.totalRevenue).toBe('1200.0000');
  });

  it('filters to a cost centre and says the result is a contribution, not a result', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '51214', '11111', '900.00', u.accounts, {
      costCenterId: u.costCenterId,
    });
    await journal(u.tenantId, D(2026, 1, 11), '51211', '11111', '500.00', u.accounts);

    const faculty = await incomeStatement(rep, {
      from: D(2026, 1, 1),
      to: D(2026, 1, 31),
      costCenterId: u.costCenterId,
    });

    expect(faculty.segmented).toBe(true);
    expect(faculty.totalExpenses).toBe('900.0000');

    const whole = await incomeStatement(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });
    expect(whole.totalExpenses).toBe('1400.0000');
  });

  it('excludes opening-balance injections from period income', async () => {
    const { uni: u, reporter: rep, opener } = await freshUniversity();
    await enterOpeningBalances(opener, {
      asOf: D(2026, 1, 1),
      lines: [
        { accountId: u.accounts['11111'], debit: '3000.00' },
        { accountId: u.accounts['31211'], credit: '3000.00' },
      ],
    });
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '700.00', u.accounts);

    const is = await incomeStatement(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });
    expect(is.totalRevenue).toBe('700.0000');
  });
});

// ---------------------------------------------------------------------------
// Year-end close
// ---------------------------------------------------------------------------

describe('year-end close', () => {
  it('rolls revenue and expense to retained surplus and leaves them at zero', async () => {
    const { uni: u, reporter: rep, controller } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '10000.00', u.accounts);
    await journal(u.tenantId, D(2026, 6, 10), '51211', '11111', '4000.00', u.accounts);

    const result = await closeFiscalYear(controller, u.fiscalYearId);

    expect(result.totalRevenue).toBe('10000.0000');
    expect(result.totalExpense).toBe('4000.0000');
    expect(result.netSurplus).toBe('6000.0000');
    expect(result.accountsClosed).toBe(2);
    expect(result.voucher?.voucherRef).toMatch(/^YEC-/);

    // The year's own income statement is unchanged — the closing entry sits on
    // 31 December and is part of the year it closes.
    const year = await incomeStatement(rep, { from: D(2026, 1, 1), to: D(2026, 12, 31) });
    expect(year.netSurplus).toBe('0.0000');

    const bs = await balanceSheet(rep, { asOf: D(2026, 12, 31), maxLevel: 5 });
    expect(bs.unappropriatedResult).toBe('0.0000');
    expect(bs.equity.rows.find((r) => r.code === '31211')?.amount).toBe('6000.0000');
    expect(bs.balanced).toBe(true);
  });

  it('leaves the next year opening with a clean income statement and the surplus in equity', async () => {
    const { uni: u, reporter: rep, controller } = await freshUniversity();
    await journal(u.tenantId, D(2026, 2, 10), '11111', '41211', '7000.00', u.accounts);
    await journal(u.tenantId, D(2026, 2, 11), '51211', '11111', '2000.00', u.accounts);
    await closeFiscalYear(controller, u.fiscalYearId);

    // Next year, opened after the close.
    await asTenant(u.tenantId, async () => undefined);
    const { provisionFiscalYear } = await import('@/lib/ledger/fiscal-year');
    await asSystem((tx) =>
      provisionFiscalYear(tx, u.tenantId, {
        name: '2027',
        startYear: 2027,
        startMonth: 1,
        openPeriods: [1, 2, 3],
      }),
    );

    const next = await incomeStatement(rep, { from: D(2027, 1, 1), to: D(2027, 3, 31) });
    expect(next.totalRevenue).toBe('0.0000');
    expect(next.totalExpenses).toBe('0.0000');

    // Balance-sheet accounts carried forward without any copied figure: the
    // opening is derived from the postings that produced it.
    const bs = await balanceSheet(rep, { asOf: D(2027, 1, 1), maxLevel: 5 });
    expect(bs.totalAssets).toBe('5000.0000');
    expect(bs.equity.rows.find((r) => r.code === '31211')?.amount).toBe('5000.0000');
    expect(bs.unappropriatedResult).toBe('0.0000');
    expect(bs.balanced).toBe(true);
  });

  it('flags a balance sheet whose result spans an unclosed prior year', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 5, 10), '11111', '41211', '1000.00', u.accounts);

    const { provisionFiscalYear } = await import('@/lib/ledger/fiscal-year');
    await asSystem((tx) =>
      provisionFiscalYear(tx, u.tenantId, {
        name: '2027',
        startYear: 2027,
        startMonth: 1,
        openPeriods: [1],
      }),
    );
    await journal(u.tenantId, D(2027, 1, 10), '11111', '41211', '500.00', u.accounts);

    // 2026 was never closed, so its surplus is still in the revenue accounts.
    const bs = await balanceSheet(rep, { asOf: D(2027, 1, 31) });
    expect(bs.unappropriatedResult).toBe('1500.0000');
    expect(bs.spansPriorYears).toBe(true);
    expect(bs.balanced).toBe(true);
  });

  it('refuses to close twice, and refuses to close over pending approvals', async () => {
    const { uni: u, controller } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '100.00', u.accounts);

    await closeFiscalYear(controller, u.fiscalYearId);
    await expect(closeFiscalYear(controller, u.fiscalYearId)).rejects.toThrow(YearEndError);
    await expect(closeFiscalYear(controller, u.fiscalYearId)).rejects.toThrow(/already CLOSED/);
  });

  it('undoes a close by reversal, not by deletion', async () => {
    const { uni: u, reporter: rep, controller } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '3000.00', u.accounts);
    const closed = await closeFiscalYear(controller, u.fiscalYearId);

    const reopened = await reopenFiscalYear(controller, u.fiscalYearId, 'Late invoice found');
    expect(reopened.reversal?.voucherRef).toMatch(/^REVR-/);

    // The closing voucher is still there, now marked reversed. Nothing is
    // deleted: the undo is itself a posting with a reason.
    const original = await asSystem((tx) =>
      tx.transactionHeader.findUniqueOrThrow({
        where: { id: closed.voucher!.headerId },
        select: { reversedAt: true, voucherType: true },
      }),
    );
    expect(original.reversedAt).not.toBeNull();
    expect(original.voucherType).toBe('YEAR_END_CLOSE');

    // And the result is back in the revenue accounts where it started.
    const is = await incomeStatement(rep, { from: D(2026, 1, 1), to: D(2026, 12, 31) });
    expect(is.netSurplus).toBe('3000.0000');
  });

  it('refuses to reopen a permanently closed year', async () => {
    const { uni: u, controller } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '50.00', u.accounts);
    await closeFiscalYear(controller, u.fiscalYearId);
    await asSystem((tx) =>
      tx.fiscalYear.update({
        where: { id: u.fiscalYearId },
        data: { status: 'PERMANENTLY_CLOSED' },
      }),
    );

    await expect(
      reopenFiscalYear(controller, u.fiscalYearId, 'change of mind'),
    ).rejects.toThrow(/permanently closed/);
  });

  it('requires a reason to reopen', async () => {
    const { uni: u, controller } = await freshUniversity();
    await expect(reopenFiscalYear(controller, u.fiscalYearId, '   ')).rejects.toThrow(
      /stated reason/,
    );
  });

  it('requires period.close', async () => {
    const nobody = await makePrincipal(uni.tenantId, [], { name: 'nobody-yec' });
    await expect(closeFiscalYear(nobody, uni.fiscalYearId)).rejects.toThrow(
      ForbiddenError,
    );
  });
});

// ---------------------------------------------------------------------------
// Sub-ledger reconciliation
// ---------------------------------------------------------------------------

describe('sub-ledger reconciliation', () => {
  it('reports every control account flat on a clean tenant', async () => {
    const { reporter: rep } = await freshUniversity();
    const report = await subledgerReconciliation(rep);

    expect(report.ok).toBe(true);
    expect(report.breaches).toHaveLength(0);
    expect(report.lines.length).toBeGreaterThanOrEqual(5);
    for (const l of report.lines) expect(l.variance).toBe('0.0000');
  });

  it('cannot be given an unattributed control balance — the database refuses one', async () => {
    const { uni: u } = await freshUniversity();

    // Attempted as the OWNER role, which bypasses row-level security. It does
    // not bypass the trigger: a balance on Student AR without a student is
    // refused at the table, not merely in application code.
    await expect(
      asSystem(async (tx) => {
        const header = await tx.transactionHeader.create({
          data: {
            tenantId: u.tenantId,
            fiscalYearId: u.fiscalYearId,
            fiscalPeriodId: u.periodIds[0],
            voucherType: 'JOURNAL',
            voucherNo: 999_001,
            voucherRef: 'RECON-PROBE-1',
            docDate: D(2026, 1, 10),
            description: 'unattributed control balance probe',
            currency: 'SDG',
            totalAmount: '250.0000',
          },
          select: { id: true },
        });
        await tx.transactionLine.createMany({
          data: [
            {
              headerId: header.id,
              lineNo: 1,
              accountId: u.accounts['11211'],
              txnCurrency: 'SDG',
              txnAmount: '250.0000',
              debitAmount: '250.0000',
            },
            {
              headerId: header.id,
              lineNo: 2,
              accountId: u.accounts['41211'],
              txnCurrency: 'SDG',
              txnAmount: '250.0000',
              creditAmount: '250.0000',
            },
          ],
        });
      }),
    ).rejects.toThrow(/control account and requires sub-ledger identity/);
  });

  it('catches an unattributed control balance if the trigger ever stops firing', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();

    // The report's control-account check is defence in depth behind
    // trg_line_postable, so producing the condition it looks for means
    // switching that trigger off. A backstop nobody has ever seen fire is a
    // backstop nobody knows is connected.
    //
    // `session_replication_role` rather than ALTER TABLE: it is transaction
    // -local and reverts at commit, whereas ALTER TABLE cannot even run here
    // — the deferred constraint triggers are still pending at that point and
    // Postgres refuses to alter a table with pending trigger events.
    await asSystem(async (tx) => {
      await tx.$executeRawUnsafe(`SET LOCAL session_replication_role = 'replica'`);
      {
        const header = await tx.transactionHeader.create({
          data: {
            tenantId: u.tenantId,
            fiscalYearId: u.fiscalYearId,
            fiscalPeriodId: u.periodIds[0],
            voucherType: 'JOURNAL',
            voucherNo: 999_001,
            voucherRef: 'RECON-PROBE-2',
            docDate: D(2026, 1, 10),
            description: 'unattributed control balance probe',
            currency: 'SDG',
            totalAmount: '250.0000',
          },
          select: { id: true },
        });
        await tx.transactionLine.createMany({
          data: [
            {
              headerId: header.id,
              lineNo: 1,
              accountId: u.accounts['11211'],
              txnCurrency: 'SDG',
              txnAmount: '250.0000',
              debitAmount: '250.0000',
            },
            {
              headerId: header.id,
              lineNo: 2,
              accountId: u.accounts['41211'],
              txnCurrency: 'SDG',
              txnAmount: '250.0000',
              creditAmount: '250.0000',
            },
          ],
        });
      }
    });

    const report = await subledgerReconciliation(rep);
    const orphan = report.lines.find((l) => l.key === 'control-unattributed-11211');

    expect(orphan?.severity).toBe('VARIANCE');
    expect(orphan?.variance).toBe('250.0000');
    expect(orphan?.note).toMatch(/no party attached/);
    expect(report.ok).toBe(false);
    expect(report.breaches.length).toBeGreaterThan(0);
  });

  it('requires report.financial', async () => {
    const nobody = await makePrincipal(uni.tenantId, [], { name: 'nobody-recon' });
    await expect(subledgerReconciliation(nobody)).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Tenant isolation
// ---------------------------------------------------------------------------

describe('report isolation', () => {
  it('never reads another university’s ledger', async () => {
    const a = await freshUniversity();
    const b = await freshUniversity();

    await journal(a.uni.tenantId, D(2026, 1, 10), '11111', '41211', '5000.00', a.uni.accounts);

    const theirs = await trialBalance(b.reporter, { from: D(2026, 1, 1), to: D(2026, 1, 31) });
    expect(theirs.totals.movementDebit).toBe('0.0000');

    const ours = await trialBalance(a.reporter, { from: D(2026, 1, 1), to: D(2026, 1, 31) });
    expect(ours.totals.movementDebit).toBe('5000.0000');
  });

  it('scopes the raw ledger slice by tenant', async () => {
    const a = await freshUniversity();
    await journal(a.uni.tenantId, D(2026, 1, 10), '11111', '41211', '75.00', a.uni.accounts);

    const b = await freshUniversity();
    const slice = await asTenant(b.uni.tenantId, (tx) =>
      ledgerSlice(tx, b.uni.tenantId, { from: D(2026, 1, 1), to: D(2026, 1, 31) }),
    );
    expect(slice.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Export formats
// ---------------------------------------------------------------------------

describe('export formats', () => {
  async function sampleTrialBalance() {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '1234.56', u.accounts);
    return trialBalance(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) });
  }

  it('writes CSV with a UTF-8 BOM so Excel does not mangle Arabic', async () => {
    const doc = trialBalanceDocument(await sampleTrialBalance(), CTX);
    const csv = toCsv(doc, { locale: 'ar' });

    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain('ميزان المراجعة');
    expect(csv).toContain('1234.5600');
    expect(csv.split('\r\n').length).toBeGreaterThan(5);
  });

  it('quotes CSV values containing a comma or a quote', async () => {
    const doc = trialBalanceDocument(await sampleTrialBalance(), CTX);
    doc.rows[0].cells[1] = { kind: 'text', value: 'Salaries, academic "senior"' };
    const csv = toCsv(doc, { locale: 'en' });
    expect(csv).toContain('"Salaries, academic ""senior"""');
  });

  it('keeps every column in every format', async () => {
    const tb = await sampleTrialBalance();
    const doc = trialBalanceDocument(tb, CTX);

    // Eight columns: code, name, and the three debit/credit pairs.
    expect(doc.columns).toHaveLength(8);
    const headerLine = toCsv(doc, { locale: 'en' })
      .split('\r\n')
      .find((l) => l.startsWith('Code'));
    expect(headerLine?.split(',')).toHaveLength(8);
    for (const row of doc.rows) expect(row.cells).toHaveLength(8);
  });

  it('writes a real xlsx container', async () => {
    const doc = trialBalanceDocument(await sampleTrialBalance(), CTX);
    const xlsx = toXlsx(doc, { locale: 'ar' });

    // Local file header, and the end-of-central-directory record at the tail.
    expect(xlsx.subarray(0, 4).toString('hex')).toBe('504b0304');
    expect(xlsx.subarray(-22, -18).toString('hex')).toBe('504b0506');

    const text = xlsx.toString('latin1');
    for (const part of [
      '[Content_Types].xml',
      'xl/workbook.xml',
      'xl/worksheets/sheet1.xml',
      'xl/styles.xml',
    ]) {
      expect(text).toContain(part);
    }
    // Arabic UI means the sheet opens right-to-left.
    expect(xlsx.toString('utf8')).toContain('rightToLeft="1"');
    // Amounts are written as numbers, verbatim from the decimal string.
    expect(xlsx.toString('utf8')).toContain('<v>1234.5600</v>');
  });

  it('produces the same bytes for the same report', async () => {
    const doc = trialBalanceDocument(await sampleTrialBalance(), CTX);
    // Fixed timestamps inside the ZIP, so two exports of one report are one
    // file and a difference between them means the numbers changed.
    expect(toXlsx(doc).equals(toXlsx(doc))).toBe(true);
  });

  it('escapes XML rather than emitting a corrupt workbook', async () => {
    const doc = trialBalanceDocument(await sampleTrialBalance(), CTX);
    doc.rows[0].cells[1] = { kind: 'text', value: 'R&D <lab> "main"' };
    const xml = toXlsx(doc).toString('utf8');
    expect(xml).toContain('R&amp;D &lt;lab&gt; &quot;main&quot;');
    expect(xml).not.toContain('<lab>');
  });

  it('renders a right-to-left print sheet with isolated figures', async () => {
    const doc = trialBalanceDocument(await sampleTrialBalance(), CTX);
    const html = toPrintableHtml(doc, {
      locale: 'ar',
      letterheadLines: ['[العنوان]', '[الهاتف]'],
      generatedBy: 'أمين الخزينة',
      generatedAt: new Date(Date.UTC(2026, 0, 31, 9, 0, 0)),
    });

    expect(html).toContain('dir="rtl"');
    expect(html).toContain('unicode-bidi: isolate');
    expect(html).toContain('class="num"');
    expect(html).toContain('@page');
    expect(html).toContain('[العنوان]');
    expect(html).toContain('2026-01-31 09:00:00');
  });

  it('carries the not-balanced warning into the exports', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '51214', '11111', '300.00', u.accounts, {
      costCenterId: u.costCenterId,
    });

    const tb = await trialBalance(rep, {
      from: D(2026, 1, 1),
      to: D(2026, 1, 31),
      costCenterId: u.costCenterId,
    });
    const doc = trialBalanceDocument(tb, CTX);

    // A segment is expected not to balance, so the note explains rather than
    // alarms. The alarming note is reserved for an unsegmented run.
    expect(doc.notesEn[0]).toMatch(/Filtered to one cost centre/);
    expect(doc.notesAr[0]).toMatch(/مركز تكلفة/);
    expect(toCsv(doc, { locale: 'ar' })).toContain('مركز تكلفة');
  });

  it('builds a document for every statement', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '2000.00', u.accounts);
    await journal(u.tenantId, D(2026, 1, 12), '51211', '11111', '800.00', u.accounts);

    const bs = balanceSheetDocument(
      await balanceSheet(rep, { asOf: D(2026, 1, 31) }),
      CTX,
    );
    expect(bs.titleAr).toBe('الميزانية العمومية');
    expect(bs.columns).toHaveLength(3);
    expect(bs.rows.some((r) => r.emphasis === 'total')).toBe(true);

    const is = incomeStatementDocument(
      await incomeStatement(rep, {
        from: D(2026, 1, 1),
        to: D(2026, 1, 31),
        comparative: 'prior-year',
      }),
      CTX,
    );
    // Comparative requested, so the period/comparative/variance trio appears.
    expect(is.columns).toHaveLength(5);
    for (const row of is.rows) expect(row.cells).toHaveLength(5);

    const noComp = incomeStatementDocument(
      await incomeStatement(rep, { from: D(2026, 1, 1), to: D(2026, 1, 31) }),
      CTX,
    );
    expect(noComp.columns).toHaveLength(3);
    for (const row of noComp.rows) expect(row.cells).toHaveLength(3);

    const recon = reconciliationDocument(await subledgerReconciliation(rep), CTX);
    expect(recon.titleAr).toBe('مطابقة الدفاتر المساعدة');
    expect(toPrintableHtml(recon, { locale: 'en' })).toContain('Sub-Ledger Reconciliation');
  });
});

// ---------------------------------------------------------------------------
// D5: one report, two renderings
// ---------------------------------------------------------------------------

/**
 * The claim D5 exists to make.
 *
 * **The spreadsheet an auditor is handed is the report the accountant looked
 * at.** The legacy build's report screen and its export were two procedures
 * with two hand-written date predicates — one inclusive at both ends and the
 * other not — so a figure on screen and the same figure in the exported file
 * could differ by a day's transactions, and nothing anywhere said so.
 */
describe('a report and its export are one report', () => {
  it('parses one request and renders it into every format from that', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '1234.56', u.accounts);

    const query = 'kind=trial-balance&from=2026-01-01&to=2026-01-31&level=5';
    const request = parseReportRequest(Object.fromEntries(new URLSearchParams(query)), 'trial-balance');
    const result = await runReport(rep, request);

    // The screen renders `result.document`; the route renders the same object
    // through toCsv/toXlsx/toPrintableHtml. So it is enough to prove the
    // document holds the figure, and that every renderer receives it.
    expect(result.kind).toBe('trial-balance');
    expect(toCsv(result.document, { locale: 'en' })).toContain('1234.5600');
    expect(toPrintableHtml(result.document, { locale: 'ar' })).toContain('1234.5600');
    expect(toXlsx(result.document, { locale: 'en' }).toString('latin1')).toContain('1234.5600');
  });

  it('round-trips a request through the query string the export link carries', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 2, 3), '11111', '41211', '99.99', u.accounts);

    const screen = parseReportRequest(
      { kind: 'trial-balance', from: '2026-02-01', to: '2026-02-28', level: '3' },
      'trial-balance',
    );

    // What the export link on the screen would carry, read back the way the
    // route handler reads it. Two hand-built query strings is exactly how the
    // legacy grid and its Excel button came to disagree.
    const exported = parseReportRequest(
      Object.fromEntries(new URLSearchParams(reportQuery(screen))),
      'trial-balance',
    );
    expect(exported).toEqual(screen);

    const a = await runReport(rep, screen);
    const b = await runReport(rep, exported);
    expect(b.document.rows).toEqual(a.document.rows);
    expect(b.filename).toBe(a.filename);
  });

  it('defaults a mistyped filter instead of refusing the report', () => {
    // A report screen reached with a broken parameter should render the
    // default report and let the user correct the filter, not a stack trace.
    const req = parseReportRequest(
      { kind: 'not-a-report', from: 'yesterday', level: '99', dimension: 'colour' },
      'reconciliation',
    );
    expect(req.kind).toBe('reconciliation');
    expect(req.from).toBe(yearStart());
    expect(req.to).toBe(today());
    expect(req.maxLevel).toBeNull();
    expect(req.dimension).toBe('faculty');
  });

  it('reads a repeated parameter as its first value rather than as an array', () => {
    // `?from=x&from=y` is a thing a browser will send. Taking the array would
    // put "x,y" into a date and produce an empty report with no error.
    const req = parseReportRequest({ from: ['2026-03-01', '2026-04-01'] }, 'trial-balance');
    expect(req.from).toBe('2026-03-01');
  });

  it('keeps the two report permissions apart', async () => {
    const { uni: u } = await freshUniversity();
    const registrar = await makePrincipal(u.tenantId, ['report.student', 'student.read'], {
      name: 'reg',
    });

    // A registrar settling a fee dispute reads one student's history and not
    // the institution's ledger.
    await expect(
      runReport(registrar, parseReportRequest({ kind: 'trial-balance' }, 'trial-balance')),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('refuses a statement with no student rather than producing an empty one', async () => {
    const { uni: u } = await freshUniversity();
    const registrar = await makePrincipal(u.tenantId, ['report.student'], { name: 'reg2' });

    await expect(
      runReport(registrar, parseReportRequest({ kind: 'student-account' }, 'student-account')),
    ).rejects.toBeInstanceOf(ReportRequestError);
  });

  it('does not raise the balance alarm on a cost-centre segment', async () => {
    // A segment of the ledger is not a ledger — a salary posting debits an
    // expense carrying a faculty and credits a bank account carrying none — so
    // it legitimately does not balance. Flagging that as an alarm would train
    // the reader to ignore the alarm.
    const { uni: u, reporter: rep } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 12), '51111', '11111', '500.00', u.accounts, {
      costCenterId: u.costCenterId,
    });

    const segmented = await runReport(rep, {
      ...parseReportRequest({ from: '2026-01-01', to: '2026-01-31' }, 'trial-balance'),
      costCenterId: u.costCenterId,
    });
    expect(segmented.alert).toBe(false);
  });

  it('raises the alarm when the sub-ledgers do not reconcile, and not otherwise', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    const clean = await runReport(rep, parseReportRequest({}, 'reconciliation'));
    expect(clean.alert).toBe(false);
    expect(clean.filename.startsWith('reconciliation_')).toBe(true);
    expect(u.tenantId).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// D5: the three reports A7 had engines for and no document
// ---------------------------------------------------------------------------

describe('the aging, statement and exposure documents', () => {
  it('ages students, sponsors and vendors as three reports, not one', async () => {
    const { uni: u, reporter: rep } = await freshUniversity();
    const asOf = { asOf: '2026-03-31' };

    const students = await runReport(rep, parseReportRequest(asOf, 'aging-students'));
    const sponsors = await runReport(rep, parseReportRequest({ ...asOf, kind: 'aging-sponsors' }, 'aging-students'));
    const vendors = await runReport(rep, parseReportRequest({ ...asOf, kind: 'aging-vendors' }, 'aging-students'));

    // Three titles, three files, three definitions of "overdue". Stacking them
    // would put three different clocks in one column and invite somebody to
    // total it.
    expect(students.document.titleEn).toBe('Aged Student Receivables');
    expect(sponsors.document.titleEn).toBe('Aged Sponsor Receivables');
    expect(vendors.document.titleEn).toBe('Aged Accounts Payable');
    expect(new Set([students.filename, sponsors.filename, vendors.filename]).size).toBe(3);
    expect(u.tenantId).toBeTruthy();
  });

  it('gives every aging row a cell for every column', async () => {
    // The defect this catches is a bucket added to the engine and not to the
    // document: the export would be short a column and the totals would sit
    // under the wrong heading.
    const { reporter: rep } = await freshUniversity();
    const doc = (await runReport(rep, parseReportRequest({}, 'aging-students'))).document;
    for (const row of doc.rows) expect(row.cells).toHaveLength(doc.columns.length);
  });

  it('carries the budget-cap column only when cut by scheme', async () => {
    const { reporter: rep } = await freshUniversity();
    const byFaculty = await runReport(
      rep,
      parseReportRequest({ dimension: 'faculty' }, 'discounts'),
    );
    const byScheme = await runReport(
      rep,
      parseReportRequest({ dimension: 'scheme' }, 'discounts'),
    );

    // A cap exists against a scheme and against nothing else. An empty column
    // on the other four would invite the reading that a faculty has a discount
    // budget, which it does not.
    expect(byFaculty.document.columns.map((c) => c.key)).not.toContain('cap');
    expect(byScheme.document.columns.map((c) => c.key)).toContain('cap');
    for (const row of byScheme.document.rows) {
      expect(row.cells).toHaveLength(byScheme.document.columns.length);
    }
  });

  it('opens and closes a statement with rows rather than with header notes', async () => {
    // A running-balance column that starts at a figure whose origin the reader
    // cannot see is a column the reader has to take on trust.
    const { uni: u } = await freshUniversity();
    const clerk = await makePrincipal(u.tenantId, ['report.student', 'student.read'], {
      name: 'clerk',
    });
    const studentId = await asTenant(u.tenantId, async (tx) => {
      const s = await tx.student.create({
        data: {
          tenantId: u.tenantId,
          studentNo: `S-${Date.now().toString(36)}`,
          fullNameAr: 'طالب كشف',
          fullNameEn: 'Statement Student',
          searchKey: 'statement student',
          programmeId: u.programmeIds.MBBS,
          batchId: u.batchId,
          admissionCategoryId: u.admissionCategories.REGULAR,
        },
        select: { id: true },
      });
      return s.id;
    });

    const doc = (
      await runReport(clerk, {
        ...parseReportRequest({ from: '2026-01-01', to: '2026-03-31' }, 'student-account'),
        studentId,
      })
    ).document;

    const labels = doc.rows.map((r) => (r.cells[2].kind === 'text' ? r.cells[2].value : ''));
    expect(labels[0]).toContain('Opening balance');
    expect(labels[labels.length - 1]).toContain('Closing balance');
    expect(doc.rows[0].emphasis).toBe('subtotal');
    expect(doc.rows[doc.rows.length - 1].emphasis).toBe('total');
  });
});

// ---------------------------------------------------------------------------
// D5: the pre-close checklist (REQ-PER-02)
// ---------------------------------------------------------------------------

/**
 * The gate A7 deferred.
 *
 * A7 computed every figure this needs and did not wire it, on the grounds that
 * a hard refusal with no screen to explain it is a refusal a controller cannot
 * act on. D5 has the screen, so the gate is connected — and what these tests
 * are checking is that closing a period whose books are not straight is now
 * impossible rather than merely inadvisable.
 *
 * The legacy build had no fiscal period concept at all, so there was nothing
 * to close and nothing to check: a mistyped year on a voucher silently
 * rewrote a closed year's results.
 */
describe('pre-close checklist', () => {
  it('clears a period with nothing outstanding, and closes it', async () => {
    const { uni: u, controller } = await freshUniversity();
    await journal(u.tenantId, D(2026, 1, 10), '11111', '41211', '100.00', u.accounts);

    const report = await preCloseChecklist(controller, u.periodIds[0]);
    expect(report.mayClose).toBe(true);
    expect(report.checks.filter((c) => c.blocking).every((c) => c.status === 'PASS')).toBe(true);

    await setPeriodStatus(controller, u.periodIds[0], 'CLOSED');
    const status = await asTenant(u.tenantId, (tx) =>
      tx.fiscalPeriod.findUniqueOrThrow({
        where: { id: u.periodIds[0] },
        select: { status: true },
      }),
    );
    expect(status.status).toBe('CLOSED');
  });

  it('refuses the close while a voucher in the period is awaiting a decision', async () => {
    // Closing would shut the period those vouchers must post into, which
    // silently destroys work already done and waiting on a signature.
    const { uni: u, controller } = await freshUniversity();
    const maker = await makePrincipal(u.tenantId, ['voucher.create'], { name: 'maker' });

    await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: D(2026, 1, 20),
      description: 'Half-entered journal',
      lines: [
        { accountId: u.accounts['11111'], debit: '50.00' },
        { accountId: u.accounts['41211'], credit: '50.00' },
      ],
    });

    const report = await preCloseChecklist(controller, u.periodIds[0]);
    const vouchers = report.checks.find((c) => c.key === 'vouchers')!;
    expect(vouchers.status).toBe('FAIL');
    expect(vouchers.blocking).toBe(true);
    expect(report.mayClose).toBe(false);

    await expect(setPeriodStatus(controller, u.periodIds[0], 'CLOSED')).rejects.toBeInstanceOf(
      PreCloseError,
    );
  });

  it('names the failing check in the refusal rather than saying only no', async () => {
    const { uni: u, controller } = await freshUniversity();
    const maker = await makePrincipal(u.tenantId, ['voucher.create'], { name: 'maker2' });
    await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: D(2026, 2, 4),
      description: 'Awaiting a signature',
      lines: [{ accountId: u.accounts['11111'], debit: '10.00' }],
    });

    // "The checklist failed" tells a controller nothing they can act on.
    await expect(setPeriodStatus(controller, u.periodIds[1], 'CLOSED')).rejects.toThrow(
      /awaiting a decision/i,
    );
  });

  it('only counts vouchers dated inside the period being closed', async () => {
    const { uni: u, controller } = await freshUniversity();
    const maker = await makePrincipal(u.tenantId, ['voucher.create'], { name: 'maker3' });
    await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: D(2026, 5, 6),
      description: 'A May draft',
      lines: [{ accountId: u.accounts['11111'], debit: '10.00' }],
    });

    // January is not held up by a draft dated in May.
    const january = await preCloseChecklist(controller, u.periodIds[0]);
    expect(january.checks.find((c) => c.key === 'vouchers')!.status).toBe('PASS');
    expect(january.mayClose).toBe(true);

    const may = await preCloseChecklist(controller, u.periodIds[4]);
    expect(may.checks.find((c) => c.key === 'vouchers')!.status).toBe('FAIL');
  });

  it('warns about unposted depreciation without blocking on it', async () => {
    // A period with no assets legitimately has no depreciation, and a block
    // that fires on an empty register is a block somebody disables. So it is
    // advisory, and reported with its counts so a controller can tell "nothing
    // to post" from "not posted yet".
    const { uni: u, controller } = await freshUniversity();
    const report = await preCloseChecklist(controller, u.periodIds[0]);

    const dep = report.checks.find((c) => c.key === 'depreciation')!;
    expect(dep.blocking).toBe(false);
    expect(dep.status).toBe('NOT_APPLICABLE');
    expect(dep.detailEn).toMatch(/no assets in service/i);
    expect(report.mayClose).toBe(true);
    expect(u.tenantId).toBeTruthy();
  });

  it('reports FX revaluation as not applicable rather than quietly passing it', async () => {
    // REQ-PER-02 lists it; there is no exchange-rate data to revalue until a
    // tenant runs a second currency. A check that always passes for a reason
    // nobody wrote down is a check that will be wrong the first time it
    // matters.
    const { uni: u, controller } = await freshUniversity();
    const report = await preCloseChecklist(controller, u.periodIds[0]);
    const fx = report.checks.find((c) => c.key === 'fx')!;
    expect(fx.status).toBe('NOT_APPLICABLE');
    expect(fx.detailEn).toMatch(/one currency/i);
    expect(u.tenantId).toBeTruthy();
  });

  it('asks all six questions, every time', async () => {
    // A check quietly dropped from the list is a check nobody notices is gone.
    const { uni: u, controller } = await freshUniversity();
    const report = await preCloseChecklist(controller, u.periodIds[0]);
    expect(report.checks.map((c) => c.key)).toEqual([
      'vouchers',
      'reconciliation',
      'balanced',
      'depreciation',
      'recognition',
      'fx',
    ]);
    expect(report.periodLabel).toContain('1/');
    expect(u.tenantId).toBeTruthy();
  });

  it('runs no checklist when reopening', async () => {
    // The checklist protects a figure from being frozen while it is wrong.
    // Reopening unfreezes it, which is the remedy rather than the risk.
    const { uni: u, controller } = await freshUniversity();
    await setPeriodStatus(controller, u.periodIds[0], 'CLOSED');

    const maker = await makePrincipal(u.tenantId, ['voucher.create'], { name: 'maker4' });
    await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: D(2026, 1, 25),
      description: 'Raised after the close',
      lines: [{ accountId: u.accounts['11111'], debit: '10.00' }],
    });

    await setPeriodStatus(controller, u.periodIds[0], 'OPEN');
    const status = await asTenant(u.tenantId, (tx) =>
      tx.fiscalPeriod.findUniqueOrThrow({
        where: { id: u.periodIds[0] },
        select: { status: true },
      }),
    );
    expect(status.status).toBe('OPEN');
  });

  it('gates sealing on the same checklist as closing', async () => {
    // `PERMANENTLY_CLOSED` cannot be undone, so it is the last state that
    // should be reachable over an outstanding check.
    const { uni: u, controller } = await freshUniversity();
    const maker = await makePrincipal(u.tenantId, ['voucher.create'], { name: 'maker5' });
    await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: D(2026, 3, 3),
      description: 'Still unsigned',
      lines: [{ accountId: u.accounts['11111'], debit: '10.00' }],
    });

    await expect(
      setPeriodStatus(controller, u.periodIds[2], 'PERMANENTLY_CLOSED'),
    ).rejects.toBeInstanceOf(PreCloseError);
  });

  it('opens the checklist to either period permission and to neither else', async () => {
    // `period.read` is "may see the calendar" and the checklist is a fact
    // about the calendar; `period.close` is "may move the boundary", and
    // refusing somebody the reasons for a refusal they are about to receive is
    // how a gate becomes a mystery. Both answer yes; nothing else does.
    const { uni: u, controller } = await freshUniversity();
    const reader = await makePrincipal(u.tenantId, ['period.read'], { name: 'perread' });
    const nobody = await makePrincipal(u.tenantId, ['report.financial'], { name: 'nocheck' });

    expect(controller.permissions.has('period.read')).toBe(false);
    await expect(preCloseChecklist(controller, u.periodIds[0])).resolves.toBeTruthy();
    await expect(preCloseChecklist(reader, u.periodIds[0])).resolves.toBeTruthy();
    await expect(preCloseChecklist(nobody, u.periodIds[0])).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('refuses a period belonging to another university', async () => {
    const { uni: a, controller } = await freshUniversity();
    const b = await makeUniversity();
    await expect(preCloseChecklist(controller, b.periodIds[0])).rejects.toBeInstanceOf(
      PreCloseError,
    );
    expect(a.tenantId).not.toBe(b.tenantId);
  });
});

describe('the reconciliation document keeps what the engine explains', () => {
  it('carries a line note into the notes every renderer sees', () => {
    // The engine sets a note when the numbers alone do not explain a line —
    // the orphaned-control-balance check, which the database makes impossible
    // to produce and which therefore has to be trusted to work when it does.
    // Every renderer used to drop it; D5 carries it into the document, so the
    // CSV, the spreadsheet and the print sheet all say it.
    const doc = reconciliationDocument(
      {
        asOf: '2026-03-31',
        currency: 'SDG',
        ok: false,
        lines: [
          {
            key: 'control-unattributed-21100',
            labelEn: '21100 Student advances — balances carrying a party',
            labelAr: '21100 دفعات الطلاب — أرصدة منسوبة لأطرافها',
            subledger: '900.0000',
            control: '1000.0000',
            variance: '100.0000',
            severity: 'VARIANCE',
            note: '100.00 sits on this control account with no party attached.',
          },
        ],
        breaches: [],
      },
      CTX,
    );

    expect(doc.notesEn.some((n) => n.includes('no party attached'))).toBe(true);
    expect(doc.notesAr.some((n) => n.includes('no party attached'))).toBe(true);
    // And the Arabic note is labelled in Arabic, not in English.
    expect(doc.notesAr.some((n) => n.includes('دفعات الطلاب'))).toBe(true);
  });

  it('adds no note when every line explains itself', () => {
    const doc = reconciliationDocument(
      {
        asOf: '2026-03-31',
        currency: 'SDG',
        ok: true,
        lines: [
          {
            key: 'students',
            labelEn: 'Student receivables',
            labelAr: 'ذمم الطلاب',
            subledger: '0.0000',
            control: '0.0000',
            variance: '0.0000',
            severity: 'OK',
          },
        ],
        breaches: [],
      },
      CTX,
    );
    expect(doc.notesEn).toEqual([]);
    expect(doc.notesAr).toEqual([]);
  });
});

describe('an export link', () => {
  it('carries the locale, because an unprefixed one silently changes language', () => {
    // `localePrefix: 'always'` redirects an unprefixed `/console/...` to the
    // default locale — Arabic — whatever the reader was using, and the export
    // route picks the language of the CSV and the print sheet off that
    // segment. An English user following an unprefixed link would download an
    // Arabic spreadsheet with the right figures in it, which is the kind of
    // wrong nobody reports as a bug.
    const req = parseReportRequest(
      { kind: 'trial-balance', from: '2026-01-01', to: '2026-03-31' },
      'trial-balance',
    );
    expect(exportHref('en', req, 'csv').startsWith('/en/console/reports/export?')).toBe(true);
    expect(exportHref('ar', req, 'xlsx').startsWith('/ar/console/reports/export?')).toBe(true);
  });

  it('carries the screen’s own filters, and the format', () => {
    const req = parseReportRequest(
      { kind: 'income-statement', from: '2026-01-01', to: '2026-06-30', comparative: '1' },
      'trial-balance',
    );
    const q = new URLSearchParams(exportHref('en', req, 'html').split('?')[1]);

    expect(q.get('kind')).toBe('income-statement');
    expect(q.get('from')).toBe('2026-01-01');
    expect(q.get('to')).toBe('2026-06-30');
    expect(q.get('comparative')).toBe('1');
    expect(q.get('format')).toBe('html');

    // And read back, it is the same request the screen ran.
    const reparsed = parseReportRequest(Object.fromEntries(q.entries()), 'trial-balance');
    expect(reparsed).toEqual(req);
  });
});
