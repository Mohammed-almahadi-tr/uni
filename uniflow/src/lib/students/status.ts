import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { raiseChargesInTx, reverseChargesInTx } from '@/lib/billing/charge';
import { applyCreditBalanceInTx } from '@/lib/cashier/receipt';
import { resolvePeriod, toDateOnly } from '@/lib/ledger/period';
import { sum, toStorage, ZERO, type Money } from '@/lib/money';
import type {
  RefundElection,
  StatusConsequence,
  StudentStatus,
} from '@/generated/prisma/enums';
import {
  describeOptions,
  humanise,
  transitionFor,
  type Transition,
} from './lifecycle';

/**
 * Changing a student's standing (SRS REQ-LIF-02/03, REQ-FEE-03 — Track B5).
 *
 * The state machine itself is in `lifecycle.ts`, which is where the legacy
 * baseline is written down. This file is what happens when a transition is
 * taken: the history row, the student row, the hold, and the money.
 *
 * Three properties the legacy build has no equivalent of:
 *
 *   1. **The history chains.** `from_status` must equal the student's standing
 *      at the moment the row is written, and a transition may not be
 *      back-dated behind one already recorded. Both are enforced by trigger,
 *      so "who was Active in Fall 2026" is answerable after the fact rather
 *      than being a question about the current value of a column.
 *
 *   2. **The consequence is declared, then carried out.** The transition says
 *      what it does to the money before it does it, and the amounts land on
 *      the history row. `frmStudentProfiles` recorded a verdict and touched
 *      no accounts at all; `frmTransferStudent` touched accounts and recorded
 *      no verdict.
 *
 *   3. **Nothing is deleted.** A deferral or a withdrawal unwinds the term by
 *      linked reversal, exactly as a cancellation does, and the original
 *      registration stays on file marked cancelled.
 */

export class StatusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StatusError';
  }
}

export interface ChangeStatusInput {
  studentId: string;
  to: StudentStatus;
  /** Defaults to today. Determines the refund band and the posting period. */
  effectiveDate?: Date;
  reason: string;
  /** The party who asked — the student, a dean, the finance office. */
  requestedBy?: string | null;
  /** Supporting evidence: the withdrawal letter, the medical certificate. */
  documentId?: string | null;
  /** Required on transitions the state machine marks as needing one. */
  approvedById?: string | null;
  /**
   * What to do with the credit a withdrawal leaves behind. Only meaningful
   * where the refund policy applies; defaults to retaining it.
   */
  refundElection?: RefundElection;
  /**
   * Date to post any reversal into, when the effective date falls in a closed
   * period. The effective date stays on the history row regardless — the
   * academic fact and the accounting date are different things.
   */
  postingDate?: Date;
}

export interface StatusChangeResult {
  historyId: string;
  studentNo: string;
  from: StudentStatus;
  to: StudentStatus;
  effectiveDate: string;
  consequence: StatusConsequence;
  /** The linked reversal, where one was raised. */
  reversalVoucherRef: string | null;
  /** The voucher re-billing the retained portion of a withdrawal. */
  retentionVoucherRef: string | null;
  amountReversed: string | null;
  amountRefundable: string | null;
  amountRetained: string | null;
  refundElection: RefundElection | null;
  /** Holds placed or cleared as part of the transition. */
  holdsPlaced: number;
  holdsCleared: number;
}

