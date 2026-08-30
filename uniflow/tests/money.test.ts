/**
 * Money (plan decision 4).
 *
 * The legacy system typed money as VB `Double` and formatted with "N2" at
 * display time, which hides accumulating error rather than preventing it.
 * These tests pin the properties that make that impossible here.
 */
import { describe, expect, it } from 'vitest';
import {
  allocate,
  allocateByWeights,
  minorUnits,
  money,
  sum,
  toCurrency,
  toFunctional,
  toStorage,
} from '@/lib/money';
import { formatMoney, roundDecimalString } from '@/lib/currency';

describe('precision', () => {
  it('does not lose the classic float case', () => {
    // 0.1 + 0.2 === 0.30000000000000004 in IEEE-754.
    expect(money('0.1').plus('0.2').equals('0.3')).toBe(true);
    expect(0.1 + 0.2 === 0.3).toBe(false); // the thing we are avoiding
  });

  it('holds four decimal places in storage', () => {
    expect(toStorage('1234.56789').toFixed()).toBe('1234.5679');
  });

  it('rounds half away from zero, not to even', () => {
    // Bankers' rounding would give 2 here. A cashier cannot explain to a
    // student why 2.5 became 2 but 3.5 became 4.
    expect(toCurrency('2.005', 'SDG').toFixed(2)).toBe('2.01');
    expect(toCurrency('2.015', 'SDG').toFixed(2)).toBe('2.02');
    expect(toCurrency('2.025', 'SDG').toFixed(2)).toBe('2.03');
  });

  it('knows currencies whose minor unit is not two', () => {
    expect(minorUnits('SDG')).toBe(2);
    expect(minorUnits('KWD')).toBe(3);
    expect(minorUnits('JPY')).toBe(0);
    expect(toCurrency('10.9999', 'KWD').toFixed(3)).toBe('11.000');
    expect(toCurrency('10.6', 'JPY').toFixed(0)).toBe('11');
  });
});

describe('allocate — instalments and recognition schedules', () => {
  it('splits so the parts sum back to exactly the original', () => {
    const parts = allocate('100.00', 3);
    expect(sum(parts).toFixed(2)).toBe('100.00');
    // 100/3 is 33.3333…; the residue must land somewhere, not vanish.
    expect(parts.map((p) => p.toFixed(4))).toEqual(['33.3334', '33.3333', '33.3333']);
  });

  it('handles amounts that divide cleanly', () => {
    expect(allocate('90.00', 3).map((p) => p.toFixed(2))).toEqual(['30.00', '30.00', '30.00']);
  });

  it('handles a single part', () => {
    expect(allocate('7.77', 1).map((p) => p.toFixed(2))).toEqual(['7.77']);
  });

  it('sums back for a spread of awkward amounts', () => {
    for (const amount of ['0.01', '0.03', '1', '999.99', '123456.78', '1000000.01']) {
      for (const n of [2, 3, 4, 6, 7, 12]) {
        expect(sum(allocate(amount, n)).toFixed(4)).toBe(toStorage(amount).toFixed(4));
      }
    }
  });

  it('rejects a nonsensical part count', () => {
    expect(() => allocate('10', 0)).toThrow(RangeError);
    expect(() => allocate('10', -1)).toThrow(RangeError);
    expect(() => allocate('10', 1.5)).toThrow(RangeError);
  });
});

describe('allocateByWeights — sponsor splits and per-item discounts', () => {
  it('apportions by weight and sums back exactly', () => {
    const parts = allocateByWeights('1000.00', ['1', '1', '1']);
    expect(sum(parts).toFixed(2)).toBe('1000.00');
  });

  it('honours unequal weights', () => {
    const parts = allocateByWeights('1000.00', ['70', '30']);
    expect(parts[0].toFixed(2)).toBe('700.00');
    expect(parts[1].toFixed(2)).toBe('300.00');
  });

  it('sums back exactly when the split does not divide cleanly', () => {
    // A ministry covering 1/3 and a company 2/3 of an odd amount.
    const parts = allocateByWeights('1000.01', ['1', '2']);
    expect(sum(parts).toFixed(4)).toBe('1000.0100');
  });

  it('falls back to an even split when all weights are zero', () => {
    const parts = allocateByWeights('99.99', ['0', '0', '0']);
    expect(sum(parts).toFixed(2)).toBe('99.99');
  });

  it('rejects negative weights', () => {
    expect(() => allocateByWeights('10', ['1', '-1'])).toThrow(RangeError);
  });
});

describe('functional currency conversion', () => {
  it('converts at the supplied rate and rounds to storage scale', () => {
    // 100 USD at 601.5 SDG/USD.
    expect(toFunctional('100.00', '601.5').toFixed(2)).toBe('60150.00');
  });

  it('keeps rate precision that a 2dp rate would lose', () => {
    expect(toFunctional('1000.00', '0.00123456').toFixed(4)).toBe('1.2346');
  });
});

/**
 * Display formatting (Track D3).
 *
 * `lib/currency.ts` exists so a figure can be printed inside a client
 * component without dragging the Decimal library into the browser. That makes
 * it a second implementation of rounding, which is exactly the kind of thing
 * that drifts — so these tests pin it against `toCurrency`, which is the
 * arithmetic the ledger actually uses.
 */
describe('display formatting agrees with the arithmetic', () => {
  it('rounds half-up, away from zero, like toCurrency', () => {
    const cases = [
      ['2.5', 'JPY'],
      ['3.5', 'JPY'],
      ['1234.565', 'SDG'],
      ['1234.5649', 'SDG'],
      ['0.005', 'SDG'],
      ['-2.345', 'SDG'],
      ['-0.004', 'SDG'],
      ['1200000.0000', 'SDG'],
      ['999.999', 'SDG'],
      ['0.9995', 'KWD'],
    ] as const;

    for (const [value, currency] of cases) {
      expect(roundDecimalString(value, minorUnits(currency)), `${value} ${currency}`).toBe(
        toCurrency(value, currency).toFixed(minorUnits(currency)),
      );
    }
  });

  it('carries all the way when every digit is a nine', () => {
    expect(roundDecimalString('9.999', 2)).toBe('10.00');
    expect(roundDecimalString('99.995', 2)).toBe('100.00');
  });

  it('uses the currency’s own minor unit', () => {
    expect(formatMoney('1234.5', 'SDG')).toBe('1,234.50');
    expect(formatMoney('1234.5', 'KWD')).toBe('1,234.500');
    expect(formatMoney('1234.5', 'JPY')).toBe('1,235');
    // An unknown code falls back to two, which is the common case and is
    // never silently wrong by more than a rounding.
    expect(formatMoney('1234.5', 'XYZ')).toBe('1,234.50');
  });

  it('groups the whole part and never the fraction', () => {
    expect(formatMoney('1200000', 'SDG')).toBe('1,200,000.00');
    expect(formatMoney('999', 'SDG')).toBe('999.00');
    expect(formatMoney('1000', 'KWD')).toBe('1,000.000');
  });

  it('keeps the sign in front of the digits, and never prints minus zero', () => {
    expect(formatMoney('-1234.5', 'SDG')).toBe('-1,234.50');
    expect(roundDecimalString('-0.001', 2)).toBe('0.00');
  });

  it('formats a storage-scale string without changing its value', () => {
    // What actually crosses the wire from a server action: numeric(19,4).
    expect(formatMoney('1050000.0000', 'SDG')).toBe('1,050,000.00');
    expect(formatMoney('0.0000', 'SDG')).toBe('0.00');
  });
});
