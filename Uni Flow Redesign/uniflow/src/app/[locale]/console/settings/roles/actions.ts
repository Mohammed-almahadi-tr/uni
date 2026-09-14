'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, setRolePermissions } from '@/lib/auth/rbac';
import { isPermissionKey, type PermissionKey } from '@/lib/auth/permissions';

/**
 * Roles (Track D4 / tenant administration).
 *
 * ## There was no role table
 *
 * ```vb
 * Priv = Reader.Item(1)                              ' frmLogin.vb:54
 * ...
 * Select UserName From Users Where Priv=N'محصل'      ' frmVouchersSerialsNo.vb:102
 * ```
 *
 * `Priv` held one of two strings typed into a combo box on the user form.
 * It was read into a global at sign-in and consulted exactly once more in the
 * whole application — to populate a dropdown of collectors on a **report
 * filter**. So the role existed, was stored, was loaded, and gated nothing.
 *
 * ## Where the segregation matrix fires
 *
 * `setRolePermissions` checks it **when the role is saved**, not when it is
 * exercised. That is the decision this screen surfaces: a control which only
 * fires at the moment of misuse has already failed, because by then the
 * conflicting role has existed for months and somebody has been using it.
 *
 * The refusal names the pair and says why, so the message an administrator
 * gets is an explanation rather than a denial.
 */

export interface RoleState {
  error: string | null;
  message: string | null;
}

const blank = (): RoleState => ({ error: null, message: null });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[roles]', e);
  return 'That could not be completed.';
}

/** The checkboxes, filtered to keys this build actually knows. */
function chosen(form: FormData): PermissionKey[] {
  return form
    .getAll('permissions')
    .filter((v): v is string => typeof v === 'string')
    .filter(isPermissionKey);
}

/**
 * Create a role.
 *
 * Written directly rather than through a module function because no module
 * owns "make a role" — `provisionTenant` creates the shipped set inline. The
 * permissions still go through `setRolePermissions`, which is where the
 * matrix lives, so the rule is not reimplemented here: this writes the row
 * and hands the decision straight back.
 */
export async function addRole(_prev: RoleState, form: FormData): Promise<RoleState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const name = str(form, 'name');
  const nameAr = str(form, 'nameAr');
  if (!name || !nameAr) {
    return { ...blank(), error: 'A role needs a name in both Arabic and English.' };
  }

  try {
    requirePermission(ctx.principal, 'role.manage');

    const roleId = await withTenant(ctx.principal.tenantId, async (tx) => {
      const role = await tx.role.create({
        data: { tenantId: ctx.principal.tenantId, name, nameAr },
        select: { id: true },
      });
      await audit(tx, ctx.principal.tenantId, {
        actorId: ctx.principal.userId,
        action: 'INSERT',
        resourceType: 'role',
        resourceId: role.id,
        after: { name, nameAr },
      });
      return role.id;
    });

    // Separate call on purpose: if the matrix refuses the set, the role
    // exists with no permissions rather than the whole thing rolling back
    // and losing the name somebody typed. An empty role grants nothing.
    const permissions = chosen(form);
    if (permissions.length > 0) {
      await setRolePermissions(
        ctx.principal.tenantId,
        roleId,
        permissions,
        ctx.principal.userId,
      );
    }

    revalidatePath('/console/settings/roles');
    revalidatePath('/console/settings/users');
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Replace a role's permission set, matrix and all. */
export async function setPermissions(
  _prev: RoleState,
  form: FormData,
): Promise<RoleState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    requirePermission(ctx.principal, 'role.manage');
    await setRolePermissions(
      ctx.principal.tenantId,
      str(form, 'roleId'),
      chosen(form),
      ctx.principal.userId,
    );
    revalidatePath('/console/settings/roles');
    revalidatePath('/console/settings/users');
    return { ...blank(), message: 'saved' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
