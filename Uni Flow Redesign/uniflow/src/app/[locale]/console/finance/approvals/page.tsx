import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { accountsByIds } from '@/lib/console/finance';
import { getDraft, listDrafts, type DraftDetail } from '@/lib/voucher/draft';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill, WarningBanner } from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { Decision } from './decisions';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('finance.approvals');
  return { title: t('title') };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The maker-checker queue (Track D2, SRS REQ-FIN-04).
 *
 * **The lines are on the queue**, not behind a click. A reviewer who has to
 * open each voucher to see what is in it approves without looking, and the
 * whole stage becomes a signature. `submitForReview` already refuses anything
 * unbalanced or unpostable, so everything here can post — which makes "does
 * this voucher say what it should" the only question left, and it cannot be
 * answered from a description and a total.
 *
 * `listDrafts({ awaitingMe: true })` excludes the caller's own work, so the
 * queue never lists something they are not permitted to action. A queue that
 * shows you items you cannot act on trains you to ignore it.
 */
export default async function ApprovalsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/approvals');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('finance.approvals');
  const c = await getTranslations('finance.common');
  const v = await getTranslations('finance.vouchers');
  const ds = await getTranslations('finance.draftState');
  const led = await getTranslations('ledger');

  const [currency, queue] = await Promise.all([
    tenantCurrency(principal),
    listDrafts(principal, { awaitingMe: true, take: 25 }),
  ]);

  // Loaded one at a time on purpose: the queue is bounded at 25 and each row
  // needs its full line set, which `listDrafts` deliberately does not carry.
  const details: DraftDetail[] = [];
  for (const item of queue) {
    details.push(await getDraft(principal, item.id));
  }

  const accountIds = details.flatMap((d) => d.lines.map((l) => l.accountId));
  const named = await accountsByIds(principal, accountIds);
  const nameOf = (id: string) => {
    const a = named.get(id);
    return a ? `${a.code} · ${locale === 'ar' ? a.nameAr : a.nameEn}` : id;
  };

  const mayApprove = principal.permissions.has('voucher.approve');

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {mayApprove && !principal.mfaVerified && (
        <WarningBanner>
          {t('mfaNeeded')}{' '}
          <Link
            href={{
              pathname: '/login/verify',
              query: { next: '/console/finance/approvals' },
            }}
            className="underline"
          >
            {t('mfaLink')}
          </Link>
        </WarningBanner>
      )}

      {details.length === 0 ? (
        <Panel>
          <Empty>{t('queueEmpty')}</Empty>
        </Panel>
      ) : (
        details.map((d) => (
          <Panel
            key={d.id}
            title={d.draftNo}
            actions={<Pill tone="warn">{ds(d.state)}</Pill>}
          >
            <div className="mb-4 flex flex-wrap items-baseline gap-x-6 gap-y-1 text-sm">
              <span className="font-medium">{d.description}</span>
              <span className="numeric text-muted-foreground">{iso(d.docDate)}</span>
              <span className="text-muted-foreground">
                {t('stage')}:{' '}
                {d.state === 'PENDING_REVIEW' ? t('stageReview') : t('stageApprove')}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                      {v('account')}
                    </th>
                    <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                      {v('lineDescription')}
                    </th>
                    <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                      {led('debit')}
                    </th>
                    <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                      {led('credit')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.lines.map((l, i) => (
                    <tr key={`${l.accountId}-${i}`}>
                      <td className="border-b border-border px-3 py-2">{nameOf(l.accountId)}</td>
                      <td className="border-b border-border px-3 py-2">{l.description ?? '—'}</td>
                      <td className="border-b border-border px-3 py-2 text-end">
                        {Number(l.debit ?? 0) > 0 ? (
                          <Money amount={String(l.debit)} currency={currency} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="border-b border-border px-3 py-2 text-end">
                        {Number(l.credit ?? 0) > 0 ? (
                          <Money amount={String(l.credit)} currency={currency} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-end font-medium">
                      {led('totalDebit')} / {led('totalCredit')}
                    </td>
                    <td className="px-3 py-2 text-end font-semibold">
                      <Money amount={d.totalDebit} currency={currency} />
                    </td>
                    <td className="px-3 py-2 text-end font-semibold">
                      <Money amount={d.totalCredit} currency={currency} />
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {d.history.length > 0 && (
              <ul className="mt-4 space-y-1 text-xs text-muted-foreground">
                {d.history.map((h, i) => (
                  <li key={`${h.occurredAt.toISOString()}-${i}`}>
                    <span className="numeric">{iso(h.occurredAt)}</span> · {ds(h.fromState)} →{' '}
                    {ds(h.toState)} · {t('maker')} {h.actorName}
                    {h.comment && ` — ${h.comment}`}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-4 border-t border-border pt-4">
              <Decision
                draftId={d.id}
                stage={d.state === 'PENDING_REVIEW' ? 'review' : 'approve'}
              />
            </div>

            <Link
              href={`/console/finance/vouchers/${d.id}`}
              className="mt-3 inline-block text-sm underline"
            >
              {c('back')}
            </Link>
          </Panel>
        ))
      )}
    </div>
  );
}
