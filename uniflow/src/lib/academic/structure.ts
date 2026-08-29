import 'server-only';
import type {
  AcademicPeriodStatus,
  DegreeLevel,
  NationalityCategory,
  TermKind,
} from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { toDateOnly } from '@/lib/ledger/period';

/**
 * Faculties, programmes, batches, academic years and terms (SRS Module 2,
 * Track B1).
 *
 * ## What this replaces
 *
 * The legacy academic structure was three text columns discovered by
 * `SELECT DISTINCT`:
 *
 *   · `Programs.ProgramName` — inserted by string concatenation, read back with
 *     `Select Distinct ProgramName From Programs` ([frmListPrograms.vb:20,83]).
 *   · `AcademicYear.Batch` — a batch list living in a table named for something
 *     else. The academic year itself existed nowhere
 *     ([frmListBatches.vb:9,47]).
 *   · `Colleges` — never a table at all. A faculty was a string copied onto
 *     every row that mentioned it.
 *
 * Identity was therefore the *name*, exactly as it was in the chart of accounts
 * before A1. Renaming a faculty orphaned every record pointing at it, silently,
 * because the join was on the text.
 *
 * ## Two rules that carry across the whole module
 *
 * **Structure is deactivated, never deleted.** `frmListBatches` deleted a batch
 * with `Delete From AcademicYear Where Batch=N'..'` and no check for students
 * admitted under it. Here the database refuses the delete once anything refers
 * to the row, and `deactivate` is the operation people actually want.
 *
 * **An academic year is not a fiscal year.** They usually straddle each other —
 * a September intake sits in two fiscal years — and conflating them is how a
 * term's revenue lands in the wrong set of accounts. The two calendars are
 * separate models that meet only at a posting's document date.
 */

export class AcademicStructureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AcademicStructureError';
  }
}

// ---------------------------------------------------------------------------
// Faculties and departments
// ---------------------------------------------------------------------------

export interface FacultyInput {
  code: string;
  nameAr: string;
  nameEn: string;
  /** Where this faculty's revenue and costs land. */
  costCenterId?: string | null;
}

export async function createFaculty(
  principal: Principal,
  input: FacultyInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'academic.manage');
  const code = requireCode(input.code, 'faculty');
  requireBilingual(input.nameAr, input.nameEn, 'faculty');

  return withTenant(principal.tenantId, async (tx) => {
    await refuseDuplicate(tx, 'faculty', () =>
      tx.faculty.findFirst({
        where: { tenantId: principal.tenantId, code },
        select: { id: true },
      }),
    );

    const faculty = await tx.faculty.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        costCenterId: input.costCenterId ?? null,
      },
      select: { id: true, code: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'faculty',
      resourceId: faculty.id,
      after: { code, nameAr: input.nameAr, nameEn: input.nameEn },
    });

    return faculty;
  });
}

export interface DepartmentInput extends Omit<FacultyInput, 'costCenterId'> {
  facultyId: string;
}

export async function createDepartment(
  principal: Principal,
  input: DepartmentInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'academic.manage');
  const code = requireCode(input.code, 'department');
  requireBilingual(input.nameAr, input.nameEn, 'department');

  return withTenant(principal.tenantId, async (tx) => {
    await refuseDuplicate(tx, 'department', () =>
      tx.department.findFirst({
        where: { tenantId: principal.tenantId, code },
        select: { id: true },
      }),
    );

    const dept = await tx.department.create({
      data: {
        tenantId: principal.tenantId,
        facultyId: input.facultyId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
      },
      select: { id: true, code: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'department',
      resourceId: dept.id,
      after: { code, facultyId: input.facultyId },
    });

    return dept;
  });
}

// ---------------------------------------------------------------------------
// Programmes
// ---------------------------------------------------------------------------

export interface ProgrammeInput {
  facultyId: string;
  departmentId?: string | null;
  code: string;
  nameAr: string;
  nameEn: string;
  degreeLevel: DegreeLevel;
  durationYears: number;
  /**
   * Total terms to graduation. Not derived from `durationYears`: a summer
   * intake, an intensive diploma and a five-year medical degree all break the
   * two-terms-per-year assumption, and a fee matrix prices per term.
   */
  durationTerms: number;
  creditsRequired?: number | null;
}

