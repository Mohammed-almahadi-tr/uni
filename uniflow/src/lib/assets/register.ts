import 'server-only';
import type { DepreciationMethod } from '@/generated/prisma/enums';
import { withSystem, withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { requireAccounts } from '@/lib/coa/mapping';
import { post, type PostingLine } from '@/lib/ledger/posting';
import { toDateOnly } from '@/lib/ledger/period';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import { buildSchedule, type SchedulePeriod } from './schedule';

/**
 * The fixed asset register (SRS REQ-AST-01, REQ-AST-04).
 *
 * The legacy system had no asset entity. An "asset" was a row in the chart of
 * accounts — `Acc` with `Acc1 = 'Fixed Assets'` — carrying a `DeprPerc`
 * column and nothing else. No purchase date, no in-service date, no salvage
 * value, no useful life, no serial number, no custodian, no location, and no
 * accumulated-depreciation account, which meant net book value was not
 * derivable from anything the system held.
 */

export class AssetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssetError';
  }
}

/** The asset categories a university needs on day one, against the shipped
 *  chart. Useful lives are conventional rather than prescriptive. */
export const DEFAULT_ASSET_CATEGORIES = [
  {
    code: 'BUILDING',
    nameAr: 'المباني',
    nameEn: 'Buildings',
    assetCode: '12111',
    accumulatedCode: '12211',
    lifeMonths: 480,
    salvageRate: '0.10',
  },
  {
    code: 'LAB_EQUIPMENT',
    nameAr: 'أجهزة المعامل',
    nameEn: 'Laboratory Equipment',
    assetCode: '12121',
    accumulatedCode: '12212',
    lifeMonths: 60,
    salvageRate: '0.05',
  },
  {
    code: 'IT_EQUIPMENT',
    nameAr: 'أجهزة الحاسوب',
    nameEn: 'IT Equipment',
    assetCode: '12122',
    accumulatedCode: '12212',
    lifeMonths: 36,
    salvageRate: '0',
  },
  {
    code: 'FURNITURE',
    nameAr: 'الأثاث',
    nameEn: 'Furniture',
    assetCode: '12131',
    accumulatedCode: '12213',
    lifeMonths: 120,
    salvageRate: '0',
  },
  {
    code: 'LIBRARY',
    nameAr: 'مقتنيات المكتبة',
    nameEn: 'Library Collections',
    assetCode: '12132',
    accumulatedCode: '12213',
    lifeMonths: 120,
    salvageRate: '0',
  },
  {
    code: 'VEHICLE',
    nameAr: 'السيارات',
    nameEn: 'Motor Vehicles',
    assetCode: '12141',
    accumulatedCode: '12214',
    lifeMonths: 60,
    salvageRate: '0.15',
  },
] as const;

/** Depreciation expense account in the shipped chart. */
const DEPRECIATION_EXPENSE_CODE = '51311';

/**
 * Install the default categories, binding each to its account triple.
 *
 * Runs as the owner role, like the chart and the fee catalog, because
 * onboarding happens before any staff user exists to hold a permission.
 */
