import 'server-only';
import type { OfferState } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { buildSearchKey } from '@/lib/i18n/arabic';
import { money, type Money, type MoneyInput } from '@/lib/money';
import { toDateOnly } from '@/lib/ledger/period';
import { recordOpeningStatus } from '@/lib/students/status';
import { CapacityExceededError, lockQuota, quotaFor, SeatQuotaError } from './quota';
import { ApplicationError, decideApplication, requireApplication } from './applications';

/**
 * Offers, deadlines, waitlist promotion and enrolment
 * (SRS REQ-ADM-CAP-04, Track B2).
 *
 * This is where capacity stops being a report and becomes a control. The
 * legacy build checked nothing at this moment because this moment did not
 * exist: a place was "given" when a cashier took money, and the seat count was
 * a retrospective `COUNT(DISTINCT StudID)` over receipt vouchers.
 *
 * Three properties are worth stating outright.
 *
 * **Capacity is checked under a row lock.** Two admissions officers issuing
 * the last seat at the same instant would otherwise both read one available and
 * both succeed — the lost-update race Phase 0 removed from voucher numbering,
 * with a person's place instead of a document number.
 *
 * **An unanswered offer holds its seat.** `available` subtracts issued offers,
 * not just accepted ones. Treating an unanswered offer as a free seat is how a
 * programme discovers it is over-subscribed on the day the deadline passes.
 *
 * **A lapse is a batch, not a query.** An offer does not become LAPSED by being
 * read after its deadline; a run marks it, records when, and frees the seat.
 * Deriving it at read time would mean the seat is free in one query and taken
 * in another depending on who asked and when.
 */

export class OfferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferError';
  }
}

export interface IssueOfferInput {
  applicationId: string;
  /** Which of the applicant's choices is being offered. */
  programmeId: string;
  /** Last day the applicant may accept. */
  acceptBy: Date;
  conditions?: string | null;
  depositRequired?: MoneyInput | null;
  /**
   * Required when the offer exceeds the quota. Needs `admission.override`, and
   * the reason is recorded on the offer itself.
   */
  override?: { reason: string } | null;
}

export interface IssuedOffer {
  offerId: string;
  applicationNo: string;
  programmeCode: string;
  acceptBy: string;
  seatsRemaining: number;
  overrodeCapacity: boolean;
}

/**
 * Offer a place.
 *
 * Refuses unless the applicant actually asked for this programme. An offer for
 * something nobody applied to is either a mistyped programme or a place being
 * handed out off the books, and both want a person to look again.
 */
