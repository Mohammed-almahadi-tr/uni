import 'server-only';
import type { BudgetControlBasis, BudgetPolicy } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import { allocate, sum, toStorage, type Money, type MoneyInput } from '@/lib/money';

/**
 * Budget preparation and approval (SRS REQ-BDG-01).
 *
 * The legacy `AccBudget` table is worth stating precisely, because almost
 * every decision here is a reaction to it. A budget line was:
 *
 *     Insert Into AccBudget (PeriodFrom, PeriodTo, Acc1, Acc2, Acc3, Acc4,
 *                            Amount, UserName) ...
 *
 * — four *text* account names, a free-form date range stamped with a literal
 * " 10:10:10" so it would sort inside the report's "00:00:01".."23:59:59"
 * window, and an amount read as `CDbl`. There was no uniqueness, so two rows
 * for the same account silently doubled the allocation. There was no link to
 * the fiscal calendar, so a budget could span any dates at all, including
 * dates in two fiscal years. There was no version and no approval: revision
 * meant setting `Valid=0` and inserting a new row, and "what did the board
 * actually approve in October" was unanswerable.
 *
 * And renaming an account in the chart orphaned its budget, silently, because
 * the join was on the name.
 *
 * Four things change here:
 *
 *   · A budget is a **version**. Version 1 is the original; a revision is
 *     version 2, and version 1 stays readable next to it. Exactly one version
 *     is APPROVED at a time, enforced by a partial unique index.
 *   · Lines reference accounts and cost centres **by id**.
 *   · Every line is unique on (account, cost centre), with NULLS NOT
 *     DISTINCT so "no cost centre" is not a licence to enter it twice.
 *   · Preparation and approval are different people (SoD: budget.manage vs
 *     budget.approve), and the approver is recorded.
 */

export class BudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetError';
  }
}

export interface BudgetLineInput {
  accountId: string;
  costCenterId?: string | null;
  annualAmount: MoneyInput;
  /** Defaults to BLOCK — a budget nobody is held to is a spreadsheet. */
  policy?: BudgetPolicy;
  note?: string;
  /**
   * Amount per period, in period order, when the tenant phases its spending.
   * Omitted means "spread evenly", which `allocate()` does without leaving a
   * residue anywhere.
   */
  periodAmounts?: MoneyInput[];
}

export interface CreateBudgetInput {
  fiscalYearId: string;
  label: string;
  controlBasis?: BudgetControlBasis;
  lines: BudgetLineInput[];
}

export interface BudgetSummary {
  budgetId: string;
  versionNo: number;
  label: string;
  status: string;
  controlBasis: BudgetControlBasis;
  lineCount: number;
  total: string;
}

/**
 * Draft a budget version.
 *
 * Always a new version — there is no "edit the approved budget", because the
 * approved budget is the authority every availability check has already been
 * measured against. Revising it in place would silently restate decisions
 * already taken.
 */
