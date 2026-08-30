import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { reverseChargesInTx } from '@/lib/billing/charge';
import { toDateOnly } from '@/lib/ledger/period';
import { registerStudent, type RegisteredResult } from '@/lib/registration/engine';
import type { Money } from '@/lib/money';

/**
 * Programme transfer (SRS REQ-REG-04, Track B5).
 *
 * ## What `frmTransferStudent.vb` does
 *
 * ```vb
 * Delete from Registrationees where StudentIndex=.. and Program=.. and AcademicYear=..
 * update StudentsProfilees set Program=@Program Where StudentIndex=@StudentIndex
 * ```
 * (lines 183-190)
 *
 * The registration under the old programme is **deleted**, and the programme
 * on the student row is overwritten with no effective date and no history. So
 * the evidence that the student was ever on the old programme is gone, and a
 * prior year's record read back through the student reports the programme
 * they transferred *to*.
 *
 * Four more, in the same handler:
 *
 *   · **The new programme's revenue is credited to the old programme.** Every
 *     posting in the second half uses `@Acc4 = Me.txtProgram.Text.Trim` — the
 *     read-only text box holding the programme being left — while the
 *     registration row it writes uses `Me.CombProgram.SelectedItem`, the
 *     programme being joined (lines 245-277 against 232-241). The registration
 *     says one programme and the ledger says the other.
 *
 *   · **The new programme's registration fee is billed but never recorded.**
 *     The insert names five columns —
 *     `(StudentIndex,StudentName,Program,AcademicYear,TuitionFees1)` — and the
 *     handler then adds a sixth parameter, `@RegsFees`, that no column
 *     receives (lines 232-241). The ledger is debited for it regardless.
 *
 *   · **The amount reversed is whatever is in the text boxes**, and one of
 *     them is a string literal: `Me.txtRegsFees.Text = "1,030.00"`, hardcoded
 *     in `FillStudDetails` and written a second time in `FillStdfees` as
 *     `"1,030,00"` — a comma where the decimal point should be. Which of the
 *     two runs depends on whether the user pressed Enter in the index box or
 *     picked from the search dialog.
 *
 *   · **A student with more than one registration transfers on an arbitrary
 *     one.** Both loaders run `While reader.Read` over every registration the
 *     student has and assign each row to the same text boxes, so whichever
 *     came last wins — the same defect the B3 medical form had.
 *
 * ## What this does instead
 *
 * One transaction: reverse the old programme's billing by **linked reversal**,
 * record the move with its effective date, and raise the new programme's
 * billing through the B4 registration engine — which prices it from the fee
 * matrix version in force, not from a text box.
 */

export class TransferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TransferError';
  }
}

export interface TransferInput {
  studentId: string;
  toProgrammeId: string;
  /** The term the new programme's billing starts from. */
  academicTermId: string;
  /** Year of study in the new programme. Rarely the same as the old one. */
  levelYear: number;
  /** Defaults to today. */
  effectiveDate?: Date;
  reason: string;
  approvedById?: string | null;
  /**
   * Post the reversal into this date when the effective date falls in a
   * closed period. The academic effective date is unchanged.
   */
  postingDate?: Date;
  /** Optional items to carry into the new programme's registration. */
  optionalFeeItemIds?: string[];
}

export interface TransferResult {
  historyId: string;
  studentNo: string;
  fromProgrammeName: string | null;
  toProgrammeName: string;
  effectiveDate: string;
  /** Null when the student had nothing live to unwind. */
  reversedRegistrationNo: string | null;
  reversalVoucherRef: string | null;
  amountReversed: string | null;
  /** The registration raised under the new programme. */
  newRegistration: RegisteredResult;
}

/**
 * Move a student between programmes.
 *
 * The order matters and is not an implementation detail: the old programme's
 * billing is reversed and the student's programme is moved **before** the new
 * registration is raised, because the registration engine prices from the
 * student's placement. Raising first would bill the new term against the fee
 * schedule of the programme being left — which is the mirror image of the
 * legacy defect, and just as wrong.
 */