export async function issueOffer(
  principal: Principal,
  input: IssueOfferInput,
): Promise<IssuedOffer> {
  requirePermission(principal, 'application.offer');
  if (input.override) {
    requirePermission(principal, 'admission.override');
    if (!input.override.reason?.trim()) {
      throw new OfferError(
        'An override needs a stated reason. Recording that capacity was exceeded without ' +
          'recording why is indistinguishable from never having checked.',
      );
    }
  }

  const acceptBy = toDateOnly(input.acceptBy);

  return withTenant(principal.tenantId, async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: input.applicationId },
      select: {
        tenantId: true,
        applicationNo: true,
        state: true,
        decision: true,
        batchId: true,
        admissionCategoryId: true,
      },
    });
    if (!app || app.tenantId !== principal.tenantId) {
      throw new ApplicationError('That application does not belong to this university.');
    }
    if (app.state === 'DRAFT') {
      throw new OfferError(
        `Application ${app.applicationNo} has not been submitted. Nothing has been screened.`,
      );
    }
    if (app.state === 'ENROLLED' || app.state === 'WITHDRAWN' || app.state === 'REJECTED') {
      throw new OfferError(
        `Application ${app.applicationNo} is ${app.state} and cannot be offered a place.`,
      );
    }

    // An offer follows a committee decision (REQ-ADM-CAP-03 then -04). This is
    // the admissions equivalent of maker-checker: whoever allocates the seat is
    // acting on a recorded verdict with a recorded rationale, rather than
    // deciding and awarding in one motion. A waitlisted applicant is promoted
    // by the same route — the promotion re-decides them first.
    if (app.decision !== 'ACCEPT' && app.decision !== 'CONDITIONAL_ACCEPT') {
      throw new OfferError(
        `Application ${app.applicationNo} carries no committee decision to accept it` +
          `${app.decision ? ` — it is marked ${app.decision}` : ''}. Record the decision and ` +
          `its rationale before allocating a seat.`,
      );
    }

    const choice = await tx.applicationChoice.findFirst({
      where: {
        tenantId: principal.tenantId,
        applicationId: input.applicationId,
        programmeId: input.programmeId,
      },
      select: { rank: true, programme: { select: { code: true } } },
    });
    if (!choice) {
      throw new OfferError(
        `Application ${app.applicationNo} did not apply for this programme. An offer for ` +
          `something nobody asked for is a mistyped programme or a place given off the books.`,
      );
    }

    const live = await tx.admissionOffer.findFirst({
      where: {
        tenantId: principal.tenantId,
        applicationId: input.applicationId,
        state: 'ISSUED',
      },
      select: { id: true, programmeId: true },
    });
    if (live) {
      throw new OfferError(
        `Application ${app.applicationNo} already holds an unanswered offer. Withdraw it ` +
          `before issuing another, or two seats stay consumed by one person.`,
      );
    }

    const seatQuotaId = await quotaFor(tx, principal.tenantId, {
      programmeId: input.programmeId,
      batchId: app.batchId,
      admissionCategoryId: app.admissionCategoryId,
    });
    if (!seatQuotaId) {
      throw new SeatQuotaError(
        `No seat quota exists for ${choice.programme.code} in this intake and admission ` +
          `category. Capacity has to be declared before places can be given out.`,
      );
    }

    // Lock, then count. Everything from here to commit sees a stable quota.
    const { quota, counts } = await lockQuota(tx, principal.tenantId, seatQuotaId);
    if (!quota.isActive) {
      throw new SeatQuotaError(`The quota for ${quota.programmeCode} is not active.`);
    }

    const capacity = quota.seats - quota.reservedSeats;
    const beyondCapacity = counts.held >= capacity;

    if (beyondCapacity) {
      if (!input.override) {
        throw new CapacityExceededError(quota.programmeCode, capacity, counts.held);
      }
      if (!quota.allowOverride) {
        throw new SeatQuotaError(
          `${quota.programmeCode} is full at ${capacity} seat(s) and its quota does not ` +
            `permit overrides. The seat count has to be raised deliberately instead.`,
        );
      }
    }

    const offer = await tx.admissionOffer.create({
      data: {
        tenantId: principal.tenantId,
        applicationId: input.applicationId,
        seatQuotaId,
        programmeId: input.programmeId,
        state: 'ISSUED',
        issuedById: principal.userId,
        acceptBy,
        conditions: input.conditions?.trim() || null,
        depositRequired:
          input.depositRequired != null ? money(input.depositRequired).toFixed(4) : null,
        overrodeCapacity: beyondCapacity,
        overrideReason: beyondCapacity ? input.override!.reason.trim() : null,
        overriddenById: beyondCapacity ? principal.userId : null,
      },
      select: { id: true },
    });

    await tx.application.update({
      where: { id: input.applicationId },
      data: { state: 'OFFERED' },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'admission_offer',
      resourceId: offer.id,
      after: {
        applicationNo: app.applicationNo,
        programme: quota.programmeCode,
        acceptBy: acceptBy.toISOString().slice(0, 10),
        seats: quota.seats,
        held: counts.held + 1,
        overrodeCapacity: beyondCapacity,
        overrideReason: beyondCapacity ? input.override!.reason.trim() : undefined,
      },
    });

    return {
      offerId: offer.id,
      applicationNo: app.applicationNo,
      programmeCode: quota.programmeCode,
      acceptBy: acceptBy.toISOString().slice(0, 10),
      seatsRemaining: capacity - (counts.held + 1),
      overrodeCapacity: beyondCapacity,
    };
  });
}

