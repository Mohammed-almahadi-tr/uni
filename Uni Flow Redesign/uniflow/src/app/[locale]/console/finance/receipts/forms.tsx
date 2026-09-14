'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { cancel, type CancelState } from './actions';

const initial: CancelState = { error: null, voucherRef: null };

/**
 * Cancel one receipt (Track D2).
 *
 * The reason is demanded in the same submission as the cancellation, because
 * a reason collected afterwards is a reason nobody writes. `cancelReceipt`
 * refuses an empty one, so this is the field, not the rule.
 */
export function CancelReceipt({ receiptId }: { receiptId: string }) {
  const [state, action, pending] = useActionState(cancel, initial);
  const [open, setOpen] = useState(false);
  const t = useTranslations('finance.receipts');
  const c = useTranslations('finance.common');

  if (state.voucherRef) {
    return (
      <p className="text-sm text-muted-foreground">
        {t('cancelled', { voucherRef: state.voucherRef })}
      </p>
    );
  }

  if (!open) {
    return (
      <div className="space-y-1">
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10"
        >
          {t('cancel')}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="receiptId" value={receiptId} />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">{t('cancelReason')}</span>
        <input
          name="reason"
          required
          autoFocus
          className="h-9 w-full min-w-56 rounded-md border border-input bg-background px-2 text-sm"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
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
      <p className="text-xs text-muted-foreground">{t('cancelHint')}</p>
    </form>
  );
}
