import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { accountSearch, costCenterOptions } from '@/lib/console/finance';
import { invoiceRows, orderRows, vendorOptions } from '@/lib/console/backoffice';
import { apAging } from '@/lib/procurement/invoices';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { HeldDecision, RecordInvoice } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('procurement.invoices');
  return { title: t('title') };
}

/**
 * Supplier invoices (Track D4, SRS REQ-PRC-04).
 *
 * Held invoices are listed first, with what did not match. That is the queue
 * somebody is actually working; everything else is history until a supplier
 * telephones about it.
 */
export default async function InvoicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'procurement/invoices');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.invoices');
  const c = await getTranslations('procurement.common');

  const mayRecord = principal.permissions.has('apinvoice.record');
  const mayApprove = principal.permissions.has('apinvoice.approve');

  const [currency, invoices, vendors, orders, accounts, costCentres] = await Promise.all([
    tenantCurrency(principal),
    mayRecord ? invoiceRows(principal) : Promise.resolve([]),
    mayRecord ? vendorOptions(principal, 'apinvoice.record') : Promise.resolve([]),
    principal.permissions.has('po.create')
      ? orderRows(principal, { state: 'APPROVED' })
      : Promise.resolve([]),
    principal.permissions.has('voucher.read')
      ? accountSearch(principal, '', 200)
      : Promise.resolve([]),
    principal.permissions.has('voucher.read')
      ? costCenterOptions(principal)
      : Promise.resolve([]),
  ]);

  const aging = principal.permissions.has('report.financial')
    ? await apAging(principal)
    : null;

  const held = invoices.filter((i) => i.state === 'HELD');
  const rest = invoices.filter((i) => i.state !== 'HELD');

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel title={t('held')}>
        {held.length === 0 ? (
          <Empty>{c('nothing')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {held.map((i) => (
              <li key={i.id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="numeric font-medium">{i.internalNo}</span>
                  <span className="numeric text-sm text-muted-foreground">
                    {i.vendorInvoiceNo}
                  </span>
                  <span className="flex-1">{i.vendorName}</span>
                  <Money amount={i.totalAmount} currency={currency} />
                  <Pill tone="warn">{i.state}</Pill>
                </div>
                {i.holdReason && (
                  <p className="mt-1 text-sm text-muted-foreground">{i.holdReason}</p>
                )}
                {mayApprove && (
                  <div className="mt-3">
                    <HeldDecision invoiceId={i.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('threeWay')}</p>
      </Panel>

      <Panel>
        {rest.length === 0 ? (
          <Empty>{t('noInvoices')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {rest.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-4 py-3">
                <span className="numeric text-sm">{i.internalNo}</span>
                <span className="numeric text-xs text-muted-foreground">
                  {i.vendorInvoiceNo}
                </span>
                <span className="min-w-40 flex-1">{i.vendorName}</span>
                <span className="numeric text-xs text-muted-foreground">{i.dueDate}</span>
                <Money amount={i.totalAmount} currency={currency} />
                <Pill tone={i.state === 'PAID' ? 'good' : 'neutral'}>{i.state}</Pill>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {aging && (
        <Panel title={t('aging')}>
          {aging.length === 0 ? (
            <Empty>{t('noAging')}</Empty>
          ) : (
            <ul className="space-y-1 text-sm">
              {aging.map((r) => (
                <li key={r.vendorCode} className="flex flex-wrap items-baseline gap-3">
                  <span className="numeric text-muted-foreground">{r.vendorCode}</span>
                  <span className="min-w-40 flex-1">{r.vendorName}</span>
                  <span className="numeric text-xs text-muted-foreground">
                    {r.over90 !== '0.0000' && `>90 ${r.over90}`}
                  </span>
                  <Money amount={r.total} currency={currency} />
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {mayRecord && vendors.length > 0 && (
        <Panel title={t('record')}>
          <RecordInvoice
            vendors={vendors}
            orders={orders}
            accounts={accounts}
            costCentres={costCentres}
            locale={locale}
          />
        </Panel>
      )}
    </div>
  );
}
