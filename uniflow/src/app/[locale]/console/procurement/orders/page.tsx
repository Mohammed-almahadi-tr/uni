import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { accountSearch, costCenterOptions } from '@/lib/console/finance';
import { orderRows, vendorOptions } from '@/lib/console/backoffice';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { DraftOrder, OrderActions } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('procurement.orders');
  return { title: t('title') };
}

/**
 * Purchase orders (Track D4, SRS REQ-PRC-02).
 *
 * Each order shows what has been **received** and **invoiced** against every
 * line, because those two figures are two of the three legs of the match and
 * the person chasing a delivery is usually the person looking at this screen.
 *
 * The legacy build had no order at all: a purchase was an invoice arriving,
 * so nothing reserved budget and a department discovered it had overspent
 * when the bills came in.
 */
export default async function OrdersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'procurement/orders');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.orders');
  const c = await getTranslations('procurement.common');

  const mayCreate = principal.permissions.has('po.create');
  const mayApprove = principal.permissions.has('po.approve');

  // `orderRows` reads on `po.create`. An approver who holds only `po.approve`
  // reaches the route, so the list is fetched only when it is readable.
  const orders = mayCreate ? await orderRows(principal) : [];
  const [currency, vendors, accounts, costCentres] = await Promise.all([
    tenantCurrency(principal),
    mayCreate ? vendorOptions(principal, 'po.create') : Promise.resolve([]),
    principal.permissions.has('voucher.read')
      ? accountSearch(principal, '', 200)
      : Promise.resolve([]),
    principal.permissions.has('voucher.read')
      ? costCenterOptions(principal)
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        {orders.length === 0 ? (
          <Empty>{t('noOrders')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {orders.map((o) => (
              <li key={o.id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="numeric font-medium">{o.poNo}</span>
                  <span className="numeric text-sm text-muted-foreground">
                    {o.vendorCode}
                  </span>
                  <span className="flex-1">{o.vendorName}</span>
                  <span className="numeric text-xs text-muted-foreground">
                    {o.orderDate}
                  </span>
                  <Money amount={o.totalAmount} currency={currency} />
                  <Pill
                    tone={
                      o.state === 'APPROVED'
                        ? 'good'
                        : o.state === 'REJECTED' || o.state === 'CANCELLED'
                          ? 'bad'
                          : 'warn'
                    }
                  >
                    {o.state}
                  </Pill>
                </div>

                <ul className="mt-2 space-y-1 text-sm">
                  {o.lines.map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-muted-foreground"
                    >
                      <span className="min-w-48 flex-1 text-foreground">{l.description}</span>
                      <span className="numeric text-xs">
                        {t('ordered')} {l.quantity}
                      </span>
                      <span className="numeric text-xs">
                        {t('receivedQty')} {l.receivedQty}
                      </span>
                      <span className="numeric text-xs">
                        {t('invoicedQty')} {l.invoicedQty}
                      </span>
                      <Money amount={l.amount} currency={currency} />
                    </li>
                  ))}
                </ul>

                <div className="mt-3">
                  <OrderActions
                    orderId={o.id}
                    state={o.state}
                    isMaker={o.createdById === principal.userId}
                    mayApprove={mayApprove}
                    currency={currency}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('makerChecker')}</p>
      </Panel>

      {mayCreate && vendors.length > 0 && (
        <Panel title={t('newOrder')}>
          <DraftOrder
            vendors={vendors}
            accounts={accounts}
            costCentres={costCentres}
            locale={locale}
          />
        </Panel>
      )}
      {mayCreate && vendors.length === 0 && (
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      )}
    </div>
  );
}
