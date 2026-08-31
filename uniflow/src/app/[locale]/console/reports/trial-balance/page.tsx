import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { costCenterOptions } from '@/lib/console/finance';
import { parseReportRequest, runReport } from '@/lib/console/reports';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { ExportBar, ReportNotes, ReportTable } from '@/components/console/report-view';
import { PageHeader, Panel } from '@/components/console/ui';
import { CostCentreField, FilterBar, LevelField, WindowFields } from '../filters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reports.trialBalance');
  return { title: t('title') };
}

/**
 * The trial balance (Track D5, SRS REQ-RPT-03).
 *
 * ## What the legacy system called a trial balance
 *
 * ```vb
 * "Sum(TotalValueIn)-Sum(TotalValueOut) TotalValueIn," & _
 * "Sum(TotalValueIn)-Sum(TotalValueOut) TotalValueOut " & _
 * "From Transactionees " & _
 * "where Transdate > N'" & DateTimePicker1.Value.ToShortDateString & " 00:00:01'" & ...
 * ```
 * (frmTrialBalance.vb:165-169)
 *
 * **The debit column and the credit column are the same expression.** Both
 * are `In − Out`, aliased twice. The report prints one signed net under two
 * headings, so its two columns are equal by construction — it can never fail
 * to balance, and it can never detect that anything is wrong, because it is
 * not two columns.
 *
 * It reads `Transactionees`; the balance sheet two forms away reads
 * `Transactions` (frmBalanceSheetLevels.vb:215). The two reports are not over
 * the same rows, so neither can be checked against the other — which is why
 * the reconciliation was done on paper.
 *
 * There is no opening balance, because there were no fiscal periods to open
 * one from. And the window excludes anything stamped at midnight and the last
 * second of the closing day.
 *
 * ## What this is
 *
 * Opening, movement and closing, each as a debit and a credit column, for
 * every level of the chart the reader asks for. And the property that makes it
 * worth signing: **it says whether it balances**. If total debits ever differ
 * from total credits, something has written to the ledger outside the posting
 * engine, and that is the loudest thing on the page rather than a discrepancy
 * for the reader to notice by adding up two columns themselves.
 */
export default async function TrialBalancePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'reports/trial-balance');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('reports.trialBalance');
  const sp = await searchParams;
  const req = parseReportRequest(sp, 'trial-balance');

  // A cashier holding `report.financial` but not `voucher.read` gets the
  // report without the cost-centre filter rather than an error. The filter is
  // a convenience; the report is the point.
  const centres = principal.permissions.has('voucher.read')
    ? await costCenterOptions(principal)
    : [];

  const result = await runReport(principal, { ...req, kind: 'trial-balance' });

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        <FilterBar kind="trial-balance">
          <WindowFields req={req} />
          <CostCentreField req={req} options={centres} />
          <LevelField req={req} max={5} />
        </FilterBar>
      </Panel>

      <Panel
        title={`${req.from} → ${req.to}`}
        actions={<ExportBar request={result.request} locale={locale} />}
      >
        <ReportTable doc={result.document} locale={locale} />
        <ReportNotes doc={result.document} locale={locale} alert={result.alert} />
      </Panel>
    </div>
  );
}