/**
 * The applicant accepts.
 *
 * Where a deposit was required it must have been recorded first. The deposit
 * is a real receipt taken by a cashier through A3, not a flag set here — the
 * money and the seat are two facts and this ties them together rather than
 * standing in for one of them.
 */
export async function acceptOffer(
  principal: Principal,
  offerId: string,
): Promise<{ offerId: string; applicationId: string }> {
  requirePermission(principal, 'application.offer');

  return withTenant(principal.tenantId, async (tx) => {
    const offer = await requireLiveOffer(tx, principal.tenantId, offerId);

    if (offer.depositRequired && !offer.depositPaidAt) {
      throw new OfferError(
        `This offer requires a seat deposit of ${offer.depositRequired.toFixed(2)} and none ` +
          `has been recorded. Take the deposit through the cashier desk first.`,
      );
    }

    const now = new Date();
    await tx.admissionOffer.update({
      where: { id: offerId },
      data: { state: 'ACCEPTED', respondedAt: now, closedAt: now },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'admission_offer',
      resourceId: offerId,
      before: { state: 'ISSUED' },
      after: { state: 'ACCEPTED' },
    });

    return { offerId, applicationId: offer.applicationId };
  });
}

export async function declineOffer(
  principal: Principal,
  offerId: string,
  reason?: string,
): Promise<void> {
  requirePermission(principal, 'application.offer');
  await closeOffer(principal, offerId, 'DECLINED', reason ?? 'Declined by the applicant.');
}

export async function withdrawOffer(
  principal: Principal,
  offerId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'application.offer');
  if (!reason?.trim()) {
    throw new OfferError('Withdrawing an offer needs a stated reason.');
  }
  await closeOffer(principal, offerId, 'WITHDRAWN', reason);
}

async function closeOffer(
  principal: Principal,
  offerId: string,
  state: Extract<OfferState, 'DECLINED' | 'WITHDRAWN'>,
  reason: string,
): Promise<void> {
  await withTenant(principal.tenantId, async (tx) => {
    const offer = await requireLiveOffer(tx, principal.tenantId, offerId);
    const now = new Date();

    await tx.admissionOffer.update({
      where: { id: offerId },
      data: {
        state,
        closedAt: now,
        closeReason: reason.trim(),
        ...(state === 'DECLINED' ? { respondedAt: now } : {}),
      },
    });

    // The application returns to review. It has not been rejected — the place
    // was refused or pulled, and the committee's verdict still stands.
    await tx.application.update({
      where: { id: offer.applicationId },
      data: { state: 'UNDER_REVIEW' },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'admission_offer',
      resourceId: offerId,
      before: { state: 'ISSUED' },
      after: { state, reason: reason.trim() },
    });
  });
}

/** Attach the cashier's receipt for a seat deposit. */
export async function recordSeatDeposit(
  principal: Principal,
  offerId: string,
  receiptId: string,
): Promise<void> {
  requirePermission(principal, 'application.offer');

  await withTenant(principal.tenantId, async (tx) => {
    const offer = await requireLiveOffer(tx, principal.tenantId, offerId);
    if (!offer.depositRequired) {
      throw new OfferError('This offer does not require a seat deposit.');
    }

    const receipt = await tx.studentReceipt.findFirst({
      where: { id: receiptId, tenantId: principal.tenantId, cancelledAt: null },
      select: { amount: true, receiptNo: true },
    });
    if (!receipt) {
      throw new OfferError('No live receipt with that id in this university.');
    }
    if (receipt.amount.lessThan(offer.depositRequired)) {
      throw new OfferError(
        `Receipt ${receipt.receiptNo} is for ${receipt.amount.toFixed(2)}, less than the ` +
          `${offer.depositRequired.toFixed(2)} deposit this offer requires.`,
      );
    }

    await tx.admissionOffer.update({
      where: { id: offerId },
      data: { depositPaidAt: new Date(), depositReceiptId: receiptId },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'admission_offer',
      resourceId: offerId,
      after: { depositReceipt: receipt.receiptNo, amount: receipt.amount.toFixed(2) },
    });
  });
}

