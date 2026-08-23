import 'server-only';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { toDateOnly } from '@/lib/ledger/period';
import { allocate, allocateByWeights, sum, toStorage, type MoneyInput } from '@/lib/money';

/**
 * Instalment plans (SRS REQ-CSH-02).
 *
 * The legacy equivalent was a checkbox. `ChkBoPrem` on the registration screen
 * wrote a `Remain` balance and a `PaymentStatus` flag onto the registration
 * row — no dates, no instalment records, and therefore no way to answer "who
 * is overdue and by how much", which is the only question a plan exists to
 * answer.
 *
 * A plan schedules *when* a student pays, not *what* they owe: the charges
 * already exist and already sit in the ledger. Nothing here posts. That
 * separation is why a plan can be renegotiated without touching the accounts.
 */

export class InstalmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InstalmentError';
  }
}

export interface CreatePlanInput {
  studentId: string;
  termLabel?: string | null;
  totalAmount: MoneyInput;
  /**
   * Either explicit instalments, or a count plus dates. Explicit wins; the
   * shorthand exists because "50% now, 25% mid-term, 25% before finals" is how
   * these are actually agreed.
   */
  instalments?: Array<{ dueDate: Date; amount: MoneyInput }>;
  /** Shorthand: equal instalments on these dates, residue on the first. */
  dueDates?: Date[];
  /** Shorthand: proportions across `dueDates`, e.g. [50, 25, 25]. */
  weights?: MoneyInput[];
}

export async function createInstalmentPlan(
  principal: Principal,
  input: CreatePlanInput,
): Promise<{ planId: string; instalments: Array<{ seq: number; dueDate: Date; amount: string }> }> {
  requirePermission(principal, 'charge.create');

  const total = toStorage(input.totalAmount);
  if (total.lessThanOrEqualTo(0)) {
    throw new InstalmentError('An instalment plan needs a positive total.');
  }

  const schedule = buildSchedule(input, total);
  if (schedule.length === 0) {
    throw new InstalmentError('An instalment plan needs at least one instalment.');
  }

  // The parts must add back to the total exactly. `allocate` guarantees it for
  // the shorthand forms; an explicitly supplied schedule is the caller's
  // arithmetic and is checked rather than trusted.
  const scheduled = sum(schedule.map((s) => s.amount));
  if (!scheduled.equals(total)) {
    throw new InstalmentError(
      `The instalments total ${scheduled.toFixed(2)} but the plan is for ${total.toFixed(2)}. ` +
        `A schedule that does not add up leaves a balance nobody has agreed to pay.`,
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: { id: true, studentNo: true },
    });
    if (!student) throw new InstalmentError('Student not found in this tenant.');

    // One live plan per student per term; a second would make "what is due"
    // ambiguous. Renegotiation supersedes rather than adds.
    await tx.instalmentPlan.updateMany({
      where: {
        tenantId: principal.tenantId,
        studentId: student.id,
        termLabel: input.termLabel ?? null,
        isActive: true,
      },
      data: { isActive: false },
    });

    const plan = await tx.instalmentPlan.create({
      data: {
        tenantId: principal.tenantId,
        studentId: student.id,
        termLabel: input.termLabel ?? null,
        totalAmount: total,
        createdById: principal.userId,
        instalments: {
          create: schedule.map((s, i) => ({
            seq: i + 1,
            dueDate: s.dueDate,
            amount: s.amount,
          })),
        },
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'instalment_plan',
      resourceId: plan.id,
      after: {
        studentNo: student.studentNo,
        termLabel: input.termLabel ?? null,
        total: total.toFixed(4),
        instalments: schedule.length,
      },
    });

    return {
      planId: plan.id,
      instalments: schedule.map((s, i) => ({
        seq: i + 1,
        dueDate: s.dueDate,
        amount: s.amount.toFixed(4),
      })),
    };
  });
}

