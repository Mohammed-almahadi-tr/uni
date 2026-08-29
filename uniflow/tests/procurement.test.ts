import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  testDb,
  type University,
} from './helpers';
import { withTenant } from '@/lib/db/client';
import { findSodViolations } from '@/lib/auth/permissions';
import { MfaRequiredError, SelfApprovalError, type Principal } from '@/lib/auth/rbac';
import { approveBudget, draftBudget, submitBudget } from '@/lib/budget/budget';
import { budgetPosition } from '@/lib/budget/control';
import { openCommitments, reconcileEncumbrances } from '@/lib/budget/encumbrance';
import {
  approveBankChange,
  createVendor,
  pendingBankChanges,
  rejectBankChange,
  requestBankChange,
  VendorError,
} from '@/lib/procurement/vendors';
import {
  decideRequisition,
  raiseRequisition,
  submitRequisition,
} from '@/lib/procurement/requisition';
import {
  approveOrder,
  cancelOrder,
  closeOrder,
  draftOrder,
  orderStatus,
  PurchaseOrderError,
  submitOrder,
} from '@/lib/procurement/orders';
import { GoodsReceiptError, receiveGoods, uninvoicedReceipts } from '@/lib/procurement/receipts';
import {
  apAging,
  approveHeldInvoice,
  InvoiceError,
  recordInvoice,
  reconcileVendorSubledger,
} from '@/lib/procurement/invoices';
import {
  approvePayment,
  draftPayment,
  PaymentError,
  paymentProposal,
  submitPayment,
  vendorStatement,
} from '@/lib/procurement/payments';
import { sum } from '@/lib/money';

/**
 * Procure-to-pay (SRS Module 16).
 *
 * The legacy baseline: none of this existed. `frmMakePayBill` posted a grid of
 * expense lines straight against cash, at payment time, with the payee's name
 * typed into a free-text column. There was no vendor, no order, no receipt, no
 * invoice, no payable and no match — so an expense incurred in March and paid
 * in June was reported in June, and at no point in between could the
 * institution state what it owed.
 */

const JAN = new Date(Date.UTC(2026, 0, 15));
const JAN20 = new Date(Date.UTC(2026, 0, 20));
const FEB = new Date(Date.UTC(2026, 1, 10));

/**
 * A note on `asSystem` in this file: it connects as the owner role and so
 * bypasses RLS. Voucher references are unique per *tenant*, which means every
 * university in the suite has its own VIV-2026-000001 — so a lookup by
 * reference alone silently matches another test's voucher. Every raw lookup
 * below carries the tenant for that reason.
 */

interface Actors {
  buyer: Principal;
  approver: Principal;
  stores: Principal;
  apClerk: Principal;
  apApprover: Principal;
  preparer: Principal;
  controller: Principal;
  reporter: Principal;
}

/**
 * A university with the eight distinct people procure-to-pay actually needs.
 *
 * They are separate on purpose rather than for tidiness: the three-way match
 * is worth nothing if the order, the delivery note and the bill were written
 * by the same hand, and the SoD matrix that keeps them apart is asserted
 * further down.
 */
async function scene(): Promise<{ u: University } & Actors> {
  const u = await makeUniversity();
  return {
    u,
    buyer: await makePrincipal(u.tenantId, ['po.create', 'vendor.manage'], { name: 'buyer' }),
    approver: await makePrincipal(u.tenantId, ['po.approve', 'budget.read'], { name: 'po-appr' }),
    stores: await makePrincipal(u.tenantId, ['grn.create'], { name: 'stores' }),
    apClerk: await makePrincipal(u.tenantId, ['apinvoice.record', 'payment.create'], {
      name: 'ap-clerk',
    }),
    apApprover: await makePrincipal(
      u.tenantId,
      ['apinvoice.approve', 'payment.approve', 'vendor.approve'],
      { name: 'ap-appr' },
    ),
    preparer: await makePrincipal(u.tenantId, ['budget.manage'], { name: 'bud-prep' }),
    controller: await makePrincipal(u.tenantId, ['budget.approve', 'budget.read'], {
      name: 'controller',
    }),
    reporter: await makePrincipal(u.tenantId, ['report.financial'], { name: 'reporter' }),
  };
}

async function approvedBudget(
  u: University,
  preparer: Principal,
  controller: Principal,
  lines: Array<{ accountId: string; annualAmount: string; policy?: 'BLOCK' | 'WARN' | 'ADVISORY' }>,
) {
  const b = await draftBudget(preparer, {
    fiscalYearId: u.fiscalYearId,
    label: 'Original 2026',
    lines,
  });
  await submitBudget(preparer, b.budgetId);
  await approveBudget(controller, b.budgetId);
  return b;
}

async function vendorFor(u: University, buyer: Principal, code = 'V-001') {
  return createVendor(buyer, {
    code,
    nameEn: 'Khartoum Laboratory Supplies',
    nameAr: 'مورد معامل الخرطوم',
    paymentTermsDays: 30,
  });
}

let shared: Awaited<ReturnType<typeof scene>>;

beforeAll(async () => {
  shared = await scene();
});

afterAll(disconnectAll);

