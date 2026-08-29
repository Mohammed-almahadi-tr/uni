import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import {
  AcademicStructureError,
  createBatch,
  createDepartment,
  createFaculty,
  createProgramme,
  deactivate,
  listProgrammes,
  openAcademicYear,
  setTermStatus,
  termOn,
} from '@/lib/academic/structure';
import {
  approveFeeSchedule,
  draftFeeSchedule,
  feeScheduleForStudent,
  feeScheduleHistory,
  FeeMatrixError,
  lookupStudentFees,
  resolveFeeSchedule,
  reviseFeeSchedule,
  StudentNotPlacedError,
} from '@/lib/academic/fee-matrix';
import { STANDARD_ADMISSION_CATEGORIES } from '@/lib/academic/defaults';
import { findSodViolations } from '@/lib/auth/permissions';
import { ForbiddenError, SelfApprovalError } from '@/lib/auth/rbac';
import { createStudent } from '@/lib/students/registry';

/**
 * Academic structure and the fee matrix (SRS Module 2, Track B1).
 *
 * The legacy baseline these tests are measured against is one save routine:
 *
 *     Delete From TuitionFees Where Batch=N'<batch>'      ' frmTuitionFees.vb:89
 *     insert into TuitionFees (Batch,Colleges,Program,...) ' line 92, per grid row
 *
 * loaded from a grid filtered by `Batch AND Colleges AND Type` (line 48). The
 * DELETE named only the batch, so saving one faculty's fees destroyed every
 * other faculty's for that batch — and every other admission type's — with no
 * transaction around it and no version history to recover from.
 *
 * The bulk of this suite is therefore about a single property: **a fee that has
 * been published cannot be changed or lost, only superseded.**
 */

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

let uni: University;

beforeAll(async () => {
  uni = await makeUniversity();
});

afterAll(disconnectAll);

async function fresh() {
  const u = await makeUniversity();
  return {
    uni: u,
    admin: await makePrincipal(u.tenantId, ['academic.manage', 'academic.read'], {
      name: 'admin',
    }),
    setter: await makePrincipal(u.tenantId, ['feematrix.manage', 'feematrix.read'], {
      name: 'setter',
    }),
    approver: await makePrincipal(u.tenantId, ['feematrix.approve', 'feematrix.read'], {
      name: 'approver',
    }),
    reader: await makePrincipal(u.tenantId, ['feematrix.read', 'student.read'], {
      name: 'rdr',
    }),
  };
}

