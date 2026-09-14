import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { ForbiddenScreen } from '@/components/console/text';
import { PageHeader, Panel } from '@/components/console/ui';
import { MinistryImportForm } from './form';

export const metadata: Metadata = { title: 'Ministry roster import' };

export default async function MinistryImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const guard = await guardConsole(locale, 'registry/ministry-import');
  if (!guard.ok) return <ForbiddenScreen />;
  const t = await getTranslations('registry.ministryImport');
  return <div className="space-y-6"><PageHeader title={t('title')} subtitle={t('subtitle')} /><Panel title={t('panel')}><MinistryImportForm /></Panel></div>;
}
