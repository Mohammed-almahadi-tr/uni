'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { AccountOption, CostCenterOption } from '@/lib/console/finance';
import { draft, transition, type BudgetState } from './actions';

const initial: BudgetState = { error: null, message: null };

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

export interface FiscalYearOption {
  id: string;
  name: string;
}

/**
 * Draft a budget version (Track D4).
 *
 * Six line rows. Each names an account and optionally a cost centre — the
 * pair an availability check is made against, which is why a line without an
 * account cannot exist.
 *
 * The period split is left to `allocate()`, which spreads evenly without
 * leaving a residue anywhere. Phasing a year by hand is a real requirement
 * and is not on this form: it wants a screen of its own rather than twelve
 * more boxes per line.
 */
export function DraftBudget({
  years,
  accounts,
  costCentres,
  locale,
}: {
  years: FiscalYearOption[];
  accounts: AccountOption[];
  costCentres: CostCenterOption[];
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(draft, initial);
  const t = useTranslations('procurement.budgets');
  const c = useTranslations('procurement.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const rows = [0, 1, 2, 3, 4, 5];

  if (state.message === 'added') {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {c('added')}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('fiscalYear')}</span>
          <select name="fiscalYearId" required className={field}>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('description')}</span>
          <input name="label" required className={field} />
        </label>
      </div>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">{c('lines')}</legend>
        <div className="space-y-3">
          {rows.map((i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="block lg:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">
                  {c('account')}
                </span>
                <select name={`line_${i}_accountId`} defaultValue="" className={small}>
                  <option value="">—</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.code} · {pick(a.nameAr, a.nameEn)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  {c('costCentre')}
                </span>
                <select name={`line_${i}_costCenterId`} defaultValue="" className={small}>
                  <option value="">{c('none')}</option>
                  {costCentres.map((cc) => (
                    <option key={cc.id} value={cc.id}>
                      {cc.code}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  {t('allocated')}
                </span>
                <input
                  name={`line_${i}_amount`}
                  inputMode="decimal"
                  dir="ltr"
                  className={`numeric ${small}`}
                />
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('draft')}
      </button>
    </form>
  );
}

/** Whatever the budget's state allows next. */
export function BudgetActions({
  budgetId,
  status,
  mayManage,
  mayApprove,
}: {
  budgetId: string;
  status: string;
  mayManage: boolean;
  mayApprove: boolean;
}) {
  const [state, action, pending] = useActionState(transition, initial);
  const t = useTranslations('procurement.budgets');
  const c = useTranslations('procurement.common');

  if (state.message) return <p className="text-sm text-success">{c('saved')}</p>;

  const canSubmit = status === 'DRAFT' && mayManage;
  const canDecide = status === 'PENDING_APPROVAL' && mayApprove;
  if (!canSubmit && !canDecide) return null;

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="budgetId" value={budgetId} />
      {state.error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {state.error}
        </p>
      )}
      {canSubmit && (
        <button
          type="submit"
          name="how"
          value="submit"
          disabled={pending}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? c('working') : t('submit')}
        </button>
      )}
      {canDecide && (
        <>
          <label className="block min-w-48 flex-1">
            <span className="mb-1 block text-xs text-muted-foreground">{c('note')}</span>
            <input name="note" className={small} />
          </label>
          <button
            type="submit"
            name="how"
            value="approve"
            disabled={pending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? c('working') : t('approve')}
          </button>
          <button
            type="submit"
            name="how"
            value="reject"
            disabled={pending}
            className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {t('reject')}
          </button>
        </>
      )}
    </form>
  );
}
