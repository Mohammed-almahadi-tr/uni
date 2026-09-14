import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';

/**
 * Vendor master (SRS REQ-PRC-01).
 *
 * Entirely new: the legacy system had no vendor entity at all. `frmMakePayBill`
 * posted a grid of expense lines against cash, with the payee's name typed
 * into a free-text `Source` column. There was nothing to age, nothing to
 * reconcile a payable against, and no way to answer "how much do we owe this
 * supplier".
 *
 * The one part of this file that is not routine master data is the bank
 * details.
 *
 * Redirecting a real vendor's payments to an attacker-controlled account is
 * the highest-value fraud in accounts payable, and it requires no forged
 * invoice and no accomplice in procurement — only an edit to one row, after
 * which every legitimate invoice pays the attacker. So:
 *
 *   · the bank columns cannot be changed by an UPDATE at all. A database
 *     trigger refuses unless an APPROVED `vendor_bank_changes` row exists
 *     proposing exactly those values;
 *   · proposing and approving are different permissions, in the SoD matrix,
 *     and the trigger additionally refuses an approval by the requester;
 *   · both permissions demand a verified second factor, because a stolen
 *     session is the usual way in;
 *   · and `vendor.manage` already conflicts with `payment.create`, so nobody
 *     who can steer the details can also raise the payment.
 */

export class VendorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VendorError';
  }
}

export interface CreateVendorInput {
  code: string;
  nameAr: string;
  nameEn: string;
  taxRegistrationNo?: string;
  category?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTermsDays?: number;
}

export interface VendorRecord {
  id: string;
  code: string;
  nameEn: string;
  nameAr: string;
  paymentTermsDays: number;
  isActive: boolean;
  isBlocked: boolean;
  hasBankDetails: boolean;
}

export async function createVendor(
  principal: Principal,
  input: CreateVendorInput,
): Promise<VendorRecord> {
  requirePermission(principal, 'vendor.manage');

  const code = input.code.trim();
  if (!code) throw new VendorError('A vendor needs a code.');
  if (!input.nameEn.trim() || !input.nameAr.trim()) {
    throw new VendorError('A vendor needs a name in both Arabic and English.');
  }
  if ((input.paymentTermsDays ?? 30) < 0) {
    throw new VendorError('Payment terms cannot be a negative number of days.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const clash = await tx.vendor.findFirst({
      where: { tenantId: principal.tenantId, code },
      select: { id: true },
    });
    if (clash) throw new VendorError(`Vendor code ${code} is already in use.`);

    // Note that bank details are absent from the create path on purpose. A
    // vendor is created without them and they arrive through the approval
    // flow, so there is no moment at which one person has set where the money
    // goes.
    const vendor = await tx.vendor.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        taxRegistrationNo: input.taxRegistrationNo?.trim() || null,
        category: input.category?.trim() || null,
        contactName: input.contactName?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        address: input.address?.trim() || null,
        paymentTermsDays: input.paymentTermsDays ?? 30,
        createdById: principal.userId,
      },
      select: {
        id: true,
        code: true,
        nameEn: true,
        nameAr: true,
        paymentTermsDays: true,
        isActive: true,
        isBlocked: true,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'vendor',
      resourceId: vendor.id,
      after: { code, nameEn: vendor.nameEn, paymentTermsDays: vendor.paymentTermsDays },
    });

    return { ...vendor, hasBankDetails: false };
  });
}

export interface BankDetails {
  bankName: string;
  bankAccountName: string;
  bankAccountNo: string;
  bankIban?: string;
}

/**
 * Propose new bank details. Takes effect only when a second person approves.
 */
