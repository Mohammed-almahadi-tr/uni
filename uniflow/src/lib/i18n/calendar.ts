/**
 * Dual calendar — Hijri and Gregorian (SRS REQ-NFR-10).
 *
 * Student-facing screens and official documents show both. A student handed a
 * registration card dated only 2026-09-15 has to convert it themselves to
 * check it against a term that was announced in Hijri, and a registrar
 * checking a passport issued in Hijri has the same problem in reverse.
 *
 * Uses the Umm al-Qura calendar via ICU, which is the civil calendar in use
 * across the Gulf and the one printed on the identity documents this system
 * will be reading. Node 22 ships full ICU, so no dependency is needed.
 *
 * A caveat worth stating plainly: Umm al-Qura is an arithmetic calendar. A
 * religious date fixed by local moon sighting can differ from it by a day.
 * For registration deadlines and fee due dates — which is all this system
 * uses dates for — the arithmetic calendar is the right and conventional
 * choice.
 */

const HIJRI_LOCALE = 'ar-SA-u-ca-islamic-umalqura';
const HIJRI_LOCALE_EN = 'en-u-ca-islamic-umalqura';

export interface HijriDate {
  year: number;
  /** 1-12. */
  month: number;
  day: number;
  monthNameAr: string;
  monthNameEn: string;
}

const partsCache = new Map<string, Intl.DateTimeFormat>();
function formatter(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`;
  let f = partsCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options });
    partsCache.set(key, f);
  }
  return f;
}

/** Convert a Gregorian date to Umm al-Qura Hijri. */
export function toHijri(date: Date): HijriDate {
  const numeric = formatter(HIJRI_LOCALE_EN, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    numeric.find((p) => p.type === type)?.value ?? '';

  const monthNameAr =
    formatter(HIJRI_LOCALE, { month: 'long' })
      .formatToParts(date)
      .find((p) => p.type === 'month')?.value ?? '';

  const monthNameEn =
    formatter(HIJRI_LOCALE_EN, { month: 'long' })
      .formatToParts(date)
      .find((p) => p.type === 'month')?.value ?? '';

  return {
    // The era suffix ("1448 AH") is stripped by parseInt's leading-number parse.
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10),
    day: parseInt(get('day'), 10),
    monthNameAr,
    monthNameEn,
  };
}

/**
 * Convert an Umm al-Qura Hijri date to Gregorian.
 *
 * ICU exposes no inverse, so this searches. The estimate is exact to within a
 * couple of days (the Hijri year is ~354.367 days), and the scan around it is
 * bounded and cheap. Returns null for a date the calendar does not contain —
 * a 30th of a 29-day month, say — rather than silently rolling into the next
 * month, because a date that does not exist on the student's document is
 * something the registrar needs to see.
 */
export function fromHijri(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 30) return null;

  // Islamic epoch: 1 Muharram 1 AH ≈ 622-07-19 Gregorian.
  const EPOCH_MS = Date.UTC(622, 6, 19);
  const HIJRI_YEAR_MS = 354.367 * 86_400_000;
  const HIJRI_MONTH_MS = 29.53059 * 86_400_000;

  const estimate =
    EPOCH_MS + (year - 1) * HIJRI_YEAR_MS + (month - 1) * HIJRI_MONTH_MS + (day - 1) * 86_400_000;

  for (let offset = -5; offset <= 5; offset += 1) {
    const candidate = new Date(
      Math.floor((estimate + offset * 86_400_000) / 86_400_000) * 86_400_000,
    );
    const h = toHijri(candidate);
    if (h.year === year && h.month === month && h.day === day) {
      return candidate;
    }
  }
  return null;
}

export interface FormatOptions {
  locale?: 'ar' | 'en';
  /** Include the Gregorian date alongside the Hijri. Default true — the whole
   *  point is that both are legible without conversion. */
  dual?: boolean;
}

/**
 * Format a date for display or printing.
 *
 * Arabic output uses Western digits deliberately. Eastern Arabic-Indic
 * numerals (٠١٢٣) are correct typography in prose, but a receipt is a
 * document people cross-check against a bank slip, a spreadsheet and a
 * ledger — all of which use Western digits here.
 */
export function formatDual(date: Date, options: FormatOptions = {}): string {
  const locale = options.locale ?? 'ar';
  const dual = options.dual ?? true;
  const h = toHijri(date);

  const gregorian = formatter(locale === 'ar' ? 'ar-SD-u-nu-latn' : 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);

  const hijri =
    locale === 'ar'
      ? `${h.day} ${h.monthNameAr} ${h.year} هـ`
      : `${h.day} ${h.monthNameEn} ${h.year} AH`;

  if (!dual) return hijri;
  return locale === 'ar' ? `${hijri} — ${gregorian}` : `${hijri} — ${gregorian}`;
}

/** ISO date (YYYY-MM-DD) in UTC. The wire and storage format; never shown raw
 *  to a student. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}