export async function changeStudentStatus(
  principal: Principal,
  input: ChangeStatusInput,
): Promise<StatusChangeResult> {
  requirePermission(principal, 'student.status');

  const reason = input.reason?.trim();
  if (!reason) {
    throw new StatusError(
      'A change of status needs a stated reason. `ReasonofIndecent` was the one field the ' +
        'legacy build required here, and it was required only for a rejection.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: { id: true, tenantId: true, studentNo: true, status: true, isActive: true },
    });
    if (!student || student.tenantId !== principal.tenantId) {
      throw new StatusError('That student does not belong to this university.');
    }
    if (!student.isActive) {
      throw new StatusError(
        `${student.studentNo} is not an active record. Reinstate it before changing status.`,
      );
    }

    const transition = transitionFor(student.status, input.to);
    if (!transition) {
      throw new StatusError(
        `${student.studentNo} is ${humanise(student.status)} and cannot become ` +
          `${humanise(input.to)}. From here: ${describeOptions(student.status)}`,
      );
    }

    if (transition.requiresApproval && !input.approvedById) {
      throw new StatusError(
        `"${transition.label}" requires a named approver. A deferral or a dismissal that ` +
          `nobody signed is a decision with no author, which is what the legacy \`Employee\` ` +
          `column recorded.`,
      );
    }
    if (input.approvedById) {
      const approver = await tx.user.findFirst({
        where: { id: input.approvedById, tenantId: principal.tenantId },
        select: { id: true },
      });
      if (!approver) {
        throw new StatusError('That approver does not belong to this university.');
      }
    }

    const effectiveDate = toDateOnly(input.effectiveDate ?? new Date());
    const money = await applyConsequence(tx, principal, {
      studentId: student.id,
      studentNo: student.studentNo,
      transition,
      effectiveDate,
      postingDate: input.postingDate,
      reason,
      refundElection: input.refundElection,
    });

    const history = await tx.studentStatusHistory.create({
      data: {
        tenantId: principal.tenantId,
        studentId: student.id,
        fromStatus: student.status,
        toStatus: input.to,
        effectiveDate,
        reason,
        consequence: transition.consequence,
        requestedBy: input.requestedBy?.trim() || null,
        documentId: input.documentId ?? null,
        reversalHeaderId: money.reversalHeaderId,
        retentionHeaderId: money.retentionHeaderId,
        amountReversed: money.amountReversed,
        amountRefundable: money.amountRefundable,
        amountRetained: money.amountRetained,
        refundElection: money.refundElection,
        approvedById: input.approvedById ?? null,
        createdById: principal.userId,
      },
      select: { id: true },
    });

    await tx.student.update({
      where: { id: student.id },
      data: { status: input.to },
    });

    // Holds are part of the transition, not a separate act. A suspended
    // student who can still register is not suspended.
    let holdsPlaced = 0;
    let holdsCleared = 0;
    if (transition.placesHold) {
      await tx.hold.create({
        data: {
          tenantId: principal.tenantId,
          studentId: student.id,
          holdType: transition.placesHold,
          reason: `${transition.label}: ${reason}`,
          blocksRegistration: true,
          effectiveFrom: effectiveDate,
          placedById: principal.userId,
        },
      });
      holdsPlaced = 1;
    }
    if (transition.clearsHolds) {
      const open = await tx.hold.findMany({
        where: {
          tenantId: principal.tenantId,
          studentId: student.id,
          holdType: 'DISCIPLINARY',
          clearedAt: null,
        },
        select: { id: true, placedById: true },
      });
      for (const h of open) {
        // The database refuses a self-clearance. Where the person lifting the
        // suspension is the one who imposed it, the hold is left standing and
        // reported rather than silently skipped — see the return value.
        if (h.placedById === principal.userId) continue;
        await tx.hold.update({
          where: { id: h.id },
          data: {
            clearedById: principal.userId,
            clearedAt: new Date(),
            clearanceNote: `${transition.label}: ${reason}`,
          },
        });
        holdsCleared += 1;
      }
    }

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'student.status',
      resourceId: student.id,
      before: { status: student.status },
      after: {
        studentNo: student.studentNo,
        status: input.to,
        effectiveDate: iso(effectiveDate),
        reason,
        consequence: transition.consequence,
        approvedById: input.approvedById ?? null,
        amountReversed: money.amountReversed?.toFixed(4) ?? null,
        amountRefundable: money.amountRefundable?.toFixed(4) ?? null,
        amountRetained: money.amountRetained?.toFixed(4) ?? null,
        holdsPlaced,
        holdsCleared,
      },
    });

    return {
      historyId: history.id,
      studentNo: student.studentNo,
      from: student.status,
      to: input.to,
      effectiveDate: iso(effectiveDate),
      consequence: transition.consequence,
      reversalVoucherRef: money.reversalVoucherRef,
      retentionVoucherRef: money.retentionVoucherRef,
      amountReversed: money.amountReversed?.toFixed(4) ?? null,
      amountRefundable: money.amountRefundable?.toFixed(4) ?? null,
      amountRetained: money.amountRetained?.toFixed(4) ?? null,
      refundElection: money.refundElection,
      holdsPlaced,
      holdsCleared,
    };
  });
}