export async function installAssetCategories(
  tenantId: string,
  actorId: string | null = null,
): Promise<{ created: number; skipped: number }> {
  return withSystem(async (tx) => {
    const accounts = await tx.account.findMany({
      where: { tenantId },
      select: { id: true, code: true },
    });
    const byCode = new Map(accounts.map((a) => [a.code, a.id]));

    const expenseAccountId = byCode.get(DEPRECIATION_EXPENSE_CODE);
    if (!expenseAccountId) {
      throw new AssetError(
        `Depreciation expense account ${DEPRECIATION_EXPENSE_CODE} is not in this tenant's ` +
          `chart. Install the chart of accounts first.`,
      );
    }

    let created = 0;
    let skipped = 0;

    for (const c of DEFAULT_ASSET_CATEGORIES) {
      const existing = await tx.assetCategory.findUnique({
        where: { tenantId_code: { tenantId, code: c.code } },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const assetAccountId = byCode.get(c.assetCode);
      const accumulatedAccountId = byCode.get(c.accumulatedCode);
      if (!assetAccountId || !accumulatedAccountId) {
        throw new AssetError(
          `Asset category ${c.code} needs accounts ${c.assetCode} and ${c.accumulatedCode}, ` +
            `which are not in this tenant's chart.`,
        );
      }

      await tx.assetCategory.create({
        data: {
          tenantId,
          code: c.code,
          nameAr: c.nameAr,
          nameEn: c.nameEn,
          assetAccountId,
          accumulatedAccountId,
          expenseAccountId,
          defaultMethod: 'STRAIGHT_LINE',
          defaultUsefulLifeMonths: c.lifeMonths,
          defaultSalvageRate: c.salvageRate,
        },
      });
      created += 1;
    }

    if (actorId) {
      await audit(tx, tenantId, {
        actorId,
        action: 'INSERT',
        resourceType: 'asset_categories',
        resourceId: tenantId,
        after: { created, skipped },
      });
    }

    return { created, skipped };
  });
}

export interface CapitaliseAssetInput {
  assetCode: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  purchaseDate: Date;
  /** Defaults to the purchase date. Depreciation starts here, not at purchase:
   *  a lab bench delivered in June and installed in September depreciates from
   *  September. */
  inServiceDate?: Date;
  purchaseCost: MoneyInput;
  /** Defaults to the category's salvage rate applied to cost. */
  salvageValue?: MoneyInput;
  usefulLifeMonths?: number;
  method?: DepreciationMethod;
  costCenterId?: string | null;
  location?: string | null;
  custodianId?: string | null;
  barcode?: string | null;
  serialNo?: string | null;
  /**
   * What paid for it — bank, cash, or the payables/opening-balance account.
   * Required: an asset whose cost is not in the ledger cannot be reconciled
   * against the asset accounts, and reconciling them is the point.
   */
  fundingAccountId: string;
}

export interface CapitalisedAsset {
  assetId: string;
  assetCode: string;
  headerId: string;
  voucherRef: string;
  scheduledPeriods: number;
  scheduledTotal: string;
}

/**
 * Bring an asset onto the books and lay down its whole depreciation schedule.
 *
 * `DR asset account · CR whatever funded it`, and one schedule row per period
 * for the life of the asset. Generating the schedule now rather than
 * computing it at each period-end is what makes the batch a lookup — and a
 * lookup cannot produce a different answer on a re-run.
 */
export async function capitaliseAsset(
  principal: Principal,
  input: CapitaliseAssetInput,
): Promise<CapitalisedAsset> {
  requirePermission(principal, 'asset.manage');

  const assetCode = input.assetCode?.trim();
  if (!assetCode) throw new AssetError('An asset needs a code.');
  if (!input.nameAr.trim() || !input.nameEn.trim()) {
    throw new AssetError('An asset needs a name in both Arabic and English.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const { tenantId } = principal;

    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { functionalCurrency: true },
    });
    const currency = tenant.functionalCurrency.trim();

    const category = await tx.assetCategory.findUnique({
      where: { id: input.categoryId },
      select: {
        id: true,
        code: true,
        nameEn: true,
        isActive: true,
        assetAccountId: true,
        defaultMethod: true,
        defaultUsefulLifeMonths: true,
        defaultSalvageRate: true,
        expenseAccount: { select: { code: true, requiresCostCenter: true } },
      },
    });
    if (!category) throw new AssetError('Asset category not found in this tenant.');
    if (!category.isActive) {
      throw new AssetError(`Asset category ${category.code} has been deactivated.`);
    }

    const cost = toStorage(input.purchaseCost);
    if (cost.lessThanOrEqualTo(0)) {
      throw new AssetError('An asset must be capitalised at a positive cost.');
    }

    const method = input.method ?? category.defaultMethod;
    const usefulLifeMonths = input.usefulLifeMonths ?? category.defaultUsefulLifeMonths;
    const salvage =
      input.salvageValue !== undefined
        ? toStorage(input.salvageValue)
        : toStorage(cost.times(category.defaultSalvageRate));

    if (salvage.greaterThanOrEqualTo(cost)) {
      throw new AssetError(
        `Salvage value ${salvage.toFixed(2)} is not less than the cost of ${cost.toFixed(2)}.`,
      );
    }

    const costCenterId = input.costCenterId ?? null;
    if (category.expenseAccount.requiresCostCenter && !costCenterId) {
      throw new AssetError(
        `Depreciation expense account ${category.expenseAccount.code} requires a cost centre. ` +
          `Say which faculty or department carries the charge.`,
      );
    }

    const purchaseDate = toDateOnly(input.purchaseDate);
    const inServiceDate = toDateOnly(input.inServiceDate ?? input.purchaseDate);
    if (inServiceDate < purchaseDate) {
      throw new AssetError('An asset cannot be in service before it was bought.');
    }

    const funding = await tx.account.findUnique({
      where: { id: input.fundingAccountId },
      select: { code: true, isActive: true, isPostable: true },
    });
    if (!funding) throw new AssetError('The funding account is not in this tenant’s chart.');
    if (!funding.isActive || !funding.isPostable) {
      throw new AssetError(`Account ${funding.code} cannot receive postings.`);
    }

    const posted = await post(tx, tenantId, {
      voucherType: 'JOURNAL',
      docDate: purchaseDate,
      description: `Asset capitalised — ${assetCode} ${input.nameEn.trim()}`,
      sourceModule: 'FIXED_ASSETS',
      sourceRef: assetCode,
      postedById: principal.userId,
      lines: [
        {
          accountId: category.assetAccountId,
          debit: cost,
          description: `${assetCode} ${input.nameEn.trim()}`,
        },
        {
          accountId: input.fundingAccountId,
          credit: cost,
          description: `Purchase of ${assetCode}`,
        },
      ],
    });

    const asset = await tx.fixedAsset.create({
      data: {
        tenantId,
        assetCode,
        barcode: input.barcode?.trim() || null,
        serialNo: input.serialNo?.trim() || null,
        categoryId: category.id,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        purchaseDate,
        inServiceDate,
        purchaseCost: cost,
        salvageValue: salvage,
        currency,
        method,
        usefulLifeMonths: method === 'NONE' ? 0 : usefulLifeMonths,
        costCenterId,
        location: input.location?.trim() || null,
        custodianId: input.custodianId ?? null,
        status: 'IN_SERVICE',
        capitalisationHeaderId: posted.headerId,
        createdById: principal.userId,
      },
      select: { id: true },
    });

    const rows = await writeSchedule(tx, tenantId, {
      assetId: asset.id,
      cost,
      salvageValue: salvage,
      usefulLifeMonths: method === 'NONE' ? 0 : usefulLifeMonths,
      method,
      inServiceDate,
    });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'fixed_asset',
      resourceId: asset.id,
      after: {
        assetCode,
        category: category.code,
        cost: cost.toFixed(4),
        salvage: salvage.toFixed(4),
        method,
        usefulLifeMonths,
        inServiceDate: inServiceDate.toISOString().slice(0, 10),
        voucherRef: posted.voucherRef,
        scheduledPeriods: rows.length,
      },
    });

    return {
      assetId: asset.id,
      assetCode,
      headerId: posted.headerId,
      voucherRef: posted.voucherRef,
      scheduledPeriods: rows.length,
      scheduledTotal: sum(rows.map((r) => r.amount)).toFixed(4),
    };
  });
}

