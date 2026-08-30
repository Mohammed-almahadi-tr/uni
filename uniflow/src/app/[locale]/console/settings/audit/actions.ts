'use server';

import { currentContext } from '@/lib/console/session';
import { withTenant } from '@/lib/db/client';
import { requirePermission } from '@/lib/auth/rbac';
import { verifyChain } from '@/lib/audit/log';

/**
 * Verifying the audit chain (tenant administration, SRS REQ-NFR-06).
 *
 * Every entry carries the hash of the one before it, so removing or altering
 * one breaks every link after it. `verifyChain` walks the whole chain in
 * pages and reports the **first** sequence number that does not match, which
 * is where tampering starts.
 *
 * This is offered on the screen as well as run on a schedule, because the
 * question "can I trust what this log says" is asked by a person, usually an
 * auditor, and usually while they are sitting in front of it. A failure here
 * is an alert, not a log line.
 */

export interface VerifyState {
  error: string | null;
  result: { ok: boolean; entriesChecked: number; brokenAtSeq?: string; reason?: string } | null;
}

// `useActionState` always passes the previous state. This action ignores it,
// because verifying the chain depends on nothing but the chain — the
// explanation goes above the directive so the directive attaches to the
// function rather than to a comment.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function verify(_prev: VerifyState): Promise<VerifyState> {
  const ctx = await currentContext();
  if (!ctx) return { error: 'Your session has ended. Sign in again.', result: null };

  try {
    requirePermission(ctx.principal, 'audit.read');
    const result = await withTenant(ctx.principal.tenantId, (tx) =>
      verifyChain(tx, ctx.principal.tenantId),
    );
    return {
      error: null,
      result: {
        ok: result.ok,
        entriesChecked: result.entriesChecked,
        // A bigint does not survive the boundary to a client component, and
        // the sequence is an identifier here rather than an arithmetic value.
        brokenAtSeq: result.brokenAtSeq?.toString(),
        reason: result.reason,
      },
    };
  } catch (e) {
    if (e instanceof Error && e.name !== 'Error' && e.message) {
      return { error: e.message, result: null };
    }
    console.error('[audit]', e);
    return { error: 'That could not be completed.', result: null };
  }
}
