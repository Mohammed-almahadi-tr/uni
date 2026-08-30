import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { bankAccountOptions } from '@/lib/console/finance';
import { paymentRows } from '@/lib/console/backoffice';
import { paymentProposal } from '@/lib/procurement/payments';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { DraftPayment, PaymentActions } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('procurement.payments');
  return { title: t('title') };
}

/**
 * Paying suppliers (Track D4, SRS REQ-PRC-05).
 *
 * D2 declared this screen and then handed it back: it lives in the finance
 * menu but it is the last leg of procure-to-pay, and it cannot exist before
 * the invoices do.
 *
 * The proposal — what is due, and how overdue — is the top of the screen
 * rather than a report elsewhere, because a payment run starts from it.
 */
export default async function PaymentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ dueBy?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/payments');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.payments');
  const c = await getTranslations('procurement.common');
  const sp = await searchParams;

  const mayCreate = principal.permissions.has('payment.create');
  const mayApprove = principal.permissions.has('payment.approve');

  const dueBy =
    sp.dueBy && /^\d{4}-\d{2}-\d{2}$/.test(sp.dueBy)
      ? new Date(`${sp.dueBy}T00:00:00.000Z`)
      : undefined;

  const [currency, payments, proposal, banks] = await Promise.all([
    tenantCurrency(principal),
    mayCreate ? paymentRows(principal) : Promise.resolve([]),
    mayCreate ? paymentProposal(principal, { dueBy }) : Promise.resolve([]),
    mayCreate ? bankAccountOptions(principal, 'cheque.manage').catch(() => []) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        {payments.length === 0 ? (
          <Empty>{t('noPayments')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {payments.map((p) => (
              <li key={p.id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="numeric font-medium">{p.pvNo}</span>
                  <span className="numeric text-sm text-muted-foreground">
                    {p.vendorCode}
                  </span>
                  <span className="flex-1">{p.vendorName}</span>
                  <span className="numeric text-xs text-muted-foreground">
                    {p.paymentDate}
                  </span>
                  <Money amount={p.amount} currency={currency} />
                  <Pill
                    tone={
                      p.state === 'POSTED'
                        ? 'good'
                        : p.state === 'REJECTED'
                          ? 'bad'
                          : 'warn'
                    }
                  >
                    {p.state}
                  </Pill>
                </div>
                <div className="mt-3">
                  <PaymentActions
                    paymentId={p.id}
                    state={p.state}
                    isMaker={p.createdById === principal.userId}
                    mayApprove={mayApprove}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {mayCreate && (
        <Panel title={t('proposal')}>
          <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('asOf')}</span>
              <input
                name="dueBy"
                type="date"
                defaultValue={sp.dueBy ?? ''}
                className="numeric h-11 rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              {c('search')}
            </button>
          </form>

          <DraftPayment
            proposal={proposal}
            banks={banks}
            currency={currency}
            locale={locale}
          />
        </Panel>
      )}
    </div>
  );
}
