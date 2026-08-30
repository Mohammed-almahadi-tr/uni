import 'server-only';
import { withTenant } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { requireAccount } from '@/lib/coa/mapping';

/**
 * Reference reads for the finance desks (Track D2).
 *
 * The same contract as `lookups.ts`: reads only, each carrying the permission
 * of the screen that needs it, returning labels and identifiers and deciding
 * nothing. Every mutation still goes through the module that owns the rule.
 *
 * ## Why an account is chosen from a list at all
 *
 * The legacy forms did not choose accounts. They **typed their names**:
 *
 * ```vb
 * cmd.Parameters.AddWithValue("@Acc1", "Current Assets")
 * cmd.Parameters.AddWithValue("@Acc2", "Cash & Banks")
 * cmd.Parameters.AddWithValue("@Acc3", "Cash")
 * cmd.Parameters.AddWithValue("@Acc4", "Cash on Hand")
 * ```
 * ([frmStudantReceiptVoucher.vb:424-430](Nile%20College%20E-University%20System/Oasis%20-%20E-University/Financial%20System/Forms/frmStudantReceiptVoucher.vb#L424-L430))
 *
 * Four English strings, written into an account tree whose commented-out
 * predecessor in the same handler used the Arabic branch — `"الاصول"`,
 * `"مدينون(الطلاب)"` (lines 309-312). An account was a name, so renaming one
 * broke posting and translating one broke it twice; and since the name was
 * whatever the screen said it was, two screens could post to two different
 * "accounts" that were meant to be the same one.
 *
 * Here every one of these returns an **id**, and the module that posts
 * revalidates it. The list is a convenience over the chart; the authority is
 * the check inside `takeReceipt`, `depositCheques` and `createDraft`.
 */

export interface AccountOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  requiresCostCenter: boolean;
  isControlAccount: boolean;
}

const ACCOUNT_SELECT = {
  id: true,
  code: true,
  nameAr: true,
  nameEn: true,
  requiresCostCenter: true,
  isControlAccount: true,
} as const;

/**
 * The accounts money arriving by bank could land in.
 *
 * Resolved as the postable siblings of whatever the tenant mapped to
 * `DEFAULT_BANK` — a university that banks in three places files those three
 * accounts together. This is presentation: `resolveDebitAccount` accepts an
 * account because it is active and postable, not because it appeared here, so
 * a chart filed differently costs a longer list rather than a wrong posting.
 *
 * Gated on `receipt.create` rather than `coa.read`, because the shipped
 * Cashier role deliberately does not hold `coa.read` and still has to say
 * which bank the transfer came into.
 */
export async function bankAccountOptions(
  principal: Principal,
  permission: 'receipt.create' | 'cheque.manage' = 'receipt.create',
): Promise<AccountOption[]> {
  requirePermission(principal, permission);

  return withTenant(principal.tenantId, async (tx) => {
    const defaultBankId = await requireAccount(tx, principal.tenantId, 'DEFAULT_BANK');
    const defaultBank = await tx.account.findUnique({
      where: { id: defaultBankId },
      select: { parentId: true },
    });

    const rows = await tx.account.findMany({
      where: {
        tenantId: principal.tenantId,
        isActive: true,
        isPostable: true,
        ...(defaultBank?.parentId
          ? { OR: [{ parentId: defaultBank.parentId }, { id: defaultBankId }] }
          : { id: defaultBankId }),
      },
      orderBy: { code: 'asc' },
      select: ACCOUNT_SELECT,
    });
    return rows;
  });
}

/**
 * Postable accounts matching a search, for the voucher grid.
 *
 * Postable and active only. An unpostable parent in the list is an invitation
 * to select it, and the refusal comes at submission rather than at the point
 * the clerk is looking at the chart — `checkLinesAgainstChart` will say so,
 * but a picker that offers what cannot be picked wastes the reviewer's time
 * as much as the maker's.
 */
