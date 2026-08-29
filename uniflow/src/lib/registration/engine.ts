import 'server-only';
import { randomBytes } from 'node:crypto';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import {
  feeScheduleForStudent,
  StudentNotPlacedError,
  type ResolvedFeeLine,
  type ResolvedFeeSchedule,
} from '@/lib/academic/fee-matrix';
import { raiseChargesInTx, reverseChargesInTx } from '@/lib/billing/charge';
import { toDateOnly } from '@/lib/ledger/period';
import { idempotent } from '@/lib/idempotency';
import { money, sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import type { RegistrationStatus, StudentStatus } from '@/generated/prisma/enums';

/**
 * The semester registration engine (SRS Module 4, REQ-REG-01/02/03 — Track B4).
 *
 * This is the convergence milestone: the point where Track A's posting engine
 * and Track B's fee matrix meet, and where the single largest defect in the
 * legacy system is closed.
 *
 * ## What `frmStudentRegisteration.vb` actually does
 *
 * It opens a transaction, writes one row to `Registrations`, and then posts a
 * ledger entry that does not agree with it.
 *
 * ```vb
 * cmd.Parameters.AddWithValue("@TuitionFees1", CDbl(Me.ttxtTuitionFeesafterdiscount.Text))
 * ...
 * cmd.Parameters.AddWithValue("@TotalValueOut", CDbl(Me.txtTuitionFees.Text))
 * ```
 * (lines 365 and 477)
 *
 * The registration row records the tuition **net of discount**. Both the debit
 * and the credit posted to `Transactionees` are the **gross**. So for every
 * discounted student the receivable in the ledger exceeds what the
 * registration says is owed, by exactly the discount — and the discount itself
 * reaches no account at all. There is no scholarship expense, no contra
 * revenue, nothing. That divergence is unrecoverable after the fact, which is
 * why `viewDiscount` and `UnivDiscountSummary` exist in the Ribat build: they
 * are attempts to reconstruct a number that was never posted.
 *
 * Four more, in the same handler:
 *
 *   · **The posting is optional.** The whole block sits inside
 *     `If CheckBox1.Checked = False Then` — an unlabelled checkbox. A
 *     registration with no accounting entry is one click away and looks
 *     identical to a correct one. Immediately above it, the *intended* posting
 *     block is commented out in its entirety, annotated *"the debit/cridit
 *     will be inserted from financial system"*, with `'Trans.Commit()`
 *     commented out along with it. Registration and accounting were reconciled
 *     by hand, and any divergence was silent.
 *
 *   · **The voucher number comes from the wrong table.**
 *     `Select IsNull(Max(MoveNo),0) from Transactions` (line 329), written
 *     into `Transactionees` (line 470). `MAX+1` on a table that does not
 *     contain the rows being numbered, on an isolation level that does not
 *     prevent two registrars reading the same maximum.
 *
 *   · **The duplicate check cannot work.** `ValidateRegisteration`
 *     (lines 171-197) runs `Select Count(*) From Registrations Where
 *     AcademicYear=.. And StudentIndex=..` on `cnn1` — a *second
 *     connection*, outside the transaction the insert then runs in. The `And Semester=..` predicate is
 *     commented out. So it refuses a legitimate second-semester registration,
 *     and catches nothing at all when two people press Save together.
 *
 *   · **The instalment remainder is always zero.** `Calculate()` (line 847)
 *     sets `TxtRem.Text = CInt(y) - CInt(ttxtTuitionFeesafterdiscount.Text)`
 *     one line after assigning `y` that same value — and `CInt` truncates money
 *     to whole pounds on the way through.
 *
 * ## What this module does instead
 *
 * One function, `registerStudent`, inside one `withTenant` transaction:
 *
 *   1. resolves the student's placement and the fee-schedule **version** in
 *      force on the registration date (B1);
 *   2. prices the mandatory lines, adds the optional ones asked for, and
 *      skips the annual and one-off items this student has already been
 *      billed;
 *   3. applies per-item discounts, and parks the registration in
 *      `PENDING_APPROVAL` — posting nothing — if the total discount is above
 *      the tenant's threshold;
 *   4. writes the registration and its lines, and raises the charges through
 *      the Phase 0 posting engine in the **same transaction**, carrying an
 *      idempotency key and rejected outright if the period is closed.
 *
 * Either both the registration and its balanced double entry exist, or
 * neither does. That sentence is the whole of B4.
 */

export class RegistrationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistrationError';
  }
}

/** Raised when the term already holds a live registration for this student. */
export class DuplicateRegistrationError extends RegistrationError {
  constructor(
    readonly studentNo: string,
    readonly termName: string,
    readonly registrationNo: string,
  ) {
    super(
      `${studentNo} is already registered for ${termName} on ${registrationNo}. ` +
        `Cancel that registration before raising another.`,
    );
    this.name = 'DuplicateRegistrationError';
  }
}

/**
 * Statuses that may register. `ADMITTED` is included deliberately: the first
 * registration of a newly admitted student is what makes them `ACTIVE`, and
 * refusing it would make the first term of every intake unregistrable.
 */
