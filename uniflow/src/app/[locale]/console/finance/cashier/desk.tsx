'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Money } from '@/components/ui/money';
import type { AccountOption } from '@/lib/console/finance';
import type { OutstandingChargeLine } from '@/lib/cashier/receipt';
import type { StudentBalance } from '@/lib/students/account';
import { applyCredit, priceOrTake, type DeskState } from './actions';

const CHANNELS = ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'GATEWAY'] as const;

const initial: DeskState = {
  error: null,
  balance: null,
  preview: null,
  result: null,
  applied: null,
};

const today = () => new Date().toISOString().slice(0, 10);

/** A charge date arrives from the server as a Date. `toString()` on one gives
 *  "Mon Aug 31 2026 …" in the browser's locale, which is neither the stored
 *  value nor readable beside tabular figures. */
const iso = (d: Date | string) => new Date(d).toISOString().slice(0, 10);

/**
 * The cashier desk (Track D2, SRS REQ-CSH-01).
 *
 * **Price → allocate → take**, on one screen, with the split visible before
 * the money is recorded: this much settles charges, this much becomes a
 * credit balance the institution owes back.
 *
 * That second figure is the point. The legacy chart had no control account
 * and no charge to allocate against, so every receipt was credited whole
 * against a student's *name* and an overpayment showed as a negative asset —
 * and the grid a cashier worked in listed two hardcoded rows, "Tuition Fees"
 * and "Registration Fees" (frmStudantReceiptVoucher.vb:105-106), whatever the
 * student had actually been billed.
 *
 * ## The idempotency key
 *
 * Minted once in the browser, held in state, and resent unchanged on every
 * retry until a receipt comes back. A cashier on an unreliable link presses
 * Save, sees nothing, and presses it again — that is the ordinary condition
 * at these campuses, and it is the highest-risk duplicate path in the
 * product. `takeReceipt` requires the key rather than accepting one, so this
 * decision could not be forgotten here.
 */
