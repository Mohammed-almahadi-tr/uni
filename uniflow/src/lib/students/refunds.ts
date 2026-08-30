import 'server-only';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { money, toStorage, type MoneyInput } from '@/lib/money';

/**
 * Withdrawal refund schedules (SRS REQ-FEE-03, Track B5).
 *
 * A policy is a set of bands: leave within this many days of the term
 * starting and this much of a refundable fee item comes back. The first
 * matching band wins, and past the last one nothing is refundable.
 *
 * Two rules the shape encodes:
 *
 *   · **A fee item's `isRefundable` flag is absolute.** Stamp duty, statutory
 *     fines and the returned-cheque fee are outside the schedule entirely,
 *     however early the student leaves. The bands govern the rest.
 *
 *   · **No policy means no refund.** A tenant that has not configured one
 *     refunds nothing, which is the conservative answer and makes a missing
 *     policy visible on the first withdrawal — rather than giving a term's
 *     fees away because a table was empty.
 *
 * The legacy build has no refund concept at all. Its nearest equivalent is
 * `frmTransferStudent`, which reverses whatever two numbers are in its text
 * boxes, one of which is the string literal `"1,030.00"`.
 */

export class RefundPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefundPolicyError';
  }
}

export interface RefundBandInput {
  /** Withdraw on or before this many days after the term starts. */
  withinDays: number;
  /** How much of a refundable item comes back, 0-100. */
  refundablePct: MoneyInput;
}

export interface SetRefundPolicyInput {
  code: string;
  nameAr: string;
  nameEn: string;
  bands: RefundBandInput[];
}

/**
 * The default schedule, and the one the SRS names: full refund inside the
 * first fortnight, half inside the first month, nothing after.
 */
export const STANDARD_REFUND_BANDS: readonly RefundBandInput[] = [
  { withinDays: 14, refundablePct: '100' },
  { withinDays: 28, refundablePct: '50' },
];

/**
 * Publish a refund policy, superseding whatever was active.
 *
 * Replaces rather than edits: a policy is what a withdrawal three months ago
 * was decided under, and the amounts it produced are already on the status
 * history row. Only one may be active at a time — enforced by a partial
 * unique index, for the same reason two approved fee schedules cannot cover
 * one day.
 */
export async function setRefundPolicy(
  principal: Principal,
  input: SetRefundPolicyInput,
): Promise<{ id: string; bands: number }> {
  requirePermission(principal, 'feematrix.manage');

  const code = input.code?.trim().toUpperCase();
  if (!code) throw new RefundPolicyError('A refund policy needs a code.');
  if (!input.nameAr?.trim() || !input.nameEn?.trim()) {
    throw new RefundPolicyError(
      'A refund policy needs a name in both Arabic and English — a student being told what ' +
        'they get back is being told it in one of them.',
    );
  }
  if (input.bands.length === 0) {
    throw new RefundPolicyError(
      'A policy with no bands refunds nothing to everybody, and looks exactly like a policy.',
    );
  }

  const seen = new Set<number>();
  let previousPct: ReturnType<typeof money> | null = null;
  const bands = [...input.bands]
    .sort((a, b) => a.withinDays - b.withinDays)
    .map((b) => {
      if (!Number.isInteger(b.withinDays) || b.withinDays < 0) {
        throw new RefundPolicyError(
          `"${b.withinDays}" is not a number of days from the start of the term.`,
        );
      }
      if (seen.has(b.withinDays)) {
        throw new RefundPolicyError(
          `Two bands both end at day ${b.withinDays}. A day priced twice has two answers.`,
        );
      }
      seen.add(b.withinDays);

      const pct = money(b.refundablePct);
      if (pct.isNegative() || pct.greaterThan(100)) {
        throw new RefundPolicyError(
          `A refund of ${pct.toFixed(2)}% is not a percentage.`,
        );
      }
      // Bands must not get more generous the longer a student stays. The
      // ordering is the whole meaning of the schedule, and a policy that
      // rewards leaving late is a data-entry error every time.
      if (previousPct && pct.greaterThan(previousPct)) {
        throw new RefundPolicyError(
          `Day ${b.withinDays} refunds ${pct.toFixed(2)}%, more than an earlier band. ` +
            `A refund schedule cannot become more generous the longer a student stays.`,
        );
      }
      previousPct = pct;

      return { withinDays: b.withinDays, refundablePct: toStorage(pct) };
    });

  return withTenant(principal.tenantId, async (tx) => {
    await tx.refundPolicy.updateMany({
      where: { tenantId: principal.tenantId, isActive: true },
      data: { isActive: false },
    });

    const existing = await tx.refundPolicy.findFirst({
      where: { tenantId: principal.tenantId, code },
      select: { id: true },
    });
    if (existing) {
      await tx.refundPolicyBand.deleteMany({ where: { policyId: existing.id } });
      await tx.refundPolicy.delete({ where: { id: existing.id } });
    }

    const policy = await tx.refundPolicy.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        isActive: true,
        createdById: principal.userId,
        bands: {
          create: bands.map((b) => ({
            tenantId: principal.tenantId,
            withinDays: b.withinDays,
            refundablePct: b.refundablePct,
          })),
        },
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'refund_policy',
      resourceId: policy.id,
      after: {
        code,
        bands: bands.map((b) => `${b.withinDays}d → ${b.refundablePct.toFixed(2)}%`),
      },
    });

    return { id: policy.id, bands: bands.length };
  });
}

export interface RefundPolicyView {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  bands: Array<{ withinDays: number; refundablePct: string }>;
}

export async function activeRefundPolicy(
  principal: Principal,
): Promise<RefundPolicyView | null> {
  requirePermission(principal, 'feematrix.read');

  return withTenant(principal.tenantId, async (tx) => {
    const policy = await tx.refundPolicy.findFirst({
      where: { tenantId: principal.tenantId, isActive: true },
      select: {
        id: true,
        code: true,
        nameAr: true,
        nameEn: true,
        bands: {
          orderBy: { withinDays: 'asc' },
          select: { withinDays: true, refundablePct: true },
        },
      },
    });
    if (!policy) return null;

    return {
      id: policy.id,
      code: policy.code,
      nameAr: policy.nameAr,
      nameEn: policy.nameEn,
      bands: policy.bands.map((b) => ({
        withinDays: b.withinDays,
        refundablePct: b.refundablePct.toFixed(4),
      })),
    };
  });
}

/** Install the standard schedule at tenant onboarding. */
export async function installRefundPolicy(
  tenantId: string,
  userId: string,
): Promise<{ id: string }> {
  return withTenant(tenantId, async (tx) => {
    const existing = await tx.refundPolicy.findFirst({
      where: { tenantId, isActive: true },
      select: { id: true },
    });
    if (existing) return existing;

    const policy = await tx.refundPolicy.create({
      data: {
        tenantId,
        code: 'STANDARD',
        nameAr: 'جدول الاسترداد القياسي',
        nameEn: 'Standard refund schedule',
        isActive: true,
        createdById: userId,
        bands: {
          create: STANDARD_REFUND_BANDS.map((b) => ({
            tenantId,
            withinDays: b.withinDays,
            refundablePct: toStorage(b.refundablePct),
          })),
        },
      },
      select: { id: true },
    });
    return policy;
  });
}
