/**
 * Localisation (plan §4.9, SRS REQ-NFR-09/10, REQ-ST-03).
 *
 * The Arabic fixtures below are the point of this file. The legacy system
 * printed an English number speller with "Dollar" string-replaced to "Pound",
 * so no voucher it produced ever carried a correct Arabic amount in words —
 * the one control that stops a figure being altered after signature.
 */
import { describe, expect, it } from 'vitest';
import {
  hasSpelledCurrency,
  spellArabicInteger,
  spellEnglishInteger,
  spellMoney,
} from '@/lib/i18n/spell';
import { formatDual, fromHijri, toHijri, toIsoDate } from '@/lib/i18n/calendar';
import {
  buildSearchKey,
  isArabic,
  normalizeArabic,
  searchTerms,
  textDirection,
} from '@/lib/i18n/arabic';

describe('Arabic integers', () => {
  it('spells units and zero', () => {
    expect(spellArabicInteger(0)).toBe('صفر');
    expect(spellArabicInteger(1)).toBe('واحد');
    expect(spellArabicInteger(2)).toBe('اثنان');
    expect(spellArabicInteger(9)).toBe('تسعة');
  });

  it('spells the irregular teens', () => {
    expect(spellArabicInteger(10)).toBe('عشرة');
    expect(spellArabicInteger(11)).toBe('أحد عشر');
    expect(spellArabicInteger(12)).toBe('اثنا عشر');
    expect(spellArabicInteger(19)).toBe('تسعة عشر');
  });

  it('puts the unit before the ten', () => {
    // Arabic says "five and twenty", not "twenty five".
    expect(spellArabicInteger(20)).toBe('عشرون');
    expect(spellArabicInteger(25)).toBe('خمسة وعشرون');
    expect(spellArabicInteger(99)).toBe('تسعة وتسعون');
  });

  it('uses the dual for 200 and single words for 300-900', () => {
    expect(spellArabicInteger(100)).toBe('مائة');
    // مائتان rather than مئتان — both spellings are current, but a voucher
    // should not mix them, and this one matches مائة either side of it.
    expect(spellArabicInteger(200)).toBe('مائتان');
    expect(spellArabicInteger(300)).toBe('ثلاثمائة');
    expect(spellArabicInteger(900)).toBe('تسعمائة');
  });

  it('joins hundreds and remainder with the connective', () => {
    expect(spellArabicInteger(123)).toBe('مائة وثلاثة وعشرون');
    expect(spellArabicInteger(999)).toBe('تسعمائة وتسعة وتسعون');
  });

  it('agrees the scale word with its count', () => {
    // singular / dual / plural / back to singular at 11
    expect(spellArabicInteger(1000)).toBe('ألف');
    expect(spellArabicInteger(2000)).toBe('ألفان');
    expect(spellArabicInteger(3000)).toBe('ثلاثة آلاف');
    expect(spellArabicInteger(11000)).toBe('أحد عشر ألف');
  });

  it('handles millions and billions', () => {
    expect(spellArabicInteger(1_000_000)).toBe('مليون');
    expect(spellArabicInteger(2_000_000)).toBe('مليونان');
    expect(spellArabicInteger(3_000_000)).toBe('ثلاثة ملايين');
    expect(spellArabicInteger(1_000_000_000)).toBe('مليار');
  });

  it('composes a realistic tuition figure', () => {
    expect(spellArabicInteger(1234)).toBe('ألف ومائتان وأربعة وثلاثون');
  });

  it('rejects negatives', () => {
    expect(() => spellArabicInteger(-1)).toThrow(RangeError);
  });
});

describe('English integers', () => {
  it('spells the common cases', () => {
    expect(spellEnglishInteger(0)).toBe('zero');
    expect(spellEnglishInteger(15)).toBe('fifteen');
    expect(spellEnglishInteger(42)).toBe('forty-two');
    expect(spellEnglishInteger(100)).toBe('one hundred');
    expect(spellEnglishInteger(123)).toBe('one hundred and twenty-three');
    expect(spellEnglishInteger(1234)).toBe('one thousand two hundred and thirty-four');
    expect(spellEnglishInteger(1_000_000)).toBe('one million');
  });
});