export async function transferProgramme(
  principal: Principal,
  input: TransferInput,
  idempotencyKey?: string,
): Promise<TransferResult> {
  requirePermission(principal, 'registration.transfer');

  const reason = input.reason?.trim();
  if (!reason) {
    throw new TransferError(
      'A transfer needs a stated reason. It reverses one programme’s billing and raises ' +
        'another’s, and a reversal with no reason is indistinguishable from a mistake.',
    );
  }

  const effectiveDate = toDateOnly(input.effectiveDate ?? new Date());

  const prepared = await withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: {
        id: true,
        tenantId: true,
        studentNo: true,
        status: true,
        isActive: true,
        programmeId: true,
        programme: { select: { id: true, nameEn: true } },
      },
    });
    if (!student || student.tenantId !== principal.tenantId) {
      throw new TransferError('That student does not belong to this university.');
    }
    if (!student.isActive) {
      throw new TransferError(
        `${student.studentNo} is not an active record and cannot be transferred.`,
      );
    }
    if (student.programmeId === input.toProgrammeId) {
      throw new TransferError(
        `${student.studentNo} is already on that programme. A transfer that moves nobody ` +
          `still reverses and re-raises a term’s billing.`,
      );
    }

    const target = await tx.programme.findFirst({
      where: { id: input.toProgrammeId, tenantId: principal.tenantId },
      select: { id: true, nameEn: true, isActive: true },
    });
    if (!target) {
      throw new TransferError('That programme does not belong to this university.');
    }
    if (!target.isActive) {
      throw new TransferError(
        `${target.nameEn} is deactivated. Transferring a student into a programme nobody ` +
          `can be admitted to is almost always a mistyped programme.`,
      );
    }
    if (input.approvedById) {
      const approver = await tx.user.findFirst({
        where: { id: input.approvedById, tenantId: principal.tenantId },
        select: { id: true },
      });
      if (!approver) {
        throw new TransferError('That approver does not belong to this university.');
      }
    }

    // The live registration for the term being transferred from — chosen by
    // the term, not by whichever row a `While reader.Read` loop left in a
    // text box.
    const registration = await tx.semesterRegistration.findFirst({
      where: {
        tenantId: principal.tenantId,
        studentId: student.id,
        academicTermId: input.academicTermId,
        status: 'REGISTERED',
      },
      select: {
        id: true,
        registrationNo: true,
        netAmount: true,
        postedHeaderId: true,
        academicTerm: { select: { nameEn: true } },
        lines: { select: { chargeId: true } },
      },
    });

    let reversalHeaderId: string | null = null;
    let reversalVoucherRef: string | null = null;
    let amountReversed: Money | null = null;

    if (registration) {
      const chargeIds = registration.lines
        .map((l) => l.chargeId)
        .filter((id): id is string => id !== null);

      if (chargeIds.length > 0) {
        const reversed = await reverseChargesInTx(tx, principal, chargeIds, reason, {
          reversalDate: toDateOnly(input.postingDate ?? effectiveDate),
          reversesHeaderId: registration.postedHeaderId,
          description:
            `Programme transfer — ${student.studentNo}, ` +
            `${student.programme?.nameEn ?? 'unplaced'} → ${target.nameEn}: ${reason}`,
        });
        reversalHeaderId = reversed.headerId;
        reversalVoucherRef = reversed.voucherRef;
        amountReversed = registration.netAmount;
      }

      await tx.semesterRegistration.update({
        where: { id: registration.id },
        data: {
          status: 'CANCELLED',
          reversalHeaderId,
          cancelledById: principal.userId,
          cancelledAt: new Date(),
          cancellationReason: `Programme transfer: ${reason}`,
        },
      });

      await tx.instalmentPlan.updateMany({
        where: {
          tenantId: principal.tenantId,
          studentId: student.id,
          termLabel: registration.academicTerm.nameEn,
          isActive: true,
        },
        data: { isActive: false },
      });
    }

    // Effective-dated, and the student row moves with it. The history row is
    // what makes a prior year's record still readable as the programme it was
    // actually billed under.
    const history = await tx.studentProgrammeHistory.create({
      data: {
        tenantId: principal.tenantId,
        studentId: student.id,
        fromProgrammeId: student.programmeId,
        toProgrammeId: target.id,
        effectiveDate,
        academicTermId: input.academicTermId,
        reason,
        reversedRegistrationId: registration?.id ?? null,
        approvedById: input.approvedById ?? null,
        createdById: principal.userId,
      },
      select: { id: true },
    });

    await tx.student.update({
      where: { id: student.id },
      data: { programmeId: target.id },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'student.programme',
      resourceId: student.id,
      before: { programme: student.programme?.nameEn ?? null },
      after: {
        studentNo: student.studentNo,
        programme: target.nameEn,
        effectiveDate: iso(effectiveDate),
        reason,
        reversedRegistrationNo: registration?.registrationNo ?? null,
        reversalVoucherRef,
        amountReversed: amountReversed?.toFixed(4) ?? null,
      },
    });

    return {
      historyId: history.id,
      studentId: student.id,
      studentNo: student.studentNo,
      fromProgrammeName: student.programme?.nameEn ?? null,
      toProgrammeName: target.nameEn,
      reversedRegistrationNo: registration?.registrationNo ?? null,
      reversalVoucherRef,
      amountReversed: amountReversed?.toFixed(4) ?? null,
    };
  });

  // Raised in its own transaction, through the registration engine, so the new
  // programme is billed by exactly the path every other registration takes:
  // the fee matrix version in force on the day, the posting engine, the
  // idempotency key, the closed-period refusal. Nothing about a transfer
  // deserves its own billing code, and the legacy screen having its own is why
  // its ledger and its registration disagree.
  const raised = await registerStudent(
    principal,
    {
      studentId: prepared.studentId,
      academicTermId: input.academicTermId,
      levelYear: input.levelYear,
      registrationDate: input.postingDate ?? effectiveDate,
      optionalFeeItemIds: input.optionalFeeItemIds,
    },
    idempotencyKey,
  );

  await withTenant(principal.tenantId, (tx) =>
    tx.studentProgrammeHistory.update({
      where: { id: prepared.historyId },
      data: { newRegistrationId: raised.registrationId },
    }),
  );

  return {
    historyId: prepared.historyId,
    studentNo: prepared.studentNo,
    fromProgrammeName: prepared.fromProgrammeName,
    toProgrammeName: prepared.toProgrammeName,
    effectiveDate: iso(effectiveDate),
    reversedRegistrationNo: prepared.reversedRegistrationNo,
    reversalVoucherRef: prepared.reversalVoucherRef,
    amountReversed: prepared.amountReversed,
    newRegistration: raised,
  };
}

