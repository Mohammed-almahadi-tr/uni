import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { currentUser } from '@/lib/console/session';
import { letterheadFor } from '@/lib/print/letterhead';
import { offerLetter } from '@/lib/print/documents';
import { signature } from '@/lib/print/sheet';
import { formatMoney } from '@/lib/currency';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  PrintFact,
  PrintFacts,
  PrintFooter,
  PrintSheet,
  SignatureBlock,
} from '@/components/print/sheet';
import { PrintButton } from '@/components/print/controls';
import { WarningBanner } from '@/components/console/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('print');
  return { title: t('offerLetter') };
}

/**
 * The offer of admission (Track D5, SRS REQ-ADM-04).
 *
 * **The bilingual template B2 deferred.** B2 built the offer — issuing it,
 * the seat it holds, the deadline it lapses on, the deposit it may demand —
 * and said the letter itself was a Track D document. This is it.
 *
 * ## Why the prose is in the message catalogue
 *
 * Because it is the part that has to exist in two languages and be checked by
 * somebody who reads them. A letter assembled from concatenated fragments in
 * a component is a letter nobody can proofread and nobody can amend without a
 * deployment; a letter whose sentences are catalogue entries with named
 * placeholders is one a registrar can be shown, in both languages, before it
 * is ever sent.
 *
 * The `ar` and `en` catalogues are held to identical key sets by test, so a
 * sentence cannot exist in one language only — which is exactly the failure
 * that matters here. An applicant receiving a letter with an English paragraph
 * missing from the Arabic side is being told less than the other applicants.
 *
 * ## A withdrawn offer still prints
 *
 * With a banner saying it is no longer open. An offer that lapsed is a thing
 * that happened, the applicant may be holding their copy and disputing it, and
 * the useful document is the one that reproduces what was issued rather than a
 * refusal to show it.
 */
export default async function OfferLetterPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/admissions/[id]/offer');
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('print');

  const [offer, letterhead, user] = await Promise.all([
    offerLetter(guard.ctx.principal, id),
    letterheadFor(guard.ctx.principal),
    currentUser(),
  ]);
  if (!offer) notFound();

  const open = offer.state === 'ISSUED' || offer.state === 'ACCEPTED';
  const batch = pickText(locale, offer.batchNameAr, offer.batchNameEn);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link
          href="/console/registry/admissions"
          className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
        >
          {t('back')}
        </Link>
        <PrintButton />
      </div>

      {!open && <WarningBanner>{t('offerWithdrawn')}</WarningBanner>}

      <PrintSheet
        letterhead={letterhead}
        locale={locale}
        title={t('offerLetter')}
        reference={{
          numberLabel: t('applicationNo'),
          number: offer.applicationNo,
          dateLabel: t('date'),
          date: offer.issuedOn,
        }}
      >
        <div className="mb-6">
          <div className="text-xs text-muted-foreground">{t('applicant')}</div>
          <div className="font-medium">
            {locale === 'ar' ? offer.applicantNameAr : offer.applicantNameEn}
          </div>
        </div>

        <p className="mb-5 leading-7">{t('offerBody', { batch })}</p>

        <div className="mb-6 rounded-md border border-border p-4">
          <PrintFacts>
            <PrintFact label={t('programme')}>
              {pickText(locale, offer.programmeNameAr, offer.programmeNameEn)}
            </PrintFact>
            <PrintFact label={t('faculty')}>
              {pickText(locale, offer.facultyNameAr, offer.facultyNameEn)}
            </PrintFact>
            <PrintFact label={t('batch')}>{batch}</PrintFact>
            <PrintFact label={t('admissionCategory')}>
              {pickText(locale, offer.admissionCategoryAr, offer.admissionCategoryEn)}
            </PrintFact>
          </PrintFacts>
        </div>

        {offer.conditions && (
          <div className="mb-5">
            <h2 className="mb-1 text-sm font-semibold">{t('conditions')}</h2>
            <p className="mb-2 leading-7">{t('offerConditions')}</p>
            {/* The conditions are stored as the registrar wrote them, and
                printed as written. Reformatting a condition somebody drafted
                to be legally exact is how it stops being exact. */}
            <p className="whitespace-pre-line rounded-md bg-muted p-3 text-sm leading-7">
              {offer.conditions}
            </p>
          </div>
        )}

        {offer.depositRequired && (
          <p className="mb-5 leading-7">
            {t('offerDeposit', {
              amount: formatMoney(offer.depositRequired, offer.currency),
            })}
            {offer.depositPaid ? ` — ${t('depositPaid')}` : ''}
          </p>
        )}

        <p className="mb-5 leading-7 font-medium">
          {t('offerDeadline', { date: offer.acceptBy })}
        </p>

        <p className="leading-7">{t('offerClosing')}</p>

        <SignatureBlock
          locale={locale}
          slots={[signature('AUTHORISED', offer.issuedByName), signature('STUDENT')]}
        />

        <PrintFooter
          locale={locale}
          generatedBy={user?.fullName ?? ''}
          generatedAt={new Date().toISOString().slice(0, 19).replace('T', ' ')}
        />
      </PrintSheet>
    </div>
  );
}
