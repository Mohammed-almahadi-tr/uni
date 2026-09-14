import 'server-only';
import type { FeeRecurrence } from '@/generated/prisma/enums';
import { withSystem, withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { toStorage } from '@/lib/money';

/**
 * Fee item catalog (SRS REQ-FEE-01).
 *
 * The legacy student receipt screen had a fee grid **hardcoded to two rows** —
 * tuition and registration — populated by looking up accounts by their Arabic
 * names and then writing the English literals "Current Assets", "Debtors" and
 * "Students Fees" into the grid. Everything else a university charges for
 * (exams, labs, the library, the hostel, ID cards, fines, transcripts) either
 * did not exist or was folded into one of those two lines, which is why its
 * revenue reporting could not answer what the money was for.
 *
 * Here each billable head is a row with its own revenue account, its own
 * deferral behaviour, and its own flags for whether it may be discounted or
 * refunded. Registration draws from this catalog through the fee matrix
 * (Track B); ad-hoc charges draw from it directly.
 */

export class FeeItemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeeItemError';
  }
}

export interface FeeItemTemplate {
  code: string;
  nameAr: string;
  nameEn: string;
  /** Account code in the shipped chart. Resolved to an id at install. */
  revenueAccountCode: string;
  unearnedAccountCode?: string;
  isDeferrable?: boolean;
  isDiscountable?: boolean;
  isRefundable?: boolean;
  recurrence?: FeeRecurrence;
}

/**
 * The fifteen heads named in REQ-FEE-01.
 *
 * Which ones defer is an accounting judgement, not a preference. A fee is
 * deferrable when the institution has not yet delivered what it was paid for:
 * tuition, lab access, a hostel bed and a term's insurance are all consumed
 * across the term, so billing them credits a liability and revenue is
 * recognised as the term runs. A transcript, an ID card and a late-payment
 * fine are earned the moment they are charged.
 *
 * The legacy system recognised a full year's tuition on registration day. Any
 * institution reporting monthly, or preparing statements mid-year, materially
 * overstated its revenue — and nothing in the system could have shown that.
 */
