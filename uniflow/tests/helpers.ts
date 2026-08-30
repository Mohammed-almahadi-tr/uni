/**
 * Test fixtures: a tenant with a minimal but realistic chart of accounts and
 * an open fiscal year.
 *
 * The COA mirrors the shape the legacy system implied — Assets → Current
 * Assets → Student Debtors → Student AR (a control account), and a revenue
 * side for tuition — so the tests exercise the same relationships the real
 * product will.
 */
import { prisma, systemPrisma, withSystem, withTenant, type Tx } from '@/lib/db/client';
import { ALL_VOUCHER_TYPES, initialiseSequences } from '@/lib/ledger/sequence';
import { monthlyPeriods } from '@/lib/ledger/period';
import { provisionFiscalYear } from '@/lib/ledger/fiscal-year';
import { provisionTenant, syncPermissions } from '@/lib/auth/provisioning';
import { installChartOfAccounts } from '@/lib/coa/template';
import { installFeeCatalog } from '@/lib/fees/catalog';
import { installAssetCategories } from '@/lib/assets/register';
import { installAcademicDefaults } from '@/lib/academic/defaults';
import { installDocumentTypes } from '@/lib/students/defaults';
import { installRefundPolicy } from '@/lib/students/refunds';
import type { Principal } from '@/lib/auth/rbac';
import type { PermissionKey } from '@/lib/auth/permissions';

export { ALL_VOUCHER_TYPES };

/**
 * The suite uses the application's OWN clients, not separate ones.
 *
 * tests/setup-env.ts points DATABASE_URL and DIRECT_URL at the test database
 * before any module loads, so `prisma` is the app role (NOSUPERUSER,
 * NOBYPASSRLS, non-owner — subject to RLS exactly as in production) and
 * `systemPrisma` is the owner. Using the real clients means application code
 * paths are exercised as written, rather than only when a test remembers to
 * pass a client in.
 */

/** App role. Subject to RLS. Everything under test uses this. */
export const testDb = prisma;

/** Owner role — bypasses RLS. Fixture setup and cross-tenant assertions only. */
export const testSystemDb = systemPrisma;


export interface Fixture {
  tenantId: string;
  fiscalYearId: string;
  /** Period 1 = January, open. */
  periodIds: string[];
  accounts: {
    cash: string;
    bank: string;
    studentAr: string;
    tuitionRevenue: string;
    unearnedFees: string;
    expense: string;
    /** Level 4 — deliberately not postable, for the negative test. */
    parentNotPostable: string;
    /** Requires a cost centre. */
    needsCostCenter: string;
  };
  costCenterId: string;
  userId: string;
}

let counter = 0;

/** Build an isolated tenant. Each call gets its own, so suites never collide. */
export async function makeTenant(
  opts: { functionalCurrency?: string; year?: number } = {},
): Promise<Fixture> {
  counter += 1;
  const slug = `t${Date.now().toString(36)}${counter}`;
  const year = opts.year ?? 2026;

  // testDb, not the app's default client — the suite runs against
  // TEST_DATABASE_URL and must never touch dev data.
  return withSystem(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug,
        nameEn: `Test University ${counter}`,
        nameAr: `جامعة اختبار ${counter}`,
        functionalCurrency: opts.functionalCurrency ?? 'SDG',
        fiscalYearStartMonth: 1,
      },
      select: { id: true },
    });

    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: `cashier@${slug}.test`,
        fullName: 'Test Cashier',
        passwordHash: 'x',
      },
      select: { id: true },
    });

    const fy = await tx.fiscalYear.create({
      data: {
        tenantId: tenant.id,
        name: String(year),
        startDate: new Date(Date.UTC(year, 0, 1)),
        endDate: new Date(Date.UTC(year, 11, 31)),
        status: 'OPEN',
      },
      select: { id: true },
    });

    const periods = monthlyPeriods(year, 1);
    const periodIds: string[] = [];
    for (const p of periods) {
      const created = await tx.fiscalPeriod.create({
        data: {
          fiscalYearId: fy.id,
          seq: p.seq,
          startDate: p.startDate,
          endDate: p.endDate,
          // January and February open; the rest FUTURE, so tests have both.
          status: p.seq <= 2 ? 'OPEN' : 'FUTURE',
        },
        select: { id: true },
      });
      periodIds.push(created.id);
    }

    await initialiseSequences(tx, tenant.id, fy.id, String(year), ALL_VOUCHER_TYPES);

    const costCenter = await tx.costCenter.create({
      data: { tenantId: tenant.id, code: 'CC-MED', nameEn: 'Faculty of Medicine', nameAr: 'كلية الطب' },
      select: { id: true },
    });

    const accounts = await buildChartOfAccounts(tx, tenant.id);

    return {
      tenantId: tenant.id,
      fiscalYearId: fy.id,
      periodIds,
      accounts,
      costCenterId: costCenter.id,
      userId: user.id,
    };
  }, {}, testSystemDb);
}

