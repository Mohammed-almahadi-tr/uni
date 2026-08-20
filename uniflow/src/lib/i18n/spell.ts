/**
 * Monetary amounts in words — تفقيط (SRS REQ-NFR-09).
 *
 * Every receipt, payment voucher and cheque this system prints carries the
 * amount in words as well as figures. That is not decoration: it is the
 * control that stops a figure being altered after signature.
 *
 * The legacy system's version was an English speller with the currency
 * patched in by string replacement:
 *
 *     Me.txtWrittenValue.Text = SpellNumber(CDbl(Me.txtTotalAmount.Text))
 *     Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("Dollar", "Pound")
 *     Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("and No Cent", "")
 *
 * — frmStudantReceiptVoucher.vb:211-215. Arabic تفقيط did not work at all;
 * the Ribat build imported a third-party `EgyCurr.CurText` to paper over it.
 *
 * Arabic number agreement is genuinely intricate, and the awkward parts are
 * commented where they arise rather than left to look like arbitrary tables.
 */
import { Prisma } from '@/generated/prisma/client';
import { minorUnits, type MoneyInput } from '@/lib/money';

// ---------------------------------------------------------------------------
// Arabic
// ---------------------------------------------------------------------------

const AR_ONES = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
];

/** 10-19 are irregular and are not built from the units. */
const AR_TEENS = [
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر',
];

const AR_TENS = [
  '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون',
];

/** 200 is a dual form, not "two hundred"; 300-900 are written as one word. */
const AR_HUNDREDS = [
  '', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة',
  'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة',
];

/**
 * Scale words in singular / dual / plural.
 *
 * Arabic picks the form by the count, and not the way English does:
 *   1        → singular          ألف
 *   2        → dual              ألفان
 *   3-10     → plural            ثلاثة آلاف
 *   11+      → singular again    أحد عشر ألفاً
 */
const AR_SCALES: Array<{ singular: string; dual: string; plural: string }> = [
  { singular: '', dual: '', plural: '' },
  { singular: 'ألف', dual: 'ألفان', plural: 'آلاف' },
  { singular: 'مليون', dual: 'مليونان', plural: 'ملايين' },
  { singular: 'مليار', dual: 'ملياران', plural: 'مليارات' },
  { singular: 'تريليون', dual: 'تريليونان', plural: 'تريليونات' },
];

/** Spell 0-999. */
function arUnder1000(n: number): string {
  if (n === 0) return '';
  const parts: string[] = [];

  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) parts.push(AR_HUNDREDS[hundreds]);

  if (rest > 0) {
    if (rest < 10) parts.push(AR_ONES[rest]);
    else if (rest < 20) parts.push(AR_TEENS[rest - 10]);
    else {
      const tens = Math.floor(rest / 10);
      const ones = rest % 10;
      // Arabic says the unit before the ten: 25 is "five and twenty".
      parts.push(ones > 0 ? `${AR_ONES[ones]} و${AR_TENS[tens]}` : AR_TENS[tens]);
    }
  }

  return parts.join(' و');
}

/** Spell a non-negative integer in Arabic. */
export function spellArabicInteger(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('spellArabicInteger: non-negative finite integers only');
  const n = Math.floor(value);
  if (n === 0) return 'صفر';

  // Split into groups of three, least significant first.
  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  if (groups.length > AR_SCALES.length) {
    throw new RangeError('spellArabicInteger: value exceeds the supported scale');
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const g = groups[i];
    if (g === 0) continue;

    if (i === 0) {
      parts.push(arUnder1000(g));
      continue;
    }

    const scale = AR_SCALES[i];
    if (g === 1) {
      parts.push(scale.singular);
    } else if (g === 2) {
      parts.push(scale.dual);
    } else if (g <= 10) {
      // 3-10 take the plural of the scale word: ثلاثة آلاف
      parts.push(`${arUnder1000(g)} ${scale.plural}`);
    } else {
      // 11+ return to the singular: أحد عشر ألفاً
      parts.push(`${arUnder1000(g)} ${scale.singular}`);
    }
  }

  return parts.join(' و');
}

// ---------------------------------------------------------------------------
// English
// ---------------------------------------------------------------------------

const EN_ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
  'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen',
  'seventeen', 'eighteen', 'nineteen',
];
const EN_TENS = [
  '', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
];
const EN_SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

function enUnder1000(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;

  if (hundreds > 0) parts.push(`${EN_ONES[hundreds]} hundred`);
  if (rest > 0) {
    if (hundreds > 0) parts.push('and');
    if (rest < 20) parts.push(EN_ONES[rest]);
    else {
      const tens = EN_TENS[Math.floor(rest / 10)];
      const ones = rest % 10;
      parts.push(ones > 0 ? `${tens}-${EN_ONES[ones]}` : tens);
    }
  }
  return parts.join(' ');
}

