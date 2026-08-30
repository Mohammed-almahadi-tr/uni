'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Money } from '@/components/ui/money';
import type { AccountOption } from '@/lib/console/finance';
import type { PaymentProposalRow } from '@/lib/procurement/payments';
import { draft, transition, type PaymentState } from './actions';

const initial: PaymentState = {
  error: null,
  message: null,
  drafted: null,
  approved: null,
  mfaRequired: false,
};

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

const today = () => new Date().toISOString().slice(0, 10);

const MfaNotice = () => {
  const t = useTranslations('procurement.payments');
  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      <p>{t('mfaHint')}</p>
      <Link
        href={{ pathname: '/login/verify', query: { next: '/console/finance/payments' } }}
        className="mt-1 inline-block underline"
      >
        {t('mfaLink')}
      </Link>
    </div>
  );
};

/**
 * Draft a payment against what is due (Track D4, SRS REQ-PRC-05).
 *
 * The proposal is grouped by supplier because a payment voucher is to one
 * supplier: choosing a supplier filters the invoices to theirs, and a payment
 * spanning two suppliers is not a thing the module can express.
 */
export function DraftPayment({
  proposal,
  banks,
  currency,
  locale,
}: {
  proposal: PaymentProposalRow[];
  banks: AccountOption[];
  currency: string;
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(draft, initial);
  const t = useTranslations('procurement.payments');
  const c = useTranslations('procurement.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const vendors = [...new Map(proposal.map((p) => [p.vendorId, p])).values()];

  if (state.drafted) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('drafted', { paymentNo: state.drafted.paymentNo })}
      </p>
    );
  }

  if (proposal.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('noDue')}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      {state.mfaRequired && <MfaNotice />}
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
            {vendors.map((v) => (
              <option key={v.vendorId} value={v.vendorId}>
                {v.vendorCode} · {v.vendorName}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('date')}</span>
          <input
            name="paymentDate"
            type="date"
            required
            defaultValue={today()}
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('bankAccount')}</span>
          <select name="bankAccountId" required className={field}>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {pick(b.nameAr, b.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <input type="hidden" name="channel" value="BANK_TRANSFER" />
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">{c('note')}</span>
          <input name="reference" dir="ltr" className={field} />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                {c('vendor')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                {c('date')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                {c('amount')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                {c('total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {proposal.map((p) => (
              <tr key={p.invoiceId}>
                <td className="border-b border-border px-3 py-2">
                  <span className="numeric">{p.internalNo}</span>
                  <span className="block text-xs text-muted-foreground">
                    {p.vendorCode} · {p.vendorName}
                  </span>
                </td>
                <td className="numeric border-b border-border px-3 py-2">
                  {p.dueDate.toString().slice(0, 10)}
                  {p.daysOverdue > 0 && (
                    <span className="ms-2 text-xs text-warning">+{p.daysOverdue}</span>
                  )}
                </td>
                <td className="border-b border-border px-3 py-2 text-end">
                  <Money amount={p.outstanding} currency={currency} />
                </td>
                <td className="border-b border-border px-3 py-2 text-end">
                  <input
                    name={`pay_${p.invoiceId}`}
                    inputMode="decimal"
                    dir="ltr"
                    aria-label={p.internalNo}
                    className={`numeric ${small} w-32 text-end`}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">{t('blockedVendor')}</p>

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

/** Whatever the payment's state allows next. */
export function PaymentActions({
  paymentId,
  state: pvState,
  isMaker,
  mayApprove,
}: {
  paymentId: string;
  state: string;
  isMaker: boolean;
  mayApprove: boolean;
}) {
  const [state, action, pending] = useActionState(transition, initial);
  const t = useTranslations('procurement.payments');
  const c = useTranslations('procurement.common');

  if (state.approved) {
    return (
      <p className="text-sm text-success">
        {t('approved', { voucherRef: state.approved.voucherRef })}
      </p>
    );
  }
  if (state.message) return <p className="text-sm text-muted-foreground">{c('saved')}</p>;

  const canSubmit = pvState === 'DRAFT' && isMaker;
  const canDecide = pvState === 'PENDING_APPROVAL' && mayApprove;
  if (!canSubmit && !canDecide) return null;

  return (
    <div className="space-y-2">
      {state.mfaRequired && <MfaNotice />}
      <form action={action} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="paymentId" value={paymentId} />
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
    </div>
  );
}
