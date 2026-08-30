import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { programmeOptions, studentHeader, termOptions } from '@/lib/console/lookups';
import { transitionsFrom } from '@/lib/students/lifecycle';
import { listRegistrations } from '@/lib/registration/engine';
import { can } from '@/lib/auth/rbac';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { PageHeader, Panel, Pill } from '@/components/console/ui';
import { StudentStrip } from '@/components/console/student-strip';
import { StudentPicker } from '@/components/console/student-picker';
import { ChangeStanding, TransferProgramme } from './forms';
import type { StudentStatus } from '@/generated/prisma/enums';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.lifecycle');
  return { title: t('title') };
}

/**
 * Standing, transfer and withdrawal (Track D3, SRS REQ-LIF-01/02, REQ-REG-04).
 *
 * The screen shows where the student stands and offers only the transitions
 * that lead out of it, each labelled with the money it moves. B5 built the
 * transition table so that "what does this do to their fees" is a property of
 * the transition; this is where a human reads it before deciding.
 */
export default async function LifecyclePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/lifecycle');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('registry');
  const sp = await searchParams;
  const header = sp.student ? await studentHeader(principal, sp.student) : null;

  if (!header) {
    return (
      <div>
        <PageHeader title={t('lifecycle.title')} subtitle={t('lifecycle.subtitle')} />
        <StudentPicker
          principal={principal}
          locale={locale}
          query={sp.q ?? ''}
          basePath="/console/registry/lifecycle"
        />
      </div>
    );
  }

  const [registrations, programmes, terms] = await Promise.all([
    listRegistrations(principal, { studentId: header.id }),
    can(principal, 'registration.transfer') ? programmeOptions(principal) : [],
    can(principal, 'registration.transfer') ? termOptions(principal) : [],
  ]);
  const currency = registrations[0]?.currency ?? 'SDG';

  const options = transitionsFrom(header.status as StudentStatus).map((tr) => ({
    to: tr.to as string,
    label: tr.label,
    consequence: tr.consequence as string,
    requiresApproval: tr.requiresApproval,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t('lifecycle.title')} subtitle={t('lifecycle.subtitle')} />

      <StudentStrip
        header={header}
        locale={locale}
        href={`/console/registry/students/${header.id}`}
      />

      <Panel
        title={t('profile.changeStanding')}
        actions={
          <span className="text-xs text-muted-foreground">
            {t('lifecycle.currentStanding')}:{' '}
            <Pill tone={header.status === 'ACTIVE' ? 'good' : 'neutral'}>
              {t(`status.${header.status}`)}
            </Pill>
          </span>
        }
      >
        {can(principal, 'student.status') ? (
          <ChangeStanding studentId={header.id} options={options} currency={currency} />
        ) : (
          <p className="text-sm text-muted-foreground">{t('lifecycle.noTransitions')}</p>
        )}
      </Panel>

      {can(principal, 'registration.transfer') && (
        <Panel title={t('lifecycle.transfer')}>
          <TransferProgramme
            studentId={header.id}
            programmes={programmes}
            terms={terms}
            currency={currency}
            locale={locale}
          />
        </Panel>
      )}
    </div>
  );
}
