import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import { resolvePeriod, toDateOnly } from '@/lib/ledger/period';
import { sum, toStorage, type Money, type MoneyInput } from '@/lib/money';
import { allocateProcurementNumber } from './numbering';

/**
 * Purchase requisitions (SRS REQ-PRC-02).
 *
 * The demand step: a department says what it needs and why, and somebody with
 * authority agrees before anyone talks to a vendor. It has no accounting
 * effect at all — no posting, no encumbrance — which is exactly why it is
 * worth having as a separate document. The financial controls start at the
 * purchase order, and a requisition is the record of the decision that led to
 * one.
 *
 * The legacy system had nothing here. The Ribat build's `frmRequestGetBill` is
 * a rudimentary precursor on the *receipts* side and not a procurement
 * document at all.
 */

export class RequisitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RequisitionError';
  }
}

export interface RequisitionLineInput {
  description: string;
  accountId: string;
  costCenterId?: string | null;
  quantity: MoneyInput;
  unitPrice: MoneyInput;
}

export interface CreateRequisitionInput {
  requestedOn: Date;
  justification: string;
  costCenterId?: string | null;
  lines: RequisitionLineInput[];
}

export interface RequisitionRecord {
  id: string;
  reqNo: string;
  state: string;
  totalAmount: string;
  lineCount: number;
}

export async function raiseRequisition(
  principal: Principal,
  input: CreateRequisitionInput,
): Promise<RequisitionRecord> {
  requirePermission(principal, 'po.create');
  const { tenantId } = principal;

  if (input.lines.length === 0) {
    throw new RequisitionError('A requisition needs at least one line.');
  }
  if (!input.justification?.trim()) {
    throw new RequisitionError(
      'A requisition needs a justification. It is the only thing the approver has to ' +
        'judge it on.',
    );
  }

  return withTenant(tenantId, async (tx) => {
    const requestedOn = toDateOnly(input.requestedOn);
    // The fiscal year, not an open *period*: a requisition posts nothing, so
    // requiring an open period would refuse next month's shopping list for no
    // reason.
    const { fiscalYearId } = await resolvePeriod(tx, tenantId, requestedOn);
    const year = await tx.fiscalYear.findUniqueOrThrow({
      where: { id: fiscalYearId },
      select: { name: true },
    });

    const priced = await priceLines(tx, tenantId, input.lines);
    const total = sum(priced.map((l) => l.amount));

    const { docNo } = await allocateProcurementNumber(
      tx,
      tenantId,
      fiscalYearId,
      year.name,
      'REQUISITION',
    );

    const req = await tx.purchaseRequisition.create({
      data: {
        tenantId,
        reqNo: docNo,
        fiscalYearId,
        requestedOn,
        justification: input.justification.trim(),
        costCenterId: input.costCenterId ?? null,
        totalAmount: total,
        currency: priced[0].currency,
        requestedById: principal.userId,
        lines: {
          create: priced.map((l, i) => ({
            tenantId,
            lineNo: i + 1,
            description: l.description,
            accountId: l.accountId,
            costCenterId: l.costCenterId,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            amount: l.amount,
          })),
        },
      },
      select: { id: true },
    });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'requisition',
      resourceId: req.id,
      after: { reqNo: docNo, lines: priced.length, total: total.toFixed(4) },
    });

    return {
      id: req.id,
      reqNo: docNo,
      state: 'DRAFT',
      totalAmount: total.toFixed(4),
      lineCount: priced.length,
    };
  });
}

export async function submitRequisition(
  principal: Principal,
  requisitionId: string,
): Promise<void> {
  requirePermission(principal, 'po.create');

  await withTenant(principal.tenantId, async (tx) => {
    const req = await lockRequisition(tx, principal.tenantId, requisitionId);
    if (req.state !== 'DRAFT') {
      throw new RequisitionError(`Requisition ${req.reqNo} is ${req.state}, not a draft.`);
    }

    await tx.purchaseRequisition.update({
      where: { id: requisitionId },
      data: { state: 'PENDING_APPROVAL', submittedAt: new Date() },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'requisition',
      resourceId: requisitionId,
      before: { state: 'DRAFT' },
      after: { state: 'PENDING_APPROVAL' },
    });
  });
}