export async function accountSearch(
  principal: Principal,
  query: string,
  take = 40,
): Promise<AccountOption[]> {
  requirePermission(principal, 'voucher.read');

  const q = query.trim();

  return withTenant(principal.tenantId, (tx) =>
    tx.account.findMany({
      where: {
        tenantId: principal.tenantId,
        isActive: true,
        isPostable: true,
        ...(q
          ? {
              OR: [
                { code: { startsWith: q } },
                { nameEn: { contains: q, mode: 'insensitive' as const } },
                { nameAr: { contains: q } },
              ],
            }
          : {}),
      },
      orderBy: { code: 'asc' },
      take,
      select: ACCOUNT_SELECT,
    }),
  );
}

/** One account by id, so a saved draft line can be shown with its name. */
export async function accountsByIds(
  principal: Principal,
  ids: readonly string[],
): Promise<Map<string, AccountOption>> {
  requirePermission(principal, 'voucher.read');
  if (ids.length === 0) return new Map();

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.account.findMany({
      where: { tenantId: principal.tenantId, id: { in: [...new Set(ids)] } },
      select: ACCOUNT_SELECT,
    });
    return new Map(rows.map((r) => [r.id, r]));
  });
}

export interface CostCenterOption {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
}

export async function costCenterOptions(principal: Principal): Promise<CostCenterOption[]> {
  requirePermission(principal, 'voucher.read');

  return withTenant(principal.tenantId, (tx) =>
    tx.costCenter.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, nameAr: true, nameEn: true },
    }),
  );
}

export interface TillAssignment {
  userId: string;
  fullName: string;
  email: string;
  accountId: string | null;
  accountCode: string | null;
  accountNameAr: string | null;
  accountNameEn: string | null;
  isActive: boolean;
}

/**
 * Who has a till, and which safe it is.
 *
 * Lists every user holding a cashiering role rather than every user, so the
 * screen answers "is anybody taking cash without a till" — which is the
 * failure `resolveDebitAccount` raises at the counter, in front of a student,
 * and which nobody could see coming in the legacy build because there was one
 * shared `"Cash on Hand"` and it always existed.
 */
export async function tillAssignments(principal: Principal): Promise<TillAssignment[]> {
  requirePermission(principal, 'coa.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const users = await tx.user.findMany({
      where: {
        tenantId: principal.tenantId,
        isActive: true,
        roles: { some: { role: { permissions: { some: { permissionKey: 'receipt.create' } } } } },
      },
      orderBy: { fullName: 'asc' },
      select: { id: true, fullName: true, email: true },
    });

    const tills = await tx.cashierTill.findMany({
      where: { tenantId: principal.tenantId },
      select: {
        userId: true,
        isActive: true,
        cashAccount: { select: { id: true, code: true, nameAr: true, nameEn: true } },
      },
    });
    const byUser = new Map(tills.map((t) => [t.userId, t]));

    return users.map((u) => {
      const till = byUser.get(u.id);
      return {
        userId: u.id,
        fullName: u.fullName,
        email: u.email,
        accountId: till?.cashAccount.id ?? null,
        accountCode: till?.cashAccount.code ?? null,
        accountNameAr: till?.cashAccount.nameAr ?? null,
        accountNameEn: till?.cashAccount.nameEn ?? null,
        isActive: till?.isActive ?? false,
      };
    });
  });
}

/**
 * Cash accounts a till can be assigned to.
 *
 * Gated on `coa.manage`, the permission `assignTill` itself demands.
 */
export async function cashAccountOptions(principal: Principal): Promise<AccountOption[]> {
  requirePermission(principal, 'coa.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const cashId = await requireAccount(tx, principal.tenantId, 'DEFAULT_CASH');
    const cash = await tx.account.findUnique({
      where: { id: cashId },
      select: { parentId: true },
    });

    return tx.account.findMany({
      where: {
        tenantId: principal.tenantId,
        isActive: true,
        isPostable: true,
        ...(cash?.parentId ? { OR: [{ parentId: cash.parentId }, { id: cashId }] } : { id: cashId }),
      },
      orderBy: { code: 'asc' },
      select: ACCOUNT_SELECT,
    });
  });
}
