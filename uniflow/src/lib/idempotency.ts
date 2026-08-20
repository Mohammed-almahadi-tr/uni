/**
 * Idempotency (SRS REQ-NFR-07).
 *
 * The highest-value single item in Phase 0.
 *
 * A cashier on an unreliable link presses Save, sees nothing happen, and
 * presses it again. Without this, the student is charged twice, the cash
 * drawer reconciles short, and someone spends an afternoon working out which
 * of two identical receipts is the real one. At these campuses that is the
 * expected condition, not the exceptional one.
 *
 * The guarantee: for a given (tenant, key), the operation runs at most once.
 * A replay returns the original response. A replay *in flight* is rejected
 * rather than served a partial result. A key reused with a different body is
 * an error — it means a client bug, not a retry.
 */
import { createHash } from 'node:crypto';
import { Prisma } from '@/generated/prisma/client';
import { prisma, withTenant, type Tx, type TxOptions } from '@/lib/db/client';
import type { PrismaClient } from '@/generated/prisma/client';

export class IdempotencyConflictError extends Error {
  constructor(readonly key: string) {
    super(
      `Idempotency key "${key}" was already used with a different request body. ` +
        `Keys must be unique per distinct operation.`,
    );
    this.name = 'IdempotencyConflictError';
  }
}

export class IdempotencyInFlightError extends Error {
  constructor(readonly key: string) {
    super(
      `An operation with idempotency key "${key}" is still in flight. ` +
        `Retry shortly rather than treating this as a failure.`,
    );
    this.name = 'IdempotencyInFlightError';
  }
}

/**
 * Stable hash of a request body.
 *
 * Object key order must not change the hash — a client that serialises
 * `{a,b}` one time and `{b,a}` the next is sending the same request, and
 * rejecting it as a conflict would be a bug in us, not in them.
 */
export function hashRequest(body: unknown): string {
  return createHash('sha256').update(canonicalise(body)).digest('hex');
}

function canonicalise(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (value instanceof Prisma.Decimal) return JSON.stringify(value.toFixed());
  if (Array.isArray(value)) return `[${value.map(canonicalise).join(',')}]`;
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalise(v)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export interface IdempotentResult<T> {
  result: T;
  /** True when this call did the work; false when it replayed a stored result. */
  executed: boolean;
}

/**
 * Run `fn` at most once for this (tenant, key).
 *
 * The claim row is inserted in its own committed transaction *before* the
 * work begins. That ordering is what makes the guarantee hold: if the work
 * transaction then rolls back, the claim survives and a subsequent retry is
 * told the key is spent rather than silently doing the work a second time.
 * The claim is released on failure so that a genuine retry can proceed —
 * releasing it is the deliberate trade-off, and the alternative (a permanent
 * tombstone) would strand a cashier after any transient database error.
 */
export async function idempotent<T>(
  tenantId: string,
  key: string,
  endpoint: string,
  requestBody: unknown,
  fn: (tx: Tx) => Promise<T>,
  options: TxOptions = {},
  /** Injectable so tests can target the test database, and so a future
   *  read-replica or per-region client can be passed explicitly rather than
   *  being silently picked up from module scope. */
  client: PrismaClient = prisma,
): Promise<IdempotentResult<T>> {
  const requestHash = hashRequest(requestBody);

  // 1. Claim the key, or discover it is already claimed.
  const existing = await withTenant(tenantId, async (tx) => {
    const rows = await tx.$queryRaw<
      Array<{ request_hash: string; response_json: unknown; completed_at: Date | null }>
    >`
      INSERT INTO idempotency_keys (key, tenant_id, endpoint, request_hash, created_at)
      VALUES (${key}, ${tenantId}::uuid, ${endpoint}, ${requestHash}, now())
      ON CONFLICT (tenant_id, key) DO NOTHING
      RETURNING request_hash, response_json, completed_at
    `;
    if (rows.length > 0) return null; // we claimed it

    return tx.idempotencyKey.findUniqueOrThrow({
      where: { tenantId_key: { tenantId, key } },
      select: { requestHash: true, responseJson: true, completedAt: true },
    });
  }, {}, client);

  if (existing) {
    if (existing.requestHash !== requestHash) {
      throw new IdempotencyConflictError(key);
    }
    if (existing.completedAt === null) {
      throw new IdempotencyInFlightError(key);
    }
    return { result: existing.responseJson as T, executed: false };
  }

  // 2. Do the work.
  let result: T;
  try {
    result = await withTenant(tenantId, fn, options, client);
  } catch (err) {
    // Release the claim so a legitimate retry is not permanently blocked by a
    // transient failure.
    await withTenant(tenantId, async (tx) => {
      await tx.idempotencyKey.deleteMany({ where: { tenantId, key, completedAt: null } });
    }, {}, client).catch(() => {
      /* best effort — the original error is the one worth surfacing */
    });
    throw err;
  }

  // 3. Record the response so a replay can be served from it.
  await withTenant(tenantId, async (tx) => {
    await tx.idempotencyKey.update({
      where: { tenantId_key: { tenantId, key } },
      data: {
        responseJson: result as Prisma.InputJsonValue,
        completedAt: new Date(),
      },
    });
  }, {}, client);

  return { result, executed: true };
}
