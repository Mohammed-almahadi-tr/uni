import 'server-only';
import { withTenant } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';

/**
 * Reference reads for the console's dropdowns (Track D3).
 *
 * Deliberately small and deliberately here rather than inline in a page. A
 * screen that queries the database directly is the thing §8 says Track D must
 * not become — but the alternative of routing a list of academic terms
 * through a module that owns a business rule is worse, because it puts
 * presentation concerns inside the rule.
 *
 * So: these are reads, they carry their own permission check, they return
 * nothing but labels and identifiers, and nothing here decides anything. Every
 * *mutation* still goes through the module that owns it.
 *
 * Each is gated on the permission of the screen that needs it rather than on
 * `academic.read` — a cashier registering a student needs the list of terms
 * and has no business in the academic structure.
 */

export interface TermOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  academicYearCode: string;
  startDate: string;
  endDate: string;
  registrationClosesOn: string | null;
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Terms a registration could be raised against, newest first. */
export async function termOptions(principal: Principal): Promise<TermOption[]> {
  requirePermission(principal, 'registration.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.academicTerm.findMany({
      where: { tenantId: principal.tenantId, status: { in: ['PLANNED', 'ACTIVE'] } },
      orderBy: [{ startDate: 'desc' }],
      take: 24,
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        startDate: true,
        endDate: true,
        registrationClosesOn: true,
        academicYear: { select: { code: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      code: `${r.academicYear.code}/${iso(r.startDate)}`,
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      academicYearCode: r.academicYear.code,
      startDate: iso(r.startDate),
      endDate: iso(r.endDate),
      registrationClosesOn: r.registrationClosesOn ? iso(r.registrationClosesOn) : null,
    }));
  });
}

export interface ProgrammeOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  durationYears: number;
}

/** Active programmes, for the transfer wizard's destination. */
export async function programmeOptions(principal: Principal): Promise<ProgrammeOption[]> {
  requirePermission(principal, 'registration.read');

  return withTenant(principal.tenantId, (tx) =>
    tx.programme.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, nameAr: true, nameEn: true, durationYears: true },
    }),
  );
}

export interface RoleOption {
  id: string;
  name: string;
  nameAr: string;
}

/** Roles, for naming who may clear a hold. */
export async function roleOptions(principal: Principal): Promise<RoleOption[]> {
  requirePermission(principal, 'hold.manage');

  return withTenant(principal.tenantId, (tx) =>
    tx.role.findMany({
      where: { tenantId: principal.tenantId },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, nameAr: true },
    }),
  );
}

export interface SchemeOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

/** Scholarship schemes a discount may be booked to (B6, REQ-SPN-04). */
export async function schemeOptions(principal: Principal): Promise<SchemeOption[]> {
  requirePermission(principal, 'registration.read');

  return withTenant(principal.tenantId, (tx) =>
    tx.scholarshipScheme.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, nameAr: true, nameEn: true },
    }),
  );
}

export interface StudentHeader {
  id: string;
  studentNo: string;
  fullNameAr: string;
  fullNameEn: string;
  status: string;
  programmeNameAr: string | null;
  programmeNameEn: string | null;
  batchCode: string | null;
}

/** The identity strip every student-scoped screen shows at the top. */
export async function studentHeader(
  principal: Principal,
  studentId: string,
): Promise<StudentHeader | null> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const s = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        tenantId: true,
        studentNo: true,
        fullNameAr: true,
        fullNameEn: true,
        status: true,
        programme: { select: { nameAr: true, nameEn: true } },
        batch: { select: { code: true } },
      },
    });
    // Belt and braces over RLS: the query is already confined to the tenant,
    // and a mismatch here would mean the confinement had failed.
    if (!s || s.tenantId !== principal.tenantId) return null;
    return {
      id: s.id,
      studentNo: s.studentNo,
      fullNameAr: s.fullNameAr,
      fullNameEn: s.fullNameEn,
      status: s.status,
      programmeNameAr: s.programme?.nameAr ?? null,
      programmeNameEn: s.programme?.nameEn ?? null,
      batchCode: s.batch?.code ?? null,
    };
  });
}

export interface OptionalItem {
  feeItemId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  amount: string;
}

/**
 * The items a student may decline on the schedule that priced them.
 *
 * The quote's `skipped` list names optional items by code but not by id,
 * because nothing in the billing path needs the id. The desk does: it has to
 * offer a checkbox that sends one back. Read from the schedule the quote
 * already resolved rather than re-resolving it, so the list and the price
 * cannot come from different versions.
 */
export async function optionalItems(
  principal: Principal,
  feeScheduleId: string,
): Promise<OptionalItem[]> {
  requirePermission(principal, 'registration.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.feeScheduleLine.findMany({
      where: { tenantId: principal.tenantId, feeScheduleId, isMandatory: false },
      orderBy: { sortOrder: 'asc' },
      select: {
        feeItemId: true,
        amount: true,
        feeItem: { select: { code: true, nameAr: true, nameEn: true } },
      },
    });
    return rows.map((r) => ({
      feeItemId: r.feeItemId,
      code: r.feeItem.code,
      nameAr: r.feeItem.nameAr,
      nameEn: r.feeItem.nameEn,
      amount: r.amount.toFixed(4),
    }));
  });
}
