import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { currentSite } from '@/lib/cms/request';
import {
  localeOf,
  NoSiteConfigured,
  SectionShell,
  SiteFooter,
  SiteHeader,
} from '@/components/site/chrome';
import { CampusSection } from '@/components/site/sections';
import { InquiryForm } from './inquiry-form';

/** Contact, location and the enquiry form (SRS REQ-LP-06, Track C1). */
export default async function ContactPage({
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

  return (
    <>
      <SiteHeader site={site} locale={locale} />
      <main className="flex-1">
        <SectionShell heading={t('contact.title')}>
          <div className="max-w-xl">
            <InquiryForm />
          </div>
        </SectionShell>

        <CampusSection
          site={site}
          locale={locale}
          heading={t('sections.campuses')}
        />
      </main>
      <SiteFooter site={site} locale={locale} />
    </>
  );
}
