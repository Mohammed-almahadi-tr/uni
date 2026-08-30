import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { currentSite } from '@/lib/cms/request';
import { publishedCalendar } from '@/lib/cms/content';
import {
  localeOf,
  NoSiteConfigured,
  SiteFooter,
  SiteHeader,
} from '@/components/site/chrome';
import { CalendarSection } from '@/components/site/sections';

/**
 * The academic calendar (SRS REQ-LP-05, Track C1).
 *
 * Semester starts, semester ends and the registration deadline are read from
 * `academic_terms` — the same rows B4's `assert_registration_term_open`
 * refuses a late registration against. They are not stored in the CMS and
 * `chk_calendar_event_not_derived` refuses to let them be, so what a student
 * reads here and what the registration desk enforces cannot drift apart.
 *
 * The whole year is shown rather than only what is still to come: a student
 * checking in March wants to know when the term started, not only what is
 * left of it.
 */
export default async function CalendarPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('site');
  const site = await currentSite();
  if (!site) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  const entries = await publishedCalendar(site.tenant.tenantId);

  return (
    <>
      <SiteHeader site={site} locale={locale} />
      <main className="flex-1">
        <CalendarSection
          entries={entries}
          locale={locale}
          heading={t('sections.calendar')}
          blurb={t('calendar.blurb')}
        />
      </main>
      <SiteFooter site={site} locale={locale} />
    </>
  );
}
