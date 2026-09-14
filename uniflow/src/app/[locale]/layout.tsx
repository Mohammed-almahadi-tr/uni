import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { directionOf, routing } from '@/i18n/routing';
import { themeStyle } from '@/lib/cms/branding';
import { currentSite } from '@/lib/cms/request';
import { currentTheme } from '@/lib/console/theme';
import { ThemeScript } from '@/components/theme-script';
import '../globals.css';

/**
 * Arabic face. Cairo is chosen over the Latin default because a Latin font
 * renders Arabic with wrong proportions and no proper joining — on a printed
 * voucher that reads as a defect to whoever signs it.
 */
/**
 * Latin body face. A humanist sans with a large x-height and unambiguous
 * digits, which matters on a screen that is mostly account codes, cheque
 * numbers and student identifiers read aloud across a counter.
 */
/**
 * Latin display face, for headings and the documents this system issues.
 * A transitional serif because an offer letter, a certificate and a sponsor
 * invoice are instruments a university signs, and a geometric sans sets them
 * like a software dashboard. Latin only: it has no Arabic range, so Arabic
 * headings stay on Cairo (see globals.css).
 */
/** Account codes and amounts, where column alignment matters. */
/**
 * Title, description and favicon come from the tenant the host resolves to
 * (C1, REQ-LP-01).
 *
 * The legacy equivalent was `Me.Text = "Oasis Computer Systems"` on the Ribat
 * build's main window and `Me.Text = "الكلية التكنلوجية"` on Nile's — the
 * vendor's name on one customer's screen and a third institution's on the
 * other's, because the title was a literal in a compiled resource. Here it is
 * a row, and the row belongs to a tenant.
 */
export async function generateMetadata(): Promise<Metadata> {
  const site = await currentSite();
  if (!site) return { title: 'UniFlow' };
  return {
    title: {
      default: site.tenant.nameEn,
      template: `%s · ${site.tenant.nameEn}`,
    },
    description: site.branding.mottoEn ?? site.tenant.nameEn,
    ...(site.branding.faviconUrl ? { icons: { icon: site.branding.faviconUrl } } : {}),
  };
}

/**
 * No `generateStaticParams`.
 *
 * The response depends on the `Host` header, so there is no prerenderable
 * version of any page under this layout — every tenant's palette, name and
 * content differ. Reading the host through `currentSite()` opts these routes
 * into dynamic rendering, which is the correct behaviour and not a
 * regression from the Phase 0 shell.
 */
export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);
  const dir = directionOf(locale);
  const [site, theme] = await Promise.all([currentSite(), currentTheme()]);

  return (
    // dir on <html> is what mirrors the entire layout. Tailwind's logical
    // properties (ms-*, pe-*, start-*) follow it, so a single attribute flips
    // the interface rather than a parallel set of RTL styles.
    <html
      lang={locale}
      dir={dir}
      // The resolved scheme is on the server-rendered markup, so an explicit
      // light or dark choice is correct in the very first byte. `system` is
      // finished by the inline script below, still before the first paint.
      data-theme={theme}
      className={`h-full antialiased${theme === 'dark' ? ' dark' : ''}`}
    >
      <head>
        <ThemeScript theme={theme} />
        {/* Inlined rather than fetched: the palette differs per host, so it
            cannot be a cached static file, and a separate request for it means
            the page paints once in the default teal and again in the tenant's
            colours. Every value is a number or a member of ALLOWED_FONTS. */}
        {site && (
          <style
            id="tenant-theme"
            dangerouslySetInnerHTML={{ __html: themeStyle(site.branding) }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
