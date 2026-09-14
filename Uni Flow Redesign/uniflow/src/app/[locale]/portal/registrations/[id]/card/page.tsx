import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { redirectLocalised } from '@/lib/console/redirect';
import { portalPage } from '@/lib/portal/page';
import { portalCard } from '@/lib/portal/views';
import { canonicalHostFor } from '@/lib/cms/hosts';
import { qrSvg, verifyUrl } from '@/lib/console/qr';
import { signature } from '@/lib/print/sheet';
import { NoSiteConfigured, pick, localeOf } from '@/components/site/chrome';
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
  return { title: t('registrationCard'), robots: { index: false, follow: false } };
}

/**
 * The registration card, printed by the student (SRS REQ-LP-05, REQ-REG-05).
 *
 * ## It is the same card
 *
 * Same `buildRegistrationCard`, same letterhead, same signature block, same
 * QR token, resolving to the same sessionless `/verify/registration` page. A
 * card a student printed at midnight verifies exactly as one a registrar
 * handed them across a counter, because it *is* the one a registrar would
 * have handed them.
 *
 * The alternative — a lighter "student copy", marked as such — was considered
 * and is worse than useless. A proof that announces itself as the unofficial
 * one is a proof nobody accepts, so every student who needs a real card still
 * queues for it, and the portal has saved nobody anything. What makes this
 * card believable is not who pressed print; it is the token on it and the
 * page it resolves to.
 *
 * ## The absolute URL is built here
 *
 * As it is on the staff page, and for the same reason: the module that knows
 * the fee arithmetic has no business knowing which domain the university
 * publishes under, and a card printed with the wrong origin verifies against
 * the wrong site or against nothing.
 */
export default async function PortalCardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const sp = await searchParams;

  const state = await portalPage(raw, sp.student);
  if (!state.ok) {
    if (state.reason === 'noSite') return <NoSiteConfigured host={state.host} />;
    if (state.reason === 'noStudent') notFound();
    redirectLocalised(raw, '/portal/login');
  }
  const { principal, student } = state;
  const locale = localeOf(raw);

  const t = await getTranslations('print');
  const r = await getTranslations('registry');
  const po = await getTranslations('portal');

  // A registration belonging to somebody else is not merely absent from the
  // list — the confined transaction cannot see the row, so this raises and
  // the answer is "not found" rather than "not yours".
  let view;
  try {
    view = await portalCard(principal, student.studentId, id);
  } catch {
    notFound();
  }
  const { card, letterhead } = view;

  const host = await canonicalHostFor(principal.tenantId);
  const qr = await qrSvg(verifyUrl(host, card.verifyPath));

  const query = principal.students.length > 1 ? `?student=${student.studentId}` : '';

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 md:px-6">
      <div className="no-print mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/portal/registrations${query}`}
          className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
        >
          {t('back')}
        </Link>
        <PrintButton />
        <span className="text-xs text-muted-foreground">{po('registrations.cardHint')}</span>
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
                {pick(locale, card.student.programmeNameAr, card.student.programmeNameEn)}
              </PrintFact>
              <PrintFact label={t('faculty')}>
                {pick(locale, card.student.facultyNameAr, card.student.facultyNameEn)}
              </PrintFact>
              <PrintFact label={t('batch')}>{card.student.batchNameEn}</PrintFact>
              <PrintFact label={t('term')}>
                {pick(locale, card.term.nameAr, card.term.nameEn)}
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

          <figure className="w-36 shrink-0 break-inside-avoid text-center">
            <div
              className="mx-auto w-32"
              // Generated by `qrSvg` from a URL this page built — no
              // user-supplied markup reaches it.
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
                      {pick(locale, l.nameAr, l.nameEn)}
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

        {/* The registrar's slot, unsigned. The card's authority is the token
            and the page behind it, and a printed signature nobody put there
            would be a claim this document is not entitled to make. */}
        <SignatureBlock locale={locale} slots={[signature('REGISTRAR')]} />

        <PrintFooter
          locale={locale}
          generatedBy={pick(locale, student.fullNameAr, student.fullNameEn)}
          generatedAt={new Date().toISOString().slice(0, 19).replace('T', ' ')}
        />
      </PrintSheet>
    </main>
  );
}
