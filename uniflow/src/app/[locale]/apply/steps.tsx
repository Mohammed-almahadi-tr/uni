'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { OpenBatch } from '@/lib/admissions/portal';
import type { ApplyStep, DraftFields } from '@/lib/admissions/draft';
import {
  blankApplyState,
  discardDraft,
  saveStep,
  submitApplication,
  type ApplyState,
} from './actions';

/**
 * The public application wizard (SRS REQ-LP-04, Track C2).
 *
 * ## Why it is steps at all
 *
 * Because the people filling it in are on telephones, often on a shared one,
 * and a single page asking for a name, a national ID, a certificate, three
 * ranked programme choices and a date of birth is a page they abandon
 * halfway. Each step is short enough to finish standing up.
 *
 * The steps are **not** a validation control. Everything is re-checked by
 * `submitPublicApplication` against the database, because the draft travels
 * in a cookie the browser holds and a cookie the browser holds is a cookie
 * the browser can edit.
 *
 * ## Nothing is written until the end
 *
 * There is no server-side draft row, so no application number is allocated
 * until a complete application exists. See `lib/admissions/draft.ts` for why
 * that matters on a public surface.
 */

const field =
  'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const label = 'mb-1 block text-sm font-medium';
const hint = 'mt-1 block text-xs text-muted-foreground';

function Submit({ children, pending }: { children: string; pending: boolean }) {
  const t = useTranslations('apply');
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-11 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
    >
      {pending ? t('working') : children}
    </button>
  );
}

function Problem({ state }: { state: ApplyState }) {
  const t = useTranslations('apply');
  const text = state.error ?? (state.errorKey ? t(`errors.${state.errorKey}`) : null);
  if (!text) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
    >
      {text}
    </p>
  );
}

/** A step's form. The action posts, the page re-renders on the next step. */
function StepForm({
  step,
  next,
  children,
}: {
  step: ApplyStep;
  next: string;
  children: React.ReactNode;
}) {
  const [state, action, pending] = useActionState(saveStep, blankApplyState);
  const t = useTranslations('apply');

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="step" value={step} />
      <Problem state={state} />
      {children}
      <Submit pending={pending}>{t(next)}</Submit>
    </form>
  );
}

// ---------------------------------------------------------------------------
// 1. Which intake
// ---------------------------------------------------------------------------

export function IntakeStep({
  batches,
  draft,
  locale,
}: {
  batches: OpenBatch[];
  draft: DraftFields;
  locale: 'ar' | 'en';
}) {
  const t = useTranslations('apply');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const batch = batches.find((b) => b.id === draft.batchId) ?? batches[0];

  return (
    <StepForm step="intake" next="next">
      <label className="block">
        <span className={label}>{t('intake.batch')}</span>
        <select name="batchId" defaultValue={draft.batchId ?? ''} required className={field}>
          {batches.map((b) => (
            <option key={b.id} value={b.id}>
              {pick(b.nameAr, b.nameEn)}
            </option>
          ))}
        </select>
        {batch && (
          <span className={hint}>{t('intake.closes', { date: batch.closesOn })}</span>
        )}
      </label>

      <label className="block">
        <span className={label}>{t('intake.category')}</span>
        <select
          name="admissionCategoryId"
          defaultValue={draft.admissionCategoryId ?? ''}
          required
          className={field}
        >
          <option value="">—</option>
          {(batch?.categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {pick(c.nameAr, c.nameEn)}
            </option>
          ))}
        </select>
        <span className={hint}>{t('intake.categoryHint')}</span>
      </label>
    </StepForm>
  );
}

// ---------------------------------------------------------------------------
// 2. Who you are
// ---------------------------------------------------------------------------

