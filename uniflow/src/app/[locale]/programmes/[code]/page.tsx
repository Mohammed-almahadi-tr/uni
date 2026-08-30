import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
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

async function find(code: string) {
  const site = await currentSite();
  if (!site) return { site: null, programme: null };
  const wanted = code.toLowerCase();
  for (const f of site.faculties) {
    const p = f.programmes.find((x) => x.code.toLowerCase() === wanted);
    if (p) return { site, programme: p };
  }
  return { site, programme: null };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}): Promise<Metadata> {
  const { locale, code } = await params;
  const { programme } = await find(code);
  if (!programme) return {};
  return { title: locale === 'ar' ? programme.nameAr : programme.nameEn };
}

/** One programme (SRS REQ-LP-03). */
export default async function ProgrammePage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale: raw, code } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('site.programmes');
  const d = await getTranslations('site.duration');
  const { site, programme } = await find(code);
  if (!site) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }
  // A programme that exists but is not published is a 404 here, not a
  // "forbidden" — the public has no business learning that it exists.
  if (!programme) notFound();

  return (
    <>
      <SiteHeader site={site} locale={locale} />
      <main className="flex-1">
        <SectionShell heading={pick(locale, programme.nameAr, programme.nameEn)}>
          <p className="text-sm text-muted-foreground">
            {pick(locale, programme.facultyNameAr, programme.facultyNameEn)} ·{' '}
            {programme.degreeLevel} · {d('years', { count: programme.durationYears })}
          </p>

          <div className="mt-6 grid gap-8 md:grid-cols-3">
            <div className="space-y-6 md:col-span-2">
              {pick(locale, programme.overviewAr, programme.overviewEn) && (
                <section>
                  <h3 className="font-semibold">
                    {t('overview')}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {pick(locale, programme.overviewAr, programme.overviewEn)}
                  </p>
                </section>
              )}

              {pick(locale, programme.careerProspectsAr, programme.careerProspectsEn) && (
                <section>
                  <h3 className="font-semibold">
                    {t('career')}
                  </h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {pick(locale, programme.careerProspectsAr, programme.careerProspectsEn)}
                  </p>
                </section>
              )}
            </div>

            <aside className="rounded-lg border border-border bg-card p-5">
              <h3 className="font-semibold">{t('fees')}</h3>
              <div className="mt-2">
                <TuitionLine tuition={programme.tuition} />
              </div>
              {programme.tuition && (
                <p className="mt-3 text-xs text-muted-foreground">
                  {t('intake', { batch: programme.tuition.batchCode })}{' '}
                  <span className="numeric">{programme.tuition.effectiveFrom}</span>
                </p>
              )}
            </aside>
          </div>
        </SectionShell>
      </main>
      <SiteFooter site={site} locale={locale} />
    </>
  );
}
