import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { NationalityCategory } from '@/generated/prisma/enums';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import {
  admissionCategoryOptions,
  batchOptions,
  feeCatalogue,
  feeScheduleLines,
  programmeRows,
  type ScheduleLineRow,
} from '@/lib/console/backoffice';
import { feeScheduleHistory } from '@/lib/academic/fee-matrix';
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
import { Money } from '@/components/ui/money';
import { ApproveSchedule, ScheduleEditor, VersionDiff } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academic.feeMatrix');
  return { title: t('title') };
}

const NATIONALITIES = ['', 'NATIONAL', 'ARAB', 'FOREIGN'] as const;

/**
 * The fee matrix (Track D4, SRS REQ-FEE-01).
 *
 * A cohort is four dimensions — programme, batch, admission category and an
 * optional nationality rule — and this screen is the only place a human sees
 * all four at once. Choosing them is a GET form, so a priced cohort is a URL
 * that can be sent to whoever has to approve it.
 *
 * The versions are listed newest first with the **superseded ones kept**,
 * because the question this list exists to answer is almost always "what
 * changed, and when". The legacy screen answered it by deleting the rows it
 * replaced.
 */
export default async function FeeMatrixPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    programme?: string;
    batch?: string;
    category?: string;
    nationality?: string;
    revise?: string;
  }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'academic/fees');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('academic.feeMatrix');
  const c = await getTranslations('academic.common');
  const ss = await getTranslations('academic.scheduleStatus');
  const nc = await getTranslations('academic.nationalityCategory');
  const sp = await searchParams;

  const [currency, programmes, batches, categories, catalogue] = await Promise.all([
    tenantCurrency(principal),
    programmeRows(principal, 'feematrix.read'),
    batchOptions(principal, 'feematrix.read'),
    admissionCategoryOptions(principal, 'feematrix.read'),
    feeCatalogue(principal),
  ]);

  const active = programmes.filter((p) => p.isActive);
  const mayManage = principal.permissions.has('feematrix.manage');
  const mayApprove = principal.permissions.has('feematrix.approve');

  const chosen =
    sp.programme && sp.batch && sp.category
      ? {
          programmeId: sp.programme,
          batchId: sp.batch,
          admissionCategoryId: sp.category,
          nationalityCategory: (sp.nationality || null) as NationalityCategory | null,
        }
      : null;

  const history = chosen ? await feeScheduleHistory(principal, chosen) : [];

  // Lines for the version being revised, plus the one before it, so the diff
  // has both sides. Two reads rather than every version's lines: the list can
  // be long and only one comparison is on screen.
  const reviseId = sp.revise;
  const reviseIndex = reviseId ? history.findIndex((h) => h.id === reviseId) : -1;
  const target = reviseIndex >= 0 ? history[reviseIndex] : null;
  const older = reviseIndex >= 0 ? history[reviseIndex + 1] : undefined;

  let targetLines: ScheduleLineRow[] = [];
  let olderLines: ScheduleLineRow[] = [];
  if (target) {
    targetLines = await feeScheduleLines(principal, target.id);
    if (older) olderLines = await feeScheduleLines(principal, older.id);
  }

  const selector = (
    <Panel title={t('cohort')}>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block min-w-56 flex-1">
          <span className="mb-1 block text-sm font-medium">{t('programme')}</span>
          <select
            name="programme"
            defaultValue={sp.programme ?? ''}
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              —
            </option>
            {active.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {pickText(locale, p.nameAr, p.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-40">
          <span className="mb-1 block text-sm font-medium">{t('batch')}</span>
          <select
            name="batch"
            defaultValue={sp.batch ?? ''}
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              —
            </option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-40">
          <span className="mb-1 block text-sm font-medium">{t('admissionCategory')}</span>
          <select
            name="category"
            defaultValue={sp.category ?? ''}
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              —
            </option>
            {categories.map((a) => (
              <option key={a.id} value={a.id}>
                {pickText(locale, a.nameAr, a.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-40">
          <span className="mb-1 block text-sm font-medium">{t('nationality')}</span>
          <select
            name="nationality"
            defaultValue={sp.nationality ?? ''}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {NATIONALITIES.map((n) => (
              <option key={n || 'any'} value={n}>
                {n ? nc(n) : t('anyNationality')}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('show')}
        </button>
      </form>
    </Panel>
  );

  if (!chosen) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        {selector}
        <Panel>
          <Empty>{t('chooseCohort')}</Empty>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {selector}

      <Panel title={t('history')}>
        {history.length === 0 ? (
          <Empty>{t('noHistory')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('version')}</Th>
                  <Th>{c('status')}</Th>
                  <Th>{t('effective')}</Th>
                  <Th numeric>{t('lines')}</Th>
                  <Th numeric>{c('total')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id}>
                    <Td>
                      <span className="numeric">{h.versionNo}</span>
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          h.status === 'APPROVED'
                            ? 'good'
                            : h.status === 'DRAFT'
                              ? 'warn'
                              : 'neutral'
                        }
                      >
                        {ss(h.status)}
                      </Pill>
                    </Td>
                    <Td>
                      <span className="numeric">{h.effectiveFrom}</span>
                      {' → '}
                      <span className="numeric">{h.effectiveTo ?? t('open')}</span>
                    </Td>
                    <Td numeric>
                      <span className="numeric">{h.lineCount}</span>
                    </Td>
                    <Td numeric>
                      <Money amount={h.total} currency={h.currency} />
                    </Td>
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        {mayManage && (
                          <a
                            href={`?programme=${sp.programme}&batch=${sp.batch}&category=${sp.category}&nationality=${sp.nationality ?? ''}&revise=${h.id}`}
                            className="text-sm underline"
                          >
                            {t('revise')}
                          </a>
                        )}
                        {mayApprove && h.status === 'DRAFT' && (
                          <ApproveSchedule feeScheduleId={h.id} />
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
        {!mayApprove && mayManage && (
          <p className="mt-4 text-xs text-muted-foreground">{t('notApprover')}</p>
        )}
      </Panel>

      {target && older && (
        <Panel title={t('compare')}>
          <VersionDiff
            previous={olderLines}
            current={targetLines}
            currency={currency}
            locale={locale}
          />
        </Panel>
      )}

      {mayManage && (
        <Panel title={target ? t('revise') : t('newVersion')}>
          <ScheduleEditor
            cohort={{
              programmeId: chosen.programmeId,
              batchId: chosen.batchId,
              admissionCategoryId: chosen.admissionCategoryId,
              nationalityCategory: chosen.nationalityCategory ?? '',
            }}
            catalogue={catalogue}
            existing={targetLines}
            sourceScheduleId={target?.id}
            sourceVersionNo={target?.versionNo}
            currency={currency}
            locale={locale}
          />
        </Panel>
      )}
    </div>
  );
}
