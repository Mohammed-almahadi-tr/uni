/**
 * Locale helpers for the console (Track D3).
 *
 * The console shows two kinds of string, and they come from different places
 * for the same reason the public site's do: **interface copy** lives in
 * `messages/*.json` so the catalogue-parity test covers it, and **content** —
 * a student's name, a programme title, a hold's stated reason — is a pair of
 * columns on a row and is chosen by locale here.
 *
 * `pickText` differs from the public site's `pick` in one way that matters at
 * a registration desk: it falls back to the other language rather than
 * rendering an empty cell. A student with no English name is a real record,
 * and a blank where their name should be is how a clerk registers the wrong
 * person.
 */

export type Locale = 'ar' | 'en';

export function localeOf(value: string): Locale {
  return value === 'ar' ? 'ar' : 'en';
}

export function pickText(
  locale: Locale,
  ar: string | null | undefined,
  en: string | null | undefined,
): string {
  const first = locale === 'ar' ? ar : en;
  const second = locale === 'ar' ? en : ar;
  return (first?.trim() || second?.trim()) ?? '';
}

export { ForbiddenScreen } from './shell';
