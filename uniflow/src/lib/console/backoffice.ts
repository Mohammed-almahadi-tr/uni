import 'server-only';
import type { PermissionKey } from '@/lib/auth/permissions';
import { withTenant } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';

/**
 * Reference reads for the back office (Track D4).
 *
 * The same contract as `lookups.ts` and `finance.ts`: reads only, each
 * carrying the permission of the screen that needs it, returning labels and
 * identifiers, deciding nothing.
 *
 * ## Why so many of these exist at all
 *
 * The legacy academic structure had no identifiers to look up. A faculty, a
 * programme and a batch were **text columns discovered with `SELECT
 * DISTINCT`** — `Select Distinct ProgramName From Programs`
 * ([frmListPrograms.vb:83](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Registration%20System/Forms/frmListPrograms.vb)),
 * `Select Distinct Batch From AcademicYear`, and for a college, nothing: it
 * was a string copied onto every row that mentioned it. Identity was the
 * name, so renaming a faculty orphaned every record pointing at it, silently.
 *
 * Every function here returns a **row id**. That is the whole difference, and
 * it is why a dropdown on a D4 screen is a list of things rather than a list
 * of strings that happen to match.
 */

export interface Named {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

const NAMED = { id: true, code: true, nameAr: true, nameEn: true } as const;

/** Anything a D4 screen needs to name. One permission, one query each. */
async function named<T>(
  principal: Principal,
  permission: PermissionKey,
  read: (tx: Parameters<Parameters<typeof withTenant>[1]>[0]) => Promise<T>,
): Promise<T> {
  requirePermission(principal, permission);
  return withTenant(principal.tenantId, read);
}

export async function facultyOptions(
  principal: Principal,
  permission: PermissionKey = 'academic.read',
): Promise<Named[]> {
  return named(principal, permission, (tx) =>
    tx.faculty.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: NAMED,
    }),
  );
}

export interface DepartmentOption extends Named {
  facultyId: string;
}

export async function departmentOptions(
  principal: Principal,
  permission: PermissionKey = 'academic.read',
): Promise<DepartmentOption[]> {
  return named(principal, permission, (tx) =>
    tx.department.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: { ...NAMED, facultyId: true },
    }),
  );
}

export interface BatchOption extends Named {
  admissionYear: number;
}

export async function batchOptions(
  principal: Principal,
  permission: PermissionKey = 'academic.read',
): Promise<BatchOption[]> {
  return named(principal, permission, (tx) =>
    tx.batch.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: [{ admissionYear: 'desc' }, { code: 'asc' }],
      select: { ...NAMED, admissionYear: true },
    }),
  );
}

export async function admissionCategoryOptions(
  principal: Principal,
  permission: PermissionKey = 'academic.read',
): Promise<Named[]> {
  return named(principal, permission, (tx) =>
    tx.admissionCategory.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: NAMED,
    }),
  );
}

export interface NationalityOption extends Named {
  category: string;
}

export async function nationalityOptions(
  principal: Principal,
  permission: PermissionKey = 'academic.read',
): Promise<NationalityOption[]> {
  return named(principal, permission, (tx) =>
    tx.nationality.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: { ...NAMED, category: true },
    }),
  );
}

export interface AcademicYearOption extends Named {
  status: string;
  startDate: string;
  endDate: string;
}

export async function academicYearOptions(
  principal: Principal,
  permission: PermissionKey = 'academic.read',
): Promise<AcademicYearOption[]> {
  return named(principal, permission, async (tx) => {
    const rows = await tx.academicYear.findMany({
      where: { tenantId: principal.tenantId },
      orderBy: { startDate: 'desc' },
      take: 12,
      select: { ...NAMED, status: true, startDate: true, endDate: true },
    });
    return rows.map((r) => ({
      ...r,
      startDate: r.startDate.toISOString().slice(0, 10),
      endDate: r.endDate.toISOString().slice(0, 10),
    }));
  });
}

export interface ProgrammeRow extends Named {
  facultyId: string;
  departmentId: string | null;
  degreeLevel: string;
  durationYears: number;
  durationTerms: number;
  isActive: boolean;
}

/** Programmes including the inactive, because the structure screen manages
 *  them and deactivation is the operation people actually want. */
