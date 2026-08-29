import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { requireAccount } from '@/lib/coa/mapping';
import { classifyOrNull } from '@/lib/coa/classification';
import { ZERO, type Money } from '@/lib/money';
import { ledgerSlice } from '@/lib/reports/balances';
import { post, reverse, type PostedVoucher, type PostingLine } from './posting';
import { toDateOnly } from './period';

/**
 * Year-end close (SRS REQ-PER-04).
 *
 * One posting does the whole job: every revenue and expense account is written
 * back to zero and the net lands in Retained Surplus. After it, the new year
 * opens with the result accounts flat and the surplus sitting in equity, which
 * is what "revenue and expense roll to Retained Earnings" means.
 *
 * ## What this deliberately does not do
 *
 * It does not copy balance-sheet closing figures into the next year's opening
 * columns. Those carry forward by derivation — `reports/balances.ts` sums the
 * periods before the window, so a balance-sheet account's opening balance is
 * recomputed from the same postings the movement column is built from and
 * cannot drift away from them. A copied figure can, silently, the first time
 * anyone posts a correction into a reopened period.
 *
 * The consequence worth stating plainly: **running the close is not what makes
 * next year's opening balances correct.** They are correct either way. The
 * close is what stops last year's revenue from appearing in next year's income
 * statement, and what moves the surplus into equity where the balance sheet
 * shows it as accumulated rather than as this year's result.
 *
 * ## Reversibility
 *
 * REQ-PER-04 requires the close to be reversible until the year is
 * permanently closed. It is: `reopenFiscalYear` reverses the closing voucher
 * through the ordinary reversal path, so the undo is itself a posting with a
 * reason and an audit trail — not a delete.
 */

export class YearEndError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'YearEndError';
  }
}

export interface CloseFiscalYearResult {
  fiscalYearId: string;
  /** Null when there was nothing to close — no revenue, no expense. */
  voucher: PostedVoucher | null;
  /** Result accounts written back to zero. */
  accountsClosed: number;
  /** Positive is a surplus, negative a deficit. */
  netSurplus: string;
  totalRevenue: string;
  totalExpense: string;
}

/**
 * Close a fiscal year.
 *
 * Posts the closing voucher into the period covering the year's last day,
 * which must still be OPEN — you close the books and *then* lock them, not the
 * reverse. Every period of the year is then set CLOSED and the year itself
 * marked CLOSED.
 */
export async function closeFiscalYear(
  principal: Principal,
  fiscalYearId: string,
): Promise<CloseFiscalYearResult> {
  requirePermission(principal, 'period.close');

  return withTenant(principal.tenantId, async (tx) => {
    const year = await loadYear(tx, principal.tenantId, fiscalYearId);

    if (year.status === 'CLOSED' || year.status === 'PERMANENTLY_CLOSED') {
      throw new YearEndError(
        `Fiscal year ${year.name} is already ${year.status}. Reopen it before closing it again.`,
      );
    }

    const pending = await tx.voucherDraft.count({
      where: {
        tenantId: principal.tenantId,
        fiscalYearId,
        state: { in: ['PENDING_REVIEW', 'PENDING_APPROVAL'] },
      },
    });
    if (pending > 0) {
      throw new YearEndError(
        `${pending} voucher(s) are still awaiting approval in ${year.name}. ` +
          `Closing now would leave them unpostable: their period would be shut ` +
          `before they reached the ledger.`,
      );
    }

    const result = await postClosingEntry(tx, principal, year);

    await tx.fiscalPeriod.updateMany({
      where: { fiscalYearId, status: { not: 'PERMANENTLY_CLOSED' } },
      data: { status: 'CLOSED', closedAt: new Date(), closedById: principal.userId },
    });
    await tx.fiscalYear.update({
      where: { id: fiscalYearId },
      data: { status: 'CLOSED' },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'PERIOD_CLOSE',
      resourceType: 'fiscal_year',
      resourceId: fiscalYearId,
      before: { status: year.status },
      after: {
        status: 'CLOSED',
        voucherRef: result.voucher?.voucherRef ?? null,
        netSurplus: result.netSurplus,
        accountsClosed: result.accountsClosed,
      },
    });

    return result;
  });
}

interface YearRow {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: 'FUTURE' | 'OPEN' | 'CLOSED' | 'PERMANENTLY_CLOSED';
}

async function loadYear(tx: Tx, tenantId: string, fiscalYearId: string): Promise<YearRow> {
  const year = await tx.fiscalYear.findUnique({
    where: { id: fiscalYearId },
    select: { id: true, tenantId: true, name: true, startDate: true, endDate: true, status: true },
  });
  if (!year || year.tenantId !== tenantId) {
    throw new YearEndError('That fiscal year does not belong to this university.');
  }
  return year;
}

