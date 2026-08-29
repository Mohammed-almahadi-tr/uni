import { afterAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import {
  approveFeeSchedule,
  draftFeeSchedule,
  reviseFeeSchedule,
} from '@/lib/academic/fee-matrix';
import { createStudent } from '@/lib/students/registry';
import {
  cancelRegistration,
  approveRegistrationDiscount,
  DuplicateRegistrationError,
  listRegistrations,
  previewRegistration,
  registerStudent,
  RegistrationError,
} from '@/lib/registration/engine';
import { registrationCard, verifyRegistrationCard } from '@/lib/registration/card';
import { assignTill, takeReceipt } from '@/lib/cashier/receipt';
import { SelfApprovalError } from '@/lib/auth/rbac';
import type { Principal } from '@/lib/auth/rbac';

/**
 * Semester registration (SRS Module 4, Track B4) — the convergence milestone.
 *
 * The legacy baseline, read out of `frmStudentRegisteration.vb`:
 *
 *   · **The registration and the ledger disagree by the discount.**
 *     `@TuitionFees1` is `ttxtTuitionFeesafterdiscount` (net); the debit and
 *     the credit posted to `Transactionees` are both `txtTuitionFees` (gross).
 *     The discount reaches no account at all.
 *
 *   · **The posting is optional.** The entire block is wrapped in
 *     `If CheckBox1.Checked = False Then`, and the block above it — the one
 *     that would have posted to `Transactions` — is commented out with the
 *     note *"the debit/cridit will be inserted from financial system"*.
 *
 *   · **The voucher number comes from the wrong table.**
 *     `Max(MoveNo)+1 from Transactions`, written into `Transactionees`.
 *
 *   · **The duplicate check cannot work.** It runs on a second connection,
 *     outside the transaction, with `And Semester=..` commented out.
 *
 *   · **The instalment remainder is always zero**, and truncated to whole
 *     pounds by `CInt` on the way.
 *
 * Every test below is one of those, negated.
 */

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

afterAll(disconnectAll);

interface Ctx {
  u: University;
  registrar: Principal;
  approver: Principal;
  canceller: Principal;
  cashier: Principal;
  studentId: string;
  studentNo: string;
  tuition: string;
  registrationFee: string;
  labFee: string;
  feeScheduleId: string;
}

/**
 * A university with a published fee schedule and one admitted student.
 *
 * Tuition 1,200,000 (deferrable, per term); registration 50,000 (one-off);
 * lab 30,000 (optional, per term). Priced from 1 January 2026.
 */
async function scene(
  opts: { thresholdPct?: string } = {},
): Promise<Ctx> {
  const u = await makeUniversity();

  if (opts.thresholdPct) {
    await asSystem((tx) =>
      tx.tenant.update({
        where: { id: u.tenantId },
        data: { discountApprovalThresholdPct: opts.thresholdPct! },
      }),
    );
  }

  const setter = await makePrincipal(u.tenantId, ['feematrix.manage', 'feematrix.read'], {
    name: 'setter',
  });
  const feeApprover = await makePrincipal(u.tenantId, ['feematrix.approve'], {
    name: 'feeapp',
  });

  const draft = await draftFeeSchedule(setter, {
    programmeId: u.programmeIds.MBBS,
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
    currency: 'SDG',
    effectiveFrom: D(2026, 1, 1),
    lines: [
      { feeItemId: u.feeItems.TUITION, amount: '1200000.00', sortOrder: 1 },
      {
        feeItemId: u.feeItems.REGISTRATION,
        amount: '50000.00',
        recurrence: 'ONE_OFF',
        sortOrder: 2,
      },
      {
        feeItemId: u.feeItems.LAB,
        amount: '30000.00',
        isMandatory: false,
        sortOrder: 3,
      },
    ],
  });
  await approveFeeSchedule(feeApprover, draft.id);

  const registry = await makePrincipal(u.tenantId, ['student.manage'], { name: 'reg' });
  const student = await createStudent(registry, {
    studentNo: 'U-2026-0001',
    fullNameAr: 'أحمد محمد علي حسن',
    fullNameEn: 'Ahmed Mohamed Ali Hassan',
    status: 'ADMITTED',
    programmeId: u.programmeIds.MBBS,
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
    nationalityId: u.nationalities.SD,
  });

  return {
    u,
    registrar: await makePrincipal(
      u.tenantId,
      ['registration.create', 'registration.read', 'discount.apply'],
      { name: 'registrar' },
    ),
    approver: await makePrincipal(u.tenantId, ['discount.approve', 'registration.read'], {
      name: 'discapp',
    }),
    canceller: await makePrincipal(u.tenantId, ['registration.cancel', 'registration.read'], {
      name: 'canceller',
    }),
    cashier: await cashierWithTill(u),
    studentId: student.id,
    studentNo: student.studentNo,
    tuition: u.feeItems.TUITION,
    registrationFee: u.feeItems.REGISTRATION,
    labFee: u.feeItems.LAB,
    feeScheduleId: draft.id,
  };
}

/** A cashier with a till, so the cancellation test can take real money. */
async function cashierWithTill(u: University): Promise<Principal> {
  const cashier = await makePrincipal(u.tenantId, ['receipt.create', 'student.read'], {
    name: 'cashier',
  });
  const tillAdmin = await makePrincipal(u.tenantId, ['coa.manage'], { name: 'tilladmin' });
  await assignTill(tillAdmin, cashier.userId, u.accounts['11111']);
  return cashier;
}

function base(c: Ctx) {
  return {
    studentId: c.studentId,
    academicTermId: c.u.termIds[1],
    levelYear: 1,
    registrationDate: D(2026, 1, 15),
  };
}

// ---------------------------------------------------------------------------
// The atomic posting — REQ-REG-02
// ---------------------------------------------------------------------------

describe('registration posts to the general ledger atomically', () => {
  it('creates the registration and its balanced voucher in one transaction', async () => {
    const c = await scene();

    const result = await registerStudent(c.registrar, base(c));

    expect(result.status).toBe('REGISTERED');
    expect(result.registrationNo).toBe('REG-AY-2026-00001');
    expect(result.gross).toBe('1250000.0000');
    expect(result.net).toBe('1250000.0000');
    expect(result.headerId).not.toBeNull();
    expect(result.voucherRef).toBeTruthy();

    // The optional lab fee was not taken, and says so.
    expect(result.lines.map((l) => l.feeItemCode)).toEqual(['TUITION', 'REGISTRATION']);
    expect(result.skipped).toEqual([
      { feeItemCode: 'LAB', reason: 'optional, and not taken' },
    ]);

    const voucher = await asSystem((tx) =>
      tx.transactionHeader.findUniqueOrThrow({
        where: { id: result.headerId! },
        select: {
          voucherType: true,
          sourceModule: true,
          sourceRef: true,
          totalAmount: true,
          lines: {
            select: {
              debitAmount: true,
              creditAmount: true,
              subledgerType: true,
              subledgerId: true,
              account: { select: { code: true } },
            },
          },
        },
      }),
    );

    expect(voucher.voucherType).toBe('STUDENT_CHARGE');
    expect(voucher.sourceModule).toBe('REGISTRATION');
    expect(voucher.sourceRef).toBe(result.registrationId);

    const debits = voucher.lines.reduce((t, l) => t + Number(l.debitAmount), 0);
    const credits = voucher.lines.reduce((t, l) => t + Number(l.creditAmount), 0);
    expect(debits).toBeCloseTo(credits, 4);
    expect(debits).toBeCloseTo(1250000, 4);

    // Every receivable line carries the student's own sub-ledger identity —
    // one per fee item, so the sub-ledger and the control account can be
    // reconciled line for line. The legacy `Transactionees` insert carried a
    // `StudID` text column and no control account at all.
    const ar = voucher.lines.filter((l) => l.subledgerType === 'STUDENT');
    expect(ar).toHaveLength(2);
    expect(ar.every((l) => l.subledgerId === c.studentId)).toBe(true);
  });

  it('bills the discount to an expense account, not by shrinking the receivable', async () => {
    // The legacy defect exactly: registration recorded net, ledger posted
    // gross, and the difference existed nowhere.
    const c = await scene({ thresholdPct: '50' });

    const result = await registerStudent(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '25' }],
      discountReason: 'Staff child',
    });

    expect(result.gross).toBe('1250000.0000');
    expect(result.discount).toBe('300000.0000');
    expect(result.net).toBe('950000.0000');
    expect(result.status).toBe('REGISTERED');

    const lines = await asSystem((tx) =>
      tx.transactionLine.findMany({
        where: { headerId: result.headerId! },
        select: {
          debitAmount: true,
          creditAmount: true,
          subledgerType: true,
          account: { select: { code: true, nameEn: true } },
        },
      }),
    );

    // Receivable = net. The student owes what the registration says.
    const receivable = lines
      .filter((l) => l.subledgerType === 'STUDENT')
      .reduce((t, l) => t + Number(l.debitAmount) - Number(l.creditAmount), 0);
    expect(receivable).toBeCloseTo(950000, 4);

    // Revenue (or unearned income) = gross. The institution recognises the
    // full price and shows what it gave away as an expense on its own line.
    const creditTotal = lines.reduce((t, l) => t + Number(l.creditAmount), 0);
    expect(creditTotal).toBeCloseTo(1250000, 4);

    const discountLine = lines.find(
      (l) => Number(l.debitAmount) === 300000 && !l.subledgerType,
    );
    expect(discountLine).toBeDefined();
  });

  it('refuses to register into a closed period, and creates nothing when it does', async () => {
    const c = await scene();

    // Period 3 is FUTURE in the fixture; March is therefore unpostable.
    await expect(
      registerStudent(c.registrar, { ...base(c), registrationDate: D(2026, 4, 10) }),
    ).rejects.toThrow();

    const rows = await asSystem((tx) =>
      tx.semesterRegistration.count({ where: { tenantId: c.u.tenantId } }),
    );
    // The whole point: no registration row survived the failed posting.
    expect(rows).toBe(0);
  });

  it('replays an idempotent submission without billing twice', async () => {
    const c = await scene();
    const key = 'reg-idem-0001';

    const first = await registerStudent(c.registrar, base(c), key);
    const second = await registerStudent(c.registrar, base(c), key);

    expect(second.registrationId).toBe(first.registrationId);
    expect(second.voucherRef).toBe(first.voucherRef);

    const count = await asSystem((tx) =>
      tx.semesterRegistration.count({ where: { tenantId: c.u.tenantId } }),
    );
    expect(count).toBe(1);

    const charges = await asSystem((tx) =>
      tx.studentCharge.count({ where: { studentId: c.studentId } }),
    );
    expect(charges).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// One registration per term — the check-then-act on a second connection
// ---------------------------------------------------------------------------

describe('one live registration per student per term', () => {
  it('refuses a second registration for the same term', async () => {
    const c = await scene();
    await registerStudent(c.registrar, base(c));

    await expect(registerStudent(c.registrar, base(c))).rejects.toThrow(
      DuplicateRegistrationError,
    );
  });

  it('allows the SECOND TERM of the same year — the predicate the legacy check dropped', async () => {
    // `ValidateRegisteration` had `And Semester=..` commented out, so it
    // matched on academic year alone and refused this outright.
    const c = await scene();
    await registerStudent(c.registrar, base(c));

    const second = await registerStudent(c.registrar, {
      ...base(c),
      academicTermId: c.u.termIds[2],
      registrationDate: D(2026, 2, 20),
    });

    expect(second.status).toBe('REGISTERED');
    expect(second.registrationNo).toBe('REG-AY-2026-00002');
  });

  it('refuses the duplicate at the database, not only in the application', async () => {
    const c = await scene();
    const first = await registerStudent(c.registrar, base(c));

    const row = await asSystem((tx) =>
      tx.semesterRegistration.findUniqueOrThrow({
        where: { id: first.registrationId },
        select: {
          tenantId: true,
          studentId: true,
          academicTermId: true,
          programmeId: true,
          batchId: true,
          admissionCategoryId: true,
          academicYearId: true,
          feeScheduleId: true,
          feeScheduleVersionNo: true,
          currency: true,
          createdById: true,
        },
      }),
    );

    // A hand-written insert, bypassing the engine entirely — which is what a
    // concurrent transaction amounts to.
    await expect(
      asSystem((tx) =>
        tx.semesterRegistration.create({
          data: {
            ...row,
            registrationNo: 'REG-HAND-00001',
            levelYear: 1,
            registrationDate: D(2026, 1, 20),
            grossAmount: '1000.00',
            netAmount: '1000.00',
            verifyToken: 'f'.repeat(32),
            status: 'PENDING_APPROVAL',
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('lets a cancelled term be registered again', async () => {
    const c = await scene();
    const first = await registerStudent(c.registrar, base(c));
    await cancelRegistration(c.canceller, first.registrationId, 'Admitted in error', {
      reversalDate: D(2026, 2, 1),
    });

    const again = await registerStudent(c.registrar, {
      ...base(c),
      registrationDate: D(2026, 2, 10),
    });
    expect(again.status).toBe('REGISTERED');
  });
});

// ---------------------------------------------------------------------------
// The fee matrix handover — B1 into B4
// ---------------------------------------------------------------------------

describe('the fee schedule version billed is recorded permanently', () => {
  it('bills the version in force on the registration date, and keeps billing it after a revision', async () => {
    const c = await scene();
    const first = await registerStudent(c.registrar, base(c));
    expect(first.feeScheduleVersionNo).toBe(1);
    expect(first.gross).toBe('1250000.0000');

    // Fees rise from 1 March. The January registration must not be repriced.
    const setter = await makePrincipal(c.u.tenantId, ['feematrix.manage'], { name: 's2' });
    const approver = await makePrincipal(c.u.tenantId, ['feematrix.approve'], { name: 'a2' });
    const v2 = await reviseFeeSchedule(setter, c.feeScheduleId, {
      effectiveFrom: D(2026, 3, 1),
      lines: [
        { feeItemId: c.tuition, amount: '1500000.00', sortOrder: 1 },
        { feeItemId: c.registrationFee, amount: '50000.00', recurrence: 'ONE_OFF', sortOrder: 2 },
      ],
    });
    await approveFeeSchedule(approver, v2.id);

    const stored = await asSystem((tx) =>
      tx.semesterRegistration.findUniqueOrThrow({
        where: { id: first.registrationId },
        select: { feeScheduleVersionNo: true, grossAmount: true },
      }),
    );
    expect(stored.feeScheduleVersionNo).toBe(1);
    expect(stored.grossAmount.toFixed(4)).toBe('1250000.0000');
  });

  it('refuses a student who has no programme, batch or admission category', async () => {
    const c = await scene();
    const registry = await makePrincipal(c.u.tenantId, ['student.manage'], { name: 'r2' });
    const walkIn = await createStudent(registry, {
      studentNo: 'U-2026-0999',
      fullNameAr: 'زائر',
      fullNameEn: 'Walk In',
      status: 'ACTIVE',
    });

    await expect(
      registerStudent(c.registrar, { ...base(c), studentId: walkIn.id }),
    ).rejects.toThrow(/programme/);
  });

  it('refuses when nothing prices the cohort on that day', async () => {
    const c = await scene();
    // The schedule starts 1 January 2026; December 2025 is priced by nothing.
    // The fiscal year does not cover it either, so either refusal is correct —
    // what must not happen is a registration billed against no schedule.
    await expect(
      registerStudent(c.registrar, { ...base(c), registrationDate: D(2025, 12, 1) }),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Recurrence — the fee a fifth-year student was charged five times
// ---------------------------------------------------------------------------

describe('recurrence decides what is billed again', () => {
  it('bills a one-off item once and a per-term item every term', async () => {
    const c = await scene();

    const first = await registerStudent(c.registrar, base(c));
    expect(first.lines.map((l) => l.feeItemCode)).toEqual(['TUITION', 'REGISTRATION']);

    const second = await registerStudent(c.registrar, {
      ...base(c),
      academicTermId: c.u.termIds[2],
      registrationDate: D(2026, 2, 20),
    });

    expect(second.lines.map((l) => l.feeItemCode)).toEqual(['TUITION']);
    expect(second.skipped).toContainEqual({
      feeItemCode: 'REGISTRATION',
      reason: 'one-off, and already billed to this student',
    });
    expect(second.net).toBe('1200000.0000');
  });

  it('bills an optional item only when it is taken', async () => {
    const c = await scene();
    const result = await registerStudent(c.registrar, {
      ...base(c),
      optionalFeeItemIds: [c.labFee],
    });

    expect(result.lines.map((l) => l.feeItemCode)).toEqual([
      'TUITION',
      'REGISTRATION',
      'LAB',
    ]);
    expect(result.gross).toBe('1280000.0000');
  });
});

// ---------------------------------------------------------------------------
// Discount governance — REQ-SPN-04
// ---------------------------------------------------------------------------

describe('a discount above threshold cannot post without a second signature', () => {
  it('parks the registration and posts nothing at all', async () => {
    const c = await scene({ thresholdPct: '10' });

    const result = await registerStudent(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '50' }],
      discountReason: 'Hardship — committee minute 41',
    });

    expect(result.requiresApproval).toBe(true);
    expect(result.status).toBe('PENDING_APPROVAL');
    expect(result.headerId).toBeNull();

    // Nothing reached the ledger, and nothing reached the sub-ledger.
    const charges = await asSystem((tx) =>
      tx.studentCharge.count({ where: { studentId: c.studentId } }),
    );
    expect(charges).toBe(0);

    const lines = await asSystem((tx) =>
      tx.registrationLine.findMany({
        where: { registrationId: result.registrationId },
        select: { chargeId: true, netAmount: true },
      }),
    );
    expect(lines).toHaveLength(2);
    expect(lines.every((l) => l.chargeId === null)).toBe(true);
  });

  it('posts the lines that were approved, not a re-resolution of the matrix', async () => {
    const c = await scene({ thresholdPct: '10' });

    const pending = await registerStudent(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '50' }],
      discountReason: 'Hardship — committee minute 41',
    });
    expect(pending.net).toBe('650000.0000');

    // The matrix is revised while the approval sits in someone's queue.
    const setter = await makePrincipal(c.u.tenantId, ['feematrix.manage'], { name: 's3' });
    const feeApprover = await makePrincipal(c.u.tenantId, ['feematrix.approve'], {
      name: 'a3',
    });
    const v2 = await reviseFeeSchedule(setter, c.feeScheduleId, {
      effectiveFrom: D(2026, 2, 1),
      lines: [{ feeItemId: c.tuition, amount: '9000000.00' }],
    });
    await approveFeeSchedule(feeApprover, v2.id);

    const posted = await approveRegistrationDiscount(c.approver, pending.registrationId);
    expect(posted.voucherRef).toBeTruthy();

    const stored = await asSystem((tx) =>
      tx.semesterRegistration.findUniqueOrThrow({
        where: { id: pending.registrationId },
        select: { status: true, netAmount: true, grossAmount: true },
      }),
    );
    expect(stored.status).toBe('REGISTERED');
    expect(stored.grossAmount.toFixed(4)).toBe('1250000.0000');
    expect(stored.netAmount.toFixed(4)).toBe('650000.0000');
  });

  it('refuses the approver who raised it', async () => {
    const c = await scene({ thresholdPct: '10' });
    const both = await makePrincipal(
      c.u.tenantId,
      ['registration.create', 'registration.read', 'discount.apply', 'discount.approve'],
      { name: 'both' },
    );

    const pending = await registerStudent(both, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '40' }],
      discountReason: 'Merit',
    });

    await expect(
      approveRegistrationDiscount(both, pending.registrationId),
    ).rejects.toThrow(SelfApprovalError);
  });

  it('lets a discount at or below the threshold post without approval', async () => {
    const c = await scene({ thresholdPct: '10' });
    const result = await registerStudent(c.registrar, {
      ...base(c),
      // 120,000 of 1,250,000 is 9.6% — under the threshold.
      discounts: [{ feeItemId: c.tuition, pct: '10' }],
      discountReason: 'Sibling',
    });

    expect(result.discountPct).toBe('9.6000');
    expect(result.requiresApproval).toBe(false);
    expect(result.status).toBe('REGISTERED');
  });

  it('refuses a discount with no stated reason', async () => {
    const c = await scene({ thresholdPct: '50' });
    await expect(
      registerStudent(c.registrar, {
        ...base(c),
        discounts: [{ feeItemId: c.tuition, amount: '1000' }],
      }),
    ).rejects.toThrow(/stated reason/);
  });

  it('refuses a discount larger than the charge', async () => {
    const c = await scene({ thresholdPct: '99' });
    await expect(
      registerStudent(c.registrar, {
        ...base(c),
        discounts: [{ feeItemId: c.tuition, amount: '2000000' }],
        discountReason: 'Typo',
      }),
    ).rejects.toThrow(/cannot turn a bill into a payment/);
  });

  it('refuses a discount on an item this registration does not bill', async () => {
    const c = await scene({ thresholdPct: '99' });
    await expect(
      registerStudent(c.registrar, {
        ...base(c),
        discounts: [{ feeItemId: c.labFee, pct: '50' }],
        discountReason: 'Lab',
      }),
    ).rejects.toThrow(/does not bill/);
  });

  it('refuses the database insert when an over-threshold discount has no approver', async () => {
    const c = await scene({ thresholdPct: '10' });
    const row = await registerStudent(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '50' }],
      discountReason: 'Hardship',
    });

    // Forcing the status by hand, as a direct database write would.
    await expect(
      asSystem((tx) =>
        tx.semesterRegistration.update({
          where: { id: row.registrationId },
          data: { status: 'REGISTERED', postedHeaderId: null },
        }),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Cancellation — REQ-REG-03
// ---------------------------------------------------------------------------

describe('cancellation reverses rather than deletes', () => {
  it('raises one linked reversing voucher and leaves the original on file', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));

    const cancelled = await cancelRegistration(
      c.canceller,
      reg.registrationId,
      'Withdrew before term start',
      { reversalDate: D(2026, 2, 5) },
    );

    expect(cancelled.voucherRef).toBeTruthy();

    const original = await asSystem((tx) =>
      tx.transactionHeader.findUniqueOrThrow({
        where: { id: reg.headerId! },
        select: { reversedAt: true },
      }),
    );
    expect(original.reversedAt).not.toBeNull();

    const reversal = await asSystem((tx) =>
      tx.transactionHeader.findFirstOrThrow({
        where: { reversesId: reg.headerId! },
        select: { voucherType: true, reversalReason: true, totalAmount: true },
      }),
    );
    expect(reversal.voucherType).toBe('REVERSAL');
    expect(reversal.reversalReason).toBe('Withdrew before term start');
    expect(reversal.totalAmount.toFixed(4)).toBe('1250000.0000');

    // ONE reversal, not one per fee item.
    const reversalCount = await asSystem((tx) =>
      tx.transactionHeader.count({
        where: { tenantId: c.u.tenantId, voucherType: 'REVERSAL' },
      }),
    );
    expect(reversalCount).toBe(1);

    const stored = await asSystem((tx) =>
      tx.semesterRegistration.findUniqueOrThrow({
        where: { id: reg.registrationId },
        select: { status: true, cancellationReason: true, postedHeaderId: true },
      }),
    );
    expect(stored.status).toBe('CANCELLED');
    expect(stored.postedHeaderId).toBe(reg.headerId);
  });

  it('turns money already collected into a credit balance rather than keeping it', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));

    const charges = await asSystem((tx) =>
      tx.studentCharge.findMany({
        where: { studentId: c.studentId },
        select: { id: true, feeItem: { select: { code: true } } },
      }),
    );
    const regFee = charges.find((x) => x.feeItem.code === 'REGISTRATION')!;

    await takeReceipt(
      c.cashier,
      {
        studentId: c.studentId,
        docDate: D(2026, 1, 20),
        channel: 'CASH',
        amount: '50000.00',
        allocations: [{ chargeId: regFee.id, amount: '50000.00' }],
      },
      'rcpt-cancel-1',
    );

    const cancelled = await cancelRegistration(
      c.canceller,
      reg.registrationId,
      'Programme discontinued',
      { reversalDate: D(2026, 2, 5) },
    );

    expect(cancelled.freedToCredit).toBe('50000.0000');

    const settled = await asSystem((tx) =>
      tx.studentCharge.findUniqueOrThrow({
        where: { id: regFee.id },
        select: { settledAmount: true, reversedAt: true },
      }),
    );
    expect(settled.settledAmount.toFixed(4)).toBe('0.0000');
    expect(settled.reversedAt).not.toBeNull();
  });

  it('cancels a pending registration without posting anything', async () => {
    const c = await scene({ thresholdPct: '10' });
    const pending = await registerStudent(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '60' }],
      discountReason: 'Declined by committee',
    });

    const cancelled = await cancelRegistration(
      c.canceller,
      pending.registrationId,
      'Discount refused; student did not proceed',
    );
    expect(cancelled.voucherRef).toBeNull();

    const vouchers = await asSystem((tx) =>
      tx.transactionHeader.count({ where: { tenantId: c.u.tenantId } }),
    );
    expect(vouchers).toBe(0);
  });

  it('requires a reason', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));
    await expect(
      cancelRegistration(c.canceller, reg.registrationId, '   '),
    ).rejects.toThrow(RegistrationError);
  });

  it('refuses to delete a registration outright', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));
    await expect(
      asSystem((tx) =>
        tx.semesterRegistration.delete({ where: { id: reg.registrationId } }),
      ),
    ).rejects.toThrow();
  });

  it('refuses to edit the amounts of a posted registration', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));
    await expect(
      asSystem((tx) =>
        tx.semesterRegistration.update({
          where: { id: reg.registrationId },
          data: { grossAmount: '1', netAmount: '1' },
        }),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// The sub-ledger tie-out — the property the whole track exists for
// ---------------------------------------------------------------------------

describe('the sub-ledger and the control account agree', () => {
  it('ties student charges to the Student AR control balance after registration and cancellation', async () => {
    const c = await scene({ thresholdPct: '50' });

    await registerStudent(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '20' }],
      discountReason: 'Sibling',
    });

    const second = await registerStudent(c.registrar, {
      ...base(c),
      academicTermId: c.u.termIds[2],
      registrationDate: D(2026, 2, 10),
    });
    await cancelRegistration(c.canceller, second.registrationId, 'Deferred a term', {
      reversalDate: D(2026, 2, 20),
    });

    const subledger = await asSystem(async (tx) => {
      const rows = await tx.studentCharge.findMany({
        where: { tenantId: c.u.tenantId, reversedAt: null },
        select: { netAmount: true, settledAmount: true },
      });
      return rows.reduce(
        (t, r) => t + Number(r.netAmount) - Number(r.settledAmount),
        0,
      );
    });

    const control = await asSystem(async (tx) => {
      const mapping = await tx.accountMapping.findFirstOrThrow({
        where: { tenantId: c.u.tenantId, role: 'STUDENT_AR_CONTROL' },
        select: { accountId: true },
      });
      const lines = await tx.transactionLine.findMany({
        where: { accountId: mapping.accountId, header: { tenantId: c.u.tenantId } },
        select: { debitAmount: true, creditAmount: true },
      });
      return lines.reduce(
        (t, l) => t + Number(l.debitAmount) - Number(l.creditAmount),
        0,
      );
    });

    expect(control).toBeCloseTo(subledger, 4);
    expect(control).toBeCloseTo(1010000, 4);
  });

  it('spreads deferrable tuition across the fiscal periods the TERM spans', async () => {
    // The legacy system recognised a full year's tuition on registration day.
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));

    const tuitionCharge = await asSystem((tx) =>
      tx.studentCharge.findFirstOrThrow({
        where: { registrationId: reg.registrationId, feeItemId: c.tuition },
        select: { id: true, isDeferred: true },
      }),
    );
    expect(tuitionCharge.isDeferred).toBe(true);

    const slices = await asSystem((tx) =>
      tx.recognitionEntry.findMany({
        where: { chargeId: tuitionCharge.id },
        select: { amount: true },
      }),
    );
    // Term 1 runs January to April: four monthly fiscal periods, of which
    // the fixture leaves the last two FUTURE. Recognition is scheduled
    // across all four regardless — the schedule is a fact about the term,
    // and the period-end batch is what waits for the period to open.
    expect(slices).toHaveLength(4);
    const total = slices.reduce((t, s) => t + Number(s.amount), 0);
    expect(total).toBeCloseTo(1200000, 4);
  });
});

