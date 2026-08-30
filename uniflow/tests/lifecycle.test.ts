import { afterAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import { approveFeeSchedule, draftFeeSchedule } from '@/lib/academic/fee-matrix';
import { createStudent } from '@/lib/students/registry';
import { registerStudent } from '@/lib/registration/engine';
import { assignTill, takeReceipt } from '@/lib/cashier/receipt';
import {
  changeStudentStatus,
  cohortOn,
  statusHistory,
  statusOn,
  StatusError,
} from '@/lib/students/status';
import {
  arrears,
  clearHold,
  HoldError,
  listHolds,
  placeHold,
  registrationBlocks,
  RegistrationBlockedError,
} from '@/lib/students/holds';
import {
  programmeHistory,
  programmeOn,
  transferProgramme,
  TransferError,
} from '@/lib/students/transfer';
import {
  activeRefundPolicy,
  RefundPolicyError,
  setRefundPolicy,
} from '@/lib/students/refunds';
import { describeOptions, transitionFor, TRANSITIONS } from '@/lib/students/lifecycle';
import { createInstalmentPlan } from '@/lib/billing/instalments';
import type { Principal } from '@/lib/auth/rbac';

/**
 * Student status lifecycle, holds and programme transfer (SRS Module 14,
 * REQ-REG-04, REQ-REG-06, REQ-FEE-03 — Track B5).
 *
 * The legacy baseline, verified in the sources:
 *
 *   · **Standing is which table the row is in.** `frmStudentProfiles` writes
 *     `StudentsProfilees` for accepted and `StudentsProfilesIndecent` for
 *     rejected, chosen by `If Me.ComboBox1.Text = "يقبل"`. Each branch deletes
 *     only from the table it is about to write, so a changed verdict leaves
 *     the student in both; and `Update StdForm Set CH=1` runs either way, so
 *     the admission form cannot tell them apart. No effective date, no
 *     approver, no history — and therefore no deferral, suspension,
 *     dismissal or re-admission anywhere in the system.
 *
 *   · **Transfer deletes the evidence.**
 *     `Delete from Registrationees where StudentIndex=.. and Program=..`
 *     followed by `update StudentsProfilees set Program=@Program`. The new
 *     programme's postings then use `@Acc4 = Me.txtProgram.Text` — the
 *     programme being *left* — while the registration row uses
 *     `CombProgram.SelectedItem`, the one being joined.
 *
 *   · **Arrears are a report, not a control.** `StudentsUnpaidList`,
 *     `ProgramsUnpaidFeesDetails` and `frmUncollectedFees` all compute what a
 *     student owes. Nothing consults any of them when a student registers.
 *
 * Every test below is one of those, negated.
 */

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

afterAll(disconnectAll);

interface Ctx {
  u: University;
  registrar: Principal;
  registryOfficer: Principal;
  dean: Principal;
  bursar: Principal;
  cashier: Principal;
  transferrer: Principal;
  studentId: string;
  studentNo: string;
  tuition: string;
  registrationFee: string;
}

/**
 * A university with a published fee schedule for both programmes and one
 * admitted student on MBBS.
 *
 * Tuition 1,000,000 (refundable, deferrable); registration 50,000 (one-off).
 * The registration fee is made non-refundable, which is what an institution
 * does with it and what makes the refund arithmetic worth asserting.
 */
async function scene(): Promise<Ctx> {
  const u = await makeUniversity();

  const setter = await makePrincipal(u.tenantId, ['feematrix.manage', 'feematrix.read'], {
    name: 'setter',
  });
  const feeApprover = await makePrincipal(u.tenantId, ['feematrix.approve'], {
    name: 'feeapp',
  });

  await asSystem((tx) =>
    tx.feeItem.update({
      where: { id: u.feeItems.REGISTRATION },
      data: { isRefundable: false },
    }),
  );

  for (const programmeId of [u.programmeIds.MBBS, u.programmeIds.NURS]) {
    const draft = await draftFeeSchedule(setter, {
      programmeId,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [
        {
          feeItemId: u.feeItems.TUITION,
          amount: programmeId === u.programmeIds.MBBS ? '1000000.00' : '600000.00',
          sortOrder: 1,
        },
        {
          feeItemId: u.feeItems.REGISTRATION,
          amount: '50000.00',
          recurrence: 'ONE_OFF',
          sortOrder: 2,
        },
      ],
    });
    await approveFeeSchedule(feeApprover, draft.id);
  }

  const registryOfficer = await makePrincipal(
    u.tenantId,
    ['student.manage', 'student.read', 'student.status', 'charge.create'],
    { name: 'registry' },
  );

  const student = await createStudent(registryOfficer, {
    studentNo: 'U-2026-0001',
    fullNameAr: 'أحمد محمد علي حسن',
    fullNameEn: 'Ahmed Mohamed Ali Hassan',
    status: 'ADMITTED',
    admittedOn: D(2026, 1, 2),
    programmeId: u.programmeIds.MBBS,
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
    nationalityId: u.nationalities.SD,
  });

  const cashier = await makePrincipal(u.tenantId, ['receipt.create', 'student.read'], {
    name: 'cashier',
  });
  const tillAdmin = await makePrincipal(u.tenantId, ['coa.manage'], { name: 'tilladmin' });
  await assignTill(tillAdmin, cashier.userId, u.accounts['11111']);

  return {
    u,
    registrar: await makePrincipal(
      u.tenantId,
      ['registration.create', 'registration.read', 'student.read'],
      { name: 'registrar' },
    ),
    registryOfficer,
    dean: await makePrincipal(u.tenantId, ['hold.manage', 'student.read', 'student.status'], {
      name: 'dean',
    }),
    bursar: await makePrincipal(u.tenantId, ['hold.manage', 'student.read'], {
      name: 'bursar',
    }),
    cashier,
    transferrer: await makePrincipal(
      u.tenantId,
      [
        'registration.transfer',
        'registration.create',
        'registration.read',
        'student.read',
      ],
      { name: 'transferrer' },
    ),
    studentId: student.id,
    studentNo: student.studentNo,
    tuition: u.feeItems.TUITION,
    registrationFee: u.feeItems.REGISTRATION,
  };
}

function register(c: Ctx, on = D(2026, 1, 15)) {
  return registerStudent(c.registrar, {
    studentId: c.studentId,
    academicTermId: c.u.termIds[1],
    levelYear: 1,
    registrationDate: on,
  });
}

// ---------------------------------------------------------------------------
// The state machine — REQ-LIF-01
// ---------------------------------------------------------------------------

describe('the status state machine', () => {
  it('promotes an admitted student to active on their first registration', async () => {
    const c = await scene();

    const before = await asSystem((tx) =>
      tx.student.findUniqueOrThrow({
        where: { id: c.studentId },
        select: { status: true },
      }),
    );
    expect(before.status).toBe('ADMITTED');

    const reg = await register(c);

    const after = await asSystem((tx) =>
      tx.student.findUniqueOrThrow({
        where: { id: c.studentId },
        select: { status: true },
      }),
    );
    expect(after.status).toBe('ACTIVE');

    const history = await statusHistory(c.registryOfficer, c.studentId);
    expect(history.map((h) => h.toStatus)).toEqual(['ADMITTED', 'ACTIVE']);
    expect(history[0].fromStatus).toBeNull();
    expect(history[1].fromStatus).toBe('ADMITTED');
    expect(history[1].reason).toContain(reg.registrationNo);
  });

  it('refuses a transition the machine does not have, and says what is possible', async () => {
    const c = await scene();
    await register(c);

    await expect(
      changeStudentStatus(c.registryOfficer, {
        studentId: c.studentId,
        to: 'ALUMNUS',
        reason: 'Skipping graduation',
        approvedById: c.dean.userId,
      }),
    ).rejects.toThrow(/cannot become alumnus/);

    expect(describeOptions('ACTIVE')).toContain('graduated');
    expect(describeOptions('DISMISSED')).toContain('terminal');
  });

  it('requires a named approver where the transition says so', async () => {
    const c = await scene();
    await register(c);

    await expect(
      changeStudentStatus(c.registryOfficer, {
        studentId: c.studentId,
        to: 'DISMISSED',
        reason: 'Academic failure',
      }),
    ).rejects.toThrow(/requires a named approver/);
  });

  it('requires a reason, which is the one field the legacy build asked for', async () => {
    const c = await scene();
    await register(c);
    await expect(
      changeStudentStatus(c.registryOfficer, {
        studentId: c.studentId,
        to: 'GRADUATED',
        reason: '   ',
        approvedById: c.dean.userId,
      }),
    ).rejects.toThrow(StatusError);
  });

  it('has no REJECTED status, because a rejected applicant is not a student', async () => {
    // The legacy `StudentsProfilesIndecent` is a table of people the
    // institution decided were not its students, keyed and reported as though
    // they were. Rejection is an admissions decision (B2), not a standing.
    expect(TRANSITIONS.some((t) => (t.to as string) === 'REJECTED')).toBe(false);
    expect(transitionFor('APPLICANT', 'ADMITTED')).not.toBeNull();
  });

  it('refuses a status change written straight past the machine', async () => {
    const c = await scene();
    await register(c);

    // `from_status` must chain to the student's current standing.
    await expect(
      asSystem((tx) =>
        tx.studentStatusHistory.create({
          data: {
            tenantId: c.u.tenantId,
            studentId: c.studentId,
            fromStatus: 'SUSPENDED',
            toStatus: 'GRADUATED',
            effectiveDate: D(2026, 3, 1),
            reason: 'Hand-written',
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('refuses back-dating a transition behind one already recorded', async () => {
    const c = await scene();
    await register(c);
    await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'SUSPENDED',
      effectiveDate: D(2026, 3, 1),
      reason: 'Disciplinary',
      approvedById: c.dean.userId,
    });

    await expect(
      changeStudentStatus(c.registryOfficer, {
        studentId: c.studentId,
        to: 'ACTIVE',
        effectiveDate: D(2026, 2, 1),
        reason: 'Lifted, back-dated',
        approvedById: c.dean.userId,
      }),
    ).rejects.toThrow(/before the/);
  });

  it('refuses to edit or delete a recorded transition', async () => {
    const c = await scene();
    await register(c);
    const history = await statusHistory(c.registryOfficer, c.studentId);
    const row = history[history.length - 1];

    await expect(
      asSystem((tx) =>
        tx.studentStatusHistory.update({
          where: { id: row.id },
          data: { reason: 'Rewritten' },
        }),
      ),
    ).rejects.toThrow();

    await expect(
      asSystem((tx) => tx.studentStatusHistory.delete({ where: { id: row.id } })),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Effective-dated history — the question the legacy schema cannot answer
// ---------------------------------------------------------------------------

describe('standing is answerable historically', () => {
  it('answers who a student was on a past date, after they have moved on', async () => {
    const c = await scene();
    await register(c);

    await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'SUSPENDED',
      effectiveDate: D(2026, 3, 1),
      reason: 'Disciplinary panel, minute 12',
      approvedById: c.dean.userId,
    });

    const before = await asTenant(c.u.tenantId, (tx) =>
      statusOn(tx, c.u.tenantId, c.studentId, D(2026, 2, 1)),
    );
    const after = await asTenant(c.u.tenantId, (tx) =>
      statusOn(tx, c.u.tenantId, c.studentId, D(2026, 4, 1)),
    );
    const beforeAdmission = await asTenant(c.u.tenantId, (tx) =>
      statusOn(tx, c.u.tenantId, c.studentId, D(2026, 1, 1)),
    );

    expect(before).toBe('ACTIVE');
    expect(after).toBe('SUSPENDED');
    // The opening row is dated from admission, so the day before it the
    // student had no standing at all — which is the honest answer.
    expect(beforeAdmission).toBeNull();
  });

  it('answers who was active in a term, from history rather than from the column', async () => {
    const c = await scene();
    await register(c);

    const second = await createStudent(c.registryOfficer, {
      studentNo: 'U-2026-0002',
      fullNameAr: 'سارة عثمان محمد أحمد',
      fullNameEn: 'Sara Osman Mohamed Ahmed',
      status: 'ADMITTED',
      admittedOn: D(2026, 1, 2),
      programmeId: c.u.programmeIds.MBBS,
      batchId: c.u.batchId,
      admissionCategoryId: c.u.admissionCategories.GENERAL,
      nationalityId: c.u.nationalities.SD,
    });
    await registerStudent(c.registrar, {
      studentId: second.id,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      registrationDate: D(2026, 1, 20),
    });

    // The first student then leaves. `students.status` now says WITHDRAWN for
    // them, but they were active in January and the January roster must say so.
    await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 3, 10),
      reason: 'Personal circumstances',
      approvedById: c.dean.userId,
      postingDate: D(2026, 3, 10),
    });

    const januaryRoster = await cohortOn(c.registryOfficer, 'ACTIVE', D(2026, 1, 25));
    expect(januaryRoster.map((s) => s.studentNo).sort()).toEqual([
      'U-2026-0001',
      'U-2026-0002',
    ]);

    const aprilRoster = await cohortOn(c.registryOfficer, 'ACTIVE', D(2026, 4, 1));
    expect(aprilRoster.map((s) => s.studentNo)).toEqual(['U-2026-0002']);
  });
});

// ---------------------------------------------------------------------------
// Financial consequence — REQ-LIF-02, REQ-FEE-03
// ---------------------------------------------------------------------------

describe('each transition declares and carries out its financial consequence', () => {
  it('retains charges on dismissal — leaving does not forgive the debt', async () => {
    const c = await scene();
    const reg = await register(c);

    const result = await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'DISMISSED',
      effectiveDate: D(2026, 2, 20),
      reason: 'Academic dismissal, senate minute 7',
      approvedById: c.dean.userId,
    });

    expect(result.consequence).toBe('RETAIN_CHARGES');
    expect(result.reversalVoucherRef).toBeNull();

    const stored = await asSystem((tx) =>
      tx.semesterRegistration.findUniqueOrThrow({
        where: { id: reg.registrationId },
        select: { status: true },
      }),
    );
    expect(stored.status).toBe('REGISTERED');

    const live = await asSystem((tx) =>
      tx.studentCharge.count({ where: { studentId: c.studentId, reversedAt: null } }),
    );
    expect(live).toBe(2);
  });

  it('reverses the term in full on a deferral and carries the money forward', async () => {
    const c = await scene();
    const reg = await register(c);

    await takeReceipt(
      c.cashier,
      {
        studentId: c.studentId,
        docDate: D(2026, 1, 20),
        channel: 'CASH',
        amount: '200000.00',
      },
      'defer-receipt-1',
    );

    const result = await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'DEFERRED',
      effectiveDate: D(2026, 2, 10),
      reason: 'Medical deferral, certificate on file',
      approvedById: c.dean.userId,
    });

    expect(result.consequence).toBe('REVERSE_TERM_BILLING');
    expect(result.amountReversed).toBe('1050000.0000');
    expect(result.amountRefundable).toBe('0.0000');
    expect(result.reversalVoucherRef).toBeTruthy();

    const stored = await asSystem((tx) =>
      tx.semesterRegistration.findUniqueOrThrow({
        where: { id: reg.registrationId },
        select: { status: true, reversalHeaderId: true },
      }),
    );
    expect(stored.status).toBe('CANCELLED');
    expect(stored.reversalHeaderId).not.toBeNull();

    // The original voucher is stamped reversed — a linked reversal, not a
    // fresh pair of entries the way `frmTransferStudent` wrote them.
    const original = await asSystem((tx) =>
      tx.transactionHeader.findUniqueOrThrow({
        where: { id: reg.headerId! },
        select: { reversedAt: true },
      }),
    );
    expect(original.reversedAt).not.toBeNull();

    // The money paid is still the student's, and waits for their return.
    const position = await arrears(c.registryOfficer, c.studentId, D(2026, 2, 15));
    expect(position.outstanding).toBe('0.0000');
    expect(position.creditBalance).toBe('200000.0000');
  });

  it('applies the refund schedule on a withdrawal and re-bills what is retained', async () => {
    const c = await scene();
    await register(c);

    // Term 1 starts 1 January. Withdrawing on 20 January is day 19 — inside
    // the 28-day band, which refunds 50%.
    const result = await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 1, 20),
      reason: 'Family relocation',
      approvedById: c.dean.userId,
    });

    expect(result.consequence).toBe('APPLY_REFUND_POLICY');
    expect(result.amountReversed).toBe('1050000.0000');
    // Tuition is refundable at 50%; the registration fee is not refundable at
    // all, so it is retained in full.
    expect(result.amountRefundable).toBe('500000.0000');
    expect(result.amountRetained).toBe('550000.0000');
    expect(result.retentionVoucherRef).toBeTruthy();

    const position = await arrears(c.registryOfficer, c.studentId, D(2026, 1, 25));
    expect(position.outstanding).toBe('550000.0000');
  });

  it('refunds in full inside the first band and nothing past the last', async () => {
    const early = await scene();
    await register(early, D(2026, 1, 5));
    const insideFortnight = await changeStudentStatus(early.registryOfficer, {
      studentId: early.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 1, 10),
      reason: 'Changed mind',
      approvedById: early.dean.userId,
    });
    // Day 9: the 100% band. Only the non-refundable registration fee stays.
    expect(insideFortnight.amountRefundable).toBe('1000000.0000');
    expect(insideFortnight.amountRetained).toBe('50000.0000');

    const late = await scene();
    await register(late);
    const pastEveryBand = await changeStudentStatus(late.registryOfficer, {
      studentId: late.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 3, 20),
      reason: 'Left late in the term',
      approvedById: late.dean.userId,
      postingDate: D(2026, 3, 20),
    });
    expect(pastEveryBand.amountRefundable).toBe('0.0000');
    expect(pastEveryBand.amountRetained).toBe('1050000.0000');
  });

  it('records the refund election, and the credit balance is the liability', async () => {
    const c = await scene();
    await register(c);
    await takeReceipt(
      c.cashier,
      {
        studentId: c.studentId,
        docDate: D(2026, 1, 16),
        channel: 'CASH',
        amount: '1050000.00',
      },
      'wd-receipt-1',
    );

    const result = await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 1, 20),
      reason: 'Withdrawal, refund requested',
      approvedById: c.dean.userId,
      refundElection: 'REFUND',
    });

    expect(result.refundElection).toBe('REFUND');

    // 1,050,000 paid, 550,000 retained: 500,000 sits on the account as the
    // liability an A6 payment voucher will discharge.
    const position = await arrears(c.registryOfficer, c.studentId, D(2026, 1, 25));
    expect(position.creditBalance).toBe('500000.0000');
    expect(position.netDue).toBe('0.0000');
  });

  it('places a disciplinary hold as part of a suspension, and lifts it on reinstatement', async () => {
    const c = await scene();
    await register(c);

    const suspended = await changeStudentStatus(c.dean, {
      studentId: c.studentId,
      to: 'SUSPENDED',
      effectiveDate: D(2026, 2, 1),
      reason: 'Disciplinary panel, minute 12',
      approvedById: c.registryOfficer.userId,
    });
    expect(suspended.holdsPlaced).toBe(1);

    const open = await listHolds(c.bursar, c.studentId);
    expect(open).toHaveLength(1);
    expect(open[0].holdType).toBe('DISCIPLINARY');
    expect(open[0].blocksRegistration).toBe(true);

    // Lifted by somebody other than whoever imposed it — the database refuses
    // a self-clearance, so the registry officer does it, not the dean.
    const lifted = await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'ACTIVE',
      effectiveDate: D(2026, 3, 1),
      reason: 'Suspension served',
      approvedById: c.dean.userId,
    });
    expect(lifted.holdsCleared).toBe(1);
    expect(await listHolds(c.bursar, c.studentId)).toHaveLength(0);
  });

  it('unwinds nothing when there was nothing live to unwind', async () => {
    const c = await scene();
    await register(c);
    await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'DEFERRED',
      effectiveDate: D(2026, 2, 10),
      reason: 'First deferral',
      approvedById: c.dean.userId,
    });
    // Back, then straight out again with no registration in between.
    await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'ACTIVE',
      effectiveDate: D(2026, 2, 15),
      reason: 'Re-admitted',
      approvedById: c.dean.userId,
    });

    const again = await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 2, 20),
      reason: 'Left after all',
      approvedById: c.dean.userId,
    });
    expect(again.amountReversed).toBeNull();
    expect(again.reversalVoucherRef).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Holds — REQ-REG-06, and arrears as a control