const REGISTRABLE: readonly StudentStatus[] = ['ADMITTED', 'ACTIVE'];

export interface DiscountInput {
  feeItemId: string;
  /** A flat reduction on this item. Mutually exclusive with `pct`. */
  amount?: MoneyInput;
  /** A percentage of the item's price, 0-100. Mutually exclusive with `amount`. */
  pct?: MoneyInput;
}

export interface RegisterStudentInput {
  studentId: string;
  academicTermId: string;
  /** Year of study, 1..programme duration. The legacy `Class` column. */
  levelYear: number;
  /** Defaults to today. Determines both the fee version and the fiscal period. */
  registrationDate?: Date;
  /**
   * Optional fee items to bill alongside the mandatory set — hostel,
   * transport. A schedule marks these `isMandatory: false`; nothing else on
   * the schedule can be declined.
   */
  optionalFeeItemIds?: string[];
  discounts?: DiscountInput[];
  /** Required as soon as any discount is applied. */
  discountReason?: string;
  /** Optional instalment plan over the term, e.g. `[50, 25, 25]` on 3 dates. */
  instalments?: { dueDates: Date[]; weights?: MoneyInput[] };
}

export interface PricedLine {
  feeItemId: string;
  feeItemCode: string;
  feeItemNameAr: string;
  feeItemNameEn: string;
  isMandatory: boolean;
  sortOrder: number;
  gross: string;
  discount: string;
  net: string;
}

export interface RegistrationQuote {
  studentId: string;
  studentNo: string;
  studentNameAr: string;
  studentNameEn: string;
  programmeId: string;
  programmeNameEn: string;
  batchId: string;
  admissionCategoryId: string;
  academicYearId: string;
  academicTermId: string;
  termNameEn: string;
  registrationDate: string;
  feeScheduleId: string;
  feeScheduleVersionNo: number;
  /** True when the any-nationality fallback row priced this student. */
  usedFallback: boolean;
  currency: string;
  lines: PricedLine[];
  /** Items on the schedule that were not billed, and why. */
  skipped: Array<{ feeItemCode: string; reason: string }>;
  gross: string;
  discount: string;
  net: string;
  discountPct: string;
  /** Above the tenant threshold: the registration will not post until signed. */
  requiresApproval: boolean;
  approvalThresholdPct: string;
}