export async function createProgramme(
  principal: Principal,
  input: ProgrammeInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'academic.manage');
  const code = requireCode(input.code, 'programme');
  requireBilingual(input.nameAr, input.nameEn, 'programme');

  if (input.durationYears < 1 || input.durationTerms < 1) {
    throw new AcademicStructureError(
      `A programme lasts at least one year and one term; got ${input.durationYears} year(s) ` +
        `and ${input.durationTerms} term(s).`,
    );
  }
  if (input.durationTerms < input.durationYears) {
    throw new AcademicStructureError(
      `Programme ${code} runs for ${input.durationYears} years but only ${input.durationTerms} ` +
        `terms, which is fewer than one term a year. Check which figure is wrong before saving.`,
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    await refuseDuplicate(tx, 'programme', () =>
      tx.programme.findFirst({
        where: { tenantId: principal.tenantId, code },
        select: { id: true },
      }),
    );

    const programme = await tx.programme.create({
      data: {
        tenantId: principal.tenantId,
        facultyId: input.facultyId,
        departmentId: input.departmentId ?? null,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        degreeLevel: input.degreeLevel,
        durationYears: input.durationYears,
        durationTerms: input.durationTerms,
        creditsRequired: input.creditsRequired ?? null,
      },
      select: { id: true, code: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'programme',
      resourceId: programme.id,
      after: {
        code,
        facultyId: input.facultyId,
        degreeLevel: input.degreeLevel,
        durationYears: input.durationYears,
        durationTerms: input.durationTerms,
      },
    });

    return programme;
  });
}

// ---------------------------------------------------------------------------
// Batches, admission categories, nationalities
// ---------------------------------------------------------------------------

export interface BatchInput {
  code: string;
  nameAr: string;
  nameEn: string;
  admissionYear: number;
}

export async function createBatch(
  principal: Principal,
  input: BatchInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'academic.manage');
  const code = requireCode(input.code, 'batch');
  requireBilingual(input.nameAr, input.nameEn, 'batch');

  return withTenant(principal.tenantId, async (tx) => {
    await refuseDuplicate(tx, 'batch', () =>
      tx.batch.findFirst({
        where: { tenantId: principal.tenantId, code },
        select: { id: true },
      }),
    );

    const batch = await tx.batch.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        admissionYear: input.admissionYear,
      },
      select: { id: true, code: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'batch',
      resourceId: batch.id,
      after: { code, admissionYear: input.admissionYear },
    });

    return batch;
  });
}

export interface AdmissionCategoryInput {
  code: string;
  nameAr: string;
  nameEn: string;
  sortOrder?: number;
}

export async function createAdmissionCategory(
  principal: Principal,
  input: AdmissionCategoryInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'academic.manage');
  const code = requireCode(input.code, 'admission category');
  requireBilingual(input.nameAr, input.nameEn, 'admission category');

  return withTenant(principal.tenantId, async (tx) => {
    await refuseDuplicate(tx, 'admission category', () =>
      tx.admissionCategory.findFirst({
        where: { tenantId: principal.tenantId, code },
        select: { id: true },
      }),
    );

    return tx.admissionCategory.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        sortOrder: input.sortOrder ?? 0,
      },
      select: { id: true, code: true },
    });
  });
}

export interface NationalityInput {
  code: string;
  nameAr: string;
  nameEn: string;
  category: NationalityCategory;
}

export async function createNationality(
  principal: Principal,
  input: NationalityInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'academic.manage');
  const code = requireCode(input.code, 'nationality');
  requireBilingual(input.nameAr, input.nameEn, 'nationality');

  return withTenant(principal.tenantId, async (tx) => {
    await refuseDuplicate(tx, 'nationality', () =>
      tx.nationality.findFirst({
        where: { tenantId: principal.tenantId, code },
        select: { id: true },
      }),
    );

    return tx.nationality.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        category: input.category,
      },
      select: { id: true, code: true },
    });
  });
}

// ---------------------------------------------------------------------------
// Academic years and terms
// ---------------------------------------------------------------------------

export interface TermInput {
  seq: number;
  kind: TermKind;
  nameAr: string;
  nameEn: string;
  startDate: Date;
  endDate: Date;
  registrationClosesOn?: Date | null;
}

