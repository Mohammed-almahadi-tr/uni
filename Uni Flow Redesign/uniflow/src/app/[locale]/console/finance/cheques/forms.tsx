'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/components/ui/money';
import type { AccountOption, FeeItemOption } from '@/lib/console/finance';
import type { PortfolioItem } from '@/lib/cheques/pipeline';
import { bounce, clear, deposit, handBack, type ChequeState } from './actions';

const initial: ChequeState = {
  error: null,
  message: null,
  voucherRef: null,
  count: 0,
  total: null,
  reinstated: null,
  creditWithdrawn: null,
};

const today = () => new Date().toISOString().slice(0, 10);
const iso = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/**
 * The portfolio, with the batch actions its status allows (Track D2).
 *
 * **A cheque is in exactly one state, and the state decides what can be done
 * to it.** In hand → send to the bank. With the bank → cleared, or returned.
 * The legacy grid showed *Cleared* and *Rejected* buttons on every row of
 * every status, so a cleared cheque could be un-cleared by a mis-click and
 * neither click posted anything (frmCheqClearingSystem.vb:72-115).
 *
 * The batch is a form of checkboxes rather than a click per row for the same
 * reason `depositCheques` posts one voucher for many cheques: the bank
 * credits a deposit slip as a single item, and a ledger that cannot be tied
 * back to the slip cannot be reconciled against the statement.
 */
