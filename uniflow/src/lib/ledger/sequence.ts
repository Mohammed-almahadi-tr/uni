/**
 * Document number allocation (SRS REQ-FIN-06).
 *
 * The legacy system allocated every voucher number with
 *
 *     SELECT ISNULL(MAX(MoveNo), 0) + 1 FROM Transactions WHERE Year(...) = ...
 *
 * read inside the transaction. Two cashiers posting at the same moment both
 * read the same maximum and both wrote it — a lost update, and duplicate
 * voucher numbers in a statutory ledger. Its fixed-asset module additionally
 * omitted the Year() filter the other call sites applied, so its numbers
 * collided with prior years by construction.
 *
 * Here the counter is a row, and allocation takes a row lock. Concurrent
 * allocators serialise on that lock rather than racing. The unique constraint
 * on (tenant, fiscal year, type, number) is the backstop that makes a
 * regression loud instead of silent.
 */
import type { Tx } from '@/lib/db/client';
import type { VoucherType } from '@/generated/prisma/enums';

export interface AllocatedNumber {
  voucherNo: number;
  /** Human-facing reference, e.g. "JV-2026-000042". */
  voucherRef: string;
}

/**
 * Take the next number for this tenant × fiscal year × document type.
 *
 * Gapless: the number is consumed inside the caller's transaction, so if the
 * posting rolls back the number rolls back with it. That is the correct
 * trade-off for statutory documents — a gap in a receipt book is a question
 * an auditor will ask, and the cost is that concurrent allocators for the
 * *same* series queue behind one another. Series are per document type, so
 * cashiering does not block journals.
 */
export async function allocateDocumentNumber(
  tx: Tx,
  tenantId: string,
  fiscalYearId: string,
  docType: VoucherType,
): Promise<AllocatedNumber> {
  const rows = await tx.$queryRaw<
    Array<{ next_value: number; prefix: string; padding: number }>
  >`
    UPDATE document_sequences
       SET next_value = next_value + 1
     WHERE tenant_id = ${tenantId}::uuid
       AND fiscal_year_id = ${fiscalYearId}::uuid
       AND doc_type = ${docType}::"VoucherType"
    RETURNING next_value - 1 AS next_value, prefix, padding
  `;

  if (rows.length === 0) {
    throw new SequenceNotConfiguredError(docType, fiscalYearId);
  }

  const { next_value: voucherNo, prefix, padding } = rows[0];
  return {
    voucherNo,
    voucherRef: formatReference(prefix, voucherNo, padding),
  };
}

/**
 * Create the counters a fiscal year needs. Called when a fiscal year is
 * opened; every document type gets its own independent series.
 */
export async function initialiseSequences(
  tx: Tx,
  tenantId: string,
  fiscalYearId: string,
  yearLabel: string,
  docTypes: VoucherType[],
): Promise<void> {
  await tx.documentSequence.createMany({
    data: docTypes.map((docType) => ({
      tenantId,
      fiscalYearId,
      docType,
      nextValue: 1,
      prefix: `${DEFAULT_PREFIX[docType] ?? 'DOC'}-${yearLabel}-`,
      padding: 6,
    })),
    skipDuplicates: true,
  });
}

function formatReference(prefix: string, value: number, padding: number): string {
  return `${prefix}${String(value).padStart(padding, '0')}`;
}

export const DEFAULT_PREFIX: Partial<Record<VoucherType, string>> = {
  JOURNAL: 'JV',
  STUDENT_RECEIPT: 'SRV',
  GENERAL_RECEIPT: 'RV',
  PAYMENT: 'PV',
  REGISTRATION: 'REG',
  DEPRECIATION: 'DEP',
  REVENUE_RECOGNITION: 'REV',
  CHEQUE_MOVEMENT: 'CHQ',
  FX_REVALUATION: 'FX',
  OPENING_BALANCE: 'OB',
  REVERSAL: 'REVR',
  YEAR_END_CLOSE: 'YEC',
};

export class SequenceNotConfiguredError extends Error {
  constructor(
    readonly docType: VoucherType,
    readonly fiscalYearId: string,
  ) {
    super(
      `No ${docType} number series is configured for fiscal year ${fiscalYearId}. ` +
        `Open the fiscal year before posting to it.`,
    );
    this.name = 'SequenceNotConfiguredError';
  }
}