export interface RegisteredResult extends RegistrationQuote {
  registrationId: string;
  registrationNo: string;
  status: RegistrationStatus;
  /** Null while `PENDING_APPROVAL` — nothing has reached the ledger yet. */
  voucherRef: string | null;
  headerId: string | null;
  instalmentPlanId: string | null;
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

/**
 * What this registration would cost, without creating anything.
 *
 * The screen calls this on every change — a student lookup, a different term,
 * a discount typed in — so that the figures the registrar signs off are the
 * figures that post. `registerStudent` runs the identical code path.
 */
export async function previewRegistration(
  principal: Principal,
  input: RegisterStudentInput,
): Promise<RegistrationQuote> {
  requirePermission(principal, 'registration.read');
  return withTenant(principal.tenantId, (tx) => quote(tx, principal, input));
}

async function quote(
  tx: Tx,
  principal: Principal,
  input: RegisterStudentInput,
): Promise<RegistrationQuote> {
  const { tenantId } = principal;
  const docDate = toDateOnly(input.registrationDate ?? new Date());

  const student = await tx.student.findUnique({
    where: { id: input.studentId },
    select: {
      id: true,
      tenantId: true,
      studentNo: true,
      fullNameAr: true,
      fullNameEn: true,
      status: true,
      isActive: true,
      programmeId: true,
      batchId: true,
      admissionCategoryId: true,
    },
  });
  if (!student || student.tenantId !== tenantId) {
    throw new RegistrationError('That student does not belong to this university.');
  }
  if (!student.isActive) {
    throw new RegistrationError(
      `${student.studentNo} is not an active record. Reinstate the student before registering them.`,
    );
  }
  if (!REGISTRABLE.includes(student.status)) {
    throw new RegistrationError(
      `${student.studentNo} is ${student.status.toLowerCase().replace(/_/g, ' ')} and cannot ` +
        `register. Change the student's status first, so that the reason is on the record.`,
    );
  }

  const term = await tx.academicTerm.findUnique({
    where: { id: input.academicTermId },
    select: {
      id: true,
      tenantId: true,
      academicYearId: true,
      nameEn: true,
      startDate: true,
      endDate: true,
      registrationClosesOn: true,
      status: true,
      academicYear: { select: { id: true, code: true, status: true } },
    },
  });
  if (!term || term.tenantId !== tenantId) {
    throw new RegistrationError('That academic term does not belong to this university.');
  }
  if (term.status === 'CLOSED') {
    throw new RegistrationError(
      `${term.nameEn} is closed. Registering into a closed term is how a prior year ` +
        `silently gains students.`,
    );
  }
  if (term.registrationClosesOn && docDate > term.registrationClosesOn) {
    throw new RegistrationError(
      `Registration for ${term.nameEn} closed on ` +
        `${iso(term.registrationClosesOn)}. A late registration is a decision somebody ` +
        `has to take, not a date the form quietly accepts.`,
    );
  }
  if (docDate > term.endDate) {
    throw new RegistrationError(
      `${iso(docDate)} falls after ${term.nameEn} ends on ${iso(term.endDate)}.`,
    );
  }

  // The four dimensions. `feeScheduleForStudent` throws StudentNotPlacedError
  // naming which are missing, which is a better sentence than anything this
  // function could construct.
  const schedule = await feeScheduleForStudent(tx, tenantId, student.id, docDate);
  if (!schedule) {
    throw new RegistrationError(
      `No approved fee schedule prices this student's programme, batch and admission ` +
        `category on ${iso(docDate)}. Publish one before registering them — a registration ` +
        `billed against nothing is the state the legacy batch was left in whenever a save ` +
        `failed halfway.`,
    );
  }

  const programme = await tx.programme.findUniqueOrThrow({
    where: { id: student.programmeId! },
    select: {
      id: true,
      nameEn: true,
      durationYears: true,
      faculty: { select: { costCenterId: true } },
    },
  });

  if (!Number.isInteger(input.levelYear) || input.levelYear < 1) {
    throw new RegistrationError('The year of study must be a whole number of 1 or more.');
  }
  if (input.levelYear > programme.durationYears) {
    throw new RegistrationError(
      `Year ${input.levelYear} is beyond ${programme.nameEn}, which runs ` +
        `${programme.durationYears} years. The legacy Class column was free text and ` +
        `accepted anything.`,
    );
  }

  const optional = new Set(input.optionalFeeItemIds ?? []);
  const alreadyBilled = await priorlyBilledItems(tx, tenantId, student.id, term.academicYearId);

  const discountBy = new Map<string, DiscountInput>();
  for (const d of input.discounts ?? []) {
    if (discountBy.has(d.feeItemId)) {
      throw new RegistrationError(
        'The same fee item carries two discounts. Enter one, for the combined amount.',
      );
    }
    discountBy.set(d.feeItemId, d);
  }

  const lines: PricedLine[] = [];
  const skipped: RegistrationQuote['skipped'] = [];

  for (const l of [...schedule.lines].sort((a, b) => a.sortOrder - b.sortOrder)) {
    const reason = skipReason(l, optional, alreadyBilled);
    if (reason) {
      skipped.push({ feeItemCode: l.feeItemCode, reason });
      continue;
    }

    const gross = toStorage(l.amount);
    const discount = resolveDiscount(discountBy.get(l.feeItemId), gross, l.feeItemCode);
    discountBy.delete(l.feeItemId);

    lines.push({
      feeItemId: l.feeItemId,
      feeItemCode: l.feeItemCode,
      feeItemNameAr: l.feeItemNameAr,
      feeItemNameEn: l.feeItemNameEn,
      isMandatory: l.isMandatory,
      sortOrder: l.sortOrder,
      gross: gross.toFixed(4),
      discount: discount.toFixed(4),
      net: gross.minus(discount).toFixed(4),
    });
  }

  if (discountBy.size > 0) {
    const codes = [...discountBy.keys()].join(', ');
    throw new RegistrationError(
      `A discount was entered against a fee item this registration does not bill (${codes}). ` +
        `A discount on nothing reduces nothing, and looks on the form as though it did.`,
    );
  }

  if (lines.length === 0) {
    throw new RegistrationError(
      `Every item on fee schedule version ${schedule.versionNo} has already been billed to ` +
        `${student.studentNo} or was declined. There is nothing to charge for ${term.nameEn}.`,
    );
  }

  const gross = sum(lines.map((l) => l.gross));
  const discount = sum(lines.map((l) => l.discount));
  const net = gross.minus(discount);

  if (!discount.isZero() && !input.discountReason?.trim()) {
    throw new RegistrationError(
      'A discount needs a stated reason. `DiscDescr` was a free-text column nothing ' +
        'required, which is why the legacy build cannot say why any individual student ' +
        'paid less than the published fee.',
    );
  }

  const discountPct = gross.isZero()
    ? ZERO
    : discount.dividedBy(gross).times(100).toDecimalPlaces(4);

  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { discountApprovalThresholdPct: true },
  });

  return {
    studentId: student.id,
    studentNo: student.studentNo,
    studentNameAr: student.fullNameAr,
    studentNameEn: student.fullNameEn,
    programmeId: programme.id,
    programmeNameEn: programme.nameEn,
    batchId: student.batchId!,
    admissionCategoryId: student.admissionCategoryId!,
    academicYearId: term.academicYearId,
    academicTermId: term.id,
    termNameEn: term.nameEn,
    registrationDate: iso(docDate),
    feeScheduleId: schedule.feeScheduleId,
    feeScheduleVersionNo: schedule.versionNo,
    usedFallback: schedule.usedFallback,
    currency: schedule.currency,
    lines,
    skipped,
    gross: gross.toFixed(4),
    discount: discount.toFixed(4),
    net: net.toFixed(4),
    discountPct: discountPct.toFixed(4),
    requiresApproval: discountPct.greaterThan(tenant.discountApprovalThresholdPct),
    approvalThresholdPct: tenant.discountApprovalThresholdPct.toFixed(4),
  };
}

