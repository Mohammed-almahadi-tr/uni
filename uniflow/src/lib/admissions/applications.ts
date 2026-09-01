import 'server-only';
import type {
  AdmissionDecision,
  ApplicationSource,
  ApplicationState,
} from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { buildSearchKey, normalizeArabic } from '@/lib/i18n/arabic';
import { money, type Money, type MoneyInput } from '@/lib/money';
import { toDateOnly } from '@/lib/ledger/period';
import { screen, type ScreeningResult } from './eligibility';

/**
 * Applications, duplicate detection and the committee workflow
 * (SRS REQ-ADM-CAP-03 and REQ-ADM-CAP-05, Track B2).
 *
 * The legacy build had no application entity. A person became known to the
 * system when a cashier took money from them, which is why its "seats taken"
 * figure was computed from receipt vouchers: payment *was* admission. There
 * was consequently nowhere to record that somebody applied and was refused,
 * and no moment at which two records of one person could be noticed.
 */

export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApplicationError';
  }
}

export interface ApplicationInput {
  batchId: string;
  admissionCategoryId: string;
  fullNameAr: string;
  fullNameEn: string;
  nationalId?: string | null;
  passportNo?: string | null;
  dateOfBirth?: Date | null;
  nationalityId?: string | null;
  email?: string | null;
  phone?: string | null;
  certificateTypeId?: string | null;
  certificateScore?: MoneyInput | null;
  certificateYear?: number | null;
  subjects?: string[];
  /** Programmes in preference order. First entry is the first choice. */
  choices: string[];
}

export interface CreatedApplication {
  id: string;
  applicationNo: string;
  duplicates: DuplicateMatch[];
}

/**
 * Record an application.
 *
 * Duplicate candidates are returned rather than refused. A national ID clash
 * is usually the same person applying twice and sometimes two people whose
 * details were mistyped; a name-and-birthday match is weaker still. The
 * reviewer is shown what matched and decides — REQ-ADM-CAP-05 asks for exactly
 * that, "surfaced to the reviewer before an offer is made".
 */
export async function createApplication(
  principal: Principal,
  input: ApplicationInput,
): Promise<CreatedApplication> {
  requirePermission(principal, 'application.read');

  if (!input.fullNameAr?.trim() || !input.fullNameEn?.trim()) {
    throw new ApplicationError(
      'An application needs a name in both Arabic and English. The offer letter and the ' +
        'eventual certificate are issued in both.',
    );
  }
  if (input.choices.length === 0) {
    throw new ApplicationError(
      'An application needs at least one programme choice. There is nothing to screen ' +
        'or to offer otherwise.',
    );
  }
  if (new Set(input.choices).size !== input.choices.length) {
    throw new ApplicationError(
      'The same programme appears twice in the choices. Ranking a programme against ' +
        'itself has no meaning.',
    );
  }

  return withTenant(principal.tenantId, (tx) =>
    insertApplication(tx, principal.tenantId, principal.userId, input),
  );
}

/**
 * Insert one application inside a caller's transaction.
 *
 * Shared with the bulk intake import, which needs every row of a roster to land
 * or none of them to — so it cannot call a function that opens its own
 * transaction per row. Validation lives in `createApplication` above and in the
 * import's own pass; this is the write.
 */
export interface InsertOrigin {
  /** Where this application came from. A committee reading a certificate
   *  score needs to know whether a registrar typed it from a certified
   *  document or the applicant typed it about themselves. */
  source: ApplicationSource;
  /** Required for a PUBLIC application and refused for any other, by
   *  `chk_application_public_is_trackable`. */
  trackingToken?: string | null;
}