export const STANDARD_FEE_ITEMS: FeeItemTemplate[] = [
  {
    code: 'TUITION',
    nameAr: 'الرسوم الدراسية',
    nameEn: 'Tuition',
    revenueAccountCode: '41111',
    unearnedAccountCode: '21111',
    isDeferrable: true,
    recurrence: 'PER_TERM',
  },
  {
    code: 'REGISTRATION',
    nameAr: 'رسوم التسجيل',
    nameEn: 'Registration',
    revenueAccountCode: '41211',
    // Earned on the day: the act being paid for is the registration itself.
    recurrence: 'PER_TERM',
  },
  {
    code: 'EXAM',
    nameAr: 'رسوم الامتحانات',
    nameEn: 'Examination',
    revenueAccountCode: '41212',
    unearnedAccountCode: '21112',
    isDeferrable: true,
    recurrence: 'PER_TERM',
  },
  {
    code: 'LAB',
    nameAr: 'رسوم المعامل',
    nameEn: 'Laboratory',
    revenueAccountCode: '41213',
    unearnedAccountCode: '21112',
    isDeferrable: true,
    recurrence: 'PER_TERM',
  },
  {
    code: 'LIBRARY',
    nameAr: 'رسوم المكتبة',
    nameEn: 'Library',
    revenueAccountCode: '41216',
    unearnedAccountCode: '21112',
    isDeferrable: true,
    recurrence: 'PER_YEAR',
  },
  {
    code: 'ID_CARD',
    nameAr: 'رسوم البطاقة الجامعية',
    nameEn: 'Student ID Card',
    revenueAccountCode: '41214',
    isDiscountable: false,
    recurrence: 'ONE_OFF',
  },
  {
    code: 'HOSTEL',
    nameAr: 'رسوم السكن',
    nameEn: 'Hostel',
    revenueAccountCode: '41217',
    unearnedAccountCode: '21112',
    isDeferrable: true,
    recurrence: 'PER_TERM',
  },
  {
    code: 'TRANSPORT',
    nameAr: 'رسوم الترحيل',
    nameEn: 'Transport',
    revenueAccountCode: '41217',
    unearnedAccountCode: '21112',
    isDeferrable: true,
    recurrence: 'PER_TERM',
  },
  {
    code: 'INSURANCE',
    nameAr: 'رسوم التأمين',
    nameEn: 'Insurance',
    revenueAccountCode: '41218',
    unearnedAccountCode: '21112',
    isDeferrable: true,
    isDiscountable: false,
    recurrence: 'PER_YEAR',
  },
  {
    code: 'STAMP',
    nameAr: 'رسم الدمغة',
    nameEn: 'Stamp Duty',
    revenueAccountCode: '41218',
    isDiscountable: false,
    isRefundable: false,
    recurrence: 'PER_YEAR',
  },
  {
    code: 'LATE_FEE',
    nameAr: 'غرامة تأخير السداد',
    nameEn: 'Late Payment Fee',
    revenueAccountCode: '41215',
    isDiscountable: false,
    isRefundable: false,
    recurrence: 'ONE_OFF',
  },
  {
    code: 'RETURNED_CHEQUE',
    nameAr: 'غرامة شيك مرتد',
    nameEn: 'Returned Cheque Fee',
    revenueAccountCode: '41215',
    isDiscountable: false,
    isRefundable: false,
    recurrence: 'ONE_OFF',
  },
  {
    code: 'TRANSCRIPT',
    nameAr: 'رسوم كشف الدرجات',
    nameEn: 'Transcript',
    revenueAccountCode: '41214',
    isDiscountable: false,
    recurrence: 'ONE_OFF',
  },
  {
    code: 'CERTIFICATE',
    nameAr: 'رسوم الشهادات',
    nameEn: 'Certificate',
    revenueAccountCode: '41214',
    isDiscountable: false,
    recurrence: 'ONE_OFF',
  },
  {
    code: 'RESIT',
    nameAr: 'رسوم إعادة الامتحان',
    nameEn: 'Re-sit Examination',
    revenueAccountCode: '41212',
    isDiscountable: false,
    recurrence: 'ONE_OFF',
  },
];

export interface FeeCatalogInstallResult {
  created: number;
  skipped: number;
}

/**
 * Install the standard catalog into a tenant.
 *
 * Runs as the owner role for the same reason `installChartOfAccounts` does:
 * onboarding happens before any staff user exists to hold a permission.
 * Idempotent by fee-item code, so re-running after adding an item to the
 * template fills the gap without disturbing what a tenant has customised.
 *
 * Tuition is deliberately left without a default cost centre. The shipped
 * tuition revenue account requires one, and the right cost centre is the
 * student's faculty — which the caller knows and this function does not.
 */
export async function installFeeCatalog(
  tenantId: string,
  actorId: string | null = null,
): Promise<FeeCatalogInstallResult> {
  return withSystem(async (tx) => {
    const accounts = await tx.account.findMany({
      where: { tenantId },
      select: { id: true, code: true },
    });
    const byCode = new Map(accounts.map((a) => [a.code, a.id]));

    let created = 0;
    let skipped = 0;

    for (const [i, item] of STANDARD_FEE_ITEMS.entries()) {
      const existing = await tx.feeItem.findUnique({
        where: { tenantId_code: { tenantId, code: item.code } },
        select: { id: true },
      });
      if (existing) {
        skipped += 1;
        continue;
      }

      const revenueAccountId = byCode.get(item.revenueAccountCode);
      if (!revenueAccountId) {
        throw new FeeItemError(
          `Fee item ${item.code} needs revenue account ${item.revenueAccountCode}, which is ` +
            `not in this tenant's chart. Install the chart of accounts first.`,
        );
      }
      const unearnedAccountId = item.unearnedAccountCode
        ? byCode.get(item.unearnedAccountCode)
        : null;
      if (item.isDeferrable && !unearnedAccountId) {
        throw new FeeItemError(
          `Fee item ${item.code} is deferrable but unearned account ` +
            `${item.unearnedAccountCode} is not in this tenant's chart.`,
        );
      }

      await tx.feeItem.create({
        data: {
          tenantId,
          code: item.code,
          nameAr: item.nameAr,
          nameEn: item.nameEn,
          revenueAccountId,
          unearnedAccountId,
          isDeferrable: item.isDeferrable ?? false,
          isDiscountable: item.isDiscountable ?? true,
          isRefundable: item.isRefundable ?? true,
          recurrence: item.recurrence ?? 'PER_TERM',
          sortOrder: (i + 1) * 10,
        },
      });
      created += 1;
    }

    if (actorId) {
      await audit(tx, tenantId, {
        actorId,
        action: 'INSERT',
        resourceType: 'fee_catalog',
        resourceId: tenantId,
        after: { created, skipped },
      });
    }

    return { created, skipped };
  });
}

