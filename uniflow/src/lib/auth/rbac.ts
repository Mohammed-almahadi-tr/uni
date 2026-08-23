import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNoSodViolation,
  isPermissionKey,
  type PermissionKey,
} from './permissions';

/**
 * Authorization enforcement (SRS REQ-ADM-02, REQ-SOD-01).
 *
 * Permissions are read from the database per request rather than carried in
 * the session token, so removing a role takes effect immediately. See
 * session.ts for why that trade is made.
 */

export class ForbiddenError extends Error {
  constructor(
    readonly permission: PermissionKey,
    readonly userId: string,
  ) {
    super(`Not permitted: ${permission}`);
    this.name = 'ForbiddenError';
  }
}

export class MfaRequiredError extends Error {
  constructor(readonly permission: PermissionKey) {
    super(
      `"${permission}" requires re-authentication with a second factor for this session.`,
    );
    this.name = 'MfaRequiredError';
  }
}

/** Actions that always demand a verified second factor on the current session,
 *  regardless of amount. Everything here either moves money out of the
 *  institution or changes who is allowed to. */
export const MFA_REQUIRED_PERMISSIONS: readonly PermissionKey[] = [
  'voucher.approve',
  'voucher.reverse',
  'payment.create',
  'period.close',
  'vendor.manage',
  'role.manage',
  'user.manage',
  'openingbalance.manage',
  // Cancelling a receipt and reversing a charge are the two ways a recorded
  // debt stops being recorded. Both are how cash walks out of a bursar's
  // office without a trace, so both sit here rather than with ordinary
  // day-to-day work.
  'receipt.cancel',
  'charge.reverse',
  // Returning an unpresented cheque to its drawer removes a receivable by
  // discretion rather than by a bank's decision. Clearing and bouncing follow
  // the bank advice and are ordinary daily work, so they are not here.
  'cheque.cancel',
  // Disposing of an asset takes it off the books and can book a loss against
  // the difference. It is the paper half of equipment leaving the building.
  'asset.dispose',
];

const MFA_SET = new Set<string>(MFA_REQUIRED_PERMISSIONS);

/** Every permission a user holds, via their roles. */
export async function loadPermissions(
  tx: Tx,
  userId: string,
): Promise<Set<PermissionKey>> {
  const rows = await tx.userRole.findMany({
    where: { userId },
    select: { role: { select: { permissions: { select: { permissionKey: true } } } } },
  });

  const out = new Set<PermissionKey>();
  for (const r of rows) {
    for (const p of r.role.permissions) {
      if (isPermissionKey(p.permissionKey)) out.add(p.permissionKey);
    }
  }
  return out;
}

export interface Principal {
  tenantId: string;
  userId: string;
  mfaVerified: boolean;
  permissions: Set<PermissionKey>;
}

export function can(principal: Principal, permission: PermissionKey): boolean {
  return principal.permissions.has(permission);
}

/**
 * Gate an action.
 *
 * Throws `ForbiddenError` when the permission is absent, and
 * `MfaRequiredError` when it is present but the session has not completed a
 * second factor and the action demands one. Two distinct errors because the
 * remedies differ: one is "ask an administrator", the other is "enter your
 * code".
 */
export function requirePermission(principal: Principal, permission: PermissionKey): void {
  if (!principal.permissions.has(permission)) {
    throw new ForbiddenError(permission, principal.userId);
  }
  if (MFA_SET.has(permission) && !principal.mfaVerified) {
    throw new MfaRequiredError(permission);
  }
}

/**
 * Maker-checker at the level of the individual document (SRS REQ-FIN-04).
 *
 * The SoD matrix stops one *role* holding both sides. This stops the case the
 * matrix cannot see: two roles held by one person, or a role edited after the
 * draft was made. Checked against the actual creator of the actual document.
 */
export class SelfApprovalError extends Error {
  constructor(readonly documentRef: string) {
    super(
      `You drafted ${documentRef}, so you cannot also approve it. ` +
        `It needs a second person.`,
    );
    this.name = 'SelfApprovalError';
  }
}

export function assertNotSelfApproval(
  principal: Principal,
  createdById: string,
  documentRef: string,
): void {
  if (principal.userId === createdById) {
    throw new SelfApprovalError(documentRef);
  }
}

/**
 * Create or replace a role's permission set.
 *
 * The SoD matrix is checked here — at save time, not at use time. A control
 * that only fires when someone tries to misuse a conflicting role has already
 * failed: the role existed for months and was being used all along.
 */
export async function setRolePermissions(
  tenantId: string,
  roleId: string,
  permissions: PermissionKey[],
  actorId: string,
): Promise<void> {
  const unknown = permissions.filter((p) => !isPermissionKey(p));
  if (unknown.length > 0) {
    throw new Error(`Unknown permission key(s): ${unknown.join(', ')}`);
  }

  assertNoSodViolation(permissions);

  await withTenant(tenantId, async (tx) => {
    const before = await tx.rolePermission.findMany({
      where: { roleId },
      select: { permissionKey: true },
    });

    await tx.rolePermission.deleteMany({ where: { roleId } });
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permissionKey) => ({ roleId, permissionKey })),
      });
    }

    await audit(tx, tenantId, {
      actorId,
      action: 'UPDATE',
      resourceType: 'role.permissions',
      resourceId: roleId,
      before: { permissions: before.map((b) => b.permissionKey).sort() },
      after: { permissions: [...permissions].sort() },
    });
  });
}

/**
 * Assign a role to a user, checking the union of everything they would then
 * hold.
 *
 * Two individually clean roles can combine into a conflict — a Cashier role
 * and a Cashier Supervisor role are each fine, and together let one person
 * take a payment and cancel it. The matrix has to be evaluated against the
 * person, not the role.
 */
export async function assignRole(
  tenantId: string,
  userId: string,
  roleId: string,
  actorId: string,
): Promise<void> {
  await withTenant(tenantId, async (tx) => {
    const existing = await loadPermissions(tx, userId);

    const incoming = await tx.rolePermission.findMany({
      where: { roleId },
      select: { permissionKey: true },
    });
    for (const p of incoming) {
      if (isPermissionKey(p.permissionKey)) existing.add(p.permissionKey);
    }

    assertNoSodViolation(existing);

    await tx.userRole.upsert({
      where: { userId_roleId: { userId, roleId } },
      create: { userId, roleId },
      update: {},
    });

    await audit(tx, tenantId, {
      actorId,
      action: 'UPDATE',
      resourceType: 'user.roles',
      resourceId: userId,
      after: { roleId, effectivePermissions: [...existing].sort() },
    });
  });
}
