import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { toDateOnly } from '@/lib/ledger/period';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import type { HoldType } from '@/generated/prisma/enums';

/**
 * Registration holds (SRS REQ-REG-06, Track B5).
 *
 * ## Arrears were a report, not a control
 *
 * The legacy build knows exactly what every student owes. `StudentsUnpaidList`,
 * `ProgramsUnpaidFeesDetails`, `ProgramsUnpaidFeesTotal` and
 * `frmUncollectedFees` all render it. **Nothing consults any of them when a
 * student registers.** `frmStudentRegisteration` reads the student's name,
 * programme and fees and posts; the balance is never looked at.
 *
 * That is the same shape B2 found in the seat quota — a number computed after
 * the fact for a decision it was supposed to inform — and it is why an
 * institution discovers in the fourth term that a student has been registering
 * for three years without paying.
 *
 * ## Two kinds of hold, deliberately
 *
 * A **placed** hold is a row: someone decided, gave a reason, and named who
 * may lift it. Academic, disciplinary and documentary holds are all of this
 * kind, and so is a financial hold an officer decides to impose by hand.
 *
 * A **derived** financial hold is computed from the account, not stored: an
 * overdue instalment past the tenant's grace period, or arrears above the
 * tenant's threshold. It is derived rather than materialised because a stored
 * one is wrong the moment the student pays — and a student turned away from
 * the registration desk over a debt they settled that morning is how a control
 * loses the room's confidence and gets switched off.
 *
 * ## Who may clear it
 *
 * A hold names its **clearance role**, not merely who placed it. A
 * disciplinary hold placed by a dean is not something a cashier lifts because
 * they happen to hold `hold.manage`. The database adds the other half: nobody
 * clears a hold they placed themselves.
 */

export class HoldError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HoldError';
  }
}

/** Raised when a hold blocks something. Carries every reason, not the first. */
export class RegistrationBlockedError extends Error {
  constructor(
    readonly studentNo: string,
    readonly blocks: BlockingHold[],
  ) {
    super(
      `${studentNo} cannot register: ` +
        blocks.map((b) => `${b.holdType.toLowerCase()} — ${b.reason}`).join('; ') +
        '.',
    );
    this.name = 'RegistrationBlockedError';
  }
}

export interface BlockingHold {
  /** Null for the derived financial hold — it is computed, not stored. */
  id: string | null;
  holdType: HoldType;
  reason: string;
  placedOn: string | null;
  /** The role that may lift it, if one was named. */
  clearanceRoleName: string | null;
}

export interface PlaceHoldInput {
  studentId: string;
  holdType: HoldType;
  reason: string;
  /** Defaults to today. */
  effectiveFrom?: Date;
  /** Some holds warn rather than stop. Defaults to blocking. */
  blocksRegistration?: boolean;
  /** Only a user in this role may clear it. Omit to allow any `hold.manage`. */
  clearanceRoleId?: string | null;
}

export async function placeHold(
  principal: Principal,
  input: PlaceHoldInput,
): Promise<{ id: string }> {
  requirePermission(principal, 'hold.manage');

  const reason = input.reason?.trim();
  if (!reason) {
    throw new HoldError(
      'A hold needs a stated reason. A student turned away from the registration desk ' +
        'has to be told what to go and fix.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: { id: true, tenantId: true, studentNo: true },
    });
    if (!student || student.tenantId !== principal.tenantId) {
      throw new HoldError('That student does not belong to this university.');
    }

    if (input.clearanceRoleId) {
      const role = await tx.role.findFirst({
        where: { id: input.clearanceRoleId, tenantId: principal.tenantId },
        select: { id: true },
      });
      if (!role) {
        throw new HoldError('That clearance role does not belong to this university.');
      }
    }

    const hold = await tx.hold.create({
      data: {
        tenantId: principal.tenantId,
        studentId: student.id,
        holdType: input.holdType,
        reason,
        blocksRegistration: input.blocksRegistration ?? true,
        effectiveFrom: toDateOnly(input.effectiveFrom ?? new Date()),
        placedById: principal.userId,
        clearanceRoleId: input.clearanceRoleId ?? null,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'hold',
      resourceId: hold.id,
      after: {
        studentNo: student.studentNo,
        holdType: input.holdType,
        reason,
        blocksRegistration: input.blocksRegistration ?? true,
        clearanceRoleId: input.clearanceRoleId ?? null,
      },
    });

    return hold;
  });
}

