import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { feeItemOptions, type FeeItemOption } from '@/lib/console/finance';
import { chequeHistory, chequePortfolio } from '@/lib/cheques/pipeline';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, Fact, FactGrid, PageHeader, Panel, Pill } from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { SettleCheque } from '../forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('finance.cheques');
  return { title: t('history') };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * One cheque and every movement it made (Track D2, SRS REQ-CHQ-02).
 *
 * This page has no legacy counterpart, because there was nothing to show. A
 * cheque was a `CheqDate` and a `ChNo` on a `Transactions` row plus a boolean
 * that two grid cells toggled, so the questions this page answers — when did
 * it go to the bank, who sent it, what did the bank say, which voucher
 * carried each step — had no stored answers at all.
 *
 * Every row below names the voucher its transition posted. That pairing is
 * the whole difference between a status column and a pipeline.
 */
export default async function ChequeDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/cheques/[id]');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('finance.cheques');
  const c = await getTranslations('finance.common');
  const st = await getTranslations('finance.chequeStatus');

  if (!principal.permissions.has('cheque.manage')) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} />
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      </div>
    );
  }

  const [currency, history] = await Promise.all([
    tenantCurrency(principal),
    chequeHistory(principal, id),
  ]);

  // The portfolio row carries the detail the history does not: who wrote it,
  // when it falls due, and the receipt it arrived on.
  const [item] = await chequePortfolio(principal, { status: history.status, take: 500 }).then(
    (rows) => rows.filter((r) => r.id === id),
  );

  // Raising the returned-cheque fee is billing a student, so the fields
  // appear only for somebody who may do that. Everyone with `cheque.manage`
  // can still record the bank's refusal.
  const feeItems: FeeItemOption[] = principal.permissions.has('charge.create')
    ? await feeItemOptions(principal)
    : [];

  const open = history.status === 'RECEIVED' || history.status === 'SENT_TO_BANK';

  return (
    <div className="space-y-6">
      <PageHeader
        title={history.chequeNo}
        subtitle={t('subtitle')}
        actions={
          <Link
            href="/console/finance/cheques"
            className="h-11 rounded-md border border-border px-4 text-sm font-medium leading-[2.75rem] hover:bg-muted"
          >
            {c('back')}
          </Link>
        }
      />

      <Panel>
        <FactGrid>
          <Fact label={c('status')}>
            <Pill
              tone={
                history.status === 'CLEARED'
                  ? 'good'
                  : history.status === 'BOUNCED'
                    ? 'bad'
                    : history.status === 'CANCELLED'
                      ? 'neutral'
                      : 'warn'
              }
            >
              {st(history.status)}
            </Pill>
          </Fact>
          <Fact label={c('amount')}>
            <Money amount={history.amount} currency={currency} />
          </Fact>
          {item && (
            <>
              <Fact label={t('due')}>
                <span className="numeric">{iso(item.dueDate)}</span>
              </Fact>
              <Fact label={t('drawer')}>{item.drawerName ?? '—'}</Fact>
              <Fact label={t('bank')}>{item.bankName ?? '—'}</Fact>
              <Fact label={t('custody')}>{item.custody}</Fact>
              {item.receiptNo && (
                <Fact label={t('receiptNo')}>
                  <Link
                    href={`/console/finance/receipts?q=${encodeURIComponent(item.receiptNo)}`}
                    className="numeric hover:underline"
                  >
                    {item.receiptNo}
                  </Link>
                </Fact>
              )}
            </>
          )}
        </FactGrid>
      </Panel>

      {open && (
        <Panel title={t('bounce')}>
          <SettleCheque
            chequeId={id}
            feeItems={feeItems}
            mayCancel={principal.permissions.has('cheque.cancel')}
            currency={currency}
            locale={locale}
          />
        </Panel>
      )}

      <Panel title={t('history')}>
        {history.events.length === 0 ? (
          <Empty>{c('nothing')}</Empty>
        ) : (
          <ol className="space-y-3">
            {history.events.map((e, i) => (
              <li key={`${e.docDate.toISOString()}-${i}`} className="border-s-2 border-border ps-4">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="numeric text-sm text-muted-foreground">
                    {iso(e.docDate)}
                  </span>
                  <span className="text-sm">
                    {st(e.from)} → {st(e.to)}
                  </span>
                  {e.voucherRef && (
                    <span className="numeric text-xs text-muted-foreground">
                      {e.voucherRef}
                    </span>
                  )}
                </div>
                {(e.comment || e.reasonCode) && (
                  <p className="mt-1 text-sm">
                    {e.reasonCode && (
                      <span className="numeric me-2 text-muted-foreground">{e.reasonCode}</span>
                    )}
                    {e.comment}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
