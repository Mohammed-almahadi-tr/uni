import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { currentUser } from '@/lib/console/session';
import { tenantCurrency } from '@/lib/console/lookups';
import { accountsByIds, costCenterOptions } from '@/lib/console/finance';
import { letterheadFor } from '@/lib/print/letterhead';
import { signature } from '@/lib/print/sheet';
import { getDraft } from '@/lib/voucher/draft';
import { spellMoney } from '@/lib/i18n/spell';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import { PrintFooter, PrintSheet, SignatureBlock } from '@/components/print/sheet';
import { PrintButton } from '@/components/print/controls';
import { Table, TableWrap, Td, Th, WarningBanner } from '@/components/console/ui';
import { Money } from '@/components/ui/money';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('print');
  return { title: t('voucher') };
}

/**
 * The printed voucher (Track D5, SRS REQ-GL-02).
 *
 * ## What the paper is for
 *
 * The voucher is the document an auditor pulls from a file. It has to carry,
 * on one page, everything the approval chain knew — which the legacy build
 * destroyed at the moment of approval:
 *
 * ```vb
 * Delete From TempVouchers Where MoveNo=…
 * ```
 * (frmApprovingVouchers.vb:990)
 *
 * Approval was an INSERT into the ledger followed by a DELETE of the draft. So
 * nothing recorded who prepared it, who approved it, or when. The printed
 * voucher carried two signature lines and no names, and the file it went into
 * was the only record that anybody had reviewed anything.
 *
 * Here the preparer and the approver are **printed above their rules**,
 * because the system knows them. The rule stays for the wet signature; the
 * name says whose signature it is supposed to be.
 *
 * ## An unapproved voucher prints, and says so
 *
 * A draft is a real document — it goes round the building to be signed before
 * it is approved in the system, which is the order the work actually happens
 * in. So it prints, with a banner saying nothing has been posted. Refusing to
 * print until approval would mean the paper trail begins after the decision it
 * was meant to inform.
 */
export default async function VoucherPrintPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/vouchers/[id]/print');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('print');
  const vt = await getTranslations('ledger.voucherType');

  let draft;
  try {
    draft = await getDraft(principal, id);
  } catch {
    notFound();
  }

  const [currency, accounts, centres, letterhead, user] = await Promise.all([
    tenantCurrency(principal),
    accountsByIds(principal, draft.lines.map((l) => l.accountId)),
    costCenterOptions(principal),
    letterheadFor(principal),
    currentUser(),
  ]);

  const centreByName = new Map(centres.map((c) => [c.id, c.code]));

  // The approver is read off the history rather than recomputed: the paper
  // records what happened, and the state a draft is in now is a different
  // question from who moved it there.
  const approvedBy = draft.history.find((h) => h.toState === 'POSTED')?.actorName ?? null;
  const reviewedBy =
    draft.history.find((h) => h.toState === 'PENDING_APPROVAL')?.actorName ?? null;
  const preparedBy = draft.history[0]?.actorName ?? null;

  const posted = draft.state === 'POSTED';
  const words = spellMoney(draft.totalDebit, currency, locale);

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-center gap-3">
        <Link
          href={`/console/finance/vouchers/${draft.id}`}
          className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
        >
          {t('back')}
        </Link>
        <PrintButton />
      </div>

      {!posted && <WarningBanner>{t('notPosted')}</WarningBanner>}

      <PrintSheet
        letterhead={letterhead}
        locale={locale}
        title={vt(draft.voucherType)}
        subtitle={draft.description}
        reference={{
          numberLabel: t('voucherNo'),
          number: draft.draftNo,
          dateLabel: t('date'),
          date: draft.docDate.toISOString().slice(0, 10),
        }}
      >
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>{t('account')}</Th>
                <Th>{t('description')}</Th>
                <Th>{t('costCentre')}</Th>
                <Th numeric>{t('debit')}</Th>
                <Th numeric>{t('credit')}</Th>
              </tr>
            </thead>
            <tbody>
              {draft.lines.map((l, i) => {
                const a = accounts.get(l.accountId);
                return (
                  <tr key={i} className="break-inside-avoid">
                    <Td>
                      <span className="numeric text-muted-foreground">{a?.code ?? '—'}</span>{' '}
                      {a ? pickText(locale, a.nameAr, a.nameEn) : ''}
                    </Td>
                    <Td>{l.description ?? ''}</Td>
                    <Td>
                      <span className="numeric">
                        {l.costCenterId ? (centreByName.get(l.costCenterId) ?? '—') : '—'}
                      </span>
                    </Td>
                    <Td numeric>
                      {l.debit ? <Money amount={String(l.debit)} currency={currency} /> : ''}
                    </Td>
                    <Td numeric>
                      {l.credit ? <Money amount={String(l.credit)} currency={currency} /> : ''}
                    </Td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-foreground font-semibold">
                <Td>{t('total')}</Td>
                <Td />
                <Td />
                <Td numeric>
                  <Money amount={draft.totalDebit} currency={currency} />
                </Td>
                <Td numeric>
                  <Money amount={draft.totalCredit} currency={currency} />
                </Td>
              </tr>
            </tbody>
          </Table>
        </TableWrap>

        <div className="mt-5 rounded-md bg-muted p-3">
          <div className="text-xs text-muted-foreground">{t('amountInWords')}</div>
          <div className="text-sm font-medium">{words}</div>
        </div>

        <SignatureBlock
          locale={locale}
          slots={[
            signature('PREPARED', preparedBy),
            signature('CHECKED', reviewedBy),
            signature('APPROVED', approvedBy),
          ]}
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
