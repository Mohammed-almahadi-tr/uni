import 'server-only';
import type {
  CalendarSystem,
  Gender,
  MaritalStatus,
} from '@/generated/prisma/enums';
import { Prisma } from '@/generated/prisma/client';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { buildSearchKey } from '@/lib/i18n/arabic';
import { toDateOnly } from '@/lib/ledger/period';
import { fromHijri, toHijri, type HijriDate } from '@/lib/i18n/calendar';

/**
 * The student profile (SRS REQ-ST-01, REQ-ST-04).
 *
 * The legacy system spread one student across four tables — `StdForm`,
 * `StdData`, `StudentsProfilees` and `StudentsProfilesIndecent` — with no key
 * joining any of them. The four Arabic names were typed twice, on two screens,
 * by two clerks: `FrmStudForm2` wrote them to `StdForm`, `FrmDataEntery` wrote
 * them again to `StdData`, and the search dialog read only the second. Nothing
 * reconciled the two, so a name corrected on one screen stayed wrong on the
 * other and the student remained unfindable.
 *
 * Here there is one student, one profile, and the name parts live on the
 * student row itself because they are identity rather than detail.
 */

export class ProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProfileError';
  }
}

// ---------------------------------------------------------------------------
// Names
// ---------------------------------------------------------------------------

export interface NameParts {
  ar1: string;
  ar2: string;
  ar3: string;
  ar4: string;
  en1: string;
  en2: string;
  en3: string;
  en4: string;
}

/**
 * Join four name parts into the displayed name.
 *
 * One function, used everywhere. The legacy build wrote `x1 + " " + x2 + " " +
 * x3 + " " + x4` inline in four different screens, and because VB's `+` on a
 * DBNull throws rather than yielding an empty string, a student with three
 * recorded names broke the entire profile list rather than displaying a short
 * name.
 */
export function composeName(...parts: string[]): string {
  return parts
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .join(' ');
}

function requireFour(parts: string[], language: 'Arabic' | 'English'): void {
  const given = parts.filter((p) => p.trim().length > 0).length;
  if (given !== 4) {
    throw new ProfileError(
      `A ${language} name needs all four parts; ${given} ${given === 1 ? 'was' : 'were'} given. ` +
        `Sudanese names run to four, certificates are issued in all four, and a partial set is ` +
        `what makes a graduate's certificate disagree with their ID.`,
    );
  }
}

/**
 * Record the discrete four-part names, rewriting the displayed name and the
 * search key from them in one statement.
 *
 * The database checks the composition independently: if `full_name_ar` and the
 * parts ever disagree, the write is refused. Two representations of one fact
 * is the shape of every reconciliation problem this project's legacy audit
 * found, and a name is no exception.
 */
export async function setNameParts(
  principal: Principal,
  studentId: string,
  parts: NameParts,
): Promise<{ fullNameAr: string; fullNameEn: string }> {
  requirePermission(principal, 'student.manage');

  requireFour([parts.ar1, parts.ar2, parts.ar3, parts.ar4], 'Arabic');
  requireFour([parts.en1, parts.en2, parts.en3, parts.en4], 'English');

  const fullNameAr = composeName(parts.ar1, parts.ar2, parts.ar3, parts.ar4);
  const fullNameEn = composeName(parts.en1, parts.en2, parts.en3, parts.en4);

  return withTenant(principal.tenantId, async (tx) => {
    const before = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        tenantId: true,
        studentNo: true,
        fullNameAr: true,
        fullNameEn: true,
        nationalId: true,
      },
    });
    if (!before || before.tenantId !== principal.tenantId) {
      throw new ProfileError('Student not found in this tenant.');
    }

    await tx.student.update({
      where: { id: studentId },
      data: {
        nameAr1: parts.ar1.trim(),
        nameAr2: parts.ar2.trim(),
        nameAr3: parts.ar3.trim(),
        nameAr4: parts.ar4.trim(),
        nameEn1: parts.en1.trim(),
        nameEn2: parts.en2.trim(),
        nameEn3: parts.en3.trim(),
        nameEn4: parts.en4.trim(),
        fullNameAr,
        fullNameEn,
        searchKey: buildSearchKey(
          fullNameAr,
          fullNameEn,
          before.studentNo,
          before.nationalId,
        ),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'student_name',
      resourceId: studentId,
      before: { fullNameAr: before.fullNameAr, fullNameEn: before.fullNameEn },
      after: { fullNameAr, fullNameEn, parts },
    });

    return { fullNameAr, fullNameEn };
  });
}

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export interface ProfileInput {
  gender?: Gender | null;
  /** Gregorian. Use `birthDateFromHijri` when reading a Hijri document. */
  dateOfBirth?: Date | null;
  birthCalendar?: CalendarSystem | null;
  placeOfBirth?: string | null;
  religion?: string | null;
  maritalStatus?: MaritalStatus | null;

  passportNo?: string | null;
  passportExpiry?: Date | null;

  email?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  address?: string | null;

  guardianName?: string | null;
  guardianRelationship?: string | null;
  guardianOccupation?: string | null;
  guardianPhone?: string | null;
  guardianAddress?: string | null;
  emergencyName?: string | null;
  emergencyPhone?: string | null;

  schoolName?: string | null;
  certificateTypeId?: string | null;
  certificateSeatNo?: string | null;
  certificateYear?: number | null;
  certificateScore?: string | number | null;
}

