import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import type { JobStatus } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import type { Principal } from '@/lib/auth/rbac';

/**
 * The durable batch runner.
 *
 * Period-end work — depreciation, revenue recognition, dunning, FX
 * revaluation — shares one shape and one hazard: it posts a lot of money in
 * one go, and running it twice doubles everything it did. The legacy
 * depreciation screen had no protection at all. Clicking Save a second time
 * posted the entire batch again, against voucher numbers taken from
 * `MAX(MoveNo)` with no filter, and nothing anywhere recorded that a run had
 * happened. There was no way to find out afterwards except by reading the
 * ledger.
 *
 * Three guarantees, and each closes one of those holes:
 *
 *   1. **At most once per key.** `(tenant, job_key)` is unique, and the row is
 *      claimed before the work starts. A second invocation with the same key
 *      replays the stored result rather than repeating the work.
 *   2. **Visible.** Every run leaves a row: when, by whom, how long it took,
 *      what it posted, and — if it failed — why. "When was depreciation last
 *      run" is a query, not an archaeology exercise.
 *   3. **Retryable after failure, never after success.** A failed run can be
 *      re-attempted under the same key; a succeeded one cannot be re-run at
 *      all, which is enforced by trigger rather than by this file.
 *
 * Why not the idempotency-key table: that is a request-level mechanism whose
 * rows are prunable and invisible to staff. A period-end batch is an
 * operational event somebody has to be able to look at months later.
 */

export class JobInFlightError extends Error {
  constructor(readonly jobKey: string) {
    super(
      `The batch "${jobKey}" is already running. Wait for it to finish rather than ` +
        `starting it again — it posts to the ledger.`,
    );
    this.name = 'JobInFlightError';
  }
}

export class JobFailedError extends Error {
  constructor(
    readonly jobKey: string,
    readonly cause: unknown,
  ) {
    super(`The batch "${jobKey}" failed: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = 'JobFailedError';
  }
}

export interface JobOutcome<T> {
  result: T;
  /** False when this call replayed a run that had already succeeded. */
  executed: boolean;
  jobRunId: string;
  attempts: number;
}

/**
 * Run a batch at most once for this (tenant, key).
 *
 * `fn` receives a transaction and must do all of its work inside it, so a
 * failure leaves nothing behind. The job row itself is written in separate
 * transactions before and after — that ordering is what makes the guarantee
 * hold, exactly as in `idempotent()`: if the work rolls back, the claim
 * survives and records the failure rather than vanishing with it.
 */
export async function runJob<T>(
  principal: Principal,
  spec: { type: string; key: string; description?: string },
  fn: (tx: Tx) => Promise<T>,
): Promise<JobOutcome<T>> {
  const { tenantId } = principal;
  const jobKey = spec.key.trim();
  if (!jobKey) throw new Error('A batch needs a job key.');

  // 1. Claim it, or discover what happened last time.
  const claim = await withTenant(tenantId, async (tx) => {
    const inserted = await tx.$queryRaw<Array<{ id: string; attempts: number }>>`
      INSERT INTO job_runs (id, tenant_id, job_type, job_key, status, started_at,
                            attempts, requested_by_id)
      VALUES (gen_random_uuid(), ${tenantId}::uuid, ${spec.type}, ${jobKey},
              'RUNNING', now(), 1, ${principal.userId}::uuid)
      ON CONFLICT (tenant_id, job_key) DO NOTHING
      RETURNING id, attempts
    `;
    if (inserted.length > 0) {
      return { kind: 'claimed' as const, id: inserted[0].id, attempts: 1 };
    }

    const existing = await tx.jobRun.findUniqueOrThrow({
      where: { tenantId_jobKey: { tenantId, jobKey } },
      select: { id: true, status: true, resultJson: true, attempts: true },
    });
    return { kind: 'existing' as const, ...existing };
  });

  if (claim.kind === 'existing') {
    const status: JobStatus = claim.status;
    if (status === 'RUNNING') throw new JobInFlightError(jobKey);
    if (status === 'SUCCEEDED') {
      return {
        result: claim.resultJson as T,
        executed: false,
        jobRunId: claim.id,
        attempts: claim.attempts,
      };
    }
    // FAILED: take it again, under the same key.
    await withTenant(tenantId, (tx) =>
      tx.jobRun.update({
        where: { id: claim.id },
        data: {
          status: 'RUNNING',
          startedAt: new Date(),
          finishedAt: null,
          errorText: null,
          attempts: { increment: 1 },
          requestedById: principal.userId,
        },
      }),
    );
  }

  const jobRunId = claim.id;
  const attempts = claim.kind === 'claimed' ? 1 : claim.attempts + 1;

  // 2. Do the work.
  let result: T;
  try {
    result = await withTenant(tenantId, fn, { timeout: 120_000 });
  } catch (err) {
    await withTenant(tenantId, (tx) =>
      tx.jobRun.update({
        where: { id: jobRunId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorText: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
        },
      }),
    ).catch(() => {
      /* best effort — the original failure is the one worth surfacing */
    });
    throw err;
  }

  // 3. Record what it did, so a retry replays instead of repeating.
  await withTenant(tenantId, async (tx) => {
    await tx.jobRun.update({
      where: { id: jobRunId },
      data: {
        status: 'SUCCEEDED',
        finishedAt: new Date(),
        resultJson: (result ?? {}) as Prisma.InputJsonValue,
      },
    });
    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'POST',
      resourceType: `job.${spec.type}`,
      resourceId: jobRunId,
      after: { jobKey, attempts, description: spec.description ?? null },
    });
  });

  return { result, executed: true, jobRunId, attempts };
}

export interface JobRunSummary {
  id: string;
  jobType: string;
  jobKey: string;
  status: JobStatus;
  startedAt: Date;
  finishedAt: Date | null;
  attempts: number;
  errorText: string | null;
  requestedById: string;
}

/**
 * What batches have run, most recent first.
 *
 * The operational view: which period-ends are done, which failed and are
 * waiting for somebody, and whether anything has been retried more than once.
 */
export async function listJobRuns(
  principal: Principal,
  filter: { jobType?: string; status?: JobStatus; take?: number } = {},
): Promise<JobRunSummary[]> {
  return withTenant(principal.tenantId, (tx) =>
    tx.jobRun.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(filter.jobType ? { jobType: filter.jobType } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: filter.take ?? 50,
      select: {
        id: true,
        jobType: true,
        jobKey: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        attempts: true,
        errorText: true,
        requestedById: true,
      },
    }),
  );
}
