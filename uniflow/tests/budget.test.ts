import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import {
  approveBudget,
  BudgetError,
  draftBudget,
  listBudgets,
  rejectBudget,
  reviseBudget,
  submitBudget,
} from '@/lib/budget/budget';
import {
  budgetPosition,
  budgetVariance,
  BudgetExceededError,
  checkBudget,
} from '@/lib/budget/control';
import { openCommitments, reconcileEncumbrances } from '@/lib/budget/encumbrance';
import { SelfApprovalError } from '@/lib/auth/rbac';
import { findSodViolations } from '@/lib/auth/permissions';
import { withTenant } from '@/lib/db/client';
import { testDb } from './helpers';
import { sum } from '@/lib/money';
import type { Principal } from '@/lib/auth/rbac';

/**
 * Budget preparation, versioning and budgetary control (SRS Module 8).
 *
 * The legacy baseline this is measured against: `AccBudget` keyed lines on
 * four *text* account names over free-form date ranges, with no uniqueness,
 * no versions, no approval and nothing anywhere that consulted it before
 * money was committed.
 */

const JAN = new Date(Date.UTC(2026, 0, 15));
const FEB = new Date(Date.UTC(2026, 1, 15));

let uni: University;

beforeAll(async () => {
  uni = await makeUniversity();
});

afterAll(disconnectAll);

/** A fresh university per test that mutates budget state, so version numbers
 *  and the one-approved-version index do not leak between cases. */
async function freshUniversity() {
  const u = await makeUniversity();
  const prep = await makePrincipal(u.tenantId, ['budget.manage', 'budget.read'], {
    name: 'prep',
  });
  const appr = await makePrincipal(u.tenantId, ['budget.approve', 'budget.read'], {
    name: 'appr',
  });
  return { u, prep, appr };
}

describe('budget preparation', () => {
  it('spreads an unphased line evenly across the year with no residue', async () => {
    const { u, prep } = await freshUniversity();

    const budget = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Original 2026',
      lines: [
        { accountId: u.accounts['51211'], annualAmount: '100000' },
      ],
    });

    expect(budget.versionNo).toBe(1);
    expect(budget.total).toBe('100000.0000');

    const allocations = await asSystem((tx) =>
      tx.budgetPeriodAllocation.findMany({
        where: { tenantId: u.tenantId },
        select: { amount: true },
      }),
    );
    expect(allocations).toHaveLength(12);

    // 100000 / 12 does not divide. The residue has to land somewhere, and it
    // lands on the first period — the same discipline as an instalment plan,
    // and for the same reason: a schedule that sums to 99999.99 leaves a
    // hundredth nothing ever accounts for.
    //
    // Summed as Decimal, never through Number. A test that reduces money with
    // `+` reintroduces exactly the floating-point error the product exists to
    // prevent, and would pass here by luck rather than by correctness.
    expect(sum(allocations.map((a) => a.amount)).toFixed(4)).toBe('100000.0000');
  });

  it('refuses a phasing that does not sum to the annual allocation', async () => {
    const { u, prep } = await freshUniversity();

    await expect(
      draftBudget(prep, {
        fiscalYearId: u.fiscalYearId,
        label: 'Bad phasing',
        lines: [
          {
            accountId: u.accounts['51211'],
            annualAmount: '120000',
            periodAmounts: Array.from({ length: 12 }, () => '9000'),
          },
        ],
      }),
    ).rejects.toThrow(/sum to its annual amount/i);
  });

  it('refuses two lines for the same account and cost centre', async () => {
    const { u, prep } = await freshUniversity();

    await expect(
      draftBudget(prep, {
        fiscalYearId: u.fiscalYearId,
        label: 'Doubled',
        lines: [
          { accountId: u.accounts['51211'], annualAmount: '50000' },
          { accountId: u.accounts['51211'], annualAmount: '50000' },
        ],
      }),
    ).rejects.toThrow(/two budget lines/i);
  });

  it('refuses a budget on a heading account', async () => {
    const { u, prep } = await freshUniversity();

    await expect(
      draftBudget(prep, {
        fiscalYearId: u.fiscalYearId,
        label: 'On a heading',
        // 5121 is a level-4 parent; spending lands on 51211 and 51212.
        lines: [{ accountId: u.accounts['5121'], annualAmount: '50000' }],
      }),
    ).rejects.toThrow(/heading/i);
  });

  it('refuses an account that requires a cost centre without one', async () => {
    const { u, prep } = await freshUniversity();

    await expect(
      draftBudget(prep, {
        fiscalYearId: u.fiscalYearId,
        label: 'No cost centre',
        lines: [{ accountId: u.accounts['51214'], annualAmount: '20000' }],
      }),
    ).rejects.toThrow(/requires a cost centre/i);
  });
});

