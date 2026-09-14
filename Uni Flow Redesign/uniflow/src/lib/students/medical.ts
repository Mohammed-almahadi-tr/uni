import 'server-only';
import type {
  BloodGroup,
  FitnessVerdict,
  ScreeningResult,
} from '@/generated/prisma/enums';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { toDateOnly } from '@/lib/ledger/period';

/**
 * Medical fitness records (SRS REQ-ST-02).
 *
 * The legacy `FrmMedical` screen is worth stating precisely, because three
 * separate defects sit in one 180-line file:
 *
 *   1. **It validated data it then discarded.** The save refused to proceed
 *      until all four Arabic name parts were filled in — "الرجاء ادخال الاسم
 *      الاول الطالب" and three more like it — and the insert that followed
 *      named six columns, none of them a name. The clerk was blocked on
 *      fields the database never received.
 *
 *   2. **An untested student and a negative result were stored identically.**
 *      `cmd.Parameters.AddWithValue("@Aids", Me.CombAids.Text)` on an unset
 *      combo box passes the empty string. The validation that would have
 *      caught it is commented out, along with the rule that made the HIV
 *      screen conditional on the nursing programme. `ScreeningResult` makes
 *      "not tested" a value rather than an absence.
 *
 *   3. **There was no verdict and no examiner.** Six columns: university ID,
 *      date, hepatitis, AIDS, blood type, and `Employee` — the data-entry
 *      clerk. Whether the student was fit to enrol was decided verbally and
 *      written down nowhere, and no record names who examined anyone.
 *
 * Records here are append-only and supersede one another, enforced by trigger.
 * A finding recorded on a date is what a decision taken that week was based
 * on; a re-examination is a new fact, not a correction. It is the same rule
 * the ledger applies to a posted voucher, for the same reason.
 */

export class MedicalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MedicalError';
  }
}

export interface ExaminationInput {
  studentId: string;
  examDate: Date;
  /** The clinician's name. They are rarely system users. */
  medicalOfficer: string;

  bloodGroup?: BloodGroup | null;
  hepatitisB?: ScreeningResult;
  hiv?: ScreeningResult;

  vaccinations?: string[];
  chronicConditions?: string | null;
  allergies?: string | null;
  officerNotes?: string | null;

  verdict: FitnessVerdict;
  /** Required unless the verdict is FIT. */
  verdictNote?: string | null;
  validUntil?: Date | null;
}

export interface ExaminationResult {
  id: string;
  /** The record this one retired, if the student had been examined before. */
  supersededId: string | null;
}

/**
 * Record an examination, retiring the student's previous one.
 *
 * The legacy form inserted a fresh row on every save with no key of any kind,
 * so a student examined twice had two rows and nothing said which was current.
 * The profile screen then read the table with `While reader.Read` assigning
 * every row to the same control — leaving whichever happened to come back
 * last, which is to say whichever the planner felt like returning first.
 */
