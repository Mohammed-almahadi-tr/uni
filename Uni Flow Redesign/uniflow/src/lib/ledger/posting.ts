/**
 * The posting engine.
 *
 * One function. Every module that touches the ledger — registration,
 * cashiering, cheque transitions, depreciation, revenue recognition,
 * procurement — goes through it. There is no second way to write to
 * transaction_headers.
 *
 * This is the direct answer to the legacy system's central defect: its
 * registration screen and its finance screens wrote to *different tables*
 * (`Transactions` and `Transactionees`) with *different amount columns*
 * (TotalIn/TotalOut vs TotalValueIn/TotalValueOut), and the two were
 * reconciled by hand. Registration in fact posted nothing at all — the
 * posting block is commented out with the note "the debit/cridit will be
 * inserted from financial system".
 *
 * Responsibilities, all inside one database transaction:
 *   · resolve the fiscal period from the document date, and require it open
 *   · verify the voucher balances in functional currency
 *   · allocate the voucher number under a row lock
 *   · insert header and lines
 *   · roll the affected account/period balance aggregates forward
 *
 * The database enforces the same invariants independently. The checks here
 * exist to produce a sentence a human can act on; the constraints exist so
 * that correctness does not depend on this file being right.
 */
import type { SourceModule, VoucherType } from '@/generated/prisma/enums';
import type { Tx } from '@/lib/db/client';
import type { Money } from '@/lib/money';
import { summariseLines, type LineIssueCode, type PostingLine } from './lines';
import { allocateDocumentNumber } from './sequence';
import { resolveOpenPeriod, toDateOnly } from './period';

export type {
  PostingLine,
  PreparedLine,
  LineIssue,
  LineIssueCode,
  VoucherSummary,
} from './lines';
export { summariseLines } from './lines';

export interface PostingDocument {
  voucherType: VoucherType;
  /** Calendar day of the document. Determines the fiscal period. */
  docDate: Date;
  description: string;
  sourceModule?: SourceModule;
  /** Id of the business record that caused this posting, so any ledger entry
   *  can be traced back to its cause. */
  sourceRef?: string | null;
  lines: PostingLine[];
  postedById?: string | null;
  isOpeningEntry?: boolean;
  /** Set when this document reverses another. Requires a reason. */
  reversesId?: string | null;
  reversalReason?: string | null;
}

export interface PostedVoucher {
  headerId: string;
  voucherNo: number;
  voucherRef: string;
  fiscalPeriodId: string;
  totalAmount: string;
}

export class UnbalancedVoucherError extends Error {
  constructor(
    readonly debits: Money,
    readonly credits: Money,
  ) {
    const diff = debits.minus(credits);
    super(
      `Voucher does not balance: debits ${debits.toFixed(2)} vs credits ` +
        `${credits.toFixed(2)} (out by ${diff.toFixed(2)}).`,
    );
    this.name = 'UnbalancedVoucherError';
  }
}

export class InvalidVoucherError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidVoucherError';
  }
}

/**
 * Post a document to the general ledger.
 *
 * Must be called inside a transaction that already carries tenant context —
 * i.e. from within `withTenant(...)`. It never opens its own transaction, so
 * that callers can make the posting atomic with the business record that
 * caused it. A registration and its ledger entry either both exist or neither
 * does; that is the whole point.
 */
