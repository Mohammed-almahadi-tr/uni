import { Prisma } from '@/generated/prisma/client';
import type { DepreciationMethod } from '@/generated/prisma/enums';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';

/**
 * Building a depreciation schedule (SRS REQ-AST-02).
 *
 * Pure: no database, no clock. That matters because this is the one piece of
 * A5 where an arithmetic mistake is silent — a schedule that is a few piastres
 * short simply leaves a residue on the books forever, and nobody notices until
 * an asset that should be fully written down still carries a balance.
 *
 * The legacy calculation was `balance × DeprPerc / 100`, evaluated in a grid
 * against whatever the account's *current* balance happened to be. That is
 * reducing-balance by accident rather than by decision, it never terminates,
 * and because it read the live balance it produced a different answer every
 * time the screen was opened.
 *
 * Two rules here are worth stating because they are where the money goes:
 *
 *   · **The first period is prorated from the in-service date**, by days. An
 *     asset installed on the 20th of a 31-day month takes 12/31 of a month's
 *     charge, not a whole one.
 *   · **The last period absorbs the rounding residue**, so the schedule sums
 *     to exactly cost − salvage. Same discipline as `allocate()` in money.ts,
 *     and for the same reason.
 */

export interface SchedulePeriod {
  /** The caller's identifier for the period — a fiscal period id in practice. */
  id: string;
  startDate: Date;
  endDate: Date;
}

export interface ScheduleInput {
  cost: MoneyInput;
  salvageValue?: MoneyInput;
  usefulLifeMonths: number;
  method: DepreciationMethod;
  inServiceDate: Date;
  /** Candidate periods in date order. Periods before the in-service date are
   *  skipped; the schedule stops when the depreciable base is exhausted. */
  periods: SchedulePeriod[];
}

export interface ScheduleRow {
  periodId: string;
  seq: number;
  amount: Money;
  /** Accumulated depreciation after this period. */
  accumulated: Money;
  /** Cost less accumulated depreciation after this period. */
  netBookValue: Money;
}

export class ScheduleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScheduleError';
  }
}

const DAY = 86_400_000;

/** Whole days in a period, inclusive of both ends — how a month is counted. */
function daysInclusive(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY) + 1;
}

/**
 * Build the schedule.
 *
 * Returns rows only for periods that actually carry a charge; a period before
 * the asset was in service, or after it is fully depreciated, is absent rather
 * than present with zero.
 */
export function buildSchedule(input: ScheduleInput): ScheduleRow[] {
  const cost = toStorage(input.cost);
  const salvage = toStorage(input.salvageValue ?? 0);

  if (cost.lessThanOrEqualTo(0)) {
    throw new ScheduleError('An asset must have a positive cost.');
  }
  if (salvage.isNegative() || salvage.greaterThanOrEqualTo(cost)) {
    throw new ScheduleError(
      `Salvage value ${salvage.toFixed(2)} must be between zero and the cost of ` +
        `${cost.toFixed(2)}. An asset worth less than its scrap value depreciates to nothing.`,
    );
  }
  if (input.method === 'NONE') return [];
  if (input.usefulLifeMonths <= 0) {
    throw new ScheduleError('A depreciating asset needs a useful life in months.');
  }

  const depreciable = cost.minus(salvage);
  const eligible = input.periods.filter((p) => p.endDate >= input.inServiceDate);
  if (eligible.length === 0) return [];

  const raw =
    input.method === 'STRAIGHT_LINE'
      ? straightLine(depreciable, input, eligible)
      : reducingBalance(cost, salvage, input, eligible);

  // Force the total to land exactly on the depreciable base. Rounding at four
  // decimal places over sixty periods otherwise leaves a residue that nothing
  // ever clears.
  const rows = raw.filter((r) => r.amount.greaterThan(0));
  if (rows.length > 0) {
    const total = sum(rows.map((r) => r.amount));
    const residue = depreciable.minus(total);
    if (!residue.isZero()) {
      const last = rows[rows.length - 1];
      last.amount = last.amount.plus(residue);
      if (last.amount.lessThanOrEqualTo(0)) {
        // The residue was negative and larger than the final charge: drop the
        // row and push the correction onto the one before it.
        rows.pop();
        if (rows.length > 0) {
          const prev = rows[rows.length - 1];
          prev.amount = prev.amount.plus(last.amount);
        }
      }
    }
  }

  let accumulated = ZERO;
  return rows.map((r, i) => {
    accumulated = accumulated.plus(r.amount);
    return {
      periodId: r.periodId,
      seq: i + 1,
      amount: r.amount,
      accumulated,
      netBookValue: cost.minus(accumulated),
    };
  });
}

