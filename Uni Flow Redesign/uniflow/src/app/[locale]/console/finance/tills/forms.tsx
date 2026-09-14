'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { AccountOption } from '@/lib/console/finance';
import { assign, type TillState } from './actions';

const initial: TillState = { error: null, assigned: false };

/** Assign one cashier their safe (Track D2). */
export function AssignTill({
  userId,
  accounts,
  currentAccountId,
  locale,
}: {
  userId: string;
  accounts: AccountOption[];
  currentAccountId: string | null;
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(assign, initial);
  const t = useTranslations('finance.tills');
  const c = useTranslations('finance.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  if (state.assigned) {
    return <p className="text-sm text-success">{t('assigned')}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      {state.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
      <label className="block min-w-56 flex-1">
        <span className="mb-1 block text-xs text-muted-foreground">{t('account')}</span>
        <select
          name="cashAccountId"
          defaultValue={currentAccountId ?? ''}
          required
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        >
          <option value="" disabled>
            —
          </option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} · {pick(a.nameAr, a.nameEn)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('assign')}
      </button>
    </form>
  );
}
