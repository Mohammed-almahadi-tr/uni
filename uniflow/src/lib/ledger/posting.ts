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
import { Prisma } from '@/generated/prisma/client';
import type { SourceModule, SubledgerType, VoucherType } from '@/generated/prisma/enums';
import type { Tx } from '@/lib/db/client';
import { sum, toFunctional, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import { allocateDocumentNumber } from './sequence';
import { resolveOpenPeriod, toDateOnly } from './period';

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

  if (doc.lines.length < 2) {
    throw new InvalidVoucherError(
      `A double entry needs at least two lines; received ${doc.lines.length}.`,
    );
  }
  if (doc.reversesId && !doc.reversalReason?.trim()) {
    throw new InvalidVoucherError('A reversal requires a stated reason.');
  }

  const docDate = toDateOnly(doc.docDate);
  const period = await resolveOpenPeriod(tx, tenantId, docDate);

  // Normalise every line into functional-currency debit/credit amounts.
  const prepared = doc.lines.map((line, i) => {
    const debit = toStorage(line.debit ?? 0);
    const credit = toStorage(line.credit ?? 0);

    if (debit.isNegative() || credit.isNegative()) {
      throw new InvalidVoucherError(
        `Line ${i + 1}: amounts must be non-negative. A negative debit is a credit — enter it as one.`,
      );
    }
    if (debit.isZero() && credit.isZero()) {
      throw new InvalidVoucherError(`Line ${i + 1}: carries neither a debit nor a credit.`);
    }
    if (!debit.isZero() && !credit.isZero()) {
      throw new InvalidVoucherError(
        `Line ${i + 1}: has both a debit and a credit. Split it into two lines.`,
      );
    }

    const txnCurrency = (line.txnCurrency ?? functional).trim();
    const fxRate = new Prisma.Decimal(line.fxRate ?? 1);
    if (fxRate.lessThanOrEqualTo(0)) {
      throw new InvalidVoucherError(`Line ${i + 1}: exchange rate must be positive.`);
    }
    if (txnCurrency === functional && !fxRate.equals(1)) {
      throw new InvalidVoucherError(
        `Line ${i + 1}: currency is the functional currency (${functional}) but the rate is ${fxRate}.`,
      );
    }

    const txnAmount = debit.isZero() ? credit : debit;
    // Functional amounts are what the balance check operates on. A voucher
    // balances in one currency or it does not balance.
    const functionalAmount =
      txnCurrency === functional ? txnAmount : toFunctional(txnAmount, fxRate);

    return {
      lineNo: i + 1,
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
    };
  });

  const totalDebit = sum(prepared.map((l) => l.debitAmount));
  const totalCredit = sum(prepared.map((l) => l.creditAmount));

  if (!totalDebit.equals(totalCredit)) {
    throw new UnbalancedVoucherError(totalDebit, totalCredit);
  }
  if (totalDebit.isZero()) {
    throw new InvalidVoucherError('A voucher totalling zero carries no information.');
  }

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

  await rollBalances(tx, tenantId, period.fiscalPeriodId, prepared);

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
    await tx.$executeRaw`
      INSERT INTO account_period_balances
        (id, tenant_id, account_id, cost_center_id, fiscal_period_id,
         opening_debit, opening_credit, movement_debit, movement_credit)
      VALUES
        (gen_random_uuid(), ${tenantId}::uuid, ${e.accountId}::uuid,
         ${e.costCenterId}::uuid, ${fiscalPeriodId}::uuid,
         0, 0, ${e.debit.toFixed(4)}::numeric, ${e.credit.toFixed(4)}::numeric)
      ON CONFLICT (tenant_id, account_id, cost_center_id, fiscal_period_id)
      DO UPDATE SET
        movement_debit  = account_period_balances.movement_debit  + EXCLUDED.movement_debit,
        movement_credit = account_period_balances.movement_credit + EXCLUDED.movement_credit
    `;
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
