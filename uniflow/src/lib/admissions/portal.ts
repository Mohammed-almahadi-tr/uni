import 'server-only';
import { randomBytes } from 'node:crypto';
import type { ApplicationState } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { toDateOnly } from '@/lib/ledger/period';
import { insertApplication, ApplicationError } from './applications';
import { screen } from './eligibility';

/**
 * The public admissions portal (SRS REQ-LP-04, Track C2).
 *
 * ## The second sessionless write in the system, and the first that matters
 *
 * C1's enquiry form was the first. Its own docstring says what it deliberately
 * does not do: *"send mail, create an application, or touch the admissions
 * queue"*. This module does the thing that was withheld, so it inherits every
 * one of that module's rules and adds the ones that only apply once an
 * anonymous request can put work in front of a committee:
 *
 *   · **The tenant comes from the resolved host, never from the form.** A
 *     hidden field naming the university would let anyone post into any
 *     university's admissions queue.
 *   · **It runs under `withTenant`** as the app role — NOSUPERUSER,
 *     NOBYPASSRLS. A public write is not a privileged one.
 *   · **The bounds are in the database.** `chk_application_name_bounds`,
 *     `chk_application_certificate_year` and the tracking-token constraints
 *     are in the C2 migration, not only in the form component, because the
 *     form component is not what an attacker uses.
 *   · **Nothing is written until a complete application exists.** There is no
 *     server-side draft row. A multi-step form that persists after step one
 *     would let a script mint application numbers, and an application number
 *     is a scarce, sequential, tenant-visible thing. The steps are carried in
 *     a signed cookie and the row is created and submitted in one
 *     transaction.
 *   · **The applicant is told nothing the committee has not decided.** The
 *     screening runs — an unscreened application is one a committee can pick
 *     up without the verdict in front of them — but its outcome is not
 *     returned here. `screen` advises; the applicant learns the decision when
 *     there is one.
 *
 * ## What the legacy build had
 *
 * No application entity at all. A person became known to the system when a
 * cashier took money from them — its "seats taken" figure was computed from
 * receipt vouchers, so payment *was* admission. There was nowhere to record
 * that somebody applied, nowhere to record that they were refused, and no
 * public surface of any kind: an applicant travelled to the campus to be
 * entered into a system by a clerk, or they did not apply.
 */

/** A batch a member of the public may currently apply into. */
export interface OpenBatch {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  admissionYear: number;
  closesOn: string;
  programmes: Array<{
    id: string;
    code: string;
    nameAr: string;
    nameEn: string;
    facultyNameAr: string;
    facultyNameEn: string;
  }>;
  categories: Array<{ id: string; code: string; nameAr: string; nameEn: string }>;
}

/**
 * Batches whose application window is open today.
 *
 * The window is two dates on the batch rather than an inference from whether
 * seats have been declared. Seats are declared months before applications
 * open, and closing the portal by deactivating the quotas would break the
 * capacity report those same quotas feed.
 *
 * Both dates NULL means closed, which is the default, so a tenant that has
 * not decided to open a portal does not have one.
 *
 * Programmes are the **publicly listed** ones — the same flag C1's explorer
 * reads; a programme the university does not advertise is not one a stranger
 * should name in a ranked choice — **and** the ones with an active seat quota
 * declared for that batch.
 *
 * The second filter is the one that matters. An offer is issued against a seat
 * quota (`issueOffer` takes one), so an application to a programme with no
 * quota in this intake cannot become an offer however good the applicant is.
 * Offering it in the form would take somebody's ranked first choice and spend
 * it on a place that does not exist. "The university has declared seats for
 * this programme in this intake" is precisely what "we are admitting to it
 * this year" means, and it is already recorded.
 */
