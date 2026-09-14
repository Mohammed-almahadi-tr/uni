import 'server-only';
import type { BudgetPolicy } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { resolvePeriod } from '@/lib/ledger/period';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';

/**
 * Budgetary control (SRS REQ-BDG-02, REQ-BDG-03).
 *
 *     available = allocated − encumbered − actual
 *
 * Three numbers from three places, and the reason this module exists is that
 * the legacy system had only the first two words of that sentence. `AccBudget`
 * held an allocation; `dbo.GetAccAmount` summed the ledger; and `frmBudget`
 * printed them side by side in a Crystal report. Nothing consulted either
 * figure at the moment somebody committed to spending. It was a report you
 * looked at *after* you had overspent, and there was no encumbrance at all —
 * an approved purchase order for 400,000 was invisible to it until the
 * invoice arrived, by which point refusing it meant breaking a contract.
 *
 * Definitions used here, stated because the words are used loosely elsewhere:
 *
 *   allocated  — the approved budget line, whole-year or cumulative to the
 *                period, depending on the version's control basis.
 *   encumbered — approved purchase orders, less what has been received. A
 *                claim on spending authority, not a transaction: it is
 *                deliberately absent from the general ledger (see the
 *                `Encumbrance` model).
 *   actual     — posted debits less credits on the account, from
 *                `account_period_balances`. Credits are netted because a
 *                reversal of an expense genuinely gives the budget back.
 */

export interface BudgetPosition {
  budgetLineId: string | null;
  accountId: string;
  costCenterId: string | null;
  allocated: string;
  encumbered: string;
  actual: string;
  available: string;
  /** Allocated ≠ 0 → actual+encumbered as a percentage of it. */
  utilisation: string;
  policy: BudgetPolicy;
  /** False when no approved budget covers this account × cost centre. */
  budgeted: boolean;
}

export class BudgetExceededError extends Error {
  constructor(
    readonly accountCode: string,
    readonly available: Money,
    readonly requested: Money,
  ) {
    super(
      `Budget exceeded on account ${accountCode}: ${available.toFixed(2)} available, ` +
        `${requested.toFixed(2)} requested (over by ${requested.minus(available).toFixed(2)}).`,
    );
    this.name = 'BudgetExceededError';
  }
}

export interface BudgetCheckResult {
  position: BudgetPosition;
  /** True when the commitment fits. */
  ok: boolean;
  /** Set when the line's policy is WARN and the commitment does not fit —
   *  allowed, but the caller is expected to surface this. */
  warning: string | null;
}

/**
 * What one account × cost centre looks like against its budget on a given
 * date.
 *
 * The date matters twice: it selects the fiscal year whose budget applies,
 * and — under CUMULATIVE_TO_PERIOD — it decides how much of the year's
 * allocation has been released.
 */
export async function budgetPosition(
  tx: Tx,
  tenantId: string,
  accountId: string,
  costCenterId: string | null,
  onDate: Date,
): Promise<BudgetPosition> {
  const period = await resolvePeriod(tx, tenantId, onDate);

  const budget = await tx.budget.findFirst({
    where: { tenantId, fiscalYearId: period.fiscalYearId, status: 'APPROVED' },
    select: { id: true, controlBasis: true },
  });

  const line = budget
    ? await tx.budgetLine.findFirst({
        where: { budgetId: budget.id, accountId, costCenterId },
        select: { id: true, annualAmount: true, policy: true },
      })
    : null;

  // Allocated.
  let allocated: Money = ZERO;
  if (line && budget) {
    if (budget.controlBasis === 'ANNUAL') {
      allocated = line.annualAmount;
    } else {
      // Cumulative: everything phased into periods up to and including this
      // one. A department cannot spend December's money in January.
      const seq = await tx.fiscalPeriod.findUniqueOrThrow({
        where: { id: period.fiscalPeriodId },
        select: { seq: true },
      });
      const rows = await tx.budgetPeriodAllocation.findMany({
        where: {
          budgetLineId: line.id,
          fiscalPeriod: { fiscalYearId: period.fiscalYearId, seq: { lte: seq.seq } },
        },
        select: { amount: true },
      });
      allocated = sum(rows.map((r) => r.amount));
    }
  }

  // Encumbered: what approved orders still commit. `amount - released` rather
  // than a status filter, because a partially received order is still holding
  // back the part that has not arrived.
  const encumbrances = line
    ? await tx.encumbrance.findMany({
        where: { tenantId, budgetLineId: line.id, status: 'OPEN' },
        select: { amount: true, releasedAmount: true },
      })
    : [];
  const encumbered = sum(encumbrances.map((e) => e.amount.minus(e.releasedAmount)));

  // Actual: posted movement on the account within the fiscal year. Read from
  // the maintained aggregates rather than from the lines, for the same reason
  // the trial balance does — SUM() over a million rows is not a check you can
  // afford to run on every purchase order.
  const balances = await tx.accountPeriodBalance.findMany({
    where: {
      tenantId,
      accountId,
      costCenterId,
      fiscalPeriod: { fiscalYearId: period.fiscalYearId },
    },
    select: { movementDebit: true, movementCredit: true },
  });
  const actual = sum(balances.map((b) => b.movementDebit.minus(b.movementCredit)));

  const available = allocated.minus(encumbered).minus(actual);
  const consumed = encumbered.plus(actual);
  const utilisation = allocated.isZero()
    ? ZERO
    : consumed.dividedBy(allocated).times(100).toDecimalPlaces(2);

  return {
    budgetLineId: line?.id ?? null,
    accountId,
    costCenterId,
    allocated: allocated.toFixed(4),
    encumbered: encumbered.toFixed(4),
    actual: actual.toFixed(4),
    available: available.toFixed(4),
    utilisation: utilisation.toFixed(2),
    policy: line?.policy ?? 'ADVISORY',
    budgeted: line !== null,
  };
}