// ---------------------------------------------------------------------------
// The registration card — REQ-REG-05
// ---------------------------------------------------------------------------

describe('registration card and QR verification', () => {
  it('issues a card whose token verifies without a session', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));

    const card = await registrationCard(c.registrar, reg.registrationId);
    expect(card.registrationNo).toBe(reg.registrationNo);
    expect(card.verifyPath).toBe(`/verify/registration/${card.verifyToken}`);
    expect(card.verifyToken).toMatch(/^[0-9a-f]{32}$/);
    expect(card.student.nameAr).toBe('أحمد محمد علي حسن');
    expect(card.fees.lines).toHaveLength(2);

    const verified = await verifyRegistrationCard(card.verifyToken);
    expect(verified.valid).toBe(true);
    expect(verified.registration?.studentNo).toBe(c.studentNo);
    expect(verified.registration?.termNameEn).toBe('First Term 2026');
    // A scan discloses no money.
    expect(JSON.stringify(verified)).not.toContain('1250000');
  });

  it('reports a cancelled registration as found but not valid', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));
    const card = await registrationCard(c.registrar, reg.registrationId);

    await cancelRegistration(c.canceller, reg.registrationId, 'Withdrew', {
      reversalDate: D(2026, 2, 2),
    });

    const verified = await verifyRegistrationCard(card.verifyToken);
    expect(verified.valid).toBe(false);
    expect(verified.registration?.registrationNo).toBe(reg.registrationNo);
    expect(verified.message).toMatch(/cancelled/);
  });

  it('refuses a token that is not one', async () => {
    const bad = await verifyRegistrationCard('not-a-token');
    expect(bad.valid).toBe(false);
    expect(bad.registration).toBeUndefined();

    const unknown = await verifyRegistrationCard('a'.repeat(32));
    expect(unknown.valid).toBe(false);
    expect(unknown.message).toMatch(/No registration matches/);
  });
});

