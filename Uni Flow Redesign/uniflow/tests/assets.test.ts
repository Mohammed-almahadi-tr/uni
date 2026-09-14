/**
 * Fixed assets, depreciation and the durable job runner (Track A5, SRS
 * Module 9).
 *
 * The legacy "fixed asset register" was a row in the chart of accounts: `Acc`
 * with `Acc1 = 'Fixed Assets'` and a `DeprPerc` column. No purchase date, no
 * in-service date, no salvage value, no useful life, no serial number, no
 * custodian, no location — and no accumulated-depreciation account, so net
 * book value was not derivable from anything the system held.
 *
 * Its depreciation run read `SELECT ISNULL(MAX(MoveNo),0) FROM Transactions`
 * with no filter at all, posted two lines against the hardcoded English
 * strings 'Fixed Assets' and 'Depreciation Expenses' into a database whose
 * account tree is in Arabic, and had nothing to stop a second click posting
 * the entire batch again (frmFixedAssetsManagement.vb:272-313).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Principal } from '@/lib/auth/rbac';
import { ForbiddenError, MfaRequiredError } from '@/lib/auth/rbac';
import { findSodViolations } from '@/lib/auth/permissions';
import { verifyChain } from '@/lib/audit/log';
import { buildSchedule, ScheduleError } from '@/lib/assets/schedule';
import { sum } from '@/lib/money';
import {
  AssetError,
  assetPosition,
  capitaliseAsset,
  DEFAULT_ASSET_CATEGORIES,
  disposeAsset,
  extendSchedules,
  installAssetCategories,
  moveAsset,
} from '@/lib/assets/register';
import {
  assetSchedule,
  reconcileAssetRegister,
  runDepreciation,
} from '@/lib/assets/depreciation';
import { runJob, JobInFlightError, listJobRuns } from '@/lib/jobs/runner';
import { setPeriodStatus } from '@/lib/ledger/fiscal-year';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';

let uni: University;
let keeper: Principal;
let accountant: Principal;
let controller: Principal;

const JAN_1 = new Date(Date.UTC(2026, 0, 1));
const JAN_20 = new Date(Date.UTC(2026, 0, 20));
const FEB = new Date(Date.UTC(2026, 1, 10));

let assetSeq = 0;

/** Monthly periods of 2026, as the schedule builder wants them. */
function monthsOf2026(count = 12) {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i + 1}`,
    startDate: new Date(Date.UTC(2026, i, 1)),
    endDate: new Date(Date.UTC(2026, i + 1, 0)),
  }));
}

async function capitalise(
  opts: {
    cost?: string;
    salvage?: string;
    life?: number;
    inService?: Date;
    category?: string;
  } = {},
) {
  assetSeq += 1;
  return capitaliseAsset(keeper, {
    assetCode: `FA-${String(assetSeq).padStart(4, '0')}`,
    categoryId: uni.assetCategories[opts.category ?? 'IT_EQUIPMENT'],
    nameAr: 'جهاز حاسوب',
    nameEn: `Asset ${assetSeq}`,
    purchaseDate: JAN_1,
    inServiceDate: opts.inService ?? JAN_1,
    purchaseCost: opts.cost ?? '12000',
    salvageValue: opts.salvage ?? '0',
    usefulLifeMonths: opts.life ?? 12,
    costCenterId: uni.costCenterId,
    fundingAccountId: uni.accounts['11121'],
  });
}

beforeAll(async () => {
  uni = await makeUniversity({ openPeriods: [1, 2, 3, 4] });

  keeper = await makePrincipal(uni.tenantId, ['asset.manage', 'asset.depreciate'], {
    name: 'assetkeeper',
  });
  accountant = await makePrincipal(uni.tenantId, ['asset.depreciate', 'report.financial'], {
    name: 'assetacct',
  });
  controller = await makePrincipal(uni.tenantId, ['asset.dispose', 'asset.manage'], {
    name: 'assetctrl',
  });
});

afterAll(async () => {
  await disconnectAll();
});

// ---------------------------------------------------------------------------

describe('the depreciation schedule', () => {
  // Pure arithmetic, no database. This is the one place in A5 where a mistake
  // is silent: a schedule a few piastres short simply leaves a residue on the
  // books forever, and nobody notices until an asset that should be fully
  // written down still carries a balance.

  it('spreads cost less salvage evenly, and sums to exactly the depreciable base', () => {
    const rows = buildSchedule({
      cost: '12000',
      salvageValue: '0',
      usefulLifeMonths: 12,
      method: 'STRAIGHT_LINE',
      inServiceDate: JAN_1,
      periods: monthsOf2026(),
    });
    expect(rows).toHaveLength(12);
    expect(rows.every((r) => r.amount.toFixed(2) === '1000.00')).toBe(true);
    expect(rows[11].netBookValue.toFixed(2)).toBe('0.00');
  });

  it('leaves no residue when the base does not divide evenly', () => {
    // 10000 / 3 is 3333.3333 three times, which is 9999.9999. The last period
    // absorbs the difference — same discipline as allocate() in money.ts.
    const rows = buildSchedule({
      cost: '10000',
      salvageValue: '0',
      usefulLifeMonths: 3,
      method: 'STRAIGHT_LINE',
      inServiceDate: JAN_1,
      periods: monthsOf2026(),
    });
    // Summed as Decimals, deliberately. Adding these through JS numbers gives
    // 9999.999999999998 — which is the error the whole product exists to
    // avoid, and a test that reintroduces it proves nothing.
    expect(sum(rows.map((r) => r.amount)).toFixed(4)).toBe('10000.0000');
    expect(rows.at(-1)!.netBookValue.toFixed(4)).toBe('0.0000');
  });

  it('stops at salvage rather than depreciating to nothing', () => {
    const rows = buildSchedule({
      cost: '10000',
      salvageValue: '2500',
      usefulLifeMonths: 5,
      method: 'STRAIGHT_LINE',
      inServiceDate: JAN_1,
      periods: monthsOf2026(),
    });
    expect(sum(rows.map((r) => r.amount)).toFixed(4)).toBe('7500.0000');
    expect(rows.at(-1)!.netBookValue.toFixed(2)).toBe('2500.00');
  });

  it('prorates the first period from the in-service date, by days', () => {
    // Installed on 20 January: 12 of January's 31 days.
    const rows = buildSchedule({
      cost: '3100',
      salvageValue: '0',
      usefulLifeMonths: 10,
      method: 'STRAIGHT_LINE',
      inServiceDate: JAN_20,
      periods: monthsOf2026(),
    });
    expect(Number(rows[0].amount)).toBeCloseTo((3100 / 10) * (12 / 31), 4);
    expect(Number(rows[1].amount)).toBeCloseTo(310, 4);
    // And it still adds up.
    expect(sum(rows.map((r) => r.amount)).toFixed(4)).toBe('3100.0000');
  });

  it('skips periods that ended before the asset was in service', () => {
    const rows = buildSchedule({
      cost: '1200',
      salvageValue: '0',
      usefulLifeMonths: 6,
      method: 'STRAIGHT_LINE',
      inServiceDate: new Date(Date.UTC(2026, 5, 1)),
      periods: monthsOf2026(),
    });
    // June onwards.
    expect(rows).toHaveLength(6);
  });

  it('terminates under reducing balance, which the legacy calculation never did', () => {
    // The legacy screen multiplied the account's *current balance* by a
    // percentage each time it was opened. That curve never reaches zero.
    const rows = buildSchedule({
      cost: '10000',
      salvageValue: '1000',
      usefulLifeMonths: 12,
      method: 'REDUCING_BALANCE',
      inServiceDate: JAN_1,
      periods: monthsOf2026(24),
    });
    expect(rows.length).toBeLessThanOrEqual(12);
    expect(sum(rows.map((r) => r.amount)).toFixed(4)).toBe('9000.0000');
    expect(rows.at(-1)!.netBookValue.toFixed(2)).toBe('1000.00');
    // Front-loaded, which is the point of the method.
    expect(Number(rows[0].amount)).toBeGreaterThan(Number(rows.at(-1)!.amount));
  });

  it('produces nothing for an asset that does not depreciate', () => {
    expect(
      buildSchedule({
        cost: '500000',
        usefulLifeMonths: 0,
        method: 'NONE',
        inServiceDate: JAN_1,
        periods: monthsOf2026(),
      }),
    ).toEqual([]);
  });

  it('refuses a salvage value at or above cost', () => {
    expect(() =>
      buildSchedule({
        cost: '1000',
        salvageValue: '1000',
        usefulLifeMonths: 12,
        method: 'STRAIGHT_LINE',
        inServiceDate: JAN_1,
        periods: monthsOf2026(),
      }),
    ).toThrow(ScheduleError);
  });
});

// ---------------------------------------------------------------------------

describe('capitalisation', () => {
  it('ships a category per class of asset, each bound to its account triple', async () => {
    // Deliberately not three sibling relations in one query: Prisma 7 fans
    // those loads out concurrently onto the transaction's single connection,
    // which `pg` queues today with a deprecation warning and will refuse at
    // pg 9. Two siblings are fine; three are not. Confirmed twice now — once
    // in A3's statement of account, once here.
    const cats = await asTenant(uni.tenantId, (tx) =>
      tx.assetCategory.findMany({
        where: { tenantId: uni.tenantId },
        select: {
          code: true,
          assetAccountId: true,
          accumulatedAccountId: true,
          expenseAccountId: true,
        },
      }),
    );
    expect(cats).toHaveLength(DEFAULT_ASSET_CATEGORIES.length);

    const codeById = new Map(
      (
        await asTenant(uni.tenantId, (tx) =>
          tx.account.findMany({
            where: { tenantId: uni.tenantId },
            select: { id: true, code: true },
          }),
        )
      ).map((a) => [a.id, a.code]),
    );

    const it_ = cats.find((c) => c.code === 'IT_EQUIPMENT')!;
    expect(codeById.get(it_.assetAccountId)).toBe('12122');
    // The contra-asset the legacy chart did not have at all.
    expect(codeById.get(it_.accumulatedAccountId)).toBe('12212');
    expect(codeById.get(it_.expenseAccountId)).toBe('51311');
  });

  it('brings the asset onto the books and lays down its whole schedule', async () => {
    const asset = await capitalise({ cost: '12000', life: 12 });

    expect(asset.scheduledPeriods).toBe(12);
    expect(asset.scheduledTotal).toBe('12000.0000');

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: asset.headerId },
        select: { debitAmount: true, creditAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(lines.find((l) => l.account.code === '12122')?.debitAmount.toFixed(2)).toBe('12000.00');
    expect(lines.find((l) => l.account.code === '11121')?.creditAmount.toFixed(2)).toBe('12000.00');
  });

  it('takes the category defaults when none are given', async () => {
    assetSeq += 1;
    const asset = await capitaliseAsset(keeper, {
      assetCode: `FA-DEF-${assetSeq}`,
      categoryId: uni.assetCategories.VEHICLE,
      nameAr: 'سيارة',
      nameEn: 'Minibus',
      purchaseDate: JAN_1,
      purchaseCost: '100000',
      costCenterId: uni.costCenterId,
      fundingAccountId: uni.accounts['11121'],
    });

    const row = await asTenant(uni.tenantId, (tx) =>
      tx.fixedAsset.findUniqueOrThrow({
        where: { id: asset.assetId },
        select: { usefulLifeMonths: true, salvageValue: true, method: true },
      }),
    );
    // Vehicles: 60 months, 15% salvage.
    expect(row.usefulLifeMonths).toBe(60);
    expect(row.salvageValue.toFixed(2)).toBe('15000.00');
    expect(row.method).toBe('STRAIGHT_LINE');
  });

  it('depreciates from the in-service date, not the purchase date', async () => {
    // A lab bench delivered in January and installed in February depreciates
    // from February.
    const asset = await capitalise({
      cost: '1200',
      life: 12,
      inService: new Date(Date.UTC(2026, 1, 1)),
    });
    const schedule = await assetSchedule(keeper, asset.assetId);
    expect(schedule[0].periodSeq).toBe(2);
  });

  it('refuses an in-service date before the purchase date', async () => {
    assetSeq += 1;
    await expect(
      capitaliseAsset(keeper, {
        assetCode: `FA-BAD-${assetSeq}`,
        categoryId: uni.assetCategories.IT_EQUIPMENT,
        nameAr: 'جهاز',
        nameEn: 'Impossible',
        purchaseDate: FEB,
        inServiceDate: JAN_1,
        purchaseCost: '1000',
        costCenterId: uni.costCenterId,
        fundingAccountId: uni.accounts['11121'],
      }),
    ).rejects.toBeInstanceOf(AssetError);
  });

  it('refuses an asset with no cost centre when the expense account needs one', async () => {
    assetSeq += 1;
    await expect(
      capitaliseAsset(keeper, {
        assetCode: `FA-NOCC-${assetSeq}`,
        categoryId: uni.assetCategories.IT_EQUIPMENT,
        nameAr: 'جهاز',
        nameEn: 'No cost centre',
        purchaseDate: JAN_1,
        purchaseCost: '1000',
        fundingAccountId: uni.accounts['11121'],
      }),
    ).rejects.toThrow(/requires a cost centre/);
  });

  it('needs asset.manage', async () => {
    assetSeq += 1;
    await expect(
      capitaliseAsset(accountant, {
        assetCode: `FA-PERM-${assetSeq}`,
        categoryId: uni.assetCategories.IT_EQUIPMENT,
        nameAr: 'جهاز',
        nameEn: 'Forbidden',
        purchaseDate: JAN_1,
        purchaseCost: '1000',
        costCenterId: uni.costCenterId,
        fundingAccountId: uni.accounts['11121'],
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('is idempotent to install', async () => {
    const again = await installAssetCategories(uni.tenantId, uni.adminUserId);
    expect(again.created).toBe(0);
    expect(again.skipped).toBe(DEFAULT_ASSET_CATEGORIES.length);
  });
});

// ---------------------------------------------------------------------------

describe('the depreciation batch', () => {
  it('charges the period and credits the contra-asset', async () => {
    const fresh = await makeUniversity({ openPeriods: [1, 2, 3] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage', 'asset.depreciate'], {
      name: 'depk',
    });

    await capitaliseAsset(k, {
      assetCode: 'DEP-1',
      categoryId: fresh.assetCategories.IT_EQUIPMENT,
      nameAr: 'جهاز',
      nameEn: 'Laptop',
      purchaseDate: JAN_1,
      purchaseCost: '12000',
      salvageValue: '0',
      usefulLifeMonths: 12,
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });

    const run = await runDepreciation(k, fresh.periodIds[0]);
    expect(run.assetsCharged).toBe(1);
    expect(run.amount).toBe('1000.0000');
    expect(run.voucherRef).toMatch(/^DEP-2026-\d{6}$/);

    const lines = await asTenant(fresh.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: run.headerId! },
        select: {
          debitAmount: true,
          creditAmount: true,
          account: { select: { code: true } },
          costCenterId: true,
        },
      }),
    );
    // Expense by cost centre, accumulated depreciation by category.
    const expense = lines.find((l) => l.account.code === '51311')!;
    expect(expense.debitAmount.toFixed(2)).toBe('1000.00');
    expect(expense.costCenterId).toBe(fresh.costCenterId);
    expect(lines.find((l) => l.account.code === '12212')?.creditAmount.toFixed(2)).toBe('1000.00');
  });

  it('does not post twice when it is run twice', async () => {
    // The legacy batch had no such guard: a second click posted everything
    // again, against voucher numbers taken from an unfiltered MAX().
    const fresh = await makeUniversity({ openPeriods: [1, 2] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage', 'asset.depreciate'], {
      name: 'idemdep',
    });
    await capitaliseAsset(k, {
      assetCode: 'DEP-2',
      categoryId: fresh.assetCategories.IT_EQUIPMENT,
      nameAr: 'جهاز',
      nameEn: 'Laptop',
      purchaseDate: JAN_1,
      purchaseCost: '6000',
      usefulLifeMonths: 6,
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });

    const first = await runDepreciation(k, fresh.periodIds[0]);
    const second = await runDepreciation(k, fresh.periodIds[0]);
    expect(second.headerId).toBe(first.headerId);

    const vouchers = await asTenant(fresh.tenantId, (tx) =>
      tx.transactionHeader.count({
        where: { tenantId: fresh.tenantId, voucherType: 'DEPRECIATION' },
      }),
    );
    expect(vouchers).toBe(1);
  });

  it('reports what it left out and why', async () => {
    const fresh = await makeUniversity({ openPeriods: [1, 2] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage', 'asset.depreciate'], {
      name: 'skipdep',
    });
    const d = await makePrincipal(fresh.tenantId, ['asset.dispose'], { name: 'skipdisp' });

    await capitaliseAsset(k, {
      assetCode: 'SKIP-1',
      categoryId: fresh.assetCategories.IT_EQUIPMENT,
      nameAr: 'جهاز',
      nameEn: 'Disposed early',
      purchaseDate: JAN_1,
      purchaseCost: '6000',
      usefulLifeMonths: 6,
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });
    await capitaliseAsset(k, {
      assetCode: 'SKIP-2',
      categoryId: fresh.assetCategories.IT_EQUIPMENT,
      nameAr: 'جهاز',
      nameEn: 'Still running',
      purchaseDate: JAN_1,
      purchaseCost: '6000',
      usefulLifeMonths: 6,
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });

    const disposed = await asTenant(fresh.tenantId, (tx) =>
      tx.fixedAsset.findFirstOrThrow({
        where: { assetCode: 'SKIP-1' },
        select: { id: true },
      }),
    );
    await disposeAsset(d, disposed.id, {
      disposedOn: JAN_20,
      reason: 'Stolen',
      writeOff: true,
    });

    // The disposal cancelled SKIP-1's unposted schedule outright, so it does
    // not even appear as skipped — which is the honest outcome.
    const run = await runDepreciation(k, fresh.periodIds[0]);
    expect(run.assetsCharged).toBe(1);
    expect(run.amount).toBe('1000.0000');
  });

  it('refuses a period that is not open', async () => {
    const fresh = await makeUniversity({ openPeriods: [1] });
    const k = await makePrincipal(fresh.tenantId, ['asset.depreciate'], { name: 'closeddep' });
    const closer = await makePrincipal(fresh.tenantId, ['period.close'], { name: 'depcloser' });

    await setPeriodStatus(closer, fresh.periodIds[0], 'CLOSED');
    await expect(runDepreciation(k, fresh.periodIds[0])).rejects.toThrow(/CLOSED/);
  });

  it('needs asset.depreciate', async () => {
    await expect(runDepreciation(controller, uni.periodIds[0])).rejects.toBeInstanceOf(
      ForbiddenError,
    );
  });

  it('extends schedules into a fiscal year that did not exist yet', async () => {
    // A forty-year building outlives any calendar in the system on the day it
    // is bought.
    const fresh = await makeUniversity({ openPeriods: [1] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage'], { name: 'extk' });
    const closer = await makePrincipal(fresh.tenantId, ['period.close'], { name: 'extcloser' });

    await capitaliseAsset(k, {
      assetCode: 'LONG-1',
      categoryId: fresh.assetCategories.BUILDING,
      nameAr: 'مبنى',
      nameEn: 'Lecture block',
      purchaseDate: JAN_1,
      purchaseCost: '4800000',
      salvageValue: '0',
      usefulLifeMonths: 480,
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });

    const before = await assetSchedule(k, (await firstAssetId(fresh.tenantId, 'LONG-1'))!);
    expect(before).toHaveLength(12); // only 2026 exists

    const { openFiscalYear } = await import('@/lib/ledger/fiscal-year');
    await openFiscalYear(closer, { name: '2027', startYear: 2027, startMonth: 1 });

    const extended = await extendSchedules(k);
    expect(extended.rowsAdded).toBe(12);

    const after = await assetSchedule(k, (await firstAssetId(fresh.tenantId, 'LONG-1'))!);
    expect(after).toHaveLength(24);
  });
});

async function firstAssetId(tenantId: string, code: string): Promise<string | null> {
  const a = await asTenant(tenantId, (tx) =>
    tx.fixedAsset.findFirst({ where: { assetCode: code }, select: { id: true } }),
  );
  return a?.id ?? null;
}

// ---------------------------------------------------------------------------

describe('disposal', () => {
  it('derecognises cost and accumulated depreciation, and books the gain', async () => {
    const fresh = await makeUniversity({ openPeriods: [1, 2, 3] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage', 'asset.depreciate'], {
      name: 'dispk',
    });
    const d = await makePrincipal(fresh.tenantId, ['asset.dispose'], { name: 'dispd' });

    await capitaliseAsset(k, {
      assetCode: 'SELL-1',
      categoryId: fresh.assetCategories.VEHICLE,
      nameAr: 'سيارة',
      nameEn: 'Minibus',
      purchaseDate: JAN_1,
      purchaseCost: '12000',
      salvageValue: '0',
      usefulLifeMonths: 12,
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });
    await runDepreciation(k, fresh.periodIds[0]); // 1000 charged

    const assetId = (await firstAssetId(fresh.tenantId, 'SELL-1'))!;
    const result = await disposeAsset(d, assetId, {
      disposedOn: FEB,
      reason: 'Sold at auction',
      proceeds: '12500',
      proceedsAccountId: fresh.accounts['11121'],
    });

    // NBV is 12000 - 1000 = 11000; proceeds 12500 is a 1500 gain.
    expect(result.netBookValue).toBe('11000.0000');
    expect(result.gainOrLoss).toBe('1500.0000');

    const lines = await asTenant(fresh.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: result.headerId },
        select: { debitAmount: true, creditAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(lines.find((l) => l.account.code === '12214')?.debitAmount.toFixed(2)).toBe('1000.00');
    expect(lines.find((l) => l.account.code === '12141')?.creditAmount.toFixed(2)).toBe('12000.00');
    expect(lines.find((l) => l.account.code === '53111')?.creditAmount.toFixed(2)).toBe('1500.00');
  });

  it('books a loss when the proceeds fall short', async () => {
    const asset = await capitalise({ cost: '10000', life: 10 });
    const result = await disposeAsset(controller, asset.assetId, {
      disposedOn: FEB,
      reason: 'Scrapped',
      proceeds: '0',
    });
    expect(result.netBookValue).toBe('10000.0000');
    expect(result.gainOrLoss).toBe('-10000.0000');

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: result.headerId },
        select: { debitAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(lines.find((l) => l.account.code === '53111')?.debitAmount.toFixed(2)).toBe('10000.00');
  });

  it('stops future charges but keeps the ones already posted', async () => {
    const fresh = await makeUniversity({ openPeriods: [1, 2] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage', 'asset.depreciate'], {
      name: 'stopk',
    });
    const d = await makePrincipal(fresh.tenantId, ['asset.dispose'], { name: 'stopd' });

    await capitaliseAsset(k, {
      assetCode: 'STOP-1',
      categoryId: fresh.assetCategories.IT_EQUIPMENT,
      nameAr: 'جهاز',
      nameEn: 'Laptop',
      purchaseDate: JAN_1,
      purchaseCost: '12000',
      usefulLifeMonths: 12,
      salvageValue: '0',
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });
    await runDepreciation(k, fresh.periodIds[0]);

    const assetId = (await firstAssetId(fresh.tenantId, 'STOP-1'))!;
    const result = await disposeAsset(d, assetId, {
      disposedOn: FEB,
      reason: 'Sold',
      proceeds: '11000',
      proceedsAccountId: fresh.accounts['11121'],
    });
    expect(result.cancelledScheduleRows).toBe(11);

    const remaining = await assetSchedule(k, assetId);
    expect(remaining).toHaveLength(1);
    expect(remaining[0].posted).toBe(true);
  });

  it('refuses a posted charge being deleted, even by a disposal', async () => {
    const fresh = await makeUniversity({ openPeriods: [1] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage', 'asset.depreciate'], {
      name: 'delk',
    });
    await capitaliseAsset(k, {
      assetCode: 'DEL-1',
      categoryId: fresh.assetCategories.IT_EQUIPMENT,
      nameAr: 'جهاز',
      nameEn: 'Laptop',
      purchaseDate: JAN_1,
      purchaseCost: '1200',
      usefulLifeMonths: 12,
      salvageValue: '0',
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });
    await runDepreciation(k, fresh.periodIds[0]);

    await expect(
      asSystem((tx) =>
        tx.$executeRaw`DELETE FROM depreciation_entries WHERE posted_at IS NOT NULL`,
      ),
    ).rejects.toThrow(/posted depreciation charge cannot be deleted/i);
  });

  it('cannot be disposed of twice', async () => {
    const asset = await capitalise();
    await disposeAsset(controller, asset.assetId, {
      disposedOn: FEB,
      reason: 'Scrapped',
      proceeds: '0',
    });
    await expect(
      disposeAsset(controller, asset.assetId, {
        disposedOn: FEB,
        reason: 'Again',
        proceeds: '0',
      }),
    ).rejects.toThrow(/already/i);
  });

  it('demands a reason, a second factor, and the right permission', async () => {
    const asset = await capitalise();
    await expect(
      disposeAsset(controller, asset.assetId, { disposedOn: FEB, reason: '  ' }),
    ).rejects.toThrow(/reason/i);

    await expect(
      disposeAsset(keeper, asset.assetId, { disposedOn: FEB, reason: 'Not allowed' }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const noMfa = await makePrincipal(uni.tenantId, ['asset.dispose'], {
      name: 'dispnomfa',
      mfaVerified: false,
    });
    await expect(
      disposeAsset(noMfa, asset.assetId, { disposedOn: FEB, reason: 'No second factor' }),
    ).rejects.toBeInstanceOf(MfaRequiredError);
  });

  it('is barred by the segregation matrix from being held with asset.manage', async () => {
    // Whoever maintains the register must not also write assets off it.
    expect(findSodViolations(['asset.manage', 'asset.dispose'])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------

describe('custody', () => {
  it('keeps a history of where the asset has been', async () => {
    const asset = await capitalise();
    const custodian = await makePrincipal(uni.tenantId, [], { name: 'custodian' });

    await moveAsset(keeper, asset.assetId, {
      toLocation: 'Lab 3',
      toCustodianId: custodian.userId,
      movedOn: JAN_20,
      reason: 'Moved for the new term',
    });
    await moveAsset(keeper, asset.assetId, {
      toLocation: 'Lab 5',
      movedOn: FEB,
    });

    const history = await asTenant(uni.tenantId, (tx) =>
      tx.assetMovement.findMany({
        where: { assetId: asset.assetId },
        orderBy: { occurredAt: 'asc' },
        select: { fromLocation: true, toLocation: true, toCustodianId: true },
      }),
    );
    expect(history).toHaveLength(2);
    expect(history[0].toLocation).toBe('Lab 3');
    expect(history[1].fromLocation).toBe('Lab 3');
    // The custodian carried over when only the location changed.
    expect(history[1].toCustodianId).toBe(custodian.userId);
  });

  it('keeps that history append-only', async () => {
    const asset = await capitalise();
    await moveAsset(keeper, asset.assetId, { toLocation: 'Store', movedOn: JAN_20 });
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE asset_movements SET to_location = 'elsewhere' WHERE asset_id = ${asset.assetId}::uuid`,
      ),
    ).rejects.toThrow(/append-only/i);
  });

  it('refuses a move that changes nothing', async () => {
    const asset = await capitalise();
    await expect(
      moveAsset(keeper, asset.assetId, { movedOn: JAN_20 }),
    ).rejects.toThrow(/change nothing/i);
  });
});