describe('amount in words on a voucher', () => {
  it('renders a Sudanese Pound amount in Arabic', () => {
    // A realistic tuition receipt. Note the SINGULAR noun: in Arabic the
    // counted noun after آلاف is singular, so it is خمسة آلاف جنيه and never
    // خمسة آلاف جنيهات.
    expect(spellMoney('5000.00', 'SDG', 'ar')).toBe('خمسة آلاف جنيه سوداني لا غير');
  });

  it('uses the plural noun only for counts of 3 to 10', () => {
    expect(spellMoney('3.00', 'SDG', 'ar')).toBe('ثلاثة جنيهات سودانية لا غير');
    expect(spellMoney('10.00', 'SDG', 'ar')).toBe('عشرة جنيهات سودانية لا غير');
  });

  it('agrees the currency noun with the count', () => {
    expect(spellMoney('1.00', 'SDG', 'ar')).toBe('واحد جنيه سوداني لا غير');
    expect(spellMoney('2.00', 'SDG', 'ar')).toBe('اثنان جنيهان سودانيان لا غير');
    // 11+ reverts to the singular noun
    expect(spellMoney('11.00', 'SDG', 'ar')).toBe('أحد عشر جنيه سوداني لا غير');
  });

  it('includes the minor unit when non-zero', () => {
    const out = spellMoney('1234.56', 'SDG', 'ar');
    expect(out).toContain('ألف ومائتان وأربعة وثلاثون');
    expect(out).toContain('ستة وخمسون');
    // 56 is 11+, so the minor-unit noun is singular too.
    expect(out).toContain('قرش');
    expect(out.endsWith('لا غير')).toBe(true);
  });

  it('omits the minor unit when it is zero', () => {
    // The legacy version patched this out with .Replace("and No Cent", "").
    expect(spellMoney('100.00', 'SDG', 'ar')).not.toContain('قرش');
    expect(spellMoney('100.00', 'SDG', 'en')).not.toContain('Piastre');
  });

  it('renders English with a closing "only"', () => {
    expect(spellMoney('5000.00', 'SDG', 'en')).toBe('Five thousand Sudanese Pounds only');
    expect(spellMoney('1.00', 'USD', 'en')).toBe('One US Dollar only');
    expect(spellMoney('2.50', 'USD', 'en')).toBe('Two US Dollars and fifty Cents only');
  });

  it('honours currencies whose minor unit is not hundredths', () => {
    // KWD has three decimal places. Printing 0.500 as "fifty" would be wrong
    // by a factor of ten on a real payment.
    const out = spellMoney('1.500', 'KWD', 'en');
    expect(out).toContain('five hundred');
  });

  it('rounds half-up to the currency precision before spelling', () => {
    expect(spellMoney('99.995', 'SDG', 'en')).toBe('One hundred Sudanese Pounds only');
  });

  it('falls back to the ISO code for an unmapped currency', () => {
    expect(hasSpelledCurrency('XAF')).toBe(false);
    expect(spellMoney('10.00', 'XAF', 'en')).toContain('XAF');
  });

  it('handles a negative amount explicitly', () => {
    expect(spellMoney('-50.00', 'SDG', 'ar')).toMatch(/^سالب /);
    expect(spellMoney('-50.00', 'SDG', 'en')).toMatch(/^Minus /);
  });

  it('spells zero', () => {
    expect(spellMoney('0.00', 'SDG', 'ar')).toBe('صفر جنيه سوداني لا غير');
  });
});