async function buildChartOfAccounts(tx: Tx, tenantId: string): Promise<Fixture['accounts']> {
  const mk = async (
    code: string,
    nameEn: string,
    nameAr: string,
    level: number,
    normalBalance: 'DEBIT' | 'CREDIT',
    parentId: string | null,
    extra: Partial<{
      isPostable: boolean;
      isControlAccount: boolean;
      subledgerType: 'STUDENT' | 'SPONSOR' | 'VENDOR';
      requiresCostCenter: boolean;
    }> = {},
  ) => {
    const a = await tx.account.create({
      data: {
        tenantId,
        code,
        nameEn,
        nameAr,
        level,
        parentId,
        normalBalance,
        isPostable: extra.isPostable ?? false,
        isControlAccount: extra.isControlAccount ?? false,
        subledgerType: extra.subledgerType ?? null,
        requiresCostCenter: extra.requiresCostCenter ?? false,
      },
      select: { id: true },
    });
    return a.id;
  };

  // Assets
  const assets = await mk('1', 'Assets', 'الأصول', 1, 'DEBIT', null);
  const current = await mk('11', 'Current Assets', 'الأصول المتداولة', 2, 'DEBIT', assets);
  const cashGroup = await mk('111', 'Cash & Equivalents', 'النقدية وما في حكمها', 3, 'DEBIT', current);
  const cashParent = await mk('1111', 'Cash on Hand', 'النقدية بالصندوق', 4, 'DEBIT', cashGroup);
  const cash = await mk('11111', 'Main Safe', 'الخزينة الرئيسية', 5, 'DEBIT', cashParent, {
    isPostable: true,
  });
  const bankParent = await mk('1112', 'Banks', 'البنوك', 4, 'DEBIT', cashGroup);
  const bank = await mk('11121', 'Faisal Islamic Bank', 'بنك فيصل الإسلامي', 5, 'DEBIT', bankParent, {
    isPostable: true,
  });

  const debtors = await mk('112', 'Receivables', 'المدينون', 3, 'DEBIT', current);
  const studentDebtors = await mk('1121', 'Student Debtors', 'مدينون (الطلاب)', 4, 'DEBIT', debtors);
  const studentAr = await mk('11211', 'Student AR Control', 'حساب مراقبة الطلاب', 5, 'DEBIT', studentDebtors, {
    isPostable: true,
    isControlAccount: true,
    subledgerType: 'STUDENT',
  });

  // Liabilities
  const liabilities = await mk('2', 'Liabilities', 'الخصوم', 1, 'CREDIT', null);
  const currentLiab = await mk('21', 'Current Liabilities', 'الخصوم المتداولة', 2, 'CREDIT', liabilities);
  const deferred = await mk('211', 'Deferred Income', 'إيرادات مؤجلة', 3, 'CREDIT', currentLiab);
  const unearnedParent = await mk('2111', 'Unearned Fees', 'رسوم غير مكتسبة', 4, 'CREDIT', deferred);
  const unearnedFees = await mk('21111', 'Unearned Tuition', 'رسوم دراسية غير مكتسبة', 5, 'CREDIT', unearnedParent, {
    isPostable: true,
  });

  // Revenue
  const revenue = await mk('4', 'Revenues', 'الإيرادات', 1, 'CREDIT', null);
  const feeRevenue = await mk('41', 'Fee Revenue', 'إيرادات الرسوم', 2, 'CREDIT', revenue);
  const tuitionGroup = await mk('411', 'Tuition', 'الرسوم الدراسية', 3, 'CREDIT', feeRevenue);
  const parentNotPostable = await mk('4111', 'Tuition by Faculty', 'الرسوم حسب الكلية', 4, 'CREDIT', tuitionGroup);
  const tuitionRevenue = await mk('41111', 'Tuition — Medicine', 'رسوم دراسية — الطب', 5, 'CREDIT', parentNotPostable, {
    isPostable: true,
  });

  // Expenses
  const expenses = await mk('5', 'Expenses', 'المصروفات', 1, 'DEBIT', null);
  const opex = await mk('51', 'Operating Expenses', 'مصروفات تشغيلية', 2, 'DEBIT', expenses);
  const salariesGroup = await mk('511', 'Staff Costs', 'تكاليف العاملين', 3, 'DEBIT', opex);
  const salariesParent = await mk('5111', 'Salaries', 'الرواتب', 4, 'DEBIT', salariesGroup);
  const expense = await mk('51111', 'Academic Salaries', 'رواتب أكاديمية', 5, 'DEBIT', salariesParent, {
    isPostable: true,
  });
  const needsCostCenter = await mk('51112', 'Lab Consumables', 'مستهلكات المعامل', 5, 'DEBIT', salariesParent, {
    isPostable: true,
    requiresCostCenter: true,
  });

  return {
    cash,
    bank,
    studentAr,
    tuitionRevenue,
    unearnedFees,
    expense,
    parentNotPostable,
    needsCostCenter,
  };
}

