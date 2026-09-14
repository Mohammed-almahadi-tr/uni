import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import { createStudent, findStudents } from '@/lib/students/registry';
import {
  birthDateAsHijri,
  birthDateFromHijri,
  checkProfileComplete,
  composeName,
  getProfile,
  profileCompleteness,
  ProfileError,
  saveProfile,
  setNameParts,
} from '@/lib/students/profile';
import {
  createDocumentType,
  documentChecklist,
  DocumentError,
  dropProgrammeRequirement,
  expiringDocuments,
  MAX_DOCUMENT_BYTES,
  rejectDocument,
  setProgrammeRequirements,
  uploadDocument,
  verifyDocument,
} from '@/lib/students/documents';
import {
  currentMedicalRecord,
  fitnessStatus,
  medicalHistory,
  MedicalError,
  recordExamination,
} from '@/lib/students/medical';
import { findLikelyDuplicates, searchDirectory } from '@/lib/students/directory';
import {
  installDocumentTypes,
  STANDARD_DOCUMENT_TYPES,
} from '@/lib/students/defaults';
import { DEFAULT_ROLES } from '@/lib/auth/permissions';
import { ForbiddenError } from '@/lib/auth/rbac';
import type { Principal } from '@/lib/auth/rbac';

/**
 * Student profile, documents and medical records (SRS Module 3, B3).
 *
 * The legacy baseline, verified in the sources:
 *
 *   · **One student lived in four tables with no key joining them.**
 *     `StdForm` (admission form), `StdData` (a second, hand-typed copy that
 *     only the search dialog read), `StudentsProfilees` (accepted) and
 *     `StudentsProfilesIndecent` (rejected). `FrmStudForm2` typed the four
 *     Arabic names into the first; `FrmDataEntery` typed the same four names
 *     again into the second. Nothing reconciled them.
 *
 *   · **Search matched a prefix of the first name only.**
 *     `Where StdFirName like N'<typed>%'` — so looking a student up by family
 *     name returned nothing, and أحمد never matched احمد.
 *
 *   · **The medical form validated four name fields and then discarded them.**
 *     The insert named six columns and none of them was a name. An unset HIV
 *     combo box was stored as the empty string, so "not tested" and "negative"
 *     were the same value. There was no verdict and no examiner.
 *
 *   · **The profile save deleted before inserting** — the third screen in this
 *     codebase found doing that — and the completeness indicator painted a
 *     grid cell red when it held exactly one space character.
 *
 * The properties below are the negations of those.
 */

let uni: University;
let registrar: Principal;
/** A second registry officer. Verification requires one. */
let checker: Principal;
let cashier: Principal;
let doctor: Principal;

const DIGEST = (n: number) => n.toString(16).padStart(64, '0');
let storageCounter = 0;
const storageKey = () => `docs/test/${Date.now()}-${(storageCounter += 1)}`;

const PARTS = {
  ar1: 'أحمد', ar2: 'محمد', ar3: 'عبد', ar4: 'الرحمن',
  en1: 'Ahmed', en2: 'Mohamed', en3: 'Abd', en4: 'Alrahman',
};

async function makeStudent(
  no: string,
  overrides: Partial<Parameters<typeof createStudent>[1]> = {},
): Promise<string> {
  const s = await createStudent(registrar, {
    studentNo: no,
    fullNameAr: 'طالب اختبار',
    fullNameEn: 'Test Student',
    programmeId: uni.programmeIds.MBBS,
    batchId: uni.batchId,
    admissionCategoryId: uni.admissionCategories.GENERAL,
    nationalityId: uni.nationalities.SD,
    ...overrides,
  });
  return s.id;
}

async function upload(
  studentId: string,
  code: string,
  extra: { expiresOn?: Date; by?: Principal } = {},
) {
  return uploadDocument(extra.by ?? registrar, {
    studentId,
    documentTypeId: uni.documentTypes[code],
    fileName: `${code.toLowerCase()}.pdf`,
    contentType: 'application/pdf',
    byteSize: 4096,
    storageKey: storageKey(),
    sha256: DIGEST(storageCounter),
    expiresOn: extra.expiresOn,
  });
}

beforeAll(async () => {
  uni = await makeUniversity();
  registrar = await makePrincipal(
    uni.tenantId,
    ['student.read', 'student.manage', 'student.status', 'academic.manage'],
    { name: 'registrar' },
  );
  checker = await makePrincipal(
    uni.tenantId,
    ['student.read', 'student.manage', 'document.verify'],
    { name: 'checker' },
  );
  cashier = await makePrincipal(uni.tenantId, ['student.read'], { name: 'cashier' });
  doctor = await makePrincipal(
    uni.tenantId,
    ['student.read', 'medical.read', 'medical.manage'],
    { name: 'doctor' },
  );
});

afterAll(async () => {
  await disconnectAll();
});

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