/**
 * Why a line on the schedule is not being billed this term.
 *
 * The legacy screen had exactly two fee boxes and charged both on every
 * registration, so a student in their fifth year paid the one-off admission
 * fee five times. Recurrence is on the catalogue and on the schedule line;
 * this is where it finally means something.
 */
function skipReason(
  line: ResolvedFeeLine,
  optional: Set<string>,
  alreadyBilled: BilledHistory,
): string | null {
  if (!line.isMandatory && !optional.has(line.feeItemId)) {
    return 'optional, and not taken';
  }
  if (line.recurrence === 'ONE_OFF' && alreadyBilled.ever.has(line.feeItemId)) {
    return 'one-off, and already billed to this student';
  }
  if (line.recurrence === 'PER_YEAR' && alreadyBilled.thisYear.has(line.feeItemId)) {
    return 'annual, and already billed for this academic year';
  }
  return null;
}

interface BilledHistory {
  ever: Set<string>;
  thisYear: Set<string>;
}

async function priorlyBilledItems(
  tx: Tx,
  tenantId: string,
  studentId: string,
  academicYearId: string,
): Promise<BilledHistory> {
  const rows = await tx.registrationLine.findMany({
    where: {
      tenantId,
      registration: { studentId, status: { not: 'CANCELLED' } },
    },
    select: {
      feeItemId: true,
      registration: { select: { academicYearId: true } },
    },
  });

  const ever = new Set<string>();
  const thisYear = new Set<string>();
  for (const r of rows) {
    ever.add(r.feeItemId);
    if (r.registration.academicYearId === academicYearId) thisYear.add(r.feeItemId);
  }
  return { ever, thisYear };
}

function resolveDiscount(
  input: DiscountInput | undefined,
  gross: Money,
  feeItemCode: string,
): Money {
  if (!input) return ZERO;

  if (input.amount != null && input.pct != null) {
    throw new RegistrationError(
      `The discount on ${feeItemCode} is given as both an amount and a percentage. ` +
        `Choose one — the legacy form held a percentage and billed an amount, and the two ` +
        `disagreed.`,
    );
  }

  let discount: Money;
  if (input.pct != null) {
    const pct = money(input.pct);
    if (pct.isNegative() || pct.greaterThan(100)) {
      throw new RegistrationError(
        `A discount of ${pct.toFixed(2)}% on ${feeItemCode} is not a percentage.`,
      );
    }
    discount = toStorage(gross.times(pct).dividedBy(100));
  } else {
    discount = toStorage(input.amount ?? 0);
  }

  if (discount.isNegative()) {
    throw new RegistrationError(`A discount on ${feeItemCode} cannot be negative.`);
  }
  if (discount.greaterThan(gross)) {
    throw new RegistrationError(
      `The discount of ${discount.toFixed(2)} on ${feeItemCode} exceeds the ` +
        `${gross.toFixed(2)} charged. A discount cannot turn a bill into a payment.`,
    );
  }
  return discount;
}

// ---------------------------------------------------------------------------
// Registering
// ---------------------------------------------------------------------------

/**
 * Register a student for a term, and bill them for it — atomically.
 *
 * Carries an idempotency key for the same reason cashiering does: this is a
 * slow multi-step form over an unreliable link, and billing a student twice
 * for a term is not a small mistake. A replay returns the original
 * registration and creates nothing.
 */
export async function registerStudent(
  principal: Principal,
  input: RegisterStudentInput,
  idempotencyKey?: string,
): Promise<RegisteredResult> {
  requirePermission(principal, 'registration.create');
  if ((input.discounts ?? []).length > 0) {
    requirePermission(principal, 'discount.apply');
  }

  const run = (tx: Tx) => registerInTx(tx, principal, input);

  if (!idempotencyKey) {
    return withTenant(principal.tenantId, run);
  }
  const { result } = await idempotent(
    principal.tenantId,
    idempotencyKey,
    'registration.register',
    {
      ...input,
      registrationDate: toDateOnly(input.registrationDate ?? new Date()).toISOString(),
      actor: principal.userId,
    },
    run,
  );
  return result;
}

