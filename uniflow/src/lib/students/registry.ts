import 'server-only';
import type { StudentStatus } from '@/generated/prisma/enums';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { buildSearchKey, searchTerms } from '@/lib/i18n/arabic';
import { toDateOnly } from '@/lib/ledger/period';

/**
 * The student master — finance-facing slice (Track A3).
 *
 * Track B owns the full profile: programme, batch, faculty, contact details,
 * guardian, documents, photograph, medical record, admission history. This
 * module exists now because A3 is on the critical path and a cashier cannot
 * take money from a student the system has never heard of. Track B extends
 * this table; it does not replace it, and the sub-ledger attaches by `id`.
 *
 * Two things here are load-bearing rather than incidental:
 *
 *   · **Search key.** Arabic names are written with variant hamza forms
 *     (أحمد / احمد), with or without taa marbuta (فاطمه / فاطمة), and with
 *     tatweel. A cashier typing the name off an ID card will not match the
 *     spelling in the database. The normalised key is what is actually
 *     searched; see i18n/arabic.ts. The legacy system searched the raw column
 *     with LIKE, so the second-best outcome was creating a duplicate student.
 *
 *   · **National ID uniqueness.** One per tenant, by partial unique index.
 *     Duplicate applicants are the beginning of duplicate ledgers.
 */

export class StudentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StudentError';
  }
}

export interface CreateStudentInput {
  studentNo: string;
  fullNameAr: string;
  fullNameEn: string;
  nationalId?: string | null;
  status?: StudentStatus;
  admittedOn?: Date | null;
}

export async function createStudent(
  principal: Principal,
  input: CreateStudentInput,
): Promise<{ id: string; studentNo: string }> {
  requirePermission(principal, 'student.manage');

  const studentNo = input.studentNo.trim();
  if (!studentNo) throw new StudentError('A student needs a university number.');
  if (!input.fullNameAr.trim() || !input.fullNameEn.trim()) {
    throw new StudentError(
      'A student needs a name in both Arabic and English — certificates and receipts are ' +
        'issued in both, and a missing one is discovered at graduation.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const nationalId = input.nationalId?.trim() || null;
    if (nationalId) {
      const clash = await tx.student.findFirst({
        where: { tenantId: principal.tenantId, nationalId },
        select: { studentNo: true, fullNameEn: true },
      });
      if (clash) {
        throw new StudentError(
          `National ID ${nationalId} already belongs to ${clash.studentNo} ` +
            `(${clash.fullNameEn}). Two records for one person means two ledgers for one debt.`,
        );
      }
    }

    const student = await tx.student.create({
      data: {
        tenantId: principal.tenantId,
        studentNo,
        fullNameAr: input.fullNameAr.trim(),
        fullNameEn: input.fullNameEn.trim(),
        searchKey: buildSearchKey(input.fullNameAr, input.fullNameEn, studentNo, nationalId),
        nationalId,
        status: input.status ?? 'ACTIVE',
        admittedOn: input.admittedOn ? toDateOnly(input.admittedOn) : null,
      },
      select: { id: true, studentNo: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'student',
      resourceId: student.id,
      after: {
        studentNo,
        fullNameAr: input.fullNameAr.trim(),
        fullNameEn: input.fullNameEn.trim(),
        status: input.status ?? 'ACTIVE',
      },
    });

    return student;
  });
}

export async function updateStudent(
  principal: Principal,
  studentId: string,
  changes: {
    fullNameAr?: string;
    fullNameEn?: string;
    nationalId?: string | null;
    status?: StudentStatus;
  },
): Promise<void> {
  requirePermission(principal, 'student.manage');
  if (changes.status) requirePermission(principal, 'student.status');

  await withTenant(principal.tenantId, async (tx) => {
    const before = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        studentNo: true,
        fullNameAr: true,
        fullNameEn: true,
        nationalId: true,
        status: true,
      },
    });
    if (!before) throw new StudentError('Student not found in this tenant.');

    const fullNameAr = changes.fullNameAr?.trim() ?? before.fullNameAr;
    const fullNameEn = changes.fullNameEn?.trim() ?? before.fullNameEn;
    const nationalId =
      changes.nationalId === undefined ? before.nationalId : changes.nationalId?.trim() || null;

    await tx.student.update({
      where: { id: studentId },
      data: {
        fullNameAr,
        fullNameEn,
        nationalId,
        ...(changes.status ? { status: changes.status } : {}),
        // Recomputed on every write. A stale search key is a student who
        // cannot be found by the name they were just renamed to.
        searchKey: buildSearchKey(fullNameAr, fullNameEn, before.studentNo, nationalId),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'student',
      resourceId: studentId,
      before,
      after: { ...before, fullNameAr, fullNameEn, nationalId, ...(changes.status ? { status: changes.status } : {}) },
    });
  });
}

export interface StudentSummary {
  id: string;
  studentNo: string;
  fullNameAr: string;
  fullNameEn: string;
  nationalId: string | null;
  status: StudentStatus;
}

/**
 * Find students by number, national ID, or name in either language.
 *
 * Every term must match, so "احمد محمد" narrows rather than widens — which is
 * what someone typing a second word is trying to do. Terms are normalised the
 * same way the stored key is, so hamza and taa-marbuta variants find each
 * other.
 */
export async function findStudents(
  principal: Principal,
  query: string,
  opts: { take?: number; includeInactive?: boolean } = {},
): Promise<StudentSummary[]> {
  requirePermission(principal, 'student.read');

  const terms = searchTerms(query);
  if (terms.length === 0) return [];

  return withTenant(principal.tenantId, (tx) =>
    tx.student.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(opts.includeInactive ? {} : { isActive: true }),
        AND: terms.map((t) => ({ searchKey: { contains: t } })),
      },
      orderBy: { studentNo: 'asc' },
      take: opts.take ?? 25,
      select: {
        id: true,
        studentNo: true,
        fullNameAr: true,
        fullNameEn: true,
        nationalId: true,
        status: true,
      },
    }),
  );
}

export async function getStudent(
  principal: Principal,
  studentId: string,
): Promise<StudentSummary> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const s = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        studentNo: true,
        fullNameAr: true,
        fullNameEn: true,
        nationalId: true,
        status: true,
      },
    });
    if (!s) throw new StudentError('Student not found in this tenant.');
    return s;
  });
}
