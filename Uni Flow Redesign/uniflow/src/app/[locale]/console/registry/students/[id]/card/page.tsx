import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { currentUser } from '@/lib/console/session';
import { letterheadFor } from '@/lib/print/letterhead';
import { profileCard } from '@/lib/print/documents';
import { signature } from '@/lib/print/sheet';
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
  return { title: t('profileCard') };
}

/**
 * The student card (Track D5, SRS REQ-ST-01).
 *
 * ## The frame with nothing in it
 *
 * There is a ruled box where the photograph belongs, and it is empty, because
 * the object-storage upload endpoint still does not exist — the same gap A2's
 * voucher attachments, B3's student documents, D3's photo capture and D4's
 * branding logos are all waiting on. **Six surfaces now.**
 *
 * The box is on the card anyway, with "affix and stamp" under it. A card laid
 * out as though photographs were never intended would have to be redesigned
 * the day the endpoint lands, and in the meantime a registrar can print this
 * one, glue a photograph into the frame and stamp across it, which is what
 * they do today with the legacy build's output.
 *
 * ## Both scripts, always
 *
 * The name is printed in Arabic and Latin on the same card whatever language
 * the registrar was working in. A card is presented to people who did not
 * choose its locale — a bank, a hostel, a police checkpoint — and showing one
 * script is how the wrong person gets identified.
 */
export default async function StudentCardPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/students/[id]/card');
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('print');
  const r = await getTranslations('registry');

  const [card, letterhead, user] = await Promise.all([
    profileCard(guard.ctx.principal, id),
    letterheadFor(guard.ctx.principal),
    currentUser(),
  ]);
  if (!card) notFound();

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link
          href={`/console/registry/students/${id}`}
          className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
        >
          {t('back')}
        </Link>
        <PrintButton />
      </div>

      <div className="no-print">
        <WarningBanner>{t('photoPending')}</WarningBanner>
      </div>

      <PrintSheet
        letterhead={letterhead}
        locale={locale}
        title={t('profileCard')}
        reference={{
          numberLabel: t('studentNo'),
          number: card.studentNo,
          dateLabel: t('status'),
          date: r(`status.${card.status}`),
        }}
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <div className="mb-5">
              <div className="text-lg font-semibold">{card.fullNameAr}</div>
              <div className="text-sm text-muted-foreground" dir="ltr">
                {card.fullNameEn}
              </div>
            </div>

            <PrintFacts>
              <PrintFact label={t('programme')}>
                {pickText(locale, card.programmeNameAr ?? '—', card.programmeNameEn ?? '—')}
              </PrintFact>
              <PrintFact label={t('faculty')}>
                {pickText(locale, card.facultyNameAr ?? '—', card.facultyNameEn ?? '—')}
              </PrintFact>
              <PrintFact label={t('batch')}>
                <span className="numeric">{card.batchCode ?? '—'}</span>
              </PrintFact>
              <PrintFact label={t('nationality')}>
                {pickText(locale, card.nationalityAr ?? '—', card.nationalityEn ?? '—')}
              </PrintFact>
              <PrintFact label={t('nationalId')}>
                <span className="numeric">{card.nationalId ?? '—'}</span>
              </PrintFact>
              <PrintFact label={t('passportNo')}>
                <span className="numeric">{card.passportNo ?? '—'}</span>
              </PrintFact>
              <PrintFact label={t('dateOfBirth')}>
                <span className="numeric">{card.dateOfBirth ?? '—'}</span>
              </PrintFact>
              <PrintFact label={t('placeOfBirth')}>{card.placeOfBirth ?? '—'}</PrintFact>
              <PrintFact label={t('gender')}>
                {card.gender ? t(`genderLabel.${card.gender}`) : '—'}
              </PrintFact>
              <PrintFact label={t('emergencyContact')}>
                {card.emergencyContact
                  ? `${card.emergencyContact.name} · ${card.emergencyContact.phone}`
                  : '—'}
              </PrintFact>
            </PrintFacts>
          </div>

          <figure className="w-32 shrink-0 break-inside-avoid text-center">
            <div className="flex h-40 w-32 items-center justify-center rounded border border-dashed border-foreground text-xs text-muted-foreground">
              {t('photoHere')}
            </div>
            <figcaption className="mt-2 text-[10px] leading-tight text-muted-foreground">
              {t('photoPending')}
            </figcaption>
          </figure>
        </div>

        <SignatureBlock
          locale={locale}
          slots={[signature('REGISTRAR'), signature('STUDENT')]}
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
