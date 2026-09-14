/**
 * Cheque clearing pipeline (Track A4, SRS Module 7).
 *
 * The legacy implementation was one boolean. `CheqClear` sat on the
 * `Transactions` row and was flipped by clicking a grid cell, which ran
 * `UPDATE Transactions SET CheqClear=1` and nothing else
 * (frmCheqClearingSystem.vb:71-95). Three defects followed, all of them live:
 *
 *   1. `0` rendered as "Rejected", and `0` was also the initial value — so
 *      every cheque merely waiting in the drawer displayed as bounced;
 *   2. clearing a cheque never moved the bank balance, because there was no
 *      ledger entry;
 *   3. a bounced cheque never reinstated the student's debt, so a student
 *      whose cheque the bank refused still showed as paid.
 *
 * Each of those has a test here that fails if it comes back.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { Principal } from '@/lib/auth/rbac';
import { ForbiddenError, MfaRequiredError } from '@/lib/auth/rbac';
import { findSodViolations } from '@/lib/auth/permissions';
import { verifyChain } from '@/lib/audit/log';
import { createStudent } from '@/lib/students/registry';
import { raiseCharges } from '@/lib/billing/charge';
import { assignTill, takeReceipt } from '@/lib/cashier/receipt';
import {
  bounceCheque,
  cancelCheque,
  chequeHistory,
  chequePortfolio,
  ChequeError,
  clearCheques,
  depositCheques,
  drawerBounceHistory,
  drawerKeyFor,
} from '@/lib/cheques/pipeline';
import {
  reconcileStudentSubledger,
  statementOfAccount,
  studentBalance,
} from '@/lib/students/account';
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
let clerk: Principal;
let supervisor: Principal;

const JAN = new Date(Date.UTC(2026, 0, 15));
const JAN_20 = new Date(Date.UTC(2026, 0, 20));
const FEB = new Date(Date.UTC(2026, 1, 10));

let seq = 0;
const key = () => randomUUID();

/** A student billed for one term, who then pays by cheque. */
async function studentWithCheque(opts: { charge?: string; pay?: string; chequeNo?: string } = {}) {
  seq += 1;
  const student = await createStudent(registrar, {
    studentNo: `CHQ-${String(seq).padStart(4, '0')}`,
    fullNameAr: 'محمد عبد الرحمن',
    fullNameEn: `Cheque Student ${seq}`,
  });
  await raiseCharges(registrar, {
    studentId: student.id,
    docDate: JAN,
    lines: [{ feeItemId: uni.feeItems.REGISTRATION, grossAmount: opts.charge ?? '5000' }],
  });
  const receipt = await takeReceipt(
    cashier,
    {
      studentId: student.id,
      docDate: JAN,
      channel: 'CHEQUE',
      amount: opts.pay ?? '5000',
      cheque: {
        chequeNo: opts.chequeNo ?? `10${String(seq).padStart(4, '0')}`,
        bank: 'Faisal Islamic Bank',
        dueDate: JAN_20,
        drawerName: 'عبد الرحمن محمد',
      },
    },
    key(),
  );

  const cheque = await asTenant(uni.tenantId, (tx) =>
    tx.cheque.findFirstOrThrow({
      where: { receiptId: receipt.receiptId },
      select: { id: true, chequeNo: true, status: true, custody: true },
    }),
  );

  return { studentId: student.id, receipt, cheque };
}

beforeAll(async () => {
  uni = await makeUniversity();

  registrar = await makePrincipal(uni.tenantId, [
    'student.read', 'student.manage', 'charge.create',
  ], { name: 'chqregistrar' });

  cashier = await makePrincipal(uni.tenantId, ['student.read', 'receipt.create'], {
    name: 'chqcashier',
  });

  // Clearing follows the bank advice, so it belongs to whoever reads it —
  // never to whoever took the paper over the counter.
  clerk = await makePrincipal(uni.tenantId, ['cheque.manage', 'charge.create'], {
    name: 'chqclerk',
  });

  supervisor = await makePrincipal(uni.tenantId, ['cheque.manage', 'cheque.cancel'], {
    name: 'chqsupervisor',
  });

  const admin = await makePrincipal(uni.tenantId, ['coa.manage'], { name: 'chqadmin' });
  await assignTill(admin, cashier.userId, uni.accounts['11111']);
});

