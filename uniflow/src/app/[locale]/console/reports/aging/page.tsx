import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { parseReportRequest, runReport, type ReportKind } from '@/lib/console/reports';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { ExportBar, ReportNotes, ReportTable } from '@/components/console/report-view';
import { PageHeader, Panel } from '@/components/console/ui';
import { AsOfField, FilterBar, ReportTabs } from '../filters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reports.aging');
  return { title: t('title') };
}

const AGING: ReadonlySet<string> = new Set<ReportKind>([
  'aging-students',
  'aging-sponsors',
  'aging-vendors',
]);

/**
 * Who owes what, and for how long (Track D5, SRS REQ-RPT-02).
 *
 * ## Three reports, not one
 *
 * Students, sponsors and vendors are three tabs rather than three sections of
 * one table, and that is a decision rather than a layout. Each is aged against
 * a different clock:
 *
 *   · a **student** from the charge's due date, falling back to the date it
 *     was raised — a fee with no stated due date is payable on demand;
 *   · a **sponsor** from the date their invoice fell due, never from the
 *     charge, because a sponsor is not late for a bill nobody has sent them
 *     and ageing them from the charge would produce a dunning list of the
 *     institution's own administrative backlog;
 *   · a **vendor** from the terms on the invoice, so sixty-day terms raised
 *     sixty-one days ago is one day late rather than two months late.
 *
 * Stacking them would put three definitions of "60 days overdue" in one column
 * and invite somebody to total it.
 *
 * ## What the legacy build had instead
 *
 * ```vb
 * "Sum(TotalValueOut)-Sum(TotalValueIn) Balance " & _
 * "From Transactionees as UncollectedFees Where StudID Is Not Null  and " & _
 * "TransDate<=N'" & Me.DateTimePicker1.Value.ToShortDateString & " 23:59:59' " & _
 * "Group By  StudID,StudName Having Sum(TotalValueOut)-Sum(TotalValueIn)<>0"
 * ```
 * (frmUncollectedFees.vb:38-42)
 *
 * One balance per student as at a date, and **no aging whatever**: no due
 * date, no buckets, no way to tell a fee raised last week from one unpaid for
 * two years. A registrar chasing arrears got a list of everybody who owed
 * anything, in student-number order, and worked out the urgency themselves.
 *
 * There was no sponsor ledger and no payables at all — a supplier was a name
 * typed into a voucher narration — so two of these three tabs had nothing to
 * report on in the first place.
 */
export default async function AgingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'reports/aging');
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('reports.aging');
  const sp = await searchParams;
  const parsed = parseReportRequest(sp, 'aging-students');
  const kind = (AGING.has(parsed.kind) ? parsed.kind : 'aging-students') as ReportKind;
  const req = { ...parsed, kind };

  const result = await runReport(guard.ctx.principal, req);
  // Query-only: the tab stays on this screen, and an absolute path would
  // only add a way to lose the locale prefix.
  const base = `?asOf=${req.asOf}&kind=`;

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <ReportTabs
        active={kind}
        tabs={[
          { key: 'aging-students', label: t('students'), href: `${base}aging-students` },
          { key: 'aging-sponsors', label: t('sponsors'), href: `${base}aging-sponsors` },
          { key: 'aging-vendors', label: t('vendors'), href: `${base}aging-vendors` },
        ]}
      />

      <Panel>
        <FilterBar kind={kind}>
          <AsOfField req={req} />
        </FilterBar>
      </Panel>

      <Panel title={req.asOf} actions={<ExportBar request={result.request} locale={locale} />}>
        <ReportTable doc={result.document} locale={locale} />
        <ReportNotes doc={result.document} locale={locale} alert={result.alert} />
      </Panel>
    </div>
  );
}