/**
 * Convert a Hijri birth date to the Gregorian date that is stored.
 *
 * Offered separately so a registrar transcribing a Hijri passport converts
 * once, deliberately, rather than a screen guessing. The stored value is
 * always Gregorian; `birthCalendar` records what the document said, because
 * converting back through Umm al-Qura can land a day either side and somebody
 * comparing the profile against the passport needs to know why.
 */
export function birthDateFromHijri(year: number, month: number, day: number): Date {
  const g = fromHijri(year, month, day);
  if (!g) {
    throw new ProfileError(
      `${year}-${month}-${day} is not a date in the Umm al-Qura calendar.`,
    );
  }
  return g;
}

/** The stored Gregorian birth date rendered back into Hijri. */
export function birthDateAsHijri(dateOfBirth: Date): HijriDate {
  return toHijri(dateOfBirth);
}

const TRIMMABLE = [
  'placeOfBirth', 'religion', 'passportNo', 'email', 'phone', 'whatsapp',
  'address', 'guardianName', 'guardianRelationship', 'guardianOccupation',
  'guardianPhone', 'guardianAddress', 'emergencyName', 'emergencyPhone',
  'schoolName', 'certificateSeatNo',
] as const;

function cleaned(input: ProfileInput): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const key of TRIMMABLE) {
    if (key in input) {
      const v = input[key];
      out[key] = typeof v === 'string' ? v.trim() || null : (v ?? null);
    }
  }
  for (const key of ['gender', 'birthCalendar', 'maritalStatus', 'certificateTypeId',
                     'certificateYear'] as const) {
    if (key in input) out[key] = input[key] ?? null;
  }
  if ('dateOfBirth' in input) {
    out.dateOfBirth = input.dateOfBirth ? toDateOnly(input.dateOfBirth) : null;
  }
  if ('passportExpiry' in input) {
    out.passportExpiry = input.passportExpiry ? toDateOnly(input.passportExpiry) : null;
  }
  if ('certificateScore' in input) {
    out.certificateScore =
      input.certificateScore === null || input.certificateScore === undefined
        ? null
        : new Prisma.Decimal(input.certificateScore);
  }
  return out;
}

/**
 * Create or amend the profile. Every field that changes is audited with its
 * previous value (REQ-ST-04) — the legacy tables carried a single `Employee`
 * column, overwritten on each save, so the only thing recorded was who touched
 * the row last and nothing at all about what they changed.
 */
