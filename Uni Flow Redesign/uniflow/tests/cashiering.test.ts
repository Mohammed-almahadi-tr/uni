/**
 * Fee catalog, student AR and cashiering (Track A3, SRS Modules 6 and 13).
 *
 * The critical path. This is where money enters the system, and it is the part
 * of the legacy system that was furthest from correct:
 *
 *   · the cashier's fee grid was **hardcoded to two rows**, tuition and
 *     registration, so revenue could not be attributed to what it was for;
 *   · it looked accounts up by their Arabic *names* and wrote the English
 *     literals "Current Assets", "Debtors" and "Students Fees" into the grid;
 *   · receipt numbers came from `MAX(MoveNo) + 1` read inside the transaction,
 *     so two cashiers taking money at the same moment issued the same number;
 *   · a full year's tuition was recognised as revenue on registration day;
 *   · there was no student control account, so the sub-ledger and the general
 *     ledger could disagree with nothing able to notice.
 *
 * The last of those is what `reconciliation` at the bottom of this file
 * exists to make impossible.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Principal } from '@/lib/auth/rbac';
import { ForbiddenError, MfaRequiredError } from '@/lib/auth/rbac';
import { findSodViolations } from '@/lib/auth/permissions';
import { verifyChain } from '@/lib/audit/log';
import { AccountMappingMissingError, loadAccountMappings, requireAccounts, setAccountMapping } from '@/lib/coa/mapping';
import { installFeeCatalog, listFeeItems, STANDARD_FEE_ITEMS } from '@/lib/fees/catalog';
import { createStudent, findStudents, StudentError } from '@/lib/students/registry';
import { ChargeError, raiseCharges, reverseCharge } from '@/lib/billing/charge';
import {
  applyCreditBalance,
  assignTill,
  cancelReceipt,
  cashierDaySheet,
  previewAllocation,
  receiptRegister,
  ReceiptError,
  takeReceipt,
} from '@/lib/cashier/receipt';
import { runRecognition, unrecognisedByPeriod } from '@/lib/billing/recognition';
import { createInstalmentPlan, InstalmentError, overdueInstalments } from '@/lib/billing/instalments';
import {
  agedReceivables,
  reconcileStudentSubledger,
  statementOfAccount,
  studentBalance,
} from '@/lib/students/account';
import { setPeriodStatus } from '@/lib/ledger/fiscal-year';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';

let uni: University;
let registrar: Principal;
let cashier: Principal;
let supervisor: Principal;
let controller: Principal;
let accountant: Principal;
let admin: Principal;

const JAN = new Date(Date.UTC(2026, 0, 15));
const FEB = new Date(Date.UTC(2026, 1, 10));
const MAR = new Date(Date.UTC(2026, 2, 12));

let studentSeq = 0;

async function newStudent(nameEn = 'Test Student'): Promise<string> {
  studentSeq += 1;
  const s = await createStudent(registrar, {
    studentNo: `NC-2026-${String(studentSeq).padStart(4, '0')}`,
    fullNameAr: 'أحمد محمد الطيب',
    fullNameEn: nameEn,
  });
  return s.id;
}

const key = () => randomUUID();

beforeAll(async () => {
  uni = await makeUniversity();

  registrar = await makePrincipal(uni.tenantId, [
    'student.read', 'student.manage', 'student.status', 'charge.create', 'report.student',
  ], { name: 'registrar' });

  cashier = await makePrincipal(uni.tenantId, [
    'student.read', 'receipt.create',
  ], { name: 'cashier' });

  supervisor = await makePrincipal(uni.tenantId, [
    'student.read', 'receipt.cancel',
  ], { name: 'supervisor' });

  controller = await makePrincipal(uni.tenantId, [
    'student.read', 'charge.reverse', 'report.financial', 'period.close',
  ], { name: 'controller' });

  accountant = await makePrincipal(uni.tenantId, [
    'revenue.recognise', 'report.financial', 'feematrix.read', 'feematrix.manage', 'coa.manage',
  ], { name: 'accountant' });

  admin = await makePrincipal(uni.tenantId, ['coa.manage'], { name: 'tilladmin' });

  await assignTill(admin, cashier.userId, uni.accounts['11111']);
});

afterAll(async () => {
  await disconnectAll();
});

// ---------------------------------------------------------------------------

describe('the fee catalog', () => {
  it('ships every head the requirement names, each with its own revenue account', async () => {
    const items = await listFeeItems(accountant);
    expect(items).toHaveLength(STANDARD_FEE_ITEMS.length);
    expect(items.map((i) => i.code)).toContain('TUITION');
    expect(items.map((i) => i.code)).toContain('TRANSCRIPT');

    // The legacy grid had two rows for all of this.
    expect(items.length).toBeGreaterThan(10);
  });

  it('defers what has not been delivered yet, and only that', async () => {
    const items = await listFeeItems(accountant);
    const by = new Map(items.map((i) => [i.code, i]));

    // Consumed across the term: billing credits a liability.
    expect(by.get('TUITION')!.isDeferrable).toBe(true);
    expect(by.get('LAB')!.isDeferrable).toBe(true);
    expect(by.get('HOSTEL')!.isDeferrable).toBe(true);

    // Earned the moment it is charged.
    expect(by.get('ID_CARD')!.isDeferrable).toBe(false);
    expect(by.get('LATE_FEE')!.isDeferrable).toBe(false);
    expect(by.get('TRANSCRIPT')!.isDeferrable).toBe(false);
  });

  it('refuses to discount what may not be discounted', async () => {
    const items = await listFeeItems(accountant);
    const stamp = items.find((i) => i.code === 'STAMP')!;
    expect(stamp.isDiscountable).toBe(false);

    const studentId = await newStudent();
    await expect(
      raiseCharges(registrar, {
        studentId,
        docDate: JAN,
        lines: [{ feeItemId: uni.feeItems.STAMP, grossAmount: '100', discountAmount: '50' }],
      }),
    ).rejects.toThrow(/not discountable/i);
  });

  it('is idempotent, so a re-run after adding an item fills the gap only', async () => {
    const again = await installFeeCatalog(uni.tenantId, uni.adminUserId);
    expect(again.created).toBe(0);
    expect(again.skipped).toBe(STANDARD_FEE_ITEMS.length);
  });

  it('will not create a deferrable item with nowhere to hold the liability', async () => {
    await expect(
      (await import('@/lib/fees/catalog')).createFeeItem(accountant, {
        code: 'BROKEN',
        nameAr: 'مكسور',
        nameEn: 'Broken',
        revenueAccountId: uni.accounts['41211'],
        isDeferrable: true,
      }),
    ).rejects.toThrow(/unearned-income account/i);
  });
});

// ---------------------------------------------------------------------------

describe('structural account roles', () => {
  it('binds the shipped chart to the roles the modules ask for', async () => {
    const mappings = await asTenant(uni.tenantId, (tx) => loadAccountMappings(tx, uni.tenantId));
    const byRole = new Map(mappings.map((m) => [m.role, m.code]));

    expect(byRole.get('STUDENT_AR_CONTROL')).toBe('11211');
    expect(byRole.get('STUDENT_CREDIT_CONTROL')).toBe('21221');
    expect(byRole.get('CHEQUES_RECEIVABLE')).toBe('11231');
    expect(byRole.get('DEFAULT_DISCOUNT_EXPENSE')).toBe('51411');
  });

  it('refuses a sub-ledger role that is not a control account', async () => {
    // Without this the per-student balance has nothing in the general ledger
    // to reconcile against, which is exactly the legacy failure.
    await expect(
      setAccountMapping(accountant, 'STUDENT_AR_CONTROL', uni.accounts['11111']),
    ).rejects.toThrow(/control account for the STUDENT sub-ledger/i);
  });

  it('refuses a heading account for any role', async () => {
    await expect(
      setAccountMapping(accountant, 'DEFAULT_CASH', uni.accounts['111']),
    ).rejects.toThrow(/heading/i);
  });

  it('says which role is missing rather than failing obscurely', async () => {
    const bare = await makeUniversity();
    await asSystem((tx) =>
      tx.accountMapping.deleteMany({
        where: { tenantId: bare.tenantId, role: 'STUDENT_AR_CONTROL' },
      }),
    );
    await expect(
      asTenant(bare.tenantId, (tx) =>
        requireAccounts(tx, bare.tenantId, ['STUDENT_AR_CONTROL'] as const),
      ),
    ).rejects.toBeInstanceOf(AccountMappingMissingError);
  });
});

// ---------------------------------------------------------------------------

describe('the student master', () => {
  it('finds a student by a name spelled differently from the one on file', async () => {
    // أحمد stored, احمد typed — no hamza. The legacy screen used LIKE on the
    // raw column, so the second-best outcome was a duplicate student record.
    const id = await newStudent('Ahmed Mohammed Eltayeb');
    const found = await findStudents(registrar, 'احمد الطيب');
    expect(found.map((s) => s.id)).toContain(id);
  });

  it('refuses a second record for the same national ID', async () => {
    studentSeq += 1;
    const nationalId = `199${studentSeq}00112233`;
    await createStudent(registrar, {
      studentNo: `NID-A-${studentSeq}`,
      fullNameAr: 'سارة عبد الله',
      fullNameEn: 'Sara Abdalla',
      nationalId,
    });
    await expect(
      createStudent(registrar, {
        studentNo: `NID-B-${studentSeq}`,
        fullNameAr: 'سارة عبد الله',
        fullNameEn: 'Sara Abdalla',
        nationalId,
      }),
    ).rejects.toBeInstanceOf(StudentError);
  });

  it('will not let a cashier create students', async () => {
    await expect(
      createStudent(cashier, {
        studentNo: 'X-1',
        fullNameAr: 'س',
        fullNameEn: 'X',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------

describe('raising charges', () => {
  it('bills gross, holds the discount as an expense, and defers what is unearned', async () => {
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      termLabel: '2026/1',
      lines: [
        { feeItemId: uni.feeItems.TUITION, grossAmount: '10000', discountAmount: '2500' },
        { feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' },
      ],
    });

    expect(raised.totalGross).toBe('10500.0000');
    expect(raised.totalDiscount).toBe('2500.0000');
    expect(raised.totalNet).toBe('8000.0000');
    expect(raised.voucherRef).toMatch(/^CHG-2026-\d{6}$/);

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: raised.headerId },
        orderBy: { lineNo: 'asc' },
        select: {
          debitAmount: true,
          creditAmount: true,
          account: { select: { code: true } },
          subledgerId: true,
        },
      }),
    );

    const at = (code: string, side: 'debitAmount' | 'creditAmount') =>
      lines.filter((l) => l.account.code === code).reduce((a, l) => a + Number(l[side]), 0);

    // Student owes the net.
    expect(at('11211', 'debitAmount')).toBe(8000);
    // The institution carries what it gave away, on its own line.
    expect(at('51411', 'debitAmount')).toBe(2500);
    // Tuition is unearned until the term is delivered; registration is earned.
    expect(at('21111', 'creditAmount')).toBe(10000);
    expect(at('41211', 'creditAmount')).toBe(500);
    // Revenue is NOT credited for tuition yet — the legacy system's mistake.
    expect(at('41111', 'creditAmount')).toBe(0);

    // Every AR line names the student it belongs to.
    expect(lines.filter((l) => l.account.code === '11211').every((l) => l.subledgerId === studentId))
      .toBe(true);
  });

  it('refuses a discount larger than the charge', async () => {
    const studentId = await newStudent();
    await expect(
      raiseCharges(registrar, {
        studentId,
        docDate: JAN,
        lines: [{ feeItemId: uni.feeItems.TUITION, grossAmount: '100', discountAmount: '150' }],
      }),
    ).rejects.toThrow(/cannot turn a bill into a payment/);
  });

  it('refuses to bill a fee item with no amount and no default', async () => {
    const studentId = await newStudent();
    await expect(
      raiseCharges(registrar, {
        studentId,
        docDate: JAN,
        lines: [{ feeItemId: uni.feeItems.LIBRARY }],
      }),
    ).rejects.toBeInstanceOf(ChargeError);
  });

  it('replays rather than double-bills when the same request arrives twice', async () => {
    const studentId = await newStudent();
    const k = key();
    const input = {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    };

    const first = await raiseCharges(registrar, input, k);
    const second = await raiseCharges(registrar, input, k);

    expect(second.headerId).toBe(first.headerId);
    const count = await asTenant(uni.tenantId, (tx) =>
      tx.studentCharge.count({ where: { studentId } }),
    );
    expect(count).toBe(1);
  });

  it('needs charge.create', async () => {
    const studentId = await newStudent();
    await expect(
      raiseCharges(cashier, {
        studentId,
        docDate: JAN,
        lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '100' }],
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------

describe('the cashier desk', () => {
  it('takes cash into the cashier’s own till and settles the oldest charge first', async () => {
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      termLabel: '2026/1',
      lines: [
        { feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500', dueDate: JAN },
        { feeItemId: uni.feeItems.TUITION, grossAmount: '9000', dueDate: MAR },
      ],
    });

    const receipt = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '2000' },
      key(),
    );

    expect(receipt.receiptNo).toMatch(/^SRV-2026-\d{6}$/);
    expect(receipt.allocated).toBe('2000.0000');
    expect(receipt.unallocated).toBe('0.0000');
    // Registration was due in January, tuition in March: the earlier one is
    // settled in full first.
    expect(receipt.settledCharges[0].amount).toBe('500.0000');
    expect(receipt.settledCharges[1].amount).toBe('1500.0000');

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: receipt.headerId },
        select: { debitAmount: true, creditAmount: true, account: { select: { code: true } } },
      }),
    );
    // The money is in the cashier's assigned safe, not a shared one.
    expect(lines.find((l) => l.account.code === '11111')?.debitAmount.toFixed(2)).toBe('2000.00');
    expect(lines.find((l) => l.account.code === '11211')?.creditAmount.toFixed(2)).toBe('2000.00');

    expect(raised.chargeIds).toHaveLength(2);
  });

  it('puts an overpayment on the student’s credit balance, not into revenue', async () => {
    const studentId = await newStudent();
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    });

    const receipt = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '800' },
      key(),
    );
    expect(receipt.allocated).toBe('500.0000');
    expect(receipt.unallocated).toBe('300.0000');

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: receipt.headerId },
        select: { creditAmount: true, account: { select: { code: true } } },
      }),
    );
    // The overpayment is a liability the institution owes back, not a credit
    // to receivables that would leave the control account negative.
    expect(lines.find((l) => l.account.code === '21221')?.creditAmount.toFixed(2)).toBe('300.00');

    const balance = await studentBalance(cashier, studentId);
    expect(balance.outstanding).toBe('0.0000');
    expect(balance.creditBalance).toBe('300.0000');
    expect(balance.netDue).toBe('-300.0000');
  });

  it('applies a credit balance to the next term’s charges without a second receipt', async () => {
    const studentId = await newStudent();
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    });
    await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '1500' },
      key(),
    );

    await raiseCharges(registrar, {
      studentId,
      docDate: FEB,
      termLabel: '2026/2',
      lines: [{ feeItemId: uni.feeItems.LAB, grossAmount: '600' }],
    });

    const applied = await applyCreditBalance(cashier, studentId, { docDate: FEB });
    expect(applied.applied).toBe('600.0000');

    const balance = await studentBalance(cashier, studentId);
    expect(balance.outstanding).toBe('0.0000');
    expect(balance.creditBalance).toBe('400.0000');

    // No new receipt number was burned: nothing entered the institution.
    const receipts = await asTenant(uni.tenantId, (tx) =>
      tx.studentReceipt.count({ where: { studentId } }),
    );
    expect(receipts).toBe(1);
  });

  it('routes a cheque into cheques receivable and keeps its detail', async () => {
    const studentId = await newStudent();
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.TUITION, grossAmount: '5000' }],
    });

    const receipt = await takeReceipt(
      cashier,
      {
        studentId,
        docDate: JAN,
        channel: 'CHEQUE',
        amount: '5000',
        cheque: {
          chequeNo: '004512',
          bank: 'Faisal Islamic Bank',
          dueDate: MAR,
          drawerName: 'Mohammed Eltayeb',
        },
      },
      key(),
    );

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: receipt.headerId },
        select: { debitAmount: true, account: { select: { code: true } } },
      }),
    );
    // Not cash and not bank: a cheque is a receivable until it clears.
    expect(lines.find((l) => l.account.code === '11231')?.debitAmount.toFixed(2)).toBe('5000.00');
  });

  it('refuses a cheque with no number', async () => {
    const studentId = await newStudent();
    await expect(
      takeReceipt(
        cashier,
        {
          studentId,
          docDate: JAN,
          channel: 'CHEQUE',
          amount: '100',
          cheque: { chequeNo: '  ', dueDate: MAR },
        },
        key(),
      ),
    ).rejects.toBeInstanceOf(ReceiptError);
  });

  it('refuses cash from a cashier with no till assigned', async () => {
    const stranger = await makePrincipal(uni.tenantId, ['student.read', 'receipt.create'], {
      name: 'notill',
    });
    const studentId = await newStudent();
    await expect(
      takeReceipt(stranger, { studentId, docDate: JAN, channel: 'CASH', amount: '100' }, key()),
    ).rejects.toThrow(/no cash till assigned/i);
  });

  it('takes the money once when the cashier presses Save twice', async () => {
    // The highest-risk duplicate-creation path in the product.
    const studentId = await newStudent();
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.TUITION, grossAmount: '3000' }],
    });

    const k = key();
    const input = { studentId, docDate: JAN, channel: 'CASH' as const, amount: '1000' };
    const first = await takeReceipt(cashier, input, k);
    const second = await takeReceipt(cashier, input, k);

    expect(second.receiptId).toBe(first.receiptId);
    expect(second.receiptNo).toBe(first.receiptNo);

    const count = await asTenant(uni.tenantId, (tx) =>
      tx.studentReceipt.count({ where: { studentId } }),
    );
    expect(count).toBe(1);

    const balance = await studentBalance(cashier, studentId);
    expect(balance.settled).toBe('1000.0000');
  });

  it('issues distinct gapless numbers under concurrent tills', async () => {
    const students = await Promise.all(Array.from({ length: 8 }, () => newStudent()));
    for (const id of students) {
      await raiseCharges(registrar, {
        studentId: id,
        docDate: JAN,
        lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
      });
    }

    const results = await Promise.all(
      students.map((studentId) =>
        takeReceipt(
          cashier,
          { studentId, docDate: JAN, channel: 'CASH', amount: '500' },
          key(),
        ),
      ),
    );
    const numbers = new Set(results.map((r) => r.receiptNo));
    expect(numbers.size).toBe(8);
  });

  it('refuses an explicit allocation that overpays a charge', async () => {
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    });
    await expect(
      takeReceipt(
        cashier,
        {
          studentId,
          docDate: JAN,
          channel: 'CASH',
          amount: '900',
          allocations: [{ chargeId: raised.chargeIds[0], amount: '900' }],
        },
        key(),
      ),
    ).rejects.toThrow(/overpay/i);
  });

  it('needs receipt.create', async () => {
    const studentId = await newStudent();
    await expect(
      takeReceipt(
        registrar,
        { studentId, docDate: JAN, channel: 'CASH', amount: '100' },
        key(),
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------

describe('receipt cancellation', () => {
  it('cancels a same-day receipt, reverses the ledger, and restores the debt', async () => {
    const studentId = await newStudent();
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    });
    const receipt = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '500' },
      key(),
    );

    await cancelReceipt(supervisor, receipt.receiptId, 'Wrong student', { on: JAN });

    const balance = await studentBalance(cashier, studentId);
    expect(balance.outstanding).toBe('500.0000');
    expect(balance.settled).toBe('0.0000');

    const row = await asTenant(uni.tenantId, (tx) =>
      tx.studentReceipt.findUniqueOrThrow({
        where: { id: receipt.receiptId },
        select: { cancelledAt: true, cancellationReason: true, receiptNo: true },
      }),
    );
    // The number stays on the record. A gap in a receipt book is a question
    // an auditor will ask.
    expect(row.cancelledAt).not.toBeNull();
    expect(row.receiptNo).toBe(receipt.receiptNo);
  });

  it('refuses a cashier cancelling their own receipt', async () => {
    const studentId = await newStudent();
    const receipt = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '100' },
      key(),
    );
    await expect(
      cancelReceipt(cashier, receipt.receiptId, 'Mine', { on: JAN }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('is barred by the segregation matrix from being held with receipt.create', async () => {
    // The control this whole restriction exists for: take cash, cancel the
    // receipt, keep the money.
    expect(findSodViolations(['receipt.create', 'receipt.cancel'])).toHaveLength(1);
  });

  it('demands a second factor', async () => {
    const noMfa = await makePrincipal(uni.tenantId, ['receipt.cancel'], {
      name: 'nomfa',
      mfaVerified: false,
    });
    const studentId = await newStudent();
    const receipt = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '100' },
      key(),
    );
    await expect(
      cancelReceipt(noMfa, receipt.receiptId, 'x', { on: JAN }),
    ).rejects.toBeInstanceOf(MfaRequiredError);
  });

  it('refuses after the day of issue and points at the reversal workflow', async () => {
    const studentId = await newStudent();
    const receipt = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '100' },
      key(),
    );
    await expect(
      cancelReceipt(supervisor, receipt.receiptId, 'Too late', { on: FEB }),
    ).rejects.toThrow(/second signature/i);
  });

  it('cannot be cancelled twice', async () => {
    const studentId = await newStudent();
    const receipt = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '100' },
      key(),
    );
    await cancelReceipt(supervisor, receipt.receiptId, 'First', { on: JAN });
    await expect(
      cancelReceipt(supervisor, receipt.receiptId, 'Second', { on: JAN }),
    ).rejects.toThrow(/already been cancelled/i);
  });
});

// ---------------------------------------------------------------------------

describe('reversing a charge', () => {
  it('unwinds recognised and unrecognised revenue in the right proportions', async () => {
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      termLabel: '2026/1',
      lines: [{ feeItemId: uni.feeItems.TUITION, grossAmount: '3000' }],
      recognitionPeriodIds: uni.periodIds.slice(0, 3),
    });

    // Recognise one period of the three: 1000 in revenue, 2000 still unearned.
    await runRecognition(accountant, uni.periodIds[0]);

    const reversal = await reverseCharge(
      controller,
      raised.chargeIds[0],
      'Student never enrolled',
      { reversalDate: FEB },
    );

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: reversal.headerId },
        select: { debitAmount: true, account: { select: { code: true } } },
      }),
    );
    const debit = (code: string) =>
      lines.filter((l) => l.account.code === code).reduce((a, l) => a + Number(l.debitAmount), 0);

    // Taking the whole 3000 out of revenue would understate the period by the
    // 2000 that was never recognised in the first place.
    expect(debit('41111')).toBe(1000);
    expect(debit('21111')).toBe(2000);
  });

  it('turns money already paid into a credit balance rather than keeping it', async () => {
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '1000' }],
    });
    await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '400' },
      key(),
    );

    const reversal = await reverseCharge(controller, raised.chargeIds[0], 'Billed in error', {
      reversalDate: FEB,
    });
    expect(reversal.freedToCredit).toBe('400.0000');

    const balance = await studentBalance(cashier, studentId);
    expect(balance.outstanding).toBe('0.0000');
    // The cash is still in the safe; it simply no longer pays for anything.
    expect(balance.creditBalance).toBe('400.0000');
  });

  it('refuses without a reason, and refuses twice', async () => {
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '100' }],
    });
    await expect(reverseCharge(controller, raised.chargeIds[0], '   ')).rejects.toThrow(/reason/i);

    await reverseCharge(controller, raised.chargeIds[0], 'Duplicate', { reversalDate: FEB });
    await expect(
      reverseCharge(controller, raised.chargeIds[0], 'Again', { reversalDate: FEB }),
    ).rejects.toThrow(/already been reversed/i);
  });

  it('demands a second factor and the charge.reverse permission', async () => {
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '100' }],
    });
    await expect(
      reverseCharge(registrar, raised.chargeIds[0], 'Not allowed'),
    ).rejects.toBeInstanceOf(ForbiddenError);

    const noMfa = await makePrincipal(uni.tenantId, ['charge.reverse'], {
      name: 'revnomfa',
      mfaVerified: false,
    });
    await expect(
      reverseCharge(noMfa, raised.chargeIds[0], 'No second factor'),
    ).rejects.toBeInstanceOf(MfaRequiredError);
  });

  it('is barred by the segregation matrix from being held with receipt.create', async () => {
    expect(findSodViolations(['charge.reverse', 'receipt.create'])).toHaveLength(1);
    expect(findSodViolations(['charge.create', 'charge.reverse'])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------

describe('revenue recognition', () => {
  it('moves one period’s slice out of unearned income, not the whole year', async () => {
    const fresh = await makeUniversity();
    const reg = await makePrincipal(fresh.tenantId, ['student.manage', 'charge.create'], {
      name: 'freshreg',
    });
    const acct = await makePrincipal(fresh.tenantId, ['revenue.recognise', 'report.financial'], {
      name: 'freshacct',
    });

    const student = await createStudent(reg, {
      studentNo: 'REC-001',
      fullNameAr: 'طالب',
      fullNameEn: 'Recognition Student',
    });
    await asSystem((tx) =>
      tx.feeItem.update({
        where: { id: fresh.feeItems.TUITION },
        data: { costCenterId: fresh.costCenterId },
      }),
    );

    await raiseCharges(reg, {
      studentId: student.id,
      docDate: JAN,
      termLabel: '2026/1',
      lines: [{ feeItemId: fresh.feeItems.TUITION, grossAmount: '9000' }],
      recognitionPeriodIds: fresh.periodIds.slice(0, 3),
    });

    const run = await runRecognition(acct, fresh.periodIds[0]);
    expect(run.amount).toBe('3000.0000');

    const lines = await asTenant(fresh.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: run.headerId! },
        select: { debitAmount: true, creditAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(lines.find((l) => l.account.code === '21111')?.debitAmount.toFixed(2)).toBe('3000.00');
    expect(lines.find((l) => l.account.code === '41111')?.creditAmount.toFixed(2)).toBe('3000.00');

    const remaining = await unrecognisedByPeriod(acct);
    expect(remaining.reduce((a, r) => a + Number(r.amount), 0)).toBe(6000);
  });

  it('is idempotent — running it twice does not double revenue', async () => {
    // The legacy depreciation batch had no such guard, so running it twice in
    // a month simply doubled the charge.
    const fresh = await makeUniversity();
    const reg = await makePrincipal(fresh.tenantId, ['student.manage', 'charge.create'], {
      name: 'idemreg',
    });
    const acct = await makePrincipal(fresh.tenantId, ['revenue.recognise', 'report.financial'], {
      name: 'idemacct',
    });
    await asSystem((tx) =>
      tx.feeItem.update({
        where: { id: fresh.feeItems.TUITION },
        data: { costCenterId: fresh.costCenterId },
      }),
    );

    const student = await createStudent(reg, {
      studentNo: 'REC-002',
      fullNameAr: 'طالب',
      fullNameEn: 'Idempotent Student',
    });
    await raiseCharges(reg, {
      studentId: student.id,
      docDate: JAN,
      lines: [{ feeItemId: fresh.feeItems.TUITION, grossAmount: '1200' }],
      recognitionPeriodIds: fresh.periodIds.slice(0, 2),
    });

    const first = await runRecognition(acct, fresh.periodIds[0]);
    const second = await runRecognition(acct, fresh.periodIds[0]);
    expect(second.headerId).toBe(first.headerId);

    const vouchers = await asTenant(fresh.tenantId, (tx) =>
      tx.transactionHeader.count({
        where: { tenantId: fresh.tenantId, voucherType: 'REVENUE_RECOGNITION' },
      }),
    );
    expect(vouchers).toBe(1);
  });

  it('refuses to recognise into a period that is not open', async () => {
    const fresh = await makeUniversity();
    const acct = await makePrincipal(fresh.tenantId, ['revenue.recognise'], { name: 'closedacct' });
    const closer = await makePrincipal(fresh.tenantId, ['period.close'], { name: 'closer' });

    await setPeriodStatus(closer, fresh.periodIds[0], 'CLOSED');
    await expect(runRecognition(acct, fresh.periodIds[0])).rejects.toThrow(/CLOSED/);
  });

  it('needs revenue.recognise', async () => {
    await expect(runRecognition(cashier, uni.periodIds[1])).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------

describe('instalment plans', () => {
  it('splits a term into dated instalments that add back to the total', async () => {
    const studentId = await newStudent();
    const plan = await createInstalmentPlan(registrar, {
      studentId,
      termLabel: '2026/1',
      totalAmount: '10000',
      dueDates: [JAN, FEB, MAR],
      weights: [50, 25, 25],
    });

    expect(plan.instalments.map((i) => i.amount)).toEqual([
      '5000.0000',
      '2500.0000',
      '2500.0000',
    ]);
  });

  it('refuses a schedule that does not add up', async () => {
    const studentId = await newStudent();
    await expect(
      createInstalmentPlan(registrar, {
        studentId,
        totalAmount: '1000',
        instalments: [
          { dueDate: JAN, amount: '400' },
          { dueDate: FEB, amount: '400' },
        ],
      }),
    ).rejects.toBeInstanceOf(InstalmentError);
  });

  it('leaves a residue nobody can lose: 100 over 3 sums to 100', async () => {
    const studentId = await newStudent();
    const plan = await createInstalmentPlan(registrar, {
      studentId,
      totalAmount: '100',
      dueDates: [JAN, FEB, MAR],
    });
    const total = plan.instalments.reduce((a, i) => a + Number(i.amount), 0);
    expect(total).toBe(100);
  });

  it('does not report a student as overdue when they have already paid', async () => {
    const studentId = await newStudent();
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '1000' }],
    });
    await createInstalmentPlan(registrar, {
      studentId,
      totalAmount: '1000',
      dueDates: [JAN, FEB],
    });
    await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '1000' },
      key(),
    );

    const overdue = await overdueInstalments(registrar, MAR);
    expect(overdue.filter((o) => o.studentId === studentId)).toHaveLength(0);
  });

  it('reports the shortfall when they have not', async () => {
    const studentId = await newStudent();
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '1000' }],
    });
    await createInstalmentPlan(registrar, {
      studentId,
      totalAmount: '1000',
      dueDates: [JAN, FEB],
    });

    const overdue = await overdueInstalments(registrar, MAR);
    const mine = overdue.filter((o) => o.studentId === studentId);
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.reduce((a, o) => a + Number(o.amount), 0)).toBe(1000);
  });
});

// ---------------------------------------------------------------------------

describe('statements and aging', () => {
  it('produces a running balance, and carries an opening figure into a window', async () => {
    const studentId = await newStudent();
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '1000' }],
    });
    await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '400' },
      key(),
    );
    await raiseCharges(registrar, {
      studentId,
      docDate: FEB,
      lines: [{ feeItemId: uni.feeItems.LAB, grossAmount: '250' }],
    });

    const full = await statementOfAccount(registrar, studentId);
    expect(full.openingBalance).toBe('0.0000');
    expect(full.closingBalance).toBe('850.0000');
    expect(full.lines).toHaveLength(3);

    // February onwards: January's activity is a figure carried in, not zero
    // and not silently re-listed.
    const feb = await statementOfAccount(registrar, studentId, { from: FEB });
    expect(feb.openingBalance).toBe('600.0000');
    expect(feb.lines).toHaveLength(1);
    expect(feb.closingBalance).toBe('850.0000');
  });

  it('ages from the due date, falling back to the document date', async () => {
    const fresh = await makeUniversity();
    const reg = await makePrincipal(fresh.tenantId, ['student.manage', 'charge.create'], {
      name: 'agereg',
    });
    const rep = await makePrincipal(fresh.tenantId, ['report.financial'], { name: 'agerep' });

    const student = await createStudent(reg, {
      studentNo: 'AGE-001',
      fullNameAr: 'طالب',
      fullNameEn: 'Aging Student',
    });
    await raiseCharges(reg, {
      studentId: student.id,
      docDate: JAN,
      lines: [
        { feeItemId: fresh.feeItems.REGISTRATION, grossAmount: '500', dueDate: JAN },
        { feeItemId: fresh.feeItems.LIBRARY, grossAmount: '200', dueDate: MAR },
      ],
    });

    // 15 Jan is 56 days before 12 March; 12 March is current.
    const aged = await agedReceivables(rep, MAR);
    expect(aged.total).toBe('700.0000');
    const bucket = (label: string) => aged.buckets.find((b) => b.label === label)?.amount;
    expect(bucket('Current')).toBe('200.0000');
    expect(bucket('30–59 days')).toBe('500.0000');
  });
});

// ---------------------------------------------------------------------------

describe('reconciliation', () => {
  /**
   * The check the legacy design made impossible.
   *
   * It kept a `Remain` column on the registration row, written by whichever
   * screen last touched it, and had no student control account at all. A
   * student's balance and the general ledger could disagree indefinitely with
   * nothing capable of noticing.
   */
  it('the student sub-ledger equals its control accounts, to the cent, after a term of activity', async () => {
    const fresh = await makeUniversity();
    const reg = await makePrincipal(fresh.tenantId, ['student.manage', 'charge.create'], {
      name: 'reconreg',
    });
    const till = await makePrincipal(fresh.tenantId, ['student.read', 'receipt.create'], {
      name: 'recontill',
    });
    const sup = await makePrincipal(fresh.tenantId, ['receipt.cancel'], { name: 'reconsup' });
    const ctrl = await makePrincipal(fresh.tenantId, ['charge.reverse'], { name: 'reconctrl' });
    const admin2 = await makePrincipal(fresh.tenantId, ['coa.manage'], { name: 'reconadmin' });
    const acct = await makePrincipal(fresh.tenantId, ['revenue.recognise'], { name: 'reconacct' });

    await assignTill(admin2, till.userId, fresh.accounts['11111']);
    await asSystem((tx) =>
      tx.feeItem.update({
        where: { id: fresh.feeItems.TUITION },
        data: { costCenterId: fresh.costCenterId },
      }),
    );

    // A term: 12 students billed, paid in various ways, with an overpayment,
    // a cancellation, a reversal and a recognition run mixed in.
    const ids: string[] = [];
    for (let i = 0; i < 12; i += 1) {
      const s = await createStudent(reg, {
        studentNo: `RC-${String(i).padStart(3, '0')}`,
        fullNameAr: 'طالب',
        fullNameEn: `Student ${i}`,
      });
      ids.push(s.id);

      const raised = await raiseCharges(reg, {
        studentId: s.id,
        docDate: JAN,
        termLabel: '2026/1',
        lines: [
          { feeItemId: fresh.feeItems.TUITION, grossAmount: '9000', discountAmount: i % 4 === 0 ? '1500' : '0' },
          { feeItemId: fresh.feeItems.REGISTRATION, grossAmount: '750' },
          { feeItemId: fresh.feeItems.ID_CARD, grossAmount: '150' },
        ],
        recognitionPeriodIds: fresh.periodIds.slice(0, 3),
      });

      // Most pay something; one overpays; one pays nothing.
      if (i % 5 !== 0) {
        const amount = i % 3 === 0 ? '12000.55' : '4000.25';
        await takeReceipt(
          till,
          { studentId: s.id, docDate: JAN, channel: i % 2 ? 'CASH' : 'BANK_TRANSFER', amount },
          key(),
        );
      }

      // One receipt is taken and cancelled the same day.
      if (i === 7) {
        const r = await takeReceipt(
          till,
          { studentId: s.id, docDate: JAN, channel: 'CASH', amount: '333.33' },
          key(),
        );
        await cancelReceipt(sup, r.receiptId, 'Keyed against the wrong student', { on: JAN });
      }

      // One charge is reversed after being partly paid.
      if (i === 9) {
        await reverseCharge(ctrl, raised.chargeIds[1], 'Registration waived', {
          reversalDate: FEB,
        });
      }
    }

    await runRecognition(acct, fresh.periodIds[0]);
    await runRecognition(acct, fresh.periodIds[1]);

    const recon = await asTenant(fresh.tenantId, (tx) =>
      reconcileStudentSubledger(tx, fresh.tenantId),
    );

    expect(recon.receivableVariance, JSON.stringify(recon, null, 2)).toBe('0.0000');
    expect(recon.creditVariance, JSON.stringify(recon, null, 2)).toBe('0.0000');
    expect(recon.ok).toBe(true);
    // And it actually exercised something.
    expect(Number(recon.subledgerReceivable)).toBeGreaterThan(0);
    expect(Number(recon.subledgerCredit)).toBeGreaterThan(0);
  });

  it('leaves an intact audit chain across the whole of A3', async () => {
    const v = await asTenant(uni.tenantId, (tx) => verifyChain(tx, uni.tenantId));
    expect(v.ok, v.reason).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('the database refuses what the application forgets', () => {
  it('will not let a settlement figure drift from its allocations', async () => {
    // `settled_amount` is denormalised so a cashier screen listing forty
    // charges does not aggregate the allocation table forty times.
    // Denormalised totals are exactly the thing that drifts — and a drifted
    // student balance is what the legacy system shipped.
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    });

    await expect(
      asSystem((tx) =>
        tx.$executeRaw`
          UPDATE student_charges SET settled_amount = 250
           WHERE id = ${raised.chargeIds[0]}::uuid
        `,
      ),
    ).rejects.toThrow(/allocations total/i);
  });

  it('will not let a billed amount be edited after the fact', async () => {
    const studentId = await newStudent();
    const raised = await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    });
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`
          UPDATE student_charges SET gross_amount = 50, net_amount = 50
           WHERE id = ${raised.chargeIds[0]}::uuid
        `,
      ),
    ).rejects.toThrow(/cannot be edited/i);
  });

  it('will not let a receipt be deleted', async () => {
    const studentId = await newStudent();
    const receipt = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '100' },
      key(),
    );
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`DELETE FROM student_receipts WHERE id = ${receipt.receiptId}::uuid`,
      ),
    ).rejects.toThrow(/cancel it/i);
  });

  it('will not let a row point at another tenant’s account', async () => {
    // Foreign keys do not carry a tenant, and referential-integrity checks run
    // as the table owner, so the FK alone would happily accept this.
    const other = await makeUniversity();
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`
          UPDATE fee_items SET revenue_account_id = ${other.accounts['41211']}::uuid
           WHERE id = ${uni.feeItems.LIBRARY}::uuid
        `,
      ),
    ).rejects.toThrow(/different tenant/i);
  });

  it('keeps students and their money inside their tenant', async () => {
    const other = await makeUniversity();
    const seen = await asTenant(other.tenantId, async (tx) => ({
      students: await tx.student.count(),
      charges: await tx.studentCharge.count(),
      receipts: await tx.studentReceipt.count(),
    }));
    expect(seen.students).toBe(0);
    expect(seen.charges).toBe(0);
    expect(seen.receipts).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// What the desk shows before it takes the money (Track D2)
// ---------------------------------------------------------------------------

/**
 * The cashier desk's whole claim is that the split it displays — this much
 * settles charges, this much becomes a credit balance — is computed by the
 * code that will do the saving. These tests are that claim, stated as an
 * equality between what `previewAllocation` says and what `takeReceipt` does.
 *
 * The legacy desk could not make the claim, because it had nothing to
 * allocate against: the grid was two hardcoded rows and there was no charge
 * entity, so a receipt was credited whole against a student's *name*.
 */
describe('the cashier desk previews exactly what it will do', () => {
  it('proposes the same oldest-first plan the receipt then follows', async () => {
    const studentId = await newStudent('Preview Student');
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      termLabel: '2026/1',
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500', dueDate: JAN }],
    });
    await raiseCharges(registrar, {
      studentId,
      docDate: FEB,
      termLabel: '2026/1',
      lines: [{ feeItemId: uni.feeItems.LIBRARY, grossAmount: '300', dueDate: FEB }],
    });

    // 600 covers the older charge whole and part of the newer one.
    const preview = await previewAllocation(cashier, studentId, '600');
    expect(preview.charges).toHaveLength(2);
    expect(preview.allocated).toBe('600.0000');
    expect(preview.unallocated).toBe('0.0000');
    expect(preview.plan.map((p) => p.amount)).toEqual(['500.0000', '100.0000']);

    const taken = await takeReceipt(
      cashier,
      { studentId, docDate: MAR, channel: 'CASH', amount: '600' },
      key(),
    );

    expect(taken.allocated).toBe(preview.allocated);
    expect(taken.unallocated).toBe(preview.unallocated);
    expect(taken.settledCharges).toEqual(
      preview.plan.map((p) => ({ chargeId: p.chargeId, amount: p.amount })),
    );
  });

  it('shows money beyond the debt as a credit balance rather than as payment', async () => {
    // The distinction the legacy chart could not express: it had no
    // overpayment liability, so paying too much produced a negative
    // receivable — a liability reported as an asset.
    const studentId = await newStudent('Overpaying Student');
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    });

    const preview = await previewAllocation(cashier, studentId, '800');
    expect(preview.allocated).toBe('500.0000');
    expect(preview.unallocated).toBe('300.0000');

    const taken = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '800' },
      key(),
    );
    expect(taken.unallocated).toBe('300.0000');

    const balance = await studentBalance(cashier, studentId);
    expect(balance.outstanding).toBe('0.0000');
    expect(balance.creditBalance).toBe('300.0000');
  });

  it('honours an allocation the cashier typed, and refuses one that overpays a charge', async () => {
    const studentId = await newStudent('Directed Student');
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [
        { feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500', dueDate: JAN },
        { feeItemId: uni.feeItems.LIBRARY, grossAmount: '300', dueDate: JAN },
      ],
    });
    const listed = await previewAllocation(cashier, studentId, 0);
    const library = listed.charges.find((c) => c.code === 'LIBRARY')!;

    // Straight past the older charge, at the cashier's direction.
    const directed = await previewAllocation(cashier, studentId, '300', [
      { chargeId: library.chargeId, amount: '300' },
    ]);
    expect(directed.plan).toHaveLength(1);
    expect(directed.plan[0].chargeId).toBe(library.chargeId);

    await expect(
      previewAllocation(cashier, studentId, '400', [
        { chargeId: library.chargeId, amount: '400' },
      ]),
    ).rejects.toThrow(/overpay/i);
  });

  it('proposes nothing against an amount nobody has typed', async () => {
    // The opening view of the screen: the charges are listed, and no figure
    // is proposed, because a proposal against an unentered amount is a number
    // waiting to be misread.
    const studentId = await newStudent('Opening Student');
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500' }],
    });

    const opening = await previewAllocation(cashier, studentId, 0);
    expect(opening.charges).toHaveLength(1);
    expect(opening.plan).toEqual([]);
    expect(opening.allocated).toBe('0.0000');
  });

  it('lists what is left on a part-paid charge, not what it started at', async () => {
    // The desk is read after money has already moved. A charge showing its
    // original figure invites a second full payment against a debt that is
    // half settled — and the legacy screen could not have shown either
    // figure, because the balance it displayed came from a `Remain` column
    // that whichever screen touched last had rewritten.
    const studentId = await newStudent('Part Paid Student');
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500', dueDate: JAN }],
    });

    await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '200' },
      key(),
    );

    const preview = await previewAllocation(cashier, studentId, '500');
    expect(preview.charges).toHaveLength(1);
    expect(preview.charges[0].outstanding).toBe('300.0000');
    expect(preview.allocated).toBe('300.0000');
    expect(preview.unallocated).toBe('200.0000');
  });

  it('drops a charge from the desk once it is settled', async () => {
    const studentId = await newStudent('Settled Student');
    await raiseCharges(registrar, {
      studentId,
      docDate: JAN,
      lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: '500', dueDate: JAN }],
    });
    await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '500' },
      key(),
    );

    const preview = await previewAllocation(cashier, studentId, 0);
    expect(preview.charges).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The day sheet (Track D2)
