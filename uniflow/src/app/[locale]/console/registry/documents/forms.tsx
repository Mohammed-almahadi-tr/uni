'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { reject, verify, type DocState } from './actions';

const initial: DocState = { error: null, verified: false, rejected: false };

/**
 * The verdict on one document (Track D3).
 *
 * Rejecting demands a reason in the same submission as the rejection, so the
 * student is told what was wrong with the file rather than that it "was not
 * accepted". `rejectDocument` refuses an empty one.
 */
export function DocumentVerdict({
  documentId,
  studentId,
}: {
  documentId: string;
  studentId: string;
}) {
  const [vState, verifyAction, verifying] = useActionState(verify, initial);
  const [rState, rejectAction, rejecting] = useActionState(reject, initial);
  const [showReject, setShowReject] = useState(false);
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');

  if (vState.verified) {
    return <p className="text-sm text-success">{t('documents.verified')}</p>;
  }
  if (rState.rejected) {
    return <p className="text-sm text-muted-foreground">{t('documents.rejected')}</p>;
  }

  const error = vState.error ?? rState.error;

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {showReject ? (
        <form action={rejectAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="documentId" value={documentId} />
          <input type="hidden" name="studentId" value={studentId} />
          <label className="block min-w-48 flex-1">
            <span className="mb-1 block text-xs text-muted-foreground">
              {t('documents.rejectReason')}
            </span>
            <input
              name="reason"
              required
              autoFocus
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={rejecting}
            className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {rejecting ? c('working') : t('documents.reject')}
          </button>
          <button
            type="button"
            onClick={() => setShowReject(false)}
            className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
          >
            {c('cancel')}
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap gap-2">
          <form action={verifyAction}>
            <input type="hidden" name="documentId" value={documentId} />
            <input type="hidden" name="studentId" value={studentId} />
            <button
              type="submit"
              disabled={verifying}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {verifying ? c('working') : t('documents.verify')}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setShowReject(true)}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            {t('documents.reject')}
          </button>
        </div>
      )}
    </div>
  );
}
