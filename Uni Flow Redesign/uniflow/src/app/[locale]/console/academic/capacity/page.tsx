import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import {
  admissionCategoryOptions,
  batchOptions,
  programmeRows,
} from '@/lib/console/backoffice';
import { capacityForBatch } from '@/lib/admissions/quota';
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
import { SetQuota } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academic.capacity');
  return { title: t('title') };
}

/**
 * Seat capacity (Track D4, SRS REQ-ADM-06).
 *
 * The screen the legacy build never had. There was no capacity concept: offers
 * went out until somebody counted, and the counting was done in a spreadsheet
 * after the fact.
 *
 * Note what **available** subtracts — reserved seats *and* seats held by
 * offers nobody has answered. An unanswered offer is not a free seat, and
 * treating it as one is how a programme is over-subscribed on the morning the
 * deadline passes.
 */
export default async function CapacityPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ batch?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'academic/capacity');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('academic.capacity');
  const c = await getTranslations('academic.common');
  const sp = await searchParams;

  const [batches, programmes, categories] = await Promise.all([
    batchOptions(principal, 'admission.capacity'),
    programmeRows(principal, 'admission.capacity'),
    admissionCategoryOptions(principal, 'admission.capacity'),
  ]);

  const batchId = sp.batch ?? batches[0]?.id ?? '';

  // `capacityForBatch` reads on `application.read`, which somebody holding
  // only `admission.capacity` does not have — a dean setting quotas is not
  // necessarily allowed to read applications. Show the quota table when they
  // may, and the form regardless.
  const mayReadApplications = principal.permissions.has('application.read');
  const positions =
    batchId && mayReadApplications ? await capacityForBatch(principal, batchId) : [];

  const active = programmes.filter((p) => p.isActive);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block min-w-48">
            <span className="mb-1 block text-sm font-medium">{t('batch')}</span>
            <select
              name="batch"
              defaultValue={batchId}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} · {pickText(locale, b.nameAr, b.nameEn)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {c('search')}
          </button>
        </form>
      </Panel>

      {mayReadApplications && (
        <Panel>
          {positions.length === 0 ? (
            <Empty>{t('noQuotas')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('programme')}</Th>
                    <Th numeric>{t('seats')}</Th>
                    <Th numeric>{t('reserved')}</Th>
                    <Th numeric>{t('offered')}</Th>
                    <Th numeric>{t('accepted')}</Th>
                    <Th numeric>{t('held')}</Th>
                    <Th numeric>{t('available')}</Th>
                    <Th numeric>{t('overrides')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.seatQuotaId}>
                      <Td>
                        <span className="numeric text-muted-foreground">
                          {p.programmeCode}
                        </span>{' '}
                        {pickText(locale, p.programmeNameAr, p.programmeNameEn)}
                      </Td>
                      <Td numeric>
                        <span className="numeric">{p.seats}</span>
                      </Td>
                      <Td numeric>
                        <span className="numeric">{p.reservedSeats}</span>
                      </Td>
                      <Td numeric>
                        <span className="numeric">{p.offered}</span>
                      </Td>
                      <Td numeric>
                        <span className="numeric">{p.confirmed}</span>
                      </Td>
                      <Td numeric>
                        <span className="numeric">{p.held}</span>
                      </Td>
                      <Td numeric>
                        {p.available <= 0 ? (
                          <Pill tone="bad">
                            <span className="numeric">{p.available}</span>
                          </Pill>
                        ) : (
                          <span className="numeric font-semibold">{p.available}</span>
                        )}
                      </Td>
                      <Td numeric>
                        {p.overrides > 0 ? (
                          <Pill tone="warn">
                            <span className="numeric">{p.overrides}</span>
                          </Pill>
                        ) : (
                          <span className="numeric text-muted-foreground">0</span>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
          <p className="mt-4 text-xs text-muted-foreground">{t('heldHint')}</p>
        </Panel>
      )}

      {batchId && (
        <Panel title={t('setQuota')}>
          <SetQuota
            batchId={batchId}
            programmes={active}
            categories={categories}
            locale={locale}
          />
        </Panel>
      )}
    </div>
  );
}
