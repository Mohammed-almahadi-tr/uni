import 'server-only';
import type { NormalBalance, SubledgerType } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';

/**
 * Chart of accounts (SRS REQ-FIN-01, Track A1).
 *
 * The legacy `Acc1` table held five denormalised TEXT columns — Acc1..Acc5 —
 * with no codes, no parent keys and no normal-balance flag. The tree was
 * assembled by five nested `SELECT DISTINCT` cursors running on five separate
 * open connections (frmChartofAccounts.vb:5-95), and account identity was the
 * Arabic *name*, copied inline onto every ledger line. Renaming an account
 * therefore orphaned its history, and the same database ended up holding both
 * Arabic and English names for the same concepts.
 *
 * Here an account is a row with an id, a code and a parent. Names are labels.
 */

export interface AccountNode {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  level: number;
  parentId: string | null;
  normalBalance: NormalBalance;
  isPostable: boolean;
  isControlAccount: boolean;
  subledgerType: SubledgerType | null;
  requiresCostCenter: boolean;
  isActive: boolean;
  children: AccountNode[];
}

export class AccountValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccountValidationError';
  }
}

/**
 * Load the whole tree in ONE query and assemble it in memory.
 *
 * A tenant's chart is a few thousand rows at most, so one indexed read beats
 * any recursive query — and it certainly beats the legacy approach of a cursor
 * per level on its own connection, which issued O(nodes) round trips to render
 * a single screen.
 */
export async function loadTree(
  tx: Tx,
  tenantId: string,
  includeInactive = false,
): Promise<AccountNode[]> {
  const rows = await tx.account.findMany({
    where: { tenantId, ...(includeInactive ? {} : { isActive: true }) },
    orderBy: { code: 'asc' },
    select: {
      id: true,
      code: true,
      nameAr: true,
      nameEn: true,
      level: true,
      parentId: true,
      normalBalance: true,
      isPostable: true,
      isControlAccount: true,
      subledgerType: true,
      requiresCostCenter: true,
      isActive: true,
    },
  });

  const byId = new Map<string, AccountNode>();
  for (const r of rows) byId.set(r.id, { ...r, children: [] });

  const roots: AccountNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId) {
      // A parent filtered out by includeInactive leaves the child stranded;
      // surface it at the root rather than dropping it silently.
      const parent = byId.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export interface CreateAccountInput {
  code: string;
  nameAr: string;
  nameEn: string;
  parentId: string | null;
  normalBalance?: NormalBalance;
  isPostable?: boolean;
  isControlAccount?: boolean;
  subledgerType?: SubledgerType | null;
  requiresCostCenter?: boolean;
}

/**
 * Create an account.
 *
 * Level is derived from the parent, never supplied. In the legacy schema the
 * two could disagree, because "level" was only ever which of five columns you
 * happened to write into.
 */
export async function createAccount(
  principal: Principal,
  input: CreateAccountInput,
): Promise<{ id: string; level: number }> {
  requirePermission(principal, 'coa.manage');
  const { tenantId } = principal;

  const code = input.code.trim();
  if (!/^[0-9A-Za-z._-]{1,32}$/.test(code)) {
    throw new AccountValidationError(
      `Account code "${code}" is invalid. Use letters, digits, dot, dash or underscore.`,
    );
  }
  if (!input.nameAr.trim() || !input.nameEn.trim()) {
    throw new AccountValidationError(
      'Both the Arabic and English names are required. The legacy chart ended up ' +
        'half in each language; a bilingual institution needs both on every account.',
    );
  }

  return withTenant(tenantId, async (tx) => {
    let level = 1;
    let normalBalance = input.normalBalance;

    if (input.parentId) {
      const parent = await tx.account.findUnique({
        where: { id: input.parentId },
        select: { level: true, normalBalance: true, isPostable: true, code: true },
      });
      if (!parent) throw new AccountValidationError('Parent account not found in this tenant.');
      if (parent.level >= 5) {
        throw new AccountValidationError(
          `Account ${parent.code} is at level 5, the deepest level. Detail accounts cannot have children.`,
        );
      }
      if (parent.isPostable) {
        throw new AccountValidationError(
          `Account ${parent.code} is a postable detail account; it cannot also become a parent.`,
        );
      }
      level = parent.level + 1;
      // Sign is inherited unless explicitly overridden. A contra account —
      // accumulated depreciation sitting under fixed assets — is the case
      // that needs the override.
      normalBalance ??= parent.normalBalance;
    } else if (!normalBalance) {
      throw new AccountValidationError('A root account must state its normal balance.');
    }

    const isPostable = input.isPostable ?? level === 5;
    if (isPostable && level !== 5) {
      throw new AccountValidationError(
        `Only level-5 detail accounts are postable; this would be level ${level}.`,
      );
    }
    if (input.isControlAccount && !input.subledgerType) {
      throw new AccountValidationError(
        'A control account must declare which sub-ledger it controls.',
      );
    }

    const created = await tx.account.create({
      data: {
        tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        level,
        parentId: input.parentId,
        normalBalance: normalBalance!,
        isPostable,
        isControlAccount: input.isControlAccount ?? false,
        subledgerType: input.subledgerType ?? null,
        requiresCostCenter: input.requiresCostCenter ?? false,
      },
      select: { id: true, level: true },
    });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'account',
      resourceId: created.id,
      after: { code, nameAr: input.nameAr, nameEn: input.nameEn, level, isPostable },
    });

    return created;
  });
}

