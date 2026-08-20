import { getRequestConfig } from 'next-intl/server';
import { hasLocale } from 'next-intl';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Dates and numbers are formatted with Western digits even in Arabic —
    // a receipt is cross-checked against bank slips and spreadsheets that use
    // them. See src/lib/i18n/calendar.ts.
    timeZone: 'Africa/Khartoum',
  };
});