/**
 * Lift a hold.
 *
 * Two checks the legacy build has no equivalent of, because it has no holds:
 * the clearance role, if the hold named one, and the second signature. The
 * database enforces the second independently — `chk_hold_second_signature`.
 */
export async function clearHold(
  principal: Principal,
  holdId: string,
  note: string,
): Promise<void> {
  requirePermission(principal, 'hold.manage');

  const trimmed = note?.trim();
  if (!trimmed) {
    throw new HoldError(
      'Clearing a hold requires a note saying what satisfied it. Without one there is no ' +
        'evidence the block was ever met, only that somebody switched it off.',
    );
  }

  await withTenant(principal.tenantId, async (tx) => {
    const hold = await tx.hold.findUnique({
      where: { id: holdId },
      select: {
        id: true,
        tenantId: true,
        holdType: true,
        reason: true,
        clearedAt: true,
        placedById: true,
        clearanceRoleId: true,
        clearanceRole: { select: { name: true } },
        student: { select: { studentNo: true } },
      },
    });
    if (!hold || hold.tenantId !== principal.tenantId) {
      throw new HoldError('That hold does not belong to this university.');
    }
    if (hold.clearedAt) {
      throw new HoldError('That hold has already been cleared.');
    }
    if (hold.placedById === principal.userId) {
      throw new HoldError(
        'You placed this hold. Somebody else has to be satisfied that it is met — ' +
          'one person placing and lifting a block is a note to self, not a control.',
      );
    }

    if (hold.clearanceRoleId) {
      const holdsRole = await tx.userRole.findFirst({
        where: { userId: principal.userId, roleId: hold.clearanceRoleId },
        select: { userId: true },
      });
      if (!holdsRole) {
        throw new HoldError(
          `This ${hold.holdType.toLowerCase()} hold may only be cleared by ` +
            `${hold.clearanceRole?.name ?? 'its named clearance role'}. ` +
            `Holding \`hold.manage\` is not the same as holding the authority the hold names.`,
        );
      }
    }

    await tx.hold.update({
      where: { id: holdId },
      data: {
        clearedById: principal.userId,
        clearedAt: new Date(),
        clearanceNote: trimmed,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'hold',
      resourceId: holdId,
      before: { cleared: false, holdType: hold.holdType, reason: hold.reason },
      after: { cleared: true, studentNo: hold.student.studentNo, note: trimmed },
    });
  });
}

export interface HoldRecord {
  id: string;
  holdType: HoldType;
  reason: string;
  blocksRegistration: boolean;
  effectiveFrom: string;
  placedAt: string;
  placedBy: string;
  clearanceRoleName: string | null;
  clearedAt: string | null;
  clearedBy: string | null;
  clearanceNote: string | null;
}

export async function listHolds(
  principal: Principal,
  studentId: string,
  opts: { includeCleared?: boolean } = {},
): Promise<HoldRecord[]> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.hold.findMany({
      where: {
        tenantId: principal.tenantId,
        studentId,
        ...(opts.includeCleared ? {} : { clearedAt: null }),
      },
      orderBy: [{ placedAt: 'desc' }],
      select: {
        id: true,
        holdType: true,
        reason: true,
        blocksRegistration: true,
        effectiveFrom: true,
        placedAt: true,
        clearedAt: true,
        clearanceNote: true,
        placedBy: { select: { fullName: true } },
        clearedBy: { select: { fullName: true } },
        clearanceRole: { select: { name: true } },
      },
    });

    return rows.map((h) => ({
      id: h.id,
      holdType: h.holdType,
      reason: h.reason,
      blocksRegistration: h.blocksRegistration,
      effectiveFrom: iso(h.effectiveFrom),
      placedAt: h.placedAt.toISOString(),
      placedBy: h.placedBy.fullName,
      clearanceRoleName: h.clearanceRole?.name ?? null,
      clearedAt: h.clearedAt?.toISOString() ?? null,
      clearedBy: h.clearedBy?.fullName ?? null,
      clearanceNote: h.clearanceNote,
    }));
  });
}

