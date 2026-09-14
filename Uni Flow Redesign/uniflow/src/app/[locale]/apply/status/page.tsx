import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { currentSite, currentTenant } from '@/lib/cms/request';
import { letterheadForTenant } from '@/lib/print/letterhead';
import {
  localeOf,
  NoSiteConfigured,
  SectionShell,
  SiteFooter,
  SiteHeader,
} from '@/components/site/chrome';
import { StatusLookup } from './form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('apply.status');
  return { title: t('title') };
}

/**
 * Checking an application (SRS REQ-LP-04, Track C2).
 *
 * The application number identifies and the tracking token authenticates. The
 * number is sequential, printed on a slip and quoted over a telephone, so it
 * could not be the secret; the token is 32 hex characters and is shown once,
 * at submission.
 *
 * Both are **posted**, never in the URL — see `actions.ts` for why a secret in
 * a query string is a secret in the browser history, the `Referer` header and
 * the access log.
 */
export default async function ApplicationStatusPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('apply.status');
  const site = await currentSite();
  const tenant = await currentTenant();
  if (!site || !tenant) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  const letterhead = await letterheadForTenant(tenant.tenantId);

  return (
    <>
      <SiteHeader site={site} locale={locale} />
      <main className="flex-1">
        <SectionShell heading={t('title')} blurb={t('blurb')}>
          <StatusLookup locale={locale} letterhead={letterhead} />

          <p className="mt-8 text-xs text-muted-foreground">
            {t('lost')}{' '}
            <Link href="/contact" className="underline hover:no-underline">
              {t('lostLink')}
            </Link>
          </p>
        </SectionShell>
      </main>
      <SiteFooter site={site} locale={locale} />
    </>
  );
}
