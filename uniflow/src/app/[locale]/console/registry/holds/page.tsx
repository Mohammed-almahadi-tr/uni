import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { roleOptions, studentHeader } from '@/lib/console/lookups';
import { listHolds } from '@/lib/students/holds';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { StudentStrip } from '@/components/console/student-strip';
import { StudentPicker } from '@/components/console/student-picker';
import { ClearHold, PlaceHold } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.holds');
  return { title: t('title') };
}

/**
 * Holds (Track D3, SRS REQ-REG-06).
 *
 * Student-scoped, because a hold is placed on a person rather than filed in a
 * queue. The screen shows the live ones and the cleared ones together: a hold
 * that was placed and lifted is part of why a student's term looks the way it
 * does, and hiding it once cleared is how the record of a dispute disappears.
 */
export default async function HoldsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/holds');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('registry');
  const sp = await searchParams;
  const header = sp.student ? await studentHeader(principal, sp.student) : null;

  if (!header) {
    return (
      <div>
        <PageHeader title={t('holds.title')} subtitle={t('holds.subtitle')} />
        <StudentPicker
          principal={principal}
          locale={locale}
          query={sp.q ?? ''}
          basePath="/console/registry/holds"
        />
      </div>
    );
  }

  const [holds, roles] = await Promise.all([
    listHolds(principal, header.id, { includeCleared: true }),
    roleOptions(principal),
  ]);

  const live = holds.filter((h) => !h.clearedAt);
  const cleared = holds.filter((h) => h.clearedAt);

  return (
    <div className="space-y-6">
      <PageHeader title={t('holds.title')} subtitle={t('holds.subtitle')} />

      <StudentStrip
        header={header}
        locale={locale}
        href={`/console/registry/students/${header.id}`}
      />

      <Panel title={t('holds.live')}>
        {live.length === 0 ? (
          <Empty>{t('holds.none')}</Empty>
        ) : (
          <ul className="space-y-4">
            {live.map((h) => (
              <li key={h.id} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <Pill tone={h.blocksRegistration ? 'bad' : 'warn'}>
                    {t(`holdType.${h.holdType}`)}
                  </Pill>
                  <span className="text-sm">{h.reason}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="numeric">{h.effectiveFrom}</span> · {t('holds.placedBy')}{' '}
                  {h.placedBy}
                  {h.clearanceRoleName &&
                    ` · ${t('profile.clearedBy', { role: h.clearanceRoleName })}`}
                </p>
                <div className="mt-3">
                  <ClearHold holdId={h.id} studentId={header.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t('holds.place')}>
        <PlaceHold studentId={header.id} roles={roles} locale={locale} />
      </Panel>

      {cleared.length > 0 && (
        <Panel title={t('holds.history')}>
          <ul className="space-y-2 text-sm">
            {cleared.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-2">
                <Pill>{t(`holdType.${h.holdType}`)}</Pill>
                <span>{h.reason}</span>
                <span className="text-xs text-muted-foreground">
                  {t('holds.cleared')} {h.clearedBy ?? ''}
                  {h.clearanceNote && ` — ${h.clearanceNote}`}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