async function registerInTx(
  tx: Tx,
  principal: Principal,
  input: RegisterStudentInput,
): Promise<RegisteredResult> {
  const { tenantId } = principal;
  const q = await quote(tx, principal, input);

  await refuseDuplicate(tx, tenantId, q);

  const registrationNo = await allocateRegistrationNo(tx, tenantId, q.academicYearId);

  const registration = await tx.semesterRegistration.create({
    data: {
      tenantId,
      registrationNo,
      studentId: q.studentId,
      programmeId: q.programmeId,
      batchId: q.batchId,
      admissionCategoryId: q.admissionCategoryId,
      academicYearId: q.academicYearId,
      academicTermId: q.academicTermId,
      levelYear: input.levelYear,
      registrationDate: toDateOnly(input.registrationDate ?? new Date()),
      feeScheduleId: q.feeScheduleId,
      feeScheduleVersionNo: q.feeScheduleVersionNo,
      currency: q.currency,
      grossAmount: q.gross,
      discountAmount: q.discount,
      netAmount: q.net,
      discountPct: q.discountPct,
      discountReason: input.discountReason?.trim() || null,
      // Nothing posts while a discount is awaiting its second signature.
      status: q.requiresApproval ? 'PENDING_APPROVAL' : 'REGISTERED',
      verifyToken: newVerifyToken(),
      createdById: principal.userId,
      lines: {
        create: q.lines.map((l, i) => ({
          tenantId,
          feeItemId: l.feeItemId,
          grossAmount: l.gross,
          discountAmount: l.discount,
          netAmount: l.net,
          isMandatory: l.isMandatory,
          sortOrder: l.sortOrder || i,
        })),
      },
    },
    select: { id: true, status: true },
  });

  await audit(tx, tenantId, {
    actorId: principal.userId,
    action: 'INSERT',
    resourceType: 'semester_registration',
    resourceId: registration.id,
    after: {
      registrationNo,
      studentNo: q.studentNo,
      term: q.termNameEn,
      levelYear: input.levelYear,
      feeScheduleVersion: q.feeScheduleVersionNo,
      gross: q.gross,
      discount: q.discount,
      net: q.net,
      discountPct: q.discountPct,
      status: registration.status,
      lines: q.lines.length,
    },
  });

  if (registration.status === 'PENDING_APPROVAL') {
    return {
      ...q,
      registrationId: registration.id,
      registrationNo,
      status: registration.status,
      voucherRef: null,
      headerId: null,
      instalmentPlanId: null,
    };
  }

  const posted = await billRegistration(tx, principal, registration.id);
  const planId = await scheduleInstalments(tx, principal, registration.id, input);

  return {
    ...q,
    registrationId: registration.id,
    registrationNo,
    status: 'REGISTERED',
    voucherRef: posted.voucherRef,
    headerId: posted.headerId,
    instalmentPlanId: planId,
  };
}

/**
 * Raise the ledger entry for a registration, from the lines already agreed.
 *
 * Deliberately reads the lines back out of the database rather than taking
 * them as an argument: when a pending registration is approved days later,
 * what posts must be what was approved, not a fresh resolution of a fee matrix
 * that may since have been revised.
 */
async function billRegistration(
  tx: Tx,
  principal: Principal,
  registrationId: string,
): Promise<{ headerId: string; voucherRef: string }> {
  const { tenantId } = principal;

  const reg = await tx.semesterRegistration.findUniqueOrThrow({
    where: { id: registrationId },
    select: {
      id: true,
      registrationNo: true,
      studentId: true,
      registrationDate: true,
      academicTermId: true,
      programme: { select: { faculty: { select: { costCenterId: true } } } },
      academicTerm: { select: { nameEn: true, startDate: true, endDate: true } },
      lines: {
        orderBy: { sortOrder: 'asc' },
        select: { id: true, feeItemId: true, grossAmount: true, discountAmount: true },
      },
    },
  });

  // The faculty's cost centre is the right answer for a tuition line: the
  // shipped tuition revenue account requires one and the catalogue item
  // deliberately leaves it unset, because only registration knows the faculty.
  const costCenterId = reg.programme.faculty.costCenterId ?? undefined;

  const raised = await raiseChargesInTx(tx, principal, {
    studentId: reg.studentId,
    docDate: reg.registrationDate,
    description: `Registration ${reg.registrationNo} — ${reg.academicTerm.nameEn}`,
    termLabel: reg.academicTerm.nameEn,
    registrationId: reg.id,
    sourceModule: 'REGISTRATION',
    sourceRef: reg.id,
    // Deferrable items are recognised across the fiscal periods the TERM
    // spans, not the one the registration falls in. The legacy system
    // recognised a full year's tuition on registration day.
    recognitionPeriodIds: await periodsSpanning(
      tx,
      tenantId,
      reg.academicTerm.startDate,
      reg.academicTerm.endDate,
    ),
    lines: reg.lines.map((l) => ({
      feeItemId: l.feeItemId,
      grossAmount: l.grossAmount,
      discountAmount: l.discountAmount,
      costCenterId,
    })),
  });

  // Attach each charge back to the line that priced it. `raiseChargesInTx`
  // returns them in the order it was given.
  for (const [i, line] of reg.lines.entries()) {
    await tx.registrationLine.update({
      where: { id: line.id },
      data: { chargeId: raised.chargeIds[i] },
    });
  }

  await tx.semesterRegistration.update({
    where: { id: reg.id },
    data: { status: 'REGISTERED', postedHeaderId: raised.headerId },
  });

  await audit(tx, tenantId, {
    actorId: principal.userId,
    action: 'POST',
    resourceType: 'semester_registration',
    resourceId: reg.id,
    after: {
      registrationNo: reg.registrationNo,
      voucherRef: raised.voucherRef,
      totalNet: raised.totalNet,
      totalGross: raised.totalGross,
      totalDiscount: raised.totalDiscount,
    },
  });

  return { headerId: raised.headerId, voucherRef: raised.voucherRef };
}