describe('vendor master', () => {
  it('creates a vendor with no bank details at all', async () => {
    const vendor = await vendorFor(shared.u, shared.buyer, 'V-NEW');

    // Deliberate: a vendor is created without bank details and they arrive
    // through the approval flow, so there is no moment at which one person
    // has decided where the money goes.
    expect(vendor.hasBankDetails).toBe(false);
  });

  it('refuses to change bank details by a direct update', async () => {
    const vendor = await vendorFor(shared.u, shared.buyer, 'V-DIRECT');

    // The trigger, not the application. Invoice-redirection fraud needs no
    // forged invoice — only an edit to this row — so the database refuses it
    // regardless of which code path arrives.
    await expect(
      asSystem((tx) =>
        tx.vendor.update({
          where: { id: vendor.id },
          data: { bankAccountNo: '9999999999', bankName: 'Attacker Bank' },
        }),
      ),
    ).rejects.toThrow(/approved bank-change request/i);
  });

  it('applies bank details only when a second person approves', async () => {
    const { u, buyer, apApprover } = shared;
    const vendor = await vendorFor(u, buyer, 'V-BANK');

    const { requestId } = await requestBankChange(
      buyer,
      vendor.id,
      {
        bankName: 'Faisal Islamic Bank',
        bankAccountName: 'Khartoum Laboratory Supplies Ltd',
        bankAccountNo: '1234567890',
      },
      'New supplier account confirmed by letter on company paper.',
    );

    const before = await asSystem((tx) =>
      tx.vendor.findUniqueOrThrow({
        where: { id: vendor.id },
        select: { bankAccountNo: true },
      }),
    );
    expect(before.bankAccountNo).toBeNull();

    const pending = await pendingBankChanges(apApprover);
    expect(pending.map((p) => p.id)).toContain(requestId);

    await approveBankChange(apApprover, requestId);

    const after = await asSystem((tx) =>
      tx.vendor.findUniqueOrThrow({
        where: { id: vendor.id },
        select: { bankAccountNo: true, bankName: true },
      }),
    );
    expect(after.bankAccountNo).toBe('1234567890');
    expect(after.bankName).toBe('Faisal Islamic Bank');
  });

  it('will not let the requester approve their own bank change', async () => {
    const { u, buyer } = shared;
    const vendor = await vendorFor(u, buyer, 'V-SELF');

    const { requestId } = await requestBankChange(
      buyer,
      vendor.id,
      { bankName: 'B', bankAccountName: 'N', bankAccountNo: '5' },
      'because',
    );

    const both: Principal = {
      ...buyer,
      permissions: new Set([...buyer.permissions, 'vendor.approve' as const]),
    };
    await expect(approveBankChange(both, requestId)).rejects.toThrow(SelfApprovalError);
  });

  it('allows only one pending bank change per vendor', async () => {
    const { u, buyer } = shared;
    const vendor = await vendorFor(u, buyer, 'V-TWO');

    await requestBankChange(
      buyer,
      vendor.id,
      { bankName: 'A', bankAccountName: 'N', bankAccountNo: '1' },
      'first',
    );
    // Two pending changes to the same account is how the wrong one gets
    // approved.
    await expect(
      requestBankChange(
        buyer,
        vendor.id,
        { bankName: 'B', bankAccountName: 'N', bankAccountNo: '2' },
        'second',
      ),
    ).rejects.toThrow(VendorError);
  });

  it('leaves the details untouched when a change is rejected', async () => {
    const { u, buyer, apApprover } = shared;
    const vendor = await vendorFor(u, buyer, 'V-REJ');

    const { requestId } = await requestBankChange(
      buyer,
      vendor.id,
      { bankName: 'Doubtful', bankAccountName: 'Somebody', bankAccountNo: '7777' },
      'emailed request from a new address',
    );
    await rejectBankChange(apApprover, requestId, 'Request came from an unverified address.');

    const after = await asSystem((tx) =>
      tx.vendor.findUniqueOrThrow({
        where: { id: vendor.id },
        select: { bankAccountNo: true },
      }),
    );
    expect(after.bankAccountNo).toBeNull();
  });

  it('demands a second factor to touch bank details', async () => {
    const { u } = shared;
    const noMfa = await makePrincipal(u.tenantId, ['vendor.manage'], {
      name: 'no-mfa',
      mfaVerified: false,
    });
    await expect(
      createVendor(noMfa, { code: 'V-MFA', nameEn: 'x', nameAr: 'س' }),
    ).rejects.toThrow(MfaRequiredError);
  });
});

