'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { AcademicYearOption, Named } from '@/lib/console/backoffice';
import {
  addScheme,
  approve,
  propose,
  reject,
  type ScholarshipState,
} from './actions';

const initial: ScholarshipState = { error: null, message: null, approved: null };

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

/**
 * Create a scheme (Track D4).
 *
 * The budget is optional and its absence is a decision, not a default: a
 * scheme with one refuses the award that would exceed it at approval, and a
 * scheme without one is a promise nobody has costed. The form says so rather
 * than pre-filling a number somebody would accept without thinking.
 */
export function AddScheme({ years }: { years: AcademicYearOption[] }) {
  const [state, action, pending] = useActionState(addScheme, initial);
  const t = useTranslations('academic.scholarships');
  const c = useTranslations('academic.common');

  if (state.message === 'added') {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {c('added')}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('code')}</span>
          <input name="code" required dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameAr')}</span>
          <input name="nameAr" required dir="rtl" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameEn')}</span>
          <input name="nameEn" required dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('academicYear')}</span>
          <select name="academicYearId" defaultValue="" className={field}>
            <option value="">{c('all')}</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('budgetCap')}</span>
          <input
            name="budgetCap"
            inputMode="decimal"
            dir="ltr"
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('eligibilityNote')}</span>
          <input name="eligibilityNote" className={field} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('capHint')}</p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('addScheme')}
      </button>
    </form>
  );
}

/** Propose an award against a scheme. The reason is required by the module. */
export function ProposeAward({
  schemes,
  studentId,
  years,
  locale,
}: {
  schemes: Named[];
  studentId: string;
  years: AcademicYearOption[];
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(propose, initial);
  const t = useTranslations('academic.scholarships');
  const c = useTranslations('academic.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  if (state.message === 'proposed') {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('proposed')}
      </p>
    );
  }

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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-medium">{t('scheme')}</span>
          <select name="schemeId" required className={field}>
            {schemes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {pick(s.nameAr, s.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('amount')}</span>
          <input
            name="amount"
            inputMode="decimal"
            required
            dir="ltr"
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('academicYear')}</span>
          <select name="academicYearId" defaultValue="" className={field}>
            <option value="">{c('none')}</option>
            {years.map((y) => (
              <option key={y.id} value={y.id}>
                {y.code}
              </option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-4">
          <span className="mb-1 block text-sm font-medium">{c('reason')}</span>
          <input name="reason" required className={field} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('makerChecker')}</p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('propose')}
      </button>
    </form>
  );
}

/** Approve or refuse one proposed award. */
export function AwardDecision({ awardId }: { awardId: string }) {
  const [approveState, approveAction, approving] = useActionState(approve, initial);
  const [rejectState, rejectAction, rejecting] = useActionState(reject, initial);
  const [open, setOpen] = useState(false);
  const t = useTranslations('academic.scholarships');
  const c = useTranslations('academic.common');

  if (approveState.approved) {
    return (
      <p className="text-sm text-success">
        {t('approved')}{' '}
        {approveState.approved.remaining !== null && (
          <span className="numeric text-muted-foreground">
            {t('remaining')}: {approveState.approved.remaining}
          </span>
        )}
      </p>
    );
  }
  if (rejectState.message === 'rejected') {
    return <p className="text-sm text-muted-foreground">{t('rejected')}</p>;
  }

  const error = approveState.error ?? rejectState.error;

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {open ? (
        <form action={rejectAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="awardId" value={awardId} />
          <label className="block min-w-56 flex-1">
            <span className="mb-1 block text-xs text-muted-foreground">
              {t('rejectReason')}
            </span>
            <input name="note" required autoFocus className={small} />
          </label>
          <button
            type="submit"
            disabled={rejecting}
            className="h-9 rounded-md border border-destructive/50 px-3 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
          >
            {rejecting ? c('working') : t('reject')}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
          >
            {c('cancel')}
          </button>
        </form>
      ) : (
        <div className="flex flex-wrap items-end gap-2">
          <form action={approveAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="awardId" value={awardId} />
            <label className="block min-w-48">
              <span className="mb-1 block text-xs text-muted-foreground">{t('note')}</span>
              <input name="note" className={small} />
            </label>
            <button
              type="submit"
              disabled={approving}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {approving ? c('working') : t('approve')}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            {t('reject')}
          </button>
        </div>
      )}
    </div>
  );
}
