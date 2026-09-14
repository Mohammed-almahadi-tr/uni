import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { post, type PostingLine } from '@/lib/ledger/posting';
import { runJob } from '@/lib/jobs/runner';
import { sum, type Money, ZERO } from '@/lib/money';

/**
 * The period-end depreciation batch (SRS REQ-AST-03).
 *
 *     DR  Depreciation Expense      by cost centre
 *       CR  Accumulated Depreciation  by asset category
 *
 * What the legacy batch did, in full: read
 * `SELECT ISNULL(MAX(MoveNo),0) FROM Transactions` — with no filter of any
 * kind, where the other call sites at least filtered by year — then looped the
 * grid inserting two rows per asset against the hardcoded English strings
 * `'Fixed Assets'` and `'Depreciation Expenses'`, into a database whose
 * account tree is in Arabic. There was no schedule, no accumulated-depreciation
 * account, no cost centre, and nothing at all to stop a second click posting
 * the whole batch again.
 *
 * Here the charge for a period is a **lookup**, not a calculation: the
 * schedule was written when the asset was capitalised. A batch that
 * recalculates is a batch that can produce a different answer on a re-run, and
 * the entire point of an idempotent period-end job is that it cannot.
 */

export class DepreciationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DepreciationError';
  }
}

export interface SkippedAsset {
  assetCode: string;
  reason: string;
}

export interface DepreciationRunResult {
  /** Null when there was nothing to charge. */
  headerId: string | null;
  voucherRef: string | null;
  assetsCharged: number;
  amount: string;
  /** What was left out and why — REQ-AST-03 asks for this explicitly. */
  skipped: SkippedAsset[];
}

/**
 * Depreciate one fiscal period.
 *
 * Safe to run repeatedly: the job key is the period, so a second invocation
 * replays the first run's result rather than posting again.
 */
export async function runDepreciation(
  principal: Principal,
  fiscalPeriodId: string,
  opts: { docDate?: Date } = {},
): Promise<DepreciationRunResult> {
  requirePermission(principal, 'asset.depreciate');

  const { result } = await runJob(
    principal,
    {
      type: 'depreciation',
      key: `depreciation:${fiscalPeriodId}`,
      description: 'Period-end depreciation charge',
    },
    (tx) => runDepreciationInTx(tx, principal, fiscalPeriodId, opts),
  );
  return result;
}

