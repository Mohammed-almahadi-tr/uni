import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { currentUser } from '@/lib/console/session';
import { letterheadFor } from '@/lib/print/letterhead';
import { sponsorInvoiceDocument } from '@/lib/print/documents';
import { signature } from '@/lib/print/sheet';
import { spellMoney } from '@/lib/i18n/spell';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  PrintFact,
  PrintFacts,
  PrintFooter,
  PrintSheet,
  SignatureBlock,
} from '@/components/print/sheet';
import { PrintButton } from '@/components/print/controls';
import { Table, TableWrap, Td, Th, WarningBanner } from '@/components/console/ui';
import { Money } from '@/components/ui/money';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('print');
  return { title: t('sponsorInvoice') };
}

/**
 * The sponsor invoice (Track D5, SRS REQ-SPN-02).
 *
 * ## The document that had nothing to be
 *
 * In the legacy build a sponsorship was a discount typed onto a registration.
 * There was no sponsor ledger, so there was no invoice: the university's claim
 * on a ministry existed as a number in somebody's private spreadsheet, and it
 * was pursued by telephone. A7 gave the sponsor a control account and B6 gave
 * it a sub-ledger; this is the piece of paper that goes in the envelope.
 *
 * ## Every line names its student
 *
 * That is what a sponsor's own accounts department needs to check the bill
 * against their nomination list, and it is the difference between an invoice
 * that gets paid and one that gets queried. A single total for "tuition" is
 * unauditable from the other side.
 *
 * ## The amount in words is on it too
 *
 * The same control as a receipt, for the same reason: a figure that cannot be
 * altered after signature. An invoice for a ministry is a document that passes
 * through more hands than most.
 */
export default async function SponsorInvoicePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'academic/sponsors/invoices/[id]');
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('print');

  const [inv, letterhead, user] = await Promise.all([
    sponsorInvoiceDocument(guard.ctx.principal, id),
    letterheadFor(guard.ctx.principal),
    currentUser(),
  ]);
  if (!inv) notFound();

  const words = spellMoney(inv.totalAmount, inv.currency, locale);
  const cancelled = inv.status === 'CANCELLED';

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link
          href="/console/academic/sponsors?tab=invoices"
          className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
        >
          {t('back')}
        </Link>
        <PrintButton />
      </div>

      {cancelled && <WarningBanner>{t('cancelledInvoice')}</WarningBanner>}

      <PrintSheet
        letterhead={letterhead}
        locale={locale}
        title={t('sponsorInvoice')}
        reference={{
          numberLabel: t('invoiceNo'),
          number: inv.invoiceNo,
          dateLabel: t('date'),
          date: inv.docDate,
        }}
      >
        <PrintFacts>
          <PrintFact label={t('sponsor')}>
            <span className="block">{inv.sponsor.nameAr}</span>
            <span className="block text-xs text-muted-foreground" dir="ltr">
              {inv.sponsor.nameEn}
            </span>
            <span className="numeric text-xs text-muted-foreground">{inv.sponsor.code}</span>
          </PrintFact>
          <PrintFact label={t('contact')}>{inv.sponsor.contactName ?? '—'}</PrintFact>
          <PrintFact label={t('period')}>
            <span className="numeric">
              {inv.periodFrom} → {inv.periodTo}
            </span>
          </PrintFact>
          <PrintFact label={t('dueDate')}>
            <span className="numeric">{inv.dueDate}</span>
          </PrintFact>
        </PrintFacts>

        {inv.sponsor.billingAddress && (
          <p className="mt-4 whitespace-pre-line text-sm text-muted-foreground">
            {inv.sponsor.billingAddress}
          </p>
        )}

        <div className="mt-6">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('studentNo')}</Th>
                  <Th>{t('student')}</Th>
                  <Th>{t('feeItem')}</Th>
                  <Th>{t('term')}</Th>
                  <Th numeric>{t('amount')}</Th>
                </tr>
              </thead>
              <tbody>
                {inv.lines.map((l, i) => (
                  <tr key={i} className="break-inside-avoid">
                    <Td>
                      <span className="numeric">{l.studentNo}</span>
                    </Td>
                    <Td>{pickText(locale, l.studentNameAr, l.studentNameEn)}</Td>
                    <Td>{pickText(locale, l.feeNameAr, l.feeNameEn)}</Td>
                    <Td>{l.termLabel ?? '—'}</Td>
                    <Td numeric>
                      <Money amount={l.amount} currency={inv.currency} />
                    </Td>
                  </tr>
                ))}
                <tr className="border-t-2 border-foreground font-semibold">
                  <Td>{t('total')}</Td>
                  <Td />
                  <Td />
                  <Td />
                  <Td numeric>
                    <Money amount={inv.totalAmount} currency={inv.currency} />
                  </Td>
                </tr>
                {/* What has already been received against this invoice, and
                    what is left. A sponsor paying in instalments is the normal
                    case, and an invoice that only ever shows its face value
                    invites a second payment of the whole of it. */}
                {inv.settledAmount !== '0.0000' && (
                  <>
                    <tr>
                      <Td>{t('settled')}</Td>
                      <Td />
                      <Td />
                      <Td />
                      <Td numeric>
                        <Money amount={inv.settledAmount} currency={inv.currency} />
                      </Td>
                    </tr>
                    <tr className="font-semibold">
                      <Td>{t('outstanding')}</Td>
                      <Td />
                      <Td />
                      <Td />
                      <Td numeric>
                        <Money amount={inv.outstanding} currency={inv.currency} />
                      </Td>
                    </tr>
                  </>
                )}
              </tbody>
            </Table>
          </TableWrap>
        </div>

        <div className="mt-5 rounded-md bg-muted p-3">
          <div className="text-xs text-muted-foreground">{t('amountInWords')}</div>
          <div className="text-sm font-medium">{words}</div>
        </div>

        <p className="mt-4 text-sm">{t('invoiceTerms', { date: inv.dueDate })}</p>

        <SignatureBlock
          locale={locale}
          slots={[signature('PREPARED', inv.preparedByName), signature('AUTHORISED')]}
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
