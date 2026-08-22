/**
 * Line normalisation and balancing — the rules a voucher's lines must satisfy,
 * in one place.
 *
 * Two callers need these rules and they need them to agree exactly:
 *
 *   posting.ts        — throws on the first violation, because a posting either
 *                       happens or does not.
 *   voucher/draft.ts  — collects every violation, because a maker filling in a
 *                       grid wants to see all of them at once, and the footer
 *                       has to show a running debit/credit total that matches
 *                       what the server will compute when the voucher is
 *                       eventually posted.
 *
 * They must share an implementation rather than a specification. A grid that
 * says "balanced" against a server that says "out by 0.01" is the worst
 * possible outcome: the maker cannot proceed and cannot see why. The rounding
 * of a foreign-currency line to functional currency is where that divergence
 * would come from, and it happens here, once.
 */
import { Prisma } from '@/generated/prisma/client';
import type { SubledgerType } from '@/generated/prisma/enums';
import { sum, toFunctional, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';

export interface PostingLine {
  accountId: string;
  costCenterId?: string | null;
  subledgerType?: SubledgerType | null;
  subledgerId?: string | null;
  /** Currency this line was entered in. Defaults to the tenant's functional
   *  currency when omitted. */
  txnCurrency?: string;
  /** Rate to the functional currency. 1 when the line is already functional. */
  fxRate?: MoneyInput;
  debit?: MoneyInput;
  credit?: MoneyInput;
  description?: string | null;
}

/** A line with its amounts resolved into functional currency — the shape the
 *  ledger stores and the balance check operates on. */
export interface PreparedLine {
  lineNo: number;
  accountId: string;
  costCenterId: string | null;
  subledgerType: SubledgerType | null;
  subledgerId: string | null;
  txnCurrency: string;
  txnAmount: Money;
  fxRate: Money;
  debitAmount: Money;
  creditAmount: Money;
  lineDescr: string | null;
}

/**
 * Machine-readable kind, so callers can rank problems without matching on
 * message text. Order matters when reporting: a one-line voucher is also
 * unbalanced, and telling the maker it is out by 500 when the real problem is
 * that they have only entered one side is unhelpful.
 */
export type LineIssueCode =
  /** Fewer than two lines. */
  | 'LINE_COUNT'
  /** Something wrong with a specific line. */
  | 'LINE'
  /** Debits do not equal credits. */
  | 'UNBALANCED'
  /** Balanced, but at zero. */
  | 'ZERO_TOTAL';

export interface LineIssue {
  /** 1-based line number, or 0 for a problem with the voucher as a whole. */
  lineNo: number;
  code: LineIssueCode;
  message: string;
}

export type PreparedLineResult =
  | { ok: true; line: PreparedLine }
  | { ok: false; issue: LineIssue };

/**
 * Normalise one line.
 *
 * `index` is 0-based; the messages are 1-based, because that is how the row is
 * labelled on screen.
 */
export function prepareLine(
  line: PostingLine,
  index: number,
  functionalCurrency: string,
): PreparedLineResult {
  const lineNo = index + 1;
  const fail = (message: string): PreparedLineResult => ({
    ok: false,
    issue: { lineNo, code: 'LINE', message },
  });

  const debit = toStorage(line.debit ?? 0);
  const credit = toStorage(line.credit ?? 0);

  if (debit.isNegative() || credit.isNegative()) {
    return fail(
      `Line ${lineNo}: amounts must be non-negative. A negative debit is a credit — enter it as one.`,
    );
  }
  if (debit.isZero() && credit.isZero()) {
    return fail(`Line ${lineNo}: carries neither a debit nor a credit.`);
  }
  if (!debit.isZero() && !credit.isZero()) {
    return fail(`Line ${lineNo}: has both a debit and a credit. Split it into two lines.`);
  }

  const txnCurrency = (line.txnCurrency ?? functionalCurrency).trim();
  const fxRate = new Prisma.Decimal(line.fxRate ?? 1);
  if (fxRate.lessThanOrEqualTo(0)) {
    return fail(`Line ${lineNo}: exchange rate must be positive.`);
  }
  if (txnCurrency === functionalCurrency && !fxRate.equals(1)) {
    return fail(
      `Line ${lineNo}: currency is the functional currency (${functionalCurrency}) but the rate is ${fxRate}.`,
    );
  }

  const txnAmount = debit.isZero() ? credit : debit;
  // The balance check operates on functional amounts. A voucher balances in
  // one currency or it does not balance at all.
  const functionalAmount =
    txnCurrency === functionalCurrency ? txnAmount : toFunctional(txnAmount, fxRate);

  return {
    ok: true,
    line: {
      lineNo,
      accountId: line.accountId,
      costCenterId: line.costCenterId ?? null,
      subledgerType: line.subledgerType ?? null,
      subledgerId: line.subledgerId ?? null,
      txnCurrency,
      txnAmount,
      fxRate,
      debitAmount: debit.isZero() ? ZERO : functionalAmount,
      creditAmount: credit.isZero() ? ZERO : functionalAmount,
      lineDescr: line.description ?? null,
    },
  };
}

export interface VoucherSummary {
  /** Only the lines that normalised cleanly. */
  lines: PreparedLine[];
  /** Every problem found, in line order, document-level ones first. */
  issues: LineIssue[];
  totalDebit: Money;
  totalCredit: Money;
  /** debits − credits. Signed, because the maker needs to know which way. */
  difference: Money;
  /** True only when the voucher is postable as it stands. */
  balanced: boolean;
}

/**
 * Summarise a whole voucher without touching the database.
 *
 * This is what the voucher grid calls on every keystroke, and what the draft
 * writer calls before saving. It never throws — an incomplete voucher being
 * typed is the normal case, not an error.
 */
export function summariseLines(
  lines: readonly PostingLine[],
  functionalCurrency: string,
): VoucherSummary {
  const prepared: PreparedLine[] = [];
  const issues: LineIssue[] = [];

  if (lines.length < 2) {
    issues.push({
      lineNo: 0,
      code: 'LINE_COUNT',
      message: `A double entry needs at least two lines; received ${lines.length}.`,
    });
  }

  lines.forEach((line, i) => {
    const r = prepareLine(line, i, functionalCurrency);
    if (r.ok) prepared.push(r.line);
    else issues.push(r.issue);
  });

  const totalDebit = sum(prepared.map((l) => l.debitAmount));
  const totalCredit = sum(prepared.map((l) => l.creditAmount));
  const difference = totalDebit.minus(totalCredit);

  if (!difference.isZero()) {
    issues.push({
      lineNo: 0,
      code: 'UNBALANCED',
      message:
        `Voucher does not balance: debits ${totalDebit.toFixed(2)} vs credits ` +
        `${totalCredit.toFixed(2)} (out by ${difference.toFixed(2)}).`,
    });
  } else if (totalDebit.isZero() && lines.length >= 2) {
    issues.push({
      lineNo: 0,
      code: 'ZERO_TOTAL',
      message: 'A voucher totalling zero carries no information.',
    });
  }

  return {
    lines: prepared,
    issues,
    totalDebit,
    totalCredit,
    difference,
    balanced: issues.length === 0,
  };
}
