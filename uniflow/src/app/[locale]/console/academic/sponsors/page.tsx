import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { studentHeader, tenantCurrency } from '@/lib/console/lookups';
import {
  feeCatalogue,
  sponsorInvoiceRows,
  sponsorOptions,
  type FeeItemRow,
} from '@/lib/console/backoffice';
import { listSponsorships } from '@/lib/sponsors/contracts';
import { sponsorAging } from '@/lib/sponsors/billing';
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
import { StudentPicker } from '@/components/console/student-picker';
import { AddSponsor, ContractActions, DraftContract, Invoicing } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academic.sponsors');
  return { title: t('title') };
}

const TABS = ['register', 'contracts', 'invoices', 'aging'] as const;
type Tab = (typeof TABS)[number];

/**
 * Sponsors (Track D4, SRS REQ-SPN-01/02).
 *
 * The legacy build had no sponsor concept at all: a sponsored student was
 * billed in full and the ministry was chased by telephone. So the student's
 * own statement showed a debt that belonged to somebody else, and nobody
 * could say what had been agreed, invoiced or paid.
 *
 * Four views, because they are four different jobs done by four different
 * people on four different days — recording who a sponsor is, agreeing what
 * they cover for one student, billing them for a term, and chasing what they
 * owe.
 */
export default async function SponsorsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string; student?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'academic/sponsors');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('academic.sponsors');
  const c = await getTranslations('academic.common');
  const ss = await getTranslations('academic.sponsorshipStatus');
  const sp = await searchParams;

  const tab: Tab = (TABS as readonly string[]).includes(sp.tab ?? '')
    ? (sp.tab as Tab)
    : 'register';

  const mayManage = principal.permissions.has('sponsor.manage');
  const mayApprove = principal.permissions.has('sponsor.approve');
  const mayInvoice = principal.permissions.has('sponsor.invoice');
  const mayReport = principal.permissions.has('report.financial');

  const currency = await tenantCurrency(principal);
  const sponsors = mayManage ? await sponsorOptions(principal) : [];
  const invoices =
    tab === 'invoices' && mayInvoice ? await sponsorInvoiceRows(principal) : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <nav className="flex flex-wrap gap-2">
        {TABS.map((k) => (
          <Link
            key={k}
            href={`/console/academic/sponsors?tab=${k}`}
            className={
              k === tab
                ? 'rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground'
                : 'rounded-md border border-border px-3 py-2 text-sm hover:bg-muted'
            }
          >
            {t(k)}
          </Link>
        ))}
      </nav>

      {tab === 'register' && (
        <>
          <Panel title={t('register')}>
            {sponsors.length === 0 ? (
              <Empty>{t('noSponsors')}</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {sponsors.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center gap-4 py-3">
                    <span className="numeric text-sm text-muted-foreground">{s.code}</span>
                    <span className="flex-1">{pickText(locale, s.nameAr, s.nameEn)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {mayManage && (
            <Panel title={t('addSponsor')}>
              <AddSponsor />
            </Panel>
          )}
        </>
      )}

      {tab === 'contracts' && (await contractsView())}

      {tab === 'invoices' && mayInvoice && (
        <>
          {/* The invoices already raised. D4 offered a button that created one
              and then showed nothing — the invoice existed, in the sub-ledger
              and on the aging report, and there was no way to look at it.
              Each row links to the printed invoice D5 built. */}
          <Panel title={t('invoices')}>
            {invoices.length === 0 ? (
              <Empty>{c('nothing')}</Empty>
            ) : (
              <ul className="divide-y divide-border">
                {invoices.map((inv) => (
                  <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
                    <Link
                      href={`/console/academic/sponsors/invoices/${inv.id}`}
                      className="numeric font-medium hover:underline"
                    >
                      {inv.invoiceNo}
                    </Link>
                    <span className="min-w-40 flex-1">
                      {pickText(locale, inv.sponsorNameAr, inv.sponsorNameEn)}
                    </span>
                    <span className="numeric text-xs text-muted-foreground">
                      {inv.lineCount}
                    </span>
                    <span className="numeric text-xs text-muted-foreground">
                      {inv.dueDate}
                    </span>
                    <Money amount={inv.totalAmount} currency={inv.currency} />
                    <Pill
                      tone={
                        inv.status === 'SETTLED'
                          ? 'good'
                          : inv.status === 'CANCELLED'
                            ? 'neutral'
                            : 'warn'
                      }
                    >
                      {inv.status}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title={t('raiseInvoice')}>
            <Invoicing sponsors={sponsors} locale={locale} />
          </Panel>
        </>
      )}
      {tab === 'invoices' && !mayInvoice && (
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      )}

      {tab === 'aging' && (await agingView())}
    </div>
  );

  /** Contracts are per student, so this view starts with the picker.
   *  Plain awaited functions rather than nested components: a component type
   *  redefined on every render remounts its subtree, and these only ever
   *  produce markup. */
  async function contractsView() {
    if (!mayManage) {
      return (
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      );
    }

    const header = sp.student ? await studentHeader(principal, sp.student) : null;
    if (!header) {
      return (
        <StudentPicker
          principal={principal}
          locale={locale}
          query={sp.q ?? ''}
          basePath="/console/academic/sponsors?tab=contracts"
        />
      );
    }

    const [contracts, feeItems] = await Promise.all([
      listSponsorships(principal, { studentId: header.id }),
      // The matrix's catalogue read, gated on `feematrix.read`. Somebody who
      // manages sponsor contracts need not hold it, and a coverage line
      // naming no fee item is still the useful fallback.
      principal.permissions.has('feematrix.read')
        ? feeCatalogue(principal)
        : Promise.resolve([] as FeeItemRow[]),
    ]);

    return (
      <>
        <Panel title={t('contracts')}>
          {contracts.length === 0 ? (
            <Empty>{t('noContracts')}</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {contracts.map((s) => (
                <li key={s.id} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="numeric text-sm text-muted-foreground">
                      {s.sponsorCode}
                    </span>
                    <span className="font-medium">{s.sponsorNameEn}</span>
                    <Pill
                      tone={
                        s.status === 'ACTIVE'
                          ? 'good'
                          : s.status === 'DRAFT'
                            ? 'warn'
                            : 'neutral'
                      }
                    >
                      {ss(s.status)}
                    </Pill>
                    <span className="numeric text-xs text-muted-foreground">
                      {s.validFrom} → {s.validTo ?? t('openEnded')}
                    </span>
                    {s.reference && (
                      <span className="numeric text-xs text-muted-foreground">
                        {s.reference}
                      </span>
                    )}
                  </div>
                  <dl className="mt-2 flex flex-wrap gap-6 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('cap')}</dt>
                      <dd>
                        {s.capAmount ? (
                          <Money amount={s.capAmount} currency={currency} />
                        ) : (
                          <span className="text-muted-foreground">{t('openEnded')}</span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('consumed')}</dt>
                      <dd>
                        <Money amount={s.consumedAmount} currency={currency} />
                      </dd>
                    </div>
                  </dl>
                  <ul className="mt-2 space-y-1 text-sm">
                    {s.lines.map((l, i) => (
                      <li key={i} className="text-muted-foreground">
                        {l.feeItemCode ?? t('anyFeeItem')} —{' '}
                        <span className="numeric">{l.coveragePct}%</span>
                        {l.capAmount && (
                          <>
                            {' · '}
                            <Money amount={l.capAmount} currency={currency} />
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3">
                    <ContractActions
                      sponsorshipId={s.id}
                      status={s.status}
                      mayApprove={mayApprove}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {sponsors.length > 0 && (
          <Panel title={t('draftContract')}>
            <DraftContract
              sponsors={sponsors}
              studentId={header.id}
              feeItems={feeItems}
              locale={locale}
            />
          </Panel>
        )}
      </>
    );
  }

  async function agingView() {
    if (!mayReport) {
      return (
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      );
    }
    const aging = await sponsorAging(principal);

    return (
      <Panel title={t('aging')}>
        {aging.rows.length === 0 ? (
          <Empty>{t('noAging')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('sponsor')}</Th>
                  {aging.bucketLabels.map((b) => (
                    <Th key={b} numeric>
                      {b}
                    </Th>
                  ))}
                  <Th numeric>{t('total')}</Th>
                </tr>
              </thead>
              <tbody>
                {aging.rows.map((r) => (
                  <tr key={r.sponsorId}>
                    <Td>
                      <span className="numeric text-muted-foreground">{r.sponsorCode}</span>{' '}
                      {r.sponsorNameEn}
                    </Td>
                    {r.buckets.map((b, i) => (
                      <Td key={i} numeric>
                        <Money amount={b} currency={currency} />
                      </Td>
                    ))}
                    <Td numeric>
                      <Money amount={r.total} currency={currency} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('agingHint')}</p>
        <p className="mt-1 text-sm">
          {t('total')}: <Money amount={aging.total} currency={currency} />
        </p>
      </Panel>
    );
  }
}