export async function post(
  tx: Tx,
  tenantId: string,
  doc: PostingDocument,
): Promise<PostedVoucher> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });
  const functional = tenant.functionalCurrency.trim();

  if (doc.reversesId && !doc.reversalReason?.trim()) {
    throw new InvalidVoucherError('A reversal requires a stated reason.');
  }

  // The same rules the voucher grid evaluates live, evaluated once more here.
  // Shared implementation, not a shared specification — see ledger/lines.ts.
  const summary = summariseLines(doc.lines, functional);
  const { lines: prepared, totalDebit, totalCredit } = summary;

  if (!summary.balanced) {
    // Report the root cause, not its consequence. A one-line voucher is also
    // unbalanced; telling the maker it is out by 500 when the real problem is
    // that they entered one side helps nobody.
    const first = (code: LineIssueCode) => summary.issues.find((i) => i.code === code);
    const root = first('LINE_COUNT') ?? first('LINE');
    if (root) throw new InvalidVoucherError(root.message);
    if (first('UNBALANCED')) throw new UnbalancedVoucherError(totalDebit, totalCredit);
    throw new InvalidVoucherError(summary.issues[0].message);
  }

  const docDate = toDateOnly(doc.docDate);
  const period = await resolveOpenPeriod(tx, tenantId, docDate);

  const { voucherNo, voucherRef } = await allocateDocumentNumber(
    tx,
    tenantId,
    period.fiscalYearId,
    doc.voucherType,
  );

  const header = await tx.transactionHeader.create({
    data: {
      tenantId,
      fiscalYearId: period.fiscalYearId,
      fiscalPeriodId: period.fiscalPeriodId,
      voucherType: doc.voucherType,
      voucherNo,
      voucherRef,
      docDate,
      description: doc.description,
      sourceModule: doc.sourceModule ?? 'MANUAL',
      sourceRef: doc.sourceRef ?? null,
      currency: functional,
      totalAmount: totalDebit,
      postedById: doc.postedById ?? null,
      isOpeningEntry: doc.isOpeningEntry ?? false,
      reversesId: doc.reversesId ?? null,
      reversalReason: doc.reversalReason ?? null,
      lines: {
        create: prepared.map((l) => ({
          lineNo: l.lineNo,
          accountId: l.accountId,
          costCenterId: l.costCenterId,
          subledgerType: l.subledgerType,
          subledgerId: l.subledgerId,
          txnCurrency: l.txnCurrency,
          txnAmount: l.txnAmount,
          fxRate: l.fxRate,
          debitAmount: l.debitAmount,
          creditAmount: l.creditAmount,
          lineDescr: l.lineDescr,
        })),
      },
    },
    select: { id: true },
  });

  // Stamp the voucher being reversed, so "is this live?" needs no join.
  if (doc.reversesId) {
    await tx.transactionHeader.update({
      where: { id: doc.reversesId },
      data: { reversedAt: new Date() },
    });
  }

  await rollBalances(
    tx,
    tenantId,
    period.fiscalPeriodId,
    prepared,
    doc.isOpeningEntry ? 'opening' : 'movement',
  );

  return {
    headerId: header.id,
    voucherNo,
    voucherRef,
    fiscalPeriodId: period.fiscalPeriodId,
    totalAmount: totalDebit.toFixed(4),
  };
}

/**
 * Move the period aggregates that reports read from.
 *
 * SRS REQ-NFR-02 promises a trial balance in under 100ms over a million
 * journal lines. That is only achievable by maintaining balances as vouchers
 * post; the legacy reports scanned the entire ledger with
 * SUM(TotalIn)-SUM(TotalOut) on every run.
 *
 * ON CONFLICT ... DO UPDATE against the NULLS NOT DISTINCT unique index, so a
 * line with no cost centre lands on one row rather than creating a new one
 * every time.
 *
 * An OPENING entry lands in `opening_*`, everything else in `movement_*`. SRS
 * REQ-PER-03 requires opening balances to be excluded from period movement,
 * and this is where that exclusion happens: a trial balance that showed a
 * university's go-live balances as January activity would report the whole
 * institution as having been created in one month.
 */