// ---------------------------------------------------------------------------

describe('holds block registration', () => {
  it('refuses a registration while a hold stands, naming every reason', async () => {
    const c = await scene();
    await register(c);

    await placeHold(c.dean, {
      studentId: c.studentId,
      holdType: 'DISCIPLINARY',
      reason: 'Pending disciplinary hearing',
      effectiveFrom: D(2026, 1, 20),
    });
    await placeHold(c.bursar, {
      studentId: c.studentId,
      holdType: 'DOCUMENTARY',
      reason: 'Secondary certificate not yet verified',
      effectiveFrom: D(2026, 1, 20),
    });

    await expect(
      registerStudent(c.registrar, {
        studentId: c.studentId,
        academicTermId: c.u.termIds[2],
        levelYear: 1,
        registrationDate: D(2026, 2, 10),
      }),
    ).rejects.toThrow(RegistrationBlockedError);

    const blocks = await registrationBlocks(c.registryOfficer, c.studentId, D(2026, 2, 10));
    expect(blocks.map((b) => b.holdType).sort()).toEqual(['DISCIPLINARY', 'DOCUMENTARY']);
  });

  it('does not block on a hold that only warns', async () => {
    const c = await scene();
    await register(c);
    await placeHold(c.bursar, {
      studentId: c.studentId,
      holdType: 'DOCUMENTARY',
      reason: 'Passport copy requested',
      blocksRegistration: false,
      effectiveFrom: D(2026, 1, 20),
    });

    const second = await registerStudent(c.registrar, {
      studentId: c.studentId,
      academicTermId: c.u.termIds[2],
      levelYear: 1,
      registrationDate: D(2026, 2, 10),
    });
    expect(second.status).toBe('REGISTERED');
  });

  it('does not block before the hold takes effect', async () => {
    const c = await scene();
    await placeHold(c.bursar, {
      studentId: c.studentId,
      holdType: 'ACADEMIC',
      reason: 'Resit outstanding',
      effectiveFrom: D(2026, 2, 1),
    });

    const reg = await register(c, D(2026, 1, 15));
    expect(reg.status).toBe('REGISTERED');
  });

  it('blocks on overdue arrears — the report the legacy build never consulted', async () => {
    const c = await scene();
    await register(c);

    // A plan whose first instalment fell due in January and was never paid.
    await createInstalmentPlan(c.registryOfficer, {
      studentId: c.studentId,
      termLabel: 'First Term 2026',
      totalAmount: '1050000.00',
      instalments: [
        { dueDate: D(2026, 1, 20), amount: '600000.00' },
        { dueDate: D(2026, 4, 20), amount: '450000.00' },
      ],
    });

    const position = await arrears(c.registryOfficer, c.studentId, D(2026, 2, 25));
    expect(position.overdue).toBe('600000.0000');
    expect(position.daysOverdue).toBe(36);

    await expect(
      registerStudent(c.registrar, {
        studentId: c.studentId,
        academicTermId: c.u.termIds[2],
        levelYear: 1,
        registrationDate: D(2026, 2, 25),
      }),
    ).rejects.toThrow(/overdue/);
  });

  it('does not block inside the grace period, and stops blocking once paid', async () => {
    const c = await scene();
    await register(c);
    await createInstalmentPlan(c.registryOfficer, {
      studentId: c.studentId,
      termLabel: 'First Term 2026',
      totalAmount: '1050000.00',
      instalments: [
        { dueDate: D(2026, 1, 20), amount: '600000.00' },
        { dueDate: D(2026, 4, 20), amount: '450000.00' },
      ],
    });

    // Six days late, inside the tenant's 14-day grace period.
    const inGrace = await registrationBlocks(
      c.registryOfficer,
      c.studentId,
      D(2026, 1, 26),
    );
    expect(inGrace).toHaveLength(0);

    // And once the money arrives the derived hold is simply gone — nothing to
    // clear, because nothing was stored.
    await takeReceipt(
      c.cashier,
      {
        studentId: c.studentId,
        docDate: D(2026, 2, 20),
        channel: 'CASH',
        amount: '1050000.00',
      },
      'arrears-receipt-1',
    );
    const paid = await registrationBlocks(c.registryOfficer, c.studentId, D(2026, 2, 25));
    expect(paid).toHaveLength(0);
  });

  it('honours the tenant arrears threshold', async () => {
    const c = await scene();
    await register(c);
    await asSystem((tx) =>
      tx.tenant.update({
        where: { id: c.u.tenantId },
        data: { arrearsBlockThreshold: '900000' },
      }),
    );
    await createInstalmentPlan(c.registryOfficer, {
      studentId: c.studentId,
      termLabel: 'First Term 2026',
      totalAmount: '1050000.00',
      instalments: [
        { dueDate: D(2026, 1, 20), amount: '600000.00' },
        { dueDate: D(2026, 4, 20), amount: '450000.00' },
      ],
    });

    const blocks = await registrationBlocks(c.registryOfficer, c.studentId, D(2026, 2, 25));
    expect(blocks).toHaveLength(0);
  });
});

