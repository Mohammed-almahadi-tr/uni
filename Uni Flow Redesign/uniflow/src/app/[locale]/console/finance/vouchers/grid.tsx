'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/components/ui/money';
import type { AccountOption, CostCenterOption } from '@/lib/console/finance';
import type { DraftDetail } from '@/lib/voucher/draft';
import { abandon, save, submit, type VoucherState } from './actions';

const initial: VoucherState = { error: null, saved: null, submitted: false, abandoned: false };

const iso = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/**
 * The voucher grid (Track D2, SRS REQ-FIN-04).
 *
 * Every line is a set of hidden fields, and every change resubmits the whole
 * grid. That looks heavier than patching one row and is the right shape:
 * `updateDraft` replaces the line set wholesale, which is what lets the
 * document be frozen wholesale the moment it is submitted — a maker cannot
 * get a clean voucher through review and then edit the lines before approval,
 * and the database enforces that with a trigger rather than trusting whatever
 * code path remembers.
 *
 * It also means **the totals on this screen were computed by the server**,
 * by `summariseLines` — the same function `submitForReview` will use to
 * accept or refuse it. The legacy grid summed its own display strings and
 * compared two text boxes for equality (frmMakeVoucher.vb:126).
 */
export function VoucherGrid({
  draft,
  accounts,
  accountsById,
  costCenters,
  currency,
  locale,
  editable,
}: {
  draft: DraftDetail;
  accounts: AccountOption[];
  accountsById: Record<string, AccountOption>;
  costCenters: CostCenterOption[];
  currency: string;
  locale: 'ar' | 'en';
  editable: boolean;
}) {
  const [state, saveAction, saving] = useActionState(save, initial);
  const [submitState, submitAction, submitting] = useActionState(submit, initial);
  const [abandonState, abandonAction, abandoning] = useActionState(abandon, initial);

  const t = useTranslations('finance.vouchers');
  const c = useTranslations('finance.common');
  const led = useTranslations('ledger');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  // The server's figures win over the ones the page was rendered with: a save
  // returns the recomputed balance, and that is the balance.
  const totalDebit = state.saved?.totalDebit ?? draft.totalDebit;
  const totalCredit = state.saved?.totalCredit ?? draft.totalCredit;
  const issues = state.saved?.issues ?? draft.issues;
  const lines = draft.lines;
  const difference = (Number(totalDebit) - Number(totalCredit)).toFixed(4);
  const balanced = totalDebit === totalCredit && Number(totalDebit) > 0;

  const error = state.error ?? submitState.error ?? abandonState.error;

  if (submitState.submitted) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-4 text-sm">
        {t('submitted')}
      </p>
    );
  }
  if (abandonState.abandoned) {
    return (
      <p className="rounded-md border border-border bg-muted/40 p-4 text-sm">{t('abandoned')}</p>
    );
  }

  const nameOf = (id: string) => {
    const a = accountsById[id];
    return a ? `${a.code} · ${pick(a.nameAr, a.nameEn)}` : id;
  };

  return (
    <div className="space-y-5">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {error}
        </p>
      )}

      <form action={saveAction} className="space-y-5">
        <input type="hidden" name="draftId" value={draft.id} />
        {/* No hidden `remove` field: the remove buttons submit their own, and
            a hidden one would always be the value FormData.get returns. */}

        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-sm font-medium">{t('description')}</span>
            <input
              name="description"
              defaultValue={draft.description}
              required
              readOnly={!editable}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm read-only:opacity-70"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('docDate')}</span>
            <input
              name="docDate"
              type="date"
              defaultValue={iso(draft.docDate)}
              readOnly={!editable}
              className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm read-only:opacity-70"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                  {t('account')}
                </th>
                <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                  {t('costCenter')}
                </th>
                <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                  {t('lineDescription')}
                </th>
                <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                  {led('debit')}
                </th>
                <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                  {led('credit')}
                </th>
                {editable && <th className="border-b border-border px-3 py-2" />}
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={`${l.accountId}-${i}`}>
                  <td className="border-b border-border px-3 py-2">
                    {nameOf(l.accountId)}
                    <input type="hidden" name={`line_${i}_accountId`} value={l.accountId} />
                    <input
                      type="hidden"
                      name={`line_${i}_costCenterId`}
                      value={l.costCenterId ?? ''}
                    />
                    <input
                      type="hidden"
                      name={`line_${i}_description`}
                      value={l.description ?? ''}
                    />
                    <input type="hidden" name={`line_${i}_debit`} value={String(l.debit ?? '')} />
                    <input
                      type="hidden"
                      name={`line_${i}_credit`}
                      value={String(l.credit ?? '')}
                    />
                  </td>
                  <td className="border-b border-border px-3 py-2 text-muted-foreground">
                    {l.costCenterId
                      ? (costCenters.find((cc) => cc.id === l.costCenterId)?.code ?? '—')
                      : '—'}
                  </td>
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
                  {editable && (
                    <td className="border-b border-border px-3 py-2">
                      <button
                        type="submit"
                        name="remove"
                        value={String(i)}
                        disabled={saving}
                        className="h-9 rounded-md px-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
                      >
                        {t('removeLine')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              {lines.length === 0 && (
                <tr>
                  <td colSpan={editable ? 6 : 5} className="px-3 py-4 text-muted-foreground">
                    {t('draftHint')}
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="px-3 py-2 text-end font-medium">
                  {led('totalDebit')} / {led('totalCredit')}
                </td>
                <td className="px-3 py-2 text-end font-semibold">
                  <Money amount={totalDebit} currency={currency} />
                </td>
                <td className="px-3 py-2 text-end font-semibold">
                  <Money amount={totalCredit} currency={currency} />
                </td>
                {editable && <td />}
              </tr>
              <tr>
                <td colSpan={3} className="px-3 py-1 text-end text-sm text-muted-foreground">
                  {balanced ? t('balanced') : t('difference')}
                </td>
                <td colSpan={2} className="px-3 py-1 text-end text-sm">
                  {balanced ? (
                    <span className="text-success">✓</span>
                  ) : (
                    <Money amount={difference} currency={currency} />
                  )}
                </td>
                {editable && <td />}
              </tr>
            </tfoot>
          </table>
        </div>

        {editable && (
          <div className="grid gap-4 rounded-lg border border-border bg-muted/40 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="block lg:col-span-2">
              <span className="mb-1 block text-sm font-medium">{t('account')}</span>
              <select
                name="new_accountId"
                defaultValue=""
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{t('chooseAccount')}</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.code} · {pick(a.nameAr, a.nameEn)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('costCenter')}</span>
              <select
                name="new_costCenterId"
                defaultValue=""
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">{c('none')}</option>
                {costCenters.map((cc) => (
                  <option key={cc.id} value={cc.id}>
                    {cc.code} · {pick(cc.nameAr, cc.nameEn)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('side')}</span>
              <select
                name="new_side"
                defaultValue="debit"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="debit">{led('debit')}</option>
                <option value="credit">{led('credit')}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{c('amount')}</span>
              <input
                name="new_amount"
                inputMode="decimal"
                dir="ltr"
                className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="block lg:col-span-4">
              <span className="mb-1 block text-sm font-medium">{t('lineDescription')}</span>
              <input
                name="new_description"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="h-11 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {saving ? c('working') : t('addLine')}
              </button>
            </div>
          </div>
        )}
      </form>

      {issues.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
          <strong className="block">{t('issues')}</strong>
          <ul className="mt-1 list-inside list-disc space-y-1">
            {issues.map((issue, i) => (
              <li key={`${issue.code}-${issue.lineNo}-${i}`}>{issue.message}</li>
            ))}
          </ul>
        </div>
      )}

      {editable && (
        <div className="flex flex-wrap items-end gap-3">
          <form action={submitAction} className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="draftId" value={draft.id} />
            <label className="block min-w-56">
              <span className="mb-1 block text-sm font-medium">{c('comment')}</span>
              <input
                name="comment"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? c('working') : t('submit')}
            </button>
          </form>

          <form action={abandonAction}>
            <input type="hidden" name="draftId" value={draft.id} />
            <button
              type="submit"
              disabled={abandoning}
              className="h-11 rounded-md border border-border px-4 text-sm text-muted-foreground hover:bg-muted disabled:opacity-50"
            >
              {t('abandon')}
            </button>
          </form>
        </div>
      )}
      {editable && <p className="text-xs text-muted-foreground">{t('abandonHint')}</p>}
    </div>
  );
}
