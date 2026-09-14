/**
 * Currency presentation, with no dependency on the Decimal library.
 *
 * This module exists because of where money is *displayed*. The registration
 * desk prices a term in a client component — the quote arrives from a server
 * action and is rendered in the browser — and `lib/money.ts` is built on
 * `Prisma.Decimal`, which drags Node built-ins into a browser bundle. A
 * presentational format has no business needing an arbitrary-precision
 * library anyway: the value arrives as the decimal string the database
 * produced, and turning that string into a printed one is string work.
 *
 * The arithmetic that *matters* is untouched and stays in `lib/money.ts`.
 * Nothing here adds, subtracts or allocates; it rounds one already-computed
 * figure for display, half-up, exactly as `toCurrency` does.
 */

/** Currencies are rounded to their own minor unit, which is not always 2. */
export const CURRENCY_MINOR_UNITS: Record<string, number> = {
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

/** Add one to a string of digits, growing it if it carries all the way. */
function increment(digits: string): string {
  const out = digits.split('');
  let i = out.length - 1;
  while (i >= 0) {
    if (out[i] === '9') {
      out[i] = '0';
      i -= 1;
    } else {
      out[i] = String(Number(out[i]) + 1);
      return out.join('');
    }
  }
  return `1${out.join('')}`;
}

/**
 * Round a decimal string to `places`, half-up, away from zero.
 *
 * Half-up rather than banker's rounding, for the reason `lib/money.ts` gives:
 * a cashier handing back change cannot explain why 2.5 became 2 but 3.5
 * became 4.
 */
export function roundDecimalString(value: string, places: number): string {
  const trimmed = value.trim();
  const negative = trimmed.startsWith('-');
  const unsigned = trimmed.replace(/^[+-]/, '');

  const [rawInt = '0', rawFrac = ''] = unsigned.split('.');
  const intPart = rawInt.replace(/\D/g, '') || '0';
  const fracPart = rawFrac.replace(/\D/g, '');

  let digits: string;
  if (fracPart.length <= places) {
    digits = intPart + fracPart.padEnd(places, '0');
  } else {
    digits = intPart + fracPart.slice(0, places);
    if (fracPart.charCodeAt(places) >= 53 /* '5' */) digits = increment(digits);
  }

  const cut = digits.length - places;
  const wholes = (cut > 0 ? digits.slice(0, cut) : '0').replace(/^0+(?=\d)/, '');
  const fraction = places > 0 ? digits.slice(Math.max(cut, 0)).padStart(places, '0') : '';

  const body = places > 0 ? `${wholes}.${fraction}` : wholes;
  // Negative zero is a rounding artefact, not a figure anyone wants printed.
  const isZero = /^0(\.0*)?$/.test(body);
  return negative && !isZero ? `-${body}` : body;
}

/** Group the whole part in threes. The fraction is never grouped. */
export function groupThousands(value: string): string {
  const [whole, fraction] = value.split('.');
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = sign ? whole.slice(1) : whole;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return fraction ? `${sign}${grouped}.${fraction}` : `${sign}${grouped}`;
}

/**
 * A figure ready to print: rounded to the currency's minor unit and grouped.
 *
 * Western digits regardless of locale — a receipt is cross-checked against
 * bank slips and spreadsheets that use them (see `lib/i18n/calendar.ts` for
 * the same decision about dates).
 */
export function formatMoney(amount: string | number, currency: string): string {
  const asString = typeof amount === 'number' ? amount.toString() : amount;
  return groupThousands(roundDecimalString(asString, minorUnits(currency)));
}