export async function requestBankChange(
  principal: Principal,
  vendorId: string,
  details: BankDetails,
  reason: string,
): Promise<{ requestId: string }> {
  requirePermission(principal, 'vendor.manage');

  if (!reason?.trim()) {
    throw new VendorError(
      'Changing where a vendor is paid requires a stated reason. The approver has ' +
        'nothing else to judge it on.',
    );
  }
  if (!details.bankName.trim() || !details.bankAccountNo.trim() || !details.bankAccountName.trim()) {
    throw new VendorError('Bank name, account name and account number are all required.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const vendor = await tx.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        tenantId: true,
        code: true,
        bankName: true,
        bankAccountName: true,
        bankAccountNo: true,
        bankIban: true,
      },
    });
    if (!vendor || vendor.tenantId !== principal.tenantId) {
      throw new VendorError('That vendor does not exist in this university.');
    }

    const pending = await tx.vendorBankChange.findFirst({
      where: { tenantId: principal.tenantId, vendorId, state: 'PENDING' },
      select: { id: true },
    });
    if (pending) {
      throw new VendorError(
        `Vendor ${vendor.code} already has a bank-detail change awaiting approval. ` +
          `Have that one decided first — two pending changes to the same account is how ` +
          `the wrong one gets approved.`,
      );
    }

    const request = await tx.vendorBankChange.create({
      data: {
        tenantId: principal.tenantId,
        vendorId,
        proposedBankName: details.bankName.trim(),
        proposedBankAccountName: details.bankAccountName.trim(),
        proposedBankAccountNo: details.bankAccountNo.trim(),
        proposedBankIban: details.bankIban?.trim() || null,
        // What is there now, so the approver sees what is changing rather
        // than only what it is changing to.
        previousJson: {
          bankName: vendor.bankName,
          bankAccountName: vendor.bankAccountName,
          bankAccountNo: vendor.bankAccountNo,
          bankIban: vendor.bankIban,
        },
        reason: reason.trim(),
        requestedById: principal.userId,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'vendor.bank_change',
      resourceId: request.id,
      before: { bankAccountNo: vendor.bankAccountNo },
      after: {
        vendorCode: vendor.code,
        bankAccountNo: details.bankAccountNo.trim(),
        reason: reason.trim(),
      },
    });

    return { requestId: request.id };
  });
}

/** Approve a proposed bank change, and apply it. */
export async function approveBankChange(
  principal: Principal,
  requestId: string,
  opts: { note?: string } = {},
): Promise<void> {
  requirePermission(principal, 'vendor.approve');

  await withTenant(principal.tenantId, async (tx) => {
    const request = await lockBankChange(tx, principal.tenantId, requestId);
    if (request.state !== 'PENDING') {
      throw new VendorError(`That bank-detail change has already been ${request.state.toLowerCase()}.`);
    }

    assertNotSelfApproval(principal, request.requestedById, 'this bank-detail change');

    // Order matters. The vendor trigger looks for an APPROVED request naming
    // exactly these values, so the request must be stamped first — the same
    // ordering lesson the receipt-cancellation path taught in A3.
    await tx.vendorBankChange.update({
      where: { id: requestId },
      data: {
        state: 'APPROVED',
        decidedById: principal.userId,
        decidedAt: new Date(),
        decisionNote: opts.note?.trim() || null,
      },
    });

    await tx.vendor.update({
      where: { id: request.vendorId },
      data: {
        bankName: request.proposedBankName,
        bankAccountName: request.proposedBankAccountName,
        bankAccountNo: request.proposedBankAccountNo,
        bankIban: request.proposedBankIban,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'vendor.bank_change',
      resourceId: requestId,
      after: {
        vendorId: request.vendorId,
        bankAccountNo: request.proposedBankAccountNo,
        requestedById: request.requestedById,
      },
    });
  });
}

export async function rejectBankChange(
  principal: Principal,
  requestId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'vendor.approve');
  if (!reason?.trim()) {
    throw new VendorError('Rejecting a bank-detail change requires a stated reason.');
  }

  await withTenant(principal.tenantId, async (tx) => {
    const request = await lockBankChange(tx, principal.tenantId, requestId);
    if (request.state !== 'PENDING') {
      throw new VendorError(`That bank-detail change has already been ${request.state.toLowerCase()}.`);
    }

    await tx.vendorBankChange.update({
      where: { id: requestId },
      data: {
        state: 'REJECTED',
        decidedById: principal.userId,
        decidedAt: new Date(),
        decisionNote: reason.trim(),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REJECT',
      resourceType: 'vendor.bank_change',
      resourceId: requestId,
      after: { reason: reason.trim() },
    });
  });
}

/** Stop paying a vendor without deleting the history of having paid them. */
export async function blockVendor(
  principal: Principal,
  vendorId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'vendor.manage');
  if (!reason?.trim()) {
    throw new VendorError('Blocking a vendor requires a stated reason.');
  }

  await withTenant(principal.tenantId, async (tx) => {
    const vendor = await tx.vendor.findUnique({
      where: { id: vendorId },
      select: { tenantId: true, code: true, isBlocked: true },
    });
    if (!vendor || vendor.tenantId !== principal.tenantId) {
      throw new VendorError('That vendor does not exist in this university.');
    }

    await tx.vendor.update({
      where: { id: vendorId },
      data: { isBlocked: true, blockReason: reason.trim() },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'vendor',
      resourceId: vendorId,
      before: { isBlocked: vendor.isBlocked },
      after: { isBlocked: true, reason: reason.trim() },
    });
  });
}

