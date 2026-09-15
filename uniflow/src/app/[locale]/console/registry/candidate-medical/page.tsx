import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { can } from '@/lib/auth/rbac';
import { guardConsole } from '@/lib/console/guard';
import { withTenant } from '@/lib/db/client';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, Fact, FactGrid, PageHeader, Panel, Pill } from '@/components/console/ui';
import { AssessmentForm, DeactivateRequirementForm, PlacementForm, QueueInterviewForm, RequirementForm } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.candidateMedical');
  return { title: t('title') };
}

export default async function CandidateMedicalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ candidate?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);
  const guard = await guardConsole(raw, 'registry/candidate-medical');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;
  const t = await getTranslations('registry.candidateMedical');
  const sp = await searchParams;
  const q = sp.q?.trim() ?? '';
  const mayConfigure = can(principal, 'medical.manage');
  const mayPlace = can(principal, 'admission.manage');
  const mayReadClinical = can(principal, 'medical.read') || mayConfigure;

  const data = await withTenant(principal.tenantId, async (tx) => {
    const candidates = await tx.ministryCandidate.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(q ? { OR: [{ fullNameAr: { contains: q, mode: 'insensitive' } }, { fullNameEn: { contains: q, mode: 'insensitive' } }, { nationalId: { contains: q } }] } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, fullNameAr: true, fullNameEn: true, nationalId: true, state: true },
    });
    const selected = sp.candidate ? await tx.ministryCandidate.findFirst({
      where: { id: sp.candidate, tenantId: principal.tenantId },
      select: {
        id: true, fullNameAr: true, fullNameEn: true, nationalId: true, school: true, admissionYear: true, state: true, programmeId: true,
        programme: { select: { id: true, nameAr: true, nameEn: true, facultyId: true, faculty: { select: { nameAr: true, nameEn: true } } } },
        medicalAssessments: { orderBy: { recordedAt: 'desc' }, select: { id: true, examDate: true, bloodGroup: true, verdict: true, verdictNote: true, medicalOfficer: true, supersededAt: true } },
      },
    }) : null;
    const [programmes, faculties, allRequirements] = await Promise.all([
      tx.programme.findMany({ where: { tenantId: principal.tenantId, isActive: true }, orderBy: [{ faculty: { code: 'asc' } }, { code: 'asc' }], select: { id: true, code: true, nameAr: true, nameEn: true, faculty: { select: { nameAr: true, nameEn: true } } } }),
      tx.faculty.findMany({ where: { tenantId: principal.tenantId, isActive: true }, orderBy: { code: 'asc' }, select: { id: true, code: true, nameAr: true, nameEn: true } }),
      tx.candidateMedicalRequirement.findMany({ where: { tenantId: principal.tenantId, isActive: true }, orderBy: [{ faculty: { code: 'asc' } }, { code: 'asc' }], select: { id: true, code: true, nameAr: true, nameEn: true, isRequired: true, facultyId: true, faculty: { select: { nameAr: true, nameEn: true } } } }),
    ]);
    return { candidates, selected, programmes, faculties, allRequirements };
  });

  const localized = (ar: string, en: string) => locale === 'ar' ? ar : en;
  const applicable = data.selected?.programme ? data.allRequirements.filter((x) => x.facultyId === data.selected?.programme?.facultyId) : [];

  return <div className="space-y-6">
    <PageHeader title={t('title')} subtitle={t('subtitle')} />

    {mayConfigure && <Panel title={t('configuration')}>
      <RequirementForm faculties={data.faculties.map((x) => ({ id: x.id, label: `${x.code} — ${localized(x.nameAr, x.nameEn)}` }))} />
      <div className="mt-5 space-y-2">{data.allRequirements.length === 0 ? <Empty>{t('noRequirements')}</Empty> : data.allRequirements.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-2 text-sm"><span>{localized(item.faculty.nameAr, item.faculty.nameEn)} · {item.code} · {localized(item.nameAr, item.nameEn)} {item.isRequired && <Pill>{t('required')}</Pill>}</span><DeactivateRequirementForm id={item.id} /></div>)}</div>
    </Panel>}

    <Panel title={t('candidates')}>
      <form method="get" className="mb-4 flex gap-2"><input name="q" defaultValue={q} placeholder={t('search')} className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" /><button className="h-10 rounded-md border border-border px-4 text-sm">{t('search')}</button></form>
      {data.candidates.length === 0 ? <Empty>{t('noCandidates')}</Empty> : <div className="grid gap-2 md:grid-cols-2">{data.candidates.map((candidate) => <Link key={candidate.id} href={`/console/registry/candidate-medical?candidate=${candidate.id}`} className="rounded-md border border-border p-3 hover:bg-muted/50"><p className="font-medium">{localized(candidate.fullNameAr, candidate.fullNameEn ?? candidate.fullNameAr)}</p><p className="numeric text-xs text-muted-foreground">{candidate.nationalId} · {t(`states.${candidate.state}`)}</p></Link>)}</div>}
    </Panel>

    {data.selected && <>
      <Panel title={localized(data.selected.fullNameAr, data.selected.fullNameEn ?? data.selected.fullNameAr)} actions={<Pill>{t(`states.${data.selected.state}`)}</Pill>}>
        <FactGrid><Fact label={t('nationalId')}>{data.selected.nationalId}</Fact><Fact label={t('school')}>{data.selected.school}</Fact><Fact label={t('admissionYear')}><span className="numeric">{data.selected.admissionYear}</span></Fact><Fact label={t('programme')}>{data.selected.programme ? localized(data.selected.programme.nameAr, data.selected.programme.nameEn) : '—'}</Fact><Fact label={t('faculty')}>{data.selected.programme ? localized(data.selected.programme.faculty.nameAr, data.selected.programme.faculty.nameEn) : '—'}</Fact></FactGrid>
      </Panel>

      {mayPlace && ['PROFILE_COMPLETED', 'MEDICAL_PENDING'].includes(data.selected.state) && <Panel title={t('placement')}><PlacementForm candidateId={data.selected.id} current={data.selected.programmeId} programmes={data.programmes.map((x) => ({ id: x.id, label: `${localized(x.faculty.nameAr, x.faculty.nameEn)} · ${x.code} — ${localized(x.nameAr, x.nameEn)}` }))} /></Panel>}

      {mayConfigure && data.selected.state === 'MEDICAL_PENDING' && data.selected.programme && <Panel title={t('assessment')}>
        {applicable.length === 0 && <p className="mb-3 text-sm text-destructive">{t('configureFirst')}</p>}
        <AssessmentForm candidateId={data.selected.id} requirements={applicable.map((x) => ({ id: x.id, label: `${x.code} — ${localized(x.nameAr, x.nameEn)}`, required: x.isRequired }))} />
      </Panel>}

      {mayPlace && data.selected.state === 'MEDICALLY_CLEARED' && <Panel title={t('nextStep')}><p className="mb-3 text-sm text-muted-foreground">{t('interviewGate')}</p><QueueInterviewForm candidateId={data.selected.id} /></Panel>}

      {mayReadClinical && <Panel title={t('history')}>{data.selected.medicalAssessments.length === 0 ? <Empty>{t('noHistory')}</Empty> : <ul className="space-y-3">{data.selected.medicalAssessments.map((row) => <li key={row.id} className="border-s-2 border-border ps-4 text-sm"><div className="flex flex-wrap gap-2"><span className="numeric">{row.examDate.toISOString().slice(0, 10)}</span><Pill tone={row.verdict === 'FIT' ? 'good' : row.verdict === 'UNFIT' ? 'bad' : 'warn'}>{t(row.verdict)}</Pill>{row.supersededAt && <Pill>{t('superseded')}</Pill>}</div><p className="mt-1 text-muted-foreground">{t('bloodGroup')}: {row.bloodGroup.replace('_POS', '+').replace('_NEG', '−')} · {t('officer')}: {row.medicalOfficer}{row.verdictNote ? ` — ${row.verdictNote}` : ''}</p></li>)}</ul>}</Panel>}
    </>}
  </div>;
}
