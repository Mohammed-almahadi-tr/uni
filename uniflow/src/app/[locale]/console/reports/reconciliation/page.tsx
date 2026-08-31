import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { parseReportRequest, runReport } from '@/lib/console/reports';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { ExportBar, ReportNotes, ReportTable } from '@/components/console/report-view';
import { PageHeader, Panel, Pill } from '@/components/console/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reports.reconciliation');
  return { title: t('title') };
}

/**
 * Sub-ledger reconciliation (Track D5, SRS REQ-RPT-06).
 *
 * ## Why there are no filters
 *
 * Because there is exactly one question: do the control accounts agree with
 * the sub-ledgers that are supposed to explain them, **right now**. A date
 * filter would let somebody run it against a day on which it happened to
 * agree, and file that.
 *
 * All four checks run inside a single read transaction, so a variance shown
 * here is a variance that exists rather than a receipt that posted between two
 * queries. For the same reason this page runs the report **once** and reads
 * the verdict off that run rather than asking the engine a second time: two
 * calls a millisecond apart can disagree, and a page that shows a green badge
 * above a red table is worse than either answer alone.
 *
 * ## The verdict is above the table
 *
 * A non-zero variance is a **P1 data-integrity alert**, not a rounding
 * observation: two records of the same money differ and it is not yet known
 * which is wrong. A reader who has to add up a column to discover something is
 * broken has already been told too late.
 *
 * The legacy system could not compute this at all. It kept two ledger tables,
 * `Transactions` and `Transactionees`, with two amount-column pairs written by
 * different screens, so there was no single control balance for a sub-ledger
 * to be compared against — the reconciliation was a person with a calculator.
 */
export default async function ReconciliationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'reports/reconciliation');
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('reports.reconciliation');
  const sp = await searchParams;

  const result = await runReport(guard.ctx.principal, {
    ...parseReportRequest(sp, 'reconciliation'),
    kind: 'reconciliation',
  });

  const asAt =
    result.document.meta.find((m) => m.labelEn === 'As at')?.value ?? '';

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        actions={
          <Pill tone={result.alert ? 'bad' : 'good'}>
            {result.alert ? t('varianceFound') : t('allSquare')}
          </Pill>
        }
      />

      <Panel
        title={asAt ? t('asAt', { date: asAt }) : undefined}
        actions={<ExportBar request={result.request} locale={locale} />}
      >
        <ReportTable doc={result.document} locale={locale} />
        <ReportNotes doc={result.document} locale={locale} alert={result.alert} />
      </Panel>
    </div>
  );
}