export async function decideRequisition(
  principal: Principal,
  requisitionId: string,
  decision: 'APPROVED' | 'REJECTED',
  note: string,
): Promise<void> {
  requirePermission(principal, 'po.approve');
  if (decision === 'REJECTED' && !note?.trim()) {
    throw new RequisitionError('Rejecting a requisition requires a stated reason.');
  }

  await withTenant(principal.tenantId, async (tx) => {
    const req = await lockRequisition(tx, principal.tenantId, requisitionId);
    if (req.state !== 'PENDING_APPROVAL') {
      throw new RequisitionError(
        `Requisition ${req.reqNo} is ${req.state} and is not awaiting approval.`,
      );
    }

    assertNotSelfApproval(principal, req.requestedById, `requisition ${req.reqNo}`);

    await tx.purchaseRequisition.update({
      where: { id: requisitionId },
      data: {
        state: decision,
        decidedById: principal.userId,
        decidedAt: new Date(),
        decisionNote: note?.trim() || null,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: decision === 'APPROVED' ? 'APPROVE' : 'REJECT',
      resourceType: 'requisition',
      resourceId: requisitionId,
      before: { state: 'PENDING_APPROVAL' },
      after: { state: decision, note: note?.trim() || null },
    });
  });
}

export interface PricedLine {
  description: string;
  accountId: string;
  accountCode: string;
  costCenterId: string | null;
  quantity: Money;
  unitPrice: Money;
  amount: Money;
  currency: string;
}

/**
 * Validate and price a set of document lines.
 *
 * Shared by requisitions and purchase orders, because they ask the same
 * questions of a line and must answer them identically. A requisition that
 * accepts a heading account and a purchase order that refuses one would send
 * every requisition through approval only to fail at the point of ordering.
 */
export async function priceLines(
  tx: Tx,
  tenantId: string,
  lines: Array<{
    description: string;
    accountId: string;
    costCenterId?: string | null;
    quantity: MoneyInput;
    unitPrice: MoneyInput;
  }>,
): Promise<PricedLine[]> {
  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });
  const currency = tenant.functionalCurrency.trim();

  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const accounts = await tx.account.findMany({
    where: { id: { in: accountIds } },
    select: {
      id: true,
      tenantId: true,
      code: true,
      isPostable: true,
      isActive: true,
      isControlAccount: true,
      requiresCostCenter: true,
    },
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));

  const ccIds = [...new Set(lines.map((l) => l.costCenterId).filter((x): x is string => !!x))];
  const ccCount =
    ccIds.length > 0
      ? await tx.costCenter.count({ where: { id: { in: ccIds }, tenantId, isActive: true } })
      : 0;
  if (ccIds.length !== ccCount) {
    throw new RequisitionError('A line names a cost centre that is not active in this university.');
  }

  return lines.map((line, i) => {
    const n = i + 1;
    if (!line.description?.trim()) {
      throw new RequisitionError(`Line ${n} needs a description of what is being bought.`);
    }

    const account = byId.get(line.accountId);
    if (!account || account.tenantId !== tenantId) {
      throw new RequisitionError(`Line ${n} names an account that is not in this chart.`);
    }
    if (!account.isActive) {
      throw new RequisitionError(`Line ${n}: account ${account.code} is deactivated.`);
    }
    if (!account.isPostable) {
      throw new RequisitionError(
        `Line ${n}: account ${account.code} is a heading and cannot receive a posting.`,
      );
    }
    // A purchase charged to a control account would land on the vendor or
    // student sub-ledger without any party attached, which is the exact
    // divergence control accounts exist to prevent.
    if (account.isControlAccount) {
      throw new RequisitionError(
        `Line ${n}: account ${account.code} is a control account for a sub-ledger. ` +
          `Charge the expense, not the control account.`,
      );
    }
    if (account.requiresCostCenter && !line.costCenterId) {
      throw new RequisitionError(
        `Line ${n}: account ${account.code} requires a cost centre.`,
      );
    }

    const quantity = toStorage(line.quantity);
    const unitPrice = toStorage(line.unitPrice);
    if (quantity.lessThanOrEqualTo(0)) {
      throw new RequisitionError(`Line ${n}: quantity must be greater than zero.`);
    }
    if (unitPrice.isNegative()) {
      throw new RequisitionError(`Line ${n}: price cannot be negative.`);
    }

    return {
      description: line.description.trim(),
      accountId: line.accountId,
      accountCode: account.code,
      costCenterId: line.costCenterId ?? null,
      quantity,
      unitPrice,
      amount: toStorage(quantity.times(unitPrice)),
      currency,
    };
  });
}

async function lockRequisition(
  tx: Tx,
  tenantId: string,
  requisitionId: string,
): Promise<{ id: string; reqNo: string; state: string; requestedById: string }> {
  const rows = await tx.$queryRaw<
    Array<{ id: string; req_no: string; state: string; requested_by_id: string }>
  >`
    SELECT id, req_no, state::text, requested_by_id
      FROM purchase_requisitions
     WHERE id = ${requisitionId}::uuid AND tenant_id = ${tenantId}::uuid
       FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new RequisitionError('That requisition does not exist in this university.');
  }
  const r = rows[0];
  return { id: r.id, reqNo: r.req_no, state: r.state, requestedById: r.requested_by_id };
}