describe('purchase orders and encumbrance', () => {
  it('creates a commitment at approval and reports it against the budget', async () => {
    const { u, buyer, approver, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);

    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        {
          description: 'Air-conditioning overhaul',
          accountId: u.accounts['51213'],
          quantity: '1',
          unitPrice: '40000',
        },
      ],
    });
    await submitOrder(buyer, po.id);

    // Before approval the institution has committed to nothing.
    const before = await withTenant(
      u.tenantId,
      (tx) => budgetPosition(tx, u.tenantId, u.accounts['51213'], null, JAN),
      {},
      testDb,
    );
    expect(before.encumbered).toBe('0.0000');

    const approval = await approveOrder(approver, po.id);
    expect(approval.encumbered).toBe('40000.0000');

    const after = await withTenant(
      u.tenantId,
      (tx) => budgetPosition(tx, u.tenantId, u.accounts['51213'], null, JAN),
      {},
      testDb,
    );
    // This is the number the legacy budget report could not see. An
    // institution that has signed for 40,000 has spent it in every sense
    // that matters, and a report blind to that will authorise the next
    // purchase too.
    expect(after.encumbered).toBe('40000.0000');
    expect(after.actual).toBe('0.0000');
    expect(after.available).toBe('60000.0000');
  });

  it('refuses an order that would exceed a BLOCK line, and commits nothing', async () => {
    const { u, buyer, approver, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '1000', policy: 'BLOCK' },
    ]);
    const vendor = await vendorFor(u, buyer);

    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        {
          description: 'Too much',
          accountId: u.accounts['51213'],
          quantity: '1',
          unitPrice: '5000',
        },
      ],
    });
    await submitOrder(buyer, po.id);

    await expect(approveOrder(approver, po.id)).rejects.toThrow(/Budget exceeded/i);

    // The whole approval rolls back. A half-committed order would be worse
    // than a refused one.
    const commitments = await openCommitments(controller, u.fiscalYearId);
    expect(commitments).toHaveLength(0);
    const row = await asSystem((tx) =>
      tx.purchaseOrder.findUniqueOrThrow({ where: { id: po.id }, select: { state: true } }),
    );
    expect(row.state).toBe('PENDING_APPROVAL');
  });

  it('checks each line separately, not the order total', async () => {
    const { u, buyer, approver, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '1000', policy: 'BLOCK' },
      { accountId: u.accounts['51211'], annualAmount: '100000', policy: 'BLOCK' },
    ]);
    const vendor = await vendorFor(u, buyer);

    // Fits comfortably in aggregate (6,000 against 101,000) and still
    // exhausts one department's allocation.
    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Maintenance', accountId: u.accounts['51213'], quantity: '1', unitPrice: '5000' },
        { description: 'Utilities', accountId: u.accounts['51211'], quantity: '1', unitPrice: '1000' },
      ],
    });
    await submitOrder(buyer, po.id);
    await expect(approveOrder(approver, po.id)).rejects.toThrow(/Budget exceeded/i);
  });

  it('needs a second person to approve an order', async () => {
    const { u, buyer, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);

    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [{ description: 'x', accountId: u.accounts['51213'], quantity: '1', unitPrice: '10' }],
    });
    await submitOrder(buyer, po.id);

    const both: Principal = {
      ...buyer,
      permissions: new Set([...buyer.permissions, 'po.approve' as const]),
    };
    await expect(approveOrder(both, po.id)).rejects.toThrow(SelfApprovalError);
  });

  it('freezes the lines of an approved order', async () => {
    const { u, buyer, approver, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);

    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(buyer, po.id);
    await approveOrder(approver, po.id);

    // The approved order is what the encumbrance was computed from and what
    // the vendor was sent. Re-pricing it afterwards would make both wrong.
    await expect(
      asSystem((tx) =>
        tx.purchaseOrderLine.updateMany({
          where: { purchaseOrderId: po.id },
          data: { unitPrice: '9000' },
        }),
      ),
    ).rejects.toThrow(/only received and invoiced quantities may change/i);
  });

  it('gives the commitment back when an order is cancelled', async () => {
    const { u, buyer, approver, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);

    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(buyer, po.id);
    await approveOrder(approver, po.id);

    const { released } = await cancelOrder(approver, po.id, 'Supplier withdrew the quotation.');
    expect(released).toBe('5000.0000');

    const position = await withTenant(
      u.tenantId,
      (tx) => budgetPosition(tx, u.tenantId, u.accounts['51213'], null, JAN),
      {},
      testDb,
    );
    expect(position.encumbered).toBe('0.0000');
    expect(position.available).toBe('100000.0000');
  });
});

describe('requisitions', () => {
  it('converts an approved requisition into an order', async () => {
    const { u, buyer, approver, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);

    const req = await raiseRequisition(buyer, {
      requestedOn: JAN,
      justification: 'Two lecture halls have no working air-conditioning.',
      lines: [
        { description: 'AC units', accountId: u.accounts['51213'], quantity: '2', unitPrice: '9000' },
      ],
    });
    expect(req.totalAmount).toBe('18000.0000');

    await submitRequisition(buyer, req.id);
    await decideRequisition(approver, req.id, 'APPROVED', 'Agreed, use the maintenance line.');

    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      requisitionId: req.id,
      lines: [
        { description: 'AC units', accountId: u.accounts['51213'], quantity: '2', unitPrice: '9000' },
      ],
    });
    await submitOrder(buyer, po.id);
    await approveOrder(approver, po.id);

    const after = await asSystem((tx) =>
      tx.purchaseRequisition.findUniqueOrThrow({
        where: { id: req.id },
        select: { state: true },
      }),
    );
    expect(after.state).toBe('CONVERTED');
  });

  it('refuses to order against a requisition that was never approved', async () => {
    const { u, buyer } = await scene();
    const vendor = await vendorFor(u, buyer);

    const req = await raiseRequisition(buyer, {
      requestedOn: JAN,
      justification: 'wishful',
      lines: [{ description: 'x', accountId: u.accounts['51213'], quantity: '1', unitPrice: '1' }],
    });

    await expect(
      draftOrder(buyer, {
        vendorId: vendor.id,
        orderDate: JAN,
        requisitionId: req.id,
        lines: [
          { description: 'x', accountId: u.accounts['51213'], quantity: '1', unitPrice: '1' },
        ],
      }),
    ).rejects.toThrow(PurchaseOrderError);
  });

  it('demands a justification', async () => {
    const { u, buyer } = await scene();
    await expect(
      raiseRequisition(buyer, {
        requestedOn: JAN,
        justification: '   ',
        lines: [{ description: 'x', accountId: u.accounts['51213'], quantity: '1', unitPrice: '1' }],
      }),
    ).rejects.toThrow(/justification/i);
  });
});

