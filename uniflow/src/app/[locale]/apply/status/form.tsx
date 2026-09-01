'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { TrackedApplication } from '@/lib/admissions/portal';
import type { Letterhead } from '@/lib/print/sheet';
import { lookupApplication } from './actions';
import { blankStatusState } from './state';
import { ApplicationSlip } from './slip';

/**
 * The applicant's own view of their application (Track C2).
 *
 * ## What it tells them, and what it does not
 *
 * The state, the intake, their ranked choices, and — once there is one — the
 * offer with its deadline. It does **not** show the screening outcome.
 * `screen` advises a committee and does not decide; telling somebody they
 * failed an eligibility rule that a committee may still choose to look past
 * would be telling them a decision that has not been taken, and REQ-ADM-CAP-02
 * is explicit that screening advises rather than blocks.
 *
 * The committee's recorded rationale is likewise absent. It is written for the
 * committee's own record; what the applicant is told is the verdict.
 */

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

export function StatusLookup({
  locale,
  letterhead,
}: {
  locale: 'ar' | 'en';
  /** Loaded by the page and passed down, because the lookup is a POST and the
   *  result is rendered in place. Nothing on a letterhead is a secret — every
   *  fact on it is published on the site's own contact page. */
  letterhead: Letterhead;
}) {
  const [state, action, pending] = useActionState(lookupApplication, blankStatusState);
  const t = useTranslations('apply.status');
  const a = useTranslations('apply');

  return (
    <div className="space-y-6">
      <form action={action} className="max-w-xl space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('applicationNo')}</span>
          <input
            name="applicationNo"
            required
            autoComplete="off"
            dir="ltr"
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('trackingToken')}</span>
          <input
            name="trackingToken"
            required
            autoComplete="off"
            dir="ltr"
            className={`numeric ${field}`}
          />
          <span className="mt-1 block text-xs text-muted-foreground">{t('tokenHint')}</span>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-11 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? a('working') : t('check')}
        </button>
      </form>

      {state.errorKey && (
        <p
          role="alert"
          className="max-w-xl rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {t(`errors.${state.errorKey}`)}
        </p>
      )}

      {state.application && (
        <>
          <div className="no-print">
            <Result application={state.application} locale={locale} />
          </div>

          {/* The printable application form (REQ-LP-04). Hidden on screen and
              shown only to the printer: the summary above is what somebody
              reads, and two renderings of the same record side by side is a
              page nobody scrolls past. */}
          <div className="hidden print:block">
            <ApplicationSlip
              application={state.application}
              letterhead={letterhead}
              locale={locale}
            />
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print h-11 rounded-md border border-border px-5 text-sm font-medium hover:bg-muted"
          >
            {t('printForm')}
          </button>
        </>
      )}
    </div>
  );
}

function Result({
  application,
  locale,
}: {
  application: TrackedApplication;
  locale: 'ar' | 'en';
}) {
  const t = useTranslations('apply.status');
  const s = useTranslations('academic.applicationState');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  return (
    <div className="max-w-2xl rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="numeric text-lg font-semibold">{application.applicationNo}</div>
          <div className="text-sm text-muted-foreground">
            {pick(application.fullNameAr, application.fullNameEn)}
          </div>
        </div>
        <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs">
          {s(application.state)}
        </span>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t('intake')}</dt>
          <dd className="text-sm">
            {pick(application.batchNameAr, application.batchNameEn)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('submitted')}</dt>
          <dd className="numeric text-sm">{application.submittedAt ?? '—'}</dd>
        </div>
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-medium">{t('choices')}</h3>
        <ol className="space-y-1 text-sm">
          {application.choices.map((c) => (
            <li key={c.rank}>
              <span className="numeric text-muted-foreground">{c.rank}.</span>{' '}
              {pick(c.nameAr, c.nameEn)}
            </li>
          ))}
        </ol>
      </div>

      {/* The offer is the only thing on this page the applicant has to act on,
          so it is the only thing given a box of its own. The deadline is the
          part that matters: an offer lapses on it and the seat goes to
          somebody on the waitlist. */}
      {application.offer && (
        <div className="mt-5 rounded-md border border-success/40 bg-success/10 p-4">
          <h3 className="font-semibold">{t('offer.title')}</h3>
          <p className="mt-1 text-sm">
            {t('offer.acceptBy', { date: application.offer.acceptBy })}
          </p>
          {application.offer.conditions && (
            <p className="mt-2 whitespace-pre-line text-sm">
              {application.offer.conditions}
            </p>
          )}
          <p className="mt-2 text-sm text-muted-foreground">{t('offer.howTo')}</p>
        </div>
      )}

      <p className="mt-5 text-xs text-muted-foreground">{t('advisoryNote')}</p>
    </div>
  );
}
