'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { VendorOption } from '@/lib/console/backoffice';
import { addVendor, block, decideBank, proposeBank, type VendorState } from './actions';

const initial: VendorState = { error: null, message: null };

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

const Err = ({ children }: { children: React.ReactNode }) =>
  children ? (
    <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
      {children}
    </p>
  ) : null;

export function AddVendor() {
  const [state, action, pending] = useActionState(addVendor, initial);
  const t = useTranslations('procurement.vendors');
  const c = useTranslations('procurement.common');

  if (state.message === 'added') {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {c('added')}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Err>{state.error}</Err>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('code')}</span>
          <input name="code" required dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameAr')}</span>
          <input name="nameAr" required dir="rtl" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameEn')}</span>
          <input name="nameEn" required dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('taxNo')}</span>
          <input name="taxRegistrationNo" dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('category')}</span>
          <input name="category" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('paymentTerms')}</span>
          <input
            name="paymentTermsDays"
            type="number"
            min={0}
            defaultValue={30}
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('contact')}</span>
          <input name="contactName" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('phone')}</span>
          <input name="phone" dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('email')}</span>
          <input name="email" type="email" dir="ltr" className={field} />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-sm font-medium">{t('address')}</span>
          <input name="address" className={field} />
        </label>
      </div>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('addVendor')}
      </button>
    </form>
  );
}

/**
 * Propose new bank details (Track D4).
 *
 * The form says plainly that this takes effect only on a second signature,
 * because a clerk who believes they have changed the account will not chase
 * the approval — and the supplier will be paid to the old one, which is the
 * failure that looks like the system was wrong.
 */
export function ProposeBank({ vendors, locale }: { vendors: VendorOption[]; locale: 'ar' | 'en' }) {
  const [state, action, pending] = useActionState(proposeBank, initial);
  const t = useTranslations('procurement.vendors');
  const c = useTranslations('procurement.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  if (state.message === 'requested') {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('requested')}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Err>{state.error}</Err>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block lg:col-span-2">
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
          <span className="mb-1 block text-sm font-medium">{t('bankName')}</span>
          <input name="bankName" required className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('accountName')}</span>
          <input name="bankAccountName" required className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('accountNo')}</span>
          <input name="bankAccountNo" required dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('iban')}</span>
          <input name="bankIban" dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-sm font-medium">{c('reason')}</span>
          <input name="reason" required className={field} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('bankFraudHint')}</p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('requestChange')}
      </button>
    </form>
  );
}

/** Approve or refuse a proposed bank change. */
export function DecideBank({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(decideBank, initial);
  const t = useTranslations('procurement.vendors');
  const c = useTranslations('procurement.common');

  if (state.message === 'decided') {
    return <p className="text-sm text-success">{t('changeDone')}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="requestId" value={requestId} />
      {state.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
      <label className="block min-w-56 flex-1">
        <span className="mb-1 block text-xs text-muted-foreground">{c('note')}</span>
        <input name="reason" className={small} />
      </label>
      <button
        type="submit"
        name="how"
        value="approve"
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('approveChange')}
      </button>
      <button
        type="submit"
        name="how"
        value="reject"
        disabled={pending}
        className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {t('rejectChange')}
      </button>
    </form>
  );
}

/** Stop dealing with a supplier. */
export function BlockVendor({ vendorId }: { vendorId: string }) {
  const [state, action, pending] = useActionState(block, initial);
  const [open, setOpen] = useState(false);
  const t = useTranslations('procurement.vendors');
  const c = useTranslations('procurement.common');

  if (state.message === 'blocked') {
    return <p className="text-xs text-muted-foreground">{t('blocked_')}</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
      >
        {t('block')}
      </button>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="vendorId" value={vendorId} />
      {state.error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {state.error}
        </p>
      )}
      <label className="block min-w-56 flex-1">
        <span className="mb-1 block text-xs text-muted-foreground">{c('reason')}</span>
        <input name="reason" required autoFocus className={small} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {pending ? c('working') : t('block')}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
      >
        {c('cancel')}
      </button>
    </form>
  );
}