function buildSchedule(input: CreatePlanInput, total: ReturnType<typeof toStorage>) {
  if (input.instalments && input.instalments.length > 0) {
    return input.instalments
      .map((i) => ({ dueDate: toDateOnly(i.dueDate), amount: toStorage(i.amount) }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }

  const dates = (input.dueDates ?? []).map(toDateOnly).sort((a, b) => a.getTime() - b.getTime());
  if (dates.length === 0) return [];

  const amounts =
    input.weights && input.weights.length > 0
      ? allocateByWeights(total, input.weights)
      : allocate(total, dates.length);

  if (amounts.length !== dates.length) {
    throw new InstalmentError(
      `${input.weights?.length} proportions were given for ${dates.length} due dates.`,
    );
  }

  return dates.map((dueDate, i) => ({ dueDate, amount: amounts[i] }));
}

export interface OverdueInstalment {
  studentId: string;
  studentNo: string;
  fullNameEn: string;
  termLabel: string | null;
  seq: number;
  dueDate: Date;
  amount: string;
  daysOverdue: number;
}

/**
 * Instalments past their due date on a student who still owes money.
 *
 * Deliberately cross-checked against the account balance rather than reported
 * from the schedule alone: a student who paid the whole term up front is not
 * overdue merely because a scheduled date has passed, and dunning them is how
 * a finance office loses the right to be believed.
 */
export async function overdueInstalments(
  principal: Principal,
  asOfDate: Date = new Date(),
): Promise<OverdueInstalment[]> {
  requirePermission(principal, 'report.student');

  const asOf = toDateOnly(asOfDate);

  return withTenant(principal.tenantId, async (tx) => {
    const plans = await tx.instalmentPlan.findMany({
      where: { tenantId: principal.tenantId, isActive: true },
      select: {
        studentId: true,
        termLabel: true,
        student: { select: { studentNo: true, fullNameEn: true } },
        instalments: {
          where: { dueDate: { lt: asOf } },
          orderBy: { seq: 'asc' },
          select: { seq: true, dueDate: true, amount: true },
        },
      },
    });

    const studentIds = [...new Set(plans.map((p) => p.studentId))];
    if (studentIds.length === 0) return [];

    const charges = await tx.studentCharge.findMany({
      where: { tenantId: principal.tenantId, studentId: { in: studentIds }, reversedAt: null },
      select: { studentId: true, netAmount: true, settledAmount: true },
    });

    const owed = new Map<string, ReturnType<typeof toStorage>>();
    for (const c of charges) {
      const cur = owed.get(c.studentId);
      const delta = c.netAmount.minus(c.settledAmount);
      owed.set(c.studentId, cur ? cur.plus(delta) : delta);
    }

    const out: OverdueInstalment[] = [];
    for (const plan of plans) {
      const balance = owed.get(plan.studentId);
      if (!balance || balance.lessThanOrEqualTo(0)) continue;

      // Payments settle charges, not instalments, so "overdue" is the smaller
      // of two figures: what the schedule said should have arrived by now, and
      // what the student still actually owes. A student who paid the whole
      // term up front is not overdue merely because a date has passed.
      const dueByNow = sum(plan.instalments.map((i) => i.amount));
      let unmet = dueByNow.greaterThan(balance) ? balance : dueByNow;

      for (const inst of plan.instalments) {
        if (unmet.lessThanOrEqualTo(0)) break;
        const amount = unmet.greaterThan(inst.amount) ? inst.amount : unmet;
        out.push({
          studentId: plan.studentId,
          studentNo: plan.student.studentNo,
          fullNameEn: plan.student.fullNameEn,
          termLabel: plan.termLabel,
          seq: inst.seq,
          dueDate: inst.dueDate,
          amount: amount.toFixed(4),
          daysOverdue: Math.floor((asOf.getTime() - inst.dueDate.getTime()) / 86_400_000),
        });
        unmet = unmet.minus(amount);
      }
    }

    return out.sort((a, b) => b.daysOverdue - a.daysOverdue);
  });
}
