import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { currentUser } from '@/lib/console/session';
import { registrationCard } from '@/lib/registration/card';
import { canonicalHostFor } from '@/lib/cms/hosts';
import { qrSvg, verifyUrl } from '@/lib/console/qr';
import { letterheadFor } from '@/lib/print/letterhead';
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
import { Table, TableWrap, Td, Th } from '@/components/console/ui';
import { Money } from '@/components/ui/money';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('print');
  return { title: t('registrationCard') };
}

/**
 * The printed registration card (Track D5, SRS REQ-REG-05).
 *
 * D3 built the card as a screen and left the letterhead, the page setup and
 * the signature block to here. This is the same `registrationCard` read — the
 * card is not a second version of the fee arithmetic — laid out as a document
 * on the shared print sheet.
 *
 * ## The QR is the whole point
 *
 * The legacy proof of registration was a Crystal Report printed from the same
 * screen that saved the row (`printFile(File2)`), with nothing on it a third
 * party could check. A student presenting it at a hostel, a bank or a ministry
 * office was presenting a piece of paper.
 *
 * The QR here resolves to a **sessionless** verification endpoint keyed by an
 * opaque token: possession of one card tells you nothing about any other, the
 * endpoint cannot be walked, and it discloses no money. The absolute URL is
 * built here rather than in the module that computes the fees, because the
 * module that knows the arithmetic has no business knowing which domain the
 * university publishes under — and a card printed with the wrong origin
 * verifies against the wrong site, or against nothing.
 */
export default async function RegistrationCardPrintPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/registrations/[id]/print');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('print');
  const r = await getTranslations('registry');

  let card;
  try {
    card = await registrationCard(principal, id);
  } catch {
    notFound();
  }

  const [host, letterhead, user] = await Promise.all([
    canonicalHostFor(principal.tenantId),
    letterheadFor(principal),
    currentUser(),
  ]);
  const qr = await qrSvg(verifyUrl(host, card.verifyPath));

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link
          href={`/console/registry/registrations/${id}`}
          className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
        >
          {t('back')}
        </Link>
        <PrintButton />
      </div>

      <PrintSheet
        letterhead={letterhead}
        locale={locale}
        title={t('registrationCard')}
        reference={{
          numberLabel: t('registrationNo'),
          number: card.registrationNo,
          dateLabel: t('date'),
          date: card.issuedOn,
        }}
      >
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <PrintFacts>
              <PrintFact label={t('student')}>
                <span className="block">{card.student.nameAr}</span>
                <span className="block text-xs text-muted-foreground" dir="ltr">
                  {card.student.nameEn}
                </span>
              </PrintFact>
              <PrintFact label={t('studentNo')}>
                <span className="numeric">{card.student.studentNo}</span>
              </PrintFact>
              <PrintFact label={t('programme')}>
                {pickText(locale, card.student.programmeNameAr, card.student.programmeNameEn)}
              </PrintFact>
              <PrintFact label={t('faculty')}>
                {pickText(locale, card.student.facultyNameAr, card.student.facultyNameEn)}
              </PrintFact>
              <PrintFact label={t('batch')}>{card.student.batchNameEn}</PrintFact>
              <PrintFact label={t('term')}>
                {pickText(locale, card.term.nameAr, card.term.nameEn)}
                <span className="numeric text-muted-foreground">
                  {' '}
                  · {card.term.academicYearCode}
                </span>
              </PrintFact>
              <PrintFact label={t('level')}>
                <span className="numeric">{card.term.levelYear}</span>
              </PrintFact>
              <PrintFact label={t('status')}>{r(`regStatus.${card.status}`)}</PrintFact>
            </PrintFacts>
          </div>

          {/* The QR sits beside the identity rather than in a corner: it is
              what makes the card checkable, and a verifier holding the paper
              should not have to look for it. */}
          <figure className="w-36 shrink-0 break-inside-avoid text-center">
            <div
              className="mx-auto w-32"
              // The SVG is generated by `qrSvg` from a URL this page built —
              // no user-supplied markup reaches it.
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <figcaption className="mt-2 text-[10px] leading-tight text-muted-foreground">
              {t('verifyHint')}
            </figcaption>
          </figure>
        </div>

        <div className="mt-6">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('feeItem')}</Th>
                  <Th numeric>{t('amount')}</Th>
                </tr>
              </thead>
              <tbody>
                {card.fees.lines.map((l) => (
                  <tr key={l.code} className="break-inside-avoid">
                    <Td>
                      <span className="numeric text-muted-foreground">{l.code}</span>{' '}
                      {pickText(locale, l.nameAr, l.nameEn)}
                    </Td>
                    <Td numeric>
                      <Money amount={l.net} currency={card.fees.currency} />
                    </Td>
                  </tr>
                ))}
                <tr>
                  <Td>{t('gross')}</Td>
                  <Td numeric>
                    <Money amount={card.fees.gross} currency={card.fees.currency} />
                  </Td>
                </tr>
                <tr>
                  <Td>{t('discount')}</Td>
                  <Td numeric>
                    <Money amount={card.fees.discount} currency={card.fees.currency} />
                  </Td>
                </tr>
                <tr className="border-t-2 border-foreground font-semibold">
                  <Td>{t('net')}</Td>
                  <Td numeric>
                    <Money amount={card.fees.net} currency={card.fees.currency} />
                  </Td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>
        </div>

        <SignatureBlock locale={locale} slots={[signature('REGISTRAR')]} />

        <PrintFooter
          locale={locale}
          generatedBy={user?.fullName ?? ''}
          generatedAt={new Date().toISOString().slice(0, 19).replace('T', ' ')}
        />
      </PrintSheet>
    </div>
  );
}