describe('four-part names', () => {
  it('composes the displayed name from the parts', () => {
    expect(composeName('أحمد', 'محمد', 'عبد', 'الرحمن')).toBe('أحمد محمد عبد الرحمن');
  });

  it('drops nothing and adds no double space when a part is padded', () => {
    expect(composeName(' Ahmed ', 'Mohamed', 'Abd', 'Alrahman')).toBe(
      'Ahmed Mohamed Abd Alrahman',
    );
  });

  it('creates a student from the parts, deriving both displayed names', async () => {
    const id = await makeStudent('N-NAME-1', {
      fullNameAr: undefined,
      fullNameEn: undefined,
      nameParts: PARTS,
    });
    const { student } = await getProfile(registrar, id);
    expect(student.fullNameAr).toBe('أحمد محمد عبد الرحمن');
    expect(student.fullNameEn).toBe('Ahmed Mohamed Abd Alrahman');
    expect(student.nameAr3).toBe('عبد');
  });

  it('refuses three parts', async () => {
    const id = await makeStudent('N-NAME-2');
    await expect(
      setNameParts(registrar, id, { ...PARTS, ar4: '  ' }),
    ).rejects.toThrow(ProfileError);
  });

  it('rewrites the search key, so the student is found by the new name', async () => {
    const id = await makeStudent('N-NAME-3');
    const before = await findStudents(registrar, 'الرحمن');
    expect(before.map((s) => s.id)).not.toContain(id);

    await setNameParts(registrar, id, PARTS);

    const after = await findStudents(registrar, 'الرحمن');
    expect(after.map((s) => s.id)).toContain(id);
  });

  // The database checks the composition itself, so no writer — including one
  // holding a psql session — can leave the displayed name and its parts saying
  // different things.
  it('the database refuses a full name that disagrees with its parts', async () => {
    const id = await makeStudent('N-NAME-4');
    await setNameParts(registrar, id, PARTS);

    await expect(
      asSystem((tx) =>
        tx.student.update({
          where: { id },
          data: { fullNameAr: 'شخص آخر تماما' },
        }),
      ),
    ).rejects.toThrow(/does not match its four parts/i);
  });

  it('the database refuses two of four name parts', async () => {
    const id = await makeStudent('N-NAME-5');
    await expect(
      asSystem((tx) =>
        tx.student.update({
          where: { id },
          // The full name agrees with the two parts, so the composition
          // trigger is satisfied and the all-or-none CHECK is what refuses.
          data: { nameAr1: 'أحمد', nameAr2: 'محمد', fullNameAr: 'أحمد محمد' },
        }),
      ),
    ).rejects.toThrow(/chk_student_name_parts_ar/i);
  });
});

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