describe('who may clear a hold', () => {
  it('refuses the person who placed it', async () => {
    const c = await scene();
    const hold = await placeHold(c.dean, {
      studentId: c.studentId,
      holdType: 'DISCIPLINARY',
      reason: 'Pending hearing',
    });
    await expect(clearHold(c.dean, hold.id, 'Hearing concluded')).rejects.toThrow(
      /You placed this hold/,
    );
  });

  it('refuses anyone outside the named clearance role', async () => {
    const c = await scene();
    const deansRoleId = await asSystem(async (tx) => {
      const role = await tx.role.create({
        data: { tenantId: c.u.tenantId, name: 'Dean of Students', nameAr: 'عميد الطلاب' },
        select: { id: true },
      });
      await tx.userRole.create({ data: { userId: c.dean.userId, roleId: role.id } });
      return role.id;
    });

    const hold = await placeHold(c.bursar, {
      studentId: c.studentId,
      holdType: 'DISCIPLINARY',
      reason: 'Referred to the dean',
      clearanceRoleId: deansRoleId,
    });

    // The registry officer has no `hold.manage`; the bursar placed it; only
    // the dean, who holds the named role, may lift it.
    await expect(
      clearHold(c.registryOfficer, hold.id, 'Sorted it out'),
    ).rejects.toThrow();

    await clearHold(c.dean, hold.id, 'Panel found no case to answer');

    const cleared = await listHolds(c.bursar, c.studentId, { includeCleared: true });
    expect(cleared[0].clearedBy).toBe('dean');
    expect(cleared[0].clearanceNote).toBe('Panel found no case to answer');
  });

  it('requires a note saying what satisfied it', async () => {
    const c = await scene();
    const hold = await placeHold(c.dean, {
      studentId: c.studentId,
      holdType: 'ACADEMIC',
      reason: 'Resit outstanding',
    });
    await expect(clearHold(c.bursar, hold.id, '  ')).rejects.toThrow(HoldError);
  });

  it('refuses to delete a hold or reopen a cleared one', async () => {
    const c = await scene();
    const hold = await placeHold(c.dean, {
      studentId: c.studentId,
      holdType: 'ACADEMIC',
      reason: 'Resit outstanding',
    });

    await expect(
      asSystem((tx) => tx.hold.delete({ where: { id: hold.id } })),
    ).rejects.toThrow();

    await clearHold(c.bursar, hold.id, 'Resit passed');

    await expect(
      asSystem((tx) =>
        tx.hold.update({
          where: { id: hold.id },
          data: { clearedAt: null, clearedById: null },
        }),
      ),
    ).rejects.toThrow();
  });

  it('refuses a self-clearance written straight to the database', async () => {
    const c = await scene();
    const hold = await placeHold(c.dean, {
      studentId: c.studentId,
      holdType: 'FINANCIAL',
      reason: 'Arrears, manually imposed',
    });
    await expect(
      asSystem((tx) =>
        tx.hold.update({
          where: { id: hold.id },
          data: { clearedById: c.dean.userId, clearedAt: new Date() },
        }),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Programme transfer — REQ-REG-04
// ---------------------------------------------------------------------------

describe('programme transfer', () => {
  it('reverses the old programme by linked reversal and bills the new from the matrix', async () => {
    const c = await scene();
    const original = await register(c);
    expect(original.gross).toBe('1050000.0000');

    const result = await transferProgramme(c.transferrer, {
      studentId: c.studentId,
      toProgrammeId: c.u.programmeIds.NURS,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      effectiveDate: D(2026, 2, 10),
      reason: 'Transfer to Nursing, faculty board approved',
      approvedById: c.dean.userId,
    });

    expect(result.reversedRegistrationNo).toBe(original.registrationNo);
    expect(result.reversalVoucherRef).toBeTruthy();
    expect(result.amountReversed).toBe('1050000.0000');

    // Billed from the Nursing schedule — 600,000 tuition — not from a text
    // box. The one-off registration fee is charged again *because it was
    // reversed*: the student was credited the 50,000 a moment earlier, so
    // across the transfer they pay it exactly once. Skipping it here would
    // credit it back and never re-bill it, which is the opposite error.
    expect(result.newRegistration.gross).toBe('650000.0000');
    expect(result.newRegistration.lines.map((l) => l.feeItemCode)).toEqual([
      'TUITION',
      'REGISTRATION',
    ]);

    const original2 = await asSystem((tx) =>
      tx.transactionHeader.findUniqueOrThrow({
        where: { id: original.headerId! },
        select: { reversedAt: true },
      }),
    );
    expect(original2.reversedAt).not.toBeNull();

    // The old registration is CANCELLED, not deleted. `frmTransferStudent`
    // ran `Delete from Registrationees`.
    const old = await asSystem((tx) =>
      tx.semesterRegistration.findUniqueOrThrow({
        where: { id: original.registrationId },
        select: { status: true, programmeId: true },
      }),
    );
    expect(old.status).toBe('CANCELLED');
    expect(old.programmeId).toBe(c.u.programmeIds.MBBS);
  });

  it('keeps the old programme readable for the dates it applied', async () => {
    const c = await scene();
    await register(c);
    await transferProgramme(c.transferrer, {
      studentId: c.studentId,
      toProgrammeId: c.u.programmeIds.NURS,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      effectiveDate: D(2026, 2, 10),
      reason: 'Transfer to Nursing',
      approvedById: c.dean.userId,
    });

    const before = await asTenant(c.u.tenantId, (tx) =>
      programmeOn(tx, c.u.tenantId, c.studentId, D(2026, 1, 15)),
    );
    const after = await asTenant(c.u.tenantId, (tx) =>
      programmeOn(tx, c.u.tenantId, c.studentId, D(2026, 3, 1)),
    );

    expect(before).toBe(c.u.programmeIds.MBBS);
    expect(after).toBe(c.u.programmeIds.NURS);

    const history = await programmeHistory(c.registryOfficer, c.studentId);
    expect(history).toHaveLength(1);
    expect(history[0].fromProgrammeName).toBe('Bachelor of Medicine and Surgery');
    expect(history[0].toProgrammeName).toBe('Bachelor of Nursing');
    expect(history[0].reversedRegistrationNo).toBe('REG-AY-2026-00001');
    expect(history[0].newRegistrationNo).toBe('REG-AY-2026-00002');
    expect(history[0].approvedBy).toBe('dean');
  });

  it('bills the ledger for the programme the registration names', async () => {
    // The legacy handler posted the new programme's revenue against
    // `@Acc4 = Me.txtProgram.Text` — the programme being LEFT — while writing
    // `CombProgram.SelectedItem` on the registration row.
    const c = await scene();
    await register(c);
    const result = await transferProgramme(c.transferrer, {
      studentId: c.studentId,
      toProgrammeId: c.u.programmeIds.NURS,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      effectiveDate: D(2026, 2, 10),
      reason: 'Transfer to Nursing',
      approvedById: c.dean.userId,
    });

    const newReg = await asSystem((tx) =>
      tx.semesterRegistration.findUniqueOrThrow({
        where: { id: result.newRegistration.registrationId },
        select: { programmeId: true, feeScheduleId: true, netAmount: true },
      }),
    );
    const schedule = await asSystem((tx) =>
      tx.feeSchedule.findUniqueOrThrow({
        where: { id: newReg.feeScheduleId },
        select: { programmeId: true },
      }),
    );

    expect(newReg.programmeId).toBe(c.u.programmeIds.NURS);
    // The schedule the ledger billed against is the one belonging to the
    // programme the registration names. They cannot disagree.
    expect(schedule.programmeId).toBe(newReg.programmeId);
    expect(newReg.netAmount.toFixed(4)).toBe('650000.0000');
  });

  it('refuses a transfer to the programme the student is already on', async () => {
    const c = await scene();
    await register(c);
    await expect(
      transferProgramme(c.transferrer, {
        studentId: c.studentId,
        toProgrammeId: c.u.programmeIds.MBBS,
        academicTermId: c.u.termIds[1],
        levelYear: 1,
        reason: 'No-op transfer',
      }),
    ).rejects.toThrow(/already on that programme/);
  });

  it('requires a reason', async () => {
    const c = await scene();
    await register(c);
    await expect(
      transferProgramme(c.transferrer, {
        studentId: c.studentId,
        toProgrammeId: c.u.programmeIds.NURS,
        academicTermId: c.u.termIds[1],
        levelYear: 1,
        reason: '  ',
      }),
    ).rejects.toThrow(TransferError);
  });

  it('refuses to edit or delete a recorded transfer', async () => {
    const c = await scene();
    await register(c);
    const result = await transferProgramme(c.transferrer, {
      studentId: c.studentId,
      toProgrammeId: c.u.programmeIds.NURS,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      effectiveDate: D(2026, 2, 10),
      reason: 'Transfer to Nursing',
    });

    await expect(
      asSystem((tx) =>
        tx.studentProgrammeHistory.delete({ where: { id: result.historyId } }),
      ),
    ).rejects.toThrow();
    await expect(
      asSystem((tx) =>
        tx.studentProgrammeHistory.update({
          where: { id: result.historyId },
          data: { reason: 'Rewritten' },
        }),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Refund policy — REQ-FEE-03
// ---------------------------------------------------------------------------

describe('refund policy', () => {
  it('ships a standard schedule and publishes a replacement', async () => {
    const c = await scene();
    const reader = await makePrincipal(
      c.u.tenantId,
      ['feematrix.manage', 'feematrix.read'],
      { name: 'policy' },
    );

    const shipped = await activeRefundPolicy(reader);
    expect(shipped?.code).toBe('STANDARD');
    expect(shipped?.bands).toEqual([
      { withinDays: 14, refundablePct: '100.0000' },
      { withinDays: 28, refundablePct: '50.0000' },
    ]);

    await setRefundPolicy(reader, {
      code: 'REVISED',
      nameAr: 'جدول معدل',
      nameEn: 'Revised schedule',
      bands: [
        { withinDays: 7, refundablePct: '90' },
        { withinDays: 21, refundablePct: '40' },
      ],
    });

    const active = await activeRefundPolicy(reader);
    expect(active?.code).toBe('REVISED');

    // Exactly one active policy — two would give "how much comes back" two
    // answers, the same defect as two approved fee schedules covering a day.
    const count = await asSystem((tx) =>
      tx.refundPolicy.count({ where: { tenantId: c.u.tenantId, isActive: true } }),
    );
    expect(count).toBe(1);
  });

  it('refuses a schedule that becomes more generous the longer a student stays', async () => {
    const c = await scene();
    const admin = await makePrincipal(c.u.tenantId, ['feematrix.manage'], { name: 'pol2' });
    await expect(
      setRefundPolicy(admin, {
        code: 'BACKWARDS',
        nameAr: 'معكوس',
        nameEn: 'Backwards',
        bands: [
          { withinDays: 7, refundablePct: '25' },
          { withinDays: 30, refundablePct: '75' },
        ],
      }),
    ).rejects.toThrow(/more generous/);
  });

  it('refuses two bands ending on the same day', async () => {
    const c = await scene();
    const admin = await makePrincipal(c.u.tenantId, ['feematrix.manage'], { name: 'pol3' });
    await expect(
      setRefundPolicy(admin, {
        code: 'DUP',
        nameAr: 'مكرر',
        nameEn: 'Duplicate',
        bands: [
          { withinDays: 14, refundablePct: '100' },
          { withinDays: 14, refundablePct: '50' },
        ],
      }),
    ).rejects.toThrow(RefundPolicyError);
  });

  it('refunds nothing where no policy is configured', async () => {
    const c = await scene();
    await register(c);
    // Deleting the policy takes its bands with it. Deleting the bands alone
    // is refused — an active policy with no bands looks exactly like a policy
    // and refunds nothing to everybody.
    await expect(
      asSystem((tx) =>
        tx.refundPolicyBand.deleteMany({ where: { tenantId: c.u.tenantId } }),
      ),
    ).rejects.toThrow();
    await asSystem((tx) =>
      tx.refundPolicy.deleteMany({ where: { tenantId: c.u.tenantId } }),
    );

    const result = await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 1, 20),
      reason: 'Withdrawal with no policy on file',
      approvedById: c.dean.userId,
    });

    // Conservative, and visible on the first withdrawal rather than giving a
    // term's fees away because a table was empty.
    expect(result.amountRefundable).toBe('0.0000');
    expect(result.amountRetained).toBe('1050000.0000');
  });
});

// ---------------------------------------------------------------------------
// Isolation and the sub-ledger tie-out
// ---------------------------------------------------------------------------

describe('the ledger still agrees with itself', () => {
  it('ties the sub-ledger to the control account through a withdrawal', async () => {
    const c = await scene();
    await register(c);
    await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 1, 20),
      reason: 'Withdrawal',
      approvedById: c.dean.userId,
    });

    const subledger = await asSystem(async (tx) => {
      const rows = await tx.studentCharge.findMany({
        where: { tenantId: c.u.tenantId, reversedAt: null },
        select: { netAmount: true, settledAmount: true },
      });
      return rows.reduce((t, r) => t + Number(r.netAmount) - Number(r.settledAmount), 0);
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
    expect(control).toBeCloseTo(550000, 4);
  });

  it('keeps holds and history inside their own tenant', async () => {
    const a = await scene();
    const b = await scene();
    const hold = await placeHold(a.dean, {
      studentId: a.studentId,
      holdType: 'ACADEMIC',
      reason: 'Resit outstanding',
    });

    const seenFromB = await asTenant(b.u.tenantId, (tx) =>
      tx.hold.findMany({ select: { id: true } }),
    );
    expect(seenFromB.map((h) => h.id)).not.toContain(hold.id);

    const historyFromB = await asTenant(b.u.tenantId, (tx) =>
      tx.studentStatusHistory.findMany({ where: { studentId: a.studentId } }),
    );
    expect(historyFromB).toHaveLength(0);
  });
});