/** The standard cohort key used across the fee-matrix tests. */
function key(u: University) {
  return {
    programmeId: u.programmeIds.MBBS,
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
  };
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

describe('academic structure', () => {
  it('creates a faculty, department and programme keyed by id rather than by name', async () => {
    const { uni: u, admin } = await fresh();

    const faculty = await createFaculty(admin, {
      code: 'PHARM',
      nameAr: 'كلية الصيدلة',
      nameEn: 'Faculty of Pharmacy',
      costCenterId: u.costCenterId,
    });
    const dept = await createDepartment(admin, {
      facultyId: faculty.id,
      code: 'PHARMACOL',
      nameAr: 'قسم علم الأدوية',
      nameEn: 'Department of Pharmacology',
    });
    const programme = await createProgramme(admin, {
      facultyId: faculty.id,
      departmentId: dept.id,
      code: 'BPHARM',
      nameAr: 'بكالوريوس الصيدلة',
      nameEn: 'Bachelor of Pharmacy',
      degreeLevel: 'BACHELOR',
      durationYears: 5,
      durationTerms: 10,
    });

    // Renaming the faculty must not disturb anything pointing at it — the whole
    // difference from `Programs.ProgramName` and the `Colleges` text column.
    await asSystem((tx) =>
      tx.faculty.update({
        where: { id: faculty.id },
        data: { nameEn: 'Faculty of Pharmaceutical Sciences' },
      }),
    );

    const listed = await listProgrammes(admin, { facultyId: faculty.id });
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(programme.id);
    expect(listed[0].facultyNameEn).toBe('Faculty of Pharmaceutical Sciences');
  });

  it('requires both names, because certificates are issued in both', async () => {
    const { admin } = await fresh();
    await expect(
      createFaculty(admin, { code: 'X', nameAr: '', nameEn: 'Engineering' }),
    ).rejects.toThrow(/both Arabic and English/);
  });

  it('refuses a duplicate code', async () => {
    const { admin } = await fresh();
    await createBatch(admin, {
      code: '2027',
      nameAr: 'دفعة 2027',
      nameEn: 'Batch 2027',
      admissionYear: 2027,
    });
    await expect(
      createBatch(admin, {
        code: '2027',
        nameAr: 'مكرر',
        nameEn: 'Duplicate',
        admissionYear: 2027,
      }),
    ).rejects.toThrow(AcademicStructureError);
  });

  it('refuses a programme with fewer terms than years', async () => {
    const { uni: u, admin } = await fresh();
    await expect(
      createProgramme(admin, {
        facultyId: u.facultyId,
        code: 'ODD',
        nameAr: 'برنامج',
        nameEn: 'Programme',
        degreeLevel: 'BACHELOR',
        durationYears: 4,
        durationTerms: 2,
      }),
    ).rejects.toThrow(/fewer than one term a year/);
  });

  it('opens an academic year with non-overlapping terms', async () => {
    const { uni: u, admin } = await fresh();

    const { academicYearId, termIds } = await openAcademicYear(admin, {
      code: '2026/2027',
      nameAr: 'العام الجامعي ٢٠٢٦/٢٠٢٧',
      nameEn: 'Academic Year 2026/2027',
      startDate: D(2026, 9, 1),
      endDate: D(2027, 8, 31),
      terms: [
        {
          seq: 1,
          kind: 'FALL',
          nameAr: 'الفصل الأول',
          nameEn: 'Fall',
          startDate: D(2026, 9, 1),
          endDate: D(2027, 1, 31),
          registrationClosesOn: D(2026, 10, 15),
        },
        {
          seq: 2,
          kind: 'SPRING',
          nameAr: 'الفصل الثاني',
          nameEn: 'Spring',
          startDate: D(2027, 2, 1),
          endDate: D(2027, 6, 30),
        },
      ],
    });

    expect(termIds).toHaveLength(2);

    const found = await asTenant(u.tenantId, (tx) =>
      termOn(tx, u.tenantId, D(2026, 11, 20)),
    );
    expect(found?.seq).toBe(1);
    expect(found?.academicYearId).toBe(academicYearId);

    await setTermStatus(admin, termIds[0], 'ACTIVE');
    const status = await asSystem((tx) =>
      tx.academicTerm.findUniqueOrThrow({
        where: { id: termIds[0] },
        select: { status: true },
      }),
    );
    expect(status.status).toBe('ACTIVE');
  });

  it('refuses overlapping terms at the database, not only in code', async () => {
    const { uni: u, admin } = await fresh();
    const { academicYearId } = await openAcademicYear(admin, {
      code: '2028/2029',
      nameAr: 'عام',
      nameEn: 'Year',
      startDate: D(2028, 9, 1),
      endDate: D(2029, 8, 31),
      terms: [
        {
          seq: 1,
          kind: 'FALL',
          nameAr: 'الأول',
          nameEn: 'Fall',
          startDate: D(2028, 9, 1),
          endDate: D(2029, 1, 31),
        },
      ],
    });

    // Straight to the table as the owner role, bypassing every application
    // check. A date that falls in two terms has no answer to "which term is
    // this student registering for", so the constraint is the real defence.
    await expect(
      asSystem((tx) =>
        tx.academicTerm.create({
          data: {
            tenantId: u.tenantId,
            academicYearId,
            seq: 2,
            kind: 'SPRING',
            nameAr: 'متداخل',
            nameEn: 'Overlapping',
            startDate: D(2029, 1, 15),
            endDate: D(2029, 6, 30),
          },
        }),
      ),
    ).rejects.toThrow(/excl_term_no_overlap|conflicting key|exclusion/i);
  });

  it('refuses a term outside its academic year', async () => {
    const { admin } = await fresh();
    await expect(
      openAcademicYear(admin, {
        code: '2030/2031',
        nameAr: 'عام',
        nameEn: 'Year',
        startDate: D(2030, 9, 1),
        endDate: D(2031, 8, 31),
        terms: [
          {
            seq: 1,
            kind: 'FALL',
            nameAr: 'خارج',
            nameEn: 'Outside',
            startDate: D(2031, 9, 1),
            endDate: D(2031, 12, 31),
          },
        ],
      }),
    ).rejects.toThrow(/outside the academic year/);
  });

  it('deactivates structure instead of deleting it, and the database enforces that', async () => {
    const { uni: u, admin } = await fresh();

    await createStudent(
      await makePrincipal(u.tenantId, ['student.manage'], { name: 'reg' }),
      {
        studentNo: 'S-DEL-1',
        fullNameAr: 'طالب',
        fullNameEn: 'Student',
      },
    );
    await asSystem((tx) =>
      tx.student.updateMany({
        where: { tenantId: u.tenantId, studentNo: 'S-DEL-1' },
        data: { programmeId: u.programmeIds.MBBS, batchId: u.batchId },
      }),
    );

    // The legacy batch screen ran `Delete From AcademicYear Where Batch=N'..'`
    // with no check for students admitted under it.
    await expect(
      asSystem((tx) => tx.batch.delete({ where: { id: u.batchId } })),
    ).rejects.toThrow(/still refer to it|Deactivate it instead/);

    await deactivate(admin, 'programme', u.programmeIds.NURS);
    const active = await listProgrammes(admin);
    expect(active.some((p) => p.id === u.programmeIds.NURS)).toBe(false);

    const all = await listProgrammes(admin, { includeInactive: true });
    expect(all.some((p) => p.id === u.programmeIds.NURS)).toBe(true);
  });

  it('requires academic.manage', async () => {
    const nobody = await makePrincipal(uni.tenantId, [], { name: 'nobody-acd' });
    await expect(
      createFaculty(nobody, { code: 'X', nameAr: 'س', nameEn: 'X' }),
    ).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Onboarding defaults
// ---------------------------------------------------------------------------

describe('academic defaults', () => {
  it('installs the admission categories the fee matrix is keyed on', async () => {
    const cats = await asSystem((tx) =>
      tx.admissionCategory.findMany({
        where: { tenantId: uni.tenantId },
        select: { code: true },
        orderBy: { sortOrder: 'asc' },
      }),
    );
    expect(cats.map((c) => c.code)).toEqual(
      STANDARD_ADMISSION_CATEGORIES.map((c) => c.code),
    );
  });

  it('installs nationalities across all three fee categories', async () => {
    const nats = await asSystem((tx) =>
      tx.nationality.findMany({
        where: { tenantId: uni.tenantId },
        select: { category: true },
      }),
    );
    const categories = new Set(nats.map((n) => n.category));
    expect(categories).toEqual(new Set(['NATIONAL', 'ARAB', 'FOREIGN']));
  });
});

// ---------------------------------------------------------------------------
// Fee matrix
// ---------------------------------------------------------------------------

describe('fee matrix', () => {
  it('drafts, approves and resolves a schedule', async () => {
    const { uni: u, setter, approver } = await fresh();

    const draft = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [
        { feeItemId: u.feeItems.TUITION, amount: '1200000.00' },
        { feeItemId: u.feeItems.REGISTRATION, amount: '50000.00' },
        { feeItemId: u.feeItems.LAB, amount: '30000.00', isMandatory: false },
      ],
    });

    expect(draft.versionNo).toBe(1);
    expect(draft.total).toBe('1280000.0000');

    await approveFeeSchedule(approver, draft.id);

    const resolved = await asTenant(u.tenantId, (tx) =>
      resolveFeeSchedule(tx, u.tenantId, { ...key(u), onDate: D(2026, 3, 1) }),
    );

    expect(resolved?.versionNo).toBe(1);
    expect(resolved?.currency).toBe('SDG');
    expect(resolved?.total).toBe('1280000.0000');
    // The optional lab fee is excluded from what every student is billed.
    expect(resolved?.mandatoryTotal).toBe('1250000.0000');
    expect(resolved?.lines).toHaveLength(3);
    expect(resolved?.lines[0].feeItemCode).toBe('TUITION');
  });

  it('resolves nothing before the effective date', async () => {
    const { uni: u, setter, approver } = await fresh();
    const draft = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 6, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '900000.00' }],
    });
    await approveFeeSchedule(approver, draft.id);

    const before = await asTenant(u.tenantId, (tx) =>
      resolveFeeSchedule(tx, u.tenantId, { ...key(u), onDate: D(2026, 5, 31) }),
    );
    expect(before).toBeNull();

    const on = await asTenant(u.tenantId, (tx) =>
      resolveFeeSchedule(tx, u.tenantId, { ...key(u), onDate: D(2026, 6, 1) }),
    );
    expect(on?.versionNo).toBe(1);
  });

  it('supersedes without destroying: the old version still prices its own dates', async () => {
    const { uni: u, setter, approver } = await fresh();

    const v1 = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '1000000.00' }],
    });
    await approveFeeSchedule(approver, v1.id);

    const v2 = await reviseFeeSchedule(setter, v1.id, {
      effectiveFrom: D(2026, 7, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '1400000.00' }],
    });
    expect(v2.versionNo).toBe(2);

    const approval = await approveFeeSchedule(approver, v2.id);
    expect(approval.supersededVersionNo).toBe(1);
    // Adjacent, never overlapping and never leaving a gap.
    expect(approval.supersededEffectiveTo).toBe('2026-06-30');

    // This is the property the legacy DELETE destroyed: what a student
    // registering in March owed is still answerable in December.
    const march = await asTenant(u.tenantId, (tx) =>
      resolveFeeSchedule(tx, u.tenantId, { ...key(u), onDate: D(2026, 3, 15) }),
    );
    expect(march?.versionNo).toBe(1);
    expect(march?.total).toBe('1000000.0000');

    const september = await asTenant(u.tenantId, (tx) =>
      resolveFeeSchedule(tx, u.tenantId, { ...key(u), onDate: D(2026, 9, 15) }),
    );
    expect(september?.versionNo).toBe(2);
    expect(september?.total).toBe('1400000.0000');

    // Every day between the two is priced by exactly one of them.
    for (const day of [D(2026, 6, 29), D(2026, 6, 30), D(2026, 7, 1), D(2026, 7, 2)]) {
      const r = await asTenant(u.tenantId, (tx) =>
        resolveFeeSchedule(tx, u.tenantId, { ...key(u), onDate: day }),
      );
      expect(r).not.toBeNull();
    }
  });

  it('keeps every version in the history', async () => {
    const { uni: u, setter, approver } = await fresh();

    const v1 = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '800000.00' }],
    });
    await approveFeeSchedule(approver, v1.id);
    const v2 = await reviseFeeSchedule(setter, v1.id, { effectiveFrom: D(2026, 4, 1) });
    await approveFeeSchedule(approver, v2.id);
    await reviseFeeSchedule(setter, v2.id, { effectiveFrom: D(2026, 8, 1) });

    const history = await feeScheduleHistory(setter, key(u));
    expect(history.map((h) => h.versionNo)).toEqual([3, 2, 1]);
    expect(history.map((h) => h.status)).toEqual(['DRAFT', 'APPROVED', 'SUPERSEDED']);
    // The revision copied v1's lines rather than starting empty.
    expect(history.find((h) => h.versionNo === 2)?.total).toBe('800000.0000');
  });

  it('refuses to edit or delete an approved schedule at the database', async () => {
    const { uni: u, setter, approver } = await fresh();
    const v1 = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '700000.00' }],
    });
    await approveFeeSchedule(approver, v1.id);

    // As the owner role, bypassing RLS and every application check. This is
    // the exact shape of the legacy save, and it must be impossible.
    await expect(
      asSystem((tx) =>
        tx.feeScheduleLine.updateMany({
          where: { feeScheduleId: v1.id },
          data: { amount: '1.00' },
        }),
      ),
    ).rejects.toThrow(/its lines are fixed/);

    await expect(
      asSystem((tx) => tx.feeScheduleLine.deleteMany({ where: { feeScheduleId: v1.id } })),
    ).rejects.toThrow(/its lines are fixed/);

    await expect(
      asSystem((tx) => tx.feeSchedule.delete({ where: { id: v1.id } })),
    ).rejects.toThrow(/cannot be deleted/);

    await expect(
      asSystem((tx) =>
        tx.feeSchedule.update({
          where: { id: v1.id },
          data: { currency: 'USD' },
        }),
      ),
    ).rejects.toThrow(/approved and cannot be edited/);
  });

  it('refuses two approved versions covering the same day', async () => {
    const { uni: u, setter, approver } = await fresh();

    const v1 = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '600000.00' }],
    });
    await approveFeeSchedule(approver, v1.id);

    const overlapping = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '650000.00' }],
    });

    // Caught in the application with a sentence, and by the exclusion
    // constraint underneath if anything ever gets past it.
    await expect(approveFeeSchedule(approver, overlapping.id)).rejects.toThrow(
      /must start after the one it replaces/,
    );
  });

  it('prices by nationality category, falling back to the any-nationality row', async () => {
    const { uni: u, setter, approver } = await fresh();

    const anyNat = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '1000000.00' }],
    });
    await approveFeeSchedule(approver, anyNat.id);

    const foreign = await draftFeeSchedule(setter, {
      ...key(u),
      nationalityCategory: 'FOREIGN',
      currency: 'USD',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '6000.00' }],
    });
    await approveFeeSchedule(approver, foreign.id);

    const asForeign = await asTenant(u.tenantId, (tx) =>
      resolveFeeSchedule(tx, u.tenantId, {
        ...key(u),
        nationalityCategory: 'FOREIGN',
        onDate: D(2026, 3, 1),
      }),
    );
    expect(asForeign?.currency).toBe('USD');
    expect(asForeign?.total).toBe('6000.0000');
    expect(asForeign?.usedFallback).toBe(false);

    // A national student has no schedule of their own and gets the fallback —
    // which is why the fallback is a nullable row rather than a fourth enum
    // member nobody would remember to price.
    const asNational = await asTenant(u.tenantId, (tx) =>
      resolveFeeSchedule(tx, u.tenantId, {
        ...key(u),
        nationalityCategory: 'NATIONAL',
        onDate: D(2026, 3, 1),
      }),
    );
    expect(asNational?.currency).toBe('SDG');
    expect(asNational?.usedFallback).toBe(true);
  });

  it('prices one cohort without touching another', async () => {
    const { uni: u, setter, approver } = await fresh();

    const medicine = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '1500000.00' }],
    });
    await approveFeeSchedule(approver, medicine.id);

    const nursing = await draftFeeSchedule(setter, {
      programmeId: u.programmeIds.NURS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '700000.00' }],
    });
    await approveFeeSchedule(approver, nursing.id);

    // Revise Medicine — the legacy equivalent of this deleted Nursing's row.
    const revised = await reviseFeeSchedule(setter, medicine.id, {
      effectiveFrom: D(2026, 7, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '1800000.00' }],
    });
    await approveFeeSchedule(approver, revised.id);

    const nursingAfter = await asTenant(u.tenantId, (tx) =>
      resolveFeeSchedule(tx, u.tenantId, {
        programmeId: u.programmeIds.NURS,
        batchId: u.batchId,
        admissionCategoryId: u.admissionCategories.GENERAL,
        onDate: D(2026, 9, 1),
      }),
    );
    expect(nursingAfter?.total).toBe('700000.0000');
    expect(nursingAfter?.versionNo).toBe(1);
  });

  it('version numbers run per cohort, not per tenant', async () => {
    const { uni: u, setter, approver } = await fresh();

    const med = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '100.00' }],
    });
    await approveFeeSchedule(approver, med.id);
    const med2 = await reviseFeeSchedule(setter, med.id, { effectiveFrom: D(2026, 5, 1) });
    expect(med2.versionNo).toBe(2);

    const nurs = await draftFeeSchedule(setter, {
      programmeId: u.programmeIds.NURS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '100.00' }],
    });
    expect(nurs.versionNo).toBe(1);
  });

  it('refuses an empty schedule, a duplicated item and a negative fee', async () => {
    const { uni: u, setter } = await fresh();

    await expect(
      draftFeeSchedule(setter, {
        ...key(u),
        currency: 'SDG',
        effectiveFrom: D(2026, 1, 1),
        lines: [],
      }),
    ).rejects.toThrow(/at least one line/);

    await expect(
      draftFeeSchedule(setter, {
        ...key(u),
        currency: 'SDG',
        effectiveFrom: D(2026, 1, 1),
        lines: [
          { feeItemId: u.feeItems.TUITION, amount: '100.00' },
          { feeItemId: u.feeItems.TUITION, amount: '200.00' },
        ],
      }),
    ).rejects.toThrow(/appears twice/);

    await expect(
      draftFeeSchedule(setter, {
        ...key(u),
        currency: 'SDG',
        effectiveFrom: D(2026, 1, 1),
        lines: [{ feeItemId: u.feeItems.TUITION, amount: '-5.00' }],
      }),
    ).rejects.toThrow(/cannot be negative/);
  });

  it('refuses an approved schedule with no lines, even written directly', async () => {
    const { uni: u, setter } = await fresh();
    const draft = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '100.00' }],
    });

    await expect(
      asSystem(async (tx) => {
        await tx.feeScheduleLine.deleteMany({ where: { feeScheduleId: draft.id } });
        await tx.feeSchedule.update({
          where: { id: draft.id },
          data: {
            status: 'APPROVED',
            approvedById: (
              await tx.user.findFirstOrThrow({
                where: { tenantId: u.tenantId },
                select: { id: true },
              })
            ).id,
            approvedAt: new Date(),
          },
        });
      }),
    ).rejects.toThrow(/approved with no fee lines/);
  });

  it('will not let the person who drafted a schedule approve it', async () => {
    const { uni: u } = await fresh();
    const both = await makePrincipal(
      u.tenantId,
      ['feematrix.manage', 'feematrix.approve'],
      { name: 'both' },
    );

    const draft = await draftFeeSchedule(both, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '100.00' }],
    });

    await expect(approveFeeSchedule(both, draft.id)).rejects.toThrow(SelfApprovalError);
  });

  it('keeps drafting and approving in separate roles', () => {
    // The SoD matrix stops the pair reaching one role in the first place; the
    // self-approval check above stops one person holding two roles.
    const violations = findSodViolations(['feematrix.manage', 'feematrix.approve']);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toMatch(/second signature/);
  });

  it('requires the right permission at each step', async () => {
    const { uni: u, setter, approver } = await fresh();
    const nobody = await makePrincipal(u.tenantId, [], { name: 'nobody-fee' });

    await expect(
      draftFeeSchedule(nobody, {
        ...key(u),
        currency: 'SDG',
        effectiveFrom: D(2026, 1, 1),
        lines: [{ feeItemId: u.feeItems.TUITION, amount: '1.00' }],
      }),
    ).rejects.toThrow(ForbiddenError);

    const draft = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '1.00' }],
    });
    await expect(approveFeeSchedule(setter, draft.id)).rejects.toThrow(ForbiddenError);
    await expect(approveFeeSchedule(approver, draft.id)).resolves.toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Pricing a student — the handover to Track B4
