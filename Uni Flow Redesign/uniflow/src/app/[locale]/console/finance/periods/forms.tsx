'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { changeStatus, seal, type PeriodState } from './actions';

const initial: PeriodState = { error: null, changed: false };

/** Open or close one period. Which button appears is decided by its state. */
export function PeriodToggle({ periodId, status }: { periodId: string; status: string }) {
  const [state, action, pending] = useActionState(changeStatus, initial);
  const t = useTranslations('procurement.periods');
  const c = useTranslations('procurement.common');

  if (state.changed) {
    return <span className="text-xs text-success">{t('changed')}</span>;
  }
  if (status === 'PERMANENTLY_CLOSED') {
    return <span className="text-xs text-muted-foreground">{t('permanent')}</span>;
  }

  const next = status === 'OPEN' ? 'CLOSED' : 'OPEN';

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="periodId" value={periodId} />
      <input type="hidden" name="status" value={next} />
      {state.error && (
        <span role="alert" className="text-xs text-destructive">
          {state.error}
        </span>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : next === 'CLOSED' ? t('close') : t('open')}
      </button>
    </form>
  );
}

/**
 * Sealing a period (Track D5, SRS REQ-PER-02).
 *
 * `PERMANENTLY_CLOSED` is the one state in this module with no way back — not
 * for a financial controller, not for anybody. So it asks for a typed word
 * rather than a click.
 *
 * That is not friction for its own sake. The button beside it says "Close it"
 * and is reversible; two adjacent buttons where one is undoable and the other
 * is not, distinguished only by their labels, is how a year gets sealed by
 * somebody who meant to close a month.
 */
export function SealPeriod({ periodId }: { periodId: string }) {
  const [state, action, pending] = useActionState(seal, initial);
  const t = useTranslations('period');
  const c = useTranslations('procurement.common');

  if (state.changed) return <span className="text-sm text-success">{t('sealed')}</span>;

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="periodId" value={periodId} />
      {state.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">{t('sealConfirm')}</span>
        <input
          name="confirm"
          required
          autoComplete="off"
          className="h-9 w-40 rounded-md border border-input bg-background px-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-destructive/50 px-4 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        {pending ? c('working') : t('seal')}
      </button>
    </form>
  );
}
