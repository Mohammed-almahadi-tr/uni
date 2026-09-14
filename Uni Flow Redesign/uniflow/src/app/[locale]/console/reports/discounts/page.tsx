import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { academicYearOptions, batchOptions, facultyOptions } from '@/lib/console/backoffice';
import { parseReportRequest, runReport } from '@/lib/console/reports';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import { ExportBar, ReportNotes, ReportTable } from '@/components/console/report-view';
import { PageHeader, Panel } from '@/components/console/ui';
import { FilterBar } from '../filters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reports.discounts');
  return { title: t('title') };
}

const DIMENSIONS = ['faculty', 'programme', 'batch', 'scheme', 'academicYear'] as const;

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * What the institution gave away (Track D5, SRS REQ-SPN-04).
 *
 * ## What the legacy discount report was
 *
 * ```vb
 * "SELECT [StudName],[College],[Batch],[AcdYear] ,[TuitionFees] " & _
 * ",[payPerc],[MainFees] ,[discount],[DiscDescr] FROM [RebatUniv].[dbo].[viewDiscount]" & _
 * "where College=N'" & Me.CombCollege.SelectedItem & "' and AcdYear=N'" & ...
 * ```
 * (frmRptDisc.vb:48-52)
 *
 * `viewDiscount` is a **database view** that derives each student's discount
 * from a stored percentage against a fee figure. Three things follow.
 *
 * The discount is never posted, so it appears in no expense account and on no
 * financial statement: the institution's own books do not record what it gave
 * away. It is recomputed on every read from figures that may since have
 * changed, so last year's report is not reproducible. And it is per student
 * per year with no dimension but college — "what did this scholarship scheme
 * cost us" had no answer, because a scheme was a description string
 * (`DiscDescr`) rather than a thing with a budget.
 *
 * The database name is also in the SQL: `[RebatUniv].[dbo].`. The report
 * cannot run against a second institution without editing it.
 *
 * Here a discount is **a posted line in its own expense account** on each
 * registration, and this report sums those lines. Cancelled registrations are
 * excluded, because a discount on a term that was reversed cost the
 * institution nothing.
 *
 * ## Five dimensions, one of which has a budget
 *
 * By faculty, programme, batch, scheme or academic year. Only the scheme cut
 * carries a budget cap column, because a scheme is the only one of the five a
 * cap exists against — printing an empty column on the other four would invite
 * the reading that a faculty has a discount budget, which it does not.
 */
export default async function DiscountsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'reports/discounts');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('reports.discounts');
  const sp = await searchParams;
  const req = { ...parseReportRequest(sp, 'discounts'), kind: 'discounts' as const };

  // Gated on this screen's own permission rather than on `academic.read`: a
  // financial controller cutting the exposure report by faculty has no
  // business in the academic structure and should not need to be given it.
  const [faculties, batches, years] = await Promise.all([
    facultyOptions(principal, 'report.financial'),
    batchOptions(principal, 'report.financial'),
    academicYearOptions(principal, 'report.financial'),
  ]);

  const result = await runReport(principal, req);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        <FilterBar kind="discounts">
          <label className="block min-w-40">
            <span className="mb-1 block text-sm font-medium">{t('dimension')}</span>
            <select name="dimension" defaultValue={req.dimension} className={field}>
              {DIMENSIONS.map((d) => (
                <option key={d} value={d}>
                  {t(`by.${d}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-40">
            <span className="mb-1 block text-sm font-medium">{t('academicYear')}</span>
            <select name="year" defaultValue={req.academicYearId ?? ''} className={field}>
              <option value="">{t('allYears')}</option>
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.code}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-40">
            <span className="mb-1 block text-sm font-medium">{t('faculty')}</span>
            <select name="faculty" defaultValue={req.facultyId ?? ''} className={field}>
              <option value="">{t('allFaculties')}</option>
              {faculties.map((f) => (
                <option key={f.id} value={f.id}>
                  {pickText(locale, f.nameAr, f.nameEn)}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-40">
            <span className="mb-1 block text-sm font-medium">{t('batch')}</span>
            <select name="batch" defaultValue={req.batchId ?? ''} className={field}>
              <option value="">{t('allBatches')}</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code}
                </option>
              ))}
            </select>
          </label>
        </FilterBar>
      </Panel>

      <Panel
        title={t(`by.${req.dimension}`)}
        actions={<ExportBar request={result.request} locale={locale} />}
      >
        <ReportTable doc={result.document} locale={locale} />
        <ReportNotes doc={result.document} locale={locale} alert={result.alert} />
      </Panel>
    </div>
  );
}