export interface AcademicYearInput {
  code: string;
  nameAr: string;
  nameEn: string;
  startDate: Date;
  endDate: Date;
  terms: TermInput[];
}

/**
 * Open an academic year and its terms in one transaction.
 *
 * All or nothing, for the same reason `openFiscalYear` is: a year whose terms
 * are half-created is unusable in a way that only surfaces at the first
 * registration. The database refuses overlapping terms outright, so a bug in
 * the caller's date arithmetic fails at insert rather than producing a date
 * that belongs to two terms.
 */
export async function openAcademicYear(
  principal: Principal,
  input: AcademicYearInput,
): Promise<{ academicYearId: string; termIds: string[] }> {
  requirePermission(principal, 'academic.manage');
  const code = requireCode(input.code, 'academic year');
  requireBilingual(input.nameAr, input.nameEn, 'academic year');

  const start = toDateOnly(input.startDate);
  const end = toDateOnly(input.endDate);
  if (end < start) {
    throw new AcademicStructureError(
      `Academic year ${code} ends (${iso(end)}) before it starts (${iso(start)}).`,
    );
  }
  if (input.terms.length === 0) {
    throw new AcademicStructureError(
      `Academic year ${code} has no terms. A year with no terms can hold no registrations.`,
    );
  }

  for (const t of input.terms) {
    const ts = toDateOnly(t.startDate);
    const te = toDateOnly(t.endDate);
    if (te < ts) {
      throw new AcademicStructureError(
        `Term ${t.seq} (${t.nameEn}) ends before it starts.`,
      );
    }
    if (ts < start || te > end) {
      throw new AcademicStructureError(
        `Term ${t.seq} (${t.nameEn}) runs ${iso(ts)}–${iso(te)}, outside the academic year ` +
          `${iso(start)}–${iso(end)}. A term outside its year is a term no year-end report will find.`,
      );
    }
  }

  return withTenant(principal.tenantId, async (tx) => {
    await refuseDuplicate(tx, 'academic year', () =>
      tx.academicYear.findFirst({
        where: { tenantId: principal.tenantId, code },
        select: { id: true },
      }),
    );

    const year = await tx.academicYear.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        startDate: start,
        endDate: end,
        status: 'PLANNED',
      },
      select: { id: true },
    });

    const termIds: string[] = [];
    for (const t of input.terms) {
      const created = await tx.academicTerm.create({
        data: {
          tenantId: principal.tenantId,
          academicYearId: year.id,
          seq: t.seq,
          kind: t.kind,
          nameAr: t.nameAr.trim(),
          nameEn: t.nameEn.trim(),
          startDate: toDateOnly(t.startDate),
          endDate: toDateOnly(t.endDate),
          registrationClosesOn: t.registrationClosesOn
            ? toDateOnly(t.registrationClosesOn)
            : null,
          status: 'PLANNED',
        },
        select: { id: true },
      });
      termIds.push(created.id);
    }

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'academic_year',
      resourceId: year.id,
      after: { code, start: iso(start), end: iso(end), terms: termIds.length },
    });

    return { academicYearId: year.id, termIds };
  });
}

export async function setTermStatus(
  principal: Principal,
  academicTermId: string,
  status: AcademicPeriodStatus,
): Promise<void> {
  requirePermission(principal, 'academic.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const term = await tx.academicTerm.findUnique({
      where: { id: academicTermId },
      select: { tenantId: true, status: true, nameEn: true },
    });
    if (!term || term.tenantId !== principal.tenantId) {
      throw new AcademicStructureError('That term does not belong to this university.');
    }

    await tx.academicTerm.update({ where: { id: academicTermId }, data: { status } });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'academic_term',
      resourceId: academicTermId,
      before: { status: term.status },
      after: { status, term: term.nameEn },
    });
  });
}

/** The term covering a date, or null. Used by registration to place a term. */
export async function termOn(
  tx: Tx,
  tenantId: string,
  date: Date,
): Promise<{ id: string; seq: number; nameEn: string; academicYearId: string } | null> {
  const day = toDateOnly(date);
  return tx.academicTerm.findFirst({
    where: { tenantId, startDate: { lte: day }, endDate: { gte: day } },
    select: { id: true, seq: true, nameEn: true, academicYearId: true },
  });
}

