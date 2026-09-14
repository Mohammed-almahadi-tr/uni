import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ConsoleSectionPage } from '@/components/console/section-index';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('console.sections');
  return { title: t('registry') };
}

/** Registry section index (Track D1). Guarded by CONSOLE_ROUTES. */
export default async function RegistrySection({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ConsoleSectionPage locale={locale} sectionKey="registry" />;
}