// ---------------------------------------------------------------------------

describe('the job runner', () => {
  it('runs once and replays afterwards', async () => {
    let calls = 0;
    const spec = { type: 'test', key: `t-${Date.now()}` };
    const run = () =>
      runJob(keeper, spec, async () => {
        calls += 1;
        return { value: calls };
      });

    const first = await run();
    const second = await run();

    expect(calls).toBe(1);
    expect(first.executed).toBe(true);
    expect(second.executed).toBe(false);
    expect(second.result).toEqual({ value: 1 });
  });

  it('records a failure, and lets the same key be attempted again', async () => {
    const spec = { type: 'test', key: `f-${Date.now()}` };
    await expect(
      runJob(keeper, spec, async () => {
        throw new Error('bank was closed');
      }),
    ).rejects.toThrow(/bank was closed/);

    const runs = await listJobRuns(keeper, { jobType: 'test' });
    const failed = runs.find((r) => r.jobKey === spec.key)!;
    expect(failed.status).toBe('FAILED');
    expect(failed.errorText).toMatch(/bank was closed/);

    // A transient failure must not strand the batch forever.
    const retry = await runJob(keeper, spec, async () => ({ ok: true }));
    expect(retry.executed).toBe(true);
    expect(retry.attempts).toBe(2);
  });

  it('leaves nothing behind when the work fails', async () => {
    const fresh = await makeUniversity({ openPeriods: [1] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage'], { name: 'rollbackk' });

    await expect(
      runJob(k, { type: 'test', key: 'rollback' }, async (tx) => {
        await tx.assetCategory.create({
          data: {
            tenantId: fresh.tenantId,
            code: 'GHOST',
            nameAr: 'شبح',
            nameEn: 'Ghost',
            assetAccountId: fresh.accounts['12122'],
            accumulatedAccountId: fresh.accounts['12212'],
            expenseAccountId: fresh.accounts['51311'],
            defaultUsefulLifeMonths: 12,
          },
        });
        throw new Error('deliberate');
      }),
    ).rejects.toThrow(/deliberate/);

    const ghost = await asTenant(fresh.tenantId, (tx) =>
      tx.assetCategory.count({ where: { code: 'GHOST' } }),
    );
    expect(ghost).toBe(0);
  });

  it('refuses to start a second run while one is in flight', async () => {
    const spec = { type: 'test', key: `flight-${Date.now()}` };
    await asSystem((tx) =>
      tx.jobRun.create({
        data: {
          tenantId: uni.tenantId,
          jobType: spec.type,
          jobKey: spec.key,
          status: 'RUNNING',
          requestedById: keeper.userId,
        },
      }),
    );
    await expect(runJob(keeper, spec, async () => ({}))).rejects.toBeInstanceOf(JobInFlightError);
  });

  it('makes a succeeded run final', async () => {
    const spec = { type: 'test', key: `final-${Date.now()}` };
    const done = await runJob(keeper, spec, async () => ({ done: true }));
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE job_runs SET status = 'RUNNING' WHERE id = ${done.jobRunId}::uuid`,
      ),
    ).rejects.toThrow(/already succeeded/i);
  });

  it('keeps the record that a batch happened', async () => {
    const spec = { type: 'test', key: `keep-${Date.now()}` };
    const done = await runJob(keeper, spec, async () => ({ done: true }));
    await expect(
      asSystem((tx) => tx.$executeRaw`DELETE FROM job_runs WHERE id = ${done.jobRunId}::uuid`),
    ).rejects.toThrow(/cannot be deleted/i);
  });
});

// ---------------------------------------------------------------------------

describe('reconciliation', () => {
  it('keeps the register equal to the ledger through a year of activity', async () => {
    const fresh = await makeUniversity({ openPeriods: [1, 2, 3, 4, 5, 6] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage', 'asset.depreciate'], {
      name: 'reconk',
    });
    const d = await makePrincipal(fresh.tenantId, ['asset.dispose'], { name: 'recond' });

    // Six assets across four categories, with awkward amounts.
    const specs = [
      { code: 'R-1', cat: 'IT_EQUIPMENT', cost: '12345.67', life: 36 },
      { code: 'R-2', cat: 'LAB_EQUIPMENT', cost: '98765.43', life: 60 },
      { code: 'R-3', cat: 'FURNITURE', cost: '5000', life: 120 },
      { code: 'R-4', cat: 'VEHICLE', cost: '250000', life: 60 },
      { code: 'R-5', cat: 'IT_EQUIPMENT', cost: '3333.33', life: 36 },
      { code: 'R-6', cat: 'LIBRARY', cost: '17500.50', life: 120 },
    ];
    for (const s of specs) {
      await capitaliseAsset(k, {
        assetCode: s.code,
        categoryId: fresh.assetCategories[s.cat],
        nameAr: 'أصل',
        nameEn: s.code,
        purchaseDate: JAN_1,
        inServiceDate: s.code === 'R-5' ? JAN_20 : JAN_1,
        purchaseCost: s.cost,
        usefulLifeMonths: s.life,
        costCenterId: fresh.costCenterId,
        fundingAccountId: fresh.accounts['11121'],
      });
    }

    for (let i = 0; i < 4; i += 1) {
      await runDepreciation(k, fresh.periodIds[i]);
    }

    // One sold at a gain, one written off.
    await disposeAsset(d, (await firstAssetId(fresh.tenantId, 'R-3'))!, {
      disposedOn: new Date(Date.UTC(2026, 4, 15)),
      reason: 'Sold to a partner college',
      proceeds: '4900',
      proceedsAccountId: fresh.accounts['11121'],
    });
    await disposeAsset(d, (await firstAssetId(fresh.tenantId, 'R-5'))!, {
      disposedOn: new Date(Date.UTC(2026, 4, 20)),
      reason: 'Stolen from the lab',
      writeOff: true,
    });

    await runDepreciation(k, fresh.periodIds[4]);

    const recon = await asTenant(fresh.tenantId, (tx) =>
      reconcileAssetRegister(tx, fresh.tenantId),
    );
    expect(recon.costVariance, JSON.stringify(recon, null, 2)).toBe('0.0000');
    expect(recon.accumulatedVariance, JSON.stringify(recon, null, 2)).toBe('0.0000');
    expect(Number(recon.registerCost)).toBeGreaterThan(0);
    expect(Number(recon.registerAccumulated)).toBeGreaterThan(0);
  });

  it('derives net book value from posted charges, never by recomputation', async () => {
    const fresh = await makeUniversity({ openPeriods: [1, 2] });
    const k = await makePrincipal(fresh.tenantId, ['asset.manage', 'asset.depreciate'], {
      name: 'nbvk',
    });
    await capitaliseAsset(k, {
      assetCode: 'NBV-1',
      categoryId: fresh.assetCategories.IT_EQUIPMENT,
      nameAr: 'جهاز',
      nameEn: 'Laptop',
      purchaseDate: JAN_1,
      purchaseCost: '12000',
      salvageValue: '0',
      usefulLifeMonths: 12,
      costCenterId: fresh.costCenterId,
      fundingAccountId: fresh.accounts['11121'],
    });
    const assetId = (await firstAssetId(fresh.tenantId, 'NBV-1'))!;

    const before = await asTenant(fresh.tenantId, (tx) =>
      assetPosition(tx, fresh.tenantId, assetId),
    );
    expect(before.accumulated).toBe('0.0000');
    expect(before.netBookValue).toBe('12000.0000');

    await runDepreciation(k, fresh.periodIds[0]);
    await runDepreciation(k, fresh.periodIds[1]);

    const after = await asTenant(fresh.tenantId, (tx) =>
      assetPosition(tx, fresh.tenantId, assetId),
    );
    expect(after.accumulated).toBe('2000.0000');
    expect(after.netBookValue).toBe('10000.0000');
  });

  it('will not let cost be edited after capitalisation', async () => {
    // Every charge already taken depends on it.
    const asset = await capitalise();
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE fixed_assets SET purchase_cost = 1 WHERE id = ${asset.assetId}::uuid`,
      ),
    ).rejects.toThrow(/fixed once capitalised/i);
  });

  it('leaves an intact audit chain', async () => {
    const v = await asTenant(uni.tenantId, (tx) => verifyChain(tx, uni.tenantId));
    expect(v.ok, v.reason).toBe(true);
  });

  it('keeps assets inside their tenant', async () => {
    const other = await makeUniversity();
    const seen = await asTenant(other.tenantId, async (tx) => ({
      assets: await tx.fixedAsset.count(),
      schedule: await tx.depreciationEntry.count(),
      jobs: await tx.jobRun.count(),
    }));
    expect(seen.assets).toBe(0);
    expect(seen.schedule).toBe(0);
    expect(seen.jobs).toBe(0);
  });
});
