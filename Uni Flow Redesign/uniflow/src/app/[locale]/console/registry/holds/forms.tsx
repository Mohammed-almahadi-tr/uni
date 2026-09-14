'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { RoleOption } from '@/lib/console/lookups';
import { clear, place, type HoldState } from './actions';

const initial: HoldState = { error: null, placed: false, cleared: false };

const HOLD_TYPES = ['FINANCIAL', 'ACADEMIC', 'DISCIPLINARY', 'DOCUMENTARY'] as const;

/**
 * Placing a hold (Track D3).
 *
 * The reason box is required and is not a dropdown. B5's `placeHold` refuses
 * an empty one with the sentence that explains why: *a student turned away
 * from the registration desk has to be told what to go and fix.* A menu of
 * canned reasons would satisfy the field and defeat the purpose.
 */
export function PlaceHold({
  studentId,
  roles,
  locale,
}: {
  studentId: string;
  roles: RoleOption[];
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(place, initial);
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}
      {state.placed && (
        <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
          {t('holds.placed')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('holds.type')}</span>
          <select
            name="holdType"
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {HOLD_TYPES.map((h) => (
              <option key={h} value={h}>
                {t(`holdType.${h}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('holds.effectiveFrom')}</span>
          <input
            name="effectiveFrom"
            type="date"
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('holds.reason')}</span>
        <textarea
          name="reason"
          required
          rows={2}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
        <span className="mt-1 block text-xs text-muted-foreground">{t('holds.reasonHint')}</span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('holds.clearanceRole')}</span>
        <select
          name="clearanceRoleId"
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{c('none')}</option>
          {roles.map((r) => (
            <option key={r.id} value={r.id}>
              {locale === 'ar' ? r.nameAr : r.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="blocksRegistration"
          defaultChecked
          className="h-4 w-4"
        />
        {t('holds.blocks')}
        <span className="text-xs text-muted-foreground">— {t('holds.blocksHint')}</span>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('holds.place')}
      </button>
    </form>
  );
}

/**
 * Clearing one.
 *
 * The note is required for the same reason the reason is: without it there is
 * no evidence the block was ever met, only that somebody switched it off.
 */
export function ClearHold({
  holdId,
  studentId,
}: {
  holdId: string;
  studentId: string;
}) {
  const [state, action, pending] = useActionState(clear, initial);
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');

  if (state.cleared) {
    return <p className="text-sm text-muted-foreground">{t('holds.cleared')}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="holdId" value={holdId} />
      <input type="hidden" name="studentId" value={studentId} />
      <label className="block min-w-48 flex-1">
        <span className="mb-1 block text-xs text-muted-foreground">{t('holds.clearNote')}</span>
        <input
          name="note"
          required
          className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : t('holds.clear')}
      </button>
      {state.error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {state.error}
        </p>
      )}
    </form>
  );
}
