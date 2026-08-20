/**
 * Fiscal calendar and period resolution (SRS Module 12).
 *
 * The legacy E-University build has no fiscal period concept at all. An
 * earlier product in the same codebase (`ADC Acc App`) had `frmCloseYear.vb`;
 * the university build dropped it. The consequences: a mistyped year on a
 * voucher silently rewrote a closed year's results, and the opening-balance
 * columns of a trial balance were not computable at all.
 */
import type { Tx } from '@/lib/db/client';
import type { PeriodStatus } from '@/generated/prisma/enums';

export interface ResolvedPeriod {
  fiscalYearId: string;
  fiscalPeriodId: string;
  status: PeriodStatus;
}

/**
 * Find the period a document date falls in.
 *
 * Does not check that the period is open — the caller gets a specific error
 * for "no period exists" versus "period is closed", because they are
 * different problems with different fixes. The database rejects a closed
 * period regardless (trg_header_period_open); this is here so the user sees a
 * sentence rather than a constraint violation.
 */
export async function resolvePeriod(
  tx: Tx,
  tenantId: string,
  docDate: Date,
): Promise<ResolvedPeriod> {
  const day = toDateOnly(docDate);

  const period = await tx.fiscalPeriod.findFirst({
    where: {
      fiscalYear: { tenantId },
      startDate: { lte: day },
      endDate: { gte: day },
    },
    select: { id: true, status: true, fiscalYearId: true },
  });

  if (!period) {
    throw new NoFiscalPeriodError(day);
  }

  return {
    fiscalYearId: period.fiscalYearId,
    fiscalPeriodId: period.id,
    status: period.status,
  };
}

/** Resolve and require the period to be open. */
export async function resolveOpenPeriod(
  tx: Tx,
  tenantId: string,
  docDate: Date,
): Promise<ResolvedPeriod> {
  const resolved = await resolvePeriod(tx, tenantId, docDate);
  if (resolved.status !== 'OPEN') {
    throw new PeriodNotOpenError(toDateOnly(docDate), resolved.status);
  }
  return resolved;
}

/**
 * Normalise a timestamp to a UTC date. A document date is a calendar day, not
 * an instant: a receipt written on the 31st is on the 31st regardless of what
 * the cashier's clock thinks the timezone is, and it must not drift into the
 * next period because the server is in a different zone from the campus.
 */
export function toDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/**
 * Build the twelve monthly periods of a fiscal year starting at `startMonth`
 * (1-12). Returns date-only boundaries; the exclusion constraint in the
 * database rejects any overlap, so a bug here fails loudly at insert.
 */
export function monthlyPeriods(
  startYear: number,
  startMonth: number,
): Array<{ seq: number; startDate: Date; endDate: Date }> {
  const out: Array<{ seq: number; startDate: Date; endDate: Date }> = [];
  for (let i = 0; i < 12; i += 1) {
    const y = startYear + Math.floor((startMonth - 1 + i) / 12);
    const m = (startMonth - 1 + i) % 12;
    out.push({
      seq: i + 1,
      startDate: new Date(Date.UTC(y, m, 1)),
      // Day 0 of the next month is the last day of this one.
      endDate: new Date(Date.UTC(y, m + 1, 0)),
    });
  }
  return out;
}

export class NoFiscalPeriodError extends Error {
  constructor(readonly docDate: Date) {
    super(
      `No fiscal period covers ${docDate.toISOString().slice(0, 10)}. ` +
        `Create and open the fiscal year before posting to it.`,
    );
    this.name = 'NoFiscalPeriodError';
  }
}

export class PeriodNotOpenError extends Error {
  constructor(
    readonly docDate: Date,
    readonly status: PeriodStatus,
  ) {
    super(
      `The fiscal period covering ${docDate.toISOString().slice(0, 10)} is ${status}. ` +
        `Postings are only accepted into an OPEN period.`,
    );
    this.name = 'PeriodNotOpenError';
  }
}