export interface CreateFeeItemInput {
  code: string;
  nameAr: string;
  nameEn: string;
  revenueAccountId: string;
  unearnedAccountId?: string | null;
  costCenterId?: string | null;
  isDeferrable?: boolean;
  isDiscountable?: boolean;
  isRefundable?: boolean;
  isTaxable?: boolean;
  recurrence?: FeeRecurrence;
  defaultAmount?: string | number | null;
  sortOrder?: number;
}

export async function createFeeItem(
  principal: Principal,
  input: CreateFeeItemInput,
): Promise<{ id: string }> {
  requirePermission(principal, 'feematrix.manage');

  const code = input.code.trim().toUpperCase();
  if (!/^[A-Z0-9_]{2,32}$/.test(code)) {
    throw new FeeItemError(
      `Fee item code "${input.code}" is invalid. Use letters, digits and underscore.`,
    );
  }
  if (!input.nameAr.trim() || !input.nameEn.trim()) {
    throw new FeeItemError('A fee item needs both an Arabic and an English name — it is printed on the receipt in both.');
  }
  if (input.isDeferrable && !input.unearnedAccountId) {
    throw new FeeItemError(
      'A deferrable fee item must name the unearned-income account its billing credits. ' +
        'Without one there is nowhere for the liability to sit until the term is delivered.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    await assertPostable(tx, input.revenueAccountId, 'revenue');
    if (input.unearnedAccountId) {
      await assertPostable(tx, input.unearnedAccountId, 'unearned income');
    }

    const item = await tx.feeItem.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        revenueAccountId: input.revenueAccountId,
        unearnedAccountId: input.unearnedAccountId ?? null,
        costCenterId: input.costCenterId ?? null,
        isDeferrable: input.isDeferrable ?? false,
        isDiscountable: input.isDiscountable ?? true,
        isRefundable: input.isRefundable ?? true,
        isTaxable: input.isTaxable ?? false,
        recurrence: input.recurrence ?? 'PER_TERM',
        defaultAmount:
          input.defaultAmount === undefined || input.defaultAmount === null
            ? null
            : toStorage(input.defaultAmount),
        sortOrder: input.sortOrder ?? 0,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'fee_item',
      resourceId: item.id,
      after: { code, nameEn: input.nameEn, isDeferrable: input.isDeferrable ?? false },
    });

    return item;
  });
}

/**
 * Change a fee item's presentation and future behaviour.
 *
 * The code is immutable and the revenue account is not changeable once
 * charges exist against it — moving it would restate revenue already
 * reported. Deactivate and create a replacement instead, exactly as for an
 * account.
 */