export async function programmeRows(
  principal: Principal,
  permission: PermissionKey = 'academic.read',
): Promise<ProgrammeRow[]> {
  return named(principal, permission, (tx) =>
    tx.programme.findMany({
      where: { tenantId: principal.tenantId },
      orderBy: { code: 'asc' },
      select: {
        ...NAMED,
        facultyId: true,
        departmentId: true,
        degreeLevel: true,
        durationYears: true,
        durationTerms: true,
        isActive: true,
      },
    }),
  );
}

export interface FeeItemRow extends Named {
  isDeferrable: boolean;
  isDiscountable: boolean;
  defaultAmount: string | null;
}

/** The fee catalogue, for the matrix editor. Gated on `feematrix.read`
 *  rather than `charge.create` — see `finance.ts` for the other caller. */
export async function feeCatalogue(principal: Principal): Promise<FeeItemRow[]> {
  return named(principal, 'feematrix.read', async (tx) => {
    const rows = await tx.feeItem.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        ...NAMED,
        isDeferrable: true,
        isDiscountable: true,
        defaultAmount: true,
      },
    });
    return rows.map((r) => ({ ...r, defaultAmount: r.defaultAmount?.toFixed(4) ?? null }));
  });
}

export interface VendorOption extends Named {
  isBlocked: boolean;
}

export async function vendorOptions(
  principal: Principal,
  permission: PermissionKey = 'po.create',
): Promise<VendorOption[]> {
  return named(principal, permission, (tx) =>
    tx.vendor.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: { ...NAMED, isBlocked: true },
    }),
  );
}

export async function sponsorOptions(
  principal: Principal,
  permission: PermissionKey = 'sponsor.manage',
): Promise<Named[]> {
  return named(principal, permission, (tx) =>
    tx.sponsor.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: NAMED,
    }),
  );
}

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  mfaEnrolled: boolean;
  roleIds: string[];
  roleNames: string[];
}

/**
 * Everyone who can sign in, and what they may do.
 *
 * The legacy user table held `PWD` in clear and a `Priv` column with two
 * possible values that nothing ever read. This screen's whole reason for
 * existing is that a role is now a set of permissions somebody chose, and
 * somebody has to be able to see who holds which.
 */
export async function userRows(principal: Principal): Promise<UserRow[]> {
  return named(principal, 'user.read', async (tx) => {
    const rows = await tx.user.findMany({
      where: { tenantId: principal.tenantId },
      orderBy: { fullName: 'asc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        isActive: true,
        mfaSecret: true,
        roles: { select: { role: { select: { id: true, name: true } } } },
      },
    });
    return rows.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      isActive: u.isActive,
      // Whether a second factor is enrolled, never the secret itself.
      mfaEnrolled: u.mfaSecret !== null,
      roleIds: u.roles.map((r) => r.role.id),
      roleNames: u.roles.map((r) => r.role.name),
    }));
  });
}

export interface RoleRow {
  id: string;
  name: string;
  nameAr: string;
  permissions: PermissionKey[];
  userCount: number;
}