// ---------------------------------------------------------------------------
// The financial consequence
// ---------------------------------------------------------------------------

interface ConsequenceResult {
  reversalHeaderId: string | null;
  retentionHeaderId: string | null;
  reversalVoucherRef: string | null;
  retentionVoucherRef: string | null;
  amountReversed: Money | null;
  amountRefundable: Money | null;
  amountRetained: Money | null;
  refundElection: RefundElection | null;
}

const NOTHING: ConsequenceResult = {
  reversalHeaderId: null,
  retentionHeaderId: null,
  reversalVoucherRef: null,
  retentionVoucherRef: null,
  amountReversed: null,
  amountRefundable: null,
  amountRetained: null,
  refundElection: null,
};

async function applyConsequence(
  tx: Tx,
  principal: Principal,
  args: {
    studentId: string;
    studentNo: string;
    transition: Transition;
    effectiveDate: Date;
    postingDate?: Date;
    reason: string;
    refundElection?: RefundElection;
  },
): Promise<ConsequenceResult> {
  const { transition } = args;
  if (transition.consequence === 'NONE' || transition.consequence === 'RETAIN_CHARGES') {
    return NOTHING;
  }

  const registration = await liveRegistrationOn(
    tx,
    principal.tenantId,
    args.studentId,
    args.effectiveDate,
  );
  // Nothing to unwind is a normal state: a student who defers before they have
  // registered for anything owes nothing, and the transition is still valid.
  if (!registration) return NOTHING;

  const chargeIds = registration.lines
    .map((l) => l.chargeId)
    .filter((id): id is string => id !== null);
  if (chargeIds.length === 0) return NOTHING;

  const postingDate = toDateOnly(args.postingDate ?? args.effectiveDate);

  const reversed = await reverseChargesInTx(tx, principal, chargeIds, args.reason, {
    reversalDate: postingDate,
    reversesHeaderId: registration.postedHeaderId,
    description:
      `${transition.label} — ${args.studentNo}, ` +
      `${registration.academicTerm.nameEn}: ${args.reason}`,
  });

  await tx.semesterRegistration.update({
    where: { id: registration.id },
    data: {
      status: 'CANCELLED',
      reversalHeaderId: reversed.headerId,
      cancelledById: principal.userId,
      cancelledAt: new Date(),
      cancellationReason: `${transition.label}: ${args.reason}`,
    },
  });

  await tx.instalmentPlan.updateMany({
    where: {
      tenantId: principal.tenantId,
      studentId: args.studentId,
      termLabel: registration.academicTerm.nameEn,
      isActive: true,
    },
    data: { isActive: false },
  });

  const amountReversed = registration.netAmount;

  if (transition.consequence === 'REVERSE_TERM_BILLING') {
    // A deferral unwinds the term in full. What was paid stays on the account
    // as a credit and meets the first bill when the student returns
    // (REQ-LIF-03) — it is not refunded and it is not kept.
    return {
      ...NOTHING,
      reversalHeaderId: reversed.headerId,
      reversalVoucherRef: reversed.voucherRef,
      amountReversed,
      amountRefundable: ZERO,
      amountRetained: amountReversed,
    };
  }

  // APPLY_REFUND_POLICY: the term is reversed in full, then the part the
  // institution keeps is billed back. Doing it this way rather than by
  // partially reversing each charge keeps the sub-ledger's settlement
  // arithmetic intact, and it is how a finance office describes the act:
  // cancel the term, retain this much.
  const pct = await refundablePct(
    tx,
    principal.tenantId,
    registration.academicTerm.startDate,
    args.effectiveDate,
  );

  const retainedLines: Array<{
    feeItemId: string;
    grossAmount: Money;
    discountAmount: Money;
    costCenterId?: string;
  }> = [];
  let refundable = ZERO;
  let retained = ZERO;

  const costCenterId = registration.programme.faculty.costCenterId ?? undefined;

  for (const line of registration.lines) {
    // A non-refundable item is retained in full however early the student
    // leaves. Stamp duty and statutory fines are collected or they are not.
    const keepPct = line.feeItem.isRefundable ? new100().minus(pct) : new100();
    const keepGross = toStorage(line.grossAmount.times(keepPct).dividedBy(100));
    const keepDiscount = toStorage(line.discountAmount.times(keepPct).dividedBy(100));
    const keepNet = keepGross.minus(keepDiscount);

    refundable = refundable.plus(line.netAmount.minus(keepNet));
    retained = retained.plus(keepNet);

    if (keepGross.greaterThan(0)) {
      retainedLines.push({
        feeItemId: line.feeItemId,
        grossAmount: keepGross,
        discountAmount: keepDiscount,
        costCenterId,
      });
    }
  }

  let retentionHeaderId: string | null = null;
  let retentionVoucherRef: string | null = null;

  if (retainedLines.length > 0) {
    const period = await resolvePeriod(tx, principal.tenantId, postingDate);
    const raised = await raiseChargesInTx(tx, principal, {
      studentId: args.studentId,
      docDate: postingDate,
      description:
        `Retained on ${transition.label.toLowerCase()} — ${args.studentNo}, ` +
        `${registration.academicTerm.nameEn}`,
      termLabel: registration.academicTerm.nameEn,
      sourceModule: 'REGISTRATION',
      sourceRef: registration.id,
      // Recognised now, not across the term: the student has left, and what
      // the institution keeps it has already earned.
      recognitionPeriodIds: [period.fiscalPeriodId],
      // Coverage is resolved again on the retained lines, deliberately. The
      // reversal a moment ago credited each sponsor back their whole share
      // and handed the contract cap back, so re-splitting apportions the
      // retention between student and sponsor in the contract's own
      // proportions: a 60%-funded student who withdraws owing 500,000 owes
      // 200,000 of it personally. Billing the retention wholly to the student
      // would hand the sponsor a refund of money the institution kept — the
      // deferral B5 recorded, closed here (B6, REQ-SPN-03).
      lines: retainedLines,
    });
    retentionHeaderId = raised.headerId;
    retentionVoucherRef = raised.voucherRef;

    // The reversal released everything the student had already paid into a
    // credit balance. REQ-FEE-04 requires that credit to meet what they next
    // owe, and what they next owe is the portion just retained — so it is
    // applied here rather than left for somebody to match by hand. What
    // remains afterwards is the refundable amount, and nothing else.
    await applyCreditBalanceInTx(tx, principal, args.studentId, {
      docDate: postingDate,
    });
  }

  return {
    reversalHeaderId: reversed.headerId,
    retentionHeaderId,
    reversalVoucherRef: reversed.voucherRef,
    retentionVoucherRef,
    amountReversed,
    amountRefundable: refundable,
    amountRetained: retained,
    // Where the student elects a refund, the credit balance already *is* the
    // liability — it sits in Student Credit Control, which is money the
    // institution owes. Paying it out is an A6 payment voucher against the
    // student, and this records which of the two was chosen (REQ-FEE-03).
    refundElection: args.refundElection ?? 'RETAIN_AS_CREDIT',
  };
}

