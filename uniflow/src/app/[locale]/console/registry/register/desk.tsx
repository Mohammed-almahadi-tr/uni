'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { Money } from '@/components/ui/money';
import type { TermOption, SchemeOption } from '@/lib/console/lookups';
import { priceOrRegister, type DeskState } from './actions';

const initial: DeskState = {
  error: null,
  quote: null,
  optional: [],
  blocks: [],
  result: null,
};

/**
 * The registration desk (Track D3, SRS REQ-REG-01).
 *
 * Three states, in order, on one screen: **price → discount → commit.**
 *
 *   1. Student, term and year of study. Pressing *Price it* creates nothing.
 *   2. The quote, line by line, with a discount box on each line. Changing a
 *      discount re-prices; still nothing has been created.
 *   3. *Register* commits — and the engine prices the inputs again rather
 *      than trusting any figure this form sends back.
 *
 * The step that did not exist in the legacy screen is the second one. There,
 * a discount was typed into a box, the net was written to the registration
 * and the **gross** was written to the ledger, and the operator never saw the
 * two figures side by side because they were never on the same screen.
 */
export function RegistrationDesk({
  terms,
  schemes,
  studentId,
  locale,
}: {
  terms: TermOption[];
  schemes: SchemeOption[];
  studentId: string;
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(priceOrRegister, initial);
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');

  const q = state.quote;
  const done = state.result;
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="studentId" value={studentId} />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}

      {state.blocks.length > 0 && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
          <strong className="block">{t('register.blocked')}</strong>
          <ul className="mt-1 space-y-1">
            {state.blocks.map((b, i) => (
              <li key={b.id ?? `d${i}`}>
                {t(`holdType.${b.holdType}`)} — {b.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ---- Step 1: what is being registered ---------------------------- */}
      <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-sm font-medium">{t('register.term')}</span>
          <select
            name="academicTermId"
            required
            defaultValue={q?.academicTermId ?? ''}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              —
            </option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.academicYearCode} · {pick(term.nameAr, term.nameEn)}
                {term.registrationClosesOn ? ` (${term.registrationClosesOn})` : ''}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('register.levelYear')}</span>
          <input
            name="levelYear"
            type="number"
            min={1}
            max={10}
            required
            defaultValue={1}
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {t('register.registrationDate')}
          </span>
          <input
            name="registrationDate"
            type="date"
            defaultValue={q?.registrationDate}
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        {state.optional.length > 0 && (
          <fieldset className="sm:col-span-3">
            <legend className="mb-1 text-sm font-medium">{t('register.optionalItems')}</legend>
            <p className="mb-2 text-xs text-muted-foreground">{t('register.optionalHint')}</p>
            <div className="flex flex-wrap gap-4">
              {state.optional.map((o) => (
                <label key={o.feeItemId} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="optional"
                    value={o.feeItemId}
                    defaultChecked={q?.lines.some((l) => l.feeItemId === o.feeItemId)}
                    className="h-4 w-4"
                  />
                  {pick(o.nameAr, o.nameEn)}{' '}
                  <Money amount={o.amount} currency={q?.currency ?? 'SDG'} />
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </div>

      {/* ---- Step 2: the quote, with a discount box on each line --------- */}
      {q && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border px-5 py-3">
            <h2 className="font-semibold">{t('register.quote')}</h2>
            <span className="text-xs text-muted-foreground">
              {t('register.schedule', {
                version: q.feeScheduleVersionNo,
                from: q.registrationDate,
              })}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                    {t('register.item')}
                  </th>
                  <th className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                    {t('register.gross')}
                  </th>
                  <th className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                    {t('register.discountPct')}
                  </th>
                  <th className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                    {t('register.discountAmount')}
                  </th>
                  <th className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                    {t('register.net')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {q.lines.map((l) => (
                  <tr key={l.feeItemId}>
                    <td className="border-b border-border px-3 py-2">
                      {pick(l.feeItemNameAr, l.feeItemNameEn)}
                      <span className="numeric ms-2 text-xs text-muted-foreground">
                        {l.feeItemCode}
                      </span>
                    </td>
                    <td className="border-b border-border px-3 py-2 text-end">
                      <Money amount={l.gross} currency={q.currency} />
                    </td>
                    <td className="border-b border-border px-3 py-2 text-end">
                      <input
                        name={`pct_${l.feeItemId}`}
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        disabled={done !== null}
                        className="numeric h-9 w-24 rounded-md border border-input bg-background px-2 text-end text-sm"
                      />
                    </td>
                    <td className="border-b border-border px-3 py-2 text-end">
                      <input
                        name={`amt_${l.feeItemId}`}
                        type="text"
                        inputMode="decimal"
                        disabled={done !== null}
                        className="numeric h-9 w-32 rounded-md border border-input bg-background px-2 text-end text-sm"
                      />
                    </td>
                    <td className="border-b border-border px-3 py-2 text-end font-medium">
                      <Money amount={l.net} currency={q.currency} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="px-3 py-2 font-semibold">{t('register.total')}</td>
                  <td className="px-3 py-2 text-end">
                    <Money amount={q.gross} currency={q.currency} />
                  </td>
                  <td className="px-3 py-2 text-end text-muted-foreground" colSpan={2}>
                    <Money amount={q.discount} currency={q.currency} />
                    <span className="numeric ms-1 text-xs">({q.discountPct}%)</span>
                  </td>
                  <td className="px-3 py-2 text-end font-semibold">
                    <Money amount={q.net} currency={q.currency} showCode />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="space-y-4 border-t border-border p-5">
            {q.usedFallback && (
              <p className="text-xs text-muted-foreground">{t('register.fallbackUsed')}</p>
            )}

            {q.skipped.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {t('register.skipped')}:{' '}
                {q.skipped.map((s) => `${s.feeItemCode} (${s.reason})`).join('; ')}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {t('register.discountReason')}
                </span>
                <input
                  name="discountReason"
                  disabled={done !== null}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-sm font-medium">
                  {t('register.discountScheme')}
                </span>
                <select
                  name="discountSchemeId"
                  disabled={done !== null}
                  defaultValue={q.discountSchemeId ?? ''}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">{t('register.noScheme')}</option>
                  {schemes.map((s) => (
                    <option key={s.id} value={s.id}>
                      {pick(s.nameAr, s.nameEn)}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {q.requiresApproval && (
              <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                {t('register.needsApproval', { pct: q.approvalThresholdPct })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ---- Step 3: commit ---------------------------------------------- */}
      {done ? (
        <div className="rounded-md border border-success/40 bg-success/10 p-4 text-sm">
          <p>
            {done.status === 'PENDING_APPROVAL'
              ? t('register.donePending', { no: done.registrationNo })
              : t('register.done', {
                  no: done.registrationNo,
                  voucher: done.voucherRef ?? '—',
                })}
          </p>
          <Link
            href={`/console/registry/registrations/${done.registrationId}`}
            className="mt-2 inline-block underline"
          >
            {t('register.viewRegistration')}
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            name="intent"
            value="price"
            disabled={pending}
            className="h-11 rounded-md border border-border px-4 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            {pending ? c('working') : t('register.preview')}
          </button>
          {q && (
            <button
              type="submit"
              name="intent"
              value="commit"
              disabled={pending}
              className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {t('register.commit')}
            </button>
          )}
          <span className="text-xs text-muted-foreground">{t('register.quoteHint')}</span>
        </div>
      )}
    </form>
  );
}