export function Portfolio({
  rows,
  status,
  banks,
  currency,
  locale,
}: {
  rows: PortfolioItem[];
  status: string;
  banks: AccountOption[];
  currency: string;
  locale: 'ar' | 'en';
}) {
  const [depositState, depositAction, depositing] = useActionState(deposit, initial);
  const [clearState, clearAction, clearing] = useActionState(clear, initial);
  const t = useTranslations('finance.cheques');
  const c = useTranslations('finance.common');
  const st = useTranslations('finance.chequeStatus');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const canDeposit = status === 'RECEIVED';
  const canClear = status === 'SENT_TO_BANK';
  const state = depositState.message ? depositState : clearState;
  const pending = depositing || clearing;
  const error = depositState.error ?? clearState.error;

  const table = (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {(canDeposit || canClear) && <th className="border-b border-border px-3 py-2" />}
            <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
              {t('chequeNo')}
            </th>
            <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
              {t('drawer')}
            </th>
            <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
              {t('bank')}
            </th>
            <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
              {t('due')}
            </th>
            <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
              {c('amount')}
            </th>
            <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
              {c('status')}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {(canDeposit || canClear) && (
                <td className="border-b border-border px-3 py-2">
                  <input
                    type="checkbox"
                    name="cheque"
                    value={r.id}
                    aria-label={r.chequeNo}
                    className="h-5 w-5"
                  />
                </td>
              )}
              <td className="numeric border-b border-border px-3 py-2">{r.chequeNo}</td>
              <td className="border-b border-border px-3 py-2">{r.drawerName ?? '—'}</td>
              <td className="border-b border-border px-3 py-2">{r.bankName ?? '—'}</td>
              <td className="border-b border-border px-3 py-2">
                <span className="numeric">{iso(r.dueDate)}</span>
                {r.daysToDue < 0 && r.status !== 'CLEARED' && (
                  <span className="ms-2 text-xs text-warning">{t('overdue')}</span>
                )}
              </td>
              <td className="border-b border-border px-3 py-2 text-end">
                <Money amount={r.amount} currency={currency} />
              </td>
              <td className="border-b border-border px-3 py-2">{st(r.status)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (!canDeposit && !canClear) return table;

  return (
    <form action={canDeposit ? depositAction : clearAction} className="space-y-4">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {error}
        </p>
      )}
      {state.message === 'deposited' && (
        <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          {t('deposited', {
            count: state.count,
            total: state.total ?? '',
            voucherRef: state.voucherRef ?? '',
          })}
        </p>
      )}
      {state.message === 'cleared' && (
        <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          {t('cleared', {
            count: state.count,
            total: state.total ?? '',
            voucherRef: state.voucherRef ?? '',
          })}
        </p>
      )}

      {table}

      <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
        {canDeposit && (
          <label className="block min-w-56">
            <span className="mb-1 block text-sm font-medium">{t('depositTo')}</span>
            <select
              name="bankAccountId"
              required
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {banks.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.code} · {pick(b.nameAr, b.nameEn)}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('date')}</span>
          <input
            name="docDate"
            type="date"
            defaultValue={today()}
            className="numeric h-11 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('reference')}</span>
          <input
            name="reference"
            dir="ltr"
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? c('working') : canDeposit ? t('deposit') : t('clear')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        {canDeposit ? t('depositHint') : t('clearHint')}
      </p>
    </form>
  );
}

/**
 * A return, or a hand-back (Track D2, SRS REQ-CHQ-03).
 *
 * Two different things behind one panel, and the difference is who decided.
 * A **return** is the bank's decision and carries its stated reason verbatim;
 * a **hand-back** is the institution's own, needs a second factor, and cannot
 * be done by whoever took the money. Both reinstate the debt, and the legacy
 * screen did neither: `Set CheqClear=0` left the student showing as paid.
 */
export function SettleCheque({
  chequeId,
  feeItems,
  mayCancel,
  currency,
  locale,
}: {
  chequeId: string;
  feeItems: FeeItemOption[];
  mayCancel: boolean;
  currency: string;
  locale: 'ar' | 'en';
}) {
  const [bounceState, bounceAction, bouncing] = useActionState(bounce, initial);
  const [backState, backAction, handing] = useActionState(handBack, initial);
  const [mode, setMode] = useState<'none' | 'bounce' | 'back'>('none');
  const [penalty, setPenalty] = useState(false);
  const t = useTranslations('finance.cheques');
  const c = useTranslations('finance.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const done = bounceState.message ?? backState.message;
  const ref = bounceState.voucherRef ?? backState.voucherRef;
  const reinstated = bounceState.reinstated ?? backState.reinstated;
  const withdrawn = bounceState.creditWithdrawn ?? backState.creditWithdrawn;
  const error = bounceState.error ?? backState.error;

  if (done) {
    return (
      <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        <p>
          {done === 'bounced'
            ? t('bounced', { reinstated: reinstated ?? '', voucherRef: ref ?? '' })
            : t('handedBack', { voucherRef: ref ?? '' })}
        </p>
        {reinstated && Number(reinstated) > 0 && (
          <p className="mt-1">
            {t('reinstated')}: <Money amount={reinstated} currency={currency} />
          </p>
        )}
        {withdrawn && Number(withdrawn) > 0 && (
          <p className="mt-1">
            {t('creditWithdrawn')}: <Money amount={withdrawn} currency={currency} />
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setMode('bounce')}
            className="h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
          >
            {t('bounce')}
          </button>
          {mayCancel && (
            <button
              type="button"
              onClick={() => setMode('back')}
              className="h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              {t('handBack')}
            </button>
          )}
        </div>
      )}

      {mode === 'bounce' && (
        <form action={bounceAction} className="space-y-4">
          <input type="hidden" name="chequeId" value={chequeId} />
          <p className="text-sm text-muted-foreground">{t('bounceHint')}</p>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block sm:col-span-2">
              <span className="mb-1 block text-sm font-medium">{t('bounceReason')}</span>
              <input
                name="reason"
                required
                autoFocus
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{t('bounceCode')}</span>
              <input
                name="reasonCode"
                dir="ltr"
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{c('date')}</span>
              <input
                name="docDate"
                type="date"
                defaultValue={today()}
                className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
          </div>

          {feeItems.length > 0 && (
            <div className="rounded-md border border-border p-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={penalty}
                  onChange={(e) => setPenalty(e.target.checked)}
                  className="h-5 w-5"
                />
                {t('penalty')}
              </label>
              {penalty && (
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">{t('penaltyItem')}</span>
                    <select
                      name="penaltyFeeItemId"
                      className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {feeItems.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.code} · {pick(f.nameAr, f.nameEn)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium">{t('penaltyAmount')}</span>
                    <input
                      name="penaltyAmount"
                      inputMode="decimal"
                      dir="ltr"
                      className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={bouncing}
              className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {bouncing ? c('working') : t('bounce')}
            </button>
            <button
              type="button"
              onClick={() => setMode('none')}
              className="h-11 rounded-md px-4 text-sm text-muted-foreground hover:bg-muted"
            >
              {c('cancel')}
            </button>
          </div>
        </form>
      )}

      {mode === 'back' && (
        <form action={backAction} className="space-y-4">
          <input type="hidden" name="chequeId" value={chequeId} />
          <p className="text-sm text-muted-foreground">{t('handBackHint')}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{c('reason')}</span>
              <input
                name="reason"
                required
                autoFocus
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium">{c('date')}</span>
              <input
                name="docDate"
                type="date"
                defaultValue={today()}
                className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={handing}
              className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {handing ? c('working') : t('handBack')}
            </button>
            <button
              type="button"
              onClick={() => setMode('none')}
              className="h-11 rounded-md px-4 text-sm text-muted-foreground hover:bg-muted"
            >
              {c('cancel')}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