async function rollBalances(
  tx: Tx,
  tenantId: string,
  fiscalPeriodId: string,
  lines: Array<{
    accountId: string;
    costCenterId: string | null;
    debitAmount: Money;
    creditAmount: Money;
  }>,
  column: 'opening' | 'movement',
): Promise<void> {
  // Collapse to one update per (account, cost centre) so a 40-line voucher
  // does not issue 40 upserts against the same row.
  const agg = new Map<
    string,
    { accountId: string; costCenterId: string | null; debit: Money; credit: Money }
  >();

  for (const l of lines) {
    const key = `${l.accountId}::${l.costCenterId ?? ''}`;
    const cur = agg.get(key);
    if (cur) {
      cur.debit = cur.debit.plus(l.debitAmount);
      cur.credit = cur.credit.plus(l.creditAmount);
    } else {
      agg.set(key, {
        accountId: l.accountId,
        costCenterId: l.costCenterId,
        debit: l.debitAmount,
        credit: l.creditAmount,
      });
    }
  }

  for (const e of agg.values()) {
    const d = e.debit.toFixed(4);
    const c = e.credit.toFixed(4);

    // Two nearly identical statements rather than one with interpolated column
    // names. A column name cannot be a bound parameter, and building this SQL
    // by concatenation to save eight lines is how an injection point gets
    // introduced into the one function every posting in the system passes
    // through.
    if (column === 'opening') {
      await tx.$executeRaw`
        INSERT INTO account_period_balances
          (id, tenant_id, account_id, cost_center_id, fiscal_period_id,
           opening_debit, opening_credit, movement_debit, movement_credit)
        VALUES
          (gen_random_uuid(), ${tenantId}::uuid, ${e.accountId}::uuid,
           ${e.costCenterId}::uuid, ${fiscalPeriodId}::uuid,
           ${d}::numeric, ${c}::numeric, 0, 0)
        ON CONFLICT (tenant_id, account_id, cost_center_id, fiscal_period_id)
        DO UPDATE SET
          opening_debit  = account_period_balances.opening_debit  + EXCLUDED.opening_debit,
          opening_credit = account_period_balances.opening_credit + EXCLUDED.opening_credit
      `;
    } else {
      await tx.$executeRaw`
        INSERT INTO account_period_balances
          (id, tenant_id, account_id, cost_center_id, fiscal_period_id,
           opening_debit, opening_credit, movement_debit, movement_credit)
        VALUES
          (gen_random_uuid(), ${tenantId}::uuid, ${e.accountId}::uuid,
           ${e.costCenterId}::uuid, ${fiscalPeriodId}::uuid,
           0, 0, ${d}::numeric, ${c}::numeric)
        ON CONFLICT (tenant_id, account_id, cost_center_id, fiscal_period_id)
        DO UPDATE SET
          movement_debit  = account_period_balances.movement_debit  + EXCLUDED.movement_debit,
          movement_credit = account_period_balances.movement_credit + EXCLUDED.movement_credit
      `;
    }
  }
}

/**
 * Reverse a posted voucher (SRS REQ-FIN-05).
 *
 * Creates a linked opposite entry. It never edits or deletes the original —
 * the database will not permit that in any case. The reversal posts into the
 * period covering `reversalDate`, which for a closed original period is a
 * later open one; the original document date stays visible on the original.
 */
export async function reverse(
  tx: Tx,
  tenantId: string,
  headerId: string,
  reason: string,
  opts: { reversalDate?: Date; postedById?: string | null } = {},
): Promise<PostedVoucher> {
  if (!reason?.trim()) {
    throw new InvalidVoucherError('A reversal requires a stated reason.');
  }

  const original = await tx.transactionHeader.findUniqueOrThrow({
    where: { id: headerId },
    include: { lines: { orderBy: { lineNo: 'asc' } } },
  });

  if (original.tenantId !== tenantId) {
    throw new InvalidVoucherError('Cannot reverse a voucher belonging to another tenant.');
  }
  if (original.reversedAt) {
    throw new InvalidVoucherError(
      `Voucher ${original.voucherRef} has already been reversed.`,
    );
  }
  if (original.reversesId) {
    throw new InvalidVoucherError(
      `Voucher ${original.voucherRef} is itself a reversal. Post a fresh correcting entry instead.`,
    );
  }

  return post(tx, tenantId, {
    voucherType: 'REVERSAL',
    docDate: opts.reversalDate ?? new Date(),
    description: `Reversal of ${original.voucherRef}: ${original.description}`,
    sourceModule: original.sourceModule,
    sourceRef: original.sourceRef,
    postedById: opts.postedById ?? null,
    reversesId: original.id,
    reversalReason: reason.trim(),
    lines: original.lines.map((l) => ({
      accountId: l.accountId,
      costCenterId: l.costCenterId,
      subledgerType: l.subledgerType,
      subledgerId: l.subledgerId,
      txnCurrency: l.txnCurrency.trim(),
      fxRate: l.fxRate,
      // Sides swapped. Amounts are already in functional currency, and the
      // fx rate is carried through so the reversal values identically to the
      // original rather than at today's rate.
      debit: l.creditAmount.isZero() ? undefined : l.txnAmount,
      credit: l.debitAmount.isZero() ? undefined : l.txnAmount,
      description: l.lineDescr,
    })),
  });
}