async function runDepreciationInTx(
  tx: Tx,
  principal: Principal,
  fiscalPeriodId: string,
  opts: { docDate?: Date },
): Promise<DepreciationRunResult> {
  const { tenantId } = principal;

  const period = await tx.fiscalPeriod.findUnique({
    where: { id: fiscalPeriodId },
    select: {
      id: true,
      seq: true,
      endDate: true,
      status: true,
      fiscalYear: { select: { tenantId: true, name: true } },
    },
  });
  if (!period || period.fiscalYear.tenantId !== tenantId) {
    throw new DepreciationError('That fiscal period does not belong to this university.');
  }
  if (period.status !== 'OPEN') {
    throw new DepreciationError(
      `Period ${period.seq} of ${period.fiscalYear.name} is ${period.status}. Depreciation is ` +
        `charged into an open period only.`,
    );
  }

  const entries = await tx.depreciationEntry.findMany({
    where: { tenantId, fiscalPeriodId, postedAt: null },
    select: {
      id: true,
      amount: true,
      assetId: true,
      asset: {
        select: {
          assetCode: true,
          status: true,
          inServiceDate: true,
          costCenterId: true,
          category: {
            select: {
              code: true,
              accumulatedAccountId: true,
              expenseAccountId: true,
              expenseAccount: { select: { code: true, requiresCostCenter: true } },
            },
          },
        },
      },
    },
  });

  const skipped: SkippedAsset[] = [];
  const live: typeof entries = [];

  for (const e of entries) {
    if (e.asset.status !== 'IN_SERVICE') {
      skipped.push({
        assetCode: e.asset.assetCode,
        reason: `${e.asset.status.toLowerCase().replace('_', ' ')} before this period was charged`,
      });
      continue;
    }
    if (e.asset.inServiceDate > period.endDate) {
      skipped.push({ assetCode: e.asset.assetCode, reason: 'not yet in service' });
      continue;
    }
    if (e.asset.category.expenseAccount.requiresCostCenter && !e.asset.costCenterId) {
      skipped.push({
        assetCode: e.asset.assetCode,
        reason: `expense account ${e.asset.category.expenseAccount.code} requires a cost centre and the asset has none`,
      });
      continue;
    }
    live.push(e);
  }

  if (live.length === 0) {
    return {
      headerId: null,
      voucherRef: null,
      assetsCharged: 0,
      amount: '0.0000',
      skipped,
    };
  }

  // Collapse to one line per account and cost centre. A university with 900
  // assets otherwise posts 1800 journal lines that say the same thing.
  const expense = new Map<string, { accountId: string; costCenterId: string | null; amount: Money }>();
  const accumulated = new Map<string, { accountId: string; amount: Money }>();

  for (const e of live) {
    const cc = e.asset.costCenterId ?? null;
    const eKey = `${e.asset.category.expenseAccountId}::${cc ?? ''}`;
    const cur = expense.get(eKey);
    if (cur) cur.amount = cur.amount.plus(e.amount);
    else {
      expense.set(eKey, {
        accountId: e.asset.category.expenseAccountId,
        costCenterId: cc,
        amount: e.amount,
      });
    }

    const aKey = e.asset.category.accumulatedAccountId;
    const acc = accumulated.get(aKey);
    if (acc) acc.amount = acc.amount.plus(e.amount);
    else accumulated.set(aKey, { accountId: aKey, amount: e.amount });
  }

  const lines: PostingLine[] = [];
  for (const g of expense.values()) {
    lines.push({
      accountId: g.accountId,
      debit: g.amount,
      costCenterId: g.costCenterId,
      description: `Depreciation — period ${period.seq}`,
    });
  }
  for (const g of accumulated.values()) {
    lines.push({
      accountId: g.accountId,
      credit: g.amount,
      description: `Depreciation — period ${period.seq}`,
    });
  }

  const total = sum(live.map((e) => e.amount));
  // The last day of the period, so the charge lands where it belongs rather
  // than on whatever day somebody happened to run the batch.
  const docDate = opts.docDate ?? period.endDate;

  const posted = await post(tx, tenantId, {
    voucherType: 'DEPRECIATION',
    docDate,
    description: `Depreciation — period ${period.seq} of ${period.fiscalYear.name}`,
    sourceModule: 'FIXED_ASSETS',
    sourceRef: period.id,
    postedById: principal.userId,
    lines,
  });

  const now = new Date();
  for (const e of live) {
    await tx.depreciationEntry.update({
      where: { id: e.id },
      data: { postedAt: now, postedHeaderId: posted.headerId },
    });
  }

  await audit(tx, tenantId, {
    actorId: principal.userId,
    action: 'POST',
    resourceType: 'asset.depreciation',
    resourceId: period.id,
    after: {
      period: `${period.seq}/${period.fiscalYear.name}`,
      voucherRef: posted.voucherRef,
      assetsCharged: live.length,
      amount: total.toFixed(4),
      skipped: skipped.length,
    },
  });

  return {
    headerId: posted.headerId,
    voucherRef: posted.voucherRef,
    assetsCharged: live.length,
    amount: total.toFixed(4),
    skipped,
  };
}

export interface AssetRegisterReconciliation {
  ok: boolean;
  /** Cost of every asset still on the books, from the register. */
  registerCost: string;
  /** Balance of the asset accounts in the general ledger. */
  ledgerCost: string;
  costVariance: string;
  /** Posted depreciation across live assets, from the schedule. */
  registerAccumulated: string;
  /** Balance of the accumulated-depreciation accounts. */
  ledgerAccumulated: string;
  accumulatedVariance: string;
}

/**
 * Does the asset register agree with the general ledger?
 *
 * The A5 equivalent of the student sub-ledger check, and impossible against
 * the legacy design for the same reason: there was no register and no
 * accumulated-depreciation account, so there were not two numbers to compare.
 *
 * Reads the maintained period aggregates rather than scanning the ledger,
 * because REQ-NFR-02 forbids ad-hoc `SUM()` over `transaction_lines` in report
 * paths.
 */