/**
 * Would committing `amount` fit?
 *
 * Called before a purchase order is approved and before a payment is
 * released. The policy on the line decides what happens when it does not
 * fit — per line, because a hard stop on stationery and a hard stop on
 * emergency roof repairs are not the same decision, and a system that
 * cannot express the difference gets its control switched off entirely.
 *
 * An unbudgeted account does not block. That is deliberate: a budget covering
 * only some accounts is the normal state in the first year, and refusing
 * everything it does not mention would make the feature unusable exactly when
 * it is being adopted. It is reported as `budgeted: false` instead, which is
 * a thing the variance report can show.
 */
export async function checkBudget(
  tx: Tx,
  tenantId: string,
  accountId: string,
  costCenterId: string | null,
  amount: MoneyInput,
  onDate: Date,
  accountCode: string,
): Promise<BudgetCheckResult> {
  const position = await budgetPosition(tx, tenantId, accountId, costCenterId, onDate);
  const requested = toStorage(amount);
  const available = toStorage(position.available);

  if (!position.budgeted || requested.lessThanOrEqualTo(available)) {
    return { position, ok: true, warning: null };
  }

  const over = requested.minus(available);

  if (position.policy === 'BLOCK') {
    throw new BudgetExceededError(accountCode, available, requested);
  }
  if (position.policy === 'WARN') {
    return {
      position,
      ok: true,
      warning:
        `Account ${accountCode} is over budget by ${over.toFixed(2)}: ` +
        `${available.toFixed(2)} available, ${requested.toFixed(2)} committed.`,
    };
  }
  return { position, ok: true, warning: null };
}

export interface VarianceRow extends BudgetPosition {
  accountCode: string;
  accountName: string;
  costCenterCode: string | null;
  variance: string;
}

/**
 * Budget versus actual for a whole fiscal year (SRS REQ-BDG-03).
 *
 * Every column the legacy Crystal report had, plus the two it could not have:
 * Encumbered, because nothing produced it, and Available, because without
 * encumbrance it would have been wrong.
 */
export async function budgetVariance(
  principal: Principal,
  fiscalYearId: string,
  opts: { onDate?: Date } = {},
): Promise<VarianceRow[]> {
  requirePermission(principal, 'budget.read');
  const { tenantId } = principal;

  return withTenant(tenantId, async (tx) => {
    const budget = await tx.budget.findFirst({
      where: { tenantId, fiscalYearId, status: 'APPROVED' },
      select: { id: true },
    });
    if (!budget) return [];

    const lines = await tx.budgetLine.findMany({
      where: { budgetId: budget.id },
      select: {
        id: true,
        accountId: true,
        costCenterId: true,
        account: { select: { code: true, nameEn: true } },
        costCenter: { select: { code: true } },
      },
    });

    // The last day of the year, so a variance report run mid-January does not
    // silently report against January's cumulative allocation when the caller
    // meant the year.
    const year = await tx.fiscalYear.findUniqueOrThrow({
      where: { id: fiscalYearId },
      select: { endDate: true },
    });
    const onDate = opts.onDate ?? year.endDate;

    const rows: VarianceRow[] = [];
    for (const line of lines) {
      const position = await budgetPosition(
        tx,
        tenantId,
        line.accountId,
        line.costCenterId,
        onDate,
      );
      rows.push({
        ...position,
        accountCode: line.account.code,
        accountName: line.account.nameEn,
        costCenterCode: line.costCenter?.code ?? null,
        // Variance is available under a different name, and both are in the
        // report the accountants asked for. Kept explicit rather than
        // clever — a reader should not have to work out that two columns are
        // the same subtraction.
        variance: position.available,
      });
    }

    return rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  });
}