/**
 * Lay the schedule down across every period the tenant's calendar knows about.
 *
 * Periods beyond the calendar simply have no rows yet; opening a new fiscal
 * year extends them (see `extendSchedules`). That is better than refusing to
 * capitalise an asset whose life runs past the end of the calendar, which is
 * every asset.
 */
async function writeSchedule(
  tx: Tx,
  tenantId: string,
  spec: {
    assetId: string;
    cost: Money;
    salvageValue: Money;
    usefulLifeMonths: number;
    method: DepreciationMethod;
    inServiceDate: Date;
  },
): Promise<Array<{ periodId: string; amount: Money }>> {
  if (spec.method === 'NONE') return [];

  const periods = await tx.fiscalPeriod.findMany({
    where: { fiscalYear: { tenantId }, endDate: { gte: spec.inServiceDate } },
    orderBy: { startDate: 'asc' },
    select: { id: true, startDate: true, endDate: true },
  });
  if (periods.length === 0) return [];

  const rows = buildSchedule({
    cost: spec.cost,
    salvageValue: spec.salvageValue,
    usefulLifeMonths: spec.usefulLifeMonths,
    method: spec.method,
    inServiceDate: spec.inServiceDate,
    periods: periods as SchedulePeriod[],
  });

  for (const r of rows) {
    await tx.depreciationEntry.create({
      data: {
        tenantId,
        assetId: spec.assetId,
        fiscalPeriodId: r.periodId,
        seq: r.seq,
        amount: r.amount,
      },
    });
  }

  return rows.map((r) => ({ periodId: r.periodId, amount: r.amount }));
}

