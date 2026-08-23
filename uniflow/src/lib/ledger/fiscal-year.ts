import 'server-only';
import type { PeriodStatus } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { monthlyPeriods, toDateOnly } from './period';
import { ALL_VOUCHER_TYPES, initialiseSequences } from './sequence';

/**
 * Opening a fiscal year (SRS Module 12).
 *
 * Three things have to happen together or the year is unusable in a way that
 * only shows up at the first posting:
 *
 *   1. the year itself,
 *   2. its periods, non-overlapping (the GiST exclusion constraint refuses
 *      anything else),
 *   3. a document number counter per voucher type, because
 *      `allocateDocumentNumber` will not invent one.
 *
 * Doing them in one transaction is what stops a half-open year existing. The
 * legacy E-University build had no fiscal year concept at all — an earlier
 * product in the same codebase had `frmCloseYear.vb` and the university build
 * dropped it — so a mistyped year on a voucher silently rewrote a prior
 * year's results.
 */

export class FiscalYearError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FiscalYearError';
  }
}

export interface OpenFiscalYearInput {
  /** Label used in document references: "2026", "2026/27". */
  name: string;
  /** First calendar year of the fiscal year. */
  startYear: number;
  /** 1-12. Defaults to the tenant's configured fiscal year start. */
  startMonth?: number;
  /**
   * Which period sequence numbers start OPEN. Defaults to the first only:
   * opening a whole year at once means a mistyped date lands eleven months
   * away without anything refusing it.
   */
  openPeriods?: number[];
}

export interface OpenedFiscalYear {
  fiscalYearId: string;
  periodIds: string[];
}

export async function openFiscalYear(
  principal: Principal,
  input: OpenFiscalYearInput,
): Promise<OpenedFiscalYear> {
  requirePermission(principal, 'period.close');

  return withTenant(principal.tenantId, async (tx) => {
    const result = await provisionFiscalYear(tx, principal.tenantId, input);

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'PERIOD_OPEN',
      resourceType: 'fiscal_year',
      resourceId: result.fiscalYearId,
      after: {
        name: input.name,
        startYear: input.startYear,
        periods: result.periodIds.length,
        openPeriods: input.openPeriods ?? [1],
      },
    });

    return result;
  });
}

/**
 * The same work without a principal, for tenant onboarding — which happens
 * before any staff user exists to hold `period.close`.
 */
export async function provisionFiscalYear(
  tx: Tx,
  tenantId: string,
  input: OpenFiscalYearInput,
): Promise<OpenedFiscalYear> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { fiscalYearStartMonth: true },
  });
  const startMonth = input.startMonth ?? tenant.fiscalYearStartMonth;
  if (startMonth < 1 || startMonth > 12) {
    throw new FiscalYearError(`Fiscal year start month must be 1-12, got ${startMonth}.`);
  }

  const existing = await tx.fiscalYear.findFirst({
    where: { tenantId, name: input.name },
    select: { id: true },
  });
  if (existing) {
    throw new FiscalYearError(`Fiscal year "${input.name}" already exists for this university.`);
  }

  const periods = monthlyPeriods(input.startYear, startMonth);
  const open = new Set(input.openPeriods ?? [1]);

  const year = await tx.fiscalYear.create({
    data: {
      tenantId,
      name: input.name,
      startDate: toDateOnly(periods[0].startDate),
      endDate: toDateOnly(periods[periods.length - 1].endDate),
      status: 'OPEN',
    },
    select: { id: true },
  });

  const periodIds: string[] = [];
  for (const p of periods) {
    const status: PeriodStatus = open.has(p.seq) ? 'OPEN' : 'FUTURE';
    const created = await tx.fiscalPeriod.create({
      data: {
        fiscalYearId: year.id,
        seq: p.seq,
        startDate: p.startDate,
        endDate: p.endDate,
        status,
      },
      select: { id: true },
    });
    periodIds.push(created.id);
  }

  await initialiseSequences(tx, tenantId, year.id, input.name, ALL_VOUCHER_TYPES);

  return { fiscalYearId: year.id, periodIds };
}

/**
 * Open or close a period.
 *
 * Closing is the control that makes a reported figure final: once a period is
 * closed, nothing can post into it, so last month's trial balance stays what
 * it was when it was signed. Reopening is possible but deliberately
 * permissioned and audited — `PERMANENTLY_CLOSED` is the state that cannot be
 * undone, and is what a year-end close leaves behind.
 */
export async function setPeriodStatus(
  principal: Principal,
  fiscalPeriodId: string,
  status: PeriodStatus,
): Promise<void> {
  requirePermission(principal, 'period.close');

  await withTenant(principal.tenantId, async (tx) => {
    const period = await tx.fiscalPeriod.findUnique({
      where: { id: fiscalPeriodId },
      select: {
        seq: true,
        status: true,
        fiscalYear: { select: { tenantId: true, name: true } },
      },
    });
    if (!period || period.fiscalYear.tenantId !== principal.tenantId) {
      throw new FiscalYearError('That fiscal period does not belong to this university.');
    }
    if (period.status === 'PERMANENTLY_CLOSED') {
      throw new FiscalYearError(
        `Period ${period.seq} of ${period.fiscalYear.name} is permanently closed. ` +
          `Post a correcting entry in an open period instead.`,
      );
    }

    await tx.fiscalPeriod.update({
      where: { id: fiscalPeriodId },
      data: {
        status,
        ...(status === 'CLOSED' || status === 'PERMANENTLY_CLOSED'
          ? { closedAt: new Date(), closedById: principal.userId }
          : { closedAt: null, closedById: null }),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: status === 'OPEN' ? 'PERIOD_OPEN' : 'PERIOD_CLOSE',
      resourceType: 'fiscal_period',
      resourceId: fiscalPeriodId,
      before: { status: period.status },
      after: { status, period: `${period.seq}/${period.fiscalYear.name}` },
    });
  });
}
