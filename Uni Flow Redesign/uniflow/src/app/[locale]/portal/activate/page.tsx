import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { currentSite } from '@/lib/cms/request';
import { NoSiteConfigured, localeOf, pick } from '@/components/site/chrome';
import { ActivateForm } from './form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.activate');
  return { title: t('heading'), robots: { index: false, follow: false } };
}

/**
 * Turning an invitation code into a portal account (Track C3).
 *
 * `noindex`, because a search engine that crawls this page is a search engine
 * that will index whatever ends up in its query string one day.
 *
 * There is no self-registration anywhere near it. A form that let anybody
 * claim a student number and set a password on it would be the whole of the
 * access control, resting on a number printed on every receipt the student
 * has ever been handed. The university decides who may read a student's
 * account, at the registry desk, and this page is where that decision is
 * redeemed.
 */
export default async function ActivatePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('portal.activate');
  const site = await currentSite();
  if (!site) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <div className="mb-6 text-center">
        <h1 className="text-lg font-semibold">
          {pick(locale, site.tenant.nameAr, site.tenant.nameEn)}
        </h1>
        <p className="text-sm text-muted-foreground">{t('heading')}</p>
      </div>

      <ActivateForm locale={locale} />

      <p className="mt-6 text-center text-xs text-muted-foreground">{t('blurb')}</p>
    </main>
  );
}
