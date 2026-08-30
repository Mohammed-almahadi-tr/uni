'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { requirePermission } from '@/lib/auth/rbac';
import { assignRole } from '@/lib/auth/rbac';
import { createUser } from '@/lib/auth/provisioning';
import { checkPasswordStrength } from '@/lib/auth/password';

/**
 * Adding people (Track D4 / tenant administration).
 *
 * ## What this replaces
 *
 * ```vb
 * Dim cmd As New SqlCommand(
 *   "Select PWD,Priv From Users Where UserName=N'" & Me.txtUserName.Text & "'", cnn)
 * ```
 * ([frmLogin.vb:44](Nile%20College%20System%20-%20Ribat%20Univ/Rebat%20University%20Application/Form/frmLogin.vb#L44-L54))
 *
 * `PWD` is the password, in clear, in a column. `Priv` is one of two strings
 * typed into a combo box on the user form — general manager, or collector —
 * read into a module-level global at sign-in and **never consulted again
 * anywhere in the application**. So every authenticated user could open every
 * screen, including voucher approval and the chart of accounts.
 *
 * Here a password is hashed with Argon2id before it reaches the database and
 * a role is a set of permissions somebody chose. Which makes this screen the
 * one that was missing: until it existed, adding a member of staff meant a
 * developer at a REPL.
 *
 * ## The check that is not on the role
 *
 * `createUser` and `assignRole` both evaluate the SoD matrix against the
 * **union of the person's roles**, not against each role. Two individually
 * clean roles combine into a conflict — a cashier role and a supervisor role
 * each pass, and together let one person take a payment and cancel it.
 */

export interface UserState {
  error: string | null;
  message: string | null;
}

const blank = (): UserState => ({ error: null, message: null });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[users]', e);
  return 'That could not be completed.';
}

export async function addUser(_prev: UserState, form: FormData): Promise<UserState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  // `createUser` takes a tenant id rather than a principal — it is also the
  // provisioning path, which runs before anybody can be signed in. The
  // permission check therefore belongs here, and it is the one the route
  // guard already applied; both, because the guard is a convenience and this
  // is the control.
  try {
    requirePermission(ctx.principal, 'user.manage');
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }

  // Checked here as well as inside `hashPassword`, so the whole list of
  // problems reaches the form at once rather than one refusal at a time.
  const password = str(form, 'password');
  const problems = checkPasswordStrength(password);
  if (problems.length > 0) {
    return { ...blank(), error: problems.join(' ') };
  }

  const roleIds = form.getAll('roleIds').filter((v): v is string => typeof v === 'string');

  try {
    await createUser(
      ctx.principal.tenantId,
      {
        email: str(form, 'email'),
        fullName: str(form, 'fullName'),
        password,
        roleIds,
      },
      ctx.principal.userId,
    );
    revalidatePath('/console/settings/users');
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Give somebody an additional role, checked against everything they hold. */
export async function grantRole(_prev: UserState, form: FormData): Promise<UserState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    requirePermission(ctx.principal, 'user.manage');
    await assignRole(
      ctx.principal.tenantId,
      str(form, 'userId'),
      str(form, 'roleId'),
      ctx.principal.userId,
    );
    revalidatePath('/console/settings/users');
    return { ...blank(), message: 'assigned' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
