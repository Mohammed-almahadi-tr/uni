import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { requireAccounts } from '@/lib/coa/mapping';
import { toDateOnly } from '@/lib/ledger/period';
import { sum, toStorage, ZERO, type Money } from '@/lib/money';

/**
 * The student account: what is owed, what was paid, and whether the two halves
 * of the system still agree (SRS REQ-RPT-01, REQ-CSH-01).
 *
 * The legacy system kept a student's balance in a `Remain` column on the
 * registration row, written by whichever screen last touched it, with no
 * control account anywhere in the chart. Two consequences: a student's balance
 * and the general ledger could disagree indefinitely, and nothing was capable
 * of noticing. `reconcileStudentSubledger` below is the check that was
 * impossible to write against that design and is trivial against this one.
 */

export interface StudentBalance {
  studentId: string;
  studentNo: string;
  /** Net billed: gross less discounts, excluding reversed charges. */
  charged: string;
  /** Matched against charges. */
  settled: string;
  /** Still owed. Never negative — overpayment is a credit, not a negative debt. */
  outstanding: string;
  /** Money held that is not matched to anything: an overpayment. */
  creditBalance: string;
  /** What the student would pay to clear the account today. */
  netDue: string;
}

export async function studentBalance(
  principal: Principal,
  studentId: string,
): Promise<StudentBalance> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, (tx) => balanceInTx(tx, principal.tenantId, studentId));
}

async function balanceInTx(
  tx: Tx,
  tenantId: string,
  studentId: string,
): Promise<StudentBalance> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { id: true, studentNo: true },
  });
  if (!student) throw new Error('Student not found in this tenant.');

  const charges = await tx.studentCharge.findMany({
    where: { tenantId, studentId, reversedAt: null },
    select: { netAmount: true, settledAmount: true },
  });
  const receipts = await tx.studentReceipt.findMany({
    // Cancelled receipts never counted; dishonoured ones stopped counting the
    // moment the bank refused the cheque behind them.
    where: { tenantId, studentId, cancelledAt: null, dishonouredAt: null },
    select: { amount: true, allocatedAmount: true },
  });

  const charged = sum(charges.map((c) => c.netAmount));
  const settled = sum(charges.map((c) => c.settledAmount));
  const outstanding = charged.minus(settled);
  const creditBalance = sum(receipts.map((r) => r.amount.minus(r.allocatedAmount)));

  return {
    studentId: student.id,
    studentNo: student.studentNo,
    charged: charged.toFixed(4),
    settled: settled.toFixed(4),
    outstanding: outstanding.toFixed(4),
    creditBalance: creditBalance.toFixed(4),
    netDue: outstanding.minus(creditBalance).toFixed(4),
  };
}

export interface StatementLine {
  date: Date;
  kind: 'CHARGE' | 'RECEIPT' | 'REVERSAL' | 'CANCELLATION' | 'DISHONOUR';
  reference: string;
  description: string;
  /** Increases what the student owes. */
  debit: string;
  /** Decreases it. */
  credit: string;
  runningBalance: string;
}

export interface Statement {
  studentId: string;
  studentNo: string;
  fullNameAr: string;
  fullNameEn: string;
  from: Date | null;
  to: Date | null;
  openingBalance: string;
  lines: StatementLine[];
  closingBalance: string;
}

/**
 * A date-ranged statement of account with a running balance.
 *
 * The document a student is handed when they dispute what they owe, so the
 * opening balance has to be a real figure carried in from before the range —
 * not zero, and not "everything since the beginning" quietly relabelled.
 */