async function postClosingEntry(
  tx: Tx,
  principal: Principal,
  year: YearRow,
): Promise<CloseFiscalYearResult> {
  const retained = await requireAccount(tx, principal.tenantId, 'RETAINED_SURPLUS');

  // The year's own activity, not since inception: a close that swept the
  // cumulative balance would double-count every prior year already rolled into
  // equity. Result accounts should open the year at zero anyway — that is what
  // the previous close guaranteed — but reading the window rather than the
  // total means one missed close does not silently corrupt the next one.
  const slices = await ledgerSlice(tx, principal.tenantId, {
    from: year.startDate,
    to: year.endDate,
  });

  const accounts = await tx.account.findMany({
    where: { tenantId: principal.tenantId, isPostable: true },
    select: { id: true, code: true },
  });

  const lines: PostingLine[] = [];
  let totalRevenue = ZERO;
  let totalExpense = ZERO;
  let accountsClosed = 0;

  for (const a of accounts) {
    if (a.id === retained) continue;
    const cls = classifyOrNull(a.code);
    if (cls !== 'REVENUE' && cls !== 'EXPENSE') continue;

    const s = slices.get(a.id);
    if (!s) continue;

    // Everything the account did this year, opening injections included: a
    // go-live opening balance on a revenue account is still revenue of this
    // year and still has to be cleared, or it survives into the next one.
    const net = s.openingDebit
      .plus(s.movementDebit)
      .minus(s.openingCredit)
      .minus(s.movementCredit);
    if (net.isZero()) continue;

    accountsClosed += 1;
    if (cls === 'REVENUE') totalRevenue = totalRevenue.minus(net);
    else totalExpense = totalExpense.plus(net);

    // Post the opposite of the balance, so the account lands on zero.
    lines.push(
      net.isNegative()
        ? { accountId: a.id, debit: net.negated().toFixed(4), description: `Year-end close ${year.name}` }
        : { accountId: a.id, credit: net.toFixed(4), description: `Year-end close ${year.name}` },
    );
  }

  const netSurplus: Money = totalRevenue.minus(totalExpense);

  if (lines.length === 0) {
    return {
      fiscalYearId: year.id,
      voucher: null,
      accountsClosed: 0,
      netSurplus: ZERO.toFixed(4),
      totalRevenue: ZERO.toFixed(4),
      totalExpense: ZERO.toFixed(4),
    };
  }

  // The balancing line. A surplus credits equity; a deficit debits it. A year
  // that broke exactly even needs no line at all — the reversing lines already
  // sum to zero — and a zero-amount line would be rejected as empty.
  if (!netSurplus.isZero()) {
    lines.push(
      netSurplus.isNegative()
        ? {
            accountId: retained,
            debit: netSurplus.negated().toFixed(4),
            description: `Deficit for ${year.name}`,
          }
        : {
            accountId: retained,
            credit: netSurplus.toFixed(4),
            description: `Surplus for ${year.name}`,
          },
    );
  }

  const voucher = await post(tx, principal.tenantId, {
    voucherType: 'YEAR_END_CLOSE',
    docDate: toDateOnly(year.endDate),
    description: `Year-end close ${year.name}`,
    sourceModule: 'PERIOD_CLOSE',
    sourceRef: year.id,
    postedById: principal.userId,
    lines,
  });

  return {
    fiscalYearId: year.id,
    voucher,
    accountsClosed,
    netSurplus: netSurplus.toFixed(4),
    totalRevenue: totalRevenue.toFixed(4),
    totalExpense: totalExpense.toFixed(4),
  };
}

export interface ReopenFiscalYearResult {
  fiscalYearId: string;
  /** Null when the close posted nothing to undo. */
  reversal: PostedVoucher | null;
}

/**
 * Undo a year-end close.
 *
 * Reopens the final period first — the reversal has to land somewhere, and a
 * reversal posted into a later year would put last year's revenue back into
 * next year's income statement, which is the exact error the close exists to
 * prevent.
 */
export async function reopenFiscalYear(
  principal: Principal,
  fiscalYearId: string,
  reason: string,
): Promise<ReopenFiscalYearResult> {
  requirePermission(principal, 'period.close');

  if (!reason?.trim()) {
    throw new YearEndError('Reopening a closed year requires a stated reason.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const year = await loadYear(tx, principal.tenantId, fiscalYearId);

    if (year.status === 'PERMANENTLY_CLOSED') {
      throw new YearEndError(
        `Fiscal year ${year.name} is permanently closed and cannot be reopened. ` +
          `Post a correcting entry in an open year instead.`,
      );
    }
    if (year.status !== 'CLOSED') {
      throw new YearEndError(`Fiscal year ${year.name} is ${year.status}, not CLOSED.`);
    }

    const closing = await tx.transactionHeader.findFirst({
      where: {
        tenantId: principal.tenantId,
        fiscalYearId,
        voucherType: 'YEAR_END_CLOSE',
        reversedAt: null,
      },
      orderBy: { postedAt: 'desc' },
      select: { id: true, fiscalPeriodId: true, docDate: true },
    });

    // Reopen the year and the period the reversal must land in, before posting
    // it: `post` refuses a period that is not OPEN, and rightly so.
    await tx.fiscalYear.update({ where: { id: fiscalYearId }, data: { status: 'OPEN' } });

    let reversal: PostedVoucher | null = null;
    if (closing) {
      await tx.fiscalPeriod.update({
        where: { id: closing.fiscalPeriodId },
        data: { status: 'OPEN', closedAt: null, closedById: null },
      });
      reversal = await reverse(tx, principal.tenantId, closing.id, reason.trim(), {
        reversalDate: closing.docDate,
        postedById: principal.userId,
      });
    }

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'PERIOD_OPEN',
      resourceType: 'fiscal_year',
      resourceId: fiscalYearId,
      before: { status: 'CLOSED' },
      after: { status: 'OPEN', reason: reason.trim(), reversalRef: reversal?.voucherRef ?? null },
    });

    return { fiscalYearId, reversal };
  });
}