export async function insertApplication(
  tx: Tx,
  tenantId: string,
  actorId: string | null,
  input: ApplicationInput,
  origin: InsertOrigin = { source: 'STAFF' },
): Promise<CreatedApplication> {
  {
    const principal = { tenantId, userId: actorId };
    const applicationNo = await allocateApplicationNo(tx, principal.tenantId, input.batchId);

    const nationalId = input.nationalId?.trim() || null;
    const passportNo = input.passportNo?.trim() || null;
    const dateOfBirth = input.dateOfBirth ? toDateOnly(input.dateOfBirth) : null;
    const searchKey = buildSearchKey(input.fullNameAr, input.fullNameEn);

    const duplicates = await findDuplicates(tx, principal.tenantId, {
      nationalId,
      passportNo,
      searchKey,
      dateOfBirth,
    });

    const application = await tx.application.create({
      data: {
        tenantId: principal.tenantId,
        applicationNo,
        batchId: input.batchId,
        admissionCategoryId: input.admissionCategoryId,
        fullNameAr: input.fullNameAr.trim(),
        fullNameEn: input.fullNameEn.trim(),
        searchKey,
        nationalId,
        passportNo,
        dateOfBirth,
        nationalityId: input.nationalityId ?? null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        certificateTypeId: input.certificateTypeId ?? null,
        certificateScore:
          input.certificateScore != null ? money(input.certificateScore).toFixed(3) : null,
        certificateYear: input.certificateYear ?? null,
        subjects: (input.subjects ?? []).map((s) => s.trim()).filter(Boolean),
        state: 'DRAFT',
        source: origin.source,
        trackingToken: origin.trackingToken ?? null,
        choices: {
          create: input.choices.map((programmeId, i) => ({
            tenantId: principal.tenantId,
            programmeId,
            rank: i + 1,
          })),
        },
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'application',
      resourceId: application.id,
      after: {
        applicationNo,
        fullNameEn: input.fullNameEn.trim(),
        choices: input.choices.length,
        duplicateCandidates: duplicates.length,
        source: origin.source,
      },
    });

    return { id: application.id, applicationNo, duplicates };
  }
}

/**
 * Submit an application and screen it.
 *
 * Submission and screening happen together because an unscreened submitted
 * application is a thing a committee can pick up and decide on without the
 * verdict in front of them.
 */
export async function submitApplication(
  principal: Principal,
  applicationId: string,
): Promise<ScreeningResult> {
  requirePermission(principal, 'application.read');

  return withTenant(principal.tenantId, async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: applicationId },
      select: { tenantId: true, state: true, applicationNo: true },
    });
    if (!app || app.tenantId !== principal.tenantId) {
      throw new ApplicationError('That application does not belong to this university.');
    }
    if (app.state !== 'DRAFT') {
      throw new ApplicationError(
        `Application ${app.applicationNo} is ${app.state} and has already been submitted.`,
      );
    }

    await tx.application.update({
      where: { id: applicationId },
      data: { state: 'UNDER_REVIEW', submittedAt: new Date() },
    });

    const result = await screen(tx, principal.tenantId, applicationId);

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'application',
      resourceId: applicationId,
      before: { state: 'DRAFT' },
      after: {
        state: 'UNDER_REVIEW',
        screening: result.choices.map((c) => `${c.programmeCode}:${c.outcome}`),
      },
    });

    return result;
  });
}

// ---------------------------------------------------------------------------
// Duplicate detection (REQ-ADM-CAP-05)
// ---------------------------------------------------------------------------

export interface DuplicateMatch {
  applicationId: string | null;
  studentId: string | null;
  reference: string;
  fullNameEn: string;
  /** Which signal matched, strongest first. */
  basis: 'NATIONAL_ID' | 'PASSPORT' | 'NAME_AND_DOB';
  confidence: 'HIGH' | 'MEDIUM';
}

/**
 * Candidate matches for one applicant, across applications *and* students.
 *
 * Both, because the interesting duplicate is often not another application —
 * it is a person who is already enrolled and is quietly applying again, which
 * is how one human ends up with two student numbers and two ledgers for one
 * debt.
 *
 * The name match runs on the Arabic-normalised search key, not the raw name.
 * أحمد and احمد are the same person, فاطمه and فاطمة are the same person, and
 * a reviewer typing from an ID card will not reproduce whichever spelling was
 * used first. The name alone is far too weak, so it is paired with the date of
 * birth and reported at MEDIUM confidence.
 */