export interface BankChangeRow {
  id: string;
  vendorCode: string;
  vendorName: string;
  proposedAccountNo: string | null;
  previousAccountNo: string | null;
  reason: string;
  requestedById: string;
  requestedAt: Date;
}

/** Bank changes waiting for a second signature. */
export async function pendingBankChanges(principal: Principal): Promise<BankChangeRow[]> {
  requirePermission(principal, 'vendor.approve');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.vendorBankChange.findMany({
      where: { tenantId: principal.tenantId, state: 'PENDING' },
      select: {
        id: true,
        proposedBankAccountNo: true,
        previousJson: true,
        reason: true,
        requestedById: true,
        requestedAt: true,
        vendor: { select: { code: true, nameEn: true } },
      },
      orderBy: { requestedAt: 'asc' },
    });

    return rows.map((r) => ({
      id: r.id,
      vendorCode: r.vendor.code,
      vendorName: r.vendor.nameEn,
      proposedAccountNo: r.proposedBankAccountNo,
      previousAccountNo:
        (r.previousJson as { bankAccountNo?: string | null } | null)?.bankAccountNo ?? null,
      reason: r.reason,
      requestedById: r.requestedById,
      requestedAt: r.requestedAt,
    }));
  });
}

/** Load a vendor and require it to be usable for a purchase or a payment. */
export async function requirePayableVendor(
  tx: Tx,
  tenantId: string,
  vendorId: string,
): Promise<{ id: string; code: string; nameEn: string; paymentTermsDays: number }> {
  const vendor = await tx.vendor.findUnique({
    where: { id: vendorId },
    select: {
      id: true,
      tenantId: true,
      code: true,
      nameEn: true,
      isActive: true,
      isBlocked: true,
      blockReason: true,
      paymentTermsDays: true,
    },
  });
  if (!vendor || vendor.tenantId !== tenantId) {
    throw new VendorError('That vendor does not exist in this university.');
  }
  if (!vendor.isActive) {
    throw new VendorError(`Vendor ${vendor.code} is inactive.`);
  }
  if (vendor.isBlocked) {
    throw new VendorError(`Vendor ${vendor.code} is blocked: ${vendor.blockReason}`);
  }
  return {
    id: vendor.id,
    code: vendor.code,
    nameEn: vendor.nameEn,
    paymentTermsDays: vendor.paymentTermsDays,
  };
}

async function lockBankChange(
  tx: Tx,
  tenantId: string,
  requestId: string,
): Promise<{
  id: string;
  vendorId: string;
  state: string;
  requestedById: string;
  proposedBankName: string | null;
  proposedBankAccountName: string | null;
  proposedBankAccountNo: string | null;
  proposedBankIban: string | null;
}> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      vendor_id: string;
      state: string;
      requested_by_id: string;
      proposed_bank_name: string | null;
      proposed_bank_account_name: string | null;
      proposed_bank_account_no: string | null;
      proposed_bank_iban: string | null;
    }>
  >`
    SELECT id, vendor_id, state::text, requested_by_id, proposed_bank_name,
           proposed_bank_account_name, proposed_bank_account_no, proposed_bank_iban
      FROM vendor_bank_changes
     WHERE id = ${requestId}::uuid AND tenant_id = ${tenantId}::uuid
       FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new VendorError('That bank-detail change does not exist in this university.');
  }
  const r = rows[0];
  return {
    id: r.id,
    vendorId: r.vendor_id,
    state: r.state,
    requestedById: r.requested_by_id,
    proposedBankName: r.proposed_bank_name,
    proposedBankAccountName: r.proposed_bank_account_name,
    proposedBankAccountNo: r.proposed_bank_account_no,
    proposedBankIban: r.proposed_bank_iban,
  };
}
