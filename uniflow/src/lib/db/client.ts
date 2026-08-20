/**
 * Database access.
 *
 * Two entry points backed by two different database ROLES, and the split is a
 * security boundary rather than a convention:
 *
 *   withTenant(tenantId, fn)  — everything that serves a request. Connects as
 *                               the app role (NOSUPERUSER, NOBYPASSRLS, owns
 *                               nothing) and sets app.tenant_id for the
 *                               transaction. RLS confines every query to that
 *                               tenant even if the query itself forgets a
 *                               WHERE.
 *
 *   withSystem(fn)            — migrations, seeding, tenant provisioning, the
 *                               audit-chain verifier, tests. Connects as the
 *                               owner role, which bypasses RLS by virtue of
 *                               owning the tables. Never reachable from a
 *                               request handler.
 *
 * Why roles and not a flag: PostgreSQL RLS does not apply to superusers at
 * all, and does not apply to a table's owner unless FORCE is set. An earlier
 * cut of this file used one connection plus a `app.bypass_rls` session
 * variable — which meant the very connection RLS was meant to constrain could
 * turn it off, and (because the local role was a superuser) RLS was inert
 * anyway. The isolation suite caught both. Privilege comes from the role.
 *
 * Why SET LOCAL and not SET: SET LOCAL is scoped to the transaction and is
 * discarded on commit or rollback. A session-level SET survives on the
 * physical connection, and behind Supabase's transaction-mode pooler that
 * connection is handed to the next request — belonging to a different tenant.
 * That is a silent cross-tenant leak.
 */
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';

declare global {
  // Reused across HMR reloads in development so we do not exhaust connections.
  var __uniflowPrisma: PrismaClient | undefined;
  var __uniflowSystemPrisma: PrismaClient | undefined;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function createClient(connectionString: string | undefined, label: string): PrismaClient {
  if (!connectionString) {
    throw new Error(
      `${label} is not set. Run "npm run db:start" for local Postgres, or point it at ` +
        `your Supabase connection string (app role on the pooler for DATABASE_URL, ` +
        `owner role direct for DIRECT_URL).`,
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

/** App role. Subject to RLS. Everything request-facing uses this. */
export const prisma: PrismaClient =
  globalThis.__uniflowPrisma ?? createClient(process.env.DATABASE_URL, 'DATABASE_URL');

/** Owner role. Bypasses RLS. Platform work only. */
export const systemPrisma: PrismaClient =
  globalThis.__uniflowSystemPrisma ?? createClient(process.env.DIRECT_URL, 'DIRECT_URL');

if (process.env.NODE_ENV !== 'production') {
  globalThis.__uniflowPrisma = prisma;
  globalThis.__uniflowSystemPrisma = systemPrisma;
}

/** The transaction handle handed to callbacks. Prisma's interactive
 *  transaction client — no nested $transaction, by design. */
export type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export interface TxOptions {
  /** Serializable for anything that reads-then-writes a balance or a counter.
   *  ReadCommitted is Postgres's default and is fine for plain inserts. */
  isolationLevel?: 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
  timeout?: number;
  maxWait?: number;
}

/**
 * Run work as a tenant. Every statement inside sees only that tenant's rows.
 */
export async function withTenant<T>(
  tenantId: string,
  fn: (tx: Tx) => Promise<T>,
  options: TxOptions = {},
  client: PrismaClient = prisma,
): Promise<T> {
  if (!UUID_RE.test(tenantId)) {
    // set_config takes text; anything non-uuid would either be an injection
    // vector or a confusing cast error deep inside a policy. Reject at the door.
    throw new Error(`withTenant: not a uuid: ${tenantId}`);
  }
  return client.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`SELECT set_config('app.tenant_id', $1, true)`, tenantId);
      return fn(tx);
    },
    {
      isolationLevel: options.isolationLevel ?? 'ReadCommitted',
      timeout: options.timeout ?? 15_000,
      maxWait: options.maxWait ?? 5_000,
    },
  );
}

/**
 * Run work with RLS bypassed, as the owner role.
 *
 * Legitimate callers: migrations, the seed script, tenant provisioning (which
 * must create the tenant row before any tenant context can exist), the
 * audit-chain verifier, and tests. Nothing that serves a request.
 */
export async function withSystem<T>(
  fn: (tx: Tx) => Promise<T>,
  options: TxOptions = {},
  client: PrismaClient = systemPrisma,
): Promise<T> {
  return client.$transaction(fn, {
    isolationLevel: options.isolationLevel ?? 'ReadCommitted',
    timeout: options.timeout ?? 30_000,
    maxWait: options.maxWait ?? 5_000,
  });
}