// ---------------------------------------------------------------------------

describe('pricing a student', () => {
  async function placedStudent(u: University, opts: { nationality?: string } = {}) {
    const registrar = await makePrincipal(u.tenantId, ['student.manage'], {
      name: 'registrar',
    });
    const student = await createStudent(registrar, {
      studentNo: `S-${Math.random().toString(36).slice(2, 8)}`,
      fullNameAr: 'أحمد محمد',
      fullNameEn: 'Ahmed Mohammed',
    });
    await asSystem((tx) =>
      tx.student.update({
        where: { id: student.id },
        data: {
          programmeId: u.programmeIds.MBBS,
          batchId: u.batchId,
          admissionCategoryId: u.admissionCategories.GENERAL,
          nationalityId: opts.nationality ? u.nationalities[opts.nationality] : null,
        },
      }),
    );
    return student;
  }

  it('resolves a student to the schedule their cohort was priced under', async () => {
    const { uni: u, setter, approver, reader: rdr } = await fresh();
    const v1 = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [
        { feeItemId: u.feeItems.TUITION, amount: '1100000.00' },
        { feeItemId: u.feeItems.REGISTRATION, amount: '40000.00' },
      ],
    });
    await approveFeeSchedule(approver, v1.id);

    const student = await placedStudent(u, { nationality: 'SD' });
    const fees = await lookupStudentFees(rdr, student.id, D(2026, 3, 1));

    expect(fees?.total).toBe('1140000.0000');
    expect(fees?.usedFallback).toBe(true);
    expect(fees?.lines.map((l) => l.feeItemCode).sort()).toEqual([
      'REGISTRATION',
      'TUITION',
    ]);
  });

  it('prices a foreign student on the foreign schedule', async () => {
    const { uni: u, setter, approver, reader: rdr } = await fresh();

    const local = await draftFeeSchedule(setter, {
      ...key(u),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '1000000.00' }],
    });
    await approveFeeSchedule(approver, local.id);

    const foreign = await draftFeeSchedule(setter, {
      ...key(u),
      nationalityCategory: 'FOREIGN',
      currency: 'USD',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: u.feeItems.TUITION, amount: '5500.00' }],
    });
    await approveFeeSchedule(approver, foreign.id);

    const student = await placedStudent(u, { nationality: 'ET' });
    const fees = await lookupStudentFees(rdr, student.id, D(2026, 3, 1));

    expect(fees?.currency).toBe('USD');
    expect(fees?.total).toBe('5500.0000');
    expect(fees?.usedFallback).toBe(false);
  });

  it('refuses to price a student who has not been placed', async () => {
    const { uni: u } = await fresh();
    const registrar = await makePrincipal(u.tenantId, ['student.manage'], {
      name: 'reg2',
    });
    const student = await createStudent(registrar, {
      studentNo: 'S-UNPLACED',
      fullNameAr: 'طالب',
      fullNameEn: 'Unplaced Student',
    });

    // A3 could create a student with no programme so a cashier could take
    // money from them. Registration cannot bill one: there is no schedule.
    await expect(
      asTenant(u.tenantId, (tx) =>
        feeScheduleForStudent(tx, u.tenantId, student.id, D(2026, 3, 1)),
      ),
    ).rejects.toThrow(StudentNotPlacedError);

    await expect(
      asTenant(u.tenantId, (tx) =>
        feeScheduleForStudent(tx, u.tenantId, student.id, D(2026, 3, 1)),
      ),
    ).rejects.toThrow(/programme, batch, admission category not set/);
  });

  it('returns null rather than throwing when a cohort has no approved schedule', async () => {
    const { uni: u, reader: rdr } = await fresh();
    const student = await placedStudent(u);
    // Setup is a normal state, not an error, and registration has a better
    // sentence to say about it than the matrix does.
    await expect(lookupStudentFees(rdr, student.id, D(2026, 3, 1))).resolves.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Isolation
// ---------------------------------------------------------------------------

describe('fee matrix isolation', () => {
  it('never resolves another university schedule', async () => {
    const a = await fresh();
    const b = await fresh();

    const v = await draftFeeSchedule(a.setter, {
      ...key(a.uni),
      currency: 'SDG',
      effectiveFrom: D(2026, 1, 1),
      lines: [{ feeItemId: a.uni.feeItems.TUITION, amount: '999.00' }],
    });
    await approveFeeSchedule(a.approver, v.id);

    // Same shape of key, different tenant. RLS confines the read.
    const theirs = await asTenant(b.uni.tenantId, (tx) =>
      resolveFeeSchedule(tx, b.uni.tenantId, {
        ...key(b.uni),
        onDate: D(2026, 3, 1),
      }),
    );
    expect(theirs).toBeNull();
  });

  it('refuses a schedule pointing at another university programme', async () => {
    const a = await fresh();
    const b = await fresh();

    await expect(
      draftFeeSchedule(b.setter, {
        programmeId: a.uni.programmeIds.MBBS,
        batchId: b.uni.batchId,
        admissionCategoryId: b.uni.admissionCategories.GENERAL,
        currency: 'SDG',
        effectiveFrom: D(2026, 1, 1),
        lines: [{ feeItemId: b.uni.feeItems.TUITION, amount: '1.00' }],
      }),
    ).rejects.toThrow(FeeMatrixError);
  });
});