// ---------------------------------------------------------------------------
// Lapse and waitlist promotion
// ---------------------------------------------------------------------------

export interface LapseResult {
  lapsed: number;
  applicationNos: string[];
}

/**
 * Close every offer whose deadline has passed (REQ-ADM-CAP-04).
 *
 * Run as a period batch. Deliberately not derived at read time: an offer that
 * is "lapsed" only in the eye of whoever is looking makes the same seat free in
 * one report and taken in another. Marking it once gives every reader the same
 * answer and leaves a record of when the seat came back.
 */
export async function lapseExpiredOffers(
  principal: Principal,
  asOf: Date = new Date(),
): Promise<LapseResult> {
  requirePermission(principal, 'application.offer');
  const day = toDateOnly(asOf);

  return withTenant(principal.tenantId, async (tx) => {
    const expired = await tx.admissionOffer.findMany({
      where: {
        tenantId: principal.tenantId,
        state: 'ISSUED',
        acceptBy: { lt: day },
      },
      select: { id: true, applicationId: true },
    });

    const applicationNos: string[] = [];
    const now = new Date();

    for (const offer of expired) {
      await tx.admissionOffer.update({
        where: { id: offer.id },
        data: {
          state: 'LAPSED',
          closedAt: now,
          closeReason: `Acceptance deadline passed on ${day.toISOString().slice(0, 10)}.`,
        },
      });

      const app = await tx.application.update({
        where: { id: offer.applicationId },
        data: { state: 'UNDER_REVIEW' },
        select: { applicationNo: true },
      });
      applicationNos.push(app.applicationNo);
    }

    if (expired.length > 0) {
      await audit(tx, principal.tenantId, {
        actorId: principal.userId,
        action: 'UPDATE',
        resourceType: 'admission_offer_lapse',
        resourceId: principal.tenantId,
        after: { asOf: day.toISOString().slice(0, 10), lapsed: expired.length, applicationNos },
      });
    }

    return { lapsed: expired.length, applicationNos };
  });
}

export interface PromotionCandidate {
  applicationId: string;
  applicationNo: string;
  fullNameEn: string;
  committeeScore: string | null;
  certificateScore: string | null;
}

/**
 * Who should get a seat that has come free.
 *
 * Waitlisted applicants who asked for this programme, best first. Returned for
 * a human to act on rather than promoted automatically: an offer is a
 * commitment to a person, and the institution should make it deliberately. The
 * ordering is the same as the ranked list so the two never disagree.
 */
export async function waitlistFor(
  principal: Principal,
  programmeId: string,
  batchId: string,
): Promise<PromotionCandidate[]> {
  requirePermission(principal, 'application.read');

  return withTenant(principal.tenantId, async (tx) => {
    const choices = await tx.applicationChoice.findMany({
      where: {
        tenantId: principal.tenantId,
        programmeId,
        application: { batchId, state: 'WAITLISTED' },
      },
      select: {
        rank: true,
        application: {
          select: {
            id: true,
            applicationNo: true,
            fullNameEn: true,
            committeeScore: true,
            certificateScore: true,
          },
        },
      },
    });

    return choices
      .map((c) => c.application)
      .sort((a, b) => {
        const sa = a.committeeScore ?? a.certificateScore;
        const sb = b.committeeScore ?? b.certificateScore;
        if (sa && sb && !sa.equals(sb)) return sb.comparedTo(sa);
        if (sa && !sb) return -1;
        if (sb && !sa) return 1;
        return a.applicationNo.localeCompare(b.applicationNo);
      })
      .map((a) => ({
        applicationId: a.id,
        applicationNo: a.applicationNo,
        fullNameEn: a.fullNameEn,
        committeeScore: a.committeeScore?.toFixed(3) ?? null,
        certificateScore: a.certificateScore?.toFixed(3) ?? null,
      }));
  });
}