export function IdentityStep({
  draft,
  nationalities,
  locale,
}: {
  draft: DraftFields;
  nationalities: Array<{ id: string; nameAr: string; nameEn: string }>;
  locale: 'ar' | 'en';
}) {
  const t = useTranslations('apply');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  return (
    <StepForm step="identity" next="next">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Both scripts, and both required. The offer letter and the eventual
            certificate are issued in both, and a name transliterated later by
            a clerk is a name that stops matching the passport. */}
        <label className="block">
          <span className={label}>{t('identity.nameAr')}</span>
          <input
            name="fullNameAr"
            defaultValue={draft.fullNameAr ?? ''}
            required
            minLength={2}
            maxLength={200}
            dir="rtl"
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>{t('identity.nameEn')}</span>
          <input
            name="fullNameEn"
            defaultValue={draft.fullNameEn ?? ''}
            required
            minLength={2}
            maxLength={200}
            dir="ltr"
            className={field}
          />
          <span className={hint}>{t('identity.nameHint')}</span>
        </label>

        <label className="block">
          <span className={label}>{t('identity.nationalId')}</span>
          <input
            name="nationalId"
            defaultValue={draft.nationalId ?? ''}
            inputMode="numeric"
            dir="ltr"
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className={label}>{t('identity.passportNo')}</span>
          <input
            name="passportNo"
            defaultValue={draft.passportNo ?? ''}
            dir="ltr"
            className={`numeric ${field}`}
          />
          <span className={hint}>{t('identity.idHint')}</span>
        </label>

        <label className="block">
          <span className={label}>{t('identity.dateOfBirth')}</span>
          <input
            name="dateOfBirth"
            type="date"
            defaultValue={draft.dateOfBirth ?? ''}
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className={label}>{t('identity.nationality')}</span>
          <select
            name="nationalityId"
            defaultValue={draft.nationalityId ?? ''}
            className={field}
          >
            <option value="">—</option>
            {nationalities.map((n) => (
              <option key={n.id} value={n.id}>
                {pick(n.nameAr, n.nameEn)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={label}>{t('identity.email')}</span>
          <input
            name="email"
            type="email"
            defaultValue={draft.email ?? ''}
            dir="ltr"
            className={field}
          />
        </label>
        <label className="block">
          <span className={label}>{t('identity.phone')}</span>
          <input
            name="phone"
            type="tel"
            defaultValue={draft.phone ?? ''}
            dir="ltr"
            className={`numeric ${field}`}
          />
          <span className={hint}>{t('identity.reachHint')}</span>
        </label>
      </div>
    </StepForm>
  );
}

// ---------------------------------------------------------------------------
// 3. The certificate
// ---------------------------------------------------------------------------

export function CertificateStep({
  draft,
  certificates,
  locale,
}: {
  draft: DraftFields;
  certificates: Array<{ id: string; nameAr: string; nameEn: string; maxScore: string }>;
  locale: 'ar' | 'en';
}) {
  const t = useTranslations('apply');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const chosen = certificates.find((c) => c.id === draft.certificateTypeId);

  return (
    <StepForm step="certificate" next="next">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={label}>{t('certificate.type')}</span>
          <select
            name="certificateTypeId"
            defaultValue={draft.certificateTypeId ?? ''}
            className={field}
          >
            <option value="">—</option>
            {certificates.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c.nameAr, c.nameEn)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className={label}>{t('certificate.score')}</span>
          <input
            name="certificateScore"
            inputMode="decimal"
            dir="ltr"
            defaultValue={draft.certificateScore ?? ''}
            className={`numeric ${field}`}
          />
          {/* The mark the certificate is reported out of, from the certificate
              type itself. A score entered against the wrong maximum is the
              defect REQ-ADM-CAP-02 exists to prevent — an IB candidate scoring
              84.4% refused against an 80% minimum because 4.2 was compared to
              80 as a raw number. */}
          <span className={hint}>
            {chosen
              ? t('certificate.outOf', { max: chosen.maxScore })
              : t('certificate.scoreHint')}
          </span>
        </label>

        <label className="block">
          <span className={label}>{t('certificate.year')}</span>
          <input
            name="certificateYear"
            inputMode="numeric"
            dir="ltr"
            defaultValue={draft.certificateYear ?? ''}
            className={`numeric ${field}`}
          />
        </label>

        <label className="block sm:col-span-2">
          <span className={label}>{t('certificate.subjects')}</span>
          <textarea
            name="subjects"
            rows={3}
            defaultValue={(draft.subjects ?? []).join(', ')}
            className="w-full rounded-md border border-input bg-background p-3 text-sm"
          />
          <span className={hint}>{t('certificate.subjectsHint')}</span>
        </label>
      </div>

      <p className="rounded-md border border-border bg-muted p-3 text-xs text-muted-foreground">
        {t('certificate.documentsLater')}
      </p>
    </StepForm>
  );
}

// ---------------------------------------------------------------------------
// 4. Ranked choices
// ---------------------------------------------------------------------------

export function ChoicesStep({
  draft,
  batch,
  locale,
  maxChoices,
}: {
  draft: DraftFields;
  batch: OpenBatch;
  locale: 'ar' | 'en';
  maxChoices: number;
}) {
  const t = useTranslations('apply');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const ranks = Array.from({ length: maxChoices }, (_, i) => i);

  return (
    <StepForm step="choices" next="next">
      <p className="text-sm text-muted-foreground">{t('choices.blurb')}</p>

      <div className="space-y-4">
        {ranks.map((i) => (
          <label key={i} className="block">
            <span className={label}>{t('choices.rank', { n: i + 1 })}</span>
            <select
              name={`choice_${i}`}
              defaultValue={draft.choices?.[i] ?? ''}
              required={i === 0}
              className={field}
            >
              <option value="">{i === 0 ? '—' : t('choices.none')}</option>
              {batch.programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {pick(p.facultyNameAr, p.facultyNameEn)} ·{' '}
                  {pick(p.nameAr, p.nameEn)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>

      <p className={hint}>{t('choices.duplicateHint')}</p>
    </StepForm>
  );
}

// ---------------------------------------------------------------------------
// 5. Review and submit
// ---------------------------------------------------------------------------

export function SubmitStep() {
  const [state, action, pending] = useActionState(submitApplication, blankApplyState);
  const t = useTranslations('apply');

  if (state.receipt) return <Receipt receipt={state.receipt} />;

  return (
    <div className="space-y-5">
      <form action={action} className="space-y-5">
        <Problem state={state} />
        <p className="text-sm text-muted-foreground">{t('review.declaration')}</p>
        <Submit pending={pending}>{t('review.submit')}</Submit>
      </form>

      {/* Start again. The alternative — waiting two hours for the draft cookie
          to expire — is not something a person can be asked to do, and a form
          holding somebody's national ID number on a shared telephone is one
          they should be able to clear on the spot. */}
      <form action={discardDraft}>
        <button
          type="submit"
          className="text-xs text-muted-foreground underline hover:no-underline"
        >
          {t('review.discard')}
        </button>
      </form>
    </div>
  );
}

/**
 * What the applicant is given.
 *
 * The tracking number and the token are shown **once**, here, and nowhere
 * else — the token is a secret, so it is not put in a URL where it would land
 * in browser history and in a referrer header. The applicant keeps it by
 * printing this page, which is why the print control is beside it rather than
 * on a page they would have to navigate to.
 */
function Receipt({
  receipt,
}: {
  receipt: { applicationNo: string; trackingToken: string };
}) {
  const t = useTranslations('apply');

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-success/40 bg-success/10 p-4">
        <h3 className="font-semibold">{t('receipt.title')}</h3>
        <p className="mt-1 text-sm">{t('receipt.blurb')}</p>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">{t('receipt.applicationNo')}</dt>
          <dd className="numeric text-lg font-semibold">{receipt.applicationNo}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">{t('receipt.trackingToken')}</dt>
          <dd className="numeric break-all text-lg font-semibold">
            {receipt.trackingToken}
          </dd>
        </div>
      </dl>

      <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
        {t('receipt.keepIt')}
      </p>

      <button
        type="button"
        onClick={() => window.print()}
        className="no-print h-11 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {t('receipt.print')}
      </button>
    </div>
  );
}
