import type { Metadata } from 'next';
import { Cairo, Inter, JetBrains_Mono } from 'next/font/google';
import { notFound } from 'next/navigation';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { directionOf, routing } from '@/i18n/routing';
import '../globals.css';

/**
 * Arabic face. Cairo is chosen over the Latin default because a Latin font
 * renders Arabic with wrong proportions and no proper joining — on a printed
 * voucher that reads as a defect to whoever signs it.
 */
const arabic = Cairo({
  variable: '--font-arabic',
  subsets: ['arabic', 'latin'],
  display: 'swap',
});

const latin = Inter({
  variable: '--font-latin',
  subsets: ['latin'],
  display: 'swap',
});

/** Account codes and amounts, where column alignment matters. */
const mono = JetBrains_Mono({
  variable: '--font-mono-latin',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'UniFlow',
  description: 'University management and finance',
};

/** Pre-render both locales rather than resolving them per request. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

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

  return (
    // dir on <html> is what mirrors the entire layout. Tailwind's logical
    // properties (ms-*, pe-*, start-*) follow it, so a single attribute flips
    // the interface rather than a parallel set of RTL styles.
    <html
      lang={locale}
      dir={dir}
      className={`${arabic.variable} ${latin.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
