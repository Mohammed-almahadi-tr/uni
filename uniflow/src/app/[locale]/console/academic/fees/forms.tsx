'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/components/ui/money';
import type { FeeItemRow, ScheduleLineRow } from '@/lib/console/backoffice';
import { approve, draft, revise, type MatrixState } from './actions';

const initial: MatrixState = { error: null, draftedVersion: null, approved: null };

const today = () => new Date().toISOString().slice(0, 10);

export interface Cohort {
  programmeId: string;
  batchId: string;
  admissionCategoryId: string;
  nationalityCategory: string;
}

/**
 * The line grid for a version (Track D4).
 *
 * Prefilled from the version being revised, so the common case — put the
 * tuition up by twelve per cent, leave everything else — is editing one box
 * rather than retyping a schedule. An empty grid on a revision means "copy
 * the source version's lines", which the module does itself; the alternative
 * is this form rebuilding a set that only looks identical.
 */
export function ScheduleEditor({
  cohort,
  catalogue,
  existing,
  sourceScheduleId,
  sourceVersionNo,
  currency,
  locale,
}: {
  cohort: Cohort;
  catalogue: FeeItemRow[];
  existing: ScheduleLineRow[];
  /** Set when revising; absent when drafting the cohort's first version. */
  sourceScheduleId?: string;
  sourceVersionNo?: number;
  currency: string;
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(
    sourceScheduleId ? revise : draft,
    initial,
  );
  const t = useTranslations('academic.feeMatrix');
  const c = useTranslations('academic.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const byItem = new Map(existing.map((l) => [l.feeItemId, l]));

  if (state.draftedVersion !== null) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-4 text-sm">
        {t('revised', { versionNo: state.draftedVersion })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {sourceScheduleId ? (
        <input type="hidden" name="feeScheduleId" value={sourceScheduleId} />
      ) : (
        <>
          <input type="hidden" name="programmeId" value={cohort.programmeId} />
          <input type="hidden" name="batchId" value={cohort.batchId} />
          <input
            type="hidden"
            name="admissionCategoryId"
            value={cohort.admissionCategoryId}
          />
          <input
            type="hidden"
            name="nationalityCategory"
            value={cohort.nationalityCategory}
          />
          <input type="hidden" name="currency" value={currency} />
        </>
      )}

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}

      {sourceVersionNo !== undefined && (
        <p className="text-sm text-muted-foreground">
          {t('copiedFrom', { versionNo: sourceVersionNo })}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('effectiveFrom')}</span>
          <input
            name="effectiveFrom"
            type="date"
            required
            defaultValue={today()}
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">{t('note')}</span>
          <input
            name="note"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                {t('feeItem')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                {c('amount')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                {t('mandatory')}
              </th>
            </tr>
          </thead>
          <tbody>
            {catalogue.map((item) => {
              const line = byItem.get(item.id);
              return (
                <tr key={item.id}>
                  <td className="border-b border-border px-3 py-2">
                    <span className="numeric text-muted-foreground">{item.code}</span>{' '}
                    {pick(item.nameAr, item.nameEn)}
                  </td>
                  <td className="border-b border-border px-3 py-2 text-end">
                    <input
                      name={`amount_${item.id}`}
                      inputMode="decimal"
                      dir="ltr"
                      defaultValue={line?.amount ?? ''}
                      aria-label={pick(item.nameAr, item.nameEn)}
                      className="numeric h-9 w-32 rounded-md border border-input bg-background px-2 text-end text-sm"
                    />
                  </td>
                  <td className="border-b border-border px-3 py-2">
                    <input
                      type="checkbox"
                      name={`mandatory_${item.id}`}
                      defaultChecked={line?.isMandatory ?? true}
                      aria-label={`${pick(item.nameAr, item.nameEn)} — ${t('mandatory')}`}
                      className="h-5 w-5"
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">{t('noLines')}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : sourceScheduleId ? t('revise') : t('newVersion')}
      </button>
    </form>
  );
}

/**
 * Put a draft in force (Track D4).
 *
 * Separate from drafting, and separately permissioned, because the fee
 * schedule decides what every student in a cohort pays and one person
 * deciding that alone is the same exposure as one person approving their own
 * voucher.
 */
export function ApproveSchedule({ feeScheduleId }: { feeScheduleId: string }) {
  const [state, action, pending] = useActionState(approve, initial);
  const t = useTranslations('academic.feeMatrix');
  const c = useTranslations('academic.common');

  if (state.approved) {
    return (
      <div className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        <p>
          {t('approved', {
            versionNo: state.approved.versionNo,
            from: state.approved.effectiveFrom,
          })}
        </p>
        {state.approved.supersededVersionNo !== null && (
          <p className="mt-1 text-muted-foreground">
            {t('superseded', { versionNo: state.approved.supersededVersionNo })}
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="feeScheduleId" value={feeScheduleId} />
      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('approve')}
      </button>
      <p className="text-xs text-muted-foreground">{t('approveHint')}</p>
    </form>
  );
}

/**
 * What changed between one version and the one before it.
 *
 * The question §8 named, and the one the legacy screen made permanently
 * unanswerable by deleting the rows it replaced. Rendered as a diff rather
 * than two tables side by side, because "the tuition went up by 12,000" is
 * the sentence somebody is trying to form.
 */
export function VersionDiff({
  previous,
  current,
  currency,
  locale,
}: {
  previous: ScheduleLineRow[];
  current: ScheduleLineRow[];
  currency: string;
  locale: 'ar' | 'en';
}) {
  const t = useTranslations('academic.feeMatrix');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const before = new Map(previous.map((l) => [l.feeItemId, l]));
  const after = new Map(current.map((l) => [l.feeItemId, l]));
  const ids = [...new Set([...before.keys(), ...after.keys()])];

  const rows = ids.map((id) => {
    const b = before.get(id);
    const a = after.get(id);
    const name = pick(a?.nameAr ?? b?.nameAr ?? '', a?.nameEn ?? b?.nameEn ?? '');
    if (!b) return { id, name, kind: 'added' as const, from: null, to: a!.amount };
    if (!a) return { id, name, kind: 'removed' as const, from: b.amount, to: null };
    if (b.amount !== a.amount) {
      return { id, name, kind: 'changed' as const, from: b.amount, to: a.amount };
    }
    return { id, name, kind: 'unchanged' as const, from: b.amount, to: a.amount };
  });

  const changed = rows.filter((r) => r.kind !== 'unchanged');

  return (
    <div className="space-y-2 text-sm">
      {changed.length === 0 ? (
        <p className="text-muted-foreground">{t('unchanged')}</p>
      ) : (
        <ul className="space-y-1">
          {changed.map((r) => (
            <li key={r.id} className="flex flex-wrap items-baseline gap-2">
              <span className="flex-1">{r.name}</span>
              {r.from !== null && (
                <span className={r.kind === 'removed' ? 'text-destructive' : ''}>
                  <Money amount={r.from} currency={currency} />
                </span>
              )}
              {r.kind === 'changed' && <span className="text-muted-foreground">→</span>}
              {r.to !== null && (
                <span className="font-medium">
                  <Money amount={r.to} currency={currency} />
                </span>
              )}
              <span className="text-xs text-muted-foreground">
                {r.kind === 'added'
                  ? t('added')
                  : r.kind === 'removed'
                    ? t('removed')
                    : ''}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
