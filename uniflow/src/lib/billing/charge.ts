import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { requireAccounts } from '@/lib/coa/mapping';
import { post, type PostingLine } from '@/lib/ledger/posting';
import { resolvePeriod, toDateOnly } from '@/lib/ledger/period';
import { idempotent } from '@/lib/idempotency';
import { allocate, sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import type { SourceModule } from '@/generated/prisma/enums';

/**
 * Raising charges on a student account (SRS REQ-FEE-01/02, Module 6).
 *
 * This is the half of the student sub-ledger that creates the debt. The other
 * half — cashiering — settles it.
 *
 * What one billed fee item posts:
 *
 *     DR  Student AR control      net        (with student sub-ledger identity)
 *     DR  Scholarships/Discounts  discount   (only when a discount applies)
 *       CR  Unearned Fee Income     gross    (deferrable item)
 *       CR  Fee Revenue             gross    (everything else)
 *
 * Two decisions worth stating, because both are departures from the legacy
 * system and both are visible in the financial statements:
 *
 *   1. **Discounts are gross, not net.** The student is billed the catalogue
 *      price and the discount is an expense, so scholarship exposure appears
 *      on its own line. Netting it off revenue hides what the institution
 *      gave away — which is the number `viewDiscount` and
 *      `UnivDiscountSummary` existed to recover in the Ribat build, by
 *      reconstruction.
 *
 *   2. **Deferrable items credit a liability.** The legacy system recognised
 *      a full year's tuition on registration day. Revenue moves out of
 *      unearned income across the term, by the batch in recognition.ts.
 */

export class ChargeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChargeError';
  }
}

export interface ChargeLineInput {
  feeItemId: string;
  /** Catalogue price for this student. Falls back to the item's default. */
  grossAmount?: MoneyInput;
  /** Scholarship, staff-child or negotiated reduction. */
  discountAmount?: MoneyInput;
  /** Overrides the fee item's default. Required when the revenue account
   *  demands one, as the shipped tuition account does. */
  costCenterId?: string | null;
  dueDate?: Date | null;
}

export interface RaiseChargesInput {
  studentId: string;
  docDate: Date;
  description?: string;
  termLabel?: string | null;
  /** Set by the registration engine, so every charge it raises is traceable
   *  back to the registration that caused it (B4). */
  registrationId?: string | null;
  lines: ChargeLineInput[];
  sourceModule?: SourceModule;
  sourceRef?: string | null;
  /**
   * Periods across which deferrable items are recognised, in order. Defaults
   * to the single period containing `docDate`, which recognises immediately —
   * correct for a one-off, wrong for a term's tuition, so registration passes
   * the term's periods explicitly.
   */
  recognitionPeriodIds?: string[];
}

export interface RaisedCharges {
  headerId: string;
  voucherRef: string;
  chargeIds: string[];
  totalNet: string;
  totalGross: string;
  totalDiscount: string;
}

/**
 * Bill a student for one or more fee items, in one voucher.
 *
 * Carries an idempotency key for the same reason cashiering does: registration
 * is a slow multi-step form over an unreliable link, and billing a student
 * twice for a term is not a small mistake.
 */
export async function raiseCharges(
  principal: Principal,
  input: RaiseChargesInput,
  idempotencyKey?: string,
): Promise<RaisedCharges> {
  requirePermission(principal, 'charge.create');

  if (input.lines.length === 0) {
    throw new ChargeError('A billing document with no fee items charges nothing.');
  }

  const run = (tx: Tx) => raiseChargesInTx(tx, principal, input);

  if (!idempotencyKey) {
    return withTenant(principal.tenantId, run);
  }
  const { result } = await idempotent(
    principal.tenantId,
    idempotencyKey,
    'billing.raiseCharges',
    { ...input, docDate: toDateOnly(input.docDate).toISOString(), actor: principal.userId },
    run,
  );
  return result;
}

/**
 * The body of `raiseCharges`, without the permission check or the idempotency
 * wrapper, for callers that are already inside a transaction and have already
 * established the right to bill — the cheque pipeline raising a returned-cheque
 * fee, for one. The fee and the bounce that caused it must be one transaction.
 */
