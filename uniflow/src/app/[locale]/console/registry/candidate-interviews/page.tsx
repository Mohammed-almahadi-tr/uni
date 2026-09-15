import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { MinistryCandidateState } from '@/generated/prisma/enums';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, Fact, FactGrid, PageHeader, Panel, Pill } from '@/components/console/ui';
import { guardConsole } from '@/lib/console/guard';
import { withTenant } from '@/lib/db/client';
import { InterviewDecisionForm } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.candidateInterviews');
  return { title: t('title') };
}

export default async function CandidateInterviewsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ candidate?: string; q?: string }> }) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);
  const guard = await guardConsole(raw, 'registry/candidate-interviews');
  if (!guard.ok) return <ForbiddenScreen />;
  const t = await getTranslations('registry.candidateInterviews');
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const data = await withTenant(guard.ctx.principal.tenantId, async (tx) => {
    const workflowStates: MinistryCandidateState[] = ['PROFILE_COMPLETED', 'INTERVIEW_PENDING', 'ACCEPTED', 'REJECTED', 'REGISTRATION_PENDING'];
    const where = { tenantId: guard.ctx.principal.tenantId, state: { in: workflowStates }, ...(q ? { OR: [{ fullNameAr: { contains: q, mode: 'insensitive' as const } }, { fullNameEn: { contains: q, mode: 'insensitive' as const } }, { nationalId: { contains: q } }] } : {}) };
    const candidates = await tx.ministryCandidate.findMany({ where, orderBy: { createdAt: 'desc' }, take: 30, select: { id: true, fullNameAr: true, fullNameEn: true, nationalId: true, state: true } });
    const selected = sp.candidate ? await tx.ministryCandidate.findFirst({ where: { id: sp.candidate, tenantId: guard.ctx.principal.tenantId }, select: { id: true, fullNameAr: true, fullNameEn: true, nationalId: true, state: true, programme: { select: { nameAr: true, nameEn: true } }, interviewDecision: { select: { decision: true, score: true, notes: true, conditions: true, discountPct: true, instalmentCount: true, decidedAt: true, finalizedAt: true, decidedBy: { select: { fullName: true } } } } } }) : null;
    const programmes = await tx.programme.findMany({
      where: { tenantId: guard.ctx.principal.tenantId, isActive: true },
      orderBy: [{ faculty: { code: 'asc' } }, { code: 'asc' }],
      select: { id: true, code: true, nameAr: true, nameEn: true, faculty: { select: { nameAr: true, nameEn: true } } },
    });
    return { candidates, selected, programmes };
  });
  const localized = (ar: string, en: string) => locale === 'ar' ? ar : en;
  return <div className="space-y-6"><PageHeader title={t('title')} subtitle={t('subtitle')} /><Panel title={t('queue')}><form method="get" className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder={t('search')} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" /><button className="h-10 rounded-md border border-border px-4 text-sm">{t('search')}</button></form>{data.candidates.length === 0 ? <Empty>{t('empty')}</Empty> : <div className="grid gap-2 md:grid-cols-2">{data.candidates.map((x) => <Link key={x.id} href={`/console/registry/candidate-interviews?candidate=${x.id}`} className="rounded-md border border-border p-3 hover:bg-muted/50"><p className="font-medium">{localized(x.fullNameAr, x.fullNameEn ?? x.fullNameAr)}</p><p className="numeric text-xs text-muted-foreground">{x.nationalId} · {t(`states.${x.state}`)}</p></Link>)}</div>}</Panel>
    {data.selected && <><Panel title={localized(data.selected.fullNameAr, data.selected.fullNameEn ?? data.selected.fullNameAr)} actions={<Pill>{t(`states.${data.selected.state}`)}</Pill>}><FactGrid><Fact label={t('nationalId')}>{data.selected.nationalId}</Fact><Fact label={t('programme')}>{data.selected.programme ? localized(data.selected.programme.nameAr, data.selected.programme.nameEn) : '—'}</Fact></FactGrid></Panel>
      {['PROFILE_COMPLETED', 'INTERVIEW_PENDING'].includes(data.selected.state) && !data.selected.interviewDecision && <Panel title={t('panel')}><InterviewDecisionForm candidateId={data.selected.id} programmes={data.programmes.map((programme) => ({ id: programme.id, label: `${localized(programme.faculty.nameAr, programme.faculty.nameEn)} · ${programme.code} — ${localized(programme.nameAr, programme.nameEn)}` }))} /></Panel>}
      {data.selected.interviewDecision && <Panel title={t('recordedDecision')}><FactGrid><Fact label={t('decision')}>{t(data.selected.interviewDecision.decision)}</Fact><Fact label={t('decidedBy')}>{data.selected.interviewDecision.decidedBy.fullName}</Fact><Fact label={t('decidedAt')}>{data.selected.interviewDecision.decidedAt.toISOString().slice(0, 10)}</Fact>{data.selected.interviewDecision.notes && <Fact label={t('notes')}>{data.selected.interviewDecision.notes}</Fact>}</FactGrid></Panel>}</>}
  </div>;
}