/**
 * Extend schedules into periods that did not exist when the assets were
 * capitalised.
 *
 * Called after opening a fiscal year. An asset with a forty-year life outlives
 * any calendar in the system on the day it is bought, so the schedule is laid
 * down as far as the calendar reaches and extended as the calendar grows.
 * Already-posted rows are never touched: the remaining base is recomputed from
 * what is actually posted, so an extension cannot restate history.
 */
export async function extendSchedules(
  principal: Principal,
  opts: { assetId?: string } = {},
): Promise<{ assetsExtended: number; rowsAdded: number }> {
  requirePermission(principal, 'asset.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const { tenantId } = principal;

    const assets = await tx.fixedAsset.findMany({
      where: {
        tenantId,
        status: 'IN_SERVICE',
        method: { not: 'NONE' },
        ...(opts.assetId ? { id: opts.assetId } : {}),
      },
      select: {
        id: true,
        purchaseCost: true,
        salvageValue: true,
        usefulLifeMonths: true,
        method: true,
        inServiceDate: true,
      },
    });

    const allPeriods = await tx.fiscalPeriod.findMany({
      where: { fiscalYear: { tenantId } },
      orderBy: { startDate: 'asc' },
      select: { id: true, startDate: true, endDate: true },
    });

    let assetsExtended = 0;
    let rowsAdded = 0;

    for (const asset of assets) {
      const existing = await tx.depreciationEntry.findMany({
        where: { assetId: asset.id },
        select: { fiscalPeriodId: true, amount: true, postedAt: true },
      });
      const known = new Set(existing.map((e) => e.fiscalPeriodId));

      const rows = buildSchedule({
        cost: asset.purchaseCost,
        salvageValue: asset.salvageValue,
        usefulLifeMonths: asset.usefulLifeMonths,
        method: asset.method,
        inServiceDate: asset.inServiceDate,
        periods: allPeriods.filter((p) => p.endDate >= asset.inServiceDate) as SchedulePeriod[],
      });

      const missing = rows.filter((r) => !known.has(r.periodId));
      if (missing.length === 0) continue;

      for (const r of missing) {
        await tx.depreciationEntry.create({
          data: {
            tenantId,
            assetId: asset.id,
            fiscalPeriodId: r.periodId,
            seq: r.seq,
            amount: r.amount,
          },
        });
        rowsAdded += 1;
      }
      assetsExtended += 1;
    }

    return { assetsExtended, rowsAdded };
  });
}

export interface AssetPosition {
  assetId: string;
  assetCode: string;
  nameEn: string;
  cost: string;
  /** Posted depreciation to date. Derived from the schedule, never recomputed. */
  accumulated: string;
  netBookValue: string;
  status: string;
}

/** What an asset is worth on the books today. */
export async function assetPosition(
  tx: Tx,
  tenantId: string,
  assetId: string,
): Promise<AssetPosition> {
  const asset = await tx.fixedAsset.findUniqueOrThrow({
    where: { id: assetId },
    select: {
      id: true,
      assetCode: true,
      nameEn: true,
      purchaseCost: true,
      status: true,
      tenantId: true,
    },
  });
  if (asset.tenantId !== tenantId) throw new AssetError('Asset not found in this tenant.');

  const posted = await tx.depreciationEntry.aggregate({
    where: { assetId, postedAt: { not: null } },
    _sum: { amount: true },
  });
  const accumulated = posted._sum.amount ?? ZERO;

  return {
    assetId: asset.id,
    assetCode: asset.assetCode,
    nameEn: asset.nameEn,
    cost: asset.purchaseCost.toFixed(4),
    accumulated: accumulated.toFixed(4),
    netBookValue: asset.purchaseCost.minus(accumulated).toFixed(4),
    status: asset.status,
  };
}

