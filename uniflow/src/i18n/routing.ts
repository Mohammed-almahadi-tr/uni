import { defineRouting } from 'next-intl/routing';

/**
 * Locale routing.
 *
 * Arabic is the default because these are Sudanese institutions and Arabic is
 * the language staff actually work in. The legacy system's own screens were
 * Arabic with `RightToLeft = Yes` set per form; English was the exception.
 *
 * `localePrefix: 'always'` keeps the locale in the URL even for the default,
 * so a link pasted into WhatsApp opens in the language the sender was using.
 */
export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  localePrefix: 'always',
});

export type Locale = (typeof routing.locales)[number];

/** Text direction for a locale. Drives dir= on <html> and the RTL layout. */
export function directionOf(locale: string): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr';
}