/**
 * Rename or re-flag an account.
 *
 * Code, level and parent are immutable once set. Ledger history attaches by
 * id, so moving an account between branches would silently restate every prior
 * period's statements. Deactivate and create a replacement instead.
 */
export async function updateAccount(
  principal: Principal,
  accountId: string,
  changes: { nameAr?: string; nameEn?: string; requiresCostCenter?: boolean },
): Promise<void> {
  requirePermission(principal, 'coa.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const before = await tx.account.findUnique({
      where: { id: accountId },
      select: { nameAr: true, nameEn: true, requiresCostCenter: true, code: true },
    });
    if (!before) throw new AccountValidationError('Account not found in this tenant.');

    await tx.account.update({
      where: { id: accountId },
      data: {
        ...(changes.nameAr ? { nameAr: changes.nameAr.trim() } : {}),
        ...(changes.nameEn ? { nameEn: changes.nameEn.trim() } : {}),
        ...(changes.requiresCostCenter !== undefined
          ? { requiresCostCenter: changes.requiresCostCenter }
          : {}),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'account',
      resourceId: accountId,
      before,
      after: { ...before, ...changes },
    });
  });
}

/**
 * Deactivate an account.
 *
 * There is no delete. An account that has ever been posted to is part of the
 * audit trail, and an account with active children would strand them. This
 * replaces the legacy `frmDeleteAcc.vb`, which deleted rows outright.
 */
export async function deactivateAccount(
  principal: Principal,
  accountId: string,
): Promise<void> {
  requirePermission(principal, 'coa.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const account = await tx.account.findUnique({
      where: { id: accountId },
      select: { code: true, isActive: true },
    });
    if (!account) throw new AccountValidationError('Account not found in this tenant.');

    const activeChildren = await tx.account.count({
      where: { parentId: accountId, isActive: true },
    });
    if (activeChildren > 0) {
      throw new AccountValidationError(
        `Account ${account.code} has ${activeChildren} active child account(s). Deactivate those first.`,
      );
    }

    await tx.account.update({ where: { id: accountId }, data: { isActive: false } });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'account',
      resourceId: accountId,
      before: { isActive: true },
      after: { isActive: false },
    });
  });
}

/** Flatten a tree for a table view, keeping tree order and recording depth. */
export function flatten(
  nodes: AccountNode[],
  depth = 0,
): Array<AccountNode & { depth: number }> {
  return nodes.flatMap((n) => [{ ...n, depth }, ...flatten(n.children, depth + 1)]);
}
