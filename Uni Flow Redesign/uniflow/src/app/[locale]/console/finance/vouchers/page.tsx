import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { listDrafts } from '@/lib/voucher/draft';
import { ForbiddenScreen } from '@/components/console/text';
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
import { NewVoucher } from './new-voucher';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('finance.vouchers');
  return { title: t('title') };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The voucher list (Track D2, SRS REQ-FIN-04).
 *
 * Drafts, in every state including the abandoned and the rejected. Nothing is
 * ever removed from this list, because nothing is ever deleted — a trigger
 * enforces that, not a convention. The legacy equivalent was a `TempVouchers`
 * table whose rows were `DELETE`d on approval
 * (frmApprovingVouchers.vb:990-991), so the record that a voucher had been
 * prepared, reviewed and approved was destroyed by the act of approving it.
 */
export default async function VouchersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ scope?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'finance/vouchers');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('finance.vouchers');
  const c = await getTranslations('finance.common');
  const ds = await getTranslations('finance.draftState');
  const sp = await searchParams;

  const mayCreate = principal.permissions.has('voucher.create');
  const mine = sp.scope ? sp.scope === 'mine' : mayCreate;

  const [currency, rows] = await Promise.all([
    tenantCurrency(principal),
    listDrafts(principal, { mine }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {mayCreate && (
        <Panel title={t('newDraft')}>
          <NewVoucher locale={raw} />
        </Panel>
      )}

      <Panel
        actions={
          <form method="get">
            <select
              name="scope"
              defaultValue={mine ? 'mine' : 'all'}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="mine">{t('mine')}</option>
              <option value="all">{c('all')}</option>
            </select>
            <button
              type="submit"
              className="ms-2 h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
            >
              {c('search')}
            </button>
          </form>
        }
      >
        {rows.length === 0 ? (
          <Empty>{t('noDrafts')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('draftNo')}</Th>
                  <Th>{t('docDate')}</Th>
                  <Th>{t('description')}</Th>
                  <Th numeric>{c('total')}</Th>
                  <Th>{c('status')}</Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <Link
                        href={`/console/finance/vouchers/${r.id}`}
                        className="numeric hover:underline"
                      >
                        {r.draftNo}
                      </Link>
                    </Td>
                    <Td>
                      <span className="numeric">{iso(r.docDate)}</span>
                    </Td>
                    <Td>{r.description}</Td>
                    <Td numeric>
                      <Money amount={r.totalAmount} currency={currency} />
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          r.state === 'POSTED'
                            ? 'good'
                            : r.state === 'REJECTED'
                              ? 'bad'
                              : r.state === 'CANCELLED'
                                ? 'neutral'
                                : 'warn'
                        }
                      >
                        {ds(r.state)}
                      </Pill>
                    </Td>
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