// ---------------------------------------------------------------------------
// Discount approval (REQ-SPN-04)
// ---------------------------------------------------------------------------

/**
 * Approve the discount on a pending registration, which posts it.
 *
 * Two signatures, and they are two people: the SoD matrix already refuses one
 * role holding both `discount.apply` and `discount.approve`, and this refuses
 * one person approving their own registration even if they somehow hold both.
 */
export async function approveRegistrationDiscount(
  principal: Principal,
  registrationId: string,
  note?: string,
): Promise<{ registrationNo: string; voucherRef: string; headerId: string }> {
  requirePermission(principal, 'discount.approve');

  return withTenant(principal.tenantId, async (tx) => {
    const reg = await tx.semesterRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        tenantId: true,
        registrationNo: true,
        status: true,
        createdById: true,
        discountPct: true,
        discountAmount: true,
        student: { select: { studentNo: true } },
      },
    });
    if (!reg || reg.tenantId !== principal.tenantId) {
      throw new RegistrationError('That registration does not belong to this university.');
    }
    if (reg.status !== 'PENDING_APPROVAL') {
      throw new RegistrationError(
        `Registration ${reg.registrationNo} is ${reg.status.toLowerCase().replace(/_/g, ' ')} ` +
          `and is not awaiting approval.`,
      );
    }
    assertNotSelfApproval(principal, reg.createdById, reg.registrationNo);

    await tx.semesterRegistration.update({
      where: { id: reg.id },
      data: { discountApprovedById: principal.userId, discountApprovedAt: new Date() },
    });

    const posted = await billRegistration(tx, principal, reg.id);

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'semester_registration',
      resourceId: reg.id,
      after: {
        registrationNo: reg.registrationNo,
        studentNo: reg.student.studentNo,
        discountPct: reg.discountPct.toFixed(4),
        discountAmount: reg.discountAmount.toFixed(4),
        voucherRef: posted.voucherRef,
        note: note?.trim() || null,
      },
    });

    return { registrationNo: reg.registrationNo, ...posted };
  });
}

// ---------------------------------------------------------------------------
// Cancellation (REQ-REG-03)
// ---------------------------------------------------------------------------

/**
 * Cancel a registration.
 *
 * Never edits and never deletes: a posted registration is unwound by a single
 * **linked** reversing voucher against the one that billed it, and the
 * original stays on file with its reversal stamp. Money already collected
 * against the cancelled charges becomes a credit balance on the student
 * account — it is neither kept nor silently refunded.
 *
 * A registration still awaiting approval has posted nothing, so cancelling it
 * is a status change and a reason.
 */
export async function cancelRegistration(
  principal: Principal,
  registrationId: string,
  reason: string,
  opts: { reversalDate?: Date } = {},
): Promise<{
  registrationNo: string;
  voucherRef: string | null;
  freedToCredit: string;
}> {
  requirePermission(principal, 'registration.cancel');

  const trimmed = reason?.trim();
  if (!trimmed) {
    throw new RegistrationError(
      'Cancelling a registration requires a stated reason. It is a reversal in the ledger, ' +
        'and a reversal without a reason is indistinguishable from a mistake.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const reg = await tx.semesterRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        tenantId: true,
        registrationNo: true,
        status: true,
        postedHeaderId: true,
        netAmount: true,
        studentId: true,
        student: { select: { studentNo: true } },
        academicTerm: { select: { nameEn: true } },
        lines: { select: { chargeId: true } },
      },
    });
    if (!reg || reg.tenantId !== principal.tenantId) {
      throw new RegistrationError('That registration does not belong to this university.');
    }
    if (reg.status === 'CANCELLED') {
      throw new RegistrationError(
        `Registration ${reg.registrationNo} has already been cancelled.`,
      );
    }

    let voucherRef: string | null = null;
    let reversalHeaderId: string | null = null;
    let freedToCredit = '0.0000';

    const chargeIds = reg.lines
      .map((l) => l.chargeId)
      .filter((id): id is string => id !== null);

    if (reg.status === 'REGISTERED') {
      const reversed = await reverseChargesInTx(tx, principal, chargeIds, trimmed, {
        reversalDate: opts.reversalDate,
        reversesHeaderId: reg.postedHeaderId,
        description:
          `Cancellation of registration ${reg.registrationNo} — ` +
          `${reg.student.studentNo}, ${reg.academicTerm.nameEn}: ${trimmed}`,
      });
      voucherRef = reversed.voucherRef;
      reversalHeaderId = reversed.headerId;
      freedToCredit = reversed.freedToCredit;
    }

    // Any instalment plan for the term stops being a plan for anything.
    await tx.instalmentPlan.updateMany({
      where: {
        tenantId: principal.tenantId,
        studentId: reg.studentId,
        termLabel: reg.academicTerm.nameEn,
        isActive: true,
      },
      data: { isActive: false },
    });

    await tx.semesterRegistration.update({
      where: { id: reg.id },
      data: {
        status: 'CANCELLED',
        reversalHeaderId,
        cancelledById: principal.userId,
        cancelledAt: new Date(),
        cancellationReason: trimmed,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REVERSE',
      resourceType: 'semester_registration',
      resourceId: reg.id,
      before: { status: reg.status, netAmount: reg.netAmount.toFixed(4) },
      after: {
        registrationNo: reg.registrationNo,
        studentNo: reg.student.studentNo,
        reason: trimmed,
        voucherRef,
        freedToCredit,
      },
    });

    return { registrationNo: reg.registrationNo, voucherRef, freedToCredit };
  });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface RegistrationSummary {
  id: string;
  registrationNo: string;
  studentNo: string;
  studentNameAr: string;
  studentNameEn: string;
  programmeNameEn: string;
  termNameEn: string;
  levelYear: number;
  registrationDate: string;
  status: RegistrationStatus;
  currency: string;
  gross: string;
  discount: string;
  net: string;
  discountPct: string;
  voucherRef: string | null;
}

