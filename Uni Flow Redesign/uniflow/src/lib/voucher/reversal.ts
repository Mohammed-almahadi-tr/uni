import 'server-only';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { reverse, type PostedVoucher } from '@/lib/ledger/posting';

/**
 * Reverse a posted voucher (SRS REQ-FIN-05).
 *
 * A posted voucher is never edited and never deleted; the only correction is a
 * linked opposite entry. The legacy system had no reversal concept at all —
 * corrections were made by editing `Transactionees` rows directly, which meant
 * a prior period's reported results could change silently long after they had
 * been signed off.
 *
 * Three properties, all enforced by the database as well as here:
 *
 *   · **Bidirectional linkage.** The reversal names its original
 *     (`reverses_id`), and the original is stamped with `reversed_at`. Either
 *     end answers "is this still live?" without a join.
 *   · **Once only.** `reverses_id` is UNIQUE, so a voucher cannot be reversed
 *     twice — which would otherwise double the correction.
 *   · **A stated reason.** Mandatory, and part of the permanent record. "Why
 *     was this reversed" is the first question an auditor asks.
 *
 * The reversal posts into the period covering the reversal date, not the
 * original's period. Correcting a January error in March belongs in March;
 * back-dating it into a closed January is the behaviour the period lock exists
 * to prevent.
 */
export async function reverseVoucher(
  principal: Principal,
  headerId: string,
  reason: string,
  opts: { reversalDate?: Date } = {},
): Promise<PostedVoucher> {
  // Demands a verified second factor — see MFA_REQUIRED_PERMISSIONS. Reversal
  // is how money that has been recorded stops being recorded, so it sits with
  // approval and payment rather than with ordinary posting.
  requirePermission(principal, 'voucher.reverse');

  return withTenant(principal.tenantId, async (tx) => {
    const original = await tx.transactionHeader.findUniqueOrThrow({
      where: { id: headerId },
      select: { voucherRef: true, totalAmount: true, docDate: true, description: true },
    });

    const reversal = await reverse(tx, principal.tenantId, headerId, reason, {
      reversalDate: opts.reversalDate,
      postedById: principal.userId,
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REVERSE',
      resourceType: 'voucher',
      resourceId: headerId,
      before: {
        voucherRef: original.voucherRef,
        totalAmount: original.totalAmount.toFixed(4),
        reversedAt: null,
      },
      after: {
        voucherRef: original.voucherRef,
        reversedBy: reversal.voucherRef,
        reversalId: reversal.headerId,
        reason: reason.trim(),
      },
    });

    return reversal;
  });
}