export async function openBatches(
  tenantId: string,
  on: Date = new Date(),
): Promise<OpenBatch[]> {
  const today = toDateOnly(on);

  return withTenant(tenantId, async (tx) => {
    const batches = await tx.batch.findMany({
      where: {
        tenantId,
        isActive: true,
        applicationsOpenFrom: { lte: today },
        applicationsOpenTo: { gte: today },
      },
      orderBy: { admissionYear: 'desc' },
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        admissionYear: true,
        applicationsOpenTo: true,
      },
    });
    if (batches.length === 0) return [];

    const quotas = await tx.seatQuota.findMany({
      where: {
        tenantId,
        isActive: true,
        batchId: { in: batches.map((b) => b.id) },
        programme: { isActive: true, isPubliclyListed: true },
      },
      select: {
        batchId: true,
        programme: {
          select: {
            id: true,
            code: true,
            nameAr: true,
            nameEn: true,
            faculty: { select: { nameAr: true, nameEn: true } },
          },
        },
      },
    });

    const categories = await tx.admissionCategory.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, code: true, nameAr: true, nameEn: true },
    });
    if (categories.length === 0) return [];

    // A programme appears once per batch however many category quotas it has.
    const byBatch = new Map<string, OpenBatch['programmes']>();
    for (const q of quotas) {
      const list = byBatch.get(q.batchId) ?? [];
      if (list.some((p) => p.id === q.programme.id)) continue;
      list.push({
        id: q.programme.id,
        code: q.programme.code,
        nameAr: q.programme.nameAr,
        nameEn: q.programme.nameEn,
        facultyNameAr: q.programme.faculty.nameAr,
        facultyNameEn: q.programme.faculty.nameEn,
      });
      byBatch.set(q.batchId, list);
    }

    // A batch nobody can complete an application into is not offered. Showing
    // it and failing at the last step is worse than not showing it.
    return batches
      .map((b) => ({
        id: b.id,
        code: b.code,
        nameAr: b.nameAr,
        nameEn: b.nameEn,
        admissionYear: b.admissionYear,
        closesOn: b.applicationsOpenTo!.toISOString().slice(0, 10),
        programmes: (byBatch.get(b.id) ?? []).sort((x, y) => x.code.localeCompare(y.code)),
        categories,
      }))
      .filter((b) => b.programmes.length > 0);
  });
}

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

export interface PublicApplicationInput {
  batchId: string;
  admissionCategoryId: string;
  fullNameAr: string;
  fullNameEn: string;
  nationalId?: string | null;
  passportNo?: string | null;
  dateOfBirth?: string | null;
  nationalityId?: string | null;
  email?: string | null;
  phone?: string | null;
  certificateTypeId?: string | null;
  certificateScore?: string | null;
  certificateYear?: number | null;
  subjects?: string[];
  /** Programme ids in preference order, first choice first. */
  choices: string[];
}