afterAll(async () => {
  await disconnectAll();
});

// ---------------------------------------------------------------------------

describe('taking a cheque', () => {
  it('enters the portfolio, in the vault, waiting — not "Rejected"', async () => {
    // Defect 1. In the legacy system CheqClear defaulted to 0, and 0 rendered
    // as "Rejected", so every cheque in the drawer looked like it had bounced.
    const { cheque } = await studentWithCheque();
    expect(cheque.status).toBe('RECEIVED');
    expect(cheque.custody).toBe('VAULT');
  });

  it('debits cheques-on-hand, not cash and not bank', async () => {
    const { receipt } = await studentWithCheque();
    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: receipt.headerId },
        select: { debitAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(lines.find((l) => l.account.code === '11231')?.debitAmount.toFixed(2)).toBe('5000.00');
    expect(lines.find((l) => l.account.code === '11111')).toBeUndefined();
    expect(lines.find((l) => l.account.code === '11121')).toBeUndefined();
  });

  it('keeps the bank, branch, due date and drawer with the cheque', async () => {
    const { cheque } = await studentWithCheque();
    const row = await asTenant(uni.tenantId, (tx) =>
      tx.cheque.findUniqueOrThrow({
        where: { id: cheque.id },
        select: { bankName: true, dueDate: true, drawerName: true, drawerKey: true },
      }),
    );
    expect(row.bankName).toBe('Faisal Islamic Bank');
    expect(row.dueDate.toISOString().slice(0, 10)).toBe('2026-01-20');
    // Normalised, so a drawer whose name is spelled two ways is one drawer.
    expect(row.drawerKey).toBe(drawerKeyFor('عبد الرحمن محمد', 'Faisal Islamic Bank', 'x'));
  });

  it('refuses a cheque whose amount disagrees with its receipt', async () => {
    // Otherwise the ledger holds one figure in cheques-receivable and the
    // portfolio holds another, and the gap surfaces weeks later when the bank
    // statement will not reconcile.
    const { cheque } = await studentWithCheque();
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE cheques SET amount = 1 WHERE id = ${cheque.id}::uuid`,
      ),
    ).rejects.toThrow(/is for 1.0000 but its receipt is for 5000.0000/);
  });

  it('freezes the cheque number and the payer once recorded', async () => {
    // Correcting a mis-keyed cheque means cancelling it and entering it again,
    // which leaves a trail. Editing it in place does not.
    const { cheque } = await studentWithCheque();
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE cheques SET cheque_no = '999999' WHERE id = ${cheque.id}::uuid`,
      ),
    ).rejects.toThrow(/number, amount, payer/i);
  });
});

// ---------------------------------------------------------------------------

