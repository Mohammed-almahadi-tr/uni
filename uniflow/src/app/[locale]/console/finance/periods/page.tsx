import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { fiscalCalendar } from '@/lib/console/backoffice';
import { ForbiddenScreen } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { PeriodToggle } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('procurement.periods');
  return { title: t('title') };
}

/**
 * Fiscal periods (Track D4, SRS REQ-PER-01).
 *
 * Reading which months are open needs `period.read`; changing one needs
 * `period.close` and a second factor. The screen is reachable on either, so a
 * preparer can see where they may date a voucher without being able to move
 * the boundary.
 *
 * Sealing a year — `PERMANENTLY_CLOSED` — is deliberately not a button here.
 * It belongs with the pre-close checklist A7 deferred to D5, not beside every
 * month.
 */
export default async function PeriodsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'finance/periods');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.periods');
  const ps = await getTranslations('procurement.periodStatus');

  const years = await fiscalCalendar(principal);
  const mayClose = principal.permissions.has('period.close');

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {years.length === 0 ? (
        <Panel>
          <Empty>{t('noPeriods')}</Empty>
        </Panel>
      ) : (
        years.map((y) => (
          <Panel key={y.id} title={y.name} actions={<Pill>{ps(y.status)}</Pill>}>
            <ul className="divide-y divide-border">
              {y.periods.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-4 py-3">
                  <span className="numeric w-8 text-sm text-muted-foreground">{p.seq}</span>
                  <span className="numeric min-w-48 flex-1 text-sm">
                    {p.startDate} → {p.endDate}
                  </span>
                  <Pill
                    tone={
                      p.status === 'OPEN'
                        ? 'good'
                        : p.status === 'FUTURE'
                          ? 'neutral'
                          : 'warn'
                    }
                  >
                    {ps(p.status)}
                  </Pill>
                  {mayClose && <PeriodToggle periodId={p.id} status={p.status} />}
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}

      <p className="text-xs text-muted-foreground">{t('closeHint')}</p>
    </div>
  );
}
