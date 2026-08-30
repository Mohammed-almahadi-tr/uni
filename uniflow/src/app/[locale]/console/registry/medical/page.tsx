import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { studentHeader } from '@/lib/console/lookups';
import { fitnessStatus, medicalHistory } from '@/lib/students/medical';
import { can } from '@/lib/auth/rbac';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, Fact, FactGrid, PageHeader, Panel, Pill } from '@/components/console/ui';
import { StudentStrip } from '@/components/console/student-strip';
import { StudentPicker } from '@/components/console/student-picker';
import { RecordExamination } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.medical');
  return { title: t('title') };
}

const iso = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : '—');

/**
 * Medical records (Track D3, SRS REQ-ST-02).
 *
 * `LAPSED` is shown as its own state rather than folded into `UNFIT`, with
 * the sentence explaining why: a clearance that has run out is an examination
 * to repeat, not a finding of unfitness, and telling a student they are unfit
 * when their certificate has merely expired is a different and worse
 * conversation.
 *
 * The history is below the current record because records are **superseded,
 * never edited** — the legacy table had no key of any kind, the form inserted
 * a fresh row on every save, and the profile screen read them with
 * `While reader.Read` into the same control, leaving whichever came back last.
 */
export default async function MedicalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/medical');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('registry');
  const sp = await searchParams;
  const header = sp.student ? await studentHeader(principal, sp.student) : null;

  if (!header) {
    return (
      <div>
        <PageHeader title={t('medical.title')} subtitle={t('medical.subtitle')} />
        <StudentPicker
          principal={principal}
          locale={locale}
          query={sp.q ?? ''}
          basePath="/console/registry/medical"
        />
      </div>
    );
  }

  const [fitness, history] = await Promise.all([
    fitnessStatus(principal, header.id),
    medicalHistory(principal, header.id),
  ]);

  const tone =
    fitness.state === 'FIT'
      ? 'good'
      : fitness.state === 'UNFIT'
        ? 'bad'
        : fitness.state === 'NOT_EXAMINED'
          ? 'neutral'
          : 'warn';

  return (
    <div className="space-y-6">
      <PageHeader title={t('medical.title')} subtitle={t('medical.subtitle')} />

      <StudentStrip
        header={header}
        locale={locale}
        href={`/console/registry/students/${header.id}`}
      />

      <Panel
        title={t('medical.fitness')}
        actions={<Pill tone={tone}>{t(`medical.${fitness.state}`)}</Pill>}
      >
        <FactGrid>
          <Fact label={t('medical.examDate')}>
            <span className="numeric">{iso(fitness.examDate)}</span>
          </Fact>
          <Fact label={t('medical.validUntil')}>
            <span className="numeric">{iso(fitness.validUntil)}</span>
          </Fact>
          {fitness.note && <Fact label={t('medical.verdictNote')}>{fitness.note}</Fact>}
        </FactGrid>
        {fitness.state === 'LAPSED' && (
          <p className="mt-4 text-sm text-muted-foreground">{t('medical.lapsedNote')}</p>
        )}
      </Panel>

      {can(principal, 'medical.manage') && (
        <Panel title={t('medical.record')}>
          <RecordExamination studentId={header.id} />
        </Panel>
      )}

      <Panel title={t('medical.history')}>
        {history.length === 0 ? (
          <Empty>{t('medical.noHistory')}</Empty>
        ) : (
          <ul className="space-y-3 text-sm">
            {history.map((r) => (
              <li key={r.id} className="border-s-2 border-border ps-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="numeric text-muted-foreground">{iso(r.examDate)}</span>
                  <Pill tone={r.verdict === 'FIT' ? 'good' : 'warn'}>
                    {t(`medical.${r.verdict}`)}
                  </Pill>
                  <Pill>{r.supersededAt ? t('medical.superseded') : t('medical.current')}</Pill>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {t('medical.officer')}: {r.medicalOfficer}
                  {r.verdictNote && ` — ${r.verdictNote}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
