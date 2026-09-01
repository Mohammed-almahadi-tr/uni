'use client';

import { useTranslations } from 'next-intl';
import type { Letterhead } from '@/lib/print/sheet';
import type { TrackedApplication } from '@/lib/admissions/portal';
import { signature } from '@/lib/print/sheet';
import {
  PrintFact,
  PrintFacts,
  PrintFooter,
  PrintSheet,
  SignatureBlock,
} from '@/components/print/sheet';

/**
 * The printed application form (SRS REQ-LP-04, Track C2).
 *
 * REQ-LP-04 asks for a "downloadable Application Form PDF". A7 settled that
 * **a PDF is produced by printing the HTML sheet**, because a generator that
 * shapes Arabic incorrectly produces documents that look right, print, get
 * signed and are wrong in a way an English-reading developer cannot see. So
 * this is the same `PrintSheet` D5 built for the receipt, the voucher and the
 * offer letter — one letterhead across every document the institution issues,
 * whether a member of staff or an applicant is holding it.
 *
 * ## Why it lives on the status page and not on the submission screen
 *
 * Because an applicant needs it more than once. Printed only in the seconds
 * after submitting, it is a document they lose; reachable whenever they have
 * their number and their code, it is one they can produce at a counter months
 * later. The submission screen gives them the code; this gives them the form.
 *
 * ## The tracking code is not on it
 *
 * The form is a thing an applicant hands to somebody. The code is what proves
 * an enquiry about the application comes from them, so printing it onto a
 * document meant to be handed over would defeat it.
 *
 * ## A client component, unusually for a print sheet
 *
 * D5's other five documents are server-rendered pages reached by URL. This one
 * cannot be: the lookup is a POST, because the tracking code must not travel
 * in a query string. So the result is rendered in place, and the letterhead —
 * public data, no secret in it — is passed down from the page that loaded it.
 * `PrintSheet` and the signature block are shared unchanged, which is the
 * whole point of having put them in a module with no server imports.
 */
export function ApplicationSlip({
  application,
  letterhead,
  locale,
}: {
  application: TrackedApplication;
  letterhead: Letterhead;
  locale: 'ar' | 'en';
}) {
  const t = useTranslations('apply');
  const st = useTranslations('apply.status');
  const s = useTranslations('academic.applicationState');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const sub = application.submitted;

  const score =
    sub.certificateScore && sub.certificateMaxScore
      ? `${sub.certificateScore} / ${sub.certificateMaxScore}`
      : (sub.certificateScore ?? '—');

  return (
    <PrintSheet
      letterhead={letterhead}
      locale={locale}
      title={t('title')}
      subtitle={pick(application.batchNameAr, application.batchNameEn)}
      reference={{
        numberLabel: st('applicationNo'),
        number: application.applicationNo,
        dateLabel: st('submitted'),
        date: application.submittedAt ?? '—',
      }}
    >
      <PrintFacts>
        <PrintFact label={t('identity.nameAr')}>{application.fullNameAr}</PrintFact>
        <PrintFact label={t('identity.nameEn')}>
          <span dir="ltr">{application.fullNameEn}</span>
        </PrintFact>
        <PrintFact label={t('intake.category')}>
          {pick(application.categoryNameAr, application.categoryNameEn)}
        </PrintFact>
        <PrintFact label={st('title')}>{s(application.state)}</PrintFact>

        <PrintFact label={t('identity.nationalId')}>
          <span className="numeric">{sub.nationalId ?? '—'}</span>
        </PrintFact>
        <PrintFact label={t('identity.passportNo')}>
          <span className="numeric">{sub.passportNo ?? '—'}</span>
        </PrintFact>
        <PrintFact label={t('identity.dateOfBirth')}>
          <span className="numeric">{sub.dateOfBirth ?? '—'}</span>
        </PrintFact>
        <PrintFact label={t('identity.nationality')}>
          {sub.nationalityAr ? pick(sub.nationalityAr, sub.nationalityEn ?? '') : '—'}
        </PrintFact>
        <PrintFact label={t('identity.email')}>
          <span dir="ltr">{sub.email ?? '—'}</span>
        </PrintFact>
        <PrintFact label={t('identity.phone')}>
          <span className="numeric">{sub.phone ?? '—'}</span>
        </PrintFact>

        <PrintFact label={t('certificate.type')}>
          {sub.certificateAr ? pick(sub.certificateAr, sub.certificateEn ?? '') : '—'}
        </PrintFact>
        <PrintFact label={t('certificate.score')}>
          <span className="numeric">{score}</span>
        </PrintFact>
        <PrintFact label={t('certificate.year')}>
          <span className="numeric">{sub.certificateYear ?? '—'}</span>
        </PrintFact>
        <PrintFact label={t('certificate.subjects')}>
          {sub.subjects.length > 0 ? sub.subjects.join('، ') : '—'}
        </PrintFact>
      </PrintFacts>

      <div className="mt-6 border-t border-border pt-4">
        <h3 className="mb-2 text-sm font-medium">{t('choices.title')}</h3>
        <ol className="space-y-1 text-sm">
          {application.choices.map((c) => (
            <li key={c.rank}>
              <span className="numeric text-muted-foreground">{c.rank}.</span>{' '}
              {pick(c.nameAr, c.nameEn)}
            </li>
          ))}
        </ol>
      </div>

      {/* The declaration is on the paper, not only on the screen it was
          agreed on. A signed form in a file is what an admissions office
          produces when an applicant disputes what they claimed. */}
      <p className="mt-6 text-xs leading-6 text-muted-foreground">
        {t('review.declaration')}
      </p>

      <SignatureBlock locale={locale} slots={[signature('STUDENT')]} />

      <PrintFooter
        locale={locale}
        generatedBy={pick(application.fullNameAr, application.fullNameEn)}
        generatedAt={new Date().toISOString().slice(0, 19).replace('T', ' ')}
      />
    </PrintSheet>
  );
}
