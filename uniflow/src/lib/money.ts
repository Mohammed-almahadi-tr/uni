/**
 * Money.
 *
 * Every monetary value in this system is a Decimal backed by numeric(19,4).
 * Never a JavaScript number.
 *
 * The legacy VB.NET system typed money as `Double` throughout and formatted
 * with "N2" at the point of display, which hides accumulating error rather
 * than preventing it. A tuition fee split three ways and recombined would not
 * equal the original, and nothing in that system would ever have told you.
 *
 * The rule this module exists to enforce: arithmetic on money happens here,
 * with Decimal, or it does not happen.
 */
import { Prisma } from '@/generated/prisma/client';

export type Money = Prisma.Decimal;

/**
 * Anything acceptable as a monetary input.
 *
 * Deliberately includes `number` for literals like `0` and `1`, but note that
 * a `number` carrying real money is a bug — pass amounts as strings so they
 * never pass through IEEE-754 on the way in.
 */
export type MoneyInput = string | number | Prisma.Decimal;

/** Minor units held in the database. numeric(19,4) — four, not two, because
 *  per-item discount apportionment and revenue recognition schedules divide
 *  amounts and the residue has to land somewhere honest. */
export const SCALE = 4;

/** Currencies are rounded to their own minor unit for presentation and for
 *  settlement, which is not always 2. */
const CURRENCY_MINOR_UNITS: Record<string, number> = {
  SDG: 2,
  USD: 2,
  EUR: 2,
  SAR: 2,
  AED: 2,
  EGP: 2,
  GBP: 2,
  KWD: 3,
  BHD: 3,
  OMR: 3,
  JOD: 3,
  JPY: 0,
};

export function minorUnits(currency: string): number {
  return CURRENCY_MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

/**
 * The single rounding policy. Half-up (away from zero), matching the
 * convention every accountant this system will meet already uses on paper.
 *
 * Banker's rounding is defensible in statistics and wrong here: a cashier
 * handing back change cannot explain why 2.5 became 2 but 3.5 became 4.
 */
export const ROUNDING = Prisma.Decimal.ROUND_HALF_UP;

export function money(value: MoneyInput): Money {
  return new Prisma.Decimal(value);
}

export const ZERO: Money = new Prisma.Decimal(0);

/** Round to the storage scale. Applied before anything is persisted. */
export function toStorage(value: MoneyInput): Money {
  return new Prisma.Decimal(value).toDecimalPlaces(SCALE, ROUNDING);
}

/** Round to a currency's settlement precision. Applied at the point money
 *  actually changes hands or is printed. */
export function toCurrency(value: MoneyInput, currency: string): Money {
  return new Prisma.Decimal(value).toDecimalPlaces(minorUnits(currency), ROUNDING);
}

export function sum(values: Iterable<MoneyInput>): Money {
  let total = new Prisma.Decimal(0);
  for (const v of values) total = total.plus(v);
  return total;
}

export function isZero(value: MoneyInput): boolean {
  return new Prisma.Decimal(value).isZero();
}

export function eq(a: MoneyInput, b: MoneyInput): boolean {
  return new Prisma.Decimal(a).equals(b);
}

/**
 * Convert a transaction-currency amount into the tenant's functional
 * currency. The result is what the balance check operates on — a voucher
 * balances in functional currency, never in a mix of currencies.
 */
export function toFunctional(
  amount: MoneyInput,
  fxRate: MoneyInput,
): Money {
  return toStorage(new Prisma.Decimal(amount).times(fxRate));
}

/**
 * Split an amount into n parts that sum back to exactly the original.
 *
 * Used by instalment schedules and revenue recognition. Naive division leaves
 * a residue — 100.00 / 3 is 33.33 three times, which is 99.99 and a penny
 * that has to be accounted for. The residue goes onto the first part, so the
 * institution collects it earliest and the schedule reconciles to the cent.
 */
export function allocate(total: MoneyInput, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts < 1) {
    throw new RangeError(`allocate: parts must be a positive integer, got ${parts}`);
  }
  const amount = toStorage(total);
  const base = amount.dividedBy(parts).toDecimalPlaces(SCALE, Prisma.Decimal.ROUND_DOWN);
  const out = Array.from({ length: parts }, () => base);
  const residue = amount.minus(base.times(parts));
  out[0] = toStorage(out[0].plus(residue));
  return out;
}

/**
 * Split an amount across weights so the parts sum back to exactly the
 * original. Used for sponsor split-funding and per-fee-item discount
 * apportionment. Largest-remainder, so the residue lands on the part that
 * was rounded down hardest rather than arbitrarily.
 */
export function allocateByWeights(
  total: MoneyInput,
  weights: MoneyInput[],
): Money[] {
  if (weights.length === 0) throw new RangeError('allocateByWeights: no weights');
  const amount = toStorage(total);
  const w = weights.map((x) => new Prisma.Decimal(x));
  if (w.some((x) => x.isNegative())) {
    throw new RangeError('allocateByWeights: weights must be non-negative');
  }
  const totalWeight = sum(w);
  if (totalWeight.isZero()) return allocate(amount, weights.length);

  const exact = w.map((x) => amount.times(x).dividedBy(totalWeight));
  const floored = exact.map((x) => x.toDecimalPlaces(SCALE, Prisma.Decimal.ROUND_DOWN));
  let residue = amount.minus(sum(floored));

  // Hand the residue out, one storage-unit at a time, to whoever lost most.
  const unit = new Prisma.Decimal(10).pow(-SCALE);
  const order = exact
    .map((x, i) => ({ i, frac: x.minus(floored[i]) }))
    .sort((a, b) => b.frac.comparedTo(a.frac));

  const out = [...floored];
  let k = 0;
  while (residue.greaterThan(0) && k < order.length * 2) {
    const idx = order[k % order.length].i;
    out[idx] = out[idx].plus(unit);
    residue = residue.minus(unit);
    k += 1;
  }
  return out.map(toStorage);
}