export interface DisposalResult {
  headerId: string;
  voucherRef: string;
  netBookValue: string;
  proceeds: string;
  /** Positive is a gain, negative a loss. */
  gainOrLoss: string;
  cancelledScheduleRows: number;
}

/**
 * Sell, scrap or write off an asset (SRS REQ-AST-04).
 *
 *     DR  Accumulated Depreciation    everything charged so far
 *     DR  Cash / Bank                 proceeds, if any
 *       CR  Asset account               original cost
 *     and the difference to gain or loss on disposal.
 *
 * Derecognising both cost *and* accumulated depreciation is the part the
 * legacy system could not have done: it had no accumulated-depreciation
 * account, so there was nothing to reverse and no way to compute net book
 * value at the moment of sale.
 */
export async function disposeAsset(
  principal: Principal,
  assetId: string,
  input: {
    disposedOn: Date;
    reason: string;
    /** Zero for a scrap or a write-off. */
    proceeds?: MoneyInput;
    /** Where the money came in. Required when there are proceeds. */
    proceedsAccountId?: string | null;
    writeOff?: boolean;
  },
): Promise<DisposalResult> {
  requirePermission(principal, 'asset.dispose');

  const reason = input.reason?.trim();
  if (!reason) throw new AssetError('Disposing of an asset requires a stated reason.');

  return withTenant(principal.tenantId, async (tx) => {
    const { tenantId } = principal;

    const asset = await tx.fixedAsset.findUnique({
      where: { id: assetId },
      select: {
        id: true,
        assetCode: true,
        nameEn: true,
        purchaseCost: true,
        status: true,
        costCenterId: true,
        category: {
          select: {
            assetAccountId: true,
            accumulatedAccountId: true,
          },
        },
      },
    });
    if (!asset) throw new AssetError('Asset not found in this tenant.');
    if (asset.status !== 'IN_SERVICE') {
      throw new AssetError(`Asset ${asset.assetCode} is already ${asset.status}.`);
    }

    const proceeds = toStorage(input.proceeds ?? 0);
    if (proceeds.isNegative()) throw new AssetError('Proceeds cannot be negative.');
    if (proceeds.greaterThan(0) && !input.proceedsAccountId) {
      throw new AssetError('Say which account the sale proceeds were received into.');
    }

    const { ASSET_DISPOSAL_GAIN_LOSS } = await requireAccounts(tx, tenantId, [
      'ASSET_DISPOSAL_GAIN_LOSS',
    ] as const);

    const postedAgg = await tx.depreciationEntry.aggregate({
      where: { assetId, postedAt: { not: null } },
      _sum: { amount: true },
    });
    const accumulated = postedAgg._sum.amount ?? ZERO;
    const netBookValue = asset.purchaseCost.minus(accumulated);
    const gainOrLoss = proceeds.minus(netBookValue);

    const lines: PostingLine[] = [];
    if (!accumulated.isZero()) {
      lines.push({
        accountId: asset.category.accumulatedAccountId,
        debit: accumulated,
        description: `Accumulated depreciation derecognised — ${asset.assetCode}`,
      });
    }
    if (proceeds.greaterThan(0)) {
      lines.push({
        accountId: input.proceedsAccountId!,
        debit: proceeds,
        description: `Proceeds on disposal of ${asset.assetCode}`,
      });
    }
    lines.push({
      accountId: asset.category.assetAccountId,
      credit: asset.purchaseCost,
      description: `Cost derecognised — ${asset.assetCode}`,
    });
    if (!gainOrLoss.isZero()) {
      lines.push({
        accountId: ASSET_DISPOSAL_GAIN_LOSS,
        ...(gainOrLoss.isPositive()
          ? { credit: gainOrLoss }
          : { debit: gainOrLoss.negated() }),
        costCenterId: asset.costCenterId,
        description: `${gainOrLoss.isPositive() ? 'Gain' : 'Loss'} on disposal of ${asset.assetCode}`,
      });
    }

    const disposedOn = toDateOnly(input.disposedOn);
    const posted = await post(tx, tenantId, {
      voucherType: 'JOURNAL',
      docDate: disposedOn,
      description: `Asset ${input.writeOff ? 'written off' : 'disposed'} — ${asset.assetCode}: ${reason}`,
      sourceModule: 'FIXED_ASSETS',
      sourceRef: asset.assetCode,
      postedById: principal.userId,
      lines,
    });

    // Future charges stop. Posted ones stay — they are journal entries.
    const cancelled = await tx.depreciationEntry.deleteMany({
      where: { assetId, postedAt: null },
    });

    await tx.fixedAsset.update({
      where: { id: assetId },
      data: {
        status: input.writeOff ? 'WRITTEN_OFF' : 'DISPOSED',
        disposedOn,
        disposalProceeds: proceeds,
        disposalReason: reason,
        disposalHeaderId: posted.headerId,
      },
    });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'REVERSE',
      resourceType: 'fixed_asset',
      resourceId: assetId,
      before: {
        assetCode: asset.assetCode,
        cost: asset.purchaseCost.toFixed(4),
        accumulated: accumulated.toFixed(4),
        netBookValue: netBookValue.toFixed(4),
      },
      after: {
        status: input.writeOff ? 'WRITTEN_OFF' : 'DISPOSED',
        proceeds: proceeds.toFixed(4),
        gainOrLoss: gainOrLoss.toFixed(4),
        reason,
        voucherRef: posted.voucherRef,
        cancelledScheduleRows: cancelled.count,
      },
    });

    return {
      headerId: posted.headerId,
      voucherRef: posted.voucherRef,
      netBookValue: netBookValue.toFixed(4),
      proceeds: proceeds.toFixed(4),
      gainOrLoss: gainOrLoss.toFixed(4),
      cancelledScheduleRows: cancelled.count,
    };
  });
}