/** Run inside tenant context on the test client. */
export function asTenant<T>(tenantId: string, fn: (tx: Tx) => Promise<T>, options = {}) {
  return withTenant(tenantId, fn, options, testDb);
}

/** Run with RLS bypassed, as the owner role. */
export function asSystem<T>(fn: (tx: Tx) => Promise<T>, options = {}) {
  return withSystem(fn, options, testSystemDb);
}

/** Disconnect both clients. Call from afterAll. */
export async function disconnectAll() {
  await Promise.all([testDb.$disconnect(), testSystemDb.$disconnect()]);
}

/** January 15th of the fixture year — inside the open period 1. */
export const JAN = new Date(Date.UTC(2026, 0, 15));
/** March 15th — inside period 3, which the fixture leaves FUTURE. */
export const MAR = new Date(Date.UTC(2026, 2, 15));

// ---------------------------------------------------------------------------
// Full tenant onboarding (SRS §6), for the modules that need a real chart
// ---------------------------------------------------------------------------

/**
 * A university as it exists five minutes after onboarding: default roles, the
 * standard chart with its structural account mappings, the fee catalog, and an
 * open fiscal year with its document counters.
 *
 * `makeTenant` above builds a hand-rolled minimal chart, which is right for
 * testing the posting engine in isolation. Anything that resolves accounts by
 * ROLE — cashiering, billing, recognition — needs the real thing.
 */
export interface University {
  tenantId: string;
  adminUserId: string;
  roleIds: Record<string, string>;
  fiscalYearId: string;
  /** Index 0 is period 1. Periods 1-3 are OPEN; the rest FUTURE. */
  periodIds: string[];
  accounts: Record<string, string>;
  feeItems: Record<string, string>;
  assetCategories: Record<string, string>;
  costCenterId: string;
  /** Academic structure (Track B1). One faculty, two programmes, one batch. */
  facultyId: string;
  programmeIds: Record<string, string>;
  batchId: string;
  admissionCategories: Record<string, string>;
  nationalities: Record<string, string>;
  certificateTypes: Record<string, string>;
  /** Document types (Track B3), keyed by code. MBBS requires three of them. */
  documentTypes: Record<string, string>;
  /** Academic calendar (Track B4). One year, two terms. */
  academicYearId: string;
  academicYearCode: string;
  /** Keyed by term sequence: term 1 runs Jan-Apr, term 2 May-Aug. */
  termIds: Record<number, string>;
}

let uniCounter = 0;