// ---------------------------------------------------------------------------
// The derived financial hold
// ---------------------------------------------------------------------------

export interface ArrearsPosition {
  /** Billed less settled, across live charges. Never negative. */
  outstanding: string;
  /** Unmatched money on the account. */
  creditBalance: string;
  /** Outstanding less credit — what the student would pay to clear today. */
  netDue: string;
  /** Of the net due, how much was scheduled to have arrived by `asOf`. */
  overdue: string;
  /** Days past the oldest unmet instalment, or 0. */
  daysOverdue: number;
}

/**
 * What the account says, as at a date.
 *
 * The overdue figure is the smaller of two numbers — what the instalment
 * schedule said should have arrived by now, and what the student still
 * actually owes — for the same reason `overdueInstalments` computes it that
 * way: payments settle charges, not instalments, and a student who paid the
 * whole term up front is not overdue because a date has passed.
 */
export async function arrearsInTx(
  tx: Tx,
  tenantId: string,
  studentId: string,
  asOfDate: Date,
): Promise<ArrearsPosition> {
  const asOf = toDateOnly(asOfDate);

  const charges = await tx.studentCharge.findMany({
    where: { tenantId, studentId, reversedAt: null },
    select: { netAmount: true, sponsoredAmount: true, settledAmount: true },
  });
  const receipts = await tx.studentReceipt.findMany({
    where: { tenantId, studentId, cancelledAt: null, dishonouredAt: null },
    select: { amount: true, allocatedAmount: true },
  });

  // A student is not in arrears for money their sponsor owes. Blocking a
  // sponsored student's registration because a ministry pays late is how a
  // control gets switched off.
  const outstanding = sum(charges.map((c) => c.netAmount.minus(c.sponsoredAmount))).minus(
    sum(charges.map((c) => c.settledAmount)),
  );
  const creditBalance = sum(receipts.map((r) => r.amount.minus(r.allocatedAmount)));
  const netDueRaw = outstanding.minus(creditBalance);
  const netDue = netDueRaw.isNegative() ? ZERO : netDueRaw;

  const plans = await tx.instalmentPlan.findMany({
    where: { tenantId, studentId, isActive: true },
    select: {
      instalments: {
        where: { dueDate: { lt: asOf } },
        orderBy: { dueDate: 'asc' },
        select: { dueDate: true, amount: true },
      },
    },
  });

  const due = plans.flatMap((p) => p.instalments);
  const scheduled = sum(due.map((d) => d.amount));
  const overdue: Money = scheduled.greaterThan(netDue) ? netDue : scheduled;

  let daysOverdue = 0;
  if (overdue.greaterThan(0) && due.length > 0) {
    const oldest = due[0].dueDate;
    daysOverdue = Math.max(
      0,
      Math.floor((asOf.getTime() - toDateOnly(oldest).getTime()) / 86_400_000),
    );
  }

  return {
    outstanding: outstanding.isNegative() ? '0.0000' : outstanding.toFixed(4),
    creditBalance: creditBalance.toFixed(4),
    netDue: netDue.toFixed(4),
    overdue: overdue.toFixed(4),
    daysOverdue,
  };
}

