import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { post, type PostingLine } from '@/lib/ledger/posting';
import { runJob } from '@/lib/jobs/runner';
import { sum, type Money } from '@/lib/money';

/**
 * Deferred-revenue recognition (SRS REQ-FEE-02).
 *
 * The legacy system recognised a full year's tuition on the day a student
 * registered. Any institution reporting monthly, or preparing statements
 * mid-year, therefore overstated its revenue by however much of the year had
 * not yet been taught — and nothing in the system could have shown that,
 * because there was no unearned income account to hold the difference.
 *
 * Here, billing a deferrable fee credits a liability. This batch moves it to
 * revenue one period at a time:
 *
 *     DR  Unearned Fee Income    the period's slice
 *       CR  Fee Revenue            the period's slice
 *
 * The schedule is written when the charge is raised, not computed here. That
 * is deliberate: a batch that recalculates is a batch that can produce a
 * different answer on a re-run, and the whole point of an idempotent
 * period-end job is that it cannot.
 *
 * Two protections, both learned from the legacy depreciation batch — which had
 * neither, so running it twice in a month simply doubled the charge:
 *
 *   · a job key of (tenant, period) through the durable runner, so a retry
 *     replays rather than re-posts — and leaves a record that says when it ran
 *     and what it posted;
 *   · the period lock in the posting engine, so a closed period refuses.
 */

export class RecognitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RecognitionError';
  }
}

export interface RecognitionResult {
  /** Null when there was nothing left to recognise. */
  headerId: string | null;
  voucherRef: string | null;
  entriesPosted: number;
  amount: string;
}

/**
 * Recognise everything scheduled for one fiscal period.
 *
 * Safe to run repeatedly: entries already recognised are skipped, and the
 * idempotency key makes a retry of the same run replay the original result
 * rather than post a second voucher.
 */
export async function runRecognition(
  principal: Principal,
  fiscalPeriodId: string,
  opts: { docDate?: Date } = {},
): Promise<RecognitionResult> {
  requirePermission(principal, 'revenue.recognise');

  // Same runner as depreciation. Both are period-end batches that post a lot
  // of money at once and must not run twice, and both need to be visible
  // afterwards — "was recognition run for March" is a question somebody asks.
  const { result } = await runJob(
    principal,
    {
      type: 'revenue-recognition',
      key: `revenue-recognition:${fiscalPeriodId}`,
      description: 'Deferred fee income recognised for the period',
    },
    (tx) => runRecognitionInTx(tx, principal, fiscalPeriodId, opts),
  );
  return result;
}

