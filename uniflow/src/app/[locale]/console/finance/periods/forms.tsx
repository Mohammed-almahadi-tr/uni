'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { changeStatus, type PeriodState } from './actions';

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
