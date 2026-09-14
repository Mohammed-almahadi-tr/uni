import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { PaymentChannel } from '@/generated/prisma/enums';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { receiptRegister } from '@/lib/cashier/receipt';
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
import { CancelReceipt } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('finance.receipts');
  return { title: t('title') };
}

const CHANNELS: PaymentChannel[] = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'GATEWAY'];

const iso = (d: Date) => d.toISOString().slice(0, 10);

const parse = (v: string | undefined): Date | undefined =>
  v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : undefined;

/**
 * The receipt register (Track D2, SRS REQ-CSH-06).
 *
 * A GET form, so a filtered view survives a reload and can be sent to a
 * colleague — the same reasoning as the student picker.
 *
 * Cancelled and dishonoured receipts stay in the list, marked. The legacy
 * `Transactionees` table had no notion of either: a receipt was two rows, and
 * undoing one meant deleting them, which is why nobody could answer how many
 * receipts had been issued and withdrawn in a month.
 */
export default async function ReceiptsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    from?: string;
    to?: string;
    channel?: string;
    scope?: string;
  }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/receipts');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('finance.receipts');
  const c = await getTranslations('finance.common');
  const ch = await getTranslations('finance.channel');
  const sp = await searchParams;

  // Defaults to the caller's own receipts when they can take money, and to
  // everyone's when their business here is supervising rather than cashiering.
  const mine = sp.scope ? sp.scope === 'mine' : principal.permissions.has('receipt.create');
  const channel = CHANNELS.includes(sp.channel as PaymentChannel)
    ? (sp.channel as PaymentChannel)
    : undefined;

  const [currency, rows] = await Promise.all([
    tenantCurrency(principal),
    receiptRegister(principal, {
      q: sp.q,
      from: parse(sp.from),
      to: parse(sp.to),
      channel,
      mine,
    }),
  ]);

  const mayCancel = principal.permissions.has('receipt.cancel');

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block min-w-56 flex-1">
            <span className="mb-1 block text-sm font-medium">{c('search')}</span>
            <input
              name="q"
              defaultValue={sp.q ?? ''}
              dir="ltr"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
            <span className="mt-1 block text-xs text-muted-foreground">{t('searchHint')}</span>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{c('from')}</span>
            <input
              name="from"
              type="date"
              defaultValue={sp.from ?? ''}
              className="numeric h-11 rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{c('to')}</span>
            <input
              name="to"
              type="date"
              defaultValue={sp.to ?? ''}
              className="numeric h-11 rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{ch('CASH')}</span>
            <select
              name="channel"
              defaultValue={channel ?? ''}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{c('all')}</option>
              {CHANNELS.map((k) => (
                <option key={k} value={k}>
                  {ch(k)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('cashier')}</span>
            <select
              name="scope"
              defaultValue={mine ? 'mine' : 'all'}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="mine">{t('mine')}</option>
              <option value="all">{t('everyone')}</option>
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

      <Panel>
        {rows.length === 0 ? (
          <Empty>{t('noReceipts')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('receiptNo')}</Th>
                  <Th>{c('date')}</Th>
                  <Th>{c('student')}</Th>
                  <Th>{ch('CASH')}</Th>
                  <Th numeric>{c('amount')}</Th>
                  <Th>{t('cashier')}</Th>
                  <Th>{c('status')}</Th>
                  {mayCancel && <Th />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      {/* The receipt number is the link to the printed
                          receipt. D5 built the document; this is where a
                          cashier reaches it — from the number the student
                          quotes on the telephone. */}
                      <Link
                        href={`/console/finance/receipts/${r.id}`}
                        className="numeric hover:underline"
                      >
                        {r.receiptNo}
                      </Link>
                      {r.chequeNo && (
                        <span className="numeric block text-xs text-muted-foreground">
                          {r.chequeNo}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <span className="numeric">{iso(r.docDate)}</span>
                    </Td>
                    <Td>
                      <Link
                        href={`/console/registry/students/${r.studentId}`}
                        className="hover:underline"
                      >
                        {pickText(locale, r.fullNameAr, r.fullNameEn)}
                      </Link>
                      <span className="numeric block text-xs text-muted-foreground">
                        {r.studentNo}
                      </span>
                    </Td>
                    <Td>{ch(r.channel)}</Td>
                    <Td numeric>
                      <Money amount={r.amount} currency={currency} />
                      {r.allocated !== r.amount && (
                        <span className="block text-xs text-muted-foreground">
                          <Money amount={r.allocated} currency={currency} />
                        </span>
                      )}
                    </Td>
                    <Td>{r.cashierName}</Td>
                    <Td>
                      {r.cancelledAt ? (
                        <Pill tone="bad">{t('cancelledLabel')}</Pill>
                      ) : r.dishonouredAt ? (
                        <Pill tone="warn">{t('dishonoured')}</Pill>
                      ) : (
                        <Pill tone="good">{t('live')}</Pill>
                      )}
                    </Td>
                    {mayCancel && (
                      <Td>
                        {r.cancellableToday ? (
                          <CancelReceipt receiptId={r.id} />
                        ) : r.cancelledAt === null && r.dishonouredAt === null ? (
                          <span className="text-xs text-muted-foreground">{t('notToday')}</span>
                        ) : null}
                      </Td>
                    )}
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
