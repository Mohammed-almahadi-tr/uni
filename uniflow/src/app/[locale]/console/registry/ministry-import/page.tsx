import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { withTenant } from '@/lib/db/client';
import { ForbiddenScreen } from '@/components/console/text';
import { PageHeader, Panel } from '@/components/console/ui';
import { MinistryImportForm } from './form';
import { CandidateCode } from './candidate-code';

export const metadata: Metadata = { title: 'Ministry roster import' };

export default async function MinistryImportPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const guard = await guardConsole(locale, 'registry/ministry-import');
  if (!guard.ok) return <ForbiddenScreen />;
  const t = await getTranslations('registry.ministryImport');
  const candidates = await withTenant(guard.ctx.principal.tenantId, (tx) => tx.ministryCandidate.findMany({ orderBy: { createdAt: 'desc' }, take: 50, select: { id: true, fullNameAr: true, nationalId: true, state: true } }));
  return <div className="space-y-6"><PageHeader title={t('title')} subtitle={t('subtitle')} /><Panel title={t('panel')}><MinistryImportForm /></Panel><Panel title="Imported candidates">{candidates.length === 0 ? <p className="text-sm text-muted-foreground">No ministry candidates have been imported yet.</p> : <div className="space-y-3">{candidates.map((candidate) => <div key={candidate.id} className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3"><div><p className="font-medium">{candidate.fullNameAr}</p><p className="numeric text-xs text-muted-foreground">{candidate.nationalId} · {candidate.state}</p></div><CandidateCode candidateId={candidate.id} /></div>)}</div>}</Panel></div>;
}