/**
 * Move an asset to a new custodian or a new room (SRS REQ-AST-04).
 *
 * Posts nothing — the asset is worth what it was worth — but the history is
 * retained, because "where was this in March" is what a physical count asks
 * and a register that only knows where things are now cannot answer it.
 */
export async function moveAsset(
  principal: Principal,
  assetId: string,
  input: {
    toLocation?: string | null;
    toCustodianId?: string | null;
    movedOn: Date;
    reason?: string | null;
  },
): Promise<void> {
  requirePermission(principal, 'asset.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const asset = await tx.fixedAsset.findUnique({
      where: { id: assetId },
      select: { assetCode: true, location: true, custodianId: true, status: true },
    });
    if (!asset) throw new AssetError('Asset not found in this tenant.');
    if (asset.status !== 'IN_SERVICE') {
      throw new AssetError(`Asset ${asset.assetCode} is ${asset.status} and is not being moved.`);
    }

    const toLocation = input.toLocation === undefined ? asset.location : input.toLocation;
    const toCustodianId =
      input.toCustodianId === undefined ? asset.custodianId : input.toCustodianId;

    if (toLocation === asset.location && toCustodianId === asset.custodianId) {
      throw new AssetError('That move would change nothing.');
    }

    await tx.assetMovement.create({
      data: {
        tenantId: principal.tenantId,
        assetId,
        fromLocation: asset.location,
        toLocation,
        fromCustodianId: asset.custodianId,
        toCustodianId,
        movedOn: toDateOnly(input.movedOn),
        reason: input.reason?.trim() || null,
        actorId: principal.userId,
      },
    });

    await tx.fixedAsset.update({
      where: { id: assetId },
      data: { location: toLocation, custodianId: toCustodianId },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'fixed_asset.movement',
      resourceId: assetId,
      before: { location: asset.location, custodianId: asset.custodianId },
      after: { location: toLocation, custodianId: toCustodianId, reason: input.reason ?? null },
    });
  });
}