interface RawRow {
  periodId: string;
  amount: Money;
}

/**
 * Straight line, prorated at both ends.
 *
 * The monthly charge is `(cost − salvage) / life`. A period the asset was in
 * service for only part of takes that fraction of a month; the schedule runs
 * until the base is used up.
 */
function straightLine(
  depreciable: Money,
  input: ScheduleInput,
  periods: SchedulePeriod[],
): RawRow[] {
  const monthly = depreciable.dividedBy(input.usefulLifeMonths);
  const rows: RawRow[] = [];
  let remaining = depreciable;

  for (const p of periods) {
    if (remaining.lessThanOrEqualTo(0)) break;

    // The first period is partial when the asset went into service part-way
    // through it. Every later period is whole.
    const start = input.inServiceDate > p.startDate ? input.inServiceDate : p.startDate;
    const served = daysInclusive(start, p.endDate);
    const full = daysInclusive(p.startDate, p.endDate);
    const fraction = served >= full ? null : new Prisma.Decimal(served).dividedBy(full);

    let amount = fraction ? toStorage(monthly.times(fraction)) : toStorage(monthly);
    if (amount.greaterThan(remaining)) amount = remaining;

    rows.push({ periodId: p.id, amount });
    remaining = remaining.minus(amount);
  }

  return rows;
}

/**
 * Reducing balance, at the rate implied by the useful life.
 *
 * Reducing balance never reaches zero on its own, so it is bounded twice: it
 * stops when net book value reaches salvage, and it stops after the useful
 * life in any case, with the final period taking whatever is left down to
 * salvage. The legacy calculation had neither bound and would have gone on
 * charging a fraction of a percent forever.
 */
function reducingBalance(
  cost: Money,
  salvage: Money,
  input: ScheduleInput,
  periods: SchedulePeriod[],
): RawRow[] {
  // The rate that takes cost down to salvage over the life, applied monthly:
  //   rate = 1 − (salvage / cost) ^ (1 / life)
  // With no salvage there is no such rate — the curve never reaches zero — so
  // fall back to double-declining, which is the convention.
  const monthlyRate = salvage.isZero()
    ? new Prisma.Decimal(2).dividedBy(input.usefulLifeMonths)
    : new Prisma.Decimal(
        1 - Math.pow(salvage.dividedBy(cost).toNumber(), 1 / input.usefulLifeMonths),
      );

  const rows: RawRow[] = [];
  let nbv = cost;
  let monthsCharged = 0;

  for (const p of periods) {
    if (monthsCharged >= input.usefulLifeMonths) break;
    const remaining = nbv.minus(salvage);
    if (remaining.lessThanOrEqualTo(0)) break;

    const start = input.inServiceDate > p.startDate ? input.inServiceDate : p.startDate;
    const served = daysInclusive(start, p.endDate);
    const full = daysInclusive(p.startDate, p.endDate);
    const fraction = served >= full ? null : new Prisma.Decimal(served).dividedBy(full);

    let amount = toStorage(nbv.times(monthlyRate).times(fraction ?? 1));
    // The final period of the life takes the asset all the way down.
    if (monthsCharged + 1 >= input.usefulLifeMonths || amount.greaterThan(remaining)) {
      amount = remaining;
    }

    rows.push({ periodId: p.id, amount });
    nbv = nbv.minus(amount);
    monthsCharged += 1;
  }

  return rows;
}