export async function raiseChargesInTx(
  tx: Tx,
  principal: Principal,
  input: RaiseChargesInput,
): Promise<RaisedCharges> {
  const { tenantId } = principal;

  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });
  const currency = tenant.functionalCurrency.trim();

  const student = await tx.student.findUnique({
    where: { id: input.studentId },
    select: { id: true, studentNo: true, fullNameEn: true, status: true, isActive: true },
  });
  if (!student) throw new ChargeError('Student not found in this tenant.');
  if (!student.isActive) {
    throw new ChargeError(
      `${student.studentNo} is not an active record. Reinstate the student before billing them.`,
    );
  }

  const accounts = await requireAccounts(tx, tenantId, [
    'STUDENT_AR_CONTROL',
    'DEFAULT_DISCOUNT_EXPENSE',
  ] as const);

  const docDate = toDateOnly(input.docDate);
  const period = await resolvePeriod(tx, tenantId, docDate);

  const feeItemIds = [...new Set(input.lines.map((l) => l.feeItemId))];
  const feeItems = await tx.feeItem.findMany({
    where: { tenantId, id: { in: feeItemIds } },
    select: {
      id: true,
      code: true,
      nameEn: true,
      nameAr: true,
      isActive: true,
      isDeferrable: true,
      isDiscountable: true,
      defaultAmount: true,
      costCenterId: true,
      revenueAccountId: true,
      unearnedAccountId: true,
      revenueAccount: { select: { code: true, requiresCostCenter: true } },
    },
  });
  const byId = new Map(feeItems.map((f) => [f.id, f]));

  const postingLines: PostingLine[] = [];
  const prepared: Array<{
    feeItemId: string;
    gross: Money;
    discount: Money;
    net: Money;
    isDeferred: boolean;
    dueDate: Date | null;
  }> = [];

  for (const [i, line] of input.lines.entries()) {
    const label = `Line ${i + 1}`;
    const item = byId.get(line.feeItemId);
    if (!item) throw new ChargeError(`${label}: no such fee item in this catalog.`);
    if (!item.isActive) {
      throw new ChargeError(`${label}: fee item ${item.code} has been deactivated.`);
    }

    const gross = toStorage(line.grossAmount ?? item.defaultAmount ?? 0);
    if (gross.lessThanOrEqualTo(0)) {
      throw new ChargeError(
        `${label}: ${item.code} has no amount. Supply one, or give the fee item a default.`,
      );
    }

    const discount = toStorage(line.discountAmount ?? 0);
    if (discount.isNegative()) {
      throw new ChargeError(`${label}: a discount cannot be negative.`);
    }
    if (discount.greaterThan(gross)) {
      throw new ChargeError(
        `${label}: the discount of ${discount.toFixed(2)} exceeds the ${item.code} charge of ` +
          `${gross.toFixed(2)}. A discount cannot turn a bill into a payment.`,
      );
    }
    if (!discount.isZero() && !item.isDiscountable) {
      throw new ChargeError(
        `${label}: ${item.code} is not discountable. Stamp duty and statutory fines are ` +
          `collected in full or not at all.`,
      );
    }

    const costCenterId = line.costCenterId ?? item.costCenterId ?? null;
    if (item.revenueAccount.requiresCostCenter && !costCenterId) {
      throw new ChargeError(
        `${label}: revenue account ${item.revenueAccount.code} requires a cost centre, and ` +
          `${item.code} has no default. Supply the student's faculty.`,
      );
    }

    const net = gross.minus(discount);
    const creditAccountId = item.isDeferrable
      ? item.unearnedAccountId ?? item.revenueAccountId
      : item.revenueAccountId;

    // Debit the student for what they owe.
    if (!net.isZero()) {
      postingLines.push({
        accountId: accounts.STUDENT_AR_CONTROL,
        subledgerType: 'STUDENT',
        subledgerId: student.id,
        debit: net,
        description: `${item.nameEn} — ${student.studentNo}`,
      });
    }
    // Debit the institution for what it gave away.
    if (!discount.isZero()) {
      postingLines.push({
        accountId: accounts.DEFAULT_DISCOUNT_EXPENSE,
        debit: discount,
        costCenterId,
        description: `Discount on ${item.nameEn} — ${student.studentNo}`,
      });
    }
    // Credit revenue, or the liability if the institution has not yet
    // delivered what it is charging for.
    postingLines.push({
      accountId: creditAccountId,
      credit: gross,
      costCenterId,
      description: `${item.nameEn} — ${student.studentNo}`,
    });

    prepared.push({
      feeItemId: item.id,
      gross,
      discount,
      net,
      isDeferred: item.isDeferrable,
      dueDate: line.dueDate ? toDateOnly(line.dueDate) : null,
    });
  }

  const totalGross = sum(prepared.map((p) => p.gross));
  const totalDiscount = sum(prepared.map((p) => p.discount));
  const totalNet = sum(prepared.map((p) => p.net));

  const description =
    input.description?.trim() ||
    `Fees — ${student.studentNo}${input.termLabel ? ` — ${input.termLabel}` : ''}`;

  const posted = await post(tx, tenantId, {
    voucherType: 'STUDENT_CHARGE',
    docDate,
    description,
    sourceModule: input.sourceModule ?? 'REGISTRATION',
    sourceRef: input.sourceRef ?? student.id,
    postedById: principal.userId,
    lines: postingLines,
  });

  // The recognition schedule is written now, while the term is known, so the
  // period-end batch is a lookup rather than a calculation. Re-running it
  // cannot arrive at a different answer.
  const recognitionPeriods =
    input.recognitionPeriodIds && input.recognitionPeriodIds.length > 0
      ? input.recognitionPeriodIds
      : [period.fiscalPeriodId];

  const chargeIds: string[] = [];
  for (const p of prepared) {
    const charge = await tx.studentCharge.create({
      data: {
        tenantId,
        studentId: student.id,
        feeItemId: p.feeItemId,
        registrationId: input.registrationId ?? null,
        termLabel: input.termLabel ?? null,
        docDate,
        dueDate: p.dueDate,
        grossAmount: p.gross,
        discountAmount: p.discount,
        netAmount: p.net,
        isDeferred: p.isDeferred,
        currency,
        postedHeaderId: posted.headerId,
        createdById: principal.userId,
      },
      select: { id: true },
    });
    chargeIds.push(charge.id);

    if (p.isDeferred) {
      const slices = allocate(p.gross, recognitionPeriods.length);
      for (const [i, periodId] of recognitionPeriods.entries()) {
        if (slices[i].isZero()) continue;
        await tx.recognitionEntry.create({
          data: { tenantId, chargeId: charge.id, fiscalPeriodId: periodId, amount: slices[i] },
        });
      }
    }
  }

  await audit(tx, tenantId, {
    actorId: principal.userId,
    action: 'POST',
    resourceType: 'student.charges',
    resourceId: student.id,
    after: {
      voucherRef: posted.voucherRef,
      studentNo: student.studentNo,
      termLabel: input.termLabel ?? null,
      lineCount: prepared.length,
      totalGross: totalGross.toFixed(4),
      totalDiscount: totalDiscount.toFixed(4),
      totalNet: totalNet.toFixed(4),
    },
  });

  return {
    headerId: posted.headerId,
    voucherRef: posted.voucherRef,
    chargeIds,
    totalNet: totalNet.toFixed(4),
    totalGross: totalGross.toFixed(4),
    totalDiscount: totalDiscount.toFixed(4),
  };
}

