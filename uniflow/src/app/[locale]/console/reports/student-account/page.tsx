import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { parseReportRequest, runReport } from '@/lib/console/reports';
import { studentHeader } from '@/lib/console/lookups';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { ExportBar, ReportNotes, ReportTable } from '@/components/console/report-view';
import { StudentPicker } from '@/components/console/student-picker';
import { StudentStrip } from '@/components/console/student-strip';
import { Empty, PageHeader, Panel } from '@/components/console/ui';
import { FilterBar, WindowFields } from '../filters';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('reports.studentAccount');
  return { title: t('title') };
}

/**
 * A student's statement of account (Track D5, SRS REQ-RPT-01).
 *
 * The document handed across the counter when a student disputes what they
 * owe, which is why three things about it are not negotiable:
 *
 *   · **The opening balance is a real figure carried in from before the
 *     range.** Not zero, and not "everything since the beginning" quietly
 *     relabelled. It is printed as its own row so a reader can see where the
 *     running balance started rather than taking it on trust.
 *   · **Cancelled and dishonoured receipts appear as reversals, not
 *     deletions.** A receipt that was taken and then bounced is two lines,
 *     because it was two events, and a statement showing one is a statement
 *     the student can disprove by producing their copy.
 *   · **Sponsored portions are absent.** That debt is the sponsor's. Billing
 *     the student in full and chasing the ministry by telephone is what the
 *     legacy build did, and it is why students were shown demands for money
 *     they did not owe.
 *
 * ## Two permissions, deliberately separate
 *
 * `report.student` reads one statement. `student.read` searches the roll.
 * A finance clerk holding the first and not the second can produce a statement
 * for a student whose number they have been given, and cannot browse the
 * directory to find one — so the picker and the identity strip are absent for
 * them rather than the report being refused.
 */
export default async function StudentAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'reports/student-account');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('reports.studentAccount');
  const sp = await searchParams;
  const req = {
    ...parseReportRequest(sp, 'student-account'),
    kind: 'student-account' as const,
  };
  const q = typeof sp.q === 'string' ? sp.q : '';
  const mayBrowse = principal.permissions.has('student.read');

  // The picker carries the window on, so choosing a student does not silently
  // reset the range the user just set.
  const basePath = `/console/reports/student-account?from=${req.from}&to=${req.to}`;

  if (!req.studentId) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        {mayBrowse && (
          <StudentPicker principal={principal} locale={locale} query={q} basePath={basePath} />
        )}
        <Panel>
          <Empty>{mayBrowse ? t('chooseStudent') : t('noDirectory')}</Empty>
        </Panel>
      </div>
    );
  }

  const header = mayBrowse ? await studentHeader(principal, req.studentId) : null;
  const result = await runReport(principal, req);

  return (
    <div className="space-y-6">
      <div className="no-print">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
      </div>

      {header && (
        <StudentStrip
          header={header}
          locale={locale}
          href={`/console/registry/students/${header.id}`}
        />
      )}

      <Panel>
        <FilterBar kind="student-account">
          <input type="hidden" name="student" value={req.studentId} />
          <WindowFields req={req} />
        </FilterBar>
      </Panel>

      <Panel
        title={`${req.from} → ${req.to}`}
        actions={<ExportBar request={result.request} locale={locale} />}
      >
        <ReportTable doc={result.document} locale={locale} />
        <ReportNotes doc={result.document} locale={locale} alert={result.alert} />
      </Panel>

      {mayBrowse && (
        <div className="no-print">
          <StudentPicker principal={principal} locale={locale} query={q} basePath={basePath} />
        </div>
      )}
    </div>
  );
}
