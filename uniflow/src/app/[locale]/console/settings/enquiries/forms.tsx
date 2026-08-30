'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { handle, type EnquiryState } from './actions';

const initial: EnquiryState = { error: null, handled: false };

/** Acknowledge or close one enquiry, with what was done. */
export function HandleEnquiry({ inquiryId }: { inquiryId: string }) {
  const [state, action, pending] = useActionState(handle, initial);
  const t = useTranslations('settings.enquiries');
  const c = useTranslations('settings.common');

  if (state.handled) {
    return <p className="text-sm text-success">{c('saved')}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="inquiryId" value={inquiryId} />
      {state.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
      <label className="block min-w-56 flex-1">
        <span className="mb-1 block text-xs text-muted-foreground">{t('response')}</span>
        <input
          name="note"
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </label>
      <button
        type="submit"
        name="status"
        value="ACKNOWLEDGED"
        disabled={pending}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : t('acknowledge')}
      </button>
      <button
        type="submit"
        name="status"
        value="CLOSED"
        disabled={pending}
        className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {t('close')}
      </button>
    </form>
  );
}