export async function roleRows(principal: Principal): Promise<RoleRow[]> {
  return named(principal, 'role.read', async (tx) => {
    const rows = await tx.role.findMany({
      where: { tenantId: principal.tenantId },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        nameAr: true,
        permissions: { select: { permissionKey: true } },
        _count: { select: { users: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      nameAr: r.nameAr,
      permissions: r.permissions.map((p) => p.permissionKey as PermissionKey),
      userCount: r._count.users,
    }));
  });
}

export interface TermRow {
  id: string;
  seq: number;
  kind: string;
  nameAr: string;
  nameEn: string;
  status: string;
  startDate: string;
  endDate: string;
  registrationClosesOn: string | null;
}

export interface AcademicYearWithTerms extends AcademicYearOption {
  terms: TermRow[];
}

/**
 * The calendar, years and terms together.
 *
 * One query with its terms nested, rather than a year list and a term list
 * assembled on the page — because the only interesting question about a term
 * is which year it belongs to, and the legacy build could not answer it: the
 * academic year did not exist as a record, and `AcademicYear` was a table of
 * batch names.
 */
export async function academicCalendar(
  principal: Principal,
  permission: PermissionKey = 'academic.read',
): Promise<AcademicYearWithTerms[]> {
  return named(principal, permission, async (tx) => {
    const rows = await tx.academicYear.findMany({
      where: { tenantId: principal.tenantId },
      orderBy: { startDate: 'desc' },
      take: 8,
      select: {
        ...NAMED,
        status: true,
        startDate: true,
        endDate: true,
        terms: {
          orderBy: { seq: 'asc' },
          select: {
            id: true,
            seq: true,
            kind: true,
            nameAr: true,
            nameEn: true,
            status: true,
            startDate: true,
            endDate: true,
            registrationClosesOn: true,
          },
        },
      },
    });
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    return rows.map((r) => ({
      ...r,
      startDate: iso(r.startDate),
      endDate: iso(r.endDate),
      terms: r.terms.map((t) => ({
        ...t,
        startDate: iso(t.startDate),
        endDate: iso(t.endDate),
        registrationClosesOn: t.registrationClosesOn ? iso(t.registrationClosesOn) : null,
      })),
    }));
  });
}

export interface ScheduleLineRow {
  feeItemId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  amount: string;
  isMandatory: boolean;
}

/**
 * One fee schedule version's lines, by id.
 *
 * The matrix screen needs two versions side by side to show what changed, and
 * `resolveFeeSchedule` answers a different question — what is in force on a
 * day. Reading a specific version by id is the only way to compare one with
 * the one before it, which is the question the legacy delete-and-reinsert
 * made permanently unanswerable.
 */
export async function feeScheduleLines(
  principal: Principal,
  feeScheduleId: string,
): Promise<ScheduleLineRow[]> {
  return named(principal, 'feematrix.read', async (tx) => {
    const rows = await tx.feeScheduleLine.findMany({
      where: { tenantId: principal.tenantId, feeScheduleId },
      orderBy: { sortOrder: 'asc' },
      select: {
        feeItemId: true,
        amount: true,
        isMandatory: true,
        feeItem: { select: { code: true, nameAr: true, nameEn: true } },
      },
    });
    return rows.map((r) => ({
      feeItemId: r.feeItemId,
      code: r.feeItem.code,
      nameAr: r.feeItem.nameAr,
      nameEn: r.feeItem.nameEn,
      amount: r.amount.toFixed(4),
      isMandatory: r.isMandatory,
    }));
  });
}

export interface OfferRow {
  id: string;
  applicationId: string;
  applicationNo: string;
  fullNameAr: string;
  fullNameEn: string;
  state: string;
  acceptBy: string;
  conditions: string | null;
  depositRequired: string | null;
  depositPaid: boolean;
  overrodeCapacity: boolean;
  overrideReason: string | null;
  closeReason: string | null;
  promotedFromId: string | null;
}

/**
 * Offers for one programme and intake.
 *
 * Every state, not only the live ones. A declined offer and a lapsed one are
 * why a seat came back, and the committee screen is where somebody asks — the
 * legacy build recorded neither, because an offer was a letter somebody typed
 * and an admission was a row appearing in the students table.
 */
export async function offersFor(
  principal: Principal,
  programmeId: string,
  batchId: string,
): Promise<OfferRow[]> {
  return named(principal, 'application.read', async (tx) => {
    const rows = await tx.admissionOffer.findMany({
      where: {
        tenantId: principal.tenantId,
        programmeId,
        application: { batchId },
      },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        applicationId: true,
        state: true,
        acceptBy: true,
        conditions: true,
        depositRequired: true,
        depositPaidAt: true,
        overrodeCapacity: true,
        overrideReason: true,
        closeReason: true,
        promotedFromId: true,
        application: {
          select: { applicationNo: true, fullNameAr: true, fullNameEn: true },
        },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      applicationId: r.applicationId,
      applicationNo: r.application.applicationNo,
      fullNameAr: r.application.fullNameAr,
      fullNameEn: r.application.fullNameEn,
      state: r.state,
      acceptBy: r.acceptBy.toISOString().slice(0, 10),
      conditions: r.conditions,
      depositRequired: r.depositRequired?.toFixed(4) ?? null,
      depositPaid: r.depositPaidAt !== null,
      overrodeCapacity: r.overrodeCapacity,
      overrideReason: r.overrideReason,
      closeReason: r.closeReason,
      promotedFromId: r.promotedFromId,
    }));
  });
}
