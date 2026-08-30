import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { costCenterOptions } from '@/lib/console/finance';
import {
  academicCalendar,
  admissionCategoryOptions,
  batchOptions,
  departmentOptions,
  facultyOptions,
  nationalityOptions,
  programmeRows,
} from '@/lib/console/backoffice';
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
import { AddStructure, OpenYear, TermStatus, Withdraw } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academic.structure');
  return { title: t('title') };
}

const TABS = [
  'faculties',
  'departments',
  'programmes',
  'batches',
  'categories',
  'nationalities',
  'years',
] as const;

type Tab = (typeof TABS)[number];

/** Which `deactivate` entity each tab manages. */
const ENTITY: Record<Exclude<Tab, 'years'>, string> = {
  faculties: 'faculty',
  departments: 'department',
  programmes: 'programme',
  batches: 'batch',
  categories: 'admissionCategory',
  nationalities: 'nationality',
};

/**
 * Academic structure (Track D4, SRS Module 2).
 *
 * Seven kinds of row on one screen, selected by a `?tab=` in the address so a
 * reload keeps its place and a colleague can be sent straight to the one that
 * matters. They are one screen because they are one subject and because
 * building each has to be done in order: a department needs its faculty, a
 * programme needs both, and a fee schedule downstream needs a programme, a
 * batch and an admission category to exist before it can price anything.
 *
 * There is no delete. `deactivate` is what the legacy build's
 * `Delete From AcademicYear Where Batch=N'..'` was reaching for, and the
 * database now refuses the delete once a student is admitted under the row.
 */