export async function statementOfAccount(
  principal: Principal,
  studentId: string,
  range: { from?: Date; to?: Date } = {},
): Promise<Statement> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const { tenantId } = principal;

    const student = await tx.student.findUnique({
      where: { id: studentId },
      select: { id: true, studentNo: true, fullNameAr: true, fullNameEn: true },
    });
    if (!student) throw new Error('Student not found in this tenant.');

    const from = range.from ? toDateOnly(range.from) : null;
    const to = range.to ? toDateOnly(range.to) : null;

    // Voucher references are looked up in one pass rather than as nested
    // relations. Three sibling relations on one query makes Prisma's
    // interpreter fan the loads out concurrently onto the transaction's single
    // connection — which `pg` currently queues, with a deprecation warning,
    // and will refuse outright at pg 9. Two extra round trips, fixed in number
    // whatever the length of the history, are the better trade.
    const charges = await tx.studentCharge.findMany({
      where: { tenantId, studentId },
      orderBy: [{ docDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        docDate: true,
        netAmount: true,
        reversedAt: true,
        termLabel: true,
        postedHeaderId: true,
        reversalHeaderId: true,
        feeItem: { select: { nameEn: true, nameAr: true, code: true } },
      },
    });

    const receipts = await tx.studentReceipt.findMany({
      where: { tenantId, studentId },
      orderBy: [{ docDate: 'asc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        receiptNo: true,
        docDate: true,
        amount: true,
        channel: true,
        cancelledAt: true,
        cancellationHeaderId: true,
        dishonouredAt: true,
        dishonourHeaderId: true,
      },
    });

    const headerIds = [
      ...new Set(
        [
          ...charges.map((c) => c.postedHeaderId),
          ...charges.map((c) => c.reversalHeaderId),
          ...receipts.map((r) => r.cancellationHeaderId),
          ...receipts.map((r) => r.dishonourHeaderId),
        ].filter((id): id is string => id !== null),
      ),
    ];
    const headers = await tx.transactionHeader.findMany({
      where: { id: { in: headerIds } },
      select: { id: true, voucherRef: true, docDate: true },
    });
    const headerById = new Map(headers.map((h) => [h.id, h]));

    type Event = { date: Date; order: number; line: Omit<StatementLine, 'runningBalance'> };
    const events: Event[] = [];

    for (const c of charges) {
      events.push({
        date: c.docDate,
        order: 0,
        line: {
          date: c.docDate,
          kind: 'CHARGE',
          reference: headerById.get(c.postedHeaderId)?.voucherRef ?? '',
          description: `${c.feeItem.nameEn}${c.termLabel ? ` — ${c.termLabel}` : ''}`,
          debit: c.netAmount.toFixed(4),
          credit: '0.0000',
        },
      });

      const reversal = c.reversalHeaderId ? headerById.get(c.reversalHeaderId) : undefined;
      if (c.reversedAt && reversal) {
        events.push({
          date: reversal.docDate,
          order: 2,
          line: {
            date: reversal.docDate,
            kind: 'REVERSAL',
            reference: reversal.voucherRef,
            description: `Reversal of ${c.feeItem.nameEn}`,
            debit: '0.0000',
            credit: c.netAmount.toFixed(4),
          },
        });
      }
    }

    for (const r of receipts) {
      events.push({
        date: r.docDate,
        order: 1,
        line: {
          date: r.docDate,
          kind: 'RECEIPT',
          reference: r.receiptNo,
          description: `Payment received (${r.channel.toLowerCase().replace('_', ' ')})`,
          debit: '0.0000',
          credit: r.amount.toFixed(4),
        },
      });
      const dishonour = r.dishonourHeaderId ? headerById.get(r.dishonourHeaderId) : undefined;
      if (r.dishonouredAt && dishonour) {
        events.push({
          date: dishonour.docDate,
          order: 3,
          line: {
            date: dishonour.docDate,
            kind: 'DISHONOUR',
            reference: dishonour.voucherRef,
            description: `Cheque behind receipt ${r.receiptNo} returned unpaid`,
            debit: r.amount.toFixed(4),
            credit: '0.0000',
          },
        });
      }

      const cancellation = r.cancellationHeaderId
        ? headerById.get(r.cancellationHeaderId)
        : undefined;
      if (r.cancelledAt && cancellation) {
        events.push({
          date: cancellation.docDate,
          order: 3,
          line: {
            date: cancellation.docDate,
            kind: 'CANCELLATION',
            reference: cancellation.voucherRef,
            description: `Receipt ${r.receiptNo} cancelled`,
            debit: r.amount.toFixed(4),
            credit: '0.0000',
          },
        });
      }
    }

    events.sort(
      (a, b) => a.date.getTime() - b.date.getTime() || a.order - b.order,
    );

    let running = ZERO;
    let opening = ZERO;
    const lines: StatementLine[] = [];

    for (const e of events) {
      const delta = toStorage(e.line.debit).minus(toStorage(e.line.credit));
      if (from && e.date < from) {
        // Before the window: folded into the opening figure rather than shown.
        opening = opening.plus(delta);
        running = opening;
        continue;
      }
      if (to && e.date > to) continue;

      running = running.plus(delta);
      lines.push({ ...e.line, runningBalance: running.toFixed(4) });
    }

    return {
      studentId: student.id,
      studentNo: student.studentNo,
      fullNameAr: student.fullNameAr,
      fullNameEn: student.fullNameEn,
      from,
      to,
      openingBalance: opening.toFixed(4),
      lines,
      closingBalance: running.toFixed(4),
    };
  });
}

