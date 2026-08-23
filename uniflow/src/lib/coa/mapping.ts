import 'server-only';
import type { AccountRole } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';

/**
 * Which account plays which structural role, per tenant.
 *
 * Cashiering needs "the student AR control account". Cheque clearing needs
 * "cheques on hand" and "cheques with the bank". Revaluation needs "unrealised
 * FX"; year-end close needs "retained surplus". None of them should know an
 * account *code*, because a tenant may renumber its chart and because the
 * shipped template is a starting point rather than a constraint.
 *
 * The legacy system solved this by writing account **names** into the code —
 * the student receipt screen queried for accounts literally named `الاصول` and
 * `(مدينون(الطلاب`, then wrote the English strings "Current Assets",
 * "Debtors" and "Students Fees" into the grid of a database whose tree is in
 * Arabic. Renaming an account broke posting; translating one broke it twice.
 */

export class AccountMappingMissingError extends Error {
  constructor(readonly role: AccountRole) {
    super(
      `No account is mapped to the role ${role} for this university. ` +
        `Set it in the chart of accounts before using this feature.`,
    );
    this.name = 'AccountMappingMissingError';
  }
}

/** Read one mapping, or fail with a sentence naming what is missing. */
export async function requireAccount(
  tx: Tx,
  tenantId: string,
  role: AccountRole,
): Promise<string> {
  const row = await tx.accountMapping.findUnique({
    where: { tenantId_role: { tenantId, role } },
    select: { accountId: true },
  });
  if (!row) throw new AccountMappingMissingError(role);
  return row.accountId;
}

/** Read several at once. Cashiering needs three on every receipt. */
export async function requireAccounts<R extends AccountRole>(
  tx: Tx,
  tenantId: string,
  roles: readonly R[],
): Promise<Record<R, string>> {
  const rows = await tx.accountMapping.findMany({
    where: { tenantId, role: { in: roles as unknown as AccountRole[] } },
    select: { role: true, accountId: true },
  });
  const found = new Map(rows.map((r) => [r.role, r.accountId]));

  const out = {} as Record<R, string>;
  for (const role of roles) {
    const id = found.get(role);
    if (!id) throw new AccountMappingMissingError(role);
    out[role] = id;
  }
  return out;
}

export async function loadAccountMappings(
  tx: Tx,
  tenantId: string,
): Promise<Array<{ role: AccountRole; accountId: string; code: string; nameEn: string }>> {
  const rows = await tx.accountMapping.findMany({
    where: { tenantId },
    select: { role: true, account: { select: { id: true, code: true, nameEn: true } } },
    orderBy: { role: 'asc' },
  });
  return rows.map((r) => ({
    role: r.role,
    accountId: r.account.id,
    code: r.account.code,
    nameEn: r.account.nameEn,
  }));
}

/**
 * Point a role at an account.
 *
 * Validates that the account can actually play the role, because the failure
 * mode otherwise is silent and late: a mapping to a non-postable heading is
 * only discovered when a cashier's first receipt of the day is refused.
 */
export async function setAccountMapping(
  principal: Principal,
  role: AccountRole,
  accountId: string,
): Promise<void> {
  requirePermission(principal, 'coa.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      select: {
        code: true,
        nameEn: true,
        isPostable: true,
        isActive: true,
        isControlAccount: true,
        subledgerType: true,
      },
    });
    if (!account) throw new Error('Account not found in this tenant.');
    if (!account.isActive) {
      throw new Error(`Account ${account.code} is deactivated and cannot take a structural role.`);
    }
    if (!account.isPostable) {
      throw new Error(
        `Account ${account.code} is a heading, not a detail account. Structural roles must ` +
          `name an account that can actually receive postings.`,
      );
    }

    const expected = EXPECTED_SUBLEDGER[role];
    if (expected) {
      if (!account.isControlAccount || account.subledgerType !== expected) {
        throw new Error(
          `The ${role} role must name a control account for the ${expected} sub-ledger; ` +
            `${account.code} is not one. Without that, per-party balances have nothing in ` +
            `the general ledger to reconcile against.`,
        );
      }
    }

    const before = await tx.accountMapping.findUnique({
      where: { tenantId_role: { tenantId: principal.tenantId, role } },
      select: { accountId: true },
    });

    await tx.accountMapping.upsert({
      where: { tenantId_role: { tenantId: principal.tenantId, role } },
      create: { tenantId: principal.tenantId, role, accountId },
      update: { accountId },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: before ? 'UPDATE' : 'INSERT',
      resourceType: 'account_mapping',
      resourceId: role,
      before: before ? { accountId: before.accountId } : undefined,
      after: { accountId, code: account.code },
    });
  });
}

/** Roles that must be filled by a control account of a particular sub-ledger. */
const EXPECTED_SUBLEDGER: Partial<Record<AccountRole, 'STUDENT' | 'SPONSOR' | 'VENDOR'>> = {
  STUDENT_AR_CONTROL: 'STUDENT',
  STUDENT_CREDIT_CONTROL: 'STUDENT',
  SPONSOR_AR_CONTROL: 'SPONSOR',
  VENDOR_AP_CONTROL: 'VENDOR',
};

/**
 * The mappings the shipped chart of accounts satisfies, by code.
 *
 * Applied by `installChartOfAccounts`, so a freshly onboarded tenant can take
 * a payment without an administrator first working out which account is which.
 */
export const TEMPLATE_ACCOUNT_ROLES: Record<AccountRole, string> = {
  STUDENT_AR_CONTROL: '11211',
  STUDENT_CREDIT_CONTROL: '21221',
  SPONSOR_AR_CONTROL: '11221',
  VENDOR_AP_CONTROL: '21211',
  DEFAULT_CASH: '11111',
  DEFAULT_BANK: '11121',
  CHEQUES_RECEIVABLE: '11231',
  CHEQUES_WITH_BANK: '11232',
  DEFAULT_DISCOUNT_EXPENSE: '51411',
  FX_REALISED: '52111',
  FX_UNREALISED: '52112',
  RETAINED_SURPLUS: '31211',
};