export default async function StructurePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'academic/structure');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('academic.structure');
  const c = await getTranslations('academic.common');
  const dl = await getTranslations('academic.degreeLevel');
  const nc = await getTranslations('academic.nationalityCategory');
  const tk = await getTranslations('academic.termKind');
  const as = await getTranslations('academic.academicStatus');

  const sp = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '')
    ? (sp.tab as Tab)
    : 'faculties';

  const mayManage = principal.permissions.has('academic.manage');

  const [faculties, departments, programmes, batches, categories, nationalities, calendar] =
    await Promise.all([
      facultyOptions(principal),
      departmentOptions(principal),
      programmeRows(principal),
      batchOptions(principal),
      admissionCategoryOptions(principal),
      nationalityOptions(principal),
      academicCalendar(principal),
    ]);

  // Only the faculty form needs them, and only somebody who may manage the
  // structure sees that form.
  const costCentres =
    mayManage && tab === 'faculties' ? await costCenterOptions(principal).catch(() => []) : [];

  const facultyName = (id: string) => {
    const f = faculties.find((x) => x.id === id);
    return f ? `${f.code} · ${pickText(locale, f.nameAr, f.nameEn)}` : '—';
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <nav className="flex flex-wrap gap-2">
        {TABS.map((k) => (
          <Link
            key={k}
            href={`/console/academic/structure?tab=${k}`}
            className={
              k === tab
                ? 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground'
                : 'rounded-md border border-border px-3 py-2 text-sm hover:bg-muted'
            }
          >
            {t(k)}
          </Link>
        ))}
      </nav>

      {tab === 'faculties' && (
        <Panel title={t('faculties')}>
          {faculties.length === 0 ? (
            <Empty>{c('nothing')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{c('code')}</Th>
                    <Th>{c('nameAr')}</Th>
                    <Th>{c('nameEn')}</Th>
                    {mayManage && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {faculties.map((f) => (
                    <tr key={f.id}>
                      <Td>
                        <span className="numeric">{f.code}</span>
                      </Td>
                      <Td>{f.nameAr}</Td>
                      <Td>{f.nameEn}</Td>
                      {mayManage && (
                        <Td>
                          <Withdraw entity={ENTITY.faculties} id={f.id} />
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      )}

      {tab === 'departments' && (
        <Panel title={t('departments')}>
          {departments.length === 0 ? (
            <Empty>{c('nothing')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{c('code')}</Th>
                    <Th>{c('nameEn')}</Th>
                    <Th>{t('faculty')}</Th>
                    {mayManage && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <Td>
                        <span className="numeric">{d.code}</span>
                      </Td>
                      <Td>{pickText(locale, d.nameAr, d.nameEn)}</Td>
                      <Td>{facultyName(d.facultyId)}</Td>
                      {mayManage && (
                        <Td>
                          <Withdraw entity={ENTITY.departments} id={d.id} />
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      )}

      {tab === 'programmes' && (
        <Panel title={t('programmes')}>
          {programmes.length === 0 ? (
            <Empty>{c('nothing')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{c('code')}</Th>
                    <Th>{c('nameEn')}</Th>
                    <Th>{t('faculty')}</Th>
                    <Th>{t('degreeLevel')}</Th>
                    <Th numeric>{t('durationYears')}</Th>
                    <Th numeric>{t('durationTerms')}</Th>
                    <Th>{c('status')}</Th>
                    {mayManage && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {programmes.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        <span className="numeric">{p.code}</span>
                      </Td>
                      <Td>{pickText(locale, p.nameAr, p.nameEn)}</Td>
                      <Td>{facultyName(p.facultyId)}</Td>
                      <Td>{dl(p.degreeLevel)}</Td>
                      <Td numeric>
                        <span className="numeric">{p.durationYears}</span>
                      </Td>
                      <Td numeric>
                        <span className="numeric">{p.durationTerms}</span>
                      </Td>
                      <Td>
                        <Pill tone={p.isActive ? 'good' : 'neutral'}>
                          {p.isActive ? c('active') : c('inactive')}
                        </Pill>
                      </Td>
                      {mayManage && (
                        <Td>{p.isActive && <Withdraw entity={ENTITY.programmes} id={p.id} />}</Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      )}

      {tab === 'batches' && (
        <Panel title={t('batches')}>
          {batches.length === 0 ? (
            <Empty>{c('nothing')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{c('code')}</Th>
                    <Th>{c('nameEn')}</Th>
                    <Th numeric>{t('admissionYear')}</Th>
                    {mayManage && <Th />}
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <Td>
                        <span className="numeric">{b.code}</span>
                      </Td>
                      <Td>{pickText(locale, b.nameAr, b.nameEn)}</Td>
                      <Td numeric>
                        <span className="numeric">{b.admissionYear}</span>
                      </Td>
                      {mayManage && (
                        <Td>
                          <Withdraw entity={ENTITY.batches} id={b.id} />
                        </Td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      )}

      {tab === 'categories' && (
        <Panel title={t('categories')}>
          {categories.length === 0 ? (
            <Empty>{c('nothing')}</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {categories.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-4 py-3">
                  <span className="numeric text-sm text-muted-foreground">{a.code}</span>
                  <span className="flex-1">{pickText(locale, a.nameAr, a.nameEn)}</span>
                  {mayManage && <Withdraw entity={ENTITY.categories} id={a.id} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'nationalities' && (
        <Panel title={t('nationalities')}>
          {nationalities.length === 0 ? (
            <Empty>{c('nothing')}</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {nationalities.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-4 py-3">
                  <span className="numeric text-sm text-muted-foreground">{n.code}</span>
                  <span className="flex-1">{pickText(locale, n.nameAr, n.nameEn)}</span>
                  <Pill>{nc(n.category)}</Pill>
                  {mayManage && <Withdraw entity={ENTITY.nationalities} id={n.id} />}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'years' && (
        <>
          <Panel title={t('years')}>
            {calendar.length === 0 ? (
              <Empty>{c('nothing')}</Empty>
            ) : (
              <ul className="space-y-5">
                {calendar.map((y) => (
                  <li key={y.id} className="rounded-md border border-border p-4">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <span className="numeric font-medium">{y.code}</span>
                      <span>{pickText(locale, y.nameAr, y.nameEn)}</span>
                      <span className="numeric text-xs text-muted-foreground">
                        {y.startDate} → {y.endDate}
                      </span>
                      <Pill tone={y.status === 'ACTIVE' ? 'good' : 'neutral'}>
                        {as(y.status)}
                      </Pill>
                    </div>
                    <ul className="mt-3 space-y-3">
                      {y.terms.map((term) => (
                        <li
                          key={term.id}
                          className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-3 text-sm"
                        >
                          <span className="numeric text-muted-foreground">{term.seq}</span>
                          <span>{tk(term.kind)}</span>
                          <span className="flex-1">
                            {pickText(locale, term.nameAr, term.nameEn)}
                          </span>
                          <span className="numeric text-xs text-muted-foreground">
                            {term.startDate} → {term.endDate}
                          </span>
                          {term.registrationClosesOn && (
                            <span className="text-xs text-muted-foreground">
                              {t('registrationCloses')}{' '}
                              <span className="numeric">{term.registrationClosesOn}</span>
                            </span>
                          )}
                          <Pill tone={term.status === 'ACTIVE' ? 'good' : 'neutral'}>
                            {as(term.status)}
                          </Pill>
                          {mayManage && (
                            <TermStatus academicTermId={term.id} status={term.status} />
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {mayManage && (
            <Panel title={t('openYear')}>
              <OpenYear />
            </Panel>
          )}
        </>
      )}

      {mayManage && tab !== 'years' && (
        <Panel title={`${c('add')} — ${t(tab)}`}>
          <AddStructure
            kind={
              tab === 'faculties'
                ? 'faculty'
                : tab === 'departments'
                  ? 'department'
                  : tab === 'programmes'
                    ? 'programme'
                    : tab === 'batches'
                      ? 'batch'
                      : tab === 'categories'
                        ? 'category'
                        : 'nationality'
            }
            faculties={faculties}
            departments={departments}
            costCentres={costCentres}
            locale={locale}
          />
        </Panel>
      )}

      <p className="text-xs text-muted-foreground">{t('neverDeleted')}</p>
    </div>
  );
}