export function CashierDesk({
  studentId,
  charges,
  balance,
  banks,
  hasTill,
  currency,
  locale,
}: {
  studentId: string;
  charges: OutstandingChargeLine[];
  balance: StudentBalance;
  banks: AccountOption[];
  hasTill: boolean;
  currency: string;
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(priceOrTake, initial);
  const [creditState, creditAction, applying] = useActionState(applyCredit, initial);
  const [channel, setChannel] = useState<string>(hasTill ? 'CASH' : 'BANK_TRANSFER');
  // Regenerated only once a receipt has actually been issued, so every retry
  // of the same payment carries the same key.
  const [key, setKey] = useState(() => crypto.randomUUID());

  const t = useTranslations('finance.cashier');
  const c = useTranslations('finance.common');
  const ch = useTranslations('finance.channel');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const live = state.balance ?? creditState.balance ?? balance;
  const preview = state.preview;
  const done = state.result;
  const rows = preview?.charges ?? charges;
  const settling = new Map((preview?.plan ?? []).map((p) => [p.chargeId, p.amount]));
  const error = state.error ?? creditState.error;
  const applied = creditState.applied;

  if (done) {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-success/40 bg-success/10 p-5">
          <p className="font-medium">{t('taken', { receiptNo: done.receiptNo })}</p>
          <dl className="mt-3 flex flex-wrap gap-6 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{c('amount')}</dt>
              <dd>
                <Money amount={done.amount} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('allocated')}</dt>
              <dd>
                <Money amount={done.allocated} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('unallocated')}</dt>
              <dd>
                <Money amount={done.unallocated} currency={currency} />
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/console/finance/receipts?q=${encodeURIComponent(done.receiptNo)}`}
            className="h-11 rounded-md border border-border px-4 text-sm font-medium leading-[2.75rem] hover:bg-muted"
          >
            {done.receiptNo}
          </Link>
          <button
            type="button"
            onClick={() => {
              setKey(crypto.randomUUID());
              window.location.reload();
            }}
            className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {t('another')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {error}
        </p>
      )}

      {applied && (
        <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          {t('applied', { amount: applied })}
        </p>
      )}

      {/* ---- Where the account stands ------------------------------------ */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="mb-3 font-semibold">{t('account')}</h2>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-xs text-muted-foreground">{t('charged')}</dt>
            <dd>
              <Money amount={live.charged} currency={currency} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('settled')}</dt>
            <dd>
              <Money amount={live.settled} currency={currency} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('creditBalance')}</dt>
            <dd>
              <Money amount={live.creditBalance} currency={currency} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t('netDue')}</dt>
            <dd className="font-semibold">
              <Money amount={live.netDue} currency={currency} />
            </dd>
          </div>
        </dl>

        {Number(live.creditBalance) > 0 && Number(live.outstanding) > 0 && (
          <form action={creditAction} className="mt-4 border-t border-border pt-4">
            <input type="hidden" name="studentId" value={studentId} />
            <button
              type="submit"
              disabled={applying}
              className="h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {applying ? c('working') : t('applyCredit')}
            </button>
            <p className="mt-2 text-xs text-muted-foreground">{t('applyCreditHint')}</p>
          </form>
        )}
      </section>

      <form action={action} className="space-y-6">
        <input type="hidden" name="studentId" value={studentId} />
        <input type="hidden" name="idempotencyKey" value={key} />

        {/* ---- What the money would settle ------------------------------- */}
        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-semibold">{t('charges')}</h2>
          </div>
          <div className="p-5">
            {rows.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noCharges')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                        {t('charge')}
                      </th>
                      <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                        {t('due')}
                      </th>
                      <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                        {t('outstanding')}
                      </th>
                      <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                        {t('allocate')}
                      </th>
                      <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                        {t('willSettle')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.chargeId}>
                        <td className="border-b border-border px-3 py-2 align-top">
                          {pick(r.nameAr, r.nameEn)}
                          {r.termLabel && (
                            <span className="block text-xs text-muted-foreground">
                              {r.termLabel}
                            </span>
                          )}
                        </td>
                        <td className="numeric border-b border-border px-3 py-2 align-top text-muted-foreground">
                          {iso(r.dueDate ?? r.docDate)}
                        </td>
                        <td className="border-b border-border px-3 py-2 text-end align-top">
                          <Money amount={r.outstanding} currency={currency} />
                        </td>
                        <td className="border-b border-border px-3 py-2 text-end align-top">
                          <input
                            name={`alloc_${r.chargeId}`}
                            type="text"
                            inputMode="decimal"
                            aria-label={`${pick(r.nameAr, r.nameEn)} — ${t('allocate')}`}
                            className="numeric h-9 w-28 rounded-md border border-input bg-background px-2 text-end text-sm"
                          />
                        </td>
                        <td className="border-b border-border px-3 py-2 text-end align-top">
                          {settling.has(r.chargeId) ? (
                            <Money amount={settling.get(r.chargeId)!} currency={currency} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-3 text-xs text-muted-foreground">{t('allocateHint')}</p>
          </div>
        </section>

        {/* ---- The payment ----------------------------------------------- */}
        <section className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2 lg:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('amountTaken')}</span>
            <input
              name="amount"
              type="text"
              inputMode="decimal"
              required
              dir="ltr"
              className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('channel')}</span>
            <select
              name="channel"
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              {CHANNELS.map((k) => (
                <option key={k} value={k} disabled={k === 'CASH' && !hasTill}>
                  {ch(k)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('docDate')}</span>
            <input
              name="docDate"
              type="date"
              defaultValue={today()}
              className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>

          {(channel === 'BANK_TRANSFER' || channel === 'GATEWAY') && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{t('bankAccount')}</span>
                <select
                  name="bankAccountId"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} · {pick(b.nameAr, b.nameEn)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{c('reference')}</span>
                <input
                  name="reference"
                  dir="ltr"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
            </>
          )}

          {channel === 'CHEQUE' && (
            <>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{t('chequeNo')}</span>
                <input
                  name="chequeNo"
                  required
                  dir="ltr"
                  className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{t('chequeDue')}</span>
                <input
                  name="chequeDueDate"
                  type="date"
                  required
                  className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{t('chequeBank')}</span>
                <input
                  name="chequeBank"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{t('chequeBranch')}</span>
                <input
                  name="chequeBranch"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-sm font-medium">{t('drawerName')}</span>
                <input
                  name="drawerName"
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>
            </>
          )}

          <label className="block sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block text-sm font-medium">{t('note')}</span>
            <input
              name="note"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            />
          </label>
        </section>

        {/* ---- The split, before anything is recorded --------------------- */}
        {preview && (
          <section className="rounded-lg border border-border bg-muted/40 p-5">
            <h2 className="mb-3 font-semibold">{t('plan')}</h2>
            <dl className="flex flex-wrap gap-8 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">{t('willSettle')}</dt>
                <dd className="text-base">
                  <Money amount={preview.allocated} currency={currency} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">{t('willCredit')}</dt>
                <dd className="text-base">
                  <Money amount={preview.unallocated} currency={currency} />
                </dd>
              </div>
            </dl>
            {preview.plan.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm">
                {preview.plan.map((p) => (
                  <li key={p.chargeId} className="flex flex-wrap items-baseline gap-2">
                    <span>{pick(p.nameAr, p.nameEn)}</span>
                    <Money amount={p.amount} currency={currency} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="price"
            disabled={pending}
            className="h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {pending ? c('working') : t('preview')}
          </button>
          {preview && (
            <button
              type="submit"
              name="intent"
              value="commit"
              disabled={pending}
              className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {t('take')}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
