'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { approve, reject, review, type ApprovalState } from './actions';

const initial: ApprovalState = {
  error: null,
  mfaRequired: false,
  reviewed: false,
  rejected: false,
  voucherRef: null,
};

/**
 * The two checker decisions on one voucher (Track D2).
 *
 * Which button appears is decided by the voucher's state and the caller's
 * permissions, both established on the server. A control that is shown and
 * then refused teaches people that the refusal is arbitrary; a control that
 * is shown and *not* refused because the check was only in the button is the
 * legacy system, where every authenticated user could open this screen.
 *
 * A missing second factor is answered with a link, not a red box. The step-up
 * exists, it is two fields away, and turning it into an error message is how
 * a control becomes something people route around.
 */
export function Decision({
  draftId,
  stage,
}: {
  draftId: string;
  /** `review` passes it to the approver; `approve` posts it. */
  stage: 'review' | 'approve';
}) {
  const [state, action, pending] = useActionState(
    stage === 'review' ? review : approve,
    initial,
  );
  const [rejectState, rejectAction, rejecting] = useActionState(reject, initial);
  const [mode, setMode] = useState<'none' | 'reject'>('none');

  const t = useTranslations('finance.approvals');
  const c = useTranslations('finance.common');

  if (state.voucherRef) {
    return (
      <p className="text-sm text-success">
        {t('approved', { voucherRef: state.voucherRef })}
      </p>
    );
  }
  if (state.reviewed) return <p className="text-sm text-success">{t('reviewed')}</p>;
  if (rejectState.rejected) {
    return <p className="text-sm text-muted-foreground">{t('rejected')}</p>;
  }

  const error = state.error ?? rejectState.error;

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {state.mfaRequired && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <p>{t('mfaNeeded')}</p>
          <Link
            href={{
              pathname: '/login/verify',
              query: { next: '/console/finance/approvals' },
            }}
            className="mt-1 inline-block underline"
          >
            {t('mfaLink')}
          </Link>
        </div>
      )}

      {mode === 'reject' ? (
        <form action={rejectAction} className="space-y-2">
          <input type="hidden" name="draftId" value={draftId} />
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">
              {t('rejectReason')}
            </span>
            <input
              name="reason"
              required
              autoFocus
              className="h-9 w-full min-w-64 rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={rejecting}
              className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
            >
              {rejecting ? c('working') : t('reject')}
            </button>
            <button
              type="button"
              onClick={() => setMode('none')}
              className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
            >
              {c('cancel')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t('rejectHint')}</p>
        </form>
      ) : (
        <form action={action} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="draftId" value={draftId} />
          <label className="block min-w-48 flex-1">
            <span className="mb-1 block text-xs text-muted-foreground">{c('comment')}</span>
            <input
              name="comment"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? c('working') : stage === 'review' ? t('review') : t('approve')}
          </button>
          <button
            type="button"
            onClick={() => setMode('reject')}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            {t('reject')}
          </button>
        </form>
      )}
    </div>
  );
}
