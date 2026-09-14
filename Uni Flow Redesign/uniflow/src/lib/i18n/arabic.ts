/**
 * Arabic text normalisation for search (SRS REQ-ST-03).
 *
 * The legacy system searched with an exact match:
 *
 *     "Select ... From StudentsProfilees where StudentIndex=N'" & txt.Text & "'"
 *
 * For names that meant a clerk who typed أحمد could not find a student
 * recorded as احمد — the same name, differing only by a hamza that Sudanese
 * data entry omits about half the time. Staff worked around it by searching
 * on fragments and scrolling, which is why the student lists ended up
 * maintained in Excel alongside the system.
 *
 * Normalising folds the variants that are genuinely the same letter for
 * search purposes. It is applied to a *shadow* column used only for
 * searching; the student's name is stored and displayed exactly as entered,
 * because a person's name is not ours to correct.
 */

/** Arabic diacritics (harakat) and the tatweel elongation character. */
const DIACRITICS = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ]/g;
const TATWEEL = /ـ/g;

/**
 * Fold letters that vary in writing but not in identity.
 *
 * - alef forms (أ إ آ ٱ) → ا      : hamza on alef is routinely omitted
 * - alef maqsura ى → ي            : final yaa is written both ways
 * - taa marbuta ة → ه             : فاطمة / فاطمه are the same name
 * - hamza carriers ؤ ئ → و ي      : same reason as alef
 * - Arabic-Indic digits → Western  : ٠١٢ typed on an Arabic keyboard
 */
const LETTER_FOLD: Record<string, string> = {
  'أ': 'ا', 'إ': 'ا', 'آ': 'ا', 'ٱ': 'ا', 'ٲ': 'ا', 'ٳ': 'ا',
  'ى': 'ي', 'ئ': 'ي',
  'ة': 'ه',
  'ؤ': 'و',
  'ء': '',
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

/**
 * Normalise a string for indexing or for comparing against an index.
 *
 * Must be applied identically on both sides — writing the shadow column and
 * building the query — or the index silently stops matching. That is the
 * failure mode to watch for when changing this function.
 */
export function normalizeArabic(input: string): string {
  if (!input) return '';

  let s = input.normalize('NFKC');
  s = s.replace(DIACRITICS, '').replace(TATWEEL, '');

  let out = '';
  for (const ch of s) {
    out += ch in LETTER_FOLD ? LETTER_FOLD[ch] : ch;
  }

  return out.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Build the searchable form of a student's name from its parts.
 *
 * Stored in a shadow column and indexed with pg_trgm, so that partial and
 * misspelled input still finds the record.
 */
export function buildSearchKey(...parts: Array<string | null | undefined>): string {
  return normalizeArabic(parts.filter(Boolean).join(' '));
}

/**
 * Turn user input into trigram-friendly search terms.
 *
 * Splitting on whitespace lets "احمد محمد" match a record holding
 * "أحمد علي محمد" — Sudanese names run to four parts and staff rarely type
 * all of them, or type them in a different order.
 */
export function searchTerms(query: string): string[] {
  return normalizeArabic(query)
    .split(' ')
    .filter((t) => t.length > 0);
}

/** True when the string contains Arabic script, used to pick which name
 *  column to search and which direction to render. */
export function isArabic(text: string): boolean {
  return /[؀-ۿݐ-ݿ]/.test(text);
}

/** Direction for a piece of user content, so a mixed-language table does not
 *  render Arabic names left-to-right. */
export function textDirection(text: string): 'rtl' | 'ltr' {
  return isArabic(text) ? 'rtl' : 'ltr';
}