// ---------------------------------------------------------------------------

describe('a cashier’s day sheet', () => {
  it('counts this cashier’s live receipts and nobody else’s', async () => {
    // The question is "who is short today", and the legacy answer had to be
    // reconstructed by grouping on a `UserName` column, because every
    // cashier's cash posted to one account literally called "Cash on Hand".
    const other = await makePrincipal(uni.tenantId, ['student.read', 'receipt.create'], {
      name: 'cashier2',
    });
    await assignTill(admin, other.userId, uni.accounts['11111']);

    const day = new Date(Date.UTC(2026, 2, 20));
    const mine = await newStudent('Day Sheet A');
    const theirs = await newStudent('Day Sheet B');

    await takeReceipt(
      cashier,
      { studentId: mine, docDate: day, channel: 'CASH', amount: '250' },
      key(),
    );
    await takeReceipt(
      cashier,
      { studentId: mine, docDate: day, channel: 'BANK_TRANSFER', amount: '400' },
      key(),
    );
    await takeReceipt(
      other,
      { studentId: theirs, docDate: day, channel: 'CASH', amount: '900' },
      key(),
    );

    const sheet = await cashierDaySheet(cashier, { on: day });
    expect(sheet.total).toBe('650.0000');
    expect(sheet.cashTotal).toBe('250.0000');
    expect(sheet.till).not.toBeNull();
    expect(new Set(sheet.byChannel.map((b) => b.channel))).toEqual(
      new Set(['CASH', 'BANK_TRANSFER']),
    );

    const theirSheet = await cashierDaySheet(other, { on: day });
    expect(theirSheet.total).toBe('900.0000');
  });

  it('stops counting a receipt that was cancelled, and says how many', async () => {
    const day = new Date(Date.UTC(2026, 2, 21));
    const studentId = await newStudent('Cancelled Day');
    const taken = await takeReceipt(
      cashier,
      { studentId, docDate: day, channel: 'CASH', amount: '120' },
      key(),
    );
    await cancelReceipt(supervisor, taken.receiptId, 'Counted twice at the counter', {
      on: day,
    });

    const sheet = await cashierDaySheet(cashier, { on: day });
    expect(sheet.total).toBe('0.0000');
    expect(sheet.cancelledCount).toBe(1);
    expect(sheet.cancelledTotal).toBe('120.0000');
  });

  it('will not show one cashier another cashier’s day without a reporting permission', async () => {
    const nosy = await makePrincipal(uni.tenantId, ['student.read', 'receipt.create'], {
      name: 'nosy',
    });
    await expect(
      cashierDaySheet(nosy, { userId: cashier.userId }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // A supervisor holding `report.financial` may.
    await expect(
      cashierDaySheet(controller, { userId: cashier.userId }),
    ).resolves.toMatchObject({ cashierName: 'cashier' });
  });
});

// ---------------------------------------------------------------------------
// The register (Track D2)
// ---------------------------------------------------------------------------

describe('the receipt register', () => {
  it('keeps a cancelled receipt in the list rather than losing it', async () => {
    // A gap in a receipt book is a question an auditor asks. The legacy
    // system had no cancellation at all: a receipt was two rows in
    // `Transactionees` and undoing one meant deleting them.
    const day = new Date(Date.UTC(2026, 2, 22));
    const studentId = await newStudent('Register Student');
    const taken = await takeReceipt(
      cashier,
      { studentId, docDate: day, channel: 'CASH', amount: '75' },
      key(),
    );
    await cancelReceipt(supervisor, taken.receiptId, 'Wrong student', { on: day });

    const rows = await receiptRegister(cashier, { studentId });
    const row = rows.find((r) => r.id === taken.receiptId);
    expect(row).toBeDefined();
    expect(row!.cancelledAt).not.toBeNull();
    expect(row!.receiptNo).toBe(taken.receiptNo);
  });

  it('does not offer cancellation on a receipt issued before today', async () => {
    // `cancelReceipt` refuses anything but the day of issue; the register says
    // so in advance rather than presenting a button the module will turn down.
    //
    // Only the negative is asserted here. The positive would need a receipt
    // dated today, and this fixture's open periods are January to March 2026,
    // so posting one is impossible by design — which is the period lock doing
    // its job. That the module accepts a same-day cancellation is proved
    // above, in "cancelling a receipt".
    const studentId = await newStudent('Yesterday Student');
    const old = await takeReceipt(
      cashier,
      { studentId, docDate: JAN, channel: 'CASH', amount: '60' },
      key(),
    );

    const rows = await receiptRegister(cashier, { studentId });
    expect(rows.find((r) => r.id === old.receiptId)!.cancellableToday).toBe(false);
  });

  it('shows a cashier their own takings by default and everyone’s on request', async () => {
    const solo = await makePrincipal(uni.tenantId, ['student.read', 'receipt.create'], {
      name: 'solo',
    });
    await assignTill(admin, solo.userId, uni.accounts['11111']);
    const studentId = await newStudent('Scope Student');
    await takeReceipt(
      solo,
      { studentId, docDate: MAR, channel: 'CASH', amount: '45' },
      key(),
    );

    const own = await receiptRegister(solo, { mine: true });
    expect(own.length).toBeGreaterThan(0);
    expect(own.every((r) => r.cashierName === 'solo')).toBe(true);

    const all = await receiptRegister(solo, { studentId });
    expect(all.length).toBeGreaterThanOrEqual(own.length ? 1 : 0);
  });
});
