import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { orderRows } from '@/lib/console/backoffice';
import { ForbiddenScreen } from '@/components/console/text';
import { Empty, PageHeader, Panel } from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { ReceiveOrder } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('procurement.receiving');
  return { title: t('title') };
}

/**
 * Goods received (Track D4, SRS REQ-PRC-03).
 *
 * Only approved orders with something still outstanding appear. A stores
 * officer looking at this screen is holding a delivery note, and every order
 * that cannot receive anything is noise between them and the one that can.
 *
 * The role that does this holds `grn.create` and `voucher.read` and nothing
 * else, on purpose — see the note at the bottom of the screen.
 */
export default async function ReceivingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'procurement/receiving');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.receiving');
  const c = await getTranslations('procurement.common');

  // `orderRows` is gated on `po.create`, which a stores officer does not hold
  // — and should not: seeing every order is not part of confirming one
  // delivery. Read as the system for this screen would be wrong too, so the
  // list is fetched on the permission and the screen says so when it is
  // absent rather than rendering an error.
  const mayList = principal.permissions.has('po.create');
  const [currency, orders] = await Promise.all([
    tenantCurrency(principal),
    mayList ? orderRows(principal, { state: 'APPROVED' }) : Promise.resolve([]),
  ]);

  const open = orders.filter((o) =>
    o.lines.some((l) => Number(l.quantity) > Number(l.receivedQty)),
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {!mayList ? (
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      ) : open.length === 0 ? (
        <Panel>
          <Empty>{t('noOrders')}</Empty>
        </Panel>
      ) : (
        open.map((o) => (
          <Panel
            key={o.id}
            title={`${o.poNo} · ${o.vendorName}`}
            actions={<Money amount={o.totalAmount} currency={currency} />}
          >
            <ReceiveOrder order={o} />
          </Panel>
        ))
      )}

      <p className="text-xs text-muted-foreground">{t('independence')}</p>
    </div>
  );
}
