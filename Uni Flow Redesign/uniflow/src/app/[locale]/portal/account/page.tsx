import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirectLocalised } from '@/lib/console/redirect';
import { portalPage } from '@/lib/portal/page';
import { portalCharges } from '@/lib/portal/views';
import { NoSiteConfigured } from '@/components/site/chrome';
import { PortalShell } from '@/components/portal/shell';
import {
  Amount,
  Empty,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.nav');
  return { title: t('account'), robots: { index: false, follow: false } };
}

/**
 * The bills and the payments (SRS REQ-LP-05, "invoices"; REQ-AR-04).
 *
 * ## Three things shown that a summary would drop
 *
 * · **The sponsored portion of a charge**, on the line rather than netted
 *   away. A student who does not know a ministry is carrying half the fee
 *   reads the smaller figure as an error and telephones about it.
 * · **Reversed charges**, struck through rather than deleted. A bill that was
 *   raised and taken back is a thing the student was told about; a list it
 *   silently vanishes from is a list they cannot reconcile against the letter
 *   in their hand.
 * · **Cancelled and dishonoured receipts.** A payment that was taken and then
 *   undone is the most alarming thing that can happen to somebody's account,
 *   and a portal that drops the row leaves them to discover it from a balance
 *   that changed overnight.
 *
 * ## Paying online is not here, and the page says so
 *
 * REQ-LP-05 asks for it. There is no payment gateway in this system — the
 * same adapters REQ-CSH-05's settlement reconciliation waits on, which no
 * phase owns — so there is nothing to put behind a button. A button that
 * opened a page saying "coming soon" would be worse than the sentence below
 * it, which tells somebody where they can actually pay today.
 */
export default async function PortalAccountPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const sp = await searchParams;

  const state = await portalPage(raw, sp.student);
  if (!state.ok) {
    if (state.reason === 'noSite') return <NoSiteConfigured host={state.host} />;
    if (state.reason === 'noStudent') notFound();
    redirectLocalised(raw, '/portal/login');
  }
  const { locale, site, principal, student } = state;

  const t = await getTranslations('portal');
  const channels = await getTranslations('finance.channel');
  const view = await portalCharges(principal, student.studentId);
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const currency = site.tenant.functionalCurrency;
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <PortalShell
      site={site}
      locale={locale}
      principal={principal}
      student={student}
      active="account"
    >
      <div className="space-y-6">
        <Panel title={t('account.summary')}>
          <dl className="grid gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">{t('overview.charged')}</dt>
              <dd className="mt-1 font-semibold">
                <Amount value={view.balance.charged} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('overview.settled')}</dt>
              <dd className="mt-1 font-semibold">
                <Amount value={view.balance.settled} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('overview.credit')}</dt>
              <dd className="mt-1 font-semibold">
                <Amount value={view.balance.creditBalance} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('overview.owed')}</dt>
              <dd className="mt-1 font-semibold">
                <Amount value={view.balance.netDue} currency={currency} />
              </dd>
            </div>
          </dl>

          <p className="mt-5 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {t('account.howToPay')}
          </p>
        </Panel>

        <Panel title={t('account.charges')}>
          {view.charges.length === 0 ? (
            <Empty>{t('account.noCharges')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('account.date')}</Th>
                    <Th>{t('account.fee')}</Th>
                    <Th numeric>{t('account.gross')}</Th>
                    <Th numeric>{t('account.discount')}</Th>
                    <Th numeric>{t('account.sponsored')}</Th>
                    <Th numeric>{t('account.yours')}</Th>
                    <Th numeric>{t('account.outstanding')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.charges.map((c) => (
                    <tr key={c.id} className={c.reversed ? 'text-muted-foreground' : undefined}>
                      <Td>
                        <span className="numeric">{iso(c.docDate)}</span>
                      </Td>
                      <Td>
                        <span className={c.reversed ? 'line-through' : undefined}>
                          {pick(c.feeNameAr, c.feeNameEn)}
                        </span>
                        {c.termLabel && (
                          <span className="block text-xs text-muted-foreground">
                            {c.termLabel}
                          </span>
                        )}
                        {c.reversed && (
                          <span className="mt-1 block">
                            <Pill tone="bad">{t('account.reversed')}</Pill>
                          </span>
                        )}
                      </Td>
                      <Td numeric>
                        <Amount value={c.gross} currency={c.currency} />
                      </Td>
                      <Td numeric>
                        <Amount value={c.discount} currency={c.currency} />
                      </Td>
                      <Td numeric>
                        <Amount value={c.sponsored} currency={c.currency} />
                      </Td>
                      <Td numeric>
                        <Amount value={c.own} currency={c.currency} />
                      </Td>
                      <Td numeric>
                        <Amount
                          value={c.outstanding}
                          currency={c.currency}
                          className="font-semibold"
                        />
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>

        <Panel title={t('account.receipts')}>
          {view.receipts.length === 0 ? (
            <Empty>{t('account.noReceipts')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('account.date')}</Th>
                    <Th>{t('account.receiptNo')}</Th>
                    <Th>{t('account.channel')}</Th>
                    <Th numeric>{t('account.amount')}</Th>
                    <Th>{t('account.state')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {view.receipts.map((r) => (
                    <tr key={r.id}>
                      <Td>
                        <span className="numeric">{iso(r.docDate)}</span>
                      </Td>
                      <Td>
                        <span className="numeric">{r.receiptNo}</span>
                      </Td>
                      <Td>{channels(r.channel)}</Td>
                      <Td numeric>
                        <Amount value={r.amount} currency={r.currency} />
                      </Td>
                      <Td>
                        {r.dishonoured ? (
                          <Pill tone="bad">{t('account.dishonoured')}</Pill>
                        ) : r.cancelled ? (
                          <Pill tone="bad">{t('account.cancelled')}</Pill>
                        ) : (
                          <Pill tone="good">{t('account.received')}</Pill>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>
      </div>
    </PortalShell>
  );
}