export interface ProgrammeRecord {
  id: string;
  fromProgrammeName: string | null;
  toProgrammeName: string;
  effectiveDate: string;
  reason: string;
  reversedRegistrationNo: string | null;
  newRegistrationNo: string | null;
  approvedBy: string | null;
  recordedBy: string | null;
}

export async function programmeHistory(
  principal: Principal,
  studentId: string,
): Promise<ProgrammeRecord[]> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.studentProgrammeHistory.findMany({
      where: { tenantId: principal.tenantId, studentId },
      orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        effectiveDate: true,
        reason: true,
        fromProgramme: { select: { nameEn: true } },
        toProgramme: { select: { nameEn: true } },
        reversedRegistration: { select: { registrationNo: true } },
        newRegistration: { select: { registrationNo: true } },
        approvedBy: { select: { fullName: true } },
        createdBy: { select: { fullName: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      fromProgrammeName: r.fromProgramme?.nameEn ?? null,
      toProgrammeName: r.toProgramme.nameEn,
      effectiveDate: iso(r.effectiveDate),
      reason: r.reason,
      reversedRegistrationNo: r.reversedRegistration?.registrationNo ?? null,
      newRegistrationNo: r.newRegistration?.registrationNo ?? null,
      approvedBy: r.approvedBy?.fullName ?? null,
      recordedBy: r.createdBy?.fullName ?? null,
    }));
  });
}

/**
 * Which programme this student was on for a given day.
 *
 * The question `update StudentsProfilees set Program=@Program` makes
 * unanswerable. Falls back to the student's current programme for dates
 * before any recorded transfer.
 */
export async function programmeOn(
  tx: Tx,
  tenantId: string,
  studentId: string,
  on: Date,
): Promise<string | null> {
  const row = await tx.studentProgrammeHistory.findFirst({
    where: { tenantId, studentId, effectiveDate: { lte: toDateOnly(on) } },
    orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    select: { toProgrammeId: true, fromProgrammeId: true },
  });
  if (row) return row.toProgrammeId;

  const earliest = await tx.studentProgrammeHistory.findFirst({
    where: { tenantId, studentId },
    orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
    select: { fromProgrammeId: true },
  });
  if (earliest) return earliest.fromProgrammeId;

  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { programmeId: true },
  });
  return student?.programmeId ?? null;
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
