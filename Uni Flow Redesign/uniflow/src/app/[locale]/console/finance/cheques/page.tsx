import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import type { ChequeStatus } from '@/generated/prisma/enums';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { bankAccountOptions } from '@/lib/console/finance';
import { chequePortfolio, drawerBounceHistory } from '@/lib/cheques/pipeline';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { Portfolio } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('finance.cheques');
  return { title: t('title') };
}

const STATUSES: ChequeStatus[] = [
  'RECEIVED',
  'SENT_TO_BANK',
  'CLEARED',
  'BOUNCED',
  'CANCELLED',
];

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The cheque portfolio (Track D2, SRS REQ-CHQ-01/02/03).
 *
 * One status at a time, because the status decides what may be done: cheques
 * in hand can go to the bank, cheques with the bank can clear or come back.
 * The legacy screen filtered on `CheqClear=0` and called the result
 * *Pending*, which meant unpresented and refused at once — the same rows, the
 * same colour, and the label on each one said "Rejected"
 * (frmCheqClearingSystem.vb:11-12, 29-34).
 *
 * The repeat-drawer panel is REQ-CHQ-03, and it is the question an
 * institution that cannot answer it goes on accepting paper from the same
 * payer indefinitely. It groups on the normalised drawer key, so a name
 * spelled two ways in Arabic is still one drawer.
 */
export default async function ChequesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; dueBy?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/cheques');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('finance.cheques');
  const c = await getTranslations('finance.common');
  const st = await getTranslations('finance.chequeStatus');
  const sp = await searchParams;

  const status = (STATUSES as string[]).includes(sp.status ?? '')
    ? (sp.status as ChequeStatus)
    : 'RECEIVED';
  const dueBy =
    sp.dueBy && /^\d{4}-\d{2}-\d{2}$/.test(sp.dueBy)
      ? new Date(`${sp.dueBy}T00:00:00.000Z`)
      : undefined;

  // Someone holding only `cheque.cancel` may hand a cheque back but not read
  // the portfolio — `chequePortfolio` demands `cheque.manage`. The screen is
  // reachable on either, so the list is fetched only when it is readable
  // rather than letting a permission error render as a broken page.
  const mayManage = principal.permissions.has('cheque.manage');

  const [currency, rows, banks, repeats] = await Promise.all([
    tenantCurrency(principal),
    mayManage ? chequePortfolio(principal, { status, dueBy }) : Promise.resolve([]),
    mayManage
      ? bankAccountOptions(principal, 'cheque.manage')
      : Promise.resolve([]),
    mayManage
      ? drawerBounceHistory(principal, { minBounces: 2 })
      : Promise.resolve([]),
  ]);

  if (!mayManage) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        <form method="get" className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{c('status')}</span>
            <select
              name="status"
              defaultValue={status}
              className="h-11 rounded-md border border-input bg-background px-3 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {st(s)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('dueBy')}</span>
            <input
              name="dueBy"
              type="date"
              defaultValue={sp.dueBy ?? ''}
              className="numeric h-11 rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {c('search')}
          </button>
        </form>
      </Panel>

      <Panel title={t('portfolio')}>
        {rows.length === 0 ? (
          <Empty>{t('noCheques')}</Empty>
        ) : (
          <>
            <Portfolio
              rows={rows}
              status={status}
              banks={banks}
              currency={currency}
              locale={locale}
            />
            <ul className="mt-5 space-y-1 text-sm">
              {rows.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/console/finance/cheques/${r.id}`}
                    className="text-muted-foreground hover:underline"
                  >
                    <span className="numeric">{r.chequeNo}</span> — {t('history')}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      <Panel title={t('repeatDrawers')}>
        {repeats.length === 0 ? (
          <Empty>{t('noRepeat')}</Empty>
        ) : (
          <ul className="space-y-3">
            {repeats.map((d) => (
              <li key={d.drawerKey} className="rounded-md border border-border p-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-medium">{d.drawerName ?? d.drawerKey}</span>
                  {d.bankName && (
                    <span className="text-sm text-muted-foreground">{d.bankName}</span>
                  )}
                  <Pill tone="bad">
                    {t('bounces')}: <span className="numeric">{d.bounces}</span>
                  </Pill>
                  <Money amount={d.totalBounced} currency={currency} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {d.lastBounceOn && (
                    <>
                      {t('lastBounce')}: <span className="numeric">{iso(d.lastBounceOn)}</span>
                      {' · '}
                    </>
                  )}
                  {t('reasons')}: {d.reasons.join(' · ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
