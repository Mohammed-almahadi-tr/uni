'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { verify, type VerifyState } from './actions';

const initial: VerifyState = { error: null, result: null };

/**
 * Verify the hash chain on demand.
 *
 * The result is deliberately loud in both directions. "Intact, n entries
 * checked" is the answer an auditor came for; a break names the sequence
 * number it starts at, because that is where somebody has to look.
 */
export function VerifyChain() {
  const [state, action, pending] = useActionState(verify, initial);
  const t = useTranslations('settings.audit');
  const c = useTranslations('settings.common');

  return (
    <form action={action} className="space-y-3">
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      {state.result &&
        (state.result.ok ? (
          <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
            {t('verified', { count: state.result.entriesChecked })}
          </p>
        ) : (
          <p
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
          >
            {t('broken', {
              seq: state.result.brokenAtSeq ?? '?',
              reason: state.result.reason ?? '',
            })}
          </p>
        ))}

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : t('verify')}
      </button>
      <p className="text-xs text-muted-foreground">{t('verifyHint')}</p>
    </form>
  );
}