describe('goods receipt', () => {
  it('recognises the expense on delivery, not on payment', async () => {
    const { u, buyer, approver, stores, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);

    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(buyer, po.id);
    await approveOrder(approver, po.id);

    const status = await orderStatus(buyer, po.id);
    const lineId = await asSystem(async (tx) => {
      const l = await tx.purchaseOrderLine.findFirstOrThrow({
        where: { purchaseOrderId: po.id },
        select: { id: true },
      });
      return l.id;
    });
    expect(status.lines[0].outstandingQty).toBe('10.0000');

    const grn = await receiveGoods(
      stores,
      { purchaseOrderId: po.id, receivedOn: JAN20, lines: [{ poLineId: lineId, quantity: '10' }] },
      'grn-key-1',
    );
    expect(grn.totalAmount).toBe('5000.0000');

    // DR maintenance expense · CR goods received not invoiced. The legacy
    // system had no entry at all at this moment — the expense appeared only
    // when the cheque was written, which could be a quarter later.
    const lines = await asSystem((tx) =>
      tx.transactionLine.findMany({
        where: { header: { tenantId: u.tenantId, voucherRef: grn.voucherRef } },
        select: {
          debitAmount: true,
          creditAmount: true,
          account: { select: { code: true } },
        },
      }),
    );
    const debit = lines.find((l) => l.debitAmount.greaterThan(0))!;
    const credit = lines.find((l) => l.creditAmount.greaterThan(0))!;
    expect(debit.account.code).toBe('51213');
    expect(debit.debitAmount.toFixed(2)).toBe('5000.00');
    expect(credit.account.code).toBe('21231');
    expect(credit.creditAmount.toFixed(2)).toBe('5000.00');
  });

  it('releases the commitment as goods arrive, partially on a partial delivery', async () => {
    const { u, buyer, approver, stores, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);

    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(buyer, po.id);
    await approveOrder(approver, po.id);

    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );

    await receiveGoods(
      stores,
      { purchaseOrderId: po.id, receivedOn: JAN20, lines: [{ poLineId: lineId, quantity: '6' }] },
      'grn-partial',
    );

    const position = await withTenant(
      u.tenantId,
      (tx) => budgetPosition(tx, u.tenantId, u.accounts['51213'], null, JAN),
      {},
      testDb,
    );
    // A commitment that has become an actual must stop being counted as
    // both, or every delivery is double-counted against the budget.
    expect(position.encumbered).toBe('2000.0000');
    expect(position.actual).toBe('3000.0000');
    expect(position.available).toBe('95000.0000');

    const state = await asSystem((tx) =>
      tx.purchaseOrder.findUniqueOrThrow({ where: { id: po.id }, select: { state: true } }),
    );
    expect(state.state).toBe('PARTIALLY_RECEIVED');
  });

  it('refuses to receive more than was ordered', async () => {
    const { u, buyer, approver, stores, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);
    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(buyer, po.id);
    await approveOrder(approver, po.id);
    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );

    // Over-delivery is real, but it is a change to the order rather than
    // something a stores officer settles by typing a bigger number.
    await expect(
      receiveGoods(
        stores,
        { purchaseOrderId: po.id, receivedOn: JAN20, lines: [{ poLineId: lineId, quantity: '11' }] },
        'grn-over',
      ),
    ).rejects.toThrow(GoodsReceiptError);
  });

  it('replays rather than accruing twice on a repeated key', async () => {
    const { u, buyer, approver, stores, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);
    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(buyer, po.id);
    await approveOrder(approver, po.id);
    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );

    const input = {
      purchaseOrderId: po.id,
      receivedOn: JAN20,
      lines: [{ poLineId: lineId, quantity: '10' }],
    };
    const first = await receiveGoods(stores, input, 'grn-idem');
    const second = await receiveGoods(stores, input, 'grn-idem');

    // The stores officer is on a phone at a loading bay. A second tap must
    // not accrue the delivery twice or release the commitment twice with it.
    expect(second.grnNo).toBe(first.grnNo);
    expect(second.voucherRef).toBe(first.voucherRef);

    const receipts = await asSystem((tx) =>
      tx.goodsReceipt.count({ where: { purchaseOrderId: po.id } }),
    );
    expect(receipts).toBe(1);
  });

  it('never edits or deletes a posted receipt', async () => {
    const { u, buyer, approver, stores, preparer, controller } = await scene();
    await approvedBudget(u, preparer, controller, [
      { accountId: u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(u, buyer);
    const po = await draftOrder(buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: u.accounts['51213'], quantity: '4', unitPrice: '500' },
      ],
    });
    await submitOrder(buyer, po.id);
    await approveOrder(approver, po.id);
    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );
    const grn = await receiveGoods(
      stores,
      { purchaseOrderId: po.id, receivedOn: JAN20, lines: [{ poLineId: lineId, quantity: '4' }] },
      'grn-immutable',
    );

    await expect(
      asSystem((tx) => tx.goodsReceipt.updateMany({ where: { grnNo: grn.grnNo }, data: { note: 'x' } })),
    ).rejects.toThrow(/correct it by reversal/i);
  });
});

