'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/components/ui/money';
import type { AccountOption } from '@/lib/console/finance';
import type { FiscalYearRow } from '@/lib/console/backoffice';
import { depreciate, dispose, type AssetState } from './actions';

const initial: AssetState = { error: null, run: null, disposed: null };

const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

/**
 * The period-end charge (Track D4, SRS REQ-AST-03).
 *
 * Only open periods are offered. Depreciation posts, and a posting into a
 * closed period is refused by the ledger — offering the choice and then
 * failing would teach an operator that the button is unreliable rather than
 * that the period is shut.
 *
 * What was skipped is reported, not swallowed. An asset quietly left out
 * every period is an asset that never depreciates, and nobody would know.
 */
export function RunDepreciation({
  years,
  currency,
}: {
  years: FiscalYearRow[];
  currency: string;
}) {
  const [state, action, pending] = useActionState(depreciate, initial);
  const t = useTranslations('procurement.assets');
  const c = useTranslations('procurement.common');

  const open = years.flatMap((y) =>
    y.periods.filter((p) => p.status === 'OPEN').map((p) => ({ ...p, year: y.name })),
  );

  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {state.error}
        </p>
      )}
      {state.run && (
        <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          <p>
            {t('depreciated', { count: state.run.count, total: '' })}{' '}
            <Money amount={state.run.total} currency={currency} />
          </p>
          {state.run.voucherRef && (
            <p className="numeric mt-1 text-xs text-muted-foreground">
              {state.run.voucherRef}
            </p>
          )}
          {state.run.skipped.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {state.run.skipped.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {open.length === 0 ? (
        <p className="text-sm text-muted-foreground">{c('nothing')}</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-56">
            <span className="mb-1 block text-sm font-medium">{t('period')}</span>
            <select name="fiscalPeriodId" required className={small}>
              {open.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.year} · {p.startDate} → {p.endDate}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? c('working') : t('runDepreciation')}
          </button>
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t('legacy')}</p>
    </form>
  );
}

/** Take one asset off the books. */
export function DisposeAsset({
  assetId,
  banks,
  currency,
  netBookValue,
  locale,
}: {
  assetId: string;
  banks: AccountOption[];
  currency: string;
  netBookValue: string;
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(dispose, initial);
  const [open, setOpen] = useState(false);
  const t = useTranslations('procurement.assets');
  const c = useTranslations('procurement.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  if (state.disposed) {
    return (
      <p className="text-xs text-success">
        <Money amount={state.disposed.gainOrLoss} currency={currency} />{' '}
        <span className="numeric text-muted-foreground">{state.disposed.voucherRef}</span>
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
      >
        {c('confirm')}
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-md border border-border p-3">
      <input type="hidden" name="assetId" value={assetId} />
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        {t('netBookValue')}: <Money amount={netBookValue} currency={currency} />
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{c('date')}</span>
          <input name="disposedOn" type="date" required className={`numeric ${small}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{c('amount')}</span>
          <input name="proceeds" inputMode="decimal" dir="ltr" className={`numeric ${small}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{c('account')}</span>
          <select name="proceedsAccountId" defaultValue="" className={small}>
            <option value="">{c('none')}</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {pick(b.nameAr, b.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{c('reason')}</span>
          <input name="reason" required className={small} />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? c('working') : c('confirm')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
        >
          {c('cancel')}
        </button>
      </div>
    </form>
  );
}
