import { getTranslations, setRequestLocale } from 'next-intl/server';
import { headers } from 'next/headers';
import { Link } from '@/i18n/navigation';
import { currentSite } from '@/lib/cms/request';
import {
  localeOf,
  NoSiteConfigured,
  pick,
  SectionShell,
  SiteFooter,
  SiteHeader,
} from '@/components/site/chrome';
import { TuitionLine } from '@/components/site/sections';

/**
 * The faculties and programmes explorer (SRS REQ-LP-03, Track C1).
 *
 * Every figure on this page is read from the approved fee schedule the
 * registration engine bills from. There is no "published fees" field to keep
 * in step with the real one — that separation is what put the legacy build in
 * the position of having `CollegeFees.TuitionFees` and
 * `Transactions.TuitionFees` disagree, which is the subtraction its discount
 * reports were built on.
 */
export default async function ProgrammesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('site.programmes');
  const d = await getTranslations('site.duration');
  const nav = await getTranslations('site.sections');
  const site = await currentSite();
  if (!site) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  return (
    <>
      <SiteHeader site={site} locale={locale} />
      <main className="flex-1">
        <SectionShell heading={nav('faculties')} blurb={t('blurb')}>
          {site.faculties.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('empty')}</p>
          ) : (
            <div className="space-y-10">
              {site.faculties.map((f) => (
                <div key={f.code}>
                  <h3 className="text-lg font-semibold">{pick(locale, f.nameAr, f.nameEn)}</h3>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    {f.programmes.map((p) => (
                      <div key={p.code} className="rounded-lg border border-border bg-card p-5">
                        <h4 className="font-medium">
                          <Link
                            href={`/programmes/${p.code.toLowerCase()}`}
                            className="hover:underline"
                          >
                            {pick(locale, p.nameAr, p.nameEn)}
                          </Link>
                        </h4>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.degreeLevel} · {d('years', { count: p.durationYears })} ·{' '}
                          {d('terms', { count: p.durationTerms })}
                        </p>
                        {pick(locale, p.overviewAr, p.overviewEn) && (
                          <p className="mt-3 text-sm text-muted-foreground">
                            {pick(locale, p.overviewAr, p.overviewEn)}
                          </p>
                        )}
                        <div className="mt-3">
                          <TuitionLine tuition={p.tuition} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionShell>
      </main>
      <SiteFooter site={site} locale={locale} />
    </>
  );
}
