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
import { NewsCard } from '@/components/site/sections';

/** News and announcements (SRS REQ-LP-05, Track C1). */
export default async function NewsIndex({
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
        <SectionShell heading={t('sections.news')}>
          {site.news.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('news.empty')}</p>
          ) : (
            <div className="grid gap-6 md:grid-cols-3">
              {site.news.map((n) => (
                <NewsCard key={n.slug} item={n} locale={locale} />
              ))}
            </div>
          )}
        </SectionShell>
      </main>
      <SiteFooter site={site} locale={locale} />
    </>
  );
}