async function runRecognitionInTx(
  tx: Tx,
  principal: Principal,
  fiscalPeriodId: string,
  opts: { docDate?: Date },
): Promise<RecognitionResult> {
  const { tenantId } = principal;

  const period = await tx.fiscalPeriod.findUnique({
    where: { id: fiscalPeriodId },
    select: {
      id: true,
      seq: true,
      startDate: true,
      endDate: true,
      status: true,
      fiscalYear: { select: { tenantId: true, name: true } },
    },
  });
  if (!period || period.fiscalYear.tenantId !== tenantId) {
    throw new RecognitionError('That fiscal period does not belong to this university.');
  }
  if (period.status !== 'OPEN') {
    throw new RecognitionError(
      `Period ${period.seq} of ${period.fiscalYear.name} is ${period.status}. Revenue is ` +
        `recognised into an open period only.`,
    );
  }

  const pending = await tx.recognitionEntry.findMany({
    where: { tenantId, fiscalPeriodId, recognisedAt: null },
    select: {
      id: true,
      amount: true,
      chargeId: true,
      charge: {
        select: {
          reversedAt: true,
          feeItem: {
            select: {
              nameEn: true,
              revenueAccountId: true,
              unearnedAccountId: true,
              costCenterId: true,
              revenueAccount: { select: { requiresCostCenter: true, code: true } },
            },
          },
        },
      },
    },
  });

  // A reversed charge took its unrecognised balance out of unearned income at
  // the moment it was reversed. Recognising it now would credit revenue that
  // no liability is backing.
  const live = pending.filter((e) => e.charge.reversedAt === null);

  if (live.length === 0) {
    return { headerId: null, voucherRef: null, entriesPosted: 0, amount: '0.0000' };
  }

  // Collapse to one pair of lines per (unearned, revenue, cost centre). A term
  // with 900 students produces 900 schedule rows and, without this, 1800
  // journal lines saying the same thing.
  const groups = new Map<
    string,
    { unearnedId: string; revenueId: string; costCenterId: string | null; amount: Money; label: string }
  >();

  for (const e of live) {
    const item = e.charge.feeItem;
    const unearnedId = item.unearnedAccountId;
    if (!unearnedId) {
      throw new RecognitionError(
        `Fee item "${item.nameEn}" has a recognition schedule but no unearned-income ` +
          `account. Its charges could not have been deferred; this schedule is corrupt.`,
      );
    }
    const costCenterId = item.costCenterId ?? null;
    if (item.revenueAccount.requiresCostCenter && !costCenterId) {
      throw new RecognitionError(
        `Revenue account ${item.revenueAccount.code} requires a cost centre and fee item ` +
          `"${item.nameEn}" has no default. Set one before recognising its revenue.`,
      );
    }

    const key = `${unearnedId}::${item.revenueAccountId}::${costCenterId ?? ''}`;
    const existing = groups.get(key);
    if (existing) {
      existing.amount = existing.amount.plus(e.amount);
    } else {
      groups.set(key, {
        unearnedId,
        revenueId: item.revenueAccountId,
        costCenterId,
        amount: e.amount,
        label: item.nameEn,
      });
    }
  }

  const lines: PostingLine[] = [];
  for (const g of groups.values()) {
    lines.push({
      accountId: g.unearnedId,
      debit: g.amount,
      costCenterId: g.costCenterId,
      description: `Revenue recognised — ${g.label}`,
    });
    lines.push({
      accountId: g.revenueId,
      credit: g.amount,
      costCenterId: g.costCenterId,
      description: `Revenue recognised — ${g.label}`,
    });
  }

  const total = sum(live.map((e) => e.amount));
  // The last day of the period, so the entry lands where it belongs rather
  // than on whatever day somebody happened to run the batch.
  const docDate = opts.docDate ?? period.endDate;

  const posted = await post(tx, tenantId, {
    voucherType: 'REVENUE_RECOGNITION',
    docDate,
    description: `Revenue recognition — period ${period.seq} of ${period.fiscalYear.name}`,
    sourceModule: 'REVENUE_RECOGNITION',
    sourceRef: period.id,
    postedById: principal.userId,
    lines,
  });

  const now = new Date();
  for (const e of live) {
    await tx.recognitionEntry.update({
      where: { id: e.id },
      data: { recognisedAt: now, postedHeaderId: posted.headerId },
    });
    await tx.studentCharge.update({
      where: { id: e.chargeId },
      data: { recognisedAmount: { increment: e.amount } },
    });
  }

  await audit(tx, tenantId, {
    actorId: principal.userId,
    action: 'POST',
    resourceType: 'revenue.recognition',
    resourceId: period.id,
    after: {
      period: `${period.seq}/${period.fiscalYear.name}`,
      voucherRef: posted.voucherRef,
      entries: live.length,
      amount: total.toFixed(4),
      skippedReversed: pending.length - live.length,
    },
  });

  return {
    headerId: posted.headerId,
    voucherRef: posted.voucherRef,
    entriesPosted: live.length,
    amount: total.toFixed(4),
  };
}

/**
 * What is still sitting in unearned income, and when it is due to be
 * recognised.
 *
 * The check on an unearned balance: it should equal the sum of everything
 * scheduled but not yet recognised. A divergence means a charge was reversed
 * without its schedule being cleared, or a recognition posted without its
 * entry being stamped.
 */
export async function unrecognisedByPeriod(
  principal: Principal,
): Promise<Array<{ fiscalPeriodId: string; seq: number; amount: string }>> {
  requirePermission(principal, 'report.financial');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.recognitionEntry.groupBy({
      by: ['fiscalPeriodId'],
      where: { tenantId: principal.tenantId, recognisedAt: null, charge: { reversedAt: null } },
      _sum: { amount: true },
    });

    const periods = await tx.fiscalPeriod.findMany({
      where: { id: { in: rows.map((r) => r.fiscalPeriodId) } },
      select: { id: true, seq: true },
    });
    const seqById = new Map(periods.map((p) => [p.id, p.seq]));

    return rows
      .map((r) => ({
        fiscalPeriodId: r.fiscalPeriodId,
        seq: seqById.get(r.fiscalPeriodId) ?? 0,
        amount: (r._sum.amount ?? sum([])).toFixed(4),
      }))
      .sort((a, b) => a.seq - b.seq);
  });
}