/**
 * Every reason this student may not register, as at a date.
 *
 * Returns them all rather than the first, so a registrar can tell the student
 * everything they have to fix in one conversation instead of three.
 */
export interface ArrearsPolicy {
  arrearsGraceDays: number;
  arrearsBlockThreshold: MoneyInput;
}

export async function blockingHoldsInTx(
  tx: Tx,
  tenantId: string,
  studentId: string,
  asOfDate: Date,
  /**
   * The tenant's arrears thresholds, when the caller has already read them.
   *
   * The student portal (C3) has: its confined transaction is refused the
   * `tenants` row, which carries the institution's own policy figures, so it
   * loads them under `withTenant` and passes them in. Every other caller
   * omits this and the row is read here as before.
   */
  policy?: ArrearsPolicy,
): Promise<BlockingHold[]> {
  const asOf = toDateOnly(asOfDate);

  const placed = await tx.hold.findMany({
    where: {
      tenantId,
      studentId,
      clearedAt: null,
      blocksRegistration: true,
      effectiveFrom: { lte: asOf },
    },
    orderBy: { placedAt: 'asc' },
    select: {
      id: true,
      holdType: true,
      reason: true,
      effectiveFrom: true,
      clearanceRole: { select: { name: true } },
    },
  });

  const blocks: BlockingHold[] = placed.map((h) => ({
    id: h.id,
    holdType: h.holdType,
    reason: h.reason,
    placedOn: iso(h.effectiveFrom),
    clearanceRoleName: h.clearanceRole?.name ?? null,
  }));

  const tenant =
    policy ??
    (await tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { arrearsGraceDays: true, arrearsBlockThreshold: true },
    }));

  const arrears = await arrearsInTx(tx, tenantId, studentId, asOf);
  const overdue = toStorage(arrears.overdue);
  const threshold = toStorage(tenant.arrearsBlockThreshold);

  if (
    overdue.greaterThan(0) &&
    arrears.daysOverdue > tenant.arrearsGraceDays &&
    overdue.greaterThanOrEqualTo(threshold)
  ) {
    blocks.push({
      id: null,
      holdType: 'FINANCIAL',
      reason:
        `${overdue.toFixed(2)} is overdue by ${arrears.daysOverdue} days, past the ` +
        `${tenant.arrearsGraceDays}-day grace period. Settle it, agree a revised ` +
        `instalment plan, or have the arrears hold waived`,
      placedOn: null,
      clearanceRoleName: null,
    });
  }

  return blocks;
}

/**
 * Refuse a registration that a hold blocks.
 *
 * This is the seam B4 left open. It is called from the registration quote, so
 * a preview shows the block as plainly as a save does — a registrar should
 * find out before they have typed the discount, not after.
 */
export async function assertRegistrationAllowed(
  tx: Tx,
  tenantId: string,
  studentId: string,
  studentNo: string,
  asOfDate: Date,
): Promise<void> {
  const blocks = await blockingHoldsInTx(tx, tenantId, studentId, asOfDate);
  if (blocks.length > 0) {
    throw new RegistrationBlockedError(studentNo, blocks);
  }
}

/** Read-only: what stands in this student's way today. */
export async function registrationBlocks(
  principal: Principal,
  studentId: string,
  asOfDate: Date = new Date(),
): Promise<BlockingHold[]> {
  requirePermission(principal, 'student.read');
  return withTenant(principal.tenantId, (tx) =>
    blockingHoldsInTx(tx, principal.tenantId, studentId, asOfDate),
  );
}

/** Read-only: the arrears position behind the derived financial hold. */
export async function arrears(
  principal: Principal,
  studentId: string,
  asOfDate: Date = new Date(),
): Promise<ArrearsPosition> {
  requirePermission(principal, 'student.read');
  return withTenant(principal.tenantId, (tx) =>
    arrearsInTx(tx, principal.tenantId, studentId, asOfDate),
  );
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