export async function draftBudget(
  principal: Principal,
  input: CreateBudgetInput,
): Promise<BudgetSummary> {
  requirePermission(principal, 'budget.manage');
  const { tenantId } = principal;

  if (input.lines.length === 0) {
    throw new BudgetError('A budget needs at least one line.');
  }

  return withTenant(tenantId, async (tx) => {
    const year = await tx.fiscalYear.findUnique({
      where: { id: input.fiscalYearId },
      select: { id: true, tenantId: true, name: true, status: true },
    });
    if (!year || year.tenantId !== tenantId) {
      throw new BudgetError('That fiscal year does not belong to this university.');
    }
    if (year.status === 'PERMANENTLY_CLOSED') {
      throw new BudgetError(`Fiscal year ${year.name} is sealed. It cannot be budgeted.`);
    }

    const periods = await tx.fiscalPeriod.findMany({
      where: { fiscalYearId: year.id },
      select: { id: true, seq: true },
      orderBy: { seq: 'asc' },
    });
    if (periods.length === 0) {
      throw new BudgetError(
        `Fiscal year ${year.name} has no periods. Open the year before budgeting it.`,
      );
    }

    await validateLines(tx, tenantId, input.lines, periods.length);

    const last = await tx.budget.findFirst({
      where: { tenantId, fiscalYearId: year.id },
      select: { versionNo: true },
      orderBy: { versionNo: 'desc' },
    });
    const versionNo = (last?.versionNo ?? 0) + 1;

    const budget = await tx.budget.create({
      data: {
        tenantId,
        fiscalYearId: year.id,
        versionNo,
        label: input.label.trim(),
        controlBasis: input.controlBasis ?? 'ANNUAL',
        preparedById: principal.userId,
      },
      select: { id: true },
    });

    let total: Money = toStorage(0);
    for (const line of input.lines) {
      const annual = toStorage(line.annualAmount);
      total = total.plus(annual);

      const created = await tx.budgetLine.create({
        data: {
          tenantId,
          budgetId: budget.id,
          accountId: line.accountId,
          costCenterId: line.costCenterId ?? null,
          annualAmount: annual,
          policy: line.policy ?? 'BLOCK',
          note: line.note?.trim() || null,
        },
        select: { id: true },
      });

      // Phasing is written whatever the control basis, because variance
      // reporting wants to know what was planned for March even when
      // availability is measured against the year.
      const amounts = line.periodAmounts
        ? line.periodAmounts.map(toStorage)
        : allocate(annual, periods.length);

      await tx.budgetPeriodAllocation.createMany({
        data: periods.map((p, i) => ({
          tenantId,
          budgetLineId: created.id,
          fiscalPeriodId: p.id,
          amount: amounts[i],
        })),
      });
    }

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'budget',
      resourceId: budget.id,
      after: {
        fiscalYear: year.name,
        versionNo,
        label: input.label.trim(),
        controlBasis: input.controlBasis ?? 'ANNUAL',
        lines: input.lines.length,
        total: total.toFixed(4),
      },
    });

    return {
      budgetId: budget.id,
      versionNo,
      label: input.label.trim(),
      status: 'DRAFT',
      controlBasis: input.controlBasis ?? 'ANNUAL',
      lineCount: input.lines.length,
      total: total.toFixed(4),
    };
  });
}

/**
 * Check the lines before writing any of them.
 *
 * Batched deliberately: one query per *kind* of check rather than one per
 * line, because a real budget has three hundred lines and three hundred
 * round trips inside a transaction is how a save takes a minute.
 */
async function validateLines(
  tx: Tx,
  tenantId: string,
  lines: BudgetLineInput[],
  periodCount: number,
): Promise<void> {
  const seen = new Set<string>();
  for (const line of lines) {
    const key = `${line.accountId}::${line.costCenterId ?? ''}`;
    if (seen.has(key)) {
      throw new BudgetError(
        'The same account and cost centre appear on two budget lines. Combine them — ' +
          'two allocations for one account is how the legacy budget silently doubled.',
      );
    }
    seen.add(key);

    if (toStorage(line.annualAmount).isNegative()) {
      throw new BudgetError('A budget allocation cannot be negative.');
    }

    if (line.periodAmounts) {
      if (line.periodAmounts.length !== periodCount) {
        throw new BudgetError(
          `A phased budget line needs one amount per period. This year has ${periodCount} ` +
            `periods and ${line.periodAmounts.length} amounts were given.`,
        );
      }
      const phased = sum(line.periodAmounts.map(toStorage));
      if (!phased.equals(toStorage(line.annualAmount))) {
        throw new BudgetError(
          `The phasing of a budget line must sum to its annual amount: ` +
            `${phased.toFixed(2)} was distributed against an allocation of ` +
            `${toStorage(line.annualAmount).toFixed(2)}.`,
        );
      }
    }
  }

  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const accounts = await tx.account.findMany({
    where: { id: { in: accountIds } },
    select: {
      id: true,
      code: true,
      tenantId: true,
      isPostable: true,
      isActive: true,
      requiresCostCenter: true,
    },
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));

  for (const line of lines) {
    const account = byId.get(line.accountId);
    if (!account || account.tenantId !== tenantId) {
      throw new BudgetError('A budget line names an account that is not in this chart.');
    }
    if (!account.isActive) {
      throw new BudgetError(`Account ${account.code} is deactivated and cannot be budgeted.`);
    }
    // A budget on a heading would be checked against spending that lands on
    // its children, which is a different number, so it is refused rather than
    // quietly meaning something else.
    if (!account.isPostable) {
      throw new BudgetError(
        `Account ${account.code} is a heading. Budget the detail accounts underneath it — ` +
          `spending lands on those, and a budget has to be comparable with what it controls.`,
      );
    }
    if (account.requiresCostCenter && !line.costCenterId) {
      throw new BudgetError(
        `Account ${account.code} requires a cost centre on every posting, so budgeting it ` +
          `without one would produce a line nothing could ever be checked against.`,
      );
    }
  }

  const ccIds = [...new Set(lines.map((l) => l.costCenterId).filter((x): x is string => !!x))];
  if (ccIds.length > 0) {
    const found = await tx.costCenter.count({
      where: { id: { in: ccIds }, tenantId, isActive: true },
    });
    if (found !== ccIds.length) {
      throw new BudgetError('A budget line names a cost centre that is not active in this university.');
    }
  }
}