export interface SubmittedApplication {
  applicationNo: string;
  trackingToken: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const DECIMAL = /^\d{1,4}(\.\d{1,3})?$/;

/** Maximum ranked choices. REQ-LP-04 asks for first, second and third. */
export const MAX_CHOICES = 3;

/**
 * Take an application from the public form.
 *
 * Everything is re-validated here even though the wizard validated it a step
 * at a time, because the wizard's state travels in a cookie the browser holds
 * and a cookie the browser holds is a cookie the browser can edit. The steps
 * exist to make the form fillable on a telephone; they are not a control.
 *
 * The whole of it — create, submit, screen — is one transaction. An
 * application that exists in DRAFT because the screening threw is an
 * application a committee never sees and the applicant believes they made.
 */
export async function submitPublicApplication(
  tenantId: string,
  input: PublicApplicationInput,
  now: Date = new Date(),
): Promise<SubmittedApplication> {
  const nameAr = input.fullNameAr?.trim() ?? '';
  const nameEn = input.fullNameEn?.trim() ?? '';
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;

  if (nameAr.length < 2 || nameAr.length > 200 || nameEn.length < 2 || nameEn.length > 200) {
    throw new ApplicationError(
      'Please give your full name in both Arabic and English. The offer letter and the ' +
        'eventual certificate are issued in both.',
    );
  }
  if (!email && !phone) {
    throw new ApplicationError(
      'Please give an email address or a telephone number. An offer that cannot be sent ' +
        'to you is an offer you will not receive.',
    );
  }
  if (email && !EMAIL_RE.test(email)) {
    throw new ApplicationError(`"${email}" does not look like an email address.`);
  }
  if (phone && (phone.length < 6 || phone.length > 32)) {
    throw new ApplicationError('That telephone number does not look right.');
  }
  if (!input.nationalId?.trim() && !input.passportNo?.trim()) {
    throw new ApplicationError(
      'Please give a national ID number or a passport number. It is how the university ' +
        'tells two applicants with the same name apart.',
    );
  }

  // An id the caller omitted is `undefined`, and Prisma reads `{ id: undefined }`
  // as *no filter at all* — so an absent category would have matched the first
  // active row rather than none. Every id is required to be a non-empty string
  // before it reaches a query.
  if (!input.batchId?.trim() || !input.admissionCategoryId?.trim()) {
    throw new ApplicationError('Please choose an intake and how you are applying.');
  }

  const choices = (input.choices ?? []).map((c) => c.trim()).filter(Boolean);
  if (choices.length === 0) {
    throw new ApplicationError('Please choose at least one programme.');
  }
  if (choices.length > MAX_CHOICES) {
    throw new ApplicationError(`Please choose at most ${MAX_CHOICES} programmes.`);
  }
  if (new Set(choices).size !== choices.length) {
    throw new ApplicationError(
      'The same programme is listed twice. Ranking a programme against itself has no meaning.',
    );
  }

  if (input.dateOfBirth && !ISO_DATE.test(input.dateOfBirth)) {
    throw new ApplicationError('That date of birth is not a date.');
  }
  if (input.certificateScore && !DECIMAL.test(input.certificateScore)) {
    throw new ApplicationError('A certificate score is a number.');
  }
  if (
    input.certificateYear != null &&
    (!Number.isInteger(input.certificateYear) ||
      input.certificateYear < 1950 ||
      input.certificateYear > 2100)
  ) {
    throw new ApplicationError('That certificate year is not a year.');
  }

  const today = toDateOnly(now);

  return withTenant(tenantId, async (tx) => {
    // The window is re-checked inside the transaction. A wizard begun on the
    // last open day and submitted after midnight is submitted after the
    // portal closed, and the applicant has to be told that rather than
    // discovering it when nobody replies.
    const batch = await tx.batch.findUnique({
      where: { id: input.batchId },
      select: {
        tenantId: true,
        nameEn: true,
        isActive: true,
        applicationsOpenFrom: true,
        applicationsOpenTo: true,
      },
    });
    if (!batch || batch.tenantId !== tenantId || !batch.isActive) {
      throw new ApplicationError('That intake is not open for applications.');
    }
    if (
      !batch.applicationsOpenFrom ||
      !batch.applicationsOpenTo ||
      batch.applicationsOpenFrom > today ||
      batch.applicationsOpenTo < today
    ) {
      throw new PortalClosedError(
        `Applications for ${batch.nameEn} are not open. Please check the admissions page ` +
          `for the next intake.`,
      );
    }

    await assertBelongs(tx, tenantId, input, choices);

    const trackingToken = newTrackingToken();
    const created = await insertApplication(
      tx,
      tenantId,
      // No actor. Nobody was authenticated, and recording the applicant as
      // their own actor would put an unauthenticated party in the audit
      // chain's actor column as though they held a role.
      null,
      {
        batchId: input.batchId,
        admissionCategoryId: input.admissionCategoryId,
        fullNameAr: nameAr,
        fullNameEn: nameEn,
        nationalId: input.nationalId ?? null,
        passportNo: input.passportNo ?? null,
        dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00.000Z`) : null,
        nationalityId: input.nationalityId ?? null,
        email,
        phone,
        certificateTypeId: input.certificateTypeId ?? null,
        certificateScore: input.certificateScore ?? null,
        certificateYear: input.certificateYear ?? null,
        subjects: input.subjects ?? [],
        choices,
      },
      { source: 'PUBLIC', trackingToken },
    );

    await tx.application.update({
      where: { id: created.id },
      data: { state: 'UNDER_REVIEW', submittedAt: now },
    });

    // Screened on submission, exactly as the staff path does. The outcome is
    // deliberately not returned to the applicant: `screen` advises a
    // committee and does not decide, and telling somebody they failed a rule
    // that a committee may still choose to look past would be telling them a
    // decision that has not been taken.
    await screen(tx, tenantId, created.id);

    await audit(tx, tenantId, {
      actorId: null,
      action: 'UPDATE',
      resourceType: 'application',
      resourceId: created.id,
      before: { state: 'DRAFT' },
      after: { state: 'UNDER_REVIEW', source: 'PUBLIC' },
    });

    return { applicationNo: created.applicationNo, trackingToken };
  });
}

/**
 * Every id in the form belongs to this tenant and is one a stranger may name.
 *
 * The form only ever offers valid options, so this catches a request that did
 * not come from the form — which is the only kind worth catching. Without it,
 * a submitted programme id from another university would be refused by RLS
 * anyway, but as a foreign-key error rather than as a sentence.
 */
async function assertBelongs(
  tx: Tx,
  tenantId: string,
  input: PublicApplicationInput,
  choices: string[],
): Promise<void> {
  const category = await tx.admissionCategory.findFirst({
    where: { id: input.admissionCategoryId, tenantId, isActive: true },
    select: { id: true },
  });
  if (!category) throw new ApplicationError('Please choose how you are applying.');

  // Publicly listed **and** carrying seats in this intake, the same pair the
  // form offers. An application to a programme with no quota cannot become an
  // offer, so accepting one would take somebody's ranked first choice and
  // spend it on a place that does not exist.
  const offered = await tx.seatQuota.findMany({
    where: {
      tenantId,
      isActive: true,
      batchId: input.batchId,
      programmeId: { in: choices },
      programme: { isActive: true, isPubliclyListed: true },
    },
    select: { programmeId: true },
  });
  const offerable = new Set(offered.map((q) => q.programmeId));
  if (choices.some((c) => !offerable.has(c))) {
    throw new ApplicationError(
      'One of the programmes chosen is not open to applications for this intake. ' +
        'Please choose again.',
    );
  }

  if (input.nationalityId) {
    const nationality = await tx.nationality.findFirst({
      where: { id: input.nationalityId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!nationality) throw new ApplicationError('Please choose a nationality from the list.');
  }

  if (input.certificateTypeId) {
    const certificate = await tx.certificateType.findFirst({
      where: { id: input.certificateTypeId, tenantId, isActive: true },
      select: { id: true },
    });
    if (!certificate) {
      throw new ApplicationError('Please choose a certificate from the list.');
    }
  }
}

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

export interface TrackedApplication {
  applicationNo: string;
  fullNameAr: string;
  fullNameEn: string;
  state: ApplicationState;
  submittedAt: string | null;
  batchNameAr: string;
  batchNameEn: string;
  categoryNameAr: string;
  categoryNameEn: string;
  choices: Array<{ rank: number; nameAr: string; nameEn: string }>;
  /**
   * What the applicant submitted, read back.
   *
   * This is their own data returned to the person who submitted it, which is
   * what makes the printed application form possible (REQ-LP-04) — and it is
   * the reason the token is a secret rather than a convenience.
   */
  submitted: {
    nationalId: string | null;
    passportNo: string | null;
    dateOfBirth: string | null;
    nationalityAr: string | null;
    nationalityEn: string | null;
    email: string | null;
    phone: string | null;
    certificateAr: string | null;
    certificateEn: string | null;
    certificateScore: string | null;
    certificateMaxScore: string | null;
    certificateYear: number | null;
    subjects: string[];
  };
  /**
   * Present only once a decision has been recorded. A committee's rationale
   * is written for the committee's own record; what the applicant is told is
   * the verdict.
   */
  decision: string | null;
  /** Present only once an offer has been issued. */
  offer: { acceptBy: string; conditions: string | null; state: string } | null;
}

export class PortalClosedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortalClosedError';
  }
}

/**
 * An applicant checking their own application.
 *
 * Takes the application number **and** the tracking token, and matches on
 * both. The number alone is sequential and guessable — it is printed on a
 * slip and quoted over a telephone — so it identifies rather than
 * authenticates. The token is the secret.
 *
 * Returns null for a wrong pair rather than saying which half was wrong. "No
 * such application" and "wrong token" are the same answer here, because the
 * difference between them is exactly what an enumeration needs.
 */
export async function trackApplication(
  tenantId: string,
  applicationNo: string,
  trackingToken: string,
): Promise<TrackedApplication | null> {
  const no = applicationNo?.trim().toUpperCase() ?? '';
  const token = trackingToken?.trim().toLowerCase() ?? '';
  if (!no || !/^[0-9a-f]{32}$/.test(token)) return null;

  return withTenant(tenantId, async (tx) => {
    const app = await tx.application.findFirst({
      where: { tenantId, applicationNo: no, trackingToken: token, source: 'PUBLIC' },
      select: {
        applicationNo: true,
        fullNameAr: true,
        fullNameEn: true,
        state: true,
        submittedAt: true,
        decision: true,
        nationalId: true,
        passportNo: true,
        dateOfBirth: true,
        email: true,
        phone: true,
        certificateScore: true,
        certificateYear: true,
        subjects: true,
        batch: { select: { nameAr: true, nameEn: true } },
        admissionCategory: { select: { nameAr: true, nameEn: true } },
        nationality: { select: { nameAr: true, nameEn: true } },
        certificateType: { select: { nameAr: true, nameEn: true, maxScore: true } },
        choices: {
          orderBy: { rank: 'asc' },
          select: {
            rank: true,
            programme: { select: { nameAr: true, nameEn: true } },
          },
        },
        offers: {
          where: { state: { in: ['ISSUED', 'ACCEPTED'] } },
          orderBy: { issuedAt: 'desc' },
          take: 1,
          select: { acceptBy: true, conditions: true, state: true },
        },
      },
    });
    if (!app) return null;

    const offer = app.offers[0];
    return {
      applicationNo: app.applicationNo,
      fullNameAr: app.fullNameAr,
      fullNameEn: app.fullNameEn,
      state: app.state,
      submittedAt: app.submittedAt ? app.submittedAt.toISOString().slice(0, 10) : null,
      batchNameAr: app.batch.nameAr,
      batchNameEn: app.batch.nameEn,
      categoryNameAr: app.admissionCategory.nameAr,
      categoryNameEn: app.admissionCategory.nameEn,
      submitted: {
        nationalId: app.nationalId,
        passportNo: app.passportNo,
        dateOfBirth: app.dateOfBirth ? app.dateOfBirth.toISOString().slice(0, 10) : null,
        nationalityAr: app.nationality?.nameAr ?? null,
        nationalityEn: app.nationality?.nameEn ?? null,
        email: app.email,
        phone: app.phone,
        certificateAr: app.certificateType?.nameAr ?? null,
        certificateEn: app.certificateType?.nameEn ?? null,
        certificateScore: app.certificateScore
          ? app.certificateScore.toDecimalPlaces(3).toString()
          : null,
        certificateMaxScore: app.certificateType
          ? app.certificateType.maxScore.toDecimalPlaces(3).toString()
          : null,
        certificateYear: app.certificateYear,
        subjects: app.subjects,
      },
      choices: app.choices.map((c) => ({
        rank: c.rank,
        nameAr: c.programme.nameAr,
        nameEn: c.programme.nameEn,
      })),
      decision: app.decision,
      offer: offer
        ? {
            acceptBy: offer.acceptBy.toISOString().slice(0, 10),
            conditions: offer.conditions,
            state: offer.state,
          }
        : null,
    };
  });
}

/** 32 hex characters, as the registration card's verification token is. Long
 *  enough that the tracking endpoint cannot be walked. */
function newTrackingToken(): string {
  return randomBytes(16).toString('hex');
}

// ---------------------------------------------------------------------------
// Reference data the public form needs
// ---------------------------------------------------------------------------

export interface ApplyOptions {
  nationalities: Array<{ id: string; nameAr: string; nameEn: string }>;
  certificates: Array<{ id: string; nameAr: string; nameEn: string; maxScore: string }>;
}

/**
 * The two lists the form offers that are not on a batch.
 *
 * Deliberately **ungated and unfiltered by anything but active**: a
 * nationality and a certificate type are the contents of two dropdowns on a
 * public page, and there is nothing in either that is not printed on the
 * university's own prospectus.
 *
 * `maxScore` travels with the certificate because the form shows it beside
 * the score box. An applicant entering 4.2 out of 45 into a field the
 * university reads as a percentage is the defect REQ-ADM-CAP-02 exists to
 * prevent, and the cheapest place to prevent it is the label.
 */
export async function applyOptions(tenantId: string): Promise<ApplyOptions> {
  return withTenant(tenantId, async (tx) => {
    const nationalities = await tx.nationality.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ category: 'asc' }, { code: 'asc' }],
      select: { id: true, nameAr: true, nameEn: true },
    });

    const certificates = await tx.certificateType.findMany({
      where: { tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, nameAr: true, nameEn: true, maxScore: true },
    });

    return {
      nationalities,
      certificates: certificates.map((c) => ({
        id: c.id,
        nameAr: c.nameAr,
        nameEn: c.nameEn,
        // Trailing zeros dropped: "out of 100" reads better than "out of
        // 100.000" on a form somebody is filling in on a telephone.
        maxScore: c.maxScore.toDecimalPlaces(3).toString(),
      })),
    };
  });
}