export async function listRegistrations(
  principal: Principal,
  filter: {
    studentId?: string;
    academicTermId?: string;
    programmeId?: string;
    batchId?: string;
    status?: RegistrationStatus;
  } = {},
): Promise<RegistrationSummary[]> {
  requirePermission(principal, 'registration.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.semesterRegistration.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(filter.studentId ? { studentId: filter.studentId } : {}),
        ...(filter.academicTermId ? { academicTermId: filter.academicTermId } : {}),
        ...(filter.programmeId ? { programmeId: filter.programmeId } : {}),
        ...(filter.batchId ? { batchId: filter.batchId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: [{ registrationDate: 'desc' }, { registrationNo: 'desc' }],
      select: {
        id: true,
        registrationNo: true,
        levelYear: true,
        registrationDate: true,
        status: true,
        currency: true,
        grossAmount: true,
        discountAmount: true,
        netAmount: true,
        discountPct: true,
        student: { select: { studentNo: true, fullNameAr: true, fullNameEn: true } },
        programme: { select: { nameEn: true } },
      },
    });

    const termNames = await termNamesFor(tx, rows.map((r) => r.id));
    const voucherRefs = await voucherRefsFor(tx, rows.map((r) => r.id));

    return rows.map((r) => ({
      id: r.id,
      registrationNo: r.registrationNo,
      studentNo: r.student.studentNo,
      studentNameAr: r.student.fullNameAr,
      studentNameEn: r.student.fullNameEn,
      programmeNameEn: r.programme.nameEn,
      termNameEn: termNames.get(r.id) ?? '',
      levelYear: r.levelYear,
      registrationDate: iso(r.registrationDate),
      status: r.status,
      currency: r.currency.trim(),
      gross: r.grossAmount.toFixed(4),
      discount: r.discountAmount.toFixed(4),
      net: r.netAmount.toFixed(4),
      discountPct: r.discountPct.toFixed(4),
      voucherRef: voucherRefs.get(r.id) ?? null,
    }));
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

async function refuseDuplicate(
  tx: Tx,
  tenantId: string,
  q: RegistrationQuote,
): Promise<void> {
  // The unique index is the guarantee — this lookup exists to say something
  // useful rather than surfacing a constraint name. Under a genuine race the
  // index wins, and the second transaction fails; that is the correct outcome
  // and the one the legacy check-then-act on a second connection could not
  // produce.
  const existing = await tx.semesterRegistration.findFirst({
    where: {
      tenantId,
      studentId: q.studentId,
      academicTermId: q.academicTermId,
      status: { not: 'CANCELLED' },
    },
    select: { registrationNo: true },
  });
  if (existing) {
    throw new DuplicateRegistrationError(
      q.studentNo,
      q.termNameEn,
      existing.registrationNo,
    );
  }
}

/**
 * `REG-<year code>-00001`, allocated under an advisory lock.
 *
 * Not `MAX+1` on an autocommit connection, and not a counter read from a
 * different table than the one being written — both of which the legacy
 * registration screen did.
 */
async function allocateRegistrationNo(
  tx: Tx,
  tenantId: string,
  academicYearId: string,
): Promise<string> {
  await tx.$executeRaw`
    SELECT pg_advisory_xact_lock(hashtextextended(${tenantId + ':registration:' + academicYearId}::text, 0))
  `;

  const year = await tx.academicYear.findFirst({
    where: { id: academicYearId, tenantId },
    select: { code: true },
  });
  if (!year) {
    throw new RegistrationError('That academic year does not belong to this university.');
  }

  const prefix = `REG-${year.code.toUpperCase().replace(/\s+/g, '')}-`;
  const last = await tx.semesterRegistration.findFirst({
    where: { tenantId, registrationNo: { startsWith: prefix } },
    orderBy: { registrationNo: 'desc' },
    select: { registrationNo: true },
  });

  const next = last ? Number(last.registrationNo.slice(prefix.length)) + 1 : 1;
  return `${prefix}${String(next).padStart(5, '0')}`;
}

/** 32 hex characters. Long enough that the verification endpoint cannot be walked. */
function newVerifyToken(): string {
  return randomBytes(16).toString('hex');
}

/**
 * The fiscal periods a term runs across, in order.
 *
 * Deliberately not the academic year's periods and not the registration
 * date's: an academic year straddles two fiscal years, and tuition for a term
 * is earned over that term.
 */
async function periodsSpanning(
  tx: Tx,
  tenantId: string,
  from: Date,
  to: Date,
): Promise<string[]> {
  const periods = await tx.fiscalPeriod.findMany({
    where: {
      fiscalYear: { tenantId },
      startDate: { lte: toDateOnly(to) },
      endDate: { gte: toDateOnly(from) },
    },
    orderBy: { startDate: 'asc' },
    select: { id: true },
  });
  // Empty falls back inside `raiseChargesInTx` to the period the registration
  // date lands in, which recognises immediately — wrong for a term, but better
  // than refusing to register anyone because next fiscal year is not open yet.
  return periods.map((p) => p.id);
}

async function scheduleInstalments(
  tx: Tx,
  principal: Principal,
  registrationId: string,
  input: RegisterStudentInput,
): Promise<string | null> {
  const dueDates = input.instalments?.dueDates ?? [];
  if (dueDates.length === 0) return null;

  const reg = await tx.semesterRegistration.findUniqueOrThrow({
    where: { id: registrationId },
    select: {
      studentId: true,
      netAmount: true,
      academicTerm: { select: { nameEn: true } },
    },
  });

  // One live plan per student per term, so "what is due" has one answer.
  await tx.instalmentPlan.updateMany({
    where: {
      tenantId: principal.tenantId,
      studentId: reg.studentId,
      termLabel: reg.academicTerm.nameEn,
      isActive: true,
    },
    data: { isActive: false },
  });

  const weights = input.instalments?.weights;
  const amounts = splitExactly(reg.netAmount, dueDates.length, weights);

  const plan = await tx.instalmentPlan.create({
    data: {
      tenantId: principal.tenantId,
      studentId: reg.studentId,
      termLabel: reg.academicTerm.nameEn,
      totalAmount: reg.netAmount,
      createdById: principal.userId,
      instalments: {
        create: dueDates.map((d, i) => ({
          seq: i + 1,
          dueDate: toDateOnly(d),
          amount: amounts[i],
        })),
      },
    },
    select: { id: true },
  });

  await audit(tx, principal.tenantId, {
    actorId: principal.userId,
    action: 'INSERT',
    resourceType: 'instalment_plan',
    resourceId: plan.id,
    after: {
      registrationId,
      termLabel: reg.academicTerm.nameEn,
      total: reg.netAmount.toFixed(4),
      instalments: dueDates.length,
    },
  });

  return plan.id;
}

/**
 * Split a total into parts that add back to it exactly.
 *
 * The residue lands on the first instalment, which is the one paid at
 * registration. `TxtRem` in the legacy form was computed as a difference
 * between a value and itself and was therefore always zero, then truncated to
 * whole pounds by `CInt` for good measure.
 */
function splitExactly(total: Money, parts: number, weights?: MoneyInput[]): Money[] {
  const w = weights && weights.length > 0 ? weights.map((x) => money(x)) : null;
  if (w && w.length !== parts) {
    throw new RegistrationError(
      `${w.length} instalment weights were given for ${parts} dates.`,
    );
  }

  const basis = w ?? Array.from({ length: parts }, () => money(1));
  const totalWeight = sum(basis);
  if (totalWeight.lessThanOrEqualTo(0)) {
    throw new RegistrationError('Instalment weights must add to more than zero.');
  }

  const out: Money[] = [];
  let allocated = ZERO;
  for (let i = 1; i < parts; i += 1) {
    const share = toStorage(total.times(basis[i]).dividedBy(totalWeight));
    out.push(share);
    allocated = allocated.plus(share);
  }
  // The first instalment absorbs the rounding residue, so the parts always
  // add back to the total exactly.
  out.unshift(total.minus(allocated));
  return out;
}

async function termNamesFor(tx: Tx, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await tx.semesterRegistration.findMany({
    where: { id: { in: ids } },
    select: { id: true, academicTerm: { select: { nameEn: true } } },
  });
  return new Map(rows.map((r) => [r.id, r.academicTerm.nameEn]));
}

async function voucherRefsFor(tx: Tx, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const rows = await tx.semesterRegistration.findMany({
    where: { id: { in: ids }, postedHeaderId: { not: null } },
    select: { id: true, posting: { select: { voucherRef: true } } },
  });
  return new Map(
    rows
      .filter((r) => r.posting !== null)
      .map((r) => [r.id, r.posting!.voucherRef]),
  );
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export { StudentNotPlacedError };
export type { ResolvedFeeSchedule };