export async function findDuplicates(
  tx: Tx,
  tenantId: string,
  candidate: {
    nationalId: string | null;
    passportNo: string | null;
    searchKey: string;
    dateOfBirth: Date | null;
  },
  opts: { excludeApplicationId?: string } = {},
): Promise<DuplicateMatch[]> {
  const out: DuplicateMatch[] = [];
  const seen = new Set<string>();

  const push = (m: DuplicateMatch) => {
    const key = `${m.applicationId ?? ''}|${m.studentId ?? ''}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(m);
  };

  if (candidate.nationalId) {
    for (const a of await tx.application.findMany({
      where: {
        tenantId,
        nationalId: candidate.nationalId,
        ...(opts.excludeApplicationId ? { id: { not: opts.excludeApplicationId } } : {}),
      },
      select: { id: true, applicationNo: true, fullNameEn: true },
    })) {
      push({
        applicationId: a.id,
        studentId: null,
        reference: a.applicationNo,
        fullNameEn: a.fullNameEn,
        basis: 'NATIONAL_ID',
        confidence: 'HIGH',
      });
    }

    for (const s of await tx.student.findMany({
      where: { tenantId, nationalId: candidate.nationalId },
      select: { id: true, studentNo: true, fullNameEn: true },
    })) {
      push({
        applicationId: null,
        studentId: s.id,
        reference: s.studentNo,
        fullNameEn: s.fullNameEn,
        basis: 'NATIONAL_ID',
        confidence: 'HIGH',
      });
    }
  }

  if (candidate.passportNo) {
    for (const a of await tx.application.findMany({
      where: {
        tenantId,
        passportNo: candidate.passportNo,
        ...(opts.excludeApplicationId ? { id: { not: opts.excludeApplicationId } } : {}),
      },
      select: { id: true, applicationNo: true, fullNameEn: true },
    })) {
      push({
        applicationId: a.id,
        studentId: null,
        reference: a.applicationNo,
        fullNameEn: a.fullNameEn,
        basis: 'PASSPORT',
        confidence: 'HIGH',
      });
    }
  }

  if (candidate.dateOfBirth) {
    for (const a of await tx.application.findMany({
      where: {
        tenantId,
        searchKey: candidate.searchKey,
        dateOfBirth: candidate.dateOfBirth,
        ...(opts.excludeApplicationId ? { id: { not: opts.excludeApplicationId } } : {}),
      },
      select: { id: true, applicationNo: true, fullNameEn: true },
    })) {
      push({
        applicationId: a.id,
        studentId: null,
        reference: a.applicationNo,
        fullNameEn: a.fullNameEn,
        basis: 'NAME_AND_DOB',
        confidence: 'MEDIUM',
      });
    }
  }

  return out;
}

/** Re-run duplicate detection for an existing application, for the reviewer. */
export async function duplicatesFor(
  principal: Principal,
  applicationId: string,
): Promise<DuplicateMatch[]> {
  requirePermission(principal, 'application.read');

  return withTenant(principal.tenantId, async (tx) => {
    const app = await tx.application.findUnique({
      where: { id: applicationId },
      select: {
        tenantId: true,
        nationalId: true,
        passportNo: true,
        searchKey: true,
        dateOfBirth: true,
      },
    });
    if (!app || app.tenantId !== principal.tenantId) {
      throw new ApplicationError('That application does not belong to this university.');
    }

    return findDuplicates(
      tx,
      principal.tenantId,
      {
        nationalId: app.nationalId,
        passportNo: app.passportNo,
        searchKey: app.searchKey,
        dateOfBirth: app.dateOfBirth,
      },
      { excludeApplicationId: applicationId },
    );
  });
}

// ---------------------------------------------------------------------------
// Committee (REQ-ADM-CAP-03)
// ---------------------------------------------------------------------------

export interface RankedApplicant {
  applicationId: string;
  applicationNo: string;
  fullNameAr: string;
  fullNameEn: string;
  rank: number;
  /** The applicant's own preference order for this programme. */
  choiceRank: number;
  eligibility: 'PASS' | 'FAIL' | 'NOT_ASSESSED';
  eligibilityNotes: string[];
  certificateScore: string | null;
  committeeScore: string | null;
  state: ApplicationState;
  decision: AdmissionDecision | null;
  /**
   * Where the application came from (Track C2).
   *
   * On the list a committee scores from, because a certificate score typed by
   * a registrar off a certified document and one typed by the applicant about
   * themselves are not the same evidence — and REQ-ADM-CAP-05's duplicate
   * surfacing matters far more for the second.
   */
  source: ApplicationSource;
}

/**
 * The ranked list for one programme (REQ-ADM-CAP-03).
 *
 * Ordered by committee score where one has been given, falling back to the
 * certificate score. Applicants who failed screening are included and marked,
 * not filtered out: a committee that cannot see the near-misses cannot exercise
 * the discretion it exists for.
 */
export async function rankedList(
  principal: Principal,
  programmeId: string,
  batchId: string,
): Promise<RankedApplicant[]> {
  requirePermission(principal, 'application.read');

  return withTenant(principal.tenantId, async (tx) => {
    const choices = await tx.applicationChoice.findMany({
      where: {
        tenantId: principal.tenantId,
        programmeId,
        application: { batchId, state: { not: 'DRAFT' } },
      },
      select: {
        rank: true,
        eligibility: true,
        eligibilityNotes: true,
        application: {
          select: {
            id: true,
            applicationNo: true,
            fullNameAr: true,
            fullNameEn: true,
            certificateScore: true,
            committeeScore: true,
            state: true,
            decision: true,
            source: true,
          },
        },
      },
    });

    const sorted = choices
      .map((c) => ({
        choiceRank: c.rank,
        eligibility: c.eligibility,
        eligibilityNotes: c.eligibilityNotes,
        app: c.application,
      }))
      .sort((a, b) => {
        const score = (x: typeof a) =>
          x.app.committeeScore ?? x.app.certificateScore ?? null;
        const sa = score(a);
        const sb = score(b);
        if (sa && sb && !sa.equals(sb)) return sb.comparedTo(sa);
        if (sa && !sb) return -1;
        if (sb && !sa) return 1;
        // Equal on merit: the applicant who ranked this programme higher goes
        // first. It is a defensible tie-break and, unlike insertion order, the
        // same list comes back tomorrow.
        if (a.choiceRank !== b.choiceRank) return a.choiceRank - b.choiceRank;
        return a.app.applicationNo.localeCompare(b.app.applicationNo);
      });

    return sorted.map((r, i) => ({
      applicationId: r.app.id,
      applicationNo: r.app.applicationNo,
      fullNameAr: r.app.fullNameAr,
      fullNameEn: r.app.fullNameEn,
      rank: i + 1,
      choiceRank: r.choiceRank,
      eligibility: r.eligibility,
      eligibilityNotes: r.eligibilityNotes,
      certificateScore: r.app.certificateScore?.toFixed(3) ?? null,
      committeeScore: r.app.committeeScore?.toFixed(3) ?? null,
      state: r.app.state,
      decision: r.app.decision,
      source: r.app.source,
    }));
  });
}

export async function scoreApplication(
  principal: Principal,
  applicationId: string,
  committeeScore: MoneyInput,
): Promise<void> {
  requirePermission(principal, 'application.decide');

  await withTenant(principal.tenantId, async (tx) => {
    const app = await requireApplication(tx, principal.tenantId, applicationId);
    const score = money(committeeScore);
    if (score.isNegative()) {
      throw new ApplicationError('A committee score cannot be negative.');
    }

    await tx.application.update({
      where: { id: applicationId },
      data: { committeeScore: score.toFixed(3) },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'application',
      resourceId: applicationId,
      before: { committeeScore: app.committeeScore?.toFixed(3) ?? null },
      after: { committeeScore: score.toFixed(3) },
    });
  });
}

/**
 * Record the committee's verdict.
 *
 * The rationale is mandatory, in the database as well as here. A REJECT with
 * no reason is precisely the one an applicant will come back and ask about,
 * and the person who can answer will have left.
 *
 * Recording a decision does not issue an offer. ACCEPT moves the application to
 * OFFERED only once a seat has actually been allocated to it — see
 * `offers.ts`. Deciding and having capacity are different questions, and
 * collapsing them is how the legacy build over-admitted.
 */
export async function decideApplication(
  principal: Principal,
  applicationId: string,
  decision: AdmissionDecision,
  note: string,
): Promise<void> {
  requirePermission(principal, 'application.decide');

  if (!note?.trim()) {
    throw new ApplicationError(
      'A committee decision needs a stated rationale. An unexplained refusal is the one ' +
        'the applicant will ask about.',
    );
  }

  await withTenant(principal.tenantId, async (tx) => {
    const app = await requireApplication(tx, principal.tenantId, applicationId);

    if (app.state === 'ENROLLED') {
      throw new ApplicationError(
        `Application ${app.applicationNo} has already produced a student record and cannot ` +
          `be re-decided.`,
      );
    }
    if (app.state === 'DRAFT') {
      throw new ApplicationError(
        `Application ${app.applicationNo} has not been submitted yet.`,
      );
    }

    // WAITLIST and REJECT are terminal enough to set the state here. ACCEPT is
    // not: the application stays UNDER_REVIEW until a seat is allocated, so a
    // committee cannot accept more people than the institution has places for
    // without that showing up as offers that were never issued.
    const state: ApplicationState =
      decision === 'WAITLIST' ? 'WAITLISTED' : decision === 'REJECT' ? 'REJECTED' : app.state;

    await tx.application.update({
      where: { id: applicationId },
      data: {
        decision,
        decisionNote: note.trim(),
        decidedById: principal.userId,
        decidedAt: new Date(),
        state,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: decision === 'REJECT' ? 'REJECT' : 'APPROVE',
      resourceType: 'application',
      resourceId: applicationId,
      before: { state: app.state, decision: app.decision },
      after: { state, decision, note: note.trim() },
    });
  });
}

export async function withdrawApplication(
  principal: Principal,
  applicationId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'application.decide');
  if (!reason?.trim()) {
    throw new ApplicationError('Withdrawing an application needs a stated reason.');
  }

  await withTenant(principal.tenantId, async (tx) => {
    const app = await requireApplication(tx, principal.tenantId, applicationId);
    if (app.state === 'ENROLLED') {
      throw new ApplicationError(
        `Application ${app.applicationNo} has produced a student record. Withdraw the ` +
          `student instead — the lifecycle for that is a status change, not a deletion.`,
      );
    }

    await tx.application.update({
      where: { id: applicationId },
      data: { state: 'WITHDRAWN' },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'application',
      resourceId: applicationId,
      before: { state: app.state },
      after: { state: 'WITHDRAWN', reason: reason.trim() },
    });
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface ApplicationRow {
  id: string;
  applicationNo: string;
  state: ApplicationState;
  decision: AdmissionDecision | null;
  committeeScore: Money | null;
}

export async function requireApplication(
  tx: Tx,
  tenantId: string,
  applicationId: string,
): Promise<ApplicationRow> {
  const app = await tx.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      tenantId: true,
      applicationNo: true,
      state: true,
      decision: true,
      committeeScore: true,
    },
  });
  if (!app || app.tenantId !== tenantId) {
    throw new ApplicationError('That application does not belong to this university.');
  }
  return app;
}

/**
 * Application numbers, allocated under a lock.
 *
 * `<batch code>-<5 digits>`, sequential within the intake. Locked rather than
 * `MAX+1` for the reason Phase 0 established for voucher numbers: two clerks
 * entering applications at the same moment otherwise take the same number, and
 * the unique index turns that into a failed save for whoever committed second.
 */
async function allocateApplicationNo(
  tx: Tx,
  tenantId: string,
  batchId: string,
): Promise<string> {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${tenantId + ':application:' + batchId}::text, 0))
  `;

  const batch = await tx.batch.findFirst({
    where: { id: batchId, tenantId },
    select: { code: true },
  });
  if (!batch) {
    throw new ApplicationError('That intake batch does not belong to this university.');
  }

  const prefix = `${normalizeArabic(batch.code).toUpperCase().replace(/\s+/g, '')}-`;
  const last = await tx.application.findFirst({
    where: { tenantId, applicationNo: { startsWith: prefix } },
    orderBy: { applicationNo: 'desc' },
    select: { applicationNo: true },
  });

  const next = last ? Number(last.applicationNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}
