'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { create, type VoucherState } from './actions';

const initial: VoucherState = { error: null, saved: null, submitted: false, abandoned: false };

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Start a voucher (Track D2).
 *
 * Two fields, because a draft is allowed to be incomplete and the lines are
 * entered on the next screen. What is *not* optional is the description: a
 * voucher nobody can explain in a sentence is a voucher a reviewer will
 * approve without understanding, and `createDraft` refuses an empty one.
 *
 * There is no voucher-type dropdown. This screen makes journal vouchers;
 * every other type belongs to the module that owns the document it records.
 */
export function NewVoucher({ locale }: { locale: string }) {
  const [state, action, pending] = useActionState(create, initial);
  const t = useTranslations('finance.vouchers');
  const c = useTranslations('finance.common');

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="locale" value={locale} />
      {state.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
      <label className="block min-w-64 flex-1">
        <span className="mb-1 block text-sm font-medium">{t('description')}</span>
        <input
          name="description"
          required
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('docDate')}</span>
        <input
          name="docDate"
          type="date"
          defaultValue={today()}
          className="numeric h-11 rounded-md border border-input bg-background px-3 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('newDraft')}
      </button>
    </form>
  );
}