export interface AgingBucket {
  label: string;
  /** Inclusive lower bound in days overdue. */
  fromDays: number;
  /** Exclusive upper bound, or null for the open-ended final bucket. */
  toDays: number | null;
  amount: string;
}

export interface AgedReceivables {
  asOf: Date;
  total: string;
  buckets: AgingBucket[];
  students: Array<{
    studentId: string;
    studentNo: string;
    fullNameEn: string;
    total: string;
    byBucket: string[];
  }>;
}

/**
 * Outstanding student receivables, bucketed by how overdue they are.
 *
 * Ages from the due date, falling back to the document date — a charge with no
 * stated due date is payable on demand, so it starts ageing the day it is
 * raised rather than never.
 */
export async function agedReceivables(
  principal: Principal,
  asOfDate: Date = new Date(),
  bucketEdges: number[] = [0, 30, 60, 90],
): Promise<AgedReceivables> {
  requirePermission(principal, 'report.financial');

  const asOf = toDateOnly(asOfDate);
  const buckets: AgingBucket[] = bucketEdges.map((edge, i) => {
    const next = bucketEdges[i + 1];
    return {
      label:
        i === 0
          ? 'Current'
          : next === undefined
            ? `${edge}+ days`
            : `${edge}–${next - 1} days`,
      fromDays: edge,
      toDays: next ?? null,
      amount: '0.0000',
    };
  });

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.studentCharge.findMany({
      where: { tenantId: principal.tenantId, reversedAt: null },
      select: {
        studentId: true,
        docDate: true,
        dueDate: true,
        netAmount: true,
        settledAmount: true,
        student: { select: { studentNo: true, fullNameEn: true } },
      },
    });

    const totals = buckets.map(() => ZERO);
    const perStudent = new Map<
      string,
      { studentNo: string; fullNameEn: string; total: Money; byBucket: Money[] }
    >();

    for (const r of rows) {
      const outstanding = r.netAmount.minus(r.settledAmount);
      if (outstanding.lessThanOrEqualTo(0)) continue;

      const due = r.dueDate ?? r.docDate;
      const daysOverdue = Math.floor((asOf.getTime() - due.getTime()) / 86_400_000);

      let idx = 0;
      for (let i = buckets.length - 1; i >= 0; i -= 1) {
        if (daysOverdue >= buckets[i].fromDays) {
          idx = i;
          break;
        }
      }

      totals[idx] = totals[idx].plus(outstanding);

      const entry = perStudent.get(r.studentId) ?? {
        studentNo: r.student.studentNo,
        fullNameEn: r.student.fullNameEn,
        total: ZERO,
        byBucket: buckets.map(() => ZERO),
      };
      entry.total = entry.total.plus(outstanding);
      entry.byBucket[idx] = entry.byBucket[idx].plus(outstanding);
      perStudent.set(r.studentId, entry);
    }

    return {
      asOf,
      total: sum(totals).toFixed(4),
      buckets: buckets.map((b, i) => ({ ...b, amount: totals[i].toFixed(4) })),
      students: [...perStudent.entries()]
        .map(([studentId, e]) => ({
          studentId,
          studentNo: e.studentNo,
          fullNameEn: e.fullNameEn,
          total: e.total.toFixed(4),
          byBucket: e.byBucket.map((m) => m.toFixed(4)),
        }))
        .sort((a, b) => Number(b.total) - Number(a.total)),
    };
  });
}