describe('deposit and clearing', () => {
  it('moves cheques from the vault to the bank, and says so in the ledger', async () => {
    const a = await studentWithCheque();
    const b = await studentWithCheque();

    const deposit = await depositCheques(clerk, [a.cheque.id, b.cheque.id], {
      bankAccountId: uni.accounts['11121'],
      docDate: JAN_20,
      reference: 'SLIP-001',
    });

    expect(deposit.chequeCount).toBe(2);
    expect(deposit.total).toBe('10000.0000');

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: deposit.headerId },
        select: { debitAmount: true, creditAmount: true, account: { select: { code: true } } },
      }),
    );
    // Custody the ledger can report: out of the safe, with the bank.
    expect(lines.find((l) => l.account.code === '11232')?.debitAmount.toFixed(2)).toBe('10000.00');
    expect(lines.find((l) => l.account.code === '11231')?.creditAmount.toFixed(2)).toBe('10000.00');

    const after = await asTenant(uni.tenantId, (tx) =>
      tx.cheque.findUniqueOrThrow({
        where: { id: a.cheque.id },
        select: { status: true, custody: true, depositAccountId: true },
      }),
    );
    expect(after.status).toBe('SENT_TO_BANK');
    expect(after.custody).toBe('WITH_BANK');
    expect(after.depositAccountId).toBe(uni.accounts['11121']);
  });

  it('moves the bank balance when a cheque clears', async () => {
    // Defect 2. The legacy screen updated a boolean; the bank account never
    // saw a penny of it.
    const { cheque } = await studentWithCheque();
    await depositCheques(clerk, [cheque.id], {
      bankAccountId: uni.accounts['11121'],
      docDate: JAN_20,
    });

    const cleared = await clearCheques(clerk, [cheque.id], {
      docDate: FEB,
      reference: 'ADVICE-77',
    });

    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: cleared.headerId },
        select: { debitAmount: true, creditAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(lines.find((l) => l.account.code === '11121')?.debitAmount.toFixed(2)).toBe('5000.00');
    expect(lines.find((l) => l.account.code === '11232')?.creditAmount.toFixed(2)).toBe('5000.00');

    const after = await asTenant(uni.tenantId, (tx) =>
      tx.cheque.findUniqueOrThrow({
        where: { id: cheque.id },
        select: { status: true, custody: true, settledOn: true },
      }),
    );
    expect(after.status).toBe('CLEARED');
    expect(after.custody).toBe('SETTLED');
    expect(after.settledOn).not.toBeNull();
  });

  it('debits each bank account for its own cheques in a mixed batch', async () => {
    const a = await studentWithCheque();
    const b = await studentWithCheque();
    await depositCheques(clerk, [a.cheque.id], {
      bankAccountId: uni.accounts['11121'],
      docDate: JAN_20,
    });
    await depositCheques(clerk, [b.cheque.id], {
      bankAccountId: uni.accounts['11111'],
      docDate: JAN_20,
    });

    const cleared = await clearCheques(clerk, [a.cheque.id, b.cheque.id], { docDate: FEB });
    const lines = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: cleared.headerId },
        select: { debitAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(lines.find((l) => l.account.code === '11121')?.debitAmount.toFixed(2)).toBe('5000.00');
    expect(lines.find((l) => l.account.code === '11111')?.debitAmount.toFixed(2)).toBe('5000.00');
  });

  it('will not clear a cheque that never went to the bank', async () => {
    const { cheque } = await studentWithCheque();
    await expect(
      clearCheques(clerk, [cheque.id], { docDate: FEB }),
    ).rejects.toThrow(/is RECEIVED; this action needs it to be SENT_TO_BANK/);
  });

  it('will not deposit the same cheque twice', async () => {
    const { cheque } = await studentWithCheque();
    await depositCheques(clerk, [cheque.id], {
      bankAccountId: uni.accounts['11121'],
      docDate: JAN_20,
    });
    await expect(
      depositCheques(clerk, [cheque.id], {
        bankAccountId: uni.accounts['11121'],
        docDate: JAN_20,
      }),
    ).rejects.toBeInstanceOf(ChequeError);
  });

  it('needs cheque.manage', async () => {
    const { cheque } = await studentWithCheque();
    await expect(
      depositCheques(cashier, [cheque.id], {
        bankAccountId: uni.accounts['11121'],
        docDate: JAN_20,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('is barred by the segregation matrix from being held with receipt.create', async () => {
    // A cashier who takes a cheque and can also mark it cleared can make a
    // payment that never arrived look settled.
    expect(findSodViolations(['receipt.create', 'cheque.manage'])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------

describe('a cheque that bounces', () => {
  it('reinstates the debt the receipt had settled', async () => {
    // Defect 3, and the worst of the three: in the legacy system a student
    // whose cheque the bank refused went on showing as paid.
    const { studentId, cheque } = await studentWithCheque({ charge: '5000', pay: '5000' });
    await depositCheques(clerk, [cheque.id], {
      bankAccountId: uni.accounts['11121'],
      docDate: JAN_20,
    });

    const before = await studentBalance(registrar, studentId);
    expect(before.outstanding).toBe('0.0000');

    const bounce = await bounceCheque(clerk, cheque.id, {
      docDate: FEB,
      reason: 'Insufficient funds',
      reasonCode: 'NSF',
    });
    expect(bounce.reinstated).toBe('5000.0000');

    const after = await studentBalance(registrar, studentId);
    expect(after.outstanding).toBe('5000.0000');
    expect(after.settled).toBe('0.0000');
  });

  it('takes an overpayment back off the credit balance rather than the receivable', async () => {
    // The bounce has to split its debit exactly as the receipt split its
    // credit, or the sub-ledger stops agreeing with its control accounts.
    const { studentId, cheque } = await studentWithCheque({ charge: '3000', pay: '5000' });

    const before = await studentBalance(registrar, studentId);
    expect(before.creditBalance).toBe('2000.0000');

    const bounce = await bounceCheque(clerk, cheque.id, {
      docDate: FEB,
      reason: 'Signature mismatch',
      reasonCode: 'SIG',
    });
    expect(bounce.reinstated).toBe('3000.0000');
    expect(bounce.creditWithdrawn).toBe('2000.0000');

    const after = await studentBalance(registrar, studentId);
    expect(after.outstanding).toBe('3000.0000');
    expect(after.creditBalance).toBe('0.0000');
  });

  it('credits whichever account the cheque was sitting in', async () => {
    const undeposited = await studentWithCheque();
    const bounceA = await bounceCheque(clerk, undeposited.cheque.id, {
      docDate: FEB,
      reason: 'Post-dated cheque refused on presentation',
    });
    const linesA = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: bounceA.headerId },
        select: { creditAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(linesA.find((l) => l.account.code === '11231')?.creditAmount.toFixed(2)).toBe('5000.00');

    const deposited = await studentWithCheque();
    await depositCheques(clerk, [deposited.cheque.id], {
      bankAccountId: uni.accounts['11121'],
      docDate: JAN_20,
    });
    const bounceB = await bounceCheque(clerk, deposited.cheque.id, {
      docDate: FEB,
      reason: 'Account closed',
    });
    const linesB = await asTenant(uni.tenantId, (tx) =>
      tx.transactionLine.findMany({
        where: { headerId: bounceB.headerId },
        select: { creditAmount: true, account: { select: { code: true } } },
      }),
    );
    expect(linesB.find((l) => l.account.code === '11232')?.creditAmount.toFixed(2)).toBe('5000.00');
  });

  it('raises the returned-cheque fee as its own charge, when asked', async () => {
    const { studentId, cheque } = await studentWithCheque();
    const bounce = await bounceCheque(clerk, cheque.id, {
      docDate: FEB,
      reason: 'Insufficient funds',
      reasonCode: 'NSF',
      penalty: { feeItemId: uni.feeItems.RETURNED_CHEQUE, amount: '250' },
    });
    expect(bounce.penaltyChargeId).not.toBeNull();

    const balance = await studentBalance(registrar, studentId);
    expect(balance.outstanding).toBe('5250.0000');
  });

  it('needs charge.create to raise the penalty, but not to record the bounce', async () => {
    const noBilling = await makePrincipal(uni.tenantId, ['cheque.manage'], { name: 'nobilling' });
    const a = await studentWithCheque();
    await expect(
      bounceCheque(noBilling, a.cheque.id, {
        docDate: FEB,
        reason: 'Insufficient funds',
        penalty: { feeItemId: uni.feeItems.RETURNED_CHEQUE, amount: '250' },
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);

    // The bounce itself is fine: it records what the bank did.
    const b = await studentWithCheque();
    await bounceCheque(noBilling, b.cheque.id, { docDate: FEB, reason: 'Insufficient funds' });
  });

  it('demands the bank’s reason', async () => {
    const { cheque } = await studentWithCheque();
    await expect(
      bounceCheque(clerk, cheque.id, { docDate: FEB, reason: '  ' }),
    ).rejects.toThrow(/reason/i);
  });

  it('stops the dishonoured receipt counting as money', async () => {
    const { studentId, cheque, receipt } = await studentWithCheque({ charge: '1000', pay: '5000' });
    await bounceCheque(clerk, cheque.id, { docDate: FEB, reason: 'Refer to drawer' });

    const row = await asTenant(uni.tenantId, (tx) =>
      tx.studentReceipt.findUniqueOrThrow({
        where: { id: receipt.receiptId },
        select: { dishonouredAt: true, cancelledAt: true, receiptNo: true, allocatedAmount: true },
      }),
    );
    // Not a cancellation: the cashier did nothing wrong, and the number stays.
    expect(row.cancelledAt).toBeNull();
    expect(row.dishonouredAt).not.toBeNull();
    expect(row.receiptNo).toBe(receipt.receiptNo);
    expect(row.allocatedAmount.toFixed(2)).toBe('0.00');

    const balance = await studentBalance(registrar, studentId);
    expect(balance.creditBalance).toBe('0.0000');
  });

  it('shows on the statement as a debit that undoes the payment', async () => {
    const { studentId, cheque } = await studentWithCheque();
    await bounceCheque(clerk, cheque.id, { docDate: FEB, reason: 'Insufficient funds' });

    const statement = await statementOfAccount(registrar, studentId);
    const kinds = statement.lines.map((l) => l.kind);
    expect(kinds).toContain('DISHONOUR');
    expect(statement.closingBalance).toBe('5000.0000');
  });

  it('cannot be bounced twice', async () => {
    const { cheque } = await studentWithCheque();
    await bounceCheque(clerk, cheque.id, { docDate: FEB, reason: 'Insufficient funds' });
    await expect(
      bounceCheque(clerk, cheque.id, { docDate: FEB, reason: 'Again' }),
    ).rejects.toThrow(/is BOUNCED/);
  });

  it('will not let an allocation be added to a dishonoured receipt', async () => {
    const { cheque, receipt, studentId } = await studentWithCheque();
    await bounceCheque(clerk, cheque.id, { docDate: FEB, reason: 'Insufficient funds' });

    const charge = await asTenant(uni.tenantId, (tx) =>
      tx.studentCharge.findFirstOrThrow({
        where: { studentId },
        select: { id: true },
      }),
    );
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`
          INSERT INTO receipt_allocations (id, tenant_id, receipt_id, charge_id, amount, created_at)
          VALUES (gen_random_uuid(), ${uni.tenantId}::uuid, ${receipt.receiptId}::uuid,
                  ${charge.id}::uuid, 100, now())
        `,
      ),
    ).rejects.toThrow(/never arrived/i);
  });
});

// ---------------------------------------------------------------------------

describe('returning a cheque to its drawer', () => {
  it('unwinds it like a bounce, but is a decision rather than a bank refusal', async () => {
    const { studentId, cheque } = await studentWithCheque();
    await cancelCheque(supervisor, cheque.id, {
      docDate: FEB,
      reason: 'Student paid cash and asked for the cheque back',
    });

    const after = await asTenant(uni.tenantId, (tx) =>
      tx.cheque.findUniqueOrThrow({
        where: { id: cheque.id },
        select: { status: true, custody: true },
      }),
    );
    expect(after.status).toBe('CANCELLED');
    expect(after.custody).toBe('RETURNED_TO_DRAWER');
    expect((await studentBalance(registrar, studentId)).outstanding).toBe('5000.0000');
  });

  it('demands a second factor', async () => {
    const noMfa = await makePrincipal(uni.tenantId, ['cheque.cancel'], {
      name: 'chqnomfa',
      mfaVerified: false,
    });
    const { cheque } = await studentWithCheque();
    await expect(
      cancelCheque(noMfa, cheque.id, { docDate: FEB, reason: 'x' }),
    ).rejects.toBeInstanceOf(MfaRequiredError);
  });

  it('refuses once the cheque is already with the bank', async () => {
    // It is out of the institution's hands; only the bank can decide now.
    const { cheque } = await studentWithCheque();
    await depositCheques(clerk, [cheque.id], {
      bankAccountId: uni.accounts['11121'],
      docDate: JAN_20,
    });
    await expect(
      cancelCheque(supervisor, cheque.id, { docDate: FEB, reason: 'Changed my mind' }),
    ).rejects.toThrow(/is SENT_TO_BANK/);
  });

  it('needs cheque.cancel, which cheque.manage alone does not give', async () => {
    const { cheque } = await studentWithCheque();
    await expect(
      cancelCheque(clerk, cheque.id, { docDate: FEB, reason: 'Not allowed' }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------

describe('the state machine', () => {
  it('refuses an illegal jump, even by direct update', async () => {
    const { cheque } = await studentWithCheque();
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE cheques SET status = 'CLEARED', custody = 'SETTLED',
                          settled_on = '2026-02-10' WHERE id = ${cheque.id}::uuid`,
      ),
    ).rejects.toThrow(/not a legal transition/i);
  });

  it('refuses to resurrect a settled cheque', async () => {
    // The legacy grid let you click Cleared and then Rejected all afternoon,
    // and kept only the last click.
    const { cheque } = await studentWithCheque();
    await bounceCheque(clerk, cheque.id, { docDate: FEB, reason: 'Insufficient funds' });
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE cheques SET status = 'RECEIVED', custody = 'VAULT',
                          settled_on = NULL WHERE id = ${cheque.id}::uuid`,
      ),
    ).rejects.toThrow(/not a legal transition/i);
  });

  it('keeps status and the whereabouts of the paper in step', async () => {
    const { cheque } = await studentWithCheque();
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE cheques SET custody = 'SETTLED' WHERE id = ${cheque.id}::uuid`,
      ),
    ).rejects.toThrow(/chk_cheque_custody_matches_status/i);
  });

  it('will not let a cheque be deleted', async () => {
    const { cheque } = await studentWithCheque();
    await expect(
      asSystem((tx) => tx.$executeRaw`DELETE FROM cheques WHERE id = ${cheque.id}::uuid`),
    ).rejects.toThrow(/cannot be deleted/i);
  });

  it('keeps the transition history append-only', async () => {
    const { cheque } = await studentWithCheque();
    await bounceCheque(clerk, cheque.id, { docDate: FEB, reason: 'Insufficient funds' });
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE cheque_events SET comment = 'nothing to see' WHERE cheque_id = ${cheque.id}::uuid`,
      ),
    ).rejects.toThrow(/append-only/i);
  });

  it('records every transition with its voucher', async () => {
    const { cheque } = await studentWithCheque();
    await depositCheques(clerk, [cheque.id], {
      bankAccountId: uni.accounts['11121'],
      docDate: JAN_20,
      reference: 'SLIP-9',
    });
    await clearCheques(clerk, [cheque.id], { docDate: FEB, reference: 'ADV-9' });

    const history = await chequeHistory(clerk, cheque.id);
    expect(history.events.map((e) => `${e.from}->${e.to}`)).toEqual([
      'RECEIVED->SENT_TO_BANK',
      'SENT_TO_BANK->CLEARED',
    ]);
    // Every transition names the voucher it posted. The legacy system posted
    // nothing at all.
    expect(history.events.every((e) => e.voucherRef !== null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------

describe('reporting', () => {
  it('lists what can go to the bank this week', async () => {
    const fresh = await makeUniversity();
    const reg = await makePrincipal(fresh.tenantId, ['student.manage', 'charge.create'], {
      name: 'portreg',
    });
    const till = await makePrincipal(fresh.tenantId, ['student.read', 'receipt.create'], {
      name: 'porttill',
    });
    const mgr = await makePrincipal(fresh.tenantId, ['cheque.manage'], { name: 'portmgr' });
    const adm = await makePrincipal(fresh.tenantId, ['coa.manage'], { name: 'portadm' });
    await assignTill(adm, till.userId, fresh.accounts['11111']);

    const student = await createStudent(reg, {
      studentNo: 'PORT-1',
      fullNameAr: 'طالب',
      fullNameEn: 'Portfolio Student',
    });
    await raiseCharges(reg, {
      studentId: student.id,
      docDate: JAN,
      lines: [{ feeItemId: fresh.feeItems.REGISTRATION, grossAmount: '9000' }],
    });
    for (const [i, due] of [JAN_20, FEB, new Date(Date.UTC(2026, 5, 1))].entries()) {
      await takeReceipt(
        till,
        {
          studentId: student.id,
          docDate: JAN,
          channel: 'CHEQUE',
          amount: '3000',
          cheque: { chequeNo: `P-${i}`, bank: 'Bank of Khartoum', dueDate: due },
        },
        key(),
      );
    }

    const dueSoon = await chequePortfolio(mgr, { status: 'RECEIVED', dueBy: FEB });
    expect(dueSoon).toHaveLength(2);
    expect(dueSoon[0].daysToDue).toBeLessThan(dueSoon[1].daysToDue);
    expect(dueSoon[0].receiptNo).toMatch(/^SRV-2026-/);
  });

  it('names the drawers who keep bouncing cheques', async () => {
    // REQ-CHQ-03. An institution that cannot answer this goes on accepting
    // paper from the same payer indefinitely.
    const fresh = await makeUniversity();
    const reg = await makePrincipal(fresh.tenantId, ['student.manage', 'charge.create'], {
      name: 'bncreg',
    });
    const till = await makePrincipal(fresh.tenantId, ['student.read', 'receipt.create'], {
      name: 'bnctill',
    });
    const mgr = await makePrincipal(fresh.tenantId, ['cheque.manage'], { name: 'bncmgr' });
    const adm = await makePrincipal(fresh.tenantId, ['coa.manage'], { name: 'bncadm' });
    await assignTill(adm, till.userId, fresh.accounts['11111']);

    const student = await createStudent(reg, {
      studentNo: 'BNC-1',
      fullNameAr: 'طالب',
      fullNameEn: 'Bounce Student',
    });
    await raiseCharges(reg, {
      studentId: student.id,
      docDate: JAN,
      lines: [{ feeItemId: fresh.feeItems.REGISTRATION, grossAmount: '9000' }],
    });

    // Same drawer, spelled two ways. One drawer, two bounces.
    for (const [i, drawer] of ['أحمد الطيب', 'احمد الطيب'].entries()) {
      const r = await takeReceipt(
        till,
        {
          studentId: student.id,
          docDate: JAN,
          channel: 'CHEQUE',
          amount: '1000',
          cheque: { chequeNo: `B-${i}`, bank: 'Omdurman Bank', dueDate: JAN_20, drawerName: drawer },
        },
        key(),
      );
      const c = await asTenant(fresh.tenantId, (tx) =>
        tx.cheque.findFirstOrThrow({ where: { receiptId: r.receiptId }, select: { id: true } }),
      );
      await bounceCheque(mgr, c.id, {
        docDate: FEB,
        reason: 'Insufficient funds',
        reasonCode: 'NSF',
      });
    }

    const repeat = await drawerBounceHistory(mgr, { minBounces: 2 });
    expect(repeat).toHaveLength(1);
    expect(repeat[0].bounces).toBe(2);
    expect(repeat[0].totalBounced).toBe('2000.0000');
    expect(repeat[0].reasons).toEqual(['NSF']);
  });
});

// ---------------------------------------------------------------------------

describe('reconciliation and isolation', () => {
  it('keeps the sub-ledger equal to its control accounts through a clearing cycle', async () => {
    const fresh = await makeUniversity();
    const reg = await makePrincipal(fresh.tenantId, ['student.manage', 'charge.create'], {
      name: 'rcnreg',
    });
    const till = await makePrincipal(fresh.tenantId, ['student.read', 'receipt.create'], {
      name: 'rcntill',
    });
    const mgr = await makePrincipal(fresh.tenantId, ['cheque.manage', 'charge.create'], {
      name: 'rcnmgr',
    });
    const sup = await makePrincipal(fresh.tenantId, ['cheque.manage', 'cheque.cancel'], {
      name: 'rcnsup',
    });
    const adm = await makePrincipal(fresh.tenantId, ['coa.manage'], { name: 'rcnadm' });
    await assignTill(adm, till.userId, fresh.accounts['11111']);

    const chequeIds: string[] = [];
    for (let i = 0; i < 8; i += 1) {
      const s = await createStudent(reg, {
        studentNo: `RC4-${i}`,
        fullNameAr: 'طالب',
        fullNameEn: `Student ${i}`,
      });
      await raiseCharges(reg, {
        studentId: s.id,
        docDate: JAN,
        lines: [{ feeItemId: fresh.feeItems.REGISTRATION, grossAmount: '4000' }],
      });
      // Some overpay, so the credit-control account is exercised too.
      const r = await takeReceipt(
        till,
        {
          studentId: s.id,
          docDate: JAN,
          channel: 'CHEQUE',
          amount: i % 3 === 0 ? '5500.75' : '4000',
          cheque: {
            chequeNo: `RC-${i}`,
            bank: 'Bank of Khartoum',
            dueDate: JAN_20,
            drawerName: `Drawer ${i % 2}`,
          },
        },
        key(),
      );
      const c = await asTenant(fresh.tenantId, (tx) =>
        tx.cheque.findFirstOrThrow({ where: { receiptId: r.receiptId }, select: { id: true } }),
      );
      chequeIds.push(c.id);
    }

    // Six go to the bank; four clear, two bounce. One of the two left in the
    // vault is handed back, one stays waiting.
    await depositCheques(mgr, chequeIds.slice(0, 6), {
      bankAccountId: fresh.accounts['11121'],
      docDate: JAN_20,
      reference: 'SLIP-RC',
    });
    await clearCheques(mgr, chequeIds.slice(0, 4), { docDate: FEB, reference: 'ADV-RC' });
    await bounceCheque(mgr, chequeIds[4], {
      docDate: FEB,
      reason: 'Insufficient funds',
      reasonCode: 'NSF',
      penalty: { feeItemId: fresh.feeItems.RETURNED_CHEQUE, amount: '250' },
    });
    await bounceCheque(mgr, chequeIds[5], { docDate: FEB, reason: 'Account closed' });
    await cancelCheque(sup, chequeIds[6], { docDate: FEB, reason: 'Replaced with a bank transfer' });

    const recon = await asTenant(fresh.tenantId, (tx) =>
      reconcileStudentSubledger(tx, fresh.tenantId),
    );
    expect(recon.receivableVariance, JSON.stringify(recon, null, 2)).toBe('0.0000');
    expect(recon.creditVariance, JSON.stringify(recon, null, 2)).toBe('0.0000');
    expect(Number(recon.subledgerReceivable)).toBeGreaterThan(0);
  });

  it('leaves an intact audit chain', async () => {
    const v = await asTenant(uni.tenantId, (tx) => verifyChain(tx, uni.tenantId));
    expect(v.ok, v.reason).toBe(true);
  });

  it('keeps cheques inside their tenant', async () => {
    const other = await makeUniversity();
    const seen = await asTenant(other.tenantId, async (tx) => ({
      cheques: await tx.cheque.count(),
      events: await tx.chequeEvent.count(),
    }));
    expect(seen.cheques).toBe(0);
    expect(seen.events).toBe(0);
  });
});
