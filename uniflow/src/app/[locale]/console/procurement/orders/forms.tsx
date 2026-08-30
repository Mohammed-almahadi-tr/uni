'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/components/ui/money';
import type { AccountOption, CostCenterOption } from '@/lib/console/finance';
import type { VendorOption } from '@/lib/console/backoffice';
import { draft, transition, type OrderState } from './actions';

const initial: OrderState = { error: null, message: null, approved: null };

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

/**
 * Draft an order (Track D4).
 *
 * Four line rows, entered together. Each line names an account and may name a
 * cost centre, because that is what the encumbrance is reserved against —
 * an order with no account behind its lines cannot commit budget, and
 * committing budget is the whole reason approval is a separate act.
 */
export function DraftOrder({
  vendors,
  accounts,
  costCentres,
  locale,
}: {
  vendors: VendorOption[];
  accounts: AccountOption[];
  costCentres: CostCenterOption[];
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(draft, initial);
  const t = useTranslations('procurement.orders');
  const c = useTranslations('procurement.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const rows = [0, 1, 2, 3];

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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-medium">{c('vendor')}</span>
          <select name="vendorId" required className={field}>
            {vendors
              .filter((v) => !v.isBlocked)
              .map((v) => (
                <option key={v.id} value={v.id}>
                  {v.code} · {pick(v.nameAr, v.nameEn)}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('orderDate')}</span>
          <input name="orderDate" type="date" required className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('expectedDate')}</span>
          <input name="expectedDate" type="date" className={`numeric ${field}`} />
        </label>
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="mb-1 block text-sm font-medium">{t('terms')}</span>
          <input name="terms" className={field} />
        </label>
      </div>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">{c('lines')}</legend>
        <div className="space-y-3">
          {rows.map((i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className="block lg:col-span-2">
                <span className="mb-1 block text-xs text-muted-foreground">
                  {c('description')}
                </span>
                <input name={`line_${i}_description`} className={small} />
              </label>
              <label className="block">
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
              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    {c('quantity')}
                  </span>
                  <input
                    name={`line_${i}_quantity`}
                    inputMode="decimal"
                    dir="ltr"
                    className={`numeric ${small}`}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    {c('unitPrice')}
                  </span>
                  <input
                    name={`line_${i}_unitPrice`}
                    inputMode="decimal"
                    dir="ltr"
                    className={`numeric ${small}`}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-muted-foreground">{t('encumbrance')}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('newOrder')}
      </button>
    </form>
  );
}

/** Whatever the order's state allows next. */
export function OrderActions({
  orderId,
  state: orderState,
  isMaker,
  mayApprove,
  currency,
}: {
  orderId: string;
  state: string;
  isMaker: boolean;
  mayApprove: boolean;
  currency: string;
}) {
  const [state, action, pending] = useActionState(transition, initial);
  const t = useTranslations('procurement.orders');
  const c = useTranslations('procurement.common');

  if (state.approved) {
    return (
      <p className="text-sm text-success">
        {t('approved', { encumbered: '' })}{' '}
        <Money amount={state.approved.encumbered} currency={currency} />
      </p>
    );
  }
  if (state.message) {
    return <p className="text-sm text-muted-foreground">{c('saved')}</p>;
  }

  const canSubmit = orderState === 'DRAFT' && isMaker;
  const canDecide = orderState === 'PENDING_APPROVAL' && mayApprove;
  const canCancel = orderState === 'APPROVED' && mayApprove;

  if (!canSubmit && !canDecide && !canCancel) return null;

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="orderId" value={orderId} />
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

      {(canDecide || canCancel) && (
        <label className="block min-w-48 flex-1">
          <span className="mb-1 block text-xs text-muted-foreground">{c('note')}</span>
          <input name="note" className={small} />
        </label>
      )}

      {canDecide && (
        <>
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

      {canCancel && (
        <button
          type="submit"
          name="how"
          value="cancel"
          disabled={pending}
          className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
        >
          {t('cancel')}
        </button>
      )}
    </form>
  );
}