export interface SubledgerReconciliation {
  ok: boolean;
  /** Sum of outstanding charges across every student. */
  subledgerReceivable: string;
  /** Balance of the Student AR control account in the general ledger. */
  controlReceivable: string;
  receivableVariance: string;
  /** Sum of unmatched receipt money across every student. */
  subledgerCredit: string;
  /** Balance of the Student Overpayments control account. */
  controlCredit: string;
  creditVariance: string;
}

/**
 * The check the legacy design made impossible.
 *
 * The sub-ledger says what every student owes. The control account says what
 * the ledger thinks students owe in total. If those two numbers differ, one of
 * them is wrong, and until they are compared nobody knows which.
 *
 * Reads the maintained period aggregates rather than scanning the ledger, so
 * this stays cheap enough to run nightly on a real dataset — REQ-NFR-02
 * forbids ad-hoc `SUM()` over `transaction_lines` in report paths for exactly
 * this reason.
 */
export async function reconcileStudentSubledger(
  tx: Tx,
  tenantId: string,
): Promise<SubledgerReconciliation> {
  const accounts = await requireAccounts(tx, tenantId, [
    'STUDENT_AR_CONTROL',
    'STUDENT_CREDIT_CONTROL',
  ] as const);

  const charges = await tx.studentCharge.findMany({
    where: { tenantId, reversedAt: null },
    select: { netAmount: true, settledAmount: true },
  });
  const receipts = await tx.studentReceipt.findMany({
    where: { tenantId, cancelledAt: null, dishonouredAt: null },
    select: { amount: true, allocatedAmount: true },
  });

  const subledgerReceivable = sum(charges.map((c) => c.netAmount.minus(c.settledAmount)));
  const subledgerCredit = sum(receipts.map((r) => r.amount.minus(r.allocatedAmount)));

  const controlReceivable = await accountBalance(
    tx,
    tenantId,
    accounts.STUDENT_AR_CONTROL,
    'DEBIT',
  );
  const controlCredit = await accountBalance(
    tx,
    tenantId,
    accounts.STUDENT_CREDIT_CONTROL,
    'CREDIT',
  );

  const receivableVariance = subledgerReceivable.minus(controlReceivable);
  const creditVariance = subledgerCredit.minus(controlCredit);

  return {
    ok: receivableVariance.isZero() && creditVariance.isZero(),
    subledgerReceivable: subledgerReceivable.toFixed(4),
    controlReceivable: controlReceivable.toFixed(4),
    receivableVariance: receivableVariance.toFixed(4),
    subledgerCredit: subledgerCredit.toFixed(4),
    controlCredit: controlCredit.toFixed(4),
    creditVariance: creditVariance.toFixed(4),
  };
}

async function accountBalance(
  tx: Tx,
  tenantId: string,
  accountId: string,
  normal: 'DEBIT' | 'CREDIT',
): Promise<Money> {
  const agg = await tx.accountPeriodBalance.aggregate({
    where: { tenantId, accountId },
    _sum: {
      openingDebit: true,
      openingCredit: true,
      movementDebit: true,
      movementCredit: true,
    },
  });

  const debit = (agg._sum.openingDebit ?? ZERO).plus(agg._sum.movementDebit ?? ZERO);
  const credit = (agg._sum.openingCredit ?? ZERO).plus(agg._sum.movementCredit ?? ZERO);
  return normal === 'DEBIT' ? debit.minus(credit) : credit.minus(debit);
}