describe('budget versions and approval', () => {
  it('refuses approval by the person who prepared it', async () => {
    const { u, prep } = await freshUniversity();

    const budget = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Original',
      lines: [{ accountId: u.accounts['51211'], annualAmount: '10000' }],
    });
    await submitBudget(prep, budget.budgetId);

    // The SoD matrix would refuse a *role* holding both permissions, but it
    // cannot see a role edited after the draft was made, or two clean roles
    // held by one person. This check is against the actual preparer of the
    // actual document, which is the case the matrix cannot reach.
    const selfApprover: Principal = {
      ...prep,
      permissions: new Set([...prep.permissions, 'budget.approve' as const]),
    };
    await expect(approveBudget(selfApprover, budget.budgetId)).rejects.toThrow(
      SelfApprovalError,
    );

    // Anybody else may.
    const other = await makePrincipal(u.tenantId, ['budget.approve'], { name: 'other' });
    await expect(approveBudget(other, budget.budgetId)).resolves.toBeDefined();
  });

  it('supersedes the version in force when a new one is approved', async () => {
    const { u, prep, appr } = await freshUniversity();

    const v1 = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Original',
      lines: [{ accountId: u.accounts['51211'], annualAmount: '10000' }],
    });
    await submitBudget(prep, v1.budgetId);
    await approveBudget(appr, v1.budgetId);

    const v2 = await reviseBudget(prep, u.fiscalYearId, 'Revised');
    expect(v2.versionNo).toBe(2);
    // The revision starts from what was approved rather than a blank page.
    expect(v2.total).toBe('10000.0000');

    await submitBudget(prep, v2.budgetId);
    const outcome = await approveBudget(appr, v2.budgetId);
    expect(outcome.supersededVersionNo).toBe(1);

    const versions = await listBudgets(prep, u.fiscalYearId);
    expect(versions.map((v) => [v.versionNo, v.status])).toEqual([
      [2, 'APPROVED'],
      [1, 'SUPERSEDED'],
    ]);
  });

  it('refuses to edit the lines of a version that has left DRAFT', async () => {
    const { u, prep, appr } = await freshUniversity();

    const v1 = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Original',
      lines: [{ accountId: u.accounts['51211'], annualAmount: '10000' }],
    });
    await submitBudget(prep, v1.budgetId);
    await approveBudget(appr, v1.budgetId);

    // The approved budget is the authority every availability check has been
    // measured against. Editing it in place would silently restate decisions
    // already taken, so the database refuses.
    await expect(
      asSystem((tx) =>
        tx.budgetLine.updateMany({
          where: { budgetId: v1.budgetId },
          data: { annualAmount: '999999' },
        }),
      ),
    ).rejects.toThrow(/revise it by creating a new version/i);
  });

  it('records the reason on a rejection', async () => {
    const { u, prep, appr } = await freshUniversity();

    const v1 = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Too optimistic',
      lines: [{ accountId: u.accounts['51211'], annualAmount: '10000' }],
    });
    await submitBudget(prep, v1.budgetId);
    await expect(rejectBudget(appr, v1.budgetId, '')).rejects.toThrow(BudgetError);
    await rejectBudget(appr, v1.budgetId, 'Utilities allocation is below last year actual.');

    const row = await asSystem((tx) =>
      tx.budget.findUniqueOrThrow({
        where: { id: v1.budgetId },
        select: { status: true, decisionNote: true },
      }),
    );
    expect(row.status).toBe('REJECTED');
    expect(row.decisionNote).toMatch(/below last year actual/);
  });
});

