'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/components/ui/money';
import type { ProgrammeOption, TermOption } from '@/lib/console/lookups';
import { changeStanding, transfer, type LifecycleState } from './actions';

const initial: LifecycleState = { error: null, status: null, transfer: null };

interface Option {
  to: string;
  label: string;
  consequence: string;
  requiresApproval: boolean;
}

/**
 * Change of standing (Track D3, SRS REQ-LIF-01/02).
 *
 * The consequence is shown **as the operator picks the destination**, not
 * after they confirm. B5 made every transition declare what it does to the
 * student's money; this is the one place a human sees that declaration before
 * acting on it, which is the entire reason it was made a property of the
 * transition rather than something inferred from the ledger afterwards.
 *
 * Only transitions that are legal from where the student stands are offered.
 * The engine refuses anything else by name and lists what *is* possible — so
 * the dropdown and the refusal come from the same table.
 */
export function ChangeStanding({
  studentId,
  options,
  currency,
}: {
  studentId: string;
  options: Option[];
  currency: string;
}) {
  const [state, action, pending] = useActionState(changeStanding, initial);
  const [to, setTo] = useState(options[0]?.to ?? '');
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');

  const chosen = options.find((o) => o.to === to);
  const done = state.status;

  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('lifecycle.noTransitions')}</p>;
  }

  if (done) {
    return (
      <div className="space-y-2 rounded-md border border-success/40 bg-success/10 p-4 text-sm">
        <p>
          {t('lifecycle.changed', {
            from: t(`status.${done.from}`),
            to: t(`status.${done.to}`),
          })}
        </p>
        <p className="text-muted-foreground">{t(`consequence.${done.consequence}`)}</p>
        <dl className="flex flex-wrap gap-4">
          {done.amountReversed && (
            <div>
              <dt className="text-xs text-muted-foreground">{t('lifecycle.reversedAmount')}</dt>
              <dd>
                <Money amount={done.amountReversed} currency={currency} />
              </dd>
            </div>
          )}
          {done.amountRefundable && (
            <div>
              <dt className="text-xs text-muted-foreground">
                {t('lifecycle.refundableAmount')}
              </dt>
              <dd>
                <Money amount={done.amountRefundable} currency={currency} />
              </dd>
            </div>
          )}
          {done.amountRetained && (
            <div>
              <dt className="text-xs text-muted-foreground">{t('lifecycle.retainedAmount')}</dt>
              <dd>
                <Money amount={done.amountRetained} currency={currency} />
              </dd>
            </div>
          )}
        </dl>
      </div>
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

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('lifecycle.changeTo')}</span>
          <select
            name="to"
            required
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {options.map((o) => (
              <option key={o.to} value={o.to}>
                {t(`status.${o.to}`)} — {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('profile.effectiveDate')}</span>
          <input
            name="effectiveDate"
            type="date"
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
      </div>

      {chosen && (
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <span className="text-muted-foreground">{t('lifecycle.consequenceIs')}: </span>
          <strong>{t(`consequence.${chosen.consequence}`)}</strong>
          {chosen.requiresApproval && (
            <p className="mt-1 text-xs text-muted-foreground">{t('lifecycle.needsApproval')}</p>
          )}
        </div>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('profile.reason')}</span>
        <textarea
          name="reason"
          required
          rows={2}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('lifecycle.requestedBy')}</span>
          <input
            name="requestedBy"
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        {chosen?.consequence === 'APPLY_REFUND_POLICY' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {t('lifecycle.refundElection')}
            </span>
            <select
              name="refundElection"
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="RETAIN_AS_CREDIT">{t('lifecycle.RETAIN_AS_CREDIT')}</option>
              <option value="REFUND">{t('lifecycle.REFUND')}</option>
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('lifecycle.postingDate')}</span>
          <input
            name="postingDate"
            type="date"
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {t('lifecycle.postingDateHint')}
          </span>
        </label>
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('lifecycle.apply')}
      </button>
    </form>
  );
}

/**
 * Programme transfer (SRS REQ-REG-04).
 *
 * One form, two postings: the old programme's billing is reversed by a linked
 * voucher and the new programme is billed from its own fee schedule. The
 * result names both, because a registrar asked to explain the student's
 * balance next week needs to be able to find them.
 */
export function TransferProgramme({
  studentId,
  programmes,
  terms,
  currency,
  locale,
}: {
  studentId: string;
  programmes: ProgrammeOption[];
  terms: TermOption[];
  currency: string;
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(transfer, initial);
  const t = useTranslations('registry');
  const c = useTranslations('registry.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const done = state.transfer;

  if (done) {
    return (
      <div className="space-y-2 rounded-md border border-success/40 bg-success/10 p-4 text-sm">
        <p>
          {t('lifecycle.transferred', {
            programme: done.toProgrammeName,
            reversed: done.reversedRegistrationNo ?? c('none'),
            registration: done.newRegistration.registrationNo,
          })}
        </p>
        {done.amountReversed && (
          <p>
            {t('lifecycle.reversedAmount')}:{' '}
            <Money amount={done.amountReversed} currency={currency} />
          </p>
        )}
      </div>
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

      <p className="text-sm text-muted-foreground">{t('lifecycle.transferHint')}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('lifecycle.toProgramme')}</span>
          <select
            name="toProgrammeId"
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {pick(p.nameAr, p.nameEn)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('register.term')}</span>
          <select
            name="academicTermId"
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.academicYearCode} · {pick(term.nameAr, term.nameEn)}
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
            defaultValue={1}
            required
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('profile.effectiveDate')}</span>
          <input
            name="effectiveDate"
            type="date"
            className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('profile.reason')}</span>
        <textarea
          name="reason"
          required
          rows={2}
          className="w-full rounded-md border border-input bg-background p-3 text-sm"
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('lifecycle.transfer')}
      </button>
    </form>
  );
}
