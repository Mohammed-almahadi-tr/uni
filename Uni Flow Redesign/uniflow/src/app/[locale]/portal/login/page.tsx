import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { redirectLocalised } from '@/lib/console/redirect';
import { currentSite } from '@/lib/cms/request';
import { currentPortalAccount } from '@/lib/portal/guard';
import { NoSiteConfigured, localeOf, pick } from '@/components/site/chrome';
import { PortalLoginForm } from './form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.signIn');
  return { title: t('heading') };
}

/**
 * Where a student or guardian signs in (SRS REQ-LP-05, Track C3).
 *
 * A separate door from `/login`, and separate all the way down: a different
 * cookie, a different token audience, a different table. A member of staff
 * who is also a parent — common at a university — is signed into both at once
 * without either logging the other out, and neither credential opens the
 * other's door.
 */
export default async function PortalLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('portal.signIn');
  const site = await currentSite();
  if (!site) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  // Already signed in on this university's address: no reason to ask again.
  if (await currentPortalAccount()) redirectLocalised(raw, '/portal');

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <div className="mb-6 text-center">
        {site.branding.logoUrl ? (
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
        <p className="text-sm text-muted-foreground">{t('heading')}</p>
      </div>

      <PortalLoginForm />

      {/* The only two things somebody without an account can usefully do:
          turn an invitation into one, or ask the registry for an invitation.
          There is no self-registration — the university decides who may read
          a student's account, and a form that let anybody claim a student
          number would be the whole of the access control. */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        {t('haveCode')}{' '}
        <Link href="/portal/activate" className="underline hover:no-underline">
          {t('activateLink')}
        </Link>
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {t('noCode')}{' '}
        <Link href="/contact" className="underline hover:no-underline">
          {t('contactLink')}
        </Link>
      </p>
    </main>
  );
}
