import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CandidateProfileForm } from './form';

export const metadata: Metadata = { title: 'Candidate profile', robots: { index: false, follow: false } };

export default async function CandidateProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('candidatePortal');
  return <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center p-6"><h1 className="text-xl font-bold">{t('title')}</h1><p className="mt-2 mb-6 text-sm text-muted-foreground">{t('subtitle')}</p><CandidateProfileForm /></main>;
}