export async function updateFeeItem(
  principal: Principal,
  feeItemId: string,
  changes: {
    nameAr?: string;
    nameEn?: string;
    costCenterId?: string | null;
    isDiscountable?: boolean;
    isRefundable?: boolean;
    defaultAmount?: string | number | null;
    sortOrder?: number;
    revenueAccountId?: string;
  },
): Promise<void> {
  requirePermission(principal, 'feematrix.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const before = await tx.feeItem.findUnique({
      where: { id: feeItemId },
      select: {
        code: true,
        nameAr: true,
        nameEn: true,
        isDiscountable: true,
        isRefundable: true,
        revenueAccountId: true,
      },
    });
    if (!before) throw new FeeItemError('Fee item not found in this tenant.');

    if (changes.revenueAccountId && changes.revenueAccountId !== before.revenueAccountId) {
      const used = await tx.studentCharge.count({ where: { feeItemId } });
      if (used > 0) {
        throw new FeeItemError(
          `${before.code} has ${used} charge(s) posted against it, so its revenue account is ` +
            `fixed. Moving it would restate revenue that has already been reported. ` +
            `Deactivate it and create a replacement.`,
        );
      }
      await assertPostable(tx, changes.revenueAccountId, 'revenue');
    }

    await tx.feeItem.update({
      where: { id: feeItemId },
      data: {
        ...(changes.nameAr ? { nameAr: changes.nameAr.trim() } : {}),
        ...(changes.nameEn ? { nameEn: changes.nameEn.trim() } : {}),
        ...(changes.costCenterId !== undefined ? { costCenterId: changes.costCenterId } : {}),
        ...(changes.isDiscountable !== undefined
          ? { isDiscountable: changes.isDiscountable }
          : {}),
        ...(changes.isRefundable !== undefined ? { isRefundable: changes.isRefundable } : {}),
        ...(changes.defaultAmount !== undefined
          ? {
              defaultAmount:
                changes.defaultAmount === null ? null : toStorage(changes.defaultAmount),
            }
          : {}),
        ...(changes.sortOrder !== undefined ? { sortOrder: changes.sortOrder } : {}),
        ...(changes.revenueAccountId ? { revenueAccountId: changes.revenueAccountId } : {}),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'fee_item',
      resourceId: feeItemId,
      before,
      after: { ...before, ...changes },
    });
  });
}

export async function deactivateFeeItem(
  principal: Principal,
  feeItemId: string,
): Promise<void> {
  requirePermission(principal, 'feematrix.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const item = await tx.feeItem.findUnique({
      where: { id: feeItemId },
      select: { code: true },
    });
    if (!item) throw new FeeItemError('Fee item not found in this tenant.');

    await tx.feeItem.update({ where: { id: feeItemId }, data: { isActive: false } });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'fee_item',
      resourceId: feeItemId,
      before: { isActive: true },
      after: { isActive: false, code: item.code },
    });
  });
}

export interface FeeItemView {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isDeferrable: boolean;
  isDiscountable: boolean;
  isRefundable: boolean;
  recurrence: FeeRecurrence;
  defaultAmount: string | null;
  revenueAccountCode: string;
  isActive: boolean;
}

export async function listFeeItems(
  principal: Principal,
  opts: { includeInactive?: boolean } = {},
): Promise<FeeItemView[]> {
  requirePermission(principal, 'feematrix.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.feeItem.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(opts.includeInactive ? {} : { isActive: true }),
      },
      orderBy: [{ sortOrder: 'asc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        isDeferrable: true,
        isDiscountable: true,
        isRefundable: true,
        recurrence: true,
        defaultAmount: true,
        isActive: true,
        revenueAccount: { select: { code: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      isDeferrable: r.isDeferrable,
      isDiscountable: r.isDiscountable,
      isRefundable: r.isRefundable,
      recurrence: r.recurrence,
      defaultAmount: r.defaultAmount ? r.defaultAmount.toFixed(4) : null,
      revenueAccountCode: r.revenueAccount.code,
      isActive: r.isActive,
    }));
  });
}

async function assertPostable(tx: Tx, accountId: string, role: string): Promise<void> {
  const account = await tx.account.findUnique({
    where: { id: accountId },
    select: { code: true, isPostable: true, isActive: true, level: true },
  });
  if (!account) throw new FeeItemError(`The ${role} account is not in this tenant's chart.`);
  if (!account.isActive) {
    throw new FeeItemError(`The ${role} account ${account.code} has been deactivated.`);
  }
  if (!account.isPostable) {
    throw new FeeItemError(
      `The ${role} account ${account.code} is a level-${account.level} heading. Fee items must ` +
        `name a level-5 detail account.`,
    );
  }
}
