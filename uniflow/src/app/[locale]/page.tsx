import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { currentSite } from '@/lib/cms/request';
import {
  localeOf,
  NoSiteConfigured,
  pick,
  SectionShell,
  SiteFooter,
  SiteHeader,
} from '@/components/site/chrome';
import {
  CalendarSection,
  CampusSection,
  FacultiesSection,
  Hero,
  NewsSection,
} from '@/components/site/sections';

/**
 * The landing page (SRS REQ-LP-02 to REQ-LP-06, Track C1).
 *
 * Replaces the Phase 0 localisation demonstration that stood here.
 *
 * The page is assembled from `landing_sections`: which sections appear, in
 * what order, and under what headings is the tenant's, not this file's. What
 * this file decides is how each section looks — and that is the same for
 * every tenant, which is the point of a white-label product as opposed to a
 * copy of the source tree per customer.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('site.sections');
  const site = await currentSite();
  if (!site) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  const enabled = site.sections
    .filter((s) => s.isEnabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  // A section's heading is the tenant's when they have set one, and the
  // application's own translated default when they have not.
  const headingFor = (
    kind: string,
    fallback: string,
  ): { heading: string; blurb: string | null } => {
    const s = site.sections.find((x) => x.kind === kind);
    return {
      heading: pick(locale, s?.headingAr, s?.headingEn) ?? fallback,
      blurb: pick(locale, s?.blurbAr, s?.blurbEn) ?? null,
    };
  };

  return (
    <>
      <SiteHeader site={site} locale={locale} />

      <main className="flex-1">
        {enabled.map((section) => {
          switch (section.kind) {
            case 'HERO':
              return <Hero key={section.kind} site={site} locale={locale} />;

            case 'ABOUT': {
              const { heading, blurb } = headingFor(
                'ABOUT',
                t('about', { university: pick(locale, site.tenant.nameAr, site.tenant.nameEn) }),
              );
              if (!blurb) return null;
              return (
                <SectionShell key={section.kind} heading={heading}>
                  <p className="max-w-3xl leading-relaxed text-muted-foreground">{blurb}</p>
                </SectionShell>
              );
            }

            case 'FACULTIES': {
              const { heading, blurb } = headingFor('FACULTIES', t('faculties'));
              return (
                <FacultiesSection
                  key={section.kind}
                  faculties={site.faculties}
                  locale={locale}
                  heading={heading}
                  blurb={blurb}
                />
              );
            }

            case 'NEWS': {
              const { heading, blurb } = headingFor('NEWS', t('news'));
              return (
                <NewsSection
                  key={section.kind}
                  news={site.news}
                  locale={locale}
                  heading={heading}
                  blurb={blurb}
                />
              );
            }

            case 'CALENDAR': {
              const { heading, blurb } = headingFor('CALENDAR', t('calendar'));
              return (
                <CalendarSection
                  key={section.kind}
                  entries={site.calendar}
                  locale={locale}
                  heading={heading}
                  blurb={blurb}
                  limit={6}
                />
              );
            }

            case 'CAMPUS': {
              const { heading, blurb } = headingFor('CAMPUS', t('campuses'));
              return (
                <CampusSection
                  key={section.kind}
                  site={site}
                  locale={locale}
                  heading={heading}
                  blurb={blurb}
                />
              );
            }

            // CONTACT is a page of its own rather than a form embedded here:
            // the enquiry form is the only public write path in the system and
            // it gets its own route, its own server action and its own bounds.
            default:
              return null;
          }
        })}
      </main>

      <SiteFooter site={site} locale={locale} />
    </>
  );
}
