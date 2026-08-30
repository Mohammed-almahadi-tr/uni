'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { Named, ProgrammeRow } from '@/lib/console/backoffice';
import { setQuota, type QuotaState } from './actions';

const initial: QuotaState = { error: null, seats: null };

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * Set or adjust a quota (Track D4).
 *
 * The three dimensions are chosen on creation and fixed thereafter — the
 * database enforces it — so a second submission for the same three adjusts
 * the seat count rather than making a second quota. That is why this is one
 * form rather than a create form and an edit form.
 */
export function SetQuota({
  batchId,
  programmes,
  categories,
  locale,
}: {
  batchId: string;
  programmes: ProgrammeRow[];
  categories: Named[];
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(setQuota, initial);
  const t = useTranslations('academic.capacity');
  const c = useTranslations('academic.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  if (state.seats !== null) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('quotaSet', { seats: state.seats })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="batchId" value={batchId} />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-medium">{t('programme')}</span>
          <select name="programmeId" required className={field}>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {pick(p.nameAr, p.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('code')}</span>
          <select name="admissionCategoryId" required className={field}>
            {categories.map((a) => (
              <option key={a.id} value={a.id}>
                {pick(a.nameAr, a.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('seats')}</span>
          <input
            name="seats"
            type="number"
            min={0}
            required
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('reserved')}</span>
          <input
            name="reservedSeats"
            type="number"
            min={0}
            defaultValue={0}
            className={`numeric ${field}`}
          />
        </label>
        <label className="flex items-center gap-2 self-end pb-3 text-sm">
          <input type="checkbox" name="allowOverride" className="h-5 w-5" />
          {t('allowOverride')}
        </label>
      </div>

      <p className="text-xs text-muted-foreground">{t('immutable')}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('setQuota')}
      </button>
    </form>
  );
}