describe('profile', () => {
  it('saves and reads back', async () => {
    const id = await makeStudent('N-PROF-1');
    await saveProfile(registrar, id, {
      gender: 'MALE',
      dateOfBirth: new Date(Date.UTC(2006, 4, 17)),
      birthCalendar: 'GREGORIAN',
      placeOfBirth: 'Khartoum',
      phone: '0912345678',
      address: 'Al Amarat, Khartoum',
      guardianName: 'محمد عبد الرحمن',
      guardianRelationship: 'Father',
      guardianOccupation: 'Engineer',
      guardianPhone: '0911111111',
      schoolName: 'Comboni College',
      certificateTypeId: uni.certificateTypes.SD_SECONDARY,
      certificateScore: '84.5',
      certificateYear: 2025,
    });

    const { profile } = await getProfile(registrar, id);
    expect(profile?.placeOfBirth).toBe('Khartoum');
    expect(profile?.guardianOccupation).toBe('Engineer');
    expect(profile?.certificateScore?.toString()).toBe('84.5');
  });

  // The legacy screen loaded the parent's occupation into a control and saved
  // it into the `PhoneNo` column, which the profile grid then displayed under
  // a telephone heading. Two named fields, so it cannot happen here.
  it('keeps the guardian occupation out of the telephone field', async () => {
    const id = await makeStudent('N-PROF-2');
    await saveProfile(registrar, id, {
      guardianOccupation: 'Teacher',
      guardianPhone: '0900000000',
    });
    const { profile } = await getProfile(registrar, id);
    expect(profile?.guardianOccupation).toBe('Teacher');
    expect(profile?.guardianPhone).toBe('0900000000');
  });

  it('reports which fields changed, and only those', async () => {
    const id = await makeStudent('N-PROF-3');
    await saveProfile(registrar, id, { phone: '0900000001', address: 'Bahri' });

    const second = await saveProfile(registrar, id, {
      phone: '0900000001',
      address: 'Omdurman',
    });
    expect(second.changed).toEqual(['address']);
  });

  it('refuses a date of birth in the future', async () => {
    const id = await makeStudent('N-PROF-4');
    await expect(
      saveProfile(registrar, id, {
        dateOfBirth: new Date(Date.now() + 86_400_000),
      }),
    ).rejects.toThrow(ProfileError);
  });

  it('converts a Hijri birth date once and renders it back', async () => {
    const g = birthDateFromHijri(1427, 4, 19);
    const back = birthDateAsHijri(g);
    expect(back.year).toBe(1427);
    expect(back.month).toBe(4);
    expect(back.day).toBe(19);
  });

  it('refuses a Hijri date that does not exist', () => {
    expect(() => birthDateFromHijri(1427, 13, 1)).toThrow(ProfileError);
  });

  it('requires student.manage to edit', async () => {
    const id = await makeStudent('N-PROF-5');
    await expect(saveProfile(cashier, id, { phone: '09' })).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Completeness — the replacement for "cell equals one space, paint it red"
// ---------------------------------------------------------------------------

describe('profile completeness', () => {
  it('names what is missing rather than colouring it', async () => {
    const id = await makeStudent('N-COMP-1');
    const result = await checkProfileComplete(registrar, id);

    expect(result.complete).toBe(false);
    expect(result.missing).toContain('Arabic name parts');
    expect(result.missing).toContain('National ID');
    expect(result.missing).toContain('Date of birth');
  });

  it('names the four dimensions the fee matrix is keyed on', () => {
    const result = profileCompleteness(
      {
        nameAr1: 'أحمد', nameEn1: 'Ahmed', nationalId: '1',
        programmeId: null, batchId: null,
        admissionCategoryId: null, nationalityId: null,
      },
      null,
    );
    expect(result.missing).toEqual(
      expect.arrayContaining(['Programme', 'Batch', 'Admission category', 'Nationality']),
    );
  });

  it('is complete once everything is on file', async () => {
    const id = await makeStudent('N-COMP-2', {
      nationalId: 'NID-COMP-2',
      fullNameAr: undefined,
      fullNameEn: undefined,
      nameParts: PARTS,
    });
    await saveProfile(registrar, id, {
      gender: 'FEMALE',
      dateOfBirth: new Date(Date.UTC(2005, 0, 2)),
      phone: '0900000002',
      address: 'Khartoum',
      guardianName: 'ولي الأمر',
      guardianPhone: '0900000003',
    });

    const result = await checkProfileComplete(registrar, id);
    expect(result.missing).toEqual([]);
    expect(result.complete).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The four fee-matrix dimensions — deferred from B1, settled here
// ---------------------------------------------------------------------------

describe('academic dimensions', () => {
  it('can be filled in on a student created without them', async () => {
    const id = await makeStudent('N-DIM-1', {
      programmeId: null,
      batchId: null,
      admissionCategoryId: null,
      nationalityId: null,
    });

    await asSystem((tx) =>
      tx.student.update({
        where: { id },
        data: { programmeId: uni.programmeIds.NURS, batchId: uni.batchId },
      }),
    );

    const { student } = await getProfile(registrar, id);
    expect(student.programmeId).toBe(uni.programmeIds.NURS);
  });

  // Clearing one silently un-prices the student: resolveFeeSchedule stops
  // finding the schedule that has been billing them all year, and nothing
  // reports it.
  it('cannot be cleared once set', async () => {
    const id = await makeStudent('N-DIM-2');
    await expect(
      asSystem((tx) => tx.student.update({ where: { id }, data: { programmeId: null } })),
    ).rejects.toThrow(/cannot be cleared once set/i);
  });

  it('refuses to clear the batch too', async () => {
    const id = await makeStudent('N-DIM-3');
    await expect(
      asSystem((tx) => tx.student.update({ where: { id }, data: { batchId: null } })),
    ).rejects.toThrow(/cannot be cleared once set/i);
  });
});

// ---------------------------------------------------------------------------
// Directory search
// ---------------------------------------------------------------------------

describe('directory search', () => {
  let ahmedId: string;

  beforeAll(async () => {
    ahmedId = await makeStudent('N-DIR-1', {
      fullNameAr: undefined,
      fullNameEn: undefined,
      nameParts: PARTS,
      nationalId: 'NID-DIR-1',
    });
    await makeStudent('N-DIR-2', {
      fullNameAr: 'فاطمه احمد الطيب علي',
      fullNameEn: 'Fatima Ahmed Eltayeb Ali',
    });
    await makeStudent('N-DIR-3', {
      fullNameAr: 'سارة عثمان بابكر حسن',
      fullNameEn: 'Sara Osman Babiker Hassan',
      programmeId: uni.programmeIds.NURS,
    });
  });

  // The single defect this whole module exists to remove: the legacy query was
  // `Where StdFirName like N'<typed>%'`, so a family name matched nothing.
  it('finds a student by their family name', async () => {
    const { rows } = await searchDirectory(registrar, 'الرحمن');
    expect(rows.map((r) => r.id)).toContain(ahmedId);
  });

  it('finds a student by a middle name', async () => {
    const { rows } = await searchDirectory(registrar, 'Babiker');
    expect(rows.map((r) => r.studentNo)).toContain('N-DIR-3');
  });

  it('finds أحمد when the record says احمد, and the reverse', async () => {
    const withHamza = await searchDirectory(registrar, 'أحمد');
    const without = await searchDirectory(registrar, 'احمد');
    expect(withHamza.rows.map((r) => r.studentNo)).toContain('N-DIR-2');
    expect(without.rows.map((r) => r.studentNo)).toContain('N-DIR-1');
  });

  it('folds taa marbuta, so فاطمه finds فاطمة', async () => {
    const { rows } = await searchDirectory(registrar, 'فاطمة');
    expect(rows.map((r) => r.studentNo)).toContain('N-DIR-2');
  });

  it('narrows on a second term rather than widening', async () => {
    const one = await searchDirectory(registrar, 'احمد');
    const two = await searchDirectory(registrar, 'احمد الطيب');
    expect(two.rows.length).toBeLessThan(one.rows.length);
    expect(two.rows.map((r) => r.studentNo)).toEqual(['N-DIR-2']);
  });

  it('finds by university number and by national ID', async () => {
    expect((await searchDirectory(registrar, 'N-DIR-3')).rows).toHaveLength(1);
    expect((await searchDirectory(registrar, 'NID-DIR-1')).rows).toHaveLength(1);
  });

  it('filters a cohort with no search term at all', async () => {
    const { rows } = await searchDirectory(registrar, '', {
      programmeId: uni.programmeIds.NURS,
    });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.programmeId === uni.programmeIds.NURS)).toBe(true);
  });

  it('filters by faculty through the programme', async () => {
    const { rows } = await searchDirectory(registrar, '', { facultyId: uni.facultyId });
    expect(rows.length).toBeGreaterThan(0);
  });

  it('reports the total, not the size of the page', async () => {
    const { rows, total } = await searchDirectory(registrar, '', {}, { take: 1 });
    expect(rows).toHaveLength(1);
    expect(total).toBeGreaterThan(1);
  });

  it('requires student.read', async () => {
    const nobody = await makePrincipal(uni.tenantId, [], { name: 'nobody' });
    await expect(searchDirectory(nobody, 'x')).rejects.toThrow(ForbiddenError);
  });

  // The database makes an identical national ID impossible, so this is the
  // duplicate that actually reaches the registry: a foreign student on file
  // twice, once with an ID and once without.
  it('surfaces a duplicate sharing a passport number', async () => {
    const a = await makeStudent('N-DUP-1', { nationalId: 'NID-DUP' });
    const b = await makeStudent('N-DUP-2', {
      fullNameAr: 'عبد الله يوسف',
      fullNameEn: 'Abdalla Yousif',
    });
    await saveProfile(registrar, a, { passportNo: 'P0123456' });
    await saveProfile(registrar, b, { passportNo: 'P0123456' });

    const dupes = await findLikelyDuplicates(registrar, a);
    expect(dupes.map((d) => d.id)).toContain(b);
    expect(dupes[0].reason).toBe('Same passport number');
  });

  it('does not look for a duplicate national ID, because the index forbids one', async () => {
    await makeStudent('N-DUP-5', { nationalId: 'NID-UNIQUE' });
    await expect(
      makeStudent('N-DUP-6', { nationalId: 'NID-UNIQUE' }),
    ).rejects.toThrow(/already belongs to/i);
  });

  it('surfaces a duplicate sharing a normalised name', async () => {
    const a = await makeStudent('N-DUP-3', { fullNameAr: 'خالد إبراهيم موسى' });
    const b = await makeStudent('N-DUP-4', { fullNameAr: 'خالد ابراهيم موسي' });

    const dupes = await findLikelyDuplicates(registrar, a);
    expect(dupes.map((d) => d.id)).toContain(b);
  });
});

// ---------------------------------------------------------------------------
// Document types and per-programme checklists
// ---------------------------------------------------------------------------

describe('document types', () => {
  it('installs the standard set idempotently', async () => {
    const again = await installDocumentTypes(uni.tenantId, uni.adminUserId);
    expect(again.created).toBe(0);
    expect(again.skipped).toBe(STANDARD_DOCUMENT_TYPES.length);
  });

  it('accepts a tenant-specific type', async () => {
    const t = await createDocumentType(registrar, {
      code: 'army_exemption',
      nameAr: 'إعفاء الخدمة الوطنية',
      nameEn: 'National Service Exemption',
    });
    expect(t.code).toBe('ARMY_EXEMPTION');
  });

  // The assertion that names the legacy defect: `frmTuitionFees`,
  // `frmStudentsVacants` and `frmStudentProfiles` all deleted a set of rows
  // before inserting the ones on screen. Declaring one requirement must leave
  // the others exactly where they were.
  it('declaring one requirement leaves the others untouched', async () => {
    const before = await documentChecklist(
      registrar,
      await makeStudent('N-REQ-0'),
    );
    const codesBefore = before.rows.map((r) => r.code).sort();

    await setProgrammeRequirements(registrar, uni.programmeIds.MBBS, [
      { documentTypeId: uni.documentTypes.MEDICAL_CERT, isMandatory: false },
    ]);

    const after = await documentChecklist(registrar, await makeStudent('N-REQ-1'));
    const codesAfter = after.rows.map((r) => r.code).sort();

    for (const code of codesBefore) expect(codesAfter).toContain(code);
    expect(codesAfter).toContain('MEDICAL_CERT');
  });

  it('changes whether an existing requirement is mandatory without re-adding it', async () => {
    const raised = await setProgrammeRequirements(registrar, uni.programmeIds.MBBS, [
      { documentTypeId: uni.documentTypes.MEDICAL_CERT, isMandatory: true },
    ]);
    expect(raised).toEqual({ added: 0, updated: 1 });

    const lowered = await setProgrammeRequirements(registrar, uni.programmeIds.MBBS, [
      { documentTypeId: uni.documentTypes.MEDICAL_CERT, isMandatory: false },
    ]);
    expect(lowered).toEqual({ added: 0, updated: 1 });

    // Declaring it a third time with no change is a no-op, not a rewrite.
    const again = await setProgrammeRequirements(registrar, uni.programmeIds.MBBS, [
      { documentTypeId: uni.documentTypes.MEDICAL_CERT, isMandatory: false },
    ]);
    expect(again).toEqual({ added: 0, updated: 0 });
  });

  it('removing a requirement is a separate, deliberate act', async () => {
    await setProgrammeRequirements(registrar, uni.programmeIds.NURS, [
      { documentTypeId: uni.documentTypes.MEDICAL_CERT },
    ]);
    const id = await makeStudent('N-REQ-2', { programmeId: uni.programmeIds.NURS });
    expect((await documentChecklist(registrar, id)).rows).toHaveLength(1);

    await dropProgrammeRequirement(
      registrar,
      uni.programmeIds.NURS,
      uni.documentTypes.MEDICAL_CERT,
    );
    expect((await documentChecklist(registrar, id)).rows).toHaveLength(0);
  });

  it('lists a mandatory requirement as MISSING before anything is uploaded', async () => {
    const id = await makeStudent('N-REQ-3');
    const list = await documentChecklist(registrar, id);
    const photo = list.rows.find((r) => r.code === 'PHOTO');
    expect(photo?.state).toBe('MISSING');
    expect(photo?.isMandatory).toBe(true);
    expect(list.satisfied).toBe(false);
    expect(list.outstanding).toContain('Passport Photograph');
  });
});

// ---------------------------------------------------------------------------
// Uploads
// ---------------------------------------------------------------------------

describe('document upload', () => {
  it('turns the checklist row PENDING', async () => {
    const id = await makeStudent('N-DOC-1');
    await upload(id, 'PHOTO');
    const list = await documentChecklist(registrar, id);
    expect(list.rows.find((r) => r.code === 'PHOTO')?.state).toBe('PENDING');
  });

  // Directly replaces `Delete From StudentsProfilees Where StudentIndex=…`
  // followed by an insert. The replaced scan is the evidence of what was
  // checked last year.
  it('supersedes the previous document rather than deleting it', async () => {
    const id = await makeStudent('N-DOC-2');
    const first = await upload(id, 'NATIONAL_ID');
    const second = await upload(id, 'NATIONAL_ID');

    expect(second.supersededId).toBe(first.id);

    const all = await asSystem((tx) =>
      tx.studentDocument.findMany({ where: { studentId: id }, select: { id: true } }),
    );
    expect(all.map((d) => d.id).sort()).toEqual([first.id, second.id].sort());

    const list = await documentChecklist(registrar, id);
    expect(list.rows.filter((r) => r.code === 'NATIONAL_ID')).toHaveLength(1);
  });

  it('the database allows only one live document per type', async () => {
    const id = await makeStudent('N-DOC-3');
    await upload(id, 'PHOTO');

    await expect(
      asSystem((tx) =>
        tx.studentDocument.create({
          data: {
            tenantId: uni.tenantId,
            studentId: id,
            documentTypeId: uni.documentTypes.PHOTO,
            fileName: 'sneaky.pdf',
            contentType: 'application/pdf',
            byteSize: 10,
            storageKey: storageKey(),
            sha256: DIGEST(9001),
            uploadedById: registrar.userId,
          },
        }),
      ),
    ).rejects.toThrow(/Unique constraint failed.*document_type_id/is);
  });

  it('refuses a content type a scanner does not produce', async () => {
    const id = await makeStudent('N-DOC-4');
    await expect(
      uploadDocument(registrar, {
        studentId: id,
        documentTypeId: uni.documentTypes.PHOTO,
        fileName: 'macro.docm',
        contentType: 'application/vnd.ms-word.document.macroEnabled.12',
        byteSize: 100,
        storageKey: storageKey(),
        sha256: DIGEST(2),
      }),
    ).rejects.toThrow(DocumentError);
  });

  it('refuses an oversized upload', async () => {
    const id = await makeStudent('N-DOC-5');
    await expect(
      uploadDocument(registrar, {
        studentId: id,
        documentTypeId: uni.documentTypes.PHOTO,
        fileName: 'huge.png',
        contentType: 'image/png',
        byteSize: MAX_DOCUMENT_BYTES + 1,
        storageKey: storageKey(),
        sha256: DIGEST(3),
      }),
    ).rejects.toThrow(/exceeds/i);
  });

  it('refuses a digest that is not 64 hex characters', async () => {
    const id = await makeStudent('N-DOC-6');
    await expect(
      uploadDocument(registrar, {
        studentId: id,
        documentTypeId: uni.documentTypes.PHOTO,
        fileName: 'x.png',
        contentType: 'image/png',
        byteSize: 10,
        storageKey: storageKey(),
        sha256: 'not-a-digest',
      }),
    ).rejects.toThrow(DocumentError);
  });

  // A residence permit with no expiry never appears on the expiry report, so
  // it is a permit nobody will ever be prompted to chase.
  it('refuses a renewable document with no expiry date', async () => {
    const id = await makeStudent('N-DOC-7');
    await expect(upload(id, 'PASSPORT')).rejects.toThrow(/must record when/i);
  });

  it('accepts the same document once the expiry is given', async () => {
    const id = await makeStudent('N-DOC-8');
    const doc = await upload(id, 'PASSPORT', {
      expiresOn: new Date(Date.UTC(2030, 0, 1)),
    });
    expect(doc.id).toBeTruthy();
  });

  it('the database refuses swapping the bytes behind a document', async () => {
    const id = await makeStudent('N-DOC-9');
    const doc = await upload(id, 'PHOTO');

    await expect(
      asSystem((tx) =>
        tx.studentDocument.update({
          where: { id: doc.id },
          data: { sha256: DIGEST(4242) },
        }),
      ),
    ).rejects.toThrow(/cannot be swapped/i);
  });

  it('the database refuses editing a superseded document', async () => {
    const id = await makeStudent('N-DOC-10');
    const first = await upload(id, 'PHOTO');
    await upload(id, 'PHOTO');

    await expect(
      asSystem((tx) =>
        tx.studentDocument.update({
          where: { id: first.id },
          data: { state: 'VERIFIED' },
        }),
      ),
    ).rejects.toThrow(/now history/i);
  });
});

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

describe('document verification', () => {
  it('records who checked it and when', async () => {
    const id = await makeStudent('N-VER-1');
    const doc = await upload(id, 'SECONDARY_CERT');
    await verifyDocument(checker, doc.id);

    const row = await asSystem((tx) =>
      tx.studentDocument.findUniqueOrThrow({
        where: { id: doc.id },
        select: { state: true, verifiedById: true, verifiedAt: true },
      }),
    );
    expect(row.state).toBe('VERIFIED');
    expect(row.verifiedById).toBe(checker.userId);
    expect(row.verifiedAt).toBeInstanceOf(Date);
  });

  // The control that makes verification mean anything.
  it('the uploader cannot verify their own upload', async () => {
    const id = await makeStudent('N-VER-2');
    const doc = await upload(id, 'SECONDARY_CERT', { by: checker });
    await expect(verifyDocument(checker, doc.id)).rejects.toThrow(
      /verified by nobody/i,
    );
  });

  it('and the database refuses it too', async () => {
    const id = await makeStudent('N-VER-3');
    const doc = await upload(id, 'SECONDARY_CERT');

    await expect(
      asSystem((tx) =>
        tx.studentDocument.update({
          where: { id: doc.id },
          data: {
            state: 'VERIFIED',
            verifiedById: registrar.userId,
            verifiedAt: new Date(),
          },
        }),
      ),
    ).rejects.toThrow(/chk_document_verifier_not_uploader/i);
  });

  it('a rejection carries the reason the student is shown', async () => {
    const id = await makeStudent('N-VER-4');
    const doc = await upload(id, 'SECONDARY_CERT');
    await rejectDocument(checker, doc.id, 'The seat number is illegible.');

    const list = await documentChecklist(registrar, id);
    const row = list.rows.find((r) => r.code === 'SECONDARY_CERT');
    expect(row?.state).toBe('REJECTED');
    expect(row?.rejectionReason).toBe('The seat number is illegible.');
  });

  it('refuses a rejection with no reason', async () => {
    const id = await makeStudent('N-VER-5');
    const doc = await upload(id, 'SECONDARY_CERT');
    await expect(rejectDocument(checker, doc.id, '   ')).rejects.toThrow(DocumentError);
  });

  it('a verdict is not a switch — it cannot be flipped twice', async () => {
    const id = await makeStudent('N-VER-6');
    const doc = await upload(id, 'SECONDARY_CERT');
    await verifyDocument(checker, doc.id);
    await expect(rejectDocument(checker, doc.id, 'changed my mind')).rejects.toThrow(
      /already verified/i,
    );
  });

  it('requires document.verify', async () => {
    const id = await makeStudent('N-VER-7');
    const doc = await upload(id, 'SECONDARY_CERT');
    await expect(verifyDocument(registrar, doc.id)).rejects.toThrow(ForbiddenError);
  });

  it('the checklist is satisfied only when every mandatory item is verified', async () => {
    const id = await makeStudent('N-VER-8');
    for (const code of ['PHOTO', 'NATIONAL_ID', 'SECONDARY_CERT']) {
      const doc = await upload(id, code);
      await verifyDocument(checker, doc.id);
    }
    const list = await documentChecklist(registrar, id);
    expect(list.outstanding).toEqual([]);
    expect(list.satisfied).toBe(true);
  });

  // A passport verified in 2024 and expired in 2025 is not a satisfied
  // requirement, however green it once was.
  it('an expired document is not satisfied, even though it was verified', async () => {
    const id = await makeStudent('N-VER-9');
    await setProgrammeRequirements(registrar, uni.programmeIds.MBBS, [
      { documentTypeId: uni.documentTypes.PASSPORT, isMandatory: true },
    ]);

    const doc = await upload(id, 'PASSPORT', {
      expiresOn: new Date(Date.UTC(2027, 0, 1)),
    });
    await verifyDocument(checker, doc.id);

    const now = await documentChecklist(registrar, id, new Date(Date.UTC(2026, 5, 1)));
    expect(now.rows.find((r) => r.code === 'PASSPORT')?.state).toBe('VERIFIED');

    const later = await documentChecklist(registrar, id, new Date(Date.UTC(2027, 5, 1)));
    expect(later.rows.find((r) => r.code === 'PASSPORT')?.state).toBe('EXPIRED');
    expect(later.satisfied).toBe(false);

    // Put the fixture back for anything that runs after this.
    await setProgrammeRequirements(registrar, uni.programmeIds.MBBS, [
      { documentTypeId: uni.documentTypes.PASSPORT, isMandatory: false },
    ]);
  });

  it('lists documents that expire inside the horizon', async () => {
    const id = await makeStudent('N-VER-10');
    await upload(id, 'RESIDENCE_PERMIT', { expiresOn: new Date(Date.UTC(2026, 8, 15)) });

    const due = await expiringDocuments(registrar, {
      asOf: new Date(Date.UTC(2026, 7, 1)),
      withinDays: 60,
    });
    expect(due.map((d) => d.studentNo)).toContain('N-VER-10');

    const notYet = await expiringDocuments(registrar, {
      asOf: new Date(Date.UTC(2026, 0, 1)),
      withinDays: 30,
    });
    expect(notYet.map((d) => d.studentNo)).not.toContain('N-VER-10');
  });

  it('a checked document cannot be deleted', async () => {
    const id = await makeStudent('N-VER-11');
    const doc = await upload(id, 'SECONDARY_CERT');
    await verifyDocument(checker, doc.id);

    await expect(
      asSystem((tx) => tx.studentDocument.delete({ where: { id: doc.id } })),
    ).rejects.toThrow(/cannot be deleted/i);
  });
});

// ---------------------------------------------------------------------------
// Medical
// ---------------------------------------------------------------------------

describe('medical records', () => {
  it('records an examination with a verdict and a named clinician', async () => {
    const id = await makeStudent('N-MED-1');
    await recordExamination(doctor, {
      studentId: id,
      examDate: new Date(Date.UTC(2026, 7, 1)),
      medicalOfficer: 'Dr Salma Ibrahim',
      bloodGroup: 'O_POS',
      hepatitisB: 'NEGATIVE',
      hiv: 'NEGATIVE',
      vaccinations: ['Hepatitis B', 'Meningitis'],
      verdict: 'FIT',
      validUntil: new Date(Date.UTC(2027, 7, 1)),
    });

    const record = await currentMedicalRecord(doctor, id);
    expect(record?.verdict).toBe('FIT');
    expect(record?.medicalOfficer).toBe('Dr Salma Ibrahim');
    expect(record?.bloodGroup).toBe('O_POS');
    expect(record?.recordedById).toBe(doctor.userId);
  });

  // The legacy insert passed `CombAids.Text` straight through; an unselected
  // combo box is the empty string, so "never screened" and "screened negative"
  // were stored identically.
  it('distinguishes not tested from negative', async () => {
    const id = await makeStudent('N-MED-2');
    await recordExamination(doctor, {
      studentId: id,
      examDate: new Date(Date.UTC(2026, 7, 1)),
      medicalOfficer: 'Dr Salma Ibrahim',
      hepatitisB: 'NEGATIVE',
      verdict: 'FIT',
    });

    const record = await currentMedicalRecord(doctor, id);
    expect(record?.hepatitisB).toBe('NEGATIVE');
    expect(record?.hiv).toBe('NOT_TESTED');
  });

  it('a re-examination supersedes the previous one, and both stay on file', async () => {
    const id = await makeStudent('N-MED-3');
    const first = await recordExamination(doctor, {
      studentId: id,
      examDate: new Date(Date.UTC(2026, 1, 1)),
      medicalOfficer: 'Dr A',
      verdict: 'CONDITIONAL',
      verdictNote: 'Repeat hepatitis screen in six months.',
    });
    const second = await recordExamination(doctor, {
      studentId: id,
      examDate: new Date(Date.UTC(2026, 7, 1)),
      medicalOfficer: 'Dr B',
      hepatitisB: 'NEGATIVE',
      verdict: 'FIT',
    });

    expect(second.supersededId).toBe(first.id);

    const current = await currentMedicalRecord(doctor, id);
    expect(current?.id).toBe(second.id);

    const history = await medicalHistory(doctor, id);
    expect(history).toHaveLength(2);
    expect(history[0].medicalOfficer).toBe('Dr B');
  });

  it('the database allows only one current record per student', async () => {
    const id = await makeStudent('N-MED-4');
    await recordExamination(doctor, {
      studentId: id,
      examDate: new Date(Date.UTC(2026, 7, 1)),
      medicalOfficer: 'Dr A',
      verdict: 'FIT',
    });

    await expect(
      asSystem((tx) =>
        tx.medicalRecord.create({
          data: {
            tenantId: uni.tenantId,
            studentId: id,
            examDate: new Date(Date.UTC(2026, 7, 2)),
            medicalOfficer: 'Dr Ghost',
            verdict: 'FIT',
            recordedById: doctor.userId,
          },
        }),
      ),
    ).rejects.toThrow(/Unique constraint failed.*student_id/is);
  });

  it('a conditional clearance must state the condition', async () => {
    const id = await makeStudent('N-MED-5');
    await expect(
      recordExamination(doctor, {
        studentId: id,
        examDate: new Date(Date.UTC(2026, 7, 1)),
        medicalOfficer: 'Dr A',
        verdict: 'CONDITIONAL',
      }),
    ).rejects.toThrow(MedicalError);
  });

  it('an unfit verdict must state the reason', async () => {
    const id = await makeStudent('N-MED-6');
    await expect(
      recordExamination(doctor, {
        studentId: id,
        examDate: new Date(Date.UTC(2026, 7, 1)),
        medicalOfficer: 'Dr A',
        verdict: 'UNFIT',
      }),
    ).rejects.toThrow(/appeals against/i);
  });

  it('the database refuses an unreasoned verdict as well', async () => {
    const id = await makeStudent('N-MED-7');
    await expect(
      asSystem((tx) =>
        tx.medicalRecord.create({
          data: {
            tenantId: uni.tenantId,
            studentId: id,
            examDate: new Date(Date.UTC(2026, 7, 1)),
            medicalOfficer: 'Dr A',
            verdict: 'UNFIT',
            recordedById: doctor.userId,
          },
        }),
      ),
    ).rejects.toThrow(/chk_medical_verdict_reasoned/i);
  });

  it('refuses an examination with no named clinician', async () => {
    const id = await makeStudent('N-MED-8');
    await expect(
      recordExamination(doctor, {
        studentId: id,
        examDate: new Date(Date.UTC(2026, 7, 1)),
        medicalOfficer: '   ',
        verdict: 'FIT',
      }),
    ).rejects.toThrow(/name of the clinician/i);
  });

  it('refuses an examination dated in the future', async () => {
    const id = await makeStudent('N-MED-9');
    await expect(
      recordExamination(doctor, {
        studentId: id,
        examDate: new Date(Date.now() + 7 * 86_400_000),
        medicalOfficer: 'Dr A',
        verdict: 'FIT',
      }),
    ).rejects.toThrow(/has not happened yet/i);
  });

  // The same rule the ledger applies to a posted voucher: a finding recorded
  // on a date is what a decision taken that week was based on.
  it('a recorded examination cannot be edited', async () => {
    const id = await makeStudent('N-MED-10');
    const rec = await recordExamination(doctor, {
      studentId: id,
      examDate: new Date(Date.UTC(2026, 7, 1)),
      medicalOfficer: 'Dr A',
      verdict: 'FIT',
    });

    await expect(
      asSystem((tx) =>
        tx.medicalRecord.update({
          where: { id: rec.id },
          data: { verdict: 'UNFIT', verdictNote: 'rewriting history' },
        }),
      ),
    ).rejects.toThrow(/cannot be edited/i);
  });

  it('and cannot be deleted', async () => {
    const id = await makeStudent('N-MED-11');
    const rec = await recordExamination(doctor, {
      studentId: id,
      examDate: new Date(Date.UTC(2026, 7, 1)),
      medicalOfficer: 'Dr A',
      verdict: 'FIT',
    });

    await expect(
      asSystem((tx) => tx.medicalRecord.delete({ where: { id: rec.id } })),
    ).rejects.toThrow(/is not deleted/i);
  });

  // Telling a student they are unfit when their certificate has merely run out
  // is a different, and worse, conversation.
  it('reports a lapsed clearance as lapsed, not as unfit', async () => {
    const id = await makeStudent('N-MED-12');
    await recordExamination(doctor, {
      studentId: id,
      examDate: new Date(Date.UTC(2026, 0, 10)),
      medicalOfficer: 'Dr A',
      verdict: 'FIT',
      validUntil: new Date(Date.UTC(2026, 6, 1)),
    });

    const inForce = await fitnessStatus(doctor, id, new Date(Date.UTC(2026, 2, 1)));
    expect(inForce.state).toBe('FIT');
    expect(inForce.clear).toBe(true);

    const lapsed = await fitnessStatus(doctor, id, new Date(Date.UTC(2026, 8, 1)));
    expect(lapsed.state).toBe('LAPSED');
    expect(lapsed.clear).toBe(false);
  });

  it('reports a student never examined as such', async () => {
    const id = await makeStudent('N-MED-13');
    const status = await fitnessStatus(doctor, id);
    expect(status.state).toBe('NOT_EXAMINED');
    expect(status.clear).toBe(false);
  });

  it('requires medical.read to read and medical.manage to record', async () => {
    const id = await makeStudent('N-MED-14');
    await expect(currentMedicalRecord(registrar, id)).rejects.toThrow(ForbiddenError);
    await expect(
      recordExamination(registrar, {
        studentId: id,
        examDate: new Date(Date.UTC(2026, 7, 1)),
        medicalOfficer: 'Dr A',
        verdict: 'FIT',
      }),
    ).rejects.toThrow(ForbiddenError);
  });

  // The legacy medical screen was reachable by every authenticated user
  // because the system had no roles at all.
  it('ships a Medical Officer role that cannot edit student records', () => {
    const role = DEFAULT_ROLES['Medical Officer'];
    expect(role.permissions).toContain('medical.manage');
    expect(role.permissions).not.toContain('student.manage');
    expect(DEFAULT_ROLES['Cashier'].permissions).not.toContain('medical.read');
  });
});
