import type { Tx } from '@/lib/db/client';

/**
 * Draft numbering.
 *
 * A deliberately separate series from `document_sequences`, which numbers
 * posted vouchers. Two reasons:
 *
 *   · A draft number identifies a *proposal*. Most proposals become vouchers,
 *     but some are rejected and some are abandoned. If drafts drew from the
 *     voucher series, every abandoned draft would burn a statutory number,
 *     and an auditor asking why receipt 41 does not exist deserves a better
 *     answer than "someone changed their mind".
 *
 *   · Voucher numbers must be allocated at the moment of posting, not at the
 *     moment of drafting, or the ledger's chronology stops matching its
 *     numbering.
 *
 * Allocation is a single upsert, so two makers hitting Save at the same
 * instant serialise on the row lock rather than racing — the same discipline
 * as `allocateDocumentNumber`, and for the same reason. The legacy system used
 * `MAX(MoveNo) + 1` and produced duplicates under exactly this load.
 */
export interface AllocatedDraftNumber {
  draftNo: string;
  seq: number;
}

export async function allocateDraftNumber(
  tx: Tx,
  tenantId: string,
  fiscalYearId: string,
  yearLabel: string,
): Promise<AllocatedDraftNumber> {
  const rows = await tx.$queryRaw<Array<{ value: number; prefix: string; padding: number }>>`
    INSERT INTO draft_sequences (tenant_id, fiscal_year_id, next_value, prefix, padding)
    VALUES (${tenantId}::uuid, ${fiscalYearId}::uuid, 2, ${`DFT-${yearLabel}-`}, 6)
    ON CONFLICT (tenant_id, fiscal_year_id)
    DO UPDATE SET next_value = draft_sequences.next_value + 1
    RETURNING next_value - 1 AS value, prefix, padding
  `;

  // The upsert either inserts (returning 2 - 1 = 1) or increments; there is no
  // third outcome, so an empty result would mean the statement itself changed.
  const { value, prefix, padding } = rows[0];
  return { seq: value, draftNo: `${prefix}${String(value).padStart(padding, '0')}` };
}
