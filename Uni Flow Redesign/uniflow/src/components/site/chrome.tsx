import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { BrandingTokens } from '@/lib/cms/branding';
import type { PublicSite } from '@/lib/cms/public';

/**
 * The public site's furniture (SRS REQ-LP-01, Track C1).
 *
 * Two kinds of string appear on these pages and they come from different
 * places, deliberately:
 *
 *   · **Content** — the university's name, its motto, a programme's overview —
 *     is a pair of columns on a row, and `pick()` chooses by locale. It is the
 *     tenant's text, so it cannot live in a message catalogue.
 *
 *   · **Interface copy** — "Programmes", "View on map", "Contact us" — is the
 *     application's own, and lives in `messages/*.json` so the catalogue
 *     parity test covers it. A public page whose English and Arabic drift
 *     apart is exactly what that test exists to catch.
 *
 * What does not appear anywhere here is a literal naming a university, which
 * is the whole difference from `Me.Text = "Oasis Computer Systems"`.
 */

type Locale = 'ar' | 'en';

const pick = <T,>(locale: Locale, ar: T, en: T): T => (locale === 'ar' ? ar : en);

export async function SiteHeader({
  site,
  locale,
}: {
  site: PublicSite;
  locale: Locale;
}) {
  const t = await getTranslations('site.nav');
  const { tenant, branding } = site;
  const other: Locale = locale === 'ar' ? 'en' : 'ar';
  const name = pick(locale, tenant.nameAr, tenant.nameEn);

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          {branding.logoUrl ? (
            // The logo is a tenant-supplied URL on storage this application does
            // not control, so next/image has no configured remote pattern for it.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={branding.logoUrl} alt="" className="h-10 w-auto shrink-0" />
          ) : (
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary text-sm font-bold text-primary-foreground"
              aria-hidden
            >
              {branding.shortCode.slice(0, 3)}
            </span>
          )}
          <span className="min-w-0">
            <span className="block truncate font-semibold leading-tight">{name}</span>
            {(branding.mottoAr || branding.mottoEn) && (
              <span className="block truncate text-xs text-muted-foreground">
                {pick(locale, branding.mottoAr, branding.mottoEn)}
              </span>
            )}
          </span>
        </Link>

        <nav className="ms-auto flex items-center gap-1 text-sm">
          <NavLink href="/programmes">{t('programmes')}</NavLink>
          <NavLink href="/news">{t('news')}</NavLink>
          <NavLink href="/calendar">{t('calendar')}</NavLink>
          <NavLink href="/contact">{t('contact')}</NavLink>
          {/* Applying is the one thing on this site somebody came to *do*
              rather than read, so it is a button and not another link in the
              row. It is always present: the apply page itself says whether an
              intake is open, which is the answer a prospective student wants
              either way — a link that vanishes when applications close looks
              like a site that is broken. */}
          <Link
            href="/apply"
            className="ms-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t('apply')}
          </Link>
          <Link
            href="/"
            locale={other}
            className="ms-2 rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            {other === 'ar' ? 'العربية' : 'English'}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="hidden rounded-md px-3 py-2 hover:bg-muted sm:inline-block">
      {children}
    </Link>
  );
}

/** Platform names are proper nouns and are not translated. */
const SOCIAL_LABEL: Record<string, string> = {
  FACEBOOK: 'Facebook',
  X: 'X',
  INSTAGRAM: 'Instagram',
  YOUTUBE: 'YouTube',
  LINKEDIN: 'LinkedIn',
  TELEGRAM: 'Telegram',
  WHATSAPP: 'WhatsApp',
  TIKTOK: 'TikTok',
};

export async function SiteFooter({ site, locale }: { site: PublicSite; locale: Locale }) {
  const { tenant, branding, social, campuses } = site;
  const primary = campuses.find((c) => c.isPrimary) ?? campuses[0];

  return (
    <footer className="mt-auto border-t border-border bg-muted/40">
      <div className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-8 md:grid-cols-3 md:px-6">
        <div>
          <div className="font-semibold">{pick(locale, tenant.nameAr, tenant.nameEn)}</div>
          {(branding.mottoAr || branding.mottoEn) && (
            <p className="mt-1 text-sm text-muted-foreground">
              {pick(locale, branding.mottoAr, branding.mottoEn)}
            </p>
          )}
        </div>

        {primary && (
          <div className="text-sm text-muted-foreground">
            <div className="font-medium text-foreground">
              {pick(locale, primary.nameAr, primary.nameEn)}
            </div>
            {pick(locale, primary.addressAr, primary.addressEn) && (
              <div>{pick(locale, primary.addressAr, primary.addressEn)}</div>
            )}
            {primary.phone && <div className="numeric">{primary.phone}</div>}
            {primary.email && <div>{primary.email}</div>}
          </div>
        )}

        {social.length > 0 && (
          <div className="flex flex-wrap items-start gap-2 text-sm">
            {social.map((s) => (
              <a
                key={s.platform}
                href={s.url}
                rel="noreferrer noopener"
                target="_blank"
                className="rounded-md border border-border px-3 py-1 hover:bg-card"
              >
                {SOCIAL_LABEL[s.platform] ?? s.platform}
              </a>
            ))}
          </div>
        )}
      </div>
    </footer>
  );
}

/**
 * What a host that resolves to no tenant sees.
 *
 * Deliberately says nothing about the platform, lists no universities, and
 * offers no way to guess at one. A host is either configured or it is not.
 */
export async function NoSiteConfigured({ host }: { host: string | null }) {
  const t = await getTranslations('site.noSite');
  return (
    <main className="mx-auto grid min-h-[60vh] w-full max-w-xl place-items-center p-6 text-center">
      <div>
        <h1 className="text-xl font-semibold">{t('title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {host ? t('body', { host }) : t('noHost')}
        </p>
      </div>
    </main>
  );
}

export function SectionShell({
  heading,
  blurb,
  children,
  className,
}: {
  heading?: string | null;
  blurb?: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('mx-auto w-full max-w-6xl px-4 py-10 md:px-6', className)}>
      {heading && <h2 className="text-xl font-bold md:text-2xl">{heading}</h2>}
      {blurb && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{blurb}</p>}
      <div className={heading || blurb ? 'mt-6' : undefined}>{children}</div>
    </section>
  );
}

/** Narrow the route's locale parameter to the pair the site actually serves. */
export function localeOf(value: string): Locale {
  return value === 'ar' ? 'ar' : 'en';
}

export { pick };
export type { BrandingTokens, Locale };
