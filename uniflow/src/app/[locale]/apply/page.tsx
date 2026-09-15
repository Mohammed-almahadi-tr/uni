import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = { title: 'Ministry candidate portal' };

/**
 * Public self-application is intentionally disabled. Admission begins only
 * with a Ministry of Higher Education Excel roster imported by staff.
 */
export default async function ApplyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(`/${locale}/candidate/profile`);
}