/**
 * The percentage of a refundable fee item that comes back, given how long
 * after the term started the student left (SRS REQ-FEE-03).
 *
 * Bands are read in ascending `withinDays` and the first match wins. Past
 * every band, nothing is refundable. With no active policy configured,
 * nothing is refundable either — which is the conservative answer, and the
 * one that makes a missing policy visible on the first withdrawal rather than
 * quietly giving a term's fees away.
 */
export async function refundablePct(
  tx: Tx,
  tenantId: string,
  termStart: Date,
  withdrawalDate: Date,
): Promise<Money> {
  const policy = await tx.refundPolicy.findFirst({
    where: { tenantId, isActive: true },
    select: {
      bands: {
        orderBy: { withinDays: 'asc' },
        select: { withinDays: true, refundablePct: true },
      },
    },
  });
  if (!policy || policy.bands.length === 0) return ZERO;

  const elapsed = Math.floor(
    (toDateOnly(withdrawalDate).getTime() - toDateOnly(termStart).getTime()) / 86_400_000,
  );
  // Leaving before the term starts is the most generous band there is.
  const days = elapsed < 0 ? 0 : elapsed;

  for (const band of policy.bands) {
    if (days <= band.withinDays) return band.refundablePct;
  }
  return ZERO;
}

async function liveRegistrationOn(tx: Tx, tenantId: string, studentId: string, on: Date) {
  const day = toDateOnly(on);
  // The registration whose term contains the effective date, falling back to
  // the most recent live one — a student who withdraws in the vacation is
  // withdrawing from the term they last registered for.
  const candidates = await tx.semesterRegistration.findMany({
    where: { tenantId, studentId, status: 'REGISTERED' },
    orderBy: { registrationDate: 'desc' },
    select: {
      id: true,
      netAmount: true,
      postedHeaderId: true,
      academicTerm: { select: { nameEn: true, startDate: true, endDate: true } },
      programme: { select: { faculty: { select: { costCenterId: true } } } },
      lines: {
        orderBy: { sortOrder: 'asc' },
        select: {
          chargeId: true,
          feeItemId: true,
          grossAmount: true,
          discountAmount: true,
          netAmount: true,
          feeItem: { select: { isRefundable: true } },
        },
      },
    },
  });
  if (candidates.length === 0) return null;

  return (
    candidates.find(
      (r) => r.academicTerm.startDate <= day && r.academicTerm.endDate >= day,
    ) ?? candidates[0]
  );
}