/**
 * Reverse billed charges — one voucher, however many charges.
 *
 * Harder than it looks, because a charge in the wild has usually been partly
 * paid and partly recognised, and both have to be unwound correctly:
 *
 *   · **The recognised part comes out of revenue**, the rest out of unearned
 *     income. Debiting the whole amount to revenue would understate the
 *     current period by the part that was never recognised in the first place.
 *   · **Money already allocated to it becomes a credit balance.** The cash is
 *     still in the safe; it simply no longer pays for this. It moves from
 *     student AR to student overpayments and is available against the next
 *     charge — it is not silently kept.
 *
 * Several charges reverse into a *single* voucher because a registration is
 * billed by a single voucher (REQ-REG-02) and cancelling it must produce one
 * linked reversing entry, not one per fee item (REQ-REG-03). Pass
 * `reversesHeaderId` to link them; the ledger then stamps the original as
 * reversed and "is this live?" needs no join.
 *
 * The original charges are never edited beyond their reversal stamp. As with
 * a voucher, correction is by reversal.
 */
export async function reverseChargesInTx(
  tx: Tx,
  principal: Principal,
  chargeIds: string[],
  reason: string,
  opts: {
    reversalDate?: Date;
    /** Link the reversal to the voucher that raised these charges. */
    reversesHeaderId?: string | null;
    /** Overrides the default "Reversal of …" narration. */
    description?: string;
  } = {},
): Promise<{ headerId: string; voucherRef: string; freedToCredit: string }> {
  const { tenantId } = principal;

  const trimmed = reason?.trim();
  if (!trimmed) {
    throw new ChargeError('Reversing a charge requires a stated reason.');
  }
  if (chargeIds.length === 0) {
    throw new ChargeError('Nothing to reverse.');
  }

  const charges = await tx.studentCharge.findMany({
    where: { id: { in: chargeIds } },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      studentId: true,
      grossAmount: true,
      discountAmount: true,
      netAmount: true,
      settledAmount: true,
      recognisedAmount: true,
      isDeferred: true,
      reversedAt: true,
      docDate: true,
      feeItem: {
        select: {
          code: true,
          nameEn: true,
          revenueAccountId: true,
          unearnedAccountId: true,
          costCenterId: true,
          revenueAccount: { select: { requiresCostCenter: true } },
        },
      },
      student: { select: { studentNo: true } },
    },
  });

  if (charges.length !== chargeIds.length) {
    throw new ChargeError('Charge not found in this tenant.');
  }
  for (const c of charges) {
    if (c.reversedAt) {
      throw new ChargeError(`The ${c.feeItem.code} charge has already been reversed.`);
    }
  }

  const accounts = await requireAccounts(tx, tenantId, [
    'STUDENT_AR_CONTROL',
    'STUDENT_CREDIT_CONTROL',
    'DEFAULT_DISCOUNT_EXPENSE',
  ] as const);

  const lines: PostingLine[] = [];
  let freedTotal = ZERO;

  for (const charge of charges) {
    // The line that originally credited revenue or unearned income has to be
    // unwound in the proportions that actually apply now, not the proportions
    // that applied when it was billed.
    const recognised = charge.recognisedAmount;
    const stillUnearned = charge.grossAmount.minus(recognised);
    const costCenterId = charge.feeItem.costCenterId ?? null;
    if (charge.feeItem.revenueAccount.requiresCostCenter && !costCenterId) {
      throw new ChargeError(
        `The revenue account for ${charge.feeItem.code} requires a cost centre, and the fee ` +
          `item has no default. Set one before reversing charges against it.`,
      );
    }

    if (!recognised.isZero()) {
      lines.push({
        accountId: charge.feeItem.revenueAccountId,
        debit: recognised,
        costCenterId,
        description: `Reversal — ${charge.feeItem.nameEn} (recognised portion)`,
      });
    }
    if (!stillUnearned.isZero()) {
      lines.push({
        accountId: charge.isDeferred
          ? charge.feeItem.unearnedAccountId ?? charge.feeItem.revenueAccountId
          : charge.feeItem.revenueAccountId,
        debit: stillUnearned,
        costCenterId,
        description: `Reversal — ${charge.feeItem.nameEn}`,
      });
    }
    if (!charge.discountAmount.isZero()) {
      lines.push({
        accountId: accounts.DEFAULT_DISCOUNT_EXPENSE,
        credit: charge.discountAmount,
        costCenterId,
        description: `Reversal — discount on ${charge.feeItem.nameEn}`,
      });
    }
    if (!charge.netAmount.isZero()) {
      lines.push({
        accountId: accounts.STUDENT_AR_CONTROL,
        subledgerType: 'STUDENT',
        subledgerId: charge.studentId,
        credit: charge.netAmount,
        description: `Reversal — ${charge.feeItem.nameEn} — ${charge.student.studentNo}`,
      });
    }

    // Anything already paid against this charge is still the student's money.
    const freed = charge.settledAmount;
    if (!freed.isZero()) {
      lines.push({
        accountId: accounts.STUDENT_AR_CONTROL,
        subledgerType: 'STUDENT',
        subledgerId: charge.studentId,
        debit: freed,
        description: `Payment released from reversed charge — ${charge.student.studentNo}`,
      });
      lines.push({
        accountId: accounts.STUDENT_CREDIT_CONTROL,
        subledgerType: 'STUDENT',
        subledgerId: charge.studentId,
        credit: freed,
        description: `Credit balance from reversed charge — ${charge.student.studentNo}`,
      });
      freedTotal = freedTotal.plus(freed);
    }
  }

  const first = charges[0];
  const label =
    charges.length === 1
      ? `${first.feeItem.nameEn} — ${first.student.studentNo}`
      : `${charges.length} charges — ${first.student.studentNo}`;

  const posted = await post(tx, tenantId, {
    voucherType: 'REVERSAL',
    docDate: opts.reversalDate ?? new Date(),
    description: opts.description?.trim() || `Reversal of ${label}: ${trimmed}`,
    sourceModule: 'REGISTRATION',
    sourceRef: first.studentId,
    postedById: principal.userId,
    reversesId: opts.reversesHeaderId ?? null,
    reversalReason: opts.reversesHeaderId ? trimmed : null,
    lines,
  });

  for (const charge of charges) {
    // Release the allocations. The receipts keep their money; it is simply no
    // longer matched to anything, which is what makes it a credit balance.
    const allocations = await tx.receiptAllocation.findMany({
      where: { chargeId: charge.id },
      select: { id: true, receiptId: true, amount: true },
    });
    for (const a of allocations) {
      await tx.receiptAllocation.delete({ where: { id: a.id } });
      await tx.studentReceipt.update({
        where: { id: a.receiptId },
        data: { allocatedAmount: { decrement: a.amount } },
      });
    }

    // Unposted recognition slices simply stop existing; posted ones have been
    // dealt with above, in the ledger.
    await tx.recognitionEntry.deleteMany({
      where: { chargeId: charge.id, recognisedAt: null },
    });

    await tx.studentCharge.update({
      where: { id: charge.id },
      data: {
        settledAmount: ZERO,
        reversedAt: new Date(),
        reversalHeaderId: posted.headerId,
        reversalReason: trimmed,
      },
    });

    await audit(tx, tenantId, {
      actorId: principal.userId,
      action: 'REVERSE',
      resourceType: 'student.charge',
      resourceId: charge.id,
      before: {
        feeItem: charge.feeItem.code,
        netAmount: charge.netAmount.toFixed(4),
        settledAmount: charge.settledAmount.toFixed(4),
        recognisedAmount: charge.recognisedAmount.toFixed(4),
      },
      after: {
        voucherRef: posted.voucherRef,
        reason: trimmed,
        freedToCredit: charge.settledAmount.toFixed(4),
      },
    });
  }

  return {
    headerId: posted.headerId,
    voucherRef: posted.voucherRef,
    freedToCredit: freedTotal.toFixed(4),
  };
}

/** Reverse one billed charge. */
export async function reverseCharge(
  principal: Principal,
  chargeId: string,
  reason: string,
  opts: { reversalDate?: Date } = {},
): Promise<{ headerId: string; voucherRef: string; freedToCredit: string }> {
  requirePermission(principal, 'charge.reverse');

  return withTenant(principal.tenantId, (tx) =>
    reverseChargesInTx(tx, principal, [chargeId], reason, opts),
  );
}
