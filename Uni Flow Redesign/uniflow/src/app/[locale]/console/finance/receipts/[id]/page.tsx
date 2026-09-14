import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { currentUser } from '@/lib/console/session';
import { letterheadFor } from '@/lib/print/letterhead';
import { receiptDocument } from '@/lib/print/documents';
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
import { Pill, Table, TableWrap, Td, Th, WarningBanner } from '@/components/console/ui';
import { Money } from '@/components/ui/money';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('print');
  return { title: t('receipt') };
}

/**
 * The printed receipt (Track D5, SRS REQ-CSH-02).
 *
 * D2 took the money and deferred the paper. This is the paper.
 *
 * ## The three things the legacy receipt got wrong
 *
 * ```vb
 * Me.txtWrittenValue.Text = SpellNumber(CDbl(Me.txtTotalAmount.Text))
 * Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("Dollar", "Pound")
 * Me.txtWrittenValue.Text = Me.txtWrittenValue.Text.Replace("and No Cent", "")
 * ```
 * (frmStudantReceiptVoucher.vb:211-215)
 *
 *   1. **The amount in words was English with the currency patched in by
 *      string replacement.** On an Arabic receipt handed to an Arabic-speaking
 *      student. Arabic تفقيط did not work at all; the Ribat build imported a
 *      third-party component to paper over it. Here it comes from
 *      `spellMoney`, which handles Arabic number agreement properly and takes
 *      the minor unit from the currency rather than assuming hundredths.
 *   2. **The total was recomputed from the grid at print time** — a second
 *      sum, which could differ from the one already written to the ledger.
 *      Every figure here is the stored figure.
 *   3. **A cancelled receipt printed identically to a live one.** There was
 *      no cancellation concept at all: the generated data adapters carry
 *      `DELETE FROM [dbo].[Transactions]` and `DELETE FROM [dbo].[Transactionees]`
 *      (DsTrans.Designer.vb:3211, 4246), so a wrong posting was removable
 *      rather than reversible, and nothing was left to print a warning from.
 *      Here a receipt that has been cancelled or dishonoured says so across
 *      the top of the page, because the student is still holding their copy
 *      and the useful thing to hand them is a page that explains it.
 *
 * ## Why the amount in words is on the sheet
 *
 * It is not decoration. It is the control that stops a figure being altered
 * after signature — the reason every printed receipt in this region carries
 * one, and REQ-NFR-09 requires it.
 */
export default async function ReceiptDocumentPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/receipts/[id]');
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('print');
  const c = await getTranslations('finance.channel');

  const [receipt, letterhead, user] = await Promise.all([
    receiptDocument(guard.ctx.principal, id),
    letterheadFor(guard.ctx.principal),
    currentUser(),
  ]);
  if (!receipt) notFound();

  const words = spellMoney(receipt.amount, receipt.currency, locale);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link
          href="/console/finance/receipts"
          className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
        >
          {t('back')}
        </Link>
        <PrintButton />
        {receipt.voided && <Pill tone="bad">{receipt.voided.kind}</Pill>}
      </div>

      {receipt.voided && (
        <WarningBanner>
          {receipt.voided.kind === 'CANCELLED'
            ? t('voidedCancelled', { date: receipt.voided.at })
            : t('voidedDishonoured', { date: receipt.voided.at })}
          {receipt.voided.reason ? ` — ${receipt.voided.reason}` : ''}
        </WarningBanner>
      )}

      <PrintSheet
        letterhead={letterhead}
        locale={locale}
        title={t('receipt')}
        reference={{
          numberLabel: t('receiptNo'),
          number: receipt.receiptNo,
          dateLabel: t('date'),
          date: receipt.docDate,
        }}
      >
        <PrintFacts>
          <PrintFact label={t('student')}>
            <span className="block">{receipt.student.fullNameAr}</span>
            <span className="block text-xs text-muted-foreground" dir="ltr">
              {receipt.student.fullNameEn}
            </span>
          </PrintFact>
          <PrintFact label={t('studentNo')}>
            <span className="numeric">{receipt.student.studentNo}</span>
          </PrintFact>
          <PrintFact label={t('programme')}>
            {pickText(
              locale,
              receipt.student.programmeNameAr ?? '—',
              receipt.student.programmeNameEn ?? '—',
            )}
          </PrintFact>
          <PrintFact label={t('channel')}>
            {c(receipt.channel)}
            {receipt.reference ? ` · ${receipt.reference}` : ''}
          </PrintFact>
        </PrintFacts>

        {receipt.cheque && (
          <div className="mt-5 rounded-md border border-border p-4">
            <PrintFacts>
              <PrintFact label={t('chequeNo')}>
                <span className="numeric">{receipt.cheque.chequeNo}</span>
              </PrintFact>
              <PrintFact label={t('chequeBank')}>
                {receipt.cheque.bank ?? '—'}
                {receipt.cheque.branch ? ` · ${receipt.cheque.branch}` : ''}
              </PrintFact>
              <PrintFact label={t('chequeDue')}>
                <span className="numeric">{receipt.cheque.dueDate ?? '—'}</span>
              </PrintFact>
              <PrintFact label={t('drawer')}>{receipt.cheque.drawer ?? '—'}</PrintFact>
            </PrintFacts>
          </div>
        )}

        <div className="mt-6">
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('feeItem')}</Th>
                  <Th>{t('term')}</Th>
                  <Th numeric>{t('amount')}</Th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines.map((l) => (
                  <tr key={l.chargeId} className="break-inside-avoid">
                    <Td>
                      <span className="numeric text-muted-foreground">{l.feeCode}</span>{' '}
                      {pickText(locale, l.feeNameAr, l.feeNameEn)}
                    </Td>
                    <Td>{l.termLabel ?? '—'}</Td>
                    <Td numeric>
                      <Money amount={l.amount} currency={receipt.currency} />
                    </Td>
                  </tr>
                ))}
                {/* Money taken and not matched to a charge is the student's
                    credit, and it belongs on the receipt as its own line. A
                    receipt whose allocations do not add up to its amount, with
                    no line explaining the gap, is a receipt somebody will read
                    as an error. */}
                {receipt.unallocated !== '0.0000' && (
                  <tr>
                    <Td>{t('creditBalance')}</Td>
                    <Td>—</Td>
                    <Td numeric>
                      <Money amount={receipt.unallocated} currency={receipt.currency} />
                    </Td>
                  </tr>
                )}
                <tr className="border-t-2 border-foreground font-semibold">
                  <Td>{t('total')}</Td>
                  <Td />
                  <Td numeric>
                    <Money amount={receipt.amount} currency={receipt.currency} />
                  </Td>
                </tr>
              </tbody>
            </Table>
          </TableWrap>
        </div>

        <div className="mt-5 rounded-md bg-muted p-3">
          <div className="text-xs text-muted-foreground">{t('amountInWords')}</div>
          <div className="text-sm font-medium">{words}</div>
        </div>

        <SignatureBlock
          locale={locale}
          slots={[signature('RECEIVED', receipt.cashierName), signature('STUDENT')]}
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
