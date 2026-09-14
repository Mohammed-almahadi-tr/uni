'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Money } from '@/components/ui/money';
import type { OfferRow } from '@/lib/console/backoffice';
import {
  decide,
  enrol,
  offer,
  promote,
  rescreen,
  respond,
  score,
  type CommitteeState,
} from './actions';

const initial: CommitteeState = {
  error: null,
  message: null,
  screened: null,
  issued: null,
  enrolled: null,
};

const DECISIONS = ['ACCEPT', 'CONDITIONAL_ACCEPT', 'WAITLIST', 'REJECT'] as const;

const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

/**
 * One applicant's row of actions (Track D4).
 *
 * Screen, score and decide, in that order and separately, because they are
 * three different judgements. The rationale on a decision is required by the
 * database as well as by this form — an unexplained refusal is the one the
 * applicant comes back about, and by then the person who made it has left.
 */
export function ApplicantActions({
  applicationId,
  committeeScore,
  mayDecide,
}: {
  applicationId: string;
  committeeScore: string | null;
  mayDecide: boolean;
}) {
  const [screenState, screenAction, screening] = useActionState(rescreen, initial);
  const [scoreState, scoreAction, scoring] = useActionState(score, initial);
  const [decideState, decideAction, deciding] = useActionState(decide, initial);
  const [open, setOpen] = useState(false);

  const t = useTranslations('academic.committee');
  const c = useTranslations('academic.common');
  const d = useTranslations('academic.decision');

  const error = screenState.error ?? scoreState.error ?? decideState.error;

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
      {screenState.screened && (
        <p className="text-xs text-success">
          {t('screened', {
            pass: screenState.screened.pass,
            fail: screenState.screened.fail,
          })}
        </p>
      )}
      {(scoreState.message || decideState.message) && (
        <p className="text-xs text-success">{t('scored')}</p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <form action={screenAction}>
          <input type="hidden" name="applicationId" value={applicationId} />
          <button
            type="submit"
            disabled={screening}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
          >
            {screening ? c('working') : t('rescreen')}
          </button>
        </form>

        {mayDecide && (
          <>
            <form action={scoreAction} className="flex items-end gap-2">
              <input type="hidden" name="applicationId" value={applicationId} />
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('score')}</span>
                <input
                  name="score"
                  inputMode="decimal"
                  dir="ltr"
                  defaultValue={committeeScore ?? ''}
                  className={`numeric ${small} w-24`}
                />
              </label>
              <button
                type="submit"
                disabled={scoring}
                className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
              >
                {scoring ? c('working') : c('save')}
              </button>
            </form>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
            >
              {t('decide')}
            </button>
          </>
        )}
      </div>

      {open && mayDecide && (
        <form action={decideAction} className="space-y-2 rounded-md border border-border p-3">
          <input type="hidden" name="applicationId" value={applicationId} />
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">{t('decide')}</span>
              <select name="decision" defaultValue="ACCEPT" className={`${small} w-44`}>
                {DECISIONS.map((k) => (
                  <option key={k} value={k}>
                    {d(k)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-64 flex-1">
              <span className="mb-1 block text-xs text-muted-foreground">{t('rationale')}</span>
              <input name="note" required className={small} />
            </label>
            <button
              type="submit"
              disabled={deciding}
              className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {deciding ? c('working') : c('save')}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">{t('rationaleHint')}</p>
          <p className="text-xs text-muted-foreground">{t('decisionIsNotOffer')}</p>
        </form>
      )}
    </div>
  );
}

/**
 * Issue an offer (Track D4, SRS REQ-ADM-CAP-04).
 *
 * The override is its own field, its own permission and its own recorded
 * reason. It is not a checkbox that suppresses a warning: `issueOffer`
 * refuses an override with no reason, because capacity exceeded without a
 * stated why is indistinguishable from capacity never checked.
 */
export function IssueOffer({
  applicationId,
  programmeId,
  mayOverride,
}: {
  applicationId: string;
  programmeId: string;
  mayOverride: boolean;
}) {
  const [state, action, pending] = useActionState(offer, initial);
  const [override, setOverride] = useState(false);
  const t = useTranslations('academic.committee');
  const c = useTranslations('academic.common');

  if (state.issued) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('issued', {
          applicationNo: state.issued.applicationNo,
          seatsRemaining: state.issued.seatsRemaining,
        })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="programmeId" value={programmeId} />

      {state.error && (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{t('acceptBy')}</span>
          <input name="acceptBy" type="date" required className={`numeric ${small}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">
            {t('depositRequired')}
          </span>
          <input name="depositRequired" inputMode="decimal" dir="ltr" className={`numeric ${small}`} />
        </label>
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">{t('conditions')}</span>
          <input name="conditions" className={small} />
        </label>
      </div>

      {mayOverride && (
        <div className="rounded-md border border-warning/40 bg-warning/10 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={override}
              onChange={(e) => setOverride(e.target.checked)}
              className="h-5 w-5"
            />
            {t('override')}
          </label>
          {override && (
            <label className="mt-2 block">
              <span className="mb-1 block text-xs text-muted-foreground">
                {t('overrideReason')}
              </span>
              <input name="overrideReason" required className={small} />
            </label>
          )}
          <p className="mt-2 text-xs text-muted-foreground">{t('overrideHint')}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('issue')}
      </button>
      <p className="text-xs text-muted-foreground">{t('depositHint')}</p>
    </form>
  );
}

/** Accept, decline, withdraw — and, once accepted, create the student. */
export function OfferActions({
  row,
  mayEnrol,
  currency,
}: {
  row: OfferRow;
  mayEnrol: boolean;
  currency: string;
}) {
  const [respondState, respondAction, responding] = useActionState(respond, initial);
  const [enrolState, enrolAction, enrolling] = useActionState(enrol, initial);
  const [mode, setMode] = useState<'none' | 'decline' | 'withdraw'>('none');

  const t = useTranslations('academic.committee');
  const c = useTranslations('academic.common');

  const error = respondState.error ?? enrolState.error;

  if (enrolState.enrolled) {
    return (
      <p className="text-sm text-success">
        {t('enrolled', { studentNo: enrolState.enrolled.studentNo })}
      </p>
    );
  }
  if (respondState.message === 'closed') {
    return <p className="text-sm text-muted-foreground">{t('closed')}</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {row.depositRequired && (
        <p className="text-xs">
          {row.depositPaid ? (
            <span className="text-success">{t('depositPaid')}</span>
          ) : (
            <span className="text-warning">{t('depositUnpaid')}</span>
          )}{' '}
          <Money amount={row.depositRequired} currency={currency} />
        </p>
      )}

      {row.state === 'ISSUED' && mode === 'none' && (
        <div className="flex flex-wrap gap-2">
          <form action={respondAction}>
            <input type="hidden" name="offerId" value={row.id} />
            <input type="hidden" name="how" value="accept" />
            <button
              type="submit"
              disabled={responding}
              className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {responding ? c('working') : t('accept')}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setMode('decline')}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            {t('decline')}
          </button>
          <button
            type="button"
            onClick={() => setMode('withdraw')}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            {t('withdrawOffer')}
          </button>
        </div>
      )}

      {mode !== 'none' && (
        <form action={respondAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="offerId" value={row.id} />
          <input type="hidden" name="how" value={mode} />
          <label className="block min-w-56 flex-1">
            <span className="mb-1 block text-xs text-muted-foreground">{t('reason')}</span>
            <input name="reason" required autoFocus className={small} />
          </label>
          <button
            type="submit"
            disabled={responding}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
          >
            {responding ? c('working') : c('save')}
          </button>
          <button
            type="button"
            onClick={() => setMode('none')}
            className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
          >
            {c('cancel')}
          </button>
        </form>
      )}

      {row.state === 'ACCEPTED' && mayEnrol && (
        <form action={enrolAction} className="flex flex-wrap items-end gap-2">
          <input type="hidden" name="offerId" value={row.id} />
          <label className="block">
            <span className="mb-1 block text-xs text-muted-foreground">{t('studentNo')}</span>
            <input name="studentNo" required dir="ltr" className={`numeric ${small} w-40`} />
          </label>
          <button
            type="submit"
            disabled={enrolling}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {enrolling ? c('working') : t('enrol')}
          </button>
        </form>
      )}
    </div>
  );
}

/**
 * Promote somebody off the waiting list into a seat that came free.
 *
 * The freed offer is named explicitly rather than inferred, so "who held this
 * seat before me" has an answer — which is the question an applicant asks
 * when a place appears in August.
 */
export function Promote({
  applicationId,
  applicationNo,
  programmeId,
  freed,
}: {
  applicationId: string;
  applicationNo: string;
  programmeId: string;
  freed: OfferRow[];
}) {
  const [state, action, pending] = useActionState(promote, initial);
  const [open, setOpen] = useState(false);
  const t = useTranslations('academic.committee');
  const c = useTranslations('academic.common');

  if (state.issued) {
    return (
      <p className="text-sm text-success">
        {t('issued', {
          applicationNo: state.issued.applicationNo,
          seatsRemaining: state.issued.seatsRemaining,
        })}
      </p>
    );
  }

  if (freed.length === 0) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
      >
        {t('promote')}
      </button>
    );
  }

  return (
    <form action={action} className="space-y-2 rounded-md border border-border p-3">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="programmeId" value={programmeId} />
      {state.error && (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-xs text-muted-foreground">{t('promoteFrom')}</span>
          <select name="lapsedOfferId" required className={small}>
            {freed.map((f) => (
              <option key={f.id} value={f.id}>
                {f.applicationNo} — {f.state}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{t('acceptBy')}</span>
          <input name="acceptBy" type="date" required className={`numeric ${small}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{t('depositRequired')}</span>
          <input name="depositRequired" inputMode="decimal" dir="ltr" className={`numeric ${small}`} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('promoteHint')}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? c('working') : `${t('promote')} — ${applicationNo}`}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
        >
          {c('cancel')}
        </button>
      </div>
    </form>
  );
}
