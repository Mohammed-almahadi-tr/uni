import 'server-only';
import type { Prisma } from '@/generated/prisma/client';
import type { StudentStatus } from '@/generated/prisma/enums';
import { withTenant } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { searchTerms } from '@/lib/i18n/arabic';

/**
 * Student directory search (SRS REQ-ST-03, REQ-NFR-01).
 *
 * The legacy search dialog ran this:
 *
 *     "Select StdId,StdFirName,… From StdData Where StdFirName like N'" &
 *      Me.txtStdName.Text & "%' " & Program & "Order by StdFirName"
 *
 * Three defects in one statement. It matched on the **first name only**, so
 * searching a family name — the way anybody looks for a student — returned
 * nothing. It was a **prefix** match, so a middle name found nothing either.
 * And it was **exact**: a clerk typing أحمد could not find a student recorded
 * as احمد, which in Sudanese data entry is about half of them.
 *
 * The replacement searches a normalised shadow key covering all four name
 * parts in both languages, the university number and the national ID, with
 * every term required so a second word narrows rather than widens. Behind it
 * is a GIN trigram index, which is what makes an unanchored `LIKE '%…%'`
 * answerable at all — without it this is a sequential scan and the SRS's
 * sub-100ms promise over 100k students is not merely missed, it is unreachable.
 */

export interface DirectoryFilters {
  programmeId?: string;
  batchId?: string;
  facultyId?: string;
  admissionCategoryId?: string;
  nationalityId?: string;
  status?: StudentStatus | StudentStatus[];
  includeInactive?: boolean;
}

export interface DirectoryRow {
  id: string;
  studentNo: string;
  fullNameAr: string;
  fullNameEn: string;
  nationalId: string | null;
  status: StudentStatus;
  programmeId: string | null;
  batchId: string | null;
}

export interface DirectoryPage {
  rows: DirectoryRow[];
  /** Total matching the filters, so the caller can page honestly. */
  total: number;
}

const MAX_PAGE = 200;

function buildWhere(
  tenantId: string,
  query: string,
  filters: DirectoryFilters,
): Prisma.StudentWhereInput {
  const terms = searchTerms(query);

  const where: Prisma.StudentWhereInput = {
    tenantId,
    ...(filters.includeInactive ? {} : { isActive: true }),
  };

  if (terms.length > 0) {
    where.AND = terms.map((t) => ({ searchKey: { contains: t } }));
  }
  if (filters.programmeId) where.programmeId = filters.programmeId;
  if (filters.batchId) where.batchId = filters.batchId;
  if (filters.admissionCategoryId) where.admissionCategoryId = filters.admissionCategoryId;
  if (filters.nationalityId) where.nationalityId = filters.nationalityId;
  if (filters.status) {
    where.status = Array.isArray(filters.status) ? { in: filters.status } : filters.status;
  }
  // Faculty is a property of the programme, not of the student. Expressed as a
  // relation filter rather than resolved into a programme id list first, so a
  // faculty with two hundred programmes is still one query.
  if (filters.facultyId) where.programme = { facultyId: filters.facultyId };

  return where;
}

/**
 * Search and filter the directory.
 *
 * An empty query with filters is a legitimate request — "every nursing student
 * in the 2026 batch" is how a faculty office uses this — so it returns the
 * filtered list rather than nothing.
 */
export async function searchDirectory(
  principal: Principal,
  query: string,
  filters: DirectoryFilters = {},
  page: { take?: number; skip?: number } = {},
): Promise<DirectoryPage> {
  requirePermission(principal, 'student.read');

  const take = Math.min(page.take ?? 50, MAX_PAGE);
  const skip = page.skip ?? 0;
  const where = buildWhere(principal.tenantId, query, filters);

  return withTenant(principal.tenantId, async (tx) => {
    const [rows, total] = await Promise.all([
      tx.student.findMany({
        where,
        orderBy: [{ studentNo: 'asc' }],
        take,
        skip,
        select: {
          id: true,
          studentNo: true,
          fullNameAr: true,
          fullNameEn: true,
          nationalId: true,
          status: true,
          programmeId: true,
          batchId: true,
        },
      }),
      tx.student.count({ where }),
    ]);

    return { rows, total };
  });
}

/**
 * Students who look like the same person as `studentId`.
 *
 * Deliberately **not** matched on the national ID: `uq_student_national_id` is
 * a partial unique index, so two students in one tenant cannot share one and
 * looking is wasted work. What survives that index is the duplicate created
 * *without* an ID, or with a mistyped one — which is precisely what the legacy
 * system produced, because it created a student record whenever a cashier took
 * money from somebody the search dialog failed to find, and that dialog matched
 * a prefix of the first name.
 *
 * So this matches on the normalised name and on the passport number, which
 * carries no uniqueness constraint and is how a foreign student ends up on
 * file twice.
 */
export async function findLikelyDuplicates(
  principal: Principal,
  studentId: string,
): Promise<Array<DirectoryRow & { reason: string }>> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const subject = await tx.student.findUnique({
      where: { id: studentId },
      select: { tenantId: true, fullNameAr: true },
    });
    if (!subject || subject.tenantId !== principal.tenantId) return [];

    const select = {
      id: true,
      studentNo: true,
      fullNameAr: true,
      fullNameEn: true,
      nationalId: true,
      status: true,
      programmeId: true,
      batchId: true,
    } as const;

    const out: Array<DirectoryRow & { reason: string }> = [];
    const seen = new Set<string>([studentId]);

    const profile = await tx.studentProfile.findUnique({
      where: { studentId },
      select: { passportNo: true },
    });

    if (profile?.passportNo) {
      const sharing = await tx.studentProfile.findMany({
        where: {
          tenantId: principal.tenantId,
          passportNo: profile.passportNo,
          studentId: { not: studentId },
        },
        select: { studentId: true },
      });
      if (sharing.length > 0) {
        const rows = await tx.student.findMany({
          where: { id: { in: sharing.map((r) => r.studentId) } },
          select,
        });
        for (const r of rows) {
          seen.add(r.id);
          out.push({ ...r, reason: 'Same passport number' });
        }
      }
    }

    // Two terms minimum. One shared given name is not a duplicate, it is a
    // country where a great many people are called Mohamed.
    const terms = searchTerms(subject.fullNameAr);
    if (terms.length >= 2) {
      const byName = await tx.student.findMany({
        where: {
          tenantId: principal.tenantId,
          id: { not: studentId },
          AND: terms.map((t) => ({ searchKey: { contains: t } })),
        },
        take: 20,
        select,
      });
      for (const r of byName) {
        if (seen.has(r.id)) continue;
        seen.add(r.id);
        out.push({ ...r, reason: 'Same name, normalised' });
      }
    }

    return out;
  });
}
