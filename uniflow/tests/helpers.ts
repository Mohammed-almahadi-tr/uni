/**
 * Test fixtures: a tenant with a minimal but realistic chart of accounts and
 * an open fiscal year.
 *
 * The COA mirrors the shape the legacy system implied — Assets → Current
 * Assets → Student Debtors → Student AR (a control account), and a revenue
 * side for tuition — so the tests exercise the same relationships the real
 * product will.
 */
import type { VoucherType } from '@/generated/prisma/enums';
import { prisma, systemPrisma, withSystem, withTenant, type Tx } from '@/lib/db/client';
import { initialiseSequences } from '@/lib/ledger/sequence';
import { monthlyPeriods } from '@/lib/ledger/period';

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

export const ALL_VOUCHER_TYPES: VoucherType[] = [
  'JOURNAL',
  'STUDENT_RECEIPT',
  'GENERAL_RECEIPT',
  'PAYMENT',
  'REGISTRATION',
  'DEPRECIATION',
  'REVENUE_RECOGNITION',
  'CHEQUE_MOVEMENT',
  'FX_REVALUATION',
  'OPENING_BALANCE',
  'REVERSAL',
  'YEAR_END_CLOSE',
];

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
