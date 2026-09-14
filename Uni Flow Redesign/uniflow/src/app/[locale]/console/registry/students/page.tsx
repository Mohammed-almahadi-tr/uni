import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { searchDirectory } from '@/lib/students/directory';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  Empty,
  PageHeader,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';
import type { StudentStatus } from '@/generated/prisma/enums';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.students');
  return { title: t('title') };
}

const STATUSES: StudentStatus[] = [
  'APPLICANT',
  'ADMITTED',
  'ACTIVE',
  'DEFERRED',
  'SUSPENDED',
  'WITHDRAWN',
  'DISMISSED',
  'TRANSFERRED_OUT',
  'GRADUATED',
  'ALUMNUS',
];

/**
 * Student search (Track D3).
 *
 * The search runs over `students.search_key`, the normalised column B3 built:
 * Arabic diacritics stripped, alef and yaa forms folded, Latin lowercased.
 * That is why a name typed in either script finds the same student — the
 * legacy build's four separate `Like '%...%'` clauses over raw name columns
 * could not, because "أحمد" and "احمد" are different strings and both are
 * spelled both ways in the same institution's records.
 *
 * The form is a plain GET. A searched list that survives a page reload, a
 * bookmark and a link pasted to a colleague is worth more than one that
 * animates.
 */
export default async function StudentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/students');
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('registry');
  const sp = await searchParams;
  const query = (sp.q ?? '').trim();
  const status = STATUSES.includes(sp.status as StudentStatus)
    ? (sp.status as StudentStatus)
    : undefined;

  const page = await searchDirectory(
    guard.ctx.principal,
    query,
    { status, includeInactive: true },
    { take: 50 },
  );

  return (
    <div>
      <PageHeader title={t('students.title')} subtitle={t('students.subtitle')} />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block min-w-64 flex-1">
          <span className="mb-1 block text-sm font-medium">{t('students.query')}</span>
          <input
            name="q"
            defaultValue={query}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {t('students.queryHint')}
          </span>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('students.statusFilter')}</span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('common.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`status.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('common.search')}
        </button>
      </form>

      <Panel title={t('students.found', { count: page.total })}>
        {page.rows.length === 0 ? (
          <Empty>{t('students.found', { count: 0 })}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('students.studentNo')}</Th>
                  <Th>{t('students.name')}</Th>
                  <Th>{t('students.nationalId')}</Th>
                  <Th>{t('students.statusFilter')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {page.rows.map((s) => (
                  <tr key={s.id}>
                    <Td className="numeric">{s.studentNo}</Td>
                    <Td>
                      <span className="block">{pickText(locale, s.fullNameAr, s.fullNameEn)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {pickText(locale, s.fullNameEn, s.fullNameAr)}
                      </span>
                    </Td>
                    <Td className="numeric">{s.nationalId ?? '—'}</Td>
                    <Td>
                      <Pill tone={s.status === 'ACTIVE' ? 'good' : 'neutral'}>
                        {t(`status.${s.status}`)}
                      </Pill>
                    </Td>
                    <Td>
                      <Link
                        href={`/console/registry/students/${s.id}`}
                        className="text-sm underline"
                      >
                        {t('students.open')}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
