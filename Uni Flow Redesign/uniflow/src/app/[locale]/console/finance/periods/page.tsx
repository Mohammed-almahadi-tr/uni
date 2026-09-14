import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { fiscalCalendar } from '@/lib/console/backoffice';
import { ForbiddenScreen } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { preCloseChecklist } from '@/lib/ledger/close';
import { PreCloseChecklist } from './checklist';
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
 * It belongs with the pre-close checklist, and **D5 has now built both**: the
 * checklist opens from a link on each period, and the seal sits underneath it
 * where somebody has had to read the checks first. A state with no way back
 * does not belong beside twelve reversible ones.
 *
 * Closing is now gated (REQ-PER-02). `setPeriodStatus` runs the checklist
 * inside its own transaction and refuses on a blocking failure, so the button
 * on this screen can be pressed without the checklist having been opened and
 * the refusal will still say which check stopped it. The link is the courtesy;
 * the gate is in the module.
 */
export default async function PeriodsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ check?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'finance/periods');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.periods');
  const ps = await getTranslations('procurement.periodStatus');
  const pt = await getTranslations('period');

  const sp = await searchParams;
  const years = await fiscalCalendar(principal);
  const mayClose = principal.permissions.has('period.close');

  // The checklist is only run for the period asked for. It reads the whole
  // reconciliation and a trial balance, and running it for every month of
  // every year on page load would make this screen the slowest in the console
  // for the sake of information nobody had asked for yet.
  const checking = sp.check
    ? years.flatMap((y) => y.periods).find((p) => p.id === sp.check)
    : undefined;
  const report = checking ? await preCloseChecklist(principal, checking.id) : null;

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
                  {p.status !== 'PERMANENTLY_CLOSED' && (
                    <a
                      href={sp.check === p.id ? '?' : `?check=${p.id}`}
                      className="text-xs underline hover:no-underline"
                    >
                      {sp.check === p.id ? pt('hideCheck') : pt('runCheck')}
                    </a>
                  )}
                  {mayClose && <PeriodToggle periodId={p.id} status={p.status} />}
                </li>
              ))}
            </ul>
          </Panel>
        ))
      )}

      {report && checking && (
        <PreCloseChecklist
          report={report}
          locale={raw}
          periodStatus={checking.status}
          maySeal={mayClose}
        />
      )}

      <p className="text-xs text-muted-foreground">{t('closeHint')}</p>
    </div>
  );
}