export async function saveProfile(
  principal: Principal,
  studentId: string,
  input: ProfileInput,
): Promise<{ id: string; changed: string[] }> {
  requirePermission(principal, 'student.manage');

  const data = cleaned(input);

  if (
    data.dateOfBirth instanceof Date &&
    data.dateOfBirth.getTime() > Date.now()
  ) {
    throw new ProfileError('A date of birth in the future is a transcription error.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: { tenantId: true },
    });
    if (!student || student.tenantId !== principal.tenantId) {
      throw new ProfileError('Student not found in this tenant.');
    }

    const before = await tx.studentProfile.findUnique({ where: { studentId } });

    const saved = before
      ? await tx.studentProfile.update({
          where: { studentId },
          data: { ...data, updatedById: principal.userId },
        })
      : await tx.studentProfile.create({
          data: {
            tenantId: principal.tenantId,
            studentId,
            ...data,
            updatedById: principal.userId,
          },
        });

    const changed = Object.keys(data).filter((k) => {
      if (!before) return data[k] !== null;
      const prev = (before as Record<string, unknown>)[k];
      const next = data[k];
      if (prev instanceof Date && next instanceof Date) {
        return prev.getTime() !== next.getTime();
      }
      if (prev instanceof Prisma.Decimal || next instanceof Prisma.Decimal) {
        return String(prev ?? '') !== String(next ?? '');
      }
      return prev !== next;
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: before ? 'UPDATE' : 'INSERT',
      resourceType: 'student_profile',
      resourceId: studentId,
      before: before
        ? Object.fromEntries(
            changed.map((k) => [k, String((before as Record<string, unknown>)[k] ?? '')]),
          )
        : undefined,
      after: Object.fromEntries(changed.map((k) => [k, String(data[k] ?? '')])),
    });

    return { id: saved.id, changed };
  });
}

export async function getProfile(principal: Principal, studentId: string) {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        tenantId: true,
        studentNo: true,
        fullNameAr: true,
        fullNameEn: true,
        nameAr1: true, nameAr2: true, nameAr3: true, nameAr4: true,
        nameEn1: true, nameEn2: true, nameEn3: true, nameEn4: true,
        nationalId: true,
        status: true,
        programmeId: true,
        batchId: true,
        admissionCategoryId: true,
        nationalityId: true,
      },
    });
    if (!student || student.tenantId !== principal.tenantId) {
      throw new ProfileError('Student not found in this tenant.');
    }

    const profile = await tx.studentProfile.findUnique({ where: { studentId } });
    return { student, profile };
  });
}

// ---------------------------------------------------------------------------
// Completeness
// ---------------------------------------------------------------------------

export interface CompletenessResult {
  complete: boolean;
  /** Field labels, in the order a registrar would fill them. */
  missing: string[];
}

/**
 * What is still missing before this student is registrable (REQ-ST-01).
 *
 * The legacy equivalent was this, in the profile grid's load:
 *
 *     If Row.Cells(i).Value = " " Then Row.DefaultCellStyle.BackColor = Color.Red
 *
 * A cell painted red when it held **exactly one space character** — not when
 * it was empty, and not when it was NULL. So the completeness indicator fired
 * only where a clerk had pressed the space bar, and a genuinely blank field
 * looked fine.
 *
 * This returns names, so the answer can be shown as a list of what to go and
 * collect rather than as a colour.
 */
export function profileCompleteness(
  student: {
    nameAr1: string | null;
    nameEn1: string | null;
    nationalId: string | null;
    programmeId: string | null;
    batchId: string | null;
    admissionCategoryId: string | null;
    nationalityId: string | null;
  },
  profile: {
    gender: Gender | null;
    dateOfBirth: Date | null;
    phone: string | null;
    address: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
  } | null,
): CompletenessResult {
  const missing: string[] = [];

  if (!student.nameAr1) missing.push('Arabic name parts');
  if (!student.nameEn1) missing.push('English name parts');
  if (!student.nationalId) missing.push('National ID');

  // The four the fee matrix is keyed on. Missing any of them means the student
  // cannot be priced, so registration would fail at the last step rather than
  // the first — see feeScheduleForStudent.
  if (!student.programmeId) missing.push('Programme');
  if (!student.batchId) missing.push('Batch');
  if (!student.admissionCategoryId) missing.push('Admission category');
  if (!student.nationalityId) missing.push('Nationality');

  if (!profile) {
    missing.push('Date of birth', 'Gender', 'Contact telephone', 'Address', 'Guardian');
    return { complete: false, missing };
  }

  if (!profile.dateOfBirth) missing.push('Date of birth');
  if (!profile.gender) missing.push('Gender');
  if (!profile.phone) missing.push('Contact telephone');
  if (!profile.address) missing.push('Address');
  if (!profile.guardianName || !profile.guardianPhone) missing.push('Guardian');

  return { complete: missing.length === 0, missing };
}

/** Completeness for one student, read from the database. */
export async function checkProfileComplete(
  principal: Principal,
  studentId: string,
): Promise<CompletenessResult> {
  const { student, profile } = await getProfile(principal, studentId);
  return profileCompleteness(student, profile);
}
