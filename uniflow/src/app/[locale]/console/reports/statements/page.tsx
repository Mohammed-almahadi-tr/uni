import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { costCenterOptions } from '@/lib/console/finance';
import { parseReportRequest, runReport } from '@/lib/console/reports';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { ExportBar, ReportNotes, ReportTable } from '@/components/console/report-view';
import { PageHeader, Panel } from '@/components/console/ui';
import {
  AsOfField,
  CostCentreField,
  FilterBar,
  LevelField,
  ReportTabs,
  WindowFields,
} from '../filters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reports.statements');
  return { title: t('title') };
}

/**
 * Balance sheet and income statement (Track D5, SRS REQ-RPT-04 / REQ-RPT-05).
 *
 * Two reports on one screen because they are read together — a surplus on the
 * income statement and the equity it lands in on the balance sheet are the
 * same fact from two sides — and because they are the same walk over the same
 * chart with the same figures from `balances.ts`.
 *
 * ## The comparative
 *
 * The income statement offers **the same window a year earlier**, not the
 * previous quarter. Enrolment is seasonal: a university's October is not
 * comparable to its July, and a management report that put them side by side
 * would show a catastrophe every summer. Last October is the comparison
 * somebody actually wants.
 *
 * ## The two ledgers, seen side by side
 *
 * The legacy balance sheet:
 *
 * ```vb
 * "Select Acc1,Acc2,Acc3,Acc4,Sum(TotalValueIn)-Sum(TotalValueout) TotalValueout, ...
 *  From Transactions Where Transdate < N'" & DateTimePicker1.Value.ToShortDateString & " 23:59:59' ..."
 * ```
 * (frmBalanceSheetLevels.vb:214-218)
 *
 * — reads **`Transactions`**. Its trial balance (frmTrialBalance.vb:167) reads
 * **`Transactionees`**. Two report screens in one application, over two
 * separate tables with two amount-column pairs, written by different screens.
 * The balance sheet and the trial balance were never describing the same
 * ledger, which is why they could not be reconciled to each other and why the
 * reconciliation was done on paper.
 *
 * There was also no equity treatment and no fiscal periods, so there was no
 * such thing as a result for a year. Here the unappropriated result is a
 * figure in its own right, and `spansPriorYears` says when it covers more than
 * the current year because a prior year was never closed — a surplus quietly
 * containing two years of trading is worse than no surplus.
 */
export default async function StatementsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'reports/statements');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('reports.statements');
  const sp = await searchParams;
  const parsed = parseReportRequest(sp, 'balance-sheet');
  const kind = parsed.kind === 'income-statement' ? 'income-statement' : 'balance-sheet';
  const req = { ...parsed, kind } as const;

  const centres = principal.permissions.has('voucher.read')
    ? await costCenterOptions(principal)
    : [];

  const result = await runReport(principal, req);

  // Query-only hrefs. A tab points at the screen it is already on, so an
  // absolute `/console/...` would only add a way to lose the locale prefix —
  // `localePrefix: 'always'` redirects an unprefixed path to Arabic whatever
  // the reader was using.
  const base = '?kind=';

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <ReportTabs
        active={kind}
        tabs={[
          {
            key: 'balance-sheet',
            label: t('balanceSheet'),
            href: `${base}balance-sheet&asOf=${req.asOf}`,
          },
          {
            key: 'income-statement',
            label: t('incomeStatement'),
            href: `${base}income-statement&from=${req.from}&to=${req.to}`,
          },
        ]}
      />

      <Panel>
        <FilterBar kind={kind}>
          {kind === 'balance-sheet' ? (
            <AsOfField req={req} />
          ) : (
            <>
              <WindowFields req={req} />
              <label className="flex h-11 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="comparative"
                  value="1"
                  defaultChecked={req.comparative}
                  className="size-4"
                />
                {t('comparative')}
              </label>
            </>
          )}
          <CostCentreField req={req} options={centres} />
          <LevelField req={req} max={4} />
        </FilterBar>
      </Panel>

      <Panel
        title={kind === 'balance-sheet' ? req.asOf : `${req.from} → ${req.to}`}
        actions={<ExportBar request={result.request} locale={locale} />}
      >
        <ReportTable doc={result.document} locale={locale} />
        <ReportNotes doc={result.document} locale={locale} alert={result.alert} />
      </Panel>
    </div>
  );
}
