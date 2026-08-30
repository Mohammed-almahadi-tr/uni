import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirectLocalised } from '@/lib/console/redirect';
import { currentSite } from '@/lib/cms/request';
import { currentContext } from '@/lib/console/session';
import { safeNext } from '@/lib/console/guard';
import { NoSiteConfigured, localeOf, pick } from '@/components/site/chrome';
import { LoginForm } from './login-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('console.signIn');
  return { title: t('heading') };
}

/** Staff sign-in (Track D1, SRS REQ-NFR-05). */
export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('console');
  const site = await currentSite();
  if (!site) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  const next = safeNext((await searchParams).next);

  // Already signed in on this university's address: no reason to ask again.
  const ctx = await currentContext();
  if (ctx) redirectLocalised(raw, next);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <div className="mb-6 text-center">
        {site.branding.logoUrl ? (
          // Tenant-supplied URL on storage this application does not control.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={site.branding.logoUrl} alt="" className="mx-auto h-14 w-auto" />
        ) : (
          <span
            className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-primary text-lg font-bold text-primary-foreground"
            aria-hidden
          >
            {site.branding.shortCode.slice(0, 3)}
          </span>
        )}
        <h1 className="mt-4 text-lg font-semibold">
          {pick(locale, site.tenant.nameAr, site.tenant.nameEn)}
        </h1>
        <p className="text-sm text-muted-foreground">{t('title')}</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="mb-4 font-semibold">{t('signIn.heading')}</h2>
        <LoginForm next={next} />
      </div>
    </main>
  );
}