export async function recordExamination(
  principal: Principal,
  input: ExaminationInput,
): Promise<ExaminationResult> {
  requirePermission(principal, 'medical.manage');

  const officer = input.medicalOfficer?.trim();
  if (!officer) {
    throw new MedicalError(
      'An examination needs the name of the clinician who carried it out. Recording ' +
        'the clerk who typed it is how the legacy system ended up with no examiner ' +
        'on file for anybody.',
    );
  }

  const note = input.verdictNote?.trim() || null;
  if (input.verdict !== 'FIT' && !note) {
    throw new MedicalError(
      input.verdict === 'CONDITIONAL'
        ? 'A conditional clearance must state the condition — otherwise nobody knows ' +
          'what has to happen before the student may enrol.'
        : 'An unfit verdict must state the reason. It is what the student appeals ' +
          'against, and what a second opinion is measured on.',
    );
  }

  const examDate = toDateOnly(input.examDate);
  if (examDate.getTime() > toDateOnly(new Date()).getTime()) {
    throw new MedicalError('An examination dated in the future has not happened yet.');
  }

  const validUntil = input.validUntil ? toDateOnly(input.validUntil) : null;
  if (validUntil && validUntil.getTime() <= examDate.getTime()) {
    throw new MedicalError('A clearance cannot expire on or before the day of the examination.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: { tenantId: true },
    });
    if (!student || student.tenantId !== principal.tenantId) {
      throw new MedicalError('Student not found in this tenant.');
    }

    const live = await tx.medicalRecord.findFirst({
      where: {
        tenantId: principal.tenantId,
        studentId: input.studentId,
        supersededAt: null,
      },
      select: { id: true, examDate: true },
    });
    if (live) {
      await tx.medicalRecord.update({
        where: { id: live.id },
        data: { supersededAt: new Date() },
      });
    }

    const record = await tx.medicalRecord.create({
      data: {
        tenantId: principal.tenantId,
        studentId: input.studentId,
        examDate,
        medicalOfficer: officer,
        bloodGroup: input.bloodGroup ?? null,
        hepatitisB: input.hepatitisB ?? 'NOT_TESTED',
        hiv: input.hiv ?? 'NOT_TESTED',
        vaccinations: input.vaccinations ?? [],
        chronicConditions: input.chronicConditions?.trim() || null,
        allergies: input.allergies?.trim() || null,
        officerNotes: input.officerNotes?.trim() || null,
        verdict: input.verdict,
        verdictNote: note,
        validUntil,
        recordedById: principal.userId,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'medical_record',
      resourceId: record.id,
      after: {
        studentId: input.studentId,
        examDate: examDate.toISOString().slice(0, 10),
        verdict: input.verdict,
        medicalOfficer: officer,
        supersededId: live?.id ?? null,
      },
    });

    return { id: record.id, supersededId: live?.id ?? null };
  });
}

export async function currentMedicalRecord(principal: Principal, studentId: string) {
  requirePermission(principal, 'medical.read');

  return withTenant(principal.tenantId, (tx) =>
    tx.medicalRecord.findFirst({
      where: { tenantId: principal.tenantId, studentId, supersededAt: null },
    }),
  );
}

/** Every examination on file, newest first. Superseded records are kept. */
export async function medicalHistory(principal: Principal, studentId: string) {
  requirePermission(principal, 'medical.read');

  return withTenant(principal.tenantId, (tx) =>
    tx.medicalRecord.findMany({
      where: { tenantId: principal.tenantId, studentId },
      orderBy: [{ examDate: 'desc' }, { recordedAt: 'desc' }],
    }),
  );
}

export type FitnessState =
  | 'NOT_EXAMINED'
  | 'FIT'
  | 'CONDITIONAL'
  | 'UNFIT'
  | 'LAPSED';

export interface FitnessStatus {
  state: FitnessState;
  examDate: Date | null;
  validUntil: Date | null;
  note: string | null;
  /** True when the student may be enrolled on clinical placement. */
  clear: boolean;
}

/**
 * Whether the student's fitness clearance stands today.
 *
 * `LAPSED` is separate from `UNFIT` on purpose: a clearance that has run out
 * is not a finding of unfitness, it is an examination that has to be repeated,
 * and telling a student they are unfit when their certificate has merely
 * expired is a different and worse conversation.
 */
export async function fitnessStatus(
  principal: Principal,
  studentId: string,
  asOf: Date = new Date(),
): Promise<FitnessStatus> {
  const record = await currentMedicalRecord(principal, studentId);

  if (!record) {
    return { state: 'NOT_EXAMINED', examDate: null, validUntil: null, note: null, clear: false };
  }

  const today = toDateOnly(asOf);
  const lapsed =
    record.validUntil !== null && record.validUntil.getTime() < today.getTime();

  const state: FitnessState = lapsed ? 'LAPSED' : record.verdict;

  return {
    state,
    examDate: record.examDate,
    validUntil: record.validUntil,
    note: record.verdictNote,
    clear: state === 'FIT' || state === 'CONDITIONAL',
  };
}