describe('vendor invoices and the three-way match', () => {
  async function delivered() {
    const s = await scene();
    await approvedBudget(s.u, s.preparer, s.controller, [
      { accountId: s.u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(s.u, s.buyer);
    const po = await draftOrder(s.buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: s.u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(s.buyer, po.id);
    await approveOrder(s.approver, po.id);
    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );
    await receiveGoods(
      s.stores,
      { purchaseOrderId: po.id, receivedOn: JAN20, lines: [{ poLineId: lineId, quantity: '10' }] },
      `grn-${po.poNo}`,
    );
    return { ...s, vendor, po, lineId };
  }

  it('matches, posts, and moves the accrual to a payable', async () => {
    const { u, apClerk, vendor, po, lineId } = await delivered();

    const invoice = await recordInvoice(apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: 'KLS-4471',
      purchaseOrderId: po.id,
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Chairs',
          poLineId: lineId,
          accountId: u.accounts['51213'],
          quantity: '10',
          unitPrice: '500',
        },
      ],
    });

    expect(invoice.state).toBe('MATCHED');
    expect(invoice.matchIssues).toEqual([]);

    const lines = await asSystem((tx) =>
      tx.transactionLine.findMany({
        where: { header: { tenantId: u.tenantId, voucherRef: invoice.voucherRef! } },
        select: {
          debitAmount: true,
          creditAmount: true,
          subledgerType: true,
          account: { select: { code: true } },
        },
      }),
    );
    const debit = lines.find((l) => l.debitAmount.greaterThan(0))!;
    const credit = lines.find((l) => l.creditAmount.greaterThan(0))!;
    expect(debit.account.code).toBe('21231');
    expect(credit.account.code).toBe('21211');
    expect(credit.subledgerType).toBe('VENDOR');
  });

  it('holds an invoice priced above the order, and does not post it', async () => {
    const { u, apClerk, vendor, po, lineId } = await delivered();

    const invoice = await recordInvoice(apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: 'KLS-4472',
      purchaseOrderId: po.id,
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Chairs',
          poLineId: lineId,
          accountId: u.accounts['51213'],
          // Ordered at 500; billed at 620. Well outside 2% or 10, whichever
          // is larger.
          quantity: '10',
          unitPrice: '620',
        },
      ],
    });

    expect(invoice.state).toBe('ON_HOLD');
    expect(invoice.voucherRef).toBeNull();
    expect(invoice.holdReason).toMatch(/tolerance/i);

    // The payable does not exist until somebody takes responsibility for the
    // difference. That is the whole of the control.
    const { control } = await reconcileVendorSubledger(
      await makePrincipal(u.tenantId, ['report.financial'], { name: 'rep' }),
    );
    expect(control).toBe('0.0000');
  });

  it('holds an invoice for more than has been received', async () => {
    const s = await scene();
    await approvedBudget(s.u, s.preparer, s.controller, [
      { accountId: s.u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(s.u, s.buyer);
    const po = await draftOrder(s.buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: s.u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(s.buyer, po.id);
    await approveOrder(s.approver, po.id);
    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );
    await receiveGoods(
      s.stores,
      { purchaseOrderId: po.id, receivedOn: JAN20, lines: [{ poLineId: lineId, quantity: '4' }] },
      'grn-short',
    );

    const invoice = await recordInvoice(s.apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: 'KLS-4473',
      purchaseOrderId: po.id,
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Chairs',
          poLineId: lineId,
          accountId: s.u.accounts['51213'],
          quantity: '10',
          unitPrice: '500',
        },
      ],
    });

    // The check that catches a delivery that never happened.
    expect(invoice.state).toBe('ON_HOLD');
    expect(invoice.holdReason).toMatch(/only 4.00 has been received/i);
  });

  it('releases a held invoice only on a second person, with a reason', async () => {
    const { u, apClerk, apApprover, vendor, po, lineId } = await delivered();

    const invoice = await recordInvoice(apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: 'KLS-4474',
      purchaseOrderId: po.id,
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Chairs',
          poLineId: lineId,
          accountId: u.accounts['51213'],
          quantity: '10',
          unitPrice: '620',
        },
      ],
    });

    await expect(approveHeldInvoice(apApprover, invoice.id, '  ')).rejects.toThrow(InvoiceError);

    const both: Principal = {
      ...apClerk,
      permissions: new Set([...apClerk.permissions, 'apinvoice.approve' as const]),
    };
    await expect(approveHeldInvoice(both, invoice.id, 'agreed by phone')).rejects.toThrow(
      SelfApprovalError,
    );

    const released = await approveHeldInvoice(
      apApprover,
      invoice.id,
      'Price rise confirmed in writing by the supplier on 12 January.',
    );
    expect(released.voucherRef).toMatch(/^VIV-2026-/);

    const row = await asSystem((tx) =>
      tx.vendorInvoice.findUniqueOrThrow({
        where: { id: invoice.id },
        select: { state: true, holdReason: true, approvedById: true },
      }),
    );
    // The file shows both what was wrong and who decided to pay it anyway.
    expect(row.state).toBe('APPROVED');
    expect(row.holdReason).toMatch(/tolerance/i);
    expect(row.approvedById).toBe(apApprover.userId);
  });

  it('refuses the same vendor invoice number twice', async () => {
    const { u, apClerk, vendor, po, lineId } = await delivered();

    const line = {
      description: 'Chairs',
      poLineId: lineId,
      accountId: u.accounts['51213'],
      quantity: '5',
      unitPrice: '500',
    };
    await recordInvoice(apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: 'KLS-DUP',
      purchaseOrderId: po.id,
      invoiceDate: JAN20,
      lines: [line],
    });

    // Paying the same bill twice is the most common single loss in accounts
    // payable, and it is nearly always a duplicate entry rather than a fraud.
    await expect(
      recordInvoice(apClerk, {
        vendorId: vendor.id,
        vendorInvoiceNo: 'KLS-DUP',
        purchaseOrderId: po.id,
        invoiceDate: JAN20,
        lines: [line],
      }),
    ).rejects.toThrow(/already been entered/i);
  });

  it('recognises the expense directly on an invoice with no purchase order', async () => {
    const { u, apClerk, buyer } = await scene();
    const vendor = await vendorFor(u, buyer, 'V-UTIL');

    const invoice = await recordInvoice(apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: 'NEC-2026-01',
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Electricity, January',
          accountId: u.accounts['51211'],
          quantity: '1',
          unitPrice: '17500',
        },
      ],
    });

    expect(invoice.state).toBe('MATCHED');

    // A utility bill has no order and no delivery note. Debiting the accrual
    // account for something that never went through it would leave a
    // permanent balance in a clearing account that is supposed to net to
    // what has arrived and not been billed.
    const lines = await asSystem((tx) =>
      tx.transactionLine.findMany({
        where: { header: { tenantId: u.tenantId, voucherRef: invoice.voucherRef! } },
        select: {
          debitAmount: true,
          creditAmount: true,
          account: { select: { code: true } },
        },
      }),
    );
    const debit = lines.find((l) => l.debitAmount.greaterThan(0))!;
    expect(debit.account.code).toBe('51211');
    expect(lines.some((l) => l.account.code === '21231')).toBe(false);
  });
});