/** Send a draft for approval. */
export async function submitBudget(principal: Principal, budgetId: string): Promise<void> {
  requirePermission(principal, 'budget.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const budget = await lockBudget(tx, principal.tenantId, budgetId);
    if (budget.status !== 'DRAFT') {
      throw new BudgetError(
        `Budget version ${budget.versionNo} is ${budget.status}, not a draft.`,
      );
    }

    await tx.budget.update({
      where: { id: budgetId },
      data: { status: 'PENDING_APPROVAL', submittedAt: new Date() },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'budget',
      resourceId: budgetId,
      before: { status: 'DRAFT' },
      after: { status: 'PENDING_APPROVAL' },
    });
  });
}

/**
 * Approve a budget version, superseding whatever was in force.
 *
 * The supersession happens in the same transaction as the approval, because
 * the partial unique index permits exactly one APPROVED version per year:
 * doing it in two steps would fail on the index, which is the constraint
 * doing its job.
 */
export async function approveBudget(
  principal: Principal,
  budgetId: string,
  opts: { note?: string } = {},
): Promise<{ supersededVersionNo: number | null }> {
  requirePermission(principal, 'budget.approve');

  return withTenant(principal.tenantId, async (tx) => {
    const budget = await lockBudget(tx, principal.tenantId, budgetId);
    if (budget.status !== 'PENDING_APPROVAL') {
      throw new BudgetError(
        `Budget version ${budget.versionNo} is ${budget.status} and is not awaiting approval.`,
      );
    }

    assertNotSelfApproval(
      principal,
      budget.preparedById,
      `budget version ${budget.versionNo}`,
    );

    const current = await tx.budget.findFirst({
      where: {
        tenantId: principal.tenantId,
        fiscalYearId: budget.fiscalYearId,
        status: 'APPROVED',
      },
      select: { id: true, versionNo: true },
    });

    if (current) {
      await tx.budget.update({
        where: { id: current.id },
        data: { status: 'SUPERSEDED', supersededAt: new Date() },
      });
    }

    await tx.budget.update({
      where: { id: budgetId },
      data: {
        status: 'APPROVED',
        approvedById: principal.userId,
        approvedAt: new Date(),
        decisionNote: opts.note?.trim() || null,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'budget',
      resourceId: budgetId,
      before: { status: 'PENDING_APPROVAL' },
      after: {
        status: 'APPROVED',
        versionNo: budget.versionNo,
        supersededVersionNo: current?.versionNo ?? null,
      },
    });

    return { supersededVersionNo: current?.versionNo ?? null };
  });
}

export async function rejectBudget(
  principal: Principal,
  budgetId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'budget.approve');
  if (!reason?.trim()) {
    throw new BudgetError('Rejecting a budget requires a stated reason.');
  }

  await withTenant(principal.tenantId, async (tx) => {
    const budget = await lockBudget(tx, principal.tenantId, budgetId);
    if (budget.status !== 'PENDING_APPROVAL') {
      throw new BudgetError(
        `Budget version ${budget.versionNo} is ${budget.status} and is not awaiting approval.`,
      );
    }

    await tx.budget.update({
      where: { id: budgetId },
      data: {
        status: 'REJECTED',
        approvedById: principal.userId,
        approvedAt: new Date(),
        decisionNote: reason.trim(),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REJECT',
      resourceType: 'budget',
      resourceId: budgetId,
      after: { status: 'REJECTED', reason: reason.trim() },
    });
  });
}

/**
 * Take a copy of a budget as the basis of a revision.
 *
 * A revision that starts from a blank page is a revision nobody does; they
 * edit the approved version instead, which is what the version discipline
 * exists to prevent. Copying is the honest way to make the right path the
 * easy one.
 */
export async function reviseBudget(
  principal: Principal,
  fiscalYearId: string,
  label: string,
): Promise<BudgetSummary> {
  requirePermission(principal, 'budget.manage');

  const source = await withTenant(principal.tenantId, async (tx) => {
    const current = await tx.budget.findFirst({
      where: { tenantId: principal.tenantId, fiscalYearId, status: 'APPROVED' },
      select: { id: true, controlBasis: true },
    });
    if (!current) {
      throw new BudgetError('There is no approved budget for that fiscal year to revise.');
    }

    const lines = await tx.budgetLine.findMany({
      where: { budgetId: current.id },
      select: {
        accountId: true,
        costCenterId: true,
        annualAmount: true,
        policy: true,
        note: true,
      },
    });
    return { controlBasis: current.controlBasis, lines };
  });

  return draftBudget(principal, {
    fiscalYearId,
    label,
    controlBasis: source.controlBasis,
    lines: source.lines.map((l) => ({
      accountId: l.accountId,
      costCenterId: l.costCenterId,
      annualAmount: l.annualAmount,
      policy: l.policy,
      note: l.note ?? undefined,
    })),
  });
}

/** Every version of a fiscal year's budget, newest first. */
export async function listBudgets(
  principal: Principal,
  fiscalYearId: string,
): Promise<BudgetSummary[]> {
  requirePermission(principal, 'budget.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.budget.findMany({
      where: { tenantId: principal.tenantId, fiscalYearId },
      select: {
        id: true,
        versionNo: true,
        label: true,
        status: true,
        controlBasis: true,
        lines: { select: { annualAmount: true } },
      },
      orderBy: { versionNo: 'desc' },
    });

    return rows.map((b) => ({
      budgetId: b.id,
      versionNo: b.versionNo,
      label: b.label,
      status: b.status,
      controlBasis: b.controlBasis,
      lineCount: b.lines.length,
      total: sum(b.lines.map((l) => l.annualAmount)).toFixed(4),
    }));
  });
}

/** Row-lock a budget before deciding anything about it, so two approvers do
 *  not both see PENDING_APPROVAL. */
async function lockBudget(
  tx: Tx,
  tenantId: string,
  budgetId: string,
): Promise<{
  id: string;
  versionNo: number;
  status: string;
  fiscalYearId: string;
  preparedById: string;
}> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      version_no: number;
      status: string;
      fiscal_year_id: string;
      prepared_by_id: string;
    }>
  >`
    SELECT id, version_no, status::text, fiscal_year_id, prepared_by_id
      FROM budgets
     WHERE id = ${budgetId}::uuid AND tenant_id = ${tenantId}::uuid
       FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new BudgetError('That budget does not exist in this university.');
  }
  const r = rows[0];
  return {
    id: r.id,
    versionNo: r.version_no,
    status: r.status,
    fiscalYearId: r.fiscal_year_id,
    preparedById: r.prepared_by_id,
  };
}