export async function makeUniversity(
  opts: { year?: number; openPeriods?: number[] } = {},
): Promise<University> {
  uniCounter += 1;
  const year = opts.year ?? 2026;
  const slug = `u${Date.now().toString(36)}${uniCounter}`;

  await syncPermissions();
  const t = await provisionTenant({
    slug,
    nameEn: `Test University ${uniCounter}`,
    nameAr: `جامعة اختبار ${uniCounter}`,
    admin: {
      email: `admin@${slug}.test`,
      fullName: 'Onboarding Admin',
      password: 'Khartoum2026Uni',
    },
  });

  await installChartOfAccounts(t.tenantId, t.adminUserId);
  await installFeeCatalog(t.tenantId, t.adminUserId);
  await installAssetCategories(t.tenantId, t.adminUserId);
  await installAcademicDefaults(t.tenantId, t.adminUserId);
  await installDocumentTypes(t.tenantId, t.adminUserId);
  await installRefundPolicy(t.tenantId, t.adminUserId);

  const { fiscalYearId, periodIds } = await withSystem(
    (tx) =>
      provisionFiscalYear(tx, t.tenantId, {
        name: String(year),
        startYear: year,
        startMonth: 1,
        openPeriods: opts.openPeriods ?? [1, 2, 3],
      }),
    {},
    testSystemDb,
  );

  const { accounts, feeItems, assetCategories, costCenterId } = await withSystem(
    async (tx) => {
      const accs = await tx.account.findMany({
        where: { tenantId: t.tenantId },
        select: { id: true, code: true },
      });
      const items = await tx.feeItem.findMany({
        where: { tenantId: t.tenantId },
        select: { id: true, code: true },
      });
      const cats = await tx.assetCategory.findMany({
        where: { tenantId: t.tenantId },
        select: { id: true, code: true },
      });
      const cc = await tx.costCenter.findFirstOrThrow({
        where: { tenantId: t.tenantId, code: 'CC-MED' },
        select: { id: true },
      });
      return {
        accounts: Object.fromEntries(accs.map((a) => [a.code, a.id])),
        feeItems: Object.fromEntries(items.map((i) => [i.code, i.id])),
        assetCategories: Object.fromEntries(cats.map((c) => [c.code, c.id])),
        costCenterId: cc.id,
      };
    },
    {},
    testSystemDb,
  );

  // Tuition posts to an account that requires a cost centre, and the shipped
  // catalog deliberately leaves it unset because the right answer is the
  // student's faculty. Tests are not exercising faculty routing, so give it
  // one.
  await withSystem(
    (tx) =>
      tx.feeItem.update({
        where: { id: feeItems.TUITION },
        data: { costCenterId },
      }),
    {},
    testSystemDb,
  );

  const academic = await withSystem(
    async (tx) => {
      const faculty = await tx.faculty.create({
        data: {
          tenantId: t.tenantId,
          code: 'MED',
          nameAr: 'كلية الطب',
          nameEn: 'Faculty of Medicine',
          costCenterId,
        },
        select: { id: true },
      });

      const mbbs = await tx.programme.create({
        data: {
          tenantId: t.tenantId,
          facultyId: faculty.id,
          code: 'MBBS',
          nameAr: 'بكالوريوس الطب والجراحة',
          nameEn: 'Bachelor of Medicine and Surgery',
          degreeLevel: 'BACHELOR',
          durationYears: 5,
          durationTerms: 10,
        },
        select: { id: true },
      });

      const nurs = await tx.programme.create({
        data: {
          tenantId: t.tenantId,
          facultyId: faculty.id,
          code: 'NURS',
          nameAr: 'بكالوريوس التمريض',
          nameEn: 'Bachelor of Nursing',
          degreeLevel: 'BACHELOR',
          durationYears: 4,
          durationTerms: 8,
        },
        select: { id: true },
      });

      const batch = await tx.batch.create({
        data: {
          tenantId: t.tenantId,
          code: String(year),
          nameAr: `دفعة ${year}`,
          nameEn: `Batch ${year}`,
          admissionYear: year,
        },
        select: { id: true },
      });

      const cats = await tx.admissionCategory.findMany({
        where: { tenantId: t.tenantId },
        select: { id: true, code: true },
      });
      const nats = await tx.nationality.findMany({
        where: { tenantId: t.tenantId },
        select: { id: true, code: true },
      });
      const certs = await tx.certificateType.findMany({
        where: { tenantId: t.tenantId },
        select: { id: true, code: true },
      });
      const docTypes = await tx.documentType.findMany({
        where: { tenantId: t.tenantId },
        select: { id: true, code: true },
      });
      const docTypeByCode = Object.fromEntries(docTypes.map((d) => [d.code, d.id]));

      // Medicine's checklist: photograph, national ID and secondary
      // certificate are mandatory; a passport is requested but not required,
      // since most of the intake is Sudanese.
      await tx.programmeDocumentRequirement.createMany({
        data: [
          { tenantId: t.tenantId, programmeId: mbbs.id, documentTypeId: docTypeByCode.PHOTO, isMandatory: true },
          { tenantId: t.tenantId, programmeId: mbbs.id, documentTypeId: docTypeByCode.NATIONAL_ID, isMandatory: true },
          { tenantId: t.tenantId, programmeId: mbbs.id, documentTypeId: docTypeByCode.SECONDARY_CERT, isMandatory: true },
          { tenantId: t.tenantId, programmeId: mbbs.id, documentTypeId: docTypeByCode.PASSPORT, isMandatory: false },
        ],
      });

      // The academic calendar (B4). Deliberately NOT the fiscal year: term 1
      // starts inside the fixture's open periods (1-3) and runs on into
      // periods it leaves FUTURE, which is what makes revenue recognition
      // across a term testable. It stops at August so that suites which open
      // their own academic year from September onwards do not overlap it —
      // terms may only not overlap WITHIN a year, so two calendars in one
      // tenant otherwise make `termOn` ambiguous.
      const acadYear = await tx.academicYear.create({
        data: {
          tenantId: t.tenantId,
          code: `AY-${year}`,
          nameAr: `العام الدراسي ${year}`,
          nameEn: `Academic Year ${year}`,
          startDate: new Date(Date.UTC(year, 0, 1)),
          endDate: new Date(Date.UTC(year, 7, 31)),
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      const term1 = await tx.academicTerm.create({
        data: {
          tenantId: t.tenantId,
          academicYearId: acadYear.id,
          seq: 1,
          kind: 'FALL',
          nameAr: 'الفصل الأول',
          nameEn: `First Term ${year}`,
          startDate: new Date(Date.UTC(year, 0, 1)),
          endDate: new Date(Date.UTC(year, 3, 30)),
          registrationClosesOn: new Date(Date.UTC(year, 1, 28)),
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      const term2 = await tx.academicTerm.create({
        data: {
          tenantId: t.tenantId,
          academicYearId: acadYear.id,
          seq: 2,
          kind: 'SPRING',
          nameAr: 'الفصل الثاني',
          nameEn: `Second Term ${year}`,
          startDate: new Date(Date.UTC(year, 4, 1)),
          endDate: new Date(Date.UTC(year, 7, 31)),
          status: 'PLANNED',
        },
        select: { id: true },
      });

      return {
        facultyId: faculty.id,
        academicYearId: acadYear.id,
        academicYearCode: `AY-${year}`,
        termIds: { 1: term1.id, 2: term2.id },
        programmeIds: { MBBS: mbbs.id, NURS: nurs.id },
        batchId: batch.id,
        admissionCategories: Object.fromEntries(cats.map((c) => [c.code, c.id])),
        nationalities: Object.fromEntries(nats.map((n) => [n.code, n.id])),
        certificateTypes: Object.fromEntries(certs.map((c) => [c.code, c.id])),
        documentTypes: docTypeByCode,
      };
    },
    {},
    testSystemDb,
  );

  return {
    tenantId: t.tenantId,
    adminUserId: t.adminUserId,
    roleIds: t.roleIds,
    fiscalYearId,
    periodIds,
    accounts,
    feeItems,
    assetCategories,
    costCenterId,
    ...academic,
  };
}

/** A user holding exactly the permissions named, and nothing else. */
export async function makePrincipal(
  tenantId: string,
  permissions: PermissionKey[],
  opts: { mfaVerified?: boolean; name?: string } = {},
): Promise<Principal> {
  uniCounter += 1;
  const label = opts.name ?? `user${uniCounter}`;

  const userId = await withSystem(
    async (tx) => {
      const u = await tx.user.create({
        data: {
          tenantId,
          email: `${label}.${uniCounter}@fixture.test`,
          fullName: label,
          passwordHash: 'x',
        },
        select: { id: true },
      });
      const role = await tx.role.create({
        data: { tenantId, name: `${label}-${uniCounter}`, nameAr: label },
        select: { id: true },
      });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permissionKey) => ({ roleId: role.id, permissionKey })),
        });
      }
      await tx.userRole.create({ data: { userId: u.id, roleId: role.id } });
      return u.id;
    },
    {},
    testSystemDb,
  );

  return {
    tenantId,
    userId,
    mfaVerified: opts.mfaVerified ?? true,
    permissions: new Set(permissions),
  };
}