// ---------------------------------------------------------------------------
// Deactivation
// ---------------------------------------------------------------------------

export type DeactivatableEntity =
  | 'faculty'
  | 'department'
  | 'programme'
  | 'batch'
  | 'admissionCategory'
  | 'nationality';

/**
 * Retire a structural record without removing it.
 *
 * The only supported way to take something out of use. The database refuses to
 * delete a faculty, programme, batch, category or nationality that anything
 * still refers to — which the legacy batch screen did not, and could not, since
 * its delete was a bare `DELETE ... WHERE Batch=<text>`.
 */
export async function deactivate(
  principal: Principal,
  entity: DeactivatableEntity,
  id: string,
): Promise<void> {
  requirePermission(principal, 'academic.manage');

  await withTenant(principal.tenantId, async (tx) => {
    // A switch rather than a dynamic model lookup: the delegates have
    // different types, and losing that would put a string from the caller in
    // charge of which table gets written.
    switch (entity) {
      case 'faculty':
        await tx.faculty.update({ where: { id }, data: { isActive: false } });
        break;
      case 'department':
        await tx.department.update({ where: { id }, data: { isActive: false } });
        break;
      case 'programme':
        await tx.programme.update({ where: { id }, data: { isActive: false } });
        break;
      case 'batch':
        await tx.batch.update({ where: { id }, data: { isActive: false } });
        break;
      case 'admissionCategory':
        await tx.admissionCategory.update({ where: { id }, data: { isActive: false } });
        break;
      case 'nationality':
        await tx.nationality.update({ where: { id }, data: { isActive: false } });
        break;
    }

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: entity,
      resourceId: id,
      after: { isActive: false },
    });
  });
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface ProgrammeSummary {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  degreeLevel: DegreeLevel;
  durationYears: number;
  durationTerms: number;
  isActive: boolean;
  facultyId: string;
  facultyCode: string;
  facultyNameAr: string;
  facultyNameEn: string;
}

export async function listProgrammes(
  principal: Principal,
  opts: { facultyId?: string; includeInactive?: boolean } = {},
): Promise<ProgrammeSummary[]> {
  requirePermission(principal, 'academic.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.programme.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(opts.facultyId ? { facultyId: opts.facultyId } : {}),
        ...(opts.includeInactive ? {} : { isActive: true }),
      },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        degreeLevel: true,
        durationYears: true,
        durationTerms: true,
        isActive: true,
        facultyId: true,
        // One relation load. The budget is two per query counting nested ones,
        // and this is the only one here.
        faculty: { select: { code: true, nameAr: true, nameEn: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      degreeLevel: r.degreeLevel,
      durationYears: r.durationYears,
      durationTerms: r.durationTerms,
      isActive: r.isActive,
      facultyId: r.facultyId,
      facultyCode: r.faculty.code,
      facultyNameAr: r.faculty.nameAr,
      facultyNameEn: r.faculty.nameEn,
    }));
  });
}

// ---------------------------------------------------------------------------
// Shared validation
// ---------------------------------------------------------------------------

function requireCode(raw: string, what: string): string {
  const code = raw?.trim() ?? '';
  if (!code) {
    throw new AcademicStructureError(`A ${what} needs a code.`);
  }
  if (code.length > 32) {
    throw new AcademicStructureError(
      `The ${what} code "${code}" is ${code.length} characters. Codes appear on student ` +
        `numbers and printed documents; keep them short enough to be read aloud.`,
    );
  }
  return code;
}

/**
 * Both names, always.
 *
 * Certificates, receipts and transcripts are issued in both scripts. A missing
 * Arabic or English name is not discovered when it is entered — it is
 * discovered at graduation, when the certificate cannot be printed.
 */
function requireBilingual(nameAr: string, nameEn: string, what: string): void {
  if (!nameAr?.trim() || !nameEn?.trim()) {
    throw new AcademicStructureError(
      `A ${what} needs a name in both Arabic and English.`,
    );
  }
}

async function refuseDuplicate(
  tx: Tx,
  what: string,
  find: () => Promise<{ id: string } | null>,
): Promise<void> {
  void tx;
  const existing = await find();
  if (existing) {
    throw new AcademicStructureError(
      `That ${what} code is already in use. Codes are how every other record refers to ` +
        `this one, so they cannot be shared.`,
    );
  }
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