// ---------------------------------------------------------------------------
// Instalments — the remainder that was always zero
// ---------------------------------------------------------------------------

describe('instalments', () => {
  it('splits the net into weighted instalments that add back exactly', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, {
      ...base(c),
      instalments: {
        dueDates: [D(2026, 1, 15), D(2026, 3, 15), D(2026, 5, 15)],
        weights: ['50', '25', '25'],
      },
    });

    expect(reg.instalmentPlanId).not.toBeNull();

    const instalments = await asSystem((tx) =>
      tx.instalment.findMany({
        where: { planId: reg.instalmentPlanId! },
        orderBy: { seq: 'asc' },
        select: { seq: true, amount: true, dueDate: true },
      }),
    );

    expect(instalments).toHaveLength(3);
    expect(instalments.map((i) => i.amount.toFixed(2))).toEqual([
      '625000.00',
      '312500.00',
      '312500.00',
    ]);
    const total = instalments.reduce((t, i) => t + Number(i.amount), 0);
    expect(total).toBeCloseTo(1250000, 4);
  });

  it('leaves no residue on an amount that does not divide', async () => {
    const c = await scene({ thresholdPct: '99' });
    const reg = await registerStudent(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, amount: '0.01' }],
      discountReason: 'Rounding test',
      instalments: { dueDates: [D(2026, 1, 15), D(2026, 2, 15), D(2026, 3, 15)] },
    });

    const instalments = await asSystem((tx) =>
      tx.instalment.findMany({
        where: { planId: reg.instalmentPlanId! },
        select: { amount: true },
      }),
    );
    const total = instalments.reduce((t, i) => t + Number(i.amount), 0);
    expect(total.toFixed(2)).toBe('1249999.99');
  });
});