describe('payment', () => {
  async function billed() {
    const s = await scene();
    await approvedBudget(s.u, s.preparer, s.controller, [
      { accountId: s.u.accounts['51213'], annualAmount: '100000' },
    ]);
    const vendor = await vendorFor(s.u, s.buyer);
    const po = await draftOrder(s.buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: s.u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(s.buyer, po.id);
    await approveOrder(s.approver, po.id);
    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );
    await receiveGoods(
      s.stores,
      { purchaseOrderId: po.id, receivedOn: JAN20, lines: [{ poLineId: lineId, quantity: '10' }] },
      `grn-${po.poNo}`,
    );
    const invoice = await recordInvoice(s.apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: `INV-${po.poNo}`,
      purchaseOrderId: po.id,
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Chairs',
          poLineId: lineId,
          accountId: s.u.accounts['51213'],
          quantity: '10',
          unitPrice: '500',
        },
      ],
    });
    return { ...s, vendor, po, lineId, invoice };
  }

  it('clears the payable against the bank on approval', async () => {
    const { u, apClerk, apApprover, vendor, invoice } = await billed();

    const pv = await draftPayment(apClerk, {
      vendorId: vendor.id,
      paymentDate: FEB,
      channel: 'BANK_TRANSFER',
      bankAccountId: u.accounts['11121'],
      allocations: [{ invoiceId: invoice.id, amount: '5000' }],
    });
    await submitPayment(apClerk, pv.id);

    const paid = await approvePayment(apApprover, pv.id);
    expect(paid.amount).toBe('5000.0000');

    const lines = await asSystem((tx) =>
      tx.transactionLine.findMany({
        where: { header: { tenantId: u.tenantId, voucherRef: paid.voucherRef } },
        select: {
          debitAmount: true,
          creditAmount: true,
          account: { select: { code: true } },
        },
      }),
    );
    const debit = lines.find((l) => l.debitAmount.greaterThan(0))!;
    const credit = lines.find((l) => l.creditAmount.greaterThan(0))!;
    expect(debit.account.code).toBe('21211');
    expect(credit.account.code).toBe('11121');

    const row = await asSystem((tx) =>
      tx.vendorInvoice.findUniqueOrThrow({
        where: { id: invoice.id },
        select: { state: true, settledAmount: true },
      }),
    );
    expect(row.state).toBe('PAID');
    expect(row.settledAmount.toFixed(2)).toBe('5000.00');
  });

  it('needs a second person to release the money', async () => {
    const { u, apClerk, vendor, invoice } = await billed();

    const pv = await draftPayment(apClerk, {
      vendorId: vendor.id,
      paymentDate: FEB,
      channel: 'BANK_TRANSFER',
      bankAccountId: u.accounts['11121'],
      allocations: [{ invoiceId: invoice.id, amount: '5000' }],
    });
    await submitPayment(apClerk, pv.id);

    const both: Principal = {
      ...apClerk,
      permissions: new Set([...apClerk.permissions, 'payment.approve' as const]),
    };
    await expect(approvePayment(both, pv.id)).rejects.toThrow(SelfApprovalError);
  });

  it('refuses to pay more than is outstanding', async () => {
    const { u, apClerk, vendor, invoice } = await billed();
    await expect(
      draftPayment(apClerk, {
        vendorId: vendor.id,
        paymentDate: FEB,
        channel: 'BANK_TRANSFER',
        bankAccountId: u.accounts['11121'],
        allocations: [{ invoiceId: invoice.id, amount: '9000' }],
      }),
    ).rejects.toThrow(/outstanding/i);
  });

  it('refuses to pay an invoice that is still on hold', async () => {
    const s = await scene();
    const vendor = await vendorFor(s.u, s.buyer, 'V-HELD');
    await approvedBudget(s.u, s.preparer, s.controller, [
      { accountId: s.u.accounts['51213'], annualAmount: '100000' },
    ]);
    const po = await draftOrder(s.buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Chairs', accountId: s.u.accounts['51213'], quantity: '10', unitPrice: '500' },
      ],
    });
    await submitOrder(s.buyer, po.id);
    await approveOrder(s.approver, po.id);
    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );
    // Not received at all, so any invoice against it is held.
    const invoice = await recordInvoice(s.apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: 'PHANTOM-1',
      purchaseOrderId: po.id,
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Chairs',
          poLineId: lineId,
          accountId: s.u.accounts['51213'],
          quantity: '10',
          unitPrice: '500',
        },
      ],
    });
    expect(invoice.state).toBe('ON_HOLD');

    await expect(
      draftPayment(s.apClerk, {
        vendorId: vendor.id,
        paymentDate: FEB,
        channel: 'BANK_TRANSFER',
        bankAccountId: s.u.accounts['11121'],
        allocations: [{ invoiceId: invoice.id, amount: '5000' }],
      }),
    ).rejects.toThrow(PaymentError);
  });

  it('demands a cheque number on a cheque payment', async () => {
    const { u, apClerk, vendor, invoice } = await billed();
    await expect(
      draftPayment(apClerk, {
        vendorId: vendor.id,
        paymentDate: FEB,
        channel: 'CHEQUE',
        bankAccountId: u.accounts['11121'],
        allocations: [{ invoiceId: invoice.id, amount: '5000' }],
      }),
    ).rejects.toThrow(/cheque number/i);
  });

  it('proposes what is due and leaves the decision to a person', async () => {
    const { apClerk, invoice } = await billed();
    const proposal = await paymentProposal(apClerk, { dueBy: new Date(Date.UTC(2026, 2, 1)) });
    expect(proposal.map((p) => p.invoiceId)).toContain(invoice.id);
    expect(proposal[0].outstanding).toBe('5000.0000');
  });

  it('shows one vendor what was billed and what was paid, in date order', async () => {
    const { u, apClerk, apApprover, reporter, vendor, invoice } = await billed();

    const pv = await draftPayment(apClerk, {
      vendorId: vendor.id,
      paymentDate: FEB,
      channel: 'BANK_TRANSFER',
      bankAccountId: u.accounts['11121'],
      allocations: [{ invoiceId: invoice.id, amount: '2000' }],
    });
    await submitPayment(apClerk, pv.id);
    await approvePayment(apApprover, pv.id);

    const statement = await vendorStatement(reporter, vendor.id);
    expect(statement.rows.map((r) => r.kind)).toEqual(['INVOICE', 'PAYMENT']);
    expect(statement.rows[0].charged).toBe('5000.0000');
    expect(statement.rows[1].paid).toBe('2000.0000');
    // A part-paid invoice leaves the balance, which is the number the legacy
    // system had no way to produce: it had no vendor and no payable, so
    // "how much do we owe this supplier" had no answer at all.
    expect(statement.outstanding).toBe('3000.0000');
  });

  it('ages by due date rather than by invoice date', async () => {
    const { u, reporter } = await billed();
    // Invoiced 20 January on 30-day terms, so on 21 February it is one day
    // late — not a month late, which is what ageing by invoice date would say.
    const aging = await apAging(reporter, new Date(Date.UTC(2026, 1, 21)));
    expect(aging).toHaveLength(1);
    expect(aging[0].days1to30).toBe('5000.0000');
    expect(aging[0].current).toBe('0');
    void u;
  });
});