export function spellEnglishInteger(value: number): string {
  if (!Number.isFinite(value) || value < 0) throw new RangeError('spellEnglishInteger: non-negative finite integers only');
  const n = Math.floor(value);
  if (n === 0) return 'zero';

  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  if (groups.length > EN_SCALES.length) {
    throw new RangeError('spellEnglishInteger: value exceeds the supported scale');
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    if (groups[i] === 0) continue;
    const scale = EN_SCALES[i];
    parts.push(scale ? `${enUnder1000(groups[i])} ${scale}` : enUnder1000(groups[i]));
  }
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Currency naming
// ---------------------------------------------------------------------------

interface CurrencyNames {
  ar: { singular: string; dual: string; plural: string };
  en: { major: string; minor: string };
  arMinor: { singular: string; dual: string; plural: string };
}

const CURRENCIES: Record<string, CurrencyNames> = {
  SDG: {
    ar: { singular: 'جنيه سوداني', dual: 'جنيهان سودانيان', plural: 'جنيهات سودانية' },
    en: { major: 'Sudanese Pound', minor: 'Piastre' },
    arMinor: { singular: 'قرش', dual: 'قرشان', plural: 'قروش' },
  },
  USD: {
    ar: { singular: 'دولار أمريكي', dual: 'دولاران أمريكيان', plural: 'دولارات أمريكية' },
    en: { major: 'US Dollar', minor: 'Cent' },
    arMinor: { singular: 'سنت', dual: 'سنتان', plural: 'سنتات' },
  },
  SAR: {
    ar: { singular: 'ريال سعودي', dual: 'ريالان سعوديان', plural: 'ريالات سعودية' },
    en: { major: 'Saudi Riyal', minor: 'Halala' },
    arMinor: { singular: 'هللة', dual: 'هللتان', plural: 'هللات' },
  },
  AED: {
    ar: { singular: 'درهم إماراتي', dual: 'درهمان إماراتيان', plural: 'دراهم إماراتية' },
    en: { major: 'UAE Dirham', minor: 'Fils' },
    arMinor: { singular: 'فلس', dual: 'فلسان', plural: 'فلوس' },
  },
  EGP: {
    ar: { singular: 'جنيه مصري', dual: 'جنيهان مصريان', plural: 'جنيهات مصرية' },
    en: { major: 'Egyptian Pound', minor: 'Piastre' },
    arMinor: { singular: 'قرش', dual: 'قرشان', plural: 'قروش' },
  },
  EUR: {
    ar: { singular: 'يورو', dual: 'يوروان', plural: 'يوروهات' },
    en: { major: 'Euro', minor: 'Cent' },
    arMinor: { singular: 'سنت', dual: 'سنتان', plural: 'سنتات' },
  },
  GBP: {
    ar: { singular: 'جنيه إسترليني', dual: 'جنيهان إسترلينيان', plural: 'جنيهات إسترلينية' },
    en: { major: 'Pound Sterling', minor: 'Penny' },
    arMinor: { singular: 'بنس', dual: 'بنسان', plural: 'بنسات' },
  },
};

function arabicCurrencyForm(
  count: number,
  names: { singular: string; dual: string; plural: string },
): string {
  if (count === 1) return names.singular;
  if (count === 2) return names.dual;
  if (count >= 3 && count <= 10) return names.plural;
  return names.singular; // 11+ reverts to the singular
}

function englishPlural(count: number, noun: string): string {
  if (count === 1) return noun;
  if (noun === 'Penny') return 'Pence';
  return `${noun}s`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export type SpellLocale = 'ar' | 'en';

/**
 * Render a monetary amount in words, for printing on a voucher.
 *
 * The minor unit is taken from the currency, not assumed to be hundredths —
 * KWD and BHD have three decimal places, and a receipt that prints them as
 * two is wrong by a factor of ten.
 */
export function spellMoney(
  amount: MoneyInput,
  currency: string,
  locale: SpellLocale = 'ar',
): string {
  const code = currency.trim().toUpperCase();
  const names = CURRENCIES[code];
  const decimals = minorUnits(code);

  const d = new Prisma.Decimal(amount);
  if (d.isNegative()) {
    const positive = spellMoney(d.abs(), code, locale);
    return locale === 'ar' ? `سالب ${positive}` : `Minus ${positive}`;
  }

  const rounded = d.toDecimalPlaces(decimals, Prisma.Decimal.ROUND_HALF_UP);
  const major = rounded.floor().toNumber();
  const minor = rounded
    .minus(rounded.floor())
    .times(new Prisma.Decimal(10).pow(decimals))
    .round()
    .toNumber();

  if (locale === 'ar') {
    const majorWords = spellArabicInteger(major);
    const majorName = names
      ? arabicCurrencyForm(major, names.ar)
      : code;
    let out = `${majorWords} ${majorName}`;

    if (minor > 0) {
      const minorWords = spellArabicInteger(minor);
      const minorName = names ? arabicCurrencyForm(minor, names.arMinor) : '';
      out += ` و${minorWords}${minorName ? ` ${minorName}` : ''}`;
    }
    // "لا غير" closes the amount so nothing can be appended after it — the
    // same job the English "only" does.
    return `${out} لا غير`;
  }

  const majorWords = spellEnglishInteger(major);
  const majorName = names ? englishPlural(major, names.en.major) : code;
  let out = `${capitalise(majorWords)} ${majorName}`;

  if (minor > 0) {
    const minorName = names ? englishPlural(minor, names.en.minor) : '';
    out += ` and ${spellEnglishInteger(minor)}${minorName ? ` ${minorName}` : ''}`;
  }
  return `${out} only`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Currencies with a proper spelled name. Others fall back to the ISO code,
 *  which is honest rather than wrong. */
export function hasSpelledCurrency(code: string): boolean {
  return code.trim().toUpperCase() in CURRENCIES;
}
