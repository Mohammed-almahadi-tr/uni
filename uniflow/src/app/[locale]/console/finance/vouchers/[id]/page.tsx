import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { accountSearch, accountsByIds, costCenterOptions } from '@/lib/console/finance';
import { getDraft } from '@/lib/voucher/draft';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, Fact, FactGrid, PageHeader, Panel, Pill } from '@/components/console/ui';
import { VoucherGrid } from '../grid';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('finance.vouchers');
  return { title: t('title') };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * One voucher, its lines and everything that happened to it (Track D2).
 *
 * The history panel is the part with no legacy counterpart. There, approval
 * was an `INSERT` into the ledger followed by
 * `Delete From TempVouchers Where MoveNo=…` (frmApprovingVouchers.vb:990),
 * so nothing recorded who prepared a voucher, who approved it, when, or on
 * what grounds — the delete destroyed the only evidence the voucher had ever
 * been reviewed. Every transition here is retained, with its actor and its
 * comment, including the rejections.
 *
 * Editing closes at submission. That is enforced by a trigger, and this page
 * only reflects it: showing an editable grid on a frozen document would
 * invite work that the database is going to refuse.
 */
export default async function VoucherDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ acct?: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/vouchers/[id]');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('finance.vouchers');
  const c = await getTranslations('finance.common');
  const p = await getTranslations('print');
  const ds = await getTranslations('finance.draftState');
  const sp = await searchParams;

  const draft = await getDraft(principal, id);

  const [currency, accounts, costCenters, named] = await Promise.all([
    tenantCurrency(principal),
    accountSearch(principal, sp.acct ?? ''),
    costCenterOptions(principal),
    accountsByIds(principal, draft.lines.map((l) => l.accountId)),
  ]);

  // Editable only when the state allows it *and* the caller is the maker.
  // The second half is checked here as well as in `updateDraft` because a
  // grid that accepts edits and then refuses to save them is worse than one
  // that says so — and the module remains the control either way.
  const isMaker = draft.createdById === principal.userId;
  const editable =
    principal.permissions.has('voucher.create') &&
    isMaker &&
    (draft.state === 'DRAFT' || draft.state === 'REJECTED');

  const frozen = draft.state !== 'DRAFT' && draft.state !== 'REJECTED';

  return (
    <div className="space-y-6">
      <PageHeader
        title={draft.draftNo}
        subtitle={draft.description}
        actions={
          <>
            {/* The printed voucher. A draft prints too — it goes round the
                building to be signed before it is approved in the system,
                which is the order the work actually happens in. */}
            <Link
              href={`/console/finance/vouchers/${draft.id}/print`}
              className="h-11 rounded-md bg-primary px-4 text-sm font-medium leading-[2.75rem] text-primary-foreground hover:opacity-90"
            >
              {p('print')}
            </Link>
            <Link
              href="/console/finance/vouchers"
              className="h-11 rounded-md border border-border px-4 text-sm font-medium leading-[2.75rem] hover:bg-muted"
            >
              {c('back')}
            </Link>
          </>
        }
      />

      <Panel>
        <FactGrid>
          <Fact label={c('status')}>
            <Pill
              tone={
                draft.state === 'POSTED'
                  ? 'good'
                  : draft.state === 'REJECTED'
                    ? 'bad'
                    : draft.state === 'CANCELLED'
                      ? 'neutral'
                      : 'warn'
              }
            >
              {ds(draft.state)}
            </Pill>
          </Fact>
          <Fact label={t('docDate')}>
            <span className="numeric">{iso(draft.docDate)}</span>
          </Fact>
          {frozen && !editable && (
            <Fact label=" ">
              <span className="text-sm text-muted-foreground">{t('frozen')}</span>
            </Fact>
          )}
          {!frozen && !isMaker && (
            <Fact label=" ">
              <span className="text-sm text-muted-foreground">{t('notYours')}</span>
            </Fact>
          )}
        </FactGrid>
      </Panel>

      {editable && (
        <Panel title={t('account')}>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="block min-w-56 flex-1">
              <span className="mb-1 block text-sm font-medium">{t('accountSearch')}</span>
              <input
                name="acct"
                defaultValue={sp.acct ?? ''}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              className="h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              {c('search')}
            </button>
          </form>
          {accounts.length === 0 && (
            <p className="mt-3 text-sm text-muted-foreground">{t('noAccounts')}</p>
          )}
        </Panel>
      )}

      <Panel title={t('lines')}>
        <VoucherGrid
          draft={draft}
          accounts={accounts}
          accountsById={Object.fromEntries(named)}
          costCenters={costCenters}
          currency={currency}
          locale={locale}
          editable={editable}
        />
      </Panel>

      <Panel title={t('history')}>
        {draft.history.length === 0 ? (
          <Empty>{c('nothing')}</Empty>
        ) : (
          <ol className="space-y-3">
            {draft.history.map((h, i) => (
              <li key={`${h.occurredAt.toISOString()}-${i}`} className="border-s-2 border-border ps-4">
                <div className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="numeric text-muted-foreground">
                    {iso(h.occurredAt)}
                  </span>
                  <span>
                    {ds(h.fromState)} → {ds(h.toState)}
                  </span>
                  <span className="text-muted-foreground">{t('by', { name: h.actorName })}</span>
                </div>
                {h.comment && <p className="mt-1 text-sm">{h.comment}</p>}
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