export async function reconcileAssetRegister(
  tx: Tx,
  tenantId: string,
): Promise<AssetRegisterReconciliation> {
  const categories = await tx.assetCategory.findMany({
    where: { tenantId },
    select: { assetAccountId: true, accumulatedAccountId: true },
  });
  const assetAccountIds = [...new Set(categories.map((c) => c.assetAccountId))];
  const accumulatedAccountIds = [...new Set(categories.map((c) => c.accumulatedAccountId))];

  const liveAssets = await tx.fixedAsset.findMany({
    where: { tenantId, status: 'IN_SERVICE' },
    select: { id: true, purchaseCost: true },
  });
  const registerCost = sum(liveAssets.map((a) => a.purchaseCost));

  const postedDep = await tx.depreciationEntry.aggregate({
    where: {
      tenantId,
      postedAt: { not: null },
      asset: { status: 'IN_SERVICE' },
    },
    _sum: { amount: true },
  });
  const registerAccumulated = postedDep._sum.amount ?? ZERO;

  const ledgerCost = await accountsBalance(tx, tenantId, assetAccountIds, 'DEBIT');
  const ledgerAccumulated = await accountsBalance(tx, tenantId, accumulatedAccountIds, 'CREDIT');

  const costVariance = registerCost.minus(ledgerCost);
  const accumulatedVariance = registerAccumulated.minus(ledgerAccumulated);

  return {
    ok: costVariance.isZero() && accumulatedVariance.isZero(),
    registerCost: registerCost.toFixed(4),
    ledgerCost: ledgerCost.toFixed(4),
    costVariance: costVariance.toFixed(4),
    registerAccumulated: registerAccumulated.toFixed(4),
    ledgerAccumulated: ledgerAccumulated.toFixed(4),
    accumulatedVariance: accumulatedVariance.toFixed(4),
  };
}

async function accountsBalance(
  tx: Tx,
  tenantId: string,
  accountIds: string[],
  normal: 'DEBIT' | 'CREDIT',
): Promise<Money> {
  if (accountIds.length === 0) return ZERO;

  const agg = await tx.accountPeriodBalance.aggregate({
    where: { tenantId, accountId: { in: accountIds } },
    _sum: {
      openingDebit: true,
      openingCredit: true,
      movementDebit: true,
      movementCredit: true,
    },
  });

  const debit = (agg._sum.openingDebit ?? ZERO).plus(agg._sum.movementDebit ?? ZERO);
  const credit = (agg._sum.openingCredit ?? ZERO).plus(agg._sum.movementCredit ?? ZERO);
  return normal === 'DEBIT' ? debit.minus(credit) : credit.minus(debit);
}

export interface AssetScheduleRow {
  periodSeq: number;
  fiscalYear: string;
  amount: string;
  posted: boolean;
  voucherRef: string | null;
}

/** An asset's whole schedule, posted and pending. */
export async function assetSchedule(
  principal: Principal,
  assetId: string,
): Promise<AssetScheduleRow[]> {
  requirePermission(principal, 'asset.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.depreciationEntry.findMany({
      where: { assetId, tenantId: principal.tenantId },
      orderBy: { seq: 'asc' },
      select: {
        amount: true,
        postedAt: true,
        postedHeaderId: true,
        fiscalPeriod: {
          select: { seq: true, fiscalYear: { select: { name: true } } },
        },
      },
    });

    const headerIds = rows
      .map((r) => r.postedHeaderId)
      .filter((id): id is string => id !== null);
    const headers =
      headerIds.length > 0
        ? await tx.transactionHeader.findMany({
            where: { id: { in: headerIds } },
            select: { id: true, voucherRef: true },
          })
        : [];
    const refById = new Map(headers.map((h) => [h.id, h.voucherRef]));

    return rows.map((r) => ({
      periodSeq: r.fiscalPeriod.seq,
      fiscalYear: r.fiscalPeriod.fiscalYear.name,
      amount: r.amount.toFixed(4),
      posted: r.postedAt !== null,
      voucherRef: r.postedHeaderId ? (refById.get(r.postedHeaderId) ?? null) : null,
    }));
  });
}
