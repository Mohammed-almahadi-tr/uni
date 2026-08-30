'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { approveDiscount, cancel, type DecisionState } from './actions';

const initial: DecisionState = { error: null, message: null };

/**
 * The two decisions a registration can receive (Track D3).
 *
 * Both are separate forms with separate action state, because they are
 * separate acts by (usually) separate people: approving a discount is
 * `discount.approve` and the engine refuses it to whoever applied the
 * discount; cancelling is `registration.cancel` and raises a linked reversal.
 * Putting them in one form would let a mis-click do the other one.
 */

export function ApproveDiscount({ registrationId }: { registrationId: string }) {
  const [state, action, pending] = useActionState(approveDiscount, initial);
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');

  if (state.message) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('registrations.approved', { voucher: state.message })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="registrationId" value={registrationId} />
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}
      <p className="text-sm text-muted-foreground">{t('registrations.approveHint')}</p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('registrations.approveDiscount')}
      </button>
    </form>
  );
}

export function CancelRegistration({ registrationId }: { registrationId: string }) {
  const [state, action, pending] = useActionState(cancel, initial);
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');

  if (state.message) {
    return (
      <p className="rounded-md border border-border bg-muted p-3 text-sm">
        {t('registrations.cancelled', { voucher: state.message })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="registrationId" value={registrationId} />
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <p className="text-sm text-muted-foreground">{t('registrations.cancelHint')}</p>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('registrations.cancelReason')}</span>
        <input
          name="reason"
          required
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('registrations.cancelDate')}</span>
        <input
          name="reversalDate"
          type="date"
          className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          {t('registrations.cancelDateHint')}
        </span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md border border-destructive/50 px-5 text-sm font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {pending ? c('working') : t('registrations.cancelTitle')}
      </button>
    </form>
  );
}
