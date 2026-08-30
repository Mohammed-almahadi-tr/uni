'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AccountOption, CostCenterOption } from '@/lib/console/finance';
import type { OrderRow, VendorOption } from '@/lib/console/backoffice';
import { decide, record, type InvoiceState } from './actions';

const initial: InvoiceState = { error: null, recorded: null, decided: null };

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

/**
 * Record an invoice (Track D4, SRS REQ-PRC-04).
 *
 * Choosing an order fills the line picker with that order's lines, so the
 * match has something to match against. Choosing none is the utility-bill
 * case: no order, still an account and still an approver.
 *
 * What the match found is reported on the result, not hidden. An invoice held
 * with no stated reason is one somebody will release without reading.
 */
export function RecordInvoice({
  vendors,
  orders,
  accounts,
  costCentres,
  locale,
}: {
  vendors: VendorOption[];
  orders: OrderRow[];
  accounts: AccountOption[];
  costCentres: CostCenterOption[];
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(record, initial);
  const [orderId, setOrderId] = useState('');
  const t = useTranslations('procurement.invoices');
  const c = useTranslations('procurement.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const chosen = orders.find((o) => o.id === orderId);
  const rows = [0, 1, 2, 3];

  if (state.recorded) {
    return (
      <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        <p>{t('recorded', { internalNo: state.recorded.internalNo })}</p>
        {state.recorded.issues.length > 0 && (
          <>
            <p className="mt-2 font-medium">{t('matchIssues')}</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5 text-muted-foreground">
              {state.recorded.issues.map((i, k) => (
                <li key={k}>{i}</li>
              ))}
            </ul>
          </>
        )}
      </div>
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
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('vendor')}</span>
          <select name="vendorId" required className={field}>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.code} · {pick(v.nameAr, v.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('invoiceNo')}</span>
          <input name="vendorInvoiceNo" required dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('invoiceDate')}</span>
          <input name="invoiceDate" type="date" required className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('dueDate')}</span>
          <input name="dueDate" type="date" className={`numeric ${field}`} />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">{c('vendor')}</span>
          <select
            name="purchaseOrderId"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className={field}
          >
            <option value="">{t('nonPo')}</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                {o.poNo} · {o.vendorName}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-muted-foreground">{t('nonPoHint')}</span>
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
              {chosen ? (
                <label className="block">
                  <span className="mb-1 block text-xs text-muted-foreground">
                    {c('lines')}
                  </span>
                  <select name={`line_${i}_poLineId`} defaultValue="" className={small}>
                    <option value="">—</option>
                    {chosen.lines.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.lineNo}. {l.description}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
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
              )}
              {chosen && (
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
              )}
              {!chosen && (
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
              )}
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

      <p className="text-xs text-muted-foreground">{t('threeWay')}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('record')}
      </button>
    </form>
  );
}

/** Release a held invoice or refuse it. Both demand a reason. */
export function HeldDecision({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(decide, initial);
  const t = useTranslations('procurement.invoices');
  const c = useTranslations('procurement.common');

  if (state.decided === 'approved') return <p className="text-sm text-success">{t('approved')}</p>;
  if (state.decided === 'rejected') {
    return <p className="text-sm text-muted-foreground">{t('rejected')}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="invoiceId" value={invoiceId} />
      {state.error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {state.error}
        </p>
      )}
      <label className="block min-w-56 flex-1">
        <span className="mb-1 block text-xs text-muted-foreground">{c('reason')}</span>
        <input name="reason" required className={small} />
      </label>
      <button
        type="submit"
        name="how"
        value="approve"
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('approveHeld')}
      </button>
      <button
        type="submit"
        name="how"
        value="reject"
        disabled={pending}
        className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {t('rejectHeld')}
      </button>
    </form>
  );
}