describe('the central reconciliation', () => {
  it('agrees the vendor sub-ledger with the AP control account after a full cycle', async () => {
    const s = await scene();
    await approvedBudget(s.u, s.preparer, s.controller, [
      { accountId: s.u.accounts['51213'], annualAmount: '400000' },
      { accountId: s.u.accounts['51211'], annualAmount: '100000' },
    ]);

    const vendors = await Promise.all([
      vendorFor(s.u, s.buyer, 'REC-1'),
      vendorFor(s.u, s.buyer, 'REC-2'),
    ]);

    // Three orders across two vendors, one delivered short and closed, one
    // fully delivered and paid, one delivered and left unpaid. Plus a
    // non-PO utility bill, part-paid.
    const scripted = [
      { vendor: vendors[0], qty: '10', recv: '10', price: '500', pay: '5000' },
      { vendor: vendors[0], qty: '20', recv: '12', price: '250', pay: '0' },
      { vendor: vendors[1], qty: '6', recv: '6', price: '1500', pay: '4000' },
    ];

    for (const [i, spec] of scripted.entries()) {
      const po = await draftOrder(s.buyer, {
        vendorId: spec.vendor.id,
        orderDate: JAN,
        lines: [
          {
            description: `Item ${i}`,
            accountId: s.u.accounts['51213'],
            quantity: spec.qty,
            unitPrice: spec.price,
          },
        ],
      });
      await submitOrder(s.buyer, po.id);
      await approveOrder(s.approver, po.id);

      const lineId = await asSystem(async (tx) =>
        (
          await tx.purchaseOrderLine.findFirstOrThrow({
            where: { purchaseOrderId: po.id },
            select: { id: true },
          })
        ).id,
      );

      await receiveGoods(
        s.stores,
        {
          purchaseOrderId: po.id,
          receivedOn: JAN20,
          lines: [{ poLineId: lineId, quantity: spec.recv }],
        },
        `rec-grn-${i}`,
      );

      if (spec.recv !== spec.qty) {
        await closeOrder(s.approver, po.id, 'Supplier could not complete the order.');
      }

      const invoice = await recordInvoice(s.apClerk, {
        vendorId: spec.vendor.id,
        vendorInvoiceNo: `REC-INV-${i}`,
        purchaseOrderId: po.id,
        invoiceDate: JAN20,
        lines: [
          {
            description: `Item ${i}`,
            poLineId: lineId,
            accountId: s.u.accounts['51213'],
            quantity: spec.recv,
            unitPrice: spec.price,
          },
        ],
      });
      expect(invoice.state).toBe('MATCHED');

      if (spec.pay !== '0') {
        const pv = await draftPayment(s.apClerk, {
          vendorId: spec.vendor.id,
          paymentDate: FEB,
          channel: 'BANK_TRANSFER',
          bankAccountId: s.u.accounts['11121'],
          allocations: [{ invoiceId: invoice.id, amount: spec.pay }],
        });
        await submitPayment(s.apClerk, pv.id);
        await approvePayment(s.apApprover, pv.id);
      }
    }

    const utility = await recordInvoice(s.apClerk, {
      vendorId: vendors[1].id,
      vendorInvoiceNo: 'NEC-JAN',
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Electricity',
          accountId: s.u.accounts['51211'],
          quantity: '1',
          unitPrice: '17500',
        },
      ],
    });
    const upv = await draftPayment(s.apClerk, {
      vendorId: vendors[1].id,
      paymentDate: FEB,
      channel: 'CHEQUE',
      chequeNo: '000441',
      bankAccountId: s.u.accounts['11121'],
      allocations: [{ invoiceId: utility.id, amount: '7500' }],
    });
    await submitPayment(s.apClerk, upv.id);
    await approvePayment(s.apApprover, upv.id);

    // The check. What the invoices say is outstanding must equal the Vendor
    // AP control account, to the cent. Impossible against the legacy design
    // for the same reason the student one was: there was neither a vendor
    // sub-ledger nor a payable, so there were not two numbers to compare.
    const recon = await reconcileVendorSubledger(s.reporter);
    expect(recon.variance).toBe('0.0000');

    // Independently: billed 5,000 + 3,000 + 9,000 + 17,500 = 34,500, paid
    // 5,000 + 4,000 + 7,500 = 16,500.
    expect(recon.subledger).toBe('18000.0000');

    // And the encumbrance ledger agrees with its own movement history.
    const drift = await reconcileEncumbrances(s.controller, s.u.fiscalYearId);
    expect(drift).toEqual([]);

    // Nothing is still committed: two orders fully received, one closed.
    const open = await openCommitments(s.controller, s.u.fiscalYearId);
    expect(open).toHaveLength(0);
  });

  it('agrees the GRNI balance with what has arrived and not been billed', async () => {
    const s = await scene();
    await approvedBudget(s.u, s.preparer, s.controller, [
      { accountId: s.u.accounts['51213'], annualAmount: '400000' },
    ]);
    const vendor = await vendorFor(s.u, s.buyer, 'GRNI-V');

    const po = await draftOrder(s.buyer, {
      vendorId: vendor.id,
      orderDate: JAN,
      lines: [
        { description: 'Desks', accountId: s.u.accounts['51213'], quantity: '20', unitPrice: '400' },
      ],
    });
    await submitOrder(s.buyer, po.id);
    await approveOrder(s.approver, po.id);
    const lineId = await asSystem(async (tx) =>
      (
        await tx.purchaseOrderLine.findFirstOrThrow({
          where: { purchaseOrderId: po.id },
          select: { id: true },
        })
      ).id,
    );

    await receiveGoods(
      s.stores,
      { purchaseOrderId: po.id, receivedOn: JAN20, lines: [{ poLineId: lineId, quantity: '20' }] },
      'grni-grn',
    );

    // 8,000 has arrived; half of it billed.
    await recordInvoice(s.apClerk, {
      vendorId: vendor.id,
      vendorInvoiceNo: 'GRNI-INV-1',
      purchaseOrderId: po.id,
      invoiceDate: JAN20,
      lines: [
        {
          description: 'Desks',
          poLineId: lineId,
          accountId: s.u.accounts['51213'],
          quantity: '10',
          unitPrice: '400',
        },
      ],
    });

    const grniBalance = await asSystem(async (tx) => {
      const account = await tx.account.findFirstOrThrow({
        where: { tenantId: s.u.tenantId, code: '21231' },
        select: { id: true },
      });
      const balances = await tx.accountPeriodBalance.findMany({
        where: { tenantId: s.u.tenantId, accountId: account.id },
        select: { movementDebit: true, movementCredit: true },
      });
      return sum(balances.map((b) => b.movementCredit.minus(b.movementDebit)));
    });

    // A clearing account exists so that a discrepancy is visible rather than
    // absorbed. 8,000 received less 4,000 invoiced.
    expect(grniBalance.toFixed(4)).toBe('4000.0000');

    const uninvoiced = await uninvoicedReceipts(s.reporter);
    expect(sum(uninvoiced.map((r) => r.uninvoiced)).toFixed(4)).toBe('4000.0000');
  });
});

describe('segregation of duties across procure-to-pay', () => {
  it('keeps the three sides of the match in different hands', () => {
    // A match between two documents written by the same hand proves nothing.
    expect(findSodViolations(['po.create', 'po.approve'])).toHaveLength(1);
    expect(findSodViolations(['po.approve', 'grn.create'])).toHaveLength(1);
    expect(findSodViolations(['grn.create', 'apinvoice.approve'])).toHaveLength(1);
    expect(findSodViolations(['apinvoice.record', 'apinvoice.approve'])).toHaveLength(1);
    expect(findSodViolations(['apinvoice.record', 'payment.approve'])).toHaveLength(1);
    expect(findSodViolations(['payment.create', 'payment.approve'])).toHaveLength(1);
    expect(findSodViolations(['vendor.manage', 'vendor.approve'])).toHaveLength(1);
    // The oldest one in this module, and still the most valuable: whoever can
    // change a vendor's bank account must not raise payments to it.
    expect(findSodViolations(['vendor.manage', 'payment.create'])).toHaveLength(1);
  });
});