describe('dual calendar', () => {
  it('converts a known Gregorian date to Umm al-Qura', () => {
    const h = toHijri(new Date(Date.UTC(2026, 7, 19)));
    expect(h.year).toBe(1448);
    expect(h.month).toBe(3);
    expect(h.day).toBe(6);
    expect(h.monthNameEn).toContain('Rab');
  });

  it('round-trips Hijri to Gregorian and back', () => {
    for (const [y, m, d] of [
      [1448, 3, 6],
      [1447, 1, 1],
      [1450, 12, 29],
      [1440, 9, 15],
    ] as const) {
      const g = fromHijri(y, m, d);
      expect(g, `no Gregorian date for ${y}-${m}-${d}`).not.toBeNull();
      const back = toHijri(g!);
      expect({ y: back.year, m: back.month, d: back.day }).toEqual({ y, m, d });
    }
  });

  it('returns null for a date the calendar does not contain', () => {
    // Rather than silently rolling into the next month, which would put a
    // student's document date a day out with no indication.
    expect(fromHijri(1448, 13, 1)).toBeNull();
    expect(fromHijri(1448, 1, 31)).toBeNull();
  });

  it('formats both calendars together', () => {
    const s = formatDual(new Date(Date.UTC(2026, 7, 19)), { locale: 'ar' });
    expect(s).toContain('1448');
    expect(s).toContain('هـ');
    expect(s).toContain('2026');
  });

  it('uses Western digits in Arabic output', () => {
    // A receipt gets cross-checked against a bank slip and a spreadsheet,
    // both of which use Western digits here.
    const s = formatDual(new Date(Date.UTC(2026, 7, 19)), { locale: 'ar' });
    expect(s).not.toMatch(/[٠-٩]/);
  });

  it('emits ISO for storage', () => {
    expect(toIsoDate(new Date(Date.UTC(2026, 7, 19)))).toBe('2026-08-19');
  });
});

describe('Arabic search normalisation', () => {
  it('folds the alef variants that data entry omits', () => {
    // The concrete legacy failure: أحمد typed, احمد stored, no match.
    expect(normalizeArabic('أحمد')).toBe(normalizeArabic('احمد'));
    expect(normalizeArabic('إبراهيم')).toBe(normalizeArabic('ابراهيم'));
    expect(normalizeArabic('آمنة')).toBe(normalizeArabic('امنه'));
  });

  it('folds taa marbuta to haa', () => {
    expect(normalizeArabic('فاطمة')).toBe(normalizeArabic('فاطمه'));
  });

  it('folds alef maqsura to yaa', () => {
    expect(normalizeArabic('مصطفى')).toBe(normalizeArabic('مصطفي'));
  });

  it('strips diacritics and tatweel', () => {
    expect(normalizeArabic('مُحَمَّد')).toBe(normalizeArabic('محمد'));
    expect(normalizeArabic('محـــمد')).toBe(normalizeArabic('محمد'));
  });

  it('converts Arabic-Indic digits, so a student id matches either way', () => {
    expect(normalizeArabic('٢٠٢٦')).toBe('2026');
    expect(normalizeArabic('۲۰۲۶')).toBe('2026');
  });

  it('collapses whitespace', () => {
    expect(normalizeArabic('  محمد   علي  ')).toBe(normalizeArabic('محمد علي'));
  });

  it('builds a search key from name parts', () => {
    const key = buildSearchKey('أحمد', 'محمد', null, 'عثمان');
    expect(key).toBe(normalizeArabic('احمد محمد عثمان'));
  });

  it('splits a query into terms so partial names still match', () => {
    // Sudanese names run to four parts and staff rarely type all of them.
    expect(searchTerms('  أحمد   محمد ')).toEqual([
      normalizeArabic('احمد'),
      normalizeArabic('محمد'),
    ]);
  });

  it('leaves Latin text usable', () => {
    expect(normalizeArabic('Ahmed Mohammed')).toBe('ahmed mohammed');
  });

  it('detects script and direction', () => {
    expect(isArabic('أحمد')).toBe(true);
    expect(isArabic('Ahmed')).toBe(false);
    expect(textDirection('أحمد')).toBe('rtl');
    expect(textDirection('Ahmed')).toBe('ltr');
  });
});