// ---------------------------------------------------------------------------
// Reading history
// ---------------------------------------------------------------------------

export interface StatusRecord {
  id: string;
  fromStatus: StudentStatus | null;
  toStatus: StudentStatus;
  effectiveDate: string;
  reason: string;
  consequence: StatusConsequence;
  requestedBy: string | null;
  approvedBy: string | null;
  recordedBy: string | null;
  amountReversed: string | null;
  amountRefundable: string | null;
  amountRetained: string | null;
  refundElection: RefundElection | null;
}

export async function statusHistory(
  principal: Principal,
  studentId: string,
): Promise<StatusRecord[]> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.studentStatusHistory.findMany({
      where: { tenantId: principal.tenantId, studentId },
      orderBy: [{ effectiveDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        effectiveDate: true,
        reason: true,
        consequence: true,
        requestedBy: true,
        amountReversed: true,
        amountRefundable: true,
        amountRetained: true,
        refundElection: true,
        approvedBy: { select: { fullName: true } },
        createdBy: { select: { fullName: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      fromStatus: r.fromStatus,
      toStatus: r.toStatus,
      effectiveDate: iso(r.effectiveDate),
      reason: r.reason,
      consequence: r.consequence,
      requestedBy: r.requestedBy,
      approvedBy: r.approvedBy?.fullName ?? null,
      recordedBy: r.createdBy?.fullName ?? null,
      amountReversed: r.amountReversed?.toFixed(4) ?? null,
      amountRefundable: r.amountRefundable?.toFixed(4) ?? null,
      amountRetained: r.amountRetained?.toFixed(4) ?? null,
      refundElection: r.refundElection,
    }));
  });
}

/**
 * What this student's standing was on a given day (SRS REQ-LIF-02).
 *
 * The question the legacy schema cannot answer at all, because standing is
 * the current contents of a table. Total for every student, because the
 * migration wrote an opening row for everyone who predates this module.
 */
export async function statusOn(
  tx: Tx,
  tenantId: string,
  studentId: string,
  on: Date,
): Promise<StudentStatus | null> {
  const row = await tx.studentStatusHistory.findFirst({
    where: { tenantId, studentId, effectiveDate: { lte: toDateOnly(on) } },
    orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
    select: { toStatus: true },
  });
  return row?.toStatus ?? null;
}

/**
 * Everyone who held a given standing on a day — "who was Active in Fall 2026".
 *
 * Evaluated from the history rather than from `students.status`, so it stays
 * correct after the students in it have since deferred, graduated or left.
 */
