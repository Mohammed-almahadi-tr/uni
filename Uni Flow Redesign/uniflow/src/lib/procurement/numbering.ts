import type { Tx } from '@/lib/db/client';
import type { ProcurementDocType } from '@/generated/prisma/enums';

/**
 * Numbering for procurement documents.
 *
 * A third series, alongside `document_sequences` (posted vouchers) and
 * `draft_sequences` (voucher proposals), and for the same reason drafts have
 * their own: a requisition that gets rejected must not burn a statutory
 * voucher number. An auditor asking why payment voucher 41 does not exist
 * deserves a better answer than "somebody decided not to buy the chairs".
 *
 * Note that the documents which *do* post — goods receipts, invoices,
 * payments — end up with two identifiers: their own document number and the
 * voucher reference of the entry they made. That is correct. A GRN is a piece
 * of paper the stores officer signs, and the ledger entry it caused is a
 * different object with a different lifetime.
 *
 * Allocation is one upsert, so two officers hitting Save at the same instant
 * serialise on the row lock rather than racing. The legacy system's
 * `MAX(MoveNo) + 1` produced duplicates under exactly this load.
 */

const PREFIX: Record<ProcurementDocType, string> = {
  REQUISITION: 'PR',
  PURCHASE_ORDER: 'PO',
  GOODS_RECEIPT: 'GRN',
  VENDOR_INVOICE: 'INV',
  PAYMENT_VOUCHER: 'PV',
};

export interface AllocatedProcurementNumber {
  docNo: string;
  seq: number;
}

export async function allocateProcurementNumber(
  tx: Tx,
  tenantId: string,
  fiscalYearId: string,
  yearLabel: string,
  docType: ProcurementDocType,
): Promise<AllocatedProcurementNumber> {
  const prefix = `${PREFIX[docType]}-${yearLabel}-`;

  const rows = await tx.$queryRaw<Array<{ value: number; prefix: string; padding: number }>>`
    INSERT INTO procurement_sequences (id, tenant_id, fiscal_year_id, doc_type,
                                       next_value, prefix, padding)
    VALUES (gen_random_uuid(), ${tenantId}::uuid, ${fiscalYearId}::uuid,
            ${docType}::"ProcurementDocType", 2, ${prefix}, 6)
    ON CONFLICT (tenant_id, fiscal_year_id, doc_type)
    DO UPDATE SET next_value = procurement_sequences.next_value + 1
    RETURNING next_value - 1 AS value, prefix, padding
  `;

  // The upsert either inserts (returning 2 - 1 = 1) or increments. There is no
  // third outcome, so an empty result would mean the statement itself changed.
  const { value, prefix: p, padding } = rows[0];
  return { seq: value, docNo: `${p}${String(value).padStart(padding, '0')}` };
}
