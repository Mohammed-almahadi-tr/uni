import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { accountSearch, costCenterOptions } from '@/lib/console/finance';
import { budgetPositions, fiscalCalendar } from '@/lib/console/backoffice';
import { listBudgets } from '@/lib/budget/budget';
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
import { BudgetActions, DraftBudget } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('procurement.budgets');
  return { title: t('title') };
}

/**
 * Budgets and their live position (Track D4, SRS REQ-BUD-01/02).
 *
 * Four columns per line: allocated, **committed**, spent, remaining. The
 * second is the one the legacy build could not produce — it had no purchase
 * order, so nothing reserved money, and a budget report showed only what had
 * already been paid. A manager reading that sees room that is in fact already
 * promised to a supplier.
 */
export default async function BudgetsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ year?: string; budget?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'procurement/budgets');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.budgets');
  const c = await getTranslations('procurement.common');
  const sp = await searchParams;

  const mayRead = principal.permissions.has('budget.read');
  const mayManage = principal.permissions.has('budget.manage');
  const mayApprove = principal.permissions.has('budget.approve');

  if (!mayRead) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      </div>
    );
  }

  const currency = await tenantCurrency(principal);
  const years = principal.permissions.has('period.read')
    ? await fiscalCalendar(principal)
    : [];
  const yearId = sp.year ?? years[0]?.id ?? '';

  const budgets = yearId ? await listBudgets(principal, yearId) : [];
  const budgetId = sp.budget ?? budgets.find((b) => b.status === 'APPROVED')?.budgetId ?? '';
  const positions = budgetId ? await budgetPositions(principal, budgetId) : [];

  const [accounts, costCentres] = await Promise.all([
    mayManage && principal.permissions.has('voucher.read')
      ? accountSearch(principal, '', 200)
      : Promise.resolve([]),
    mayManage && principal.permissions.has('voucher.read')
      ? costCenterOptions(principal)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block min-w-48">
            <span className="mb-1 block text-sm font-medium">{t('fiscalYear')}</span>
            <select
              name="year"
              defaultValue={yearId}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {years.map((y) => (
                <option key={y.id} value={y.id}>
                  {y.name}
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

        {budgets.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">{t('noBudgets')}</p>
        ) : (
          <ul className="mt-5 divide-y divide-border">
            {budgets.map((b) => (
              <li key={b.budgetId} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="numeric text-sm text-muted-foreground">
                    v{b.versionNo}
                  </span>
                  <a
                    href={`?year=${yearId}&budget=${b.budgetId}`}
                    className="min-w-40 flex-1 hover:underline"
                  >
                    {b.label}
                  </a>
                  <span className="numeric text-xs text-muted-foreground">
                    {b.lineCount}
                  </span>
                  <Money amount={b.total} currency={currency} />
                  <Pill
                    tone={
                      b.status === 'APPROVED'
                        ? 'good'
                        : b.status === 'REJECTED'
                          ? 'bad'
                          : 'warn'
                    }
                  >
                    {b.status}
                  </Pill>
                  <BudgetActions
                    budgetId={b.budgetId}
                    status={b.status}
                    mayManage={mayManage}
                    mayApprove={mayApprove}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {budgetId && (
        <Panel title={t('budgetLine')}>
          {positions.length === 0 ? (
            <Empty>{t('noLines')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{c('account')}</Th>
                    <Th>{c('costCentre')}</Th>
                    <Th numeric>{t('allocated')}</Th>
                    <Th numeric>{t('committed')}</Th>
                    <Th numeric>{t('spent')}</Th>
                    <Th numeric>{t('remaining')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map((p) => (
                    <tr key={p.budgetLineId}>
                      <Td>
                        <span className="numeric text-muted-foreground">{p.accountCode}</span>{' '}
                        {pickText(locale, p.accountNameAr, p.accountNameEn)}
                      </Td>
                      <Td>
                        <span className="numeric">{p.costCentreCode ?? '—'}</span>
                      </Td>
                      <Td numeric>
                        <Money amount={p.allocated} currency={currency} />
                      </Td>
                      <Td numeric>
                        <Money amount={p.encumbered} currency={currency} />
                      </Td>
                      <Td numeric>
                        <Money amount={p.actual} currency={currency} />
                      </Td>
                      <Td numeric>
                        {Number(p.available) < 0 ? (
                          <Pill tone="bad">
                            <Money amount={p.available} currency={currency} />
                          </Pill>
                        ) : (
                          <Money amount={p.available} currency={currency} />
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
          <p className="mt-4 text-xs text-muted-foreground">{t('encumbranceHint')}</p>
        </Panel>
      )}

      {mayManage && years.length > 0 && (
        <Panel title={t('draft')}>
          <DraftBudget
            years={years.map((y) => ({ id: y.id, name: y.name }))}
            accounts={accounts}
            costCentres={costCentres}
            locale={locale}
          />
        </Panel>
      )}
    </div>
  );
}