// ---------------------------------------------------------------------------
// Preview, listing and authorisation
// ---------------------------------------------------------------------------

describe('preview, listing and authorisation', () => {
  it('previews the identical figures without creating anything', async () => {
    const c = await scene({ thresholdPct: '50' });

    const preview = await previewRegistration(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '15' }],
      discountReason: 'Merit',
    });

    const created = await asSystem((tx) =>
      tx.semesterRegistration.count({ where: { tenantId: c.u.tenantId } }),
    );
    expect(created).toBe(0);

    const actual = await registerStudent(c.registrar, {
      ...base(c),
      discounts: [{ feeItemId: c.tuition, pct: '15' }],
      discountReason: 'Merit',
    });

    expect(actual.gross).toBe(preview.gross);
    expect(actual.discount).toBe(preview.discount);
    expect(actual.net).toBe(preview.net);
    expect(actual.discountPct).toBe(preview.discountPct);
    expect(actual.feeScheduleVersionNo).toBe(preview.feeScheduleVersionNo);
  });

  it('lists registrations for a term with their voucher references', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, base(c));

    const listed = await listRegistrations(c.registrar, {
      academicTermId: c.u.termIds[1],
    });
    expect(listed).toHaveLength(1);
    expect(listed[0].registrationNo).toBe(reg.registrationNo);
    expect(listed[0].voucherRef).toBe(reg.voucherRef);
    expect(listed[0].studentNameAr).toBe('أحمد محمد علي حسن');
  });

  it('refuses a registrar without registration.create', async () => {
    const c = await scene();
    const reader = await makePrincipal(c.u.tenantId, ['registration.read'], {
      name: 'ro',
    });
    await expect(registerStudent(reader, base(c))).rejects.toThrow(/registration.create/);
  });

  it('refuses a discount from someone who may not apply one', async () => {
    const c = await scene({ thresholdPct: '50' });
    const plain = await makePrincipal(
      c.u.tenantId,
      ['registration.create', 'registration.read'],
      { name: 'plain' },
    );
    await expect(
      registerStudent(plain, {
        ...base(c),
        discounts: [{ feeItemId: c.tuition, pct: '5' }],
        discountReason: 'Sibling',
      }),
    ).rejects.toThrow(/discount.apply/);
  });

  it('refuses a student whose status does not permit registration', async () => {
    const c = await scene();
    await asSystem((tx) =>
      tx.student.update({ where: { id: c.studentId }, data: { status: 'WITHDRAWN' } }),
    );
    await expect(registerStudent(c.registrar, base(c))).rejects.toThrow(/withdrawn/);
  });

  it('refuses a year of study beyond the programme', async () => {
    const c = await scene();
    await expect(
      registerStudent(c.registrar, { ...base(c), levelYear: 9 }),
    ).rejects.toThrow(/beyond/);
  });

  it('refuses a registration after the term registration deadline', async () => {
    const c = await scene();
    await expect(
      registerStudent(c.registrar, { ...base(c), registrationDate: D(2026, 3, 1) }),
    ).rejects.toThrow(/closed on/);
  });

  it('keeps registrations inside their own tenant', async () => {
    const a = await scene();
    const b = await scene();
    const regA = await registerStudent(a.registrar, base(a));

    const seenFromB = await asTenant(b.u.tenantId, (tx) =>
      tx.semesterRegistration.findMany({ select: { id: true } }),
    );
    expect(seenFromB.map((r) => r.id)).not.toContain(regA.registrationId);
  });
});