/**
 * Promote a waitlisted applicant into a seat freed by a specific offer.
 *
 * Links the new offer to the one it replaces, so "who held this seat before
 * me" has an answer — which matters when an applicant asks why a place
 * appeared in August.
 */
export async function promoteFromWaitlist(
  principal: Principal,
  input: {
    applicationId: string;
    programmeId: string;
    lapsedOfferId: string;
    acceptBy: Date;
    conditions?: string | null;
    depositRequired?: MoneyInput | null;
    /** Why this candidate, now. Recorded as the committee decision. */
    reason?: string;
  },
): Promise<IssuedOffer> {
  requirePermission(principal, 'application.offer');
  requirePermission(principal, 'application.decide');

  // A waitlisted applicant carries a WAITLIST decision, which is not a decision
  // to accept. Promotion re-decides them, so the record says why a place
  // appeared in August rather than leaving it to be inferred.
  await decideApplication(
    principal,
    input.applicationId,
    'ACCEPT',
    input.reason?.trim() ||
      'Promoted from the waitlist against a seat freed by a lapsed offer.',
  );

  const issued = await issueOffer(principal, {
    applicationId: input.applicationId,
    programmeId: input.programmeId,
    acceptBy: input.acceptBy,
    conditions: input.conditions,
    depositRequired: input.depositRequired,
  });

  await withTenant(principal.tenantId, async (tx) => {
    const source = await tx.admissionOffer.findFirst({
      where: { id: input.lapsedOfferId, tenantId: principal.tenantId },
      select: { state: true },
    });
    if (!source) {
      throw new OfferError('The offer being replaced does not belong to this university.');
    }
    if (source.state === 'ISSUED' || source.state === 'ACCEPTED') {
      throw new OfferError(
        'The offer being replaced is still live. A seat cannot be promoted out from under ' +
          'somebody who still holds it.',
      );
    }

    await tx.admissionOffer.update({
      where: { id: issued.offerId },
      data: { promotedFromId: input.lapsedOfferId },
    });
  });

  return issued;
}

// ---------------------------------------------------------------------------
// Enrolment — the handover to the student master
// ---------------------------------------------------------------------------

export interface EnrolmentResult {
  studentId: string;
  studentNo: string;
  applicationNo: string;
}

/**
 * Turn an accepted offer into a student.
 *
 * The moment an applicant becomes a student, and the only one. The student is
 * created carrying the four dimensions the fee matrix is keyed on — programme,
 * batch, admission category, nationality — so B1's `feeScheduleForStudent` can
 * price them immediately and B4's registration has something to bill.
 *
 * Atomic with stamping the application, because a student who exists with no
 * application pointing at them, or an application marked ENROLLED with no
 * student, are both states nobody can unpick later.
 */
