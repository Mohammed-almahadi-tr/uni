import 'server-only';
import { withSystem, withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { DEFAULT_BRANDING } from '@/lib/cms/branding';
import { installLandingDefaults } from '@/lib/cms/content';
import { hashPassword } from './password';
import {
  DEFAULT_ROLES,
  PERMISSIONS,
  assertNoSodViolation,
  type PermissionKey,
} from './permissions';

/**
 * Tenant and user provisioning.
 *
 * The permission catalogue lives in TypeScript (permissions.ts) and is synced
 * into the database, rather than being duplicated as INSERT statements in a
 * migration. One source of truth: adding a permission means editing one array,
 * and `syncPermissions` reconciles the table on deploy.
 */

/**
 * Reconcile the `permissions` table with the catalogue.
 *
 * Inserts new keys and updates changed descriptions. Deliberately does NOT
 * delete keys that have disappeared from the catalogue — a stale row is
 * harmless, whereas deleting one would cascade to `role_permissions` and
 * silently strip access from live roles during a deploy. Removing a permission
 * for real is a considered migration, not a side effect.
 */
export async function syncPermissions(): Promise<{ synced: number }> {
  await withSystem(async (tx) => {
    for (const p of PERMISSIONS) {
      await tx.permission.upsert({
        where: { key: p.key },
        create: { key: p.key, description: p.description },
        update: { description: p.description },
      });
    }
  });
  return { synced: PERMISSIONS.length };
}

export interface ProvisionTenantInput {
  slug: string;
  nameEn: string;
  nameAr: string;
  functionalCurrency?: string;
  fiscalYearStartMonth?: number;
  admin: { email: string; fullName: string; password: string };
}

export interface ProvisionedTenant {
  tenantId: string;
  adminUserId: string;
  roleIds: Record<string, string>;
}

/**
 * Create a tenant with its default roles and first administrator.
 *
 * Runs as the owner role, because the tenant row must exist before any tenant
 * context can be set — this is the one legitimate bootstrap path that RLS
 * cannot cover.
 */
export async function provisionTenant(
  input: ProvisionTenantInput,
): Promise<ProvisionedTenant> {
  const passwordHash = await hashPassword(input.admin.password);

  // Fail before touching the database if a shipped default is unsound. Every
  // tenant would adopt it.
  for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
    try {
      assertNoSodViolation(def.permissions);
    } catch (e) {
      throw new Error(`Default role "${name}" violates segregation of duties: ${String(e)}`);
    }
  }

  return withSystem(async (tx) => {
    const tenant = await tx.tenant.create({
      data: {
        slug: input.slug,
        nameEn: input.nameEn,
        nameAr: input.nameAr,
        functionalCurrency: input.functionalCurrency ?? 'SDG',
        fiscalYearStartMonth: input.fiscalYearStartMonth ?? 1,
      },
      select: { id: true },
    });

    const roleIds: Record<string, string> = {};
    for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
      const role = await tx.role.create({
        data: { tenantId: tenant.id, name, nameAr: def.nameAr },
        select: { id: true },
      });
      roleIds[name] = role.id;
      await tx.rolePermission.createMany({
        data: def.permissions.map((permissionKey) => ({
          roleId: role.id,
          permissionKey,
        })),
        skipDuplicates: true,
      });
    }

    const admin = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: input.admin.email.toLowerCase(),
        fullName: input.admin.fullName,
        passwordHash,
      },
      select: { id: true },
    });

    await tx.userRole.create({
      data: { userId: admin.id, roleId: roleIds['University Admin'] },
    });

    // Identity and a landing page from minute one (C1). A tenant with no
    // branding row renders the shipped default anyway, but giving it a real
    // row means the admin can edit rather than invent — and it keeps the
    // "which palette is live" question unaskable.
    await tx.tenantBranding.create({
      data: {
        tenantId: tenant.id,
        shortCode: input.slug.slice(0, 12).toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'UNI',
        primaryH: DEFAULT_BRANDING.primary.h,
        primaryS: DEFAULT_BRANDING.primary.s,
        primaryL: DEFAULT_BRANDING.primary.l,
        secondaryH: DEFAULT_BRANDING.secondary.h,
        secondaryS: DEFAULT_BRANDING.secondary.s,
        secondaryL: DEFAULT_BRANDING.secondary.l,
        accentH: DEFAULT_BRANDING.accent.h,
        accentS: DEFAULT_BRANDING.accent.s,
        accentL: DEFAULT_BRANDING.accent.l,
      },
    });
    await installLandingDefaults(tenant.id, tx);

    await audit(tx, tenant.id, {
      actorId: admin.id,
      action: 'INSERT',
      resourceType: 'tenant',
      resourceId: tenant.id,
      after: { slug: input.slug, nameEn: input.nameEn, adminEmail: input.admin.email },
    });

    return { tenantId: tenant.id, adminUserId: admin.id, roleIds };
  });
}

export interface CreateUserInput {
  email: string;
  fullName: string;
  password: string;
  roleIds: string[];
}

/**
 * Create a staff user.
 *
 * The union of the requested roles is checked against the SoD matrix before
 * anything is written. Two individually clean roles can combine into a
 * conflict — Cashier plus Cashier Supervisor lets one person take a payment
 * and cancel it — so the check has to be against the person, not the role.
 */
export async function createUser(
  tenantId: string,
  input: CreateUserInput,
  actorId: string,
): Promise<{ userId: string }> {
  const passwordHash = await hashPassword(input.password);

  return withTenant(tenantId, async (tx) => {
    const effective = await effectivePermissionsFor(tx, input.roleIds);
    assertNoSodViolation(effective);

    const user = await tx.user.create({
      data: {
        tenantId,
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        passwordHash,
      },
      select: { id: true },
    });

    if (input.roleIds.length > 0) {
      await tx.userRole.createMany({
        data: input.roleIds.map((roleId) => ({ userId: user.id, roleId })),
      });
    }

    await audit(tx, tenantId, {
      actorId,
      action: 'INSERT',
      resourceType: 'user',
      resourceId: user.id,
      after: {
        email: input.email,
        fullName: input.fullName,
        roleIds: input.roleIds,
        effectivePermissions: [...effective].sort(),
      },
    });

    return { userId: user.id };
  });
}

async function effectivePermissionsFor(
  tx: Tx,
  roleIds: string[],
): Promise<Set<PermissionKey>> {
  if (roleIds.length === 0) return new Set();
  const rows = await tx.rolePermission.findMany({
    where: { roleId: { in: roleIds } },
    select: { permissionKey: true },
  });
  return new Set(rows.map((r) => r.permissionKey as PermissionKey));
}
