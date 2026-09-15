import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = { title: 'Ministry candidate portal' };

/** Legacy public application tracking is closed with self-application. */
export default async function ApplicationStatusPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect(`/${locale}/candidate/profile`);
}