export async function enrolAcceptedOffer(
  principal: Principal,
  offerId: string,
  input: { studentNo: string; admittedOn?: Date },
): Promise<EnrolmentResult> {
  requirePermission(principal, 'application.enrol');

  const studentNo = input.studentNo?.trim();
  if (!studentNo) {
    throw new OfferError('A student needs a university number.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const offer = await tx.admissionOffer.findUnique({
      where: { id: offerId },
      select: {
        tenantId: true,
        state: true,
        programmeId: true,
        applicationId: true,
      },
    });
    if (!offer || offer.tenantId !== principal.tenantId) {
      throw new OfferError('That offer does not belong to this university.');
    }
    if (offer.state !== 'ACCEPTED') {
      throw new OfferError(
        `This offer is ${offer.state}. Only an accepted offer produces a student record.`,
      );
    }

    const app = await tx.application.findUniqueOrThrow({
      where: { id: offer.applicationId },
      select: {
        applicationNo: true,
        state: true,
        fullNameAr: true,
        fullNameEn: true,
        nationalId: true,
        batchId: true,
        admissionCategoryId: true,
        nationalityId: true,
        passportNo: true,
        dateOfBirth: true,
        email: true,
        phone: true,
        certificateTypeId: true,
        certificateScore: true,
        certificateYear: true,
      },
    });
    if (app.state === 'ENROLLED') {
      throw new OfferError(
        `Application ${app.applicationNo} has already produced a student record.`,
      );
    }

    const clash = await tx.student.findFirst({
      where: { tenantId: principal.tenantId, studentNo },
      select: { fullNameEn: true },
    });
    if (clash) {
      throw new OfferError(
        `Student number ${studentNo} already belongs to ${clash.fullNameEn}.`,
      );
    }

    const admittedOn = toDateOnly(input.admittedOn ?? new Date());

    const student = await tx.student.create({
      data: {
        tenantId: principal.tenantId,
        studentNo,
        fullNameAr: app.fullNameAr,
        fullNameEn: app.fullNameEn,
        searchKey: buildSearchKey(app.fullNameAr, app.fullNameEn, studentNo, app.nationalId),
        nationalId: app.nationalId,
        status: 'ADMITTED',
        admittedOn,
        // The fee matrix is keyed on these four. Carried across here so the
        // student can be priced the moment they exist, rather than in a second
        // step somebody has to remember.
        programmeId: offer.programmeId,
        batchId: app.batchId,
        admissionCategoryId: app.admissionCategoryId,
        nationalityId: app.nationalityId,
      },
      select: { id: true, studentNo: true },
    });

    // The opening row of the status chain (B5). An accepted offer is where a
    // student's standing begins, and `statusOn` has to be able to answer for
    // that day as much as for any later one.
    await recordOpeningStatus(tx, principal.tenantId, {
      studentId: student.id,
      status: 'ADMITTED',
      effectiveDate: admittedOn,
      createdById: principal.userId,
      reason: `Offer accepted — application ${app.applicationNo}`,
    });

    // Seed the profile from what the applicant already told us (B3). The
    // legacy system re-keyed this: `FrmStudForm2` wrote the applicant's names,
    // birth date and contact details to `StdForm`, and then a second clerk
    // typed the same names again into `StdData` on a different screen, with
    // nothing reconciling the two. Carrying it across is the whole point of
    // having admissions and the registry in one database.
    await tx.studentProfile.create({
      data: {
        tenantId: principal.tenantId,
        studentId: student.id,
        dateOfBirth: app.dateOfBirth,
        passportNo: app.passportNo,
        email: app.email,
        phone: app.phone,
        certificateTypeId: app.certificateTypeId,
        certificateScore: app.certificateScore,
        certificateYear: app.certificateYear,
        updatedById: principal.userId,
      },
    });

    await tx.application.update({
      where: { id: offer.applicationId },
      data: { state: 'ENROLLED', studentId: student.id },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'student',
      resourceId: student.id,
      after: {
        studentNo: student.studentNo,
        fromApplication: app.applicationNo,
        programmeId: offer.programmeId,
        admittedOn: admittedOn.toISOString().slice(0, 10),
      },
    });

    return {
      studentId: student.id,
      studentNo: student.studentNo,
      applicationNo: app.applicationNo,
    };
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function requireLiveOffer(
  tx: Tx,
  tenantId: string,
  offerId: string,
): Promise<{
  id: string;
  applicationId: string;
  depositRequired: Money | null;
  depositPaidAt: Date | null;
}> {
  const offer = await tx.admissionOffer.findUnique({
    where: { id: offerId },
    select: {
      id: true,
      tenantId: true,
      state: true,
      applicationId: true,
      depositRequired: true,
      depositPaidAt: true,
    },
  });
  if (!offer || offer.tenantId !== tenantId) {
    throw new OfferError('That offer does not belong to this university.');
  }
  if (offer.state !== 'ISSUED') {
    throw new OfferError(
      `This offer is already ${offer.state}. By now the seat may have gone to a waitlisted ` +
        `applicant; issue a fresh offer instead of reopening this one.`,
    );
  }
  return offer;
}

/** Re-export so callers need one import for the admissions surface. */
export { requireApplication };