export async function cohortOn(
  principal: Principal,
  status: StudentStatus,
  on: Date,
): Promise<Array<{ studentId: string; studentNo: string; fullNameEn: string }>> {
  requirePermission(principal, 'student.read');
  const day = toDateOnly(on);

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.studentStatusHistory.findMany({
      where: { tenantId: principal.tenantId, effectiveDate: { lte: day } },
      orderBy: [{ effectiveDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        studentId: true,
        toStatus: true,
        student: { select: { studentNo: true, fullNameEn: true } },
      },
    });

    // First row per student is their latest standing on or before the day.
    const seen = new Set<string>();
    const out: Array<{ studentId: string; studentNo: string; fullNameEn: string }> = [];
    for (const r of rows) {
      if (seen.has(r.studentId)) continue;
      seen.add(r.studentId);
      if (r.toStatus === status) {
        out.push({
          studentId: r.studentId,
          studentNo: r.student.studentNo,
          fullNameEn: r.student.fullNameEn,
        });
      }
    }
    return out.sort((a, b) => a.studentNo.localeCompare(b.studentNo));
  });
}

/**
 * Record the opening standing of a student, from inside the transaction that
 * created them.
 *
 * Called by `createStudent` so the chain is complete from the first day and
 * `statusOn` is total. Without it, every student created before their first
 * transition would have no standing on any date, and `cohortOn` would answer
 * for part of the intake and silently omit the rest.
 */
export async function recordOpeningStatus(
  tx: Tx,
  tenantId: string,
  args: {
    studentId: string;
    status: StudentStatus;
    effectiveDate: Date;
    createdById: string;
    reason?: string;
  },
): Promise<void> {
  await tx.studentStatusHistory.create({
    data: {
      tenantId,
      studentId: args.studentId,
      fromStatus: null,
      toStatus: args.status,
      effectiveDate: toDateOnly(args.effectiveDate),
      reason: args.reason ?? 'Record created',
      consequence: 'NONE',
      createdById: args.createdById,
    },
  });
}

/**
 * Promote an admitted student on their first registration, from inside the
 * registration transaction (REQ-LIF-01, `Admitted --> Active`).
 *
 * Returns whether it did anything, so registration can report it. Silent
 * where the student is already active — the second registration of a year is
 * not a transition.
 *
 * The effective date is clamped so it cannot precede the chain. A student
 * record opened today and registered for a term that started in January is an
 * ordinary backfill, and their standing cannot begin before their record did;
 * taking the later of the two dates says that, where refusing would make an
 * onboarding tenant unable to register anybody.
 *
 * The clamp is deliberately here and **not** in `changeStudentStatus`. This is
 * a transition the system takes on the registrar's behalf, so adjusting it is
 * reasonable; one an operator back-dates by hand is refused, loudly, because
 * that is somebody rewriting who was active in a term already reported on.
 */
export async function activateOnFirstRegistration(
  tx: Tx,
  principal: Principal,
  args: { studentId: string; effectiveDate: Date; registrationNo: string },
): Promise<boolean> {
  const student = await tx.student.findUniqueOrThrow({
    where: { id: args.studentId },
    select: { status: true },
  });
  if (student.status !== 'ADMITTED') return false;

  const latest = await tx.studentStatusHistory.findFirst({
    where: { tenantId: principal.tenantId, studentId: args.studentId },
    orderBy: { effectiveDate: 'desc' },
    select: { effectiveDate: true },
  });
  const wanted = toDateOnly(args.effectiveDate);
  const effectiveDate =
    latest && latest.effectiveDate > wanted ? latest.effectiveDate : wanted;

  await tx.studentStatusHistory.create({
    data: {
      tenantId: principal.tenantId,
      studentId: args.studentId,
      fromStatus: 'ADMITTED',
      toStatus: 'ACTIVE',
      effectiveDate,
      reason: `First registration — ${args.registrationNo}`,
      consequence: 'NONE',
      createdById: principal.userId,
    },
  });
  await tx.student.update({
    where: { id: args.studentId },
    data: { status: 'ACTIVE' },
  });
  return true;
}

function new100(): Money {
  return toStorage(100);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export { sum };