describe('budgetary control', () => {
  it('reports allocated, encumbered, actual and available', async () => {
    const { u, prep, appr } = await freshUniversity();

    const v1 = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Original',
      lines: [{ accountId: u.accounts['51211'], annualAmount: '60000' }],
    });
    await submitBudget(prep, v1.budgetId);
    await approveBudget(appr, v1.budgetId);

    const position = await withTenant(
      u.tenantId,
      (tx) => budgetPosition(tx, u.tenantId, u.accounts['51211'], null, JAN),
      {},
      testDb,
    );

    expect(position.allocated).toBe('60000.0000');
    expect(position.encumbered).toBe('0.0000');
    expect(position.actual).toBe('0.0000');
    expect(position.available).toBe('60000.0000');
    expect(position.budgeted).toBe(true);
  });

  it('releases only the periods up to the document date under CUMULATIVE_TO_PERIOD', async () => {
    const { u, prep, appr } = await freshUniversity();

    const v1 = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Phased',
      controlBasis: 'CUMULATIVE_TO_PERIOD',
      lines: [
        {
          accountId: u.accounts['51211'],
          annualAmount: '120000',
          periodAmounts: Array.from({ length: 12 }, () => '10000'),
        },
      ],
    });
    await submitBudget(prep, v1.budgetId);
    await approveBudget(appr, v1.budgetId);

    const jan = await withTenant(
      u.tenantId,
      (tx) => budgetPosition(tx, u.tenantId, u.accounts['51211'], null, JAN),
      {},
      testDb,
    );
    const feb = await withTenant(
      u.tenantId,
      (tx) => budgetPosition(tx, u.tenantId, u.accounts['51211'], null, FEB),
      {},
      testDb,
    );

    // A department cannot spend December's money in January. This is the
    // control the legacy free-form date range could not express at all.
    expect(jan.allocated).toBe('10000.0000');
    expect(feb.allocated).toBe('20000.0000');
  });

  it('blocks an overrun on a BLOCK line and permits one on a WARN line', async () => {
    const { u, prep, appr } = await freshUniversity();

    const v1 = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Mixed policy',
      lines: [
        { accountId: u.accounts['51211'], annualAmount: '1000', policy: 'BLOCK' },
        { accountId: u.accounts['51212'], annualAmount: '1000', policy: 'WARN' },
        { accountId: u.accounts['51213'], annualAmount: '1000', policy: 'ADVISORY' },
      ],
    });
    await submitBudget(prep, v1.budgetId);
    await approveBudget(appr, v1.budgetId);

    await withTenant(
      u.tenantId,
      async (tx) => {
        await expect(
          checkBudget(tx, u.tenantId, u.accounts['51211'], null, '1500', JAN, '51211'),
        ).rejects.toThrow(BudgetExceededError);

        const warned = await checkBudget(
          tx,
          u.tenantId,
          u.accounts['51212'],
          null,
          '1500',
          JAN,
          '51212',
        );
        expect(warned.ok).toBe(true);
        expect(warned.warning).toMatch(/over budget by 500/i);

        const advisory = await checkBudget(
          tx,
          u.tenantId,
          u.accounts['51213'],
          null,
          '1500',
          JAN,
          '51213',
        );
        expect(advisory.ok).toBe(true);
        expect(advisory.warning).toBeNull();
      },
      {},
      testDb,
    );
  });

  it('does not block an account no approved budget covers, and says so', async () => {
    const { u, prep, appr } = await freshUniversity();

    const v1 = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Partial coverage',
      lines: [{ accountId: u.accounts['51211'], annualAmount: '1000' }],
    });
    await submitBudget(prep, v1.budgetId);
    await approveBudget(appr, v1.budgetId);

    // A budget covering only some accounts is the normal state in year one.
    // Refusing everything it does not mention would make the control
    // unusable exactly when it is being adopted, so it reports instead.
    const check = await withTenant(
      u.tenantId,
      (tx) => checkBudget(tx, u.tenantId, u.accounts['51212'], null, '999999', JAN, '51212'),
      {},
      testDb,
    );
    expect(check.ok).toBe(true);
    expect(check.position.budgeted).toBe(false);
  });

  it('produces a variance report with every column the legacy one could not', async () => {
    const { u, prep, appr } = await freshUniversity();

    const v1 = await draftBudget(prep, {
      fiscalYearId: u.fiscalYearId,
      label: 'Original',
      lines: [
        { accountId: u.accounts['51211'], annualAmount: '60000' },
        { accountId: u.accounts['51212'], annualAmount: '40000' },
      ],
    });
    await submitBudget(prep, v1.budgetId);
    await approveBudget(appr, v1.budgetId);

    const rows = await budgetVariance(prep, u.fiscalYearId);
    expect(rows).toHaveLength(2);
    expect(rows[0].accountCode).toBe('51211');
    expect(rows[0].allocated).toBe('60000.0000');
    // Encumbered is the column the legacy report had no source for, and
    // without it Available would have been wrong rather than missing.
    expect(rows[0].encumbered).toBe('0.0000');
    expect(rows[0].utilisation).toBe('0.00');
  });

  it('returns nothing at all when no budget has been approved', async () => {
    const { u, prep } = await freshUniversity();
    await expect(budgetVariance(prep, u.fiscalYearId)).resolves.toEqual([]);
    await expect(openCommitments(prep, u.fiscalYearId)).resolves.toEqual([]);
    await expect(reconcileEncumbrances(prep, u.fiscalYearId)).resolves.toEqual([]);
  });
});

describe('segregation of duties', () => {
  it('will not let one role prepare and approve a budget', () => {
    const violations = findSodViolations(['budget.manage', 'budget.approve']);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toMatch(/other than the person who prepared/i);
  });

  it('refuses a budget action to someone without the permission', async () => {
    const nobody = await makePrincipal(uni.tenantId, [], { name: 'nobody' });
    await expect(
      draftBudget(nobody, {
        fiscalYearId: uni.fiscalYearId,
        label: 'x',
        lines: [{ accountId: uni.accounts['51211'], annualAmount: '1' }],
      }),
    ).rejects.toThrow(/Not permitted: budget.manage/);
  });
});
