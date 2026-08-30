import { afterAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import { approveFeeSchedule, draftFeeSchedule } from '@/lib/academic/fee-matrix';
import { createStudent } from '@/lib/students/registry';
import { registerStudent } from '@/lib/registration/engine';
import { assignTill, takeReceipt } from '@/lib/cashier/receipt';
import { changeStudentStatus } from '@/lib/students/status';
import { studentBalance, statementOfAccount } from '@/lib/students/account';
import { arrears } from '@/lib/students/holds';
import {
  activateSponsorship,
  createSponsor,
  draftSponsorship,
  endSponsorship,
  listSponsorships,
  sponsorBalance,
  SponsorError,
} from '@/lib/sponsors/contracts';
import {
  raiseSponsorInvoice,
  reconcileSponsorSubledger,
  sponsorAging,
  sponsorInvoice,
  SponsorBillingError,
  takeSponsorReceipt,
  transferSponsorDefault,
} from '@/lib/sponsors/billing';
import {
  approveAward,
  awardRegister,
  createScheme,
  discountExposure,
  proposeAward,
  rejectAward,
  ScholarshipError,
  schemeBudget,
} from '@/lib/sponsors/scholarships';
import { findSodViolations } from '@/lib/auth/permissions';
import { SelfApprovalError } from '@/lib/auth/rbac';
import type { Principal } from '@/lib/auth/rbac';

/**
 * Sponsors, scholarships and discount governance (SRS Module 15, Track B6).
 *
 * The legacy baseline, verified in the sources:
 *
 *   · **A sponsor is a string in a combo box.**
 *     `CombAccType.Items.AddRange({"النفقة الخاصة", "أشقاء", "أبناء عاملين",
 *     "منحة مجانية", "أبناء شرطة"})` — five literals compiled into the Ribat
 *     registration form, concatenated into an `AcceptType` column on the
 *     student row. No counterparty, no contract, no coverage, no cap, no
 *     approval, no invoice; the student is billed in full either way.
 *
 *   · **A scholarship is one of those five literals**, with no scheme, no
 *     budget and no award register.
 *
 *   · **Discount exposure is reconstructed, not recorded.** `viewDiscount` and
 *     `viewDiscountSummary` compute it as
 *     `CollegeFees.TuitionFees - Transactions.TuitionFees` — the difference
 *     between the published fee and a posting B4 showed to be wrong.
 *
 * Every test below is one of those, negated.
 */

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

afterAll(disconnectAll);

interface Ctx {
  u: University;
  registrar: Principal;
  registryOfficer: Principal;
  sponsorOfficer: Principal;
  sponsorApprover: Principal;
  treasurer: Principal;
  defaulter: Principal;
  reporter: Principal;
  cashier: Principal;
  studentId: string;
  studentNo: string;
  ministryId: string;
  tuition: string;
  registrationFee: string;
}

/**
 * A university with tuition 1,000,000 and a one-off 50,000 registration fee,
 * one admitted student, and a ministry ready to sponsor them.
 */
async function scene(): Promise<Ctx> {
  const u = await makeUniversity();

  const setter = await makePrincipal(u.tenantId, ['feematrix.manage'], { name: 'setter' });
  const feeApprover = await makePrincipal(u.tenantId, ['feematrix.approve'], {
    name: 'feeapp',
  });
  const draft = await draftFeeSchedule(setter, {
    programmeId: u.programmeIds.MBBS,
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
    currency: 'SDG',
    effectiveFrom: D(2026, 1, 1),
    lines: [
      { feeItemId: u.feeItems.TUITION, amount: '1000000.00', sortOrder: 1 },
      {
        feeItemId: u.feeItems.REGISTRATION,
        amount: '50000.00',
        recurrence: 'ONE_OFF',
        sortOrder: 2,
      },
    ],
  });
  await approveFeeSchedule(feeApprover, draft.id);

  const registryOfficer = await makePrincipal(
    u.tenantId,
    ['student.manage', 'student.read', 'student.status', 'charge.create'],
    { name: 'registry' },
  );
  const student = await createStudent(registryOfficer, {
    studentNo: 'U-2026-0001',
    fullNameAr: 'أحمد محمد علي حسن',
    fullNameEn: 'Ahmed Mohamed Ali Hassan',
    status: 'ADMITTED',
    admittedOn: D(2026, 1, 2),
    programmeId: u.programmeIds.MBBS,
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
    nationalityId: u.nationalities.SD,
  });

  const sponsorOfficer = await makePrincipal(
    u.tenantId,
    ['sponsor.manage', 'scholarship.manage', 'student.read'],
    { name: 'sponsorofficer' },
  );

  const ministry = await createSponsor(sponsorOfficer, {
    code: 'MOHE',
    nameAr: 'وزارة التعليم العالي',
    nameEn: 'Ministry of Higher Education',
    sponsorType: 'GOVERNMENT_MINISTRY',
    paymentTermDays: 30,
  });

  const cashier = await makePrincipal(u.tenantId, ['receipt.create', 'student.read'], {
    name: 'cashier',
  });
  const tillAdmin = await makePrincipal(u.tenantId, ['coa.manage'], { name: 'tilladmin' });
  await assignTill(tillAdmin, cashier.userId, u.accounts['11111']);

  return {
    u,
    registrar: await makePrincipal(
      u.tenantId,
      ['registration.create', 'registration.read', 'student.read', 'discount.apply'],
      { name: 'registrar' },
    ),
    registryOfficer,
    sponsorOfficer,
    sponsorApprover: await makePrincipal(
      u.tenantId,
      ['sponsor.approve', 'scholarship.approve'],
      { name: 'sponsorapprover' },
    ),
    treasurer: await makePrincipal(u.tenantId, ['sponsor.invoice', 'report.financial'], {
      name: 'treasurer',
    }),
    defaulter: await makePrincipal(u.tenantId, ['sponsor.default'], { name: 'defaulter' }),
    reporter: await makePrincipal(u.tenantId, ['report.financial'], { name: 'reporter' }),
    cashier,
    studentId: student.id,
    studentNo: student.studentNo,
    ministryId: ministry.id,
    tuition: u.feeItems.TUITION,
    registrationFee: u.feeItems.REGISTRATION,
  };
}

/** A live contract covering `pct` of tuition, from 1 January. */
async function sponsorTuition(
  c: Ctx,
  pct: string,
  opts: { capAmount?: string; sponsorId?: string; feeItemId?: string | null } = {},
): Promise<string> {
  const contract = await draftSponsorship(c.sponsorOfficer, {
    sponsorId: opts.sponsorId ?? c.ministryId,
    studentId: c.studentId,
    reference: 'MOHE/2026/114',
    validFrom: D(2026, 1, 1),
    capAmount: opts.capAmount,
    lines: [
      {
        feeItemId: opts.feeItemId === undefined ? c.tuition : opts.feeItemId,
        coveragePct: pct,
      },
    ],
  });
  await activateSponsorship(c.sponsorApprover, contract.id);
  return contract.id;
}

function register(c: Ctx, on = D(2026, 1, 15)) {
  return registerStudent(c.registrar, {
    studentId: c.studentId,
    academicTermId: c.u.termIds[1],
    levelYear: 1,
    registrationDate: on,
  });
}

// ---------------------------------------------------------------------------
// Split funding — REQ-SPN-02
// ---------------------------------------------------------------------------

describe('split funding at billing time', () => {
  it('debits Sponsor AR for the sponsor and Student AR only for the student', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');

    const reg = await register(c);
    expect(reg.gross).toBe('1050000.0000');

    const lines = await asSystem((tx) =>
      tx.transactionLine.findMany({
        where: { headerId: reg.headerId! },
        select: {
          debitAmount: true,
          creditAmount: true,
          subledgerType: true,
          subledgerId: true,
        },
      }),
    );

    const studentDr = lines
      .filter((l) => l.subledgerType === 'STUDENT')
      .reduce((t, l) => t + Number(l.debitAmount), 0);
    const sponsorDr = lines
      .filter((l) => l.subledgerType === 'SPONSOR')
      .reduce((t, l) => t + Number(l.debitAmount), 0);

    // 60% of the 1,000,000 tuition. The registration fee has no coverage line
    // and the contract's only line names tuition, so the student carries it.
    expect(sponsorDr).toBeCloseTo(600000, 4);
    expect(studentDr).toBeCloseTo(450000, 4);
    expect(studentDr + sponsorDr).toBeCloseTo(1050000, 4);

    const sponsorLine = lines.find((l) => l.subledgerType === 'SPONSOR');
    expect(sponsorLine?.subledgerId).toBe(c.ministryId);
  });

  it("shows only the student's own debt on their statement and balance", async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);

    const balance = await studentBalance(c.registryOfficer, c.studentId);
    expect(balance.charged).toBe('450000.0000');
    expect(balance.outstanding).toBe('450000.0000');

    const statement = await statementOfAccount(c.registryOfficer, c.studentId, {
      from: D(2026, 1, 1),
      to: D(2026, 3, 1),
    });
    const tuitionLine = statement.lines.find((l) => l.description.includes('Tuition'));
    expect(tuitionLine?.debit).toBe('400000.0000');
    expect(tuitionLine?.description).toContain('sponsored');
  });

  it('is not arrears for the student when the sponsor is the one who has not paid', async () => {
    const c = await scene();
    await sponsorTuition(c, '100', { feeItemId: null });
    await register(c);

    const position = await arrears(c.registryOfficer, c.studentId, D(2026, 3, 1));
    expect(position.outstanding).toBe('0.0000');

    const sponsor = await asTenant(c.u.tenantId, (tx) =>
      sponsorBalance(tx, c.u.tenantId, c.ministryId),
    );
    expect(sponsor.outstanding).toBe('1050000.0000');
  });

  it('caps a share at the contract ceiling and leaves the rest with the student', async () => {
    const c = await scene();
    await sponsorTuition(c, '100', { capAmount: '400000' });
    await register(c);

    const charge = await asSystem((tx) =>
      tx.studentCharge.findFirstOrThrow({
        where: { studentId: c.studentId, feeItemId: c.tuition },
        select: { netAmount: true, sponsoredAmount: true },
      }),
    );
    expect(charge.netAmount.toFixed(4)).toBe('1000000.0000');
    expect(charge.sponsoredAmount.toFixed(4)).toBe('400000.0000');

    const contract = await listSponsorships(c.sponsorOfficer, { studentId: c.studentId });
    expect(contract[0].consumedAmount).toBe('400000.0000');
  });

  it('never lets two sponsors between them cover more than the charge', async () => {
    const c = await scene();
    const second = await createSponsor(c.sponsorOfficer, {
      code: 'EMBASSY',
      nameAr: 'السفارة',
      nameEn: 'Embassy of Somewhere',
      sponsorType: 'EMBASSY',
    });

    await sponsorTuition(c, '70');
    await sponsorTuition(c, '70', { sponsorId: second.id });
    await register(c);

    const charge = await asSystem((tx) =>
      tx.studentCharge.findFirstOrThrow({
        where: { studentId: c.studentId, feeItemId: c.tuition },
        select: { sponsoredAmount: true },
      }),
    );
    // 70% + 70% is not 140%. The first contract takes 700,000, the second
    // takes what is left.
    expect(charge.sponsoredAmount.toFixed(4)).toBe('1000000.0000');

    const shares = await asSystem((tx) =>
      tx.chargeSponsorship.findMany({
        where: { tenantId: c.u.tenantId },
        select: { amount: true, sponsorId: true },
      }),
    );
    expect(shares.map((s) => s.amount.toFixed(4)).sort()).toEqual([
      '300000.0000',
      '700000.0000',
    ]);
  });

  it('funds nothing from a draft contract, and nothing outside its dates', async () => {
    const c = await scene();
    const contract = await draftSponsorship(c.sponsorOfficer, {
      sponsorId: c.ministryId,
      studentId: c.studentId,
      validFrom: D(2026, 1, 1),
      lines: [{ feeItemId: c.tuition, coveragePct: '100' }],
    });

    const reg = await register(c);
    const beforeApproval = await asSystem((tx) =>
      tx.studentCharge.aggregate({
        where: { studentId: c.studentId },
        _sum: { sponsoredAmount: true },
      }),
    );
    expect(Number(beforeApproval._sum.sponsoredAmount)).toBe(0);
    expect(reg.status).toBe('REGISTERED');

    // And a contract that has ended stops funding from the day it ended.
    await activateSponsorship(c.sponsorApprover, contract.id);
    await endSponsorship(c.sponsorOfficer, contract.id, 'Grant exhausted', D(2026, 1, 31));

    const shares = await asTenant(c.u.tenantId, (tx) =>
      tx.sponsorship.findUniqueOrThrow({
        where: { id: contract.id },
        select: { status: true, validTo: true },
      }),
    );
    expect(shares.status).toBe('ENDED');
  });

  it('refuses two overlapping contracts from one sponsor for one student', async () => {
    const c = await scene();
    await sponsorTuition(c, '50');
    await expect(sponsorTuition(c, '50')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Contracts — REQ-SPN-01
// ---------------------------------------------------------------------------

describe('sponsorship contracts', () => {
  it('needs a second signature before it funds anything', async () => {
    const c = await scene();
    const contract = await draftSponsorship(c.sponsorOfficer, {
      sponsorId: c.ministryId,
      studentId: c.studentId,
      validFrom: D(2026, 1, 1),
      lines: [{ feeItemId: c.tuition, coveragePct: '100' }],
    });

    // The person who wrote the terms may not put them into force, even given
    // both permissions.
    const both = await makePrincipal(
      c.u.tenantId,
      ['sponsor.manage', 'sponsor.approve'],
      { name: 'both' },
    );
    // A different sponsor, because one sponsor may not hold two overlapping
    // contracts for one student — see the exclusion constraint below.
    const other = await createSponsor(c.sponsorOfficer, {
      code: 'FOUND',
      nameAr: 'مؤسسة',
      nameEn: 'A foundation',
      sponsorType: 'FOUNDATION',
    });
    const theirs = await draftSponsorship(both, {
      sponsorId: other.id,
      studentId: c.studentId,
      validFrom: D(2027, 1, 1),
      lines: [{ feeItemId: c.tuition, coveragePct: '50' }],
    });
    await expect(activateSponsorship(both, theirs.id)).rejects.toThrow(SelfApprovalError);

    await activateSponsorship(c.sponsorApprover, contract.id);
    const listed = await listSponsorships(c.sponsorOfficer, { studentId: c.studentId });
    expect(listed.find((l) => l.id === contract.id)?.status).toBe('ACTIVE');
  });

  it('keeps setting the terms and approving them in different hands', async () => {
    expect(findSodViolations(['sponsor.manage', 'sponsor.approve'])).toHaveLength(1);
    expect(findSodViolations(['sponsor.invoice', 'sponsor.default'])).toHaveLength(1);
    expect(findSodViolations(['scholarship.manage', 'scholarship.approve'])).toHaveLength(1);
  });

  it('refuses a contract with no coverage lines, and a coverage of zero', async () => {
    const c = await scene();
    await expect(
      draftSponsorship(c.sponsorOfficer, {
        sponsorId: c.ministryId,
        studentId: c.studentId,
        validFrom: D(2026, 1, 1),
        lines: [],
      }),
    ).rejects.toThrow(SponsorError);

    await expect(
      draftSponsorship(c.sponsorOfficer, {
        sponsorId: c.ministryId,
        studentId: c.studentId,
        validFrom: D(2026, 1, 1),
        lines: [{ feeItemId: c.tuition, coveragePct: '0' }],
      }),
    ).rejects.toThrow(/not a percentage/);
  });

  it('refuses to delete a sponsor that has contracts', async () => {
    const c = await scene();
    await sponsorTuition(c, '50');
    await expect(
      asSystem((tx) => tx.sponsor.delete({ where: { id: c.ministryId } })),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Invoicing and settlement — REQ-SPN-03
// ---------------------------------------------------------------------------

describe('sponsor invoicing and settlement', () => {
  it('consolidates a period into one invoice and posts nothing', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    const reg = await register(c);

    const beforeVouchers = await asSystem((tx) =>
      tx.transactionHeader.count({ where: { tenantId: c.u.tenantId } }),
    );

    const invoice = await raiseSponsorInvoice(c.treasurer, {
      sponsorId: c.ministryId,
      periodFrom: D(2026, 1, 1),
      periodTo: D(2026, 1, 31),
      docDate: D(2026, 2, 1),
    });

    expect(invoice.invoiceNo).toBe('INV-00001');
    expect(invoice.totalAmount).toBe('600000.0000');
    expect(invoice.dueDate).toBe('2026-03-03');
    expect(invoice.studentCount).toBe(1);

    // The receivable was raised when the charge was split. An invoice that
    // posted again would bill the ministry twice.
    const afterVouchers = await asSystem((tx) =>
      tx.transactionHeader.count({ where: { tenantId: c.u.tenantId } }),
    );
    expect(afterVouchers).toBe(beforeVouchers);
    expect(reg.headerId).toBeTruthy();

    const detail = await sponsorInvoice(c.treasurer, invoice.id);
    expect(detail.lines).toHaveLength(1);
    expect(detail.lines[0].studentNo).toBe(c.studentNo);
    expect(detail.lines[0].feeItemCode).toBe('TUITION');
  });

  it('does not bill the same share twice', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);

    await raiseSponsorInvoice(c.treasurer, {
      sponsorId: c.ministryId,
      periodFrom: D(2026, 1, 1),
      periodTo: D(2026, 1, 31),
      docDate: D(2026, 2, 1),
    });

    await expect(
      raiseSponsorInvoice(c.treasurer, {
        sponsorId: c.ministryId,
        periodFrom: D(2026, 1, 1),
        periodTo: D(2026, 1, 31),
        docDate: D(2026, 2, 1),
      }),
    ).rejects.toThrow(/already invoiced/);
  });

  it('settles an invoice from a sponsor receipt and reconciles', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);
    const invoice = await raiseSponsorInvoice(c.treasurer, {
      sponsorId: c.ministryId,
      periodFrom: D(2026, 1, 1),
      periodTo: D(2026, 1, 31),
      docDate: D(2026, 2, 1),
    });

    const receipt = await takeSponsorReceipt(
      c.treasurer,
      {
        sponsorId: c.ministryId,
        docDate: D(2026, 2, 10),
        channel: 'BANK_TRANSFER',
        amount: '600000.00',
        reference: 'CBOS/2026/9981',
      },
      'sponsor-receipt-1',
    );

    expect(receipt.receiptNo).toBe('SR-00001');
    expect(receipt.allocated).toBe('600000.0000');
    expect(receipt.unallocated).toBe('0.0000');

    const detail = await sponsorInvoice(c.treasurer, invoice.id);
    expect(detail.status).toBe('SETTLED');
    expect(detail.settledAmount).toBe('600000.0000');

    const balance = await asTenant(c.u.tenantId, (tx) =>
      sponsorBalance(tx, c.u.tenantId, c.ministryId),
    );
    expect(balance.outstanding).toBe('0.0000');

    const recon = await asTenant(c.u.tenantId, (tx) =>
      reconcileSponsorSubledger(tx, c.u.tenantId),
    );
    expect(recon.ok).toBe(true);
    expect(recon.variance).toBe('0.0000');
  });

  it('replays an idempotent sponsor receipt without taking the money twice', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);

    const first = await takeSponsorReceipt(
      c.treasurer,
      {
        sponsorId: c.ministryId,
        docDate: D(2026, 2, 10),
        channel: 'BANK_TRANSFER',
        amount: '600000.00',
      },
      'sponsor-idem-1',
    );
    const second = await takeSponsorReceipt(
      c.treasurer,
      {
        sponsorId: c.ministryId,
        docDate: D(2026, 2, 10),
        channel: 'BANK_TRANSFER',
        amount: '600000.00',
      },
      'sponsor-idem-1',
    );

    expect(second.id).toBe(first.id);
    const count = await asSystem((tx) =>
      tx.sponsorReceipt.count({ where: { tenantId: c.u.tenantId } }),
    );
    expect(count).toBe(1);
  });

  it('ages a sponsor from the invoice due date, not the charge date', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);

    // Uninvoiced: the ministry has not been asked for anything yet, so it is
    // current however old the charge is.
    const uninvoiced = await sponsorAging(c.treasurer, D(2026, 3, 1));
    expect(uninvoiced.rows[0].buckets[0]).toBe('600000.0000');

    await raiseSponsorInvoice(c.treasurer, {
      sponsorId: c.ministryId,
      periodFrom: D(2026, 1, 1),
      periodTo: D(2026, 1, 31),
      docDate: D(2026, 2, 1),
      dueDate: D(2026, 2, 15),
    });

    const aged = await sponsorAging(c.treasurer, D(2026, 4, 20));
    // 64 days past 15 February.
    expect(aged.rows[0].buckets[2]).toBe('600000.0000');
    expect(aged.total).toBe('600000.0000');
  });

  it('refuses an allocation larger than the share still owed', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);
    const share = await asSystem((tx) =>
      tx.chargeSponsorship.findFirstOrThrow({
        where: { tenantId: c.u.tenantId },
        select: { id: true },
      }),
    );

    await expect(
      takeSponsorReceipt(
        c.treasurer,
        {
          sponsorId: c.ministryId,
          docDate: D(2026, 2, 10),
          channel: 'BANK_TRANSFER',
          amount: '900000.00',
          allocations: [{ chargeSponsorshipId: share.id, amount: '900000.00' }],
        },
        'sponsor-over-1',
      ),
    ).rejects.toThrow(SponsorBillingError);
  });
});

// ---------------------------------------------------------------------------
// Default — REQ-SPN-03
// ---------------------------------------------------------------------------

describe('sponsor default', () => {
  it('moves the uncollected balance onto the student without forgiving it', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);

    const before = await studentBalance(c.registryOfficer, c.studentId);
    expect(before.outstanding).toBe('450000.0000');

    const result = await transferSponsorDefault(c.defaulter, {
      sponsorId: c.ministryId,
      reason: 'Ministry allocation withdrawn for the 2026 intake',
      docDate: D(2026, 3, 1),
    });

    expect(result.transferred).toBe('600000.0000');
    expect(result.studentsAffected).toBe(1);

    const after = await studentBalance(c.registryOfficer, c.studentId);
    expect(after.outstanding).toBe('1050000.0000');

    const sponsor = await asTenant(c.u.tenantId, (tx) =>
      sponsorBalance(tx, c.u.tenantId, c.ministryId),
    );
    expect(sponsor.outstanding).toBe('0.0000');
    expect(sponsor.writtenBack).toBe('600000.0000');

    // The debt changed counterparty; it was not written off. Both control
    // accounts still agree with their sub-ledgers.
    const recon = await asTenant(c.u.tenantId, (tx) =>
      reconcileSponsorSubledger(tx, c.u.tenantId),
    );
    expect(recon.ok).toBe(true);
  });

  it('transfers only what is still uncollected', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);
    await takeSponsorReceipt(
      c.treasurer,
      {
        sponsorId: c.ministryId,
        docDate: D(2026, 2, 10),
        channel: 'BANK_TRANSFER',
        amount: '250000.00',
      },
      'partial-1',
    );

    const result = await transferSponsorDefault(c.defaulter, {
      sponsorId: c.ministryId,
      reason: 'Ministry stopped paying',
      docDate: D(2026, 3, 1),
    });
    expect(result.transferred).toBe('350000.0000');

    const after = await studentBalance(c.registryOfficer, c.studentId);
    expect(after.outstanding).toBe('800000.0000');
  });

  it('requires a reason, and a permission the treasurer does not hold', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);

    await expect(
      transferSponsorDefault(c.defaulter, { sponsorId: c.ministryId, reason: '  ' }),
    ).rejects.toThrow(SponsorBillingError);

    await expect(
      transferSponsorDefault(c.treasurer, {
        sponsorId: c.ministryId,
        reason: 'Trying it on',
      }),
    ).rejects.toThrow(/sponsor.default/);
  });
});

// ---------------------------------------------------------------------------
// The B5 deferral: sponsor-funded withdrawal
// ---------------------------------------------------------------------------

describe('a sponsored student withdrawing', () => {
  it('apportions the retained portion between student and sponsor', async () => {
    const c = await scene();
    await sponsorTuition(c, '60', { feeItemId: null });
    await register(c);

    // 1,050,000 billed: 630,000 sponsor, 420,000 student.
    const billed = await asSystem((tx) =>
      tx.studentCharge.aggregate({
        where: { studentId: c.studentId },
        _sum: { sponsoredAmount: true },
      }),
    );
    expect(Number(billed._sum.sponsoredAmount)).toBeCloseTo(630000, 4);

    // Withdrawing on day 19 refunds 50% of refundable items; the registration
    // fee is refundable in the shipped catalogue, so half of everything.
    const result = await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'WITHDRAWN',
      effectiveDate: D(2026, 1, 20),
      reason: 'Family relocation',
      approvedById: c.sponsorApprover.userId,
    });
    expect(result.amountRetained).toBe('525000.0000');

    // The retention re-splits in the contract's own proportions rather than
    // landing wholly on the student — the deferral B5 recorded.
    const retained = await asSystem((tx) =>
      tx.studentCharge.aggregate({
        where: { studentId: c.studentId, reversedAt: null },
        _sum: { netAmount: true, sponsoredAmount: true },
      }),
    );
    expect(Number(retained._sum.netAmount)).toBeCloseTo(525000, 4);
    expect(Number(retained._sum.sponsoredAmount)).toBeCloseTo(315000, 4);

    const balance = await studentBalance(c.registryOfficer, c.studentId);
    expect(balance.charged).toBe('210000.0000');

    const recon = await asTenant(c.u.tenantId, (tx) =>
      reconcileSponsorSubledger(tx, c.u.tenantId),
    );
    expect(recon.ok).toBe(true);
  });

  it('hands the contract cap back when a term is reversed', async () => {
    const c = await scene();
    const contractId = await sponsorTuition(c, '100', { capAmount: '1000000' });
    await register(c);

    const consumed = await asSystem((tx) =>
      tx.sponsorship.findUniqueOrThrow({
        where: { id: contractId },
        select: { consumedAmount: true },
      }),
    );
    expect(consumed.consumedAmount.toFixed(4)).toBe('1000000.0000');

    await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'DEFERRED',
      effectiveDate: D(2026, 2, 10),
      reason: 'Medical deferral',
      approvedById: c.sponsorApprover.userId,
    });

    const afterward = await asSystem((tx) =>
      tx.sponsorship.findUniqueOrThrow({
        where: { id: contractId },
        select: { consumedAmount: true },
      }),
    );
    expect(afterward.consumedAmount.toFixed(4)).toBe('0.0000');
  });
});

// ---------------------------------------------------------------------------
// Scholarships — REQ-SPN-04
// ---------------------------------------------------------------------------

describe('scholarship schemes and awards', () => {
  it('refuses an award that would exceed the scheme budget', async () => {
    const c = await scene();
    const scheme = await createScheme(c.sponsorOfficer, {
      code: 'MERIT',
      nameAr: 'منحة التفوق',
      nameEn: 'Merit scholarship',
      budgetCap: '500000',
    });

    const first = await proposeAward(c.sponsorOfficer, {
      schemeId: scheme.id,
      studentId: c.studentId,
      amount: '400000',
      reason: 'Top of the entry cohort',
    });
    const approved = await approveAward(c.sponsorApprover, first.id);
    expect(approved.remaining).toBe('100000.0000');

    const other = await createStudent(c.registryOfficer, {
      studentNo: 'U-2026-0002',
      fullNameAr: 'سارة عثمان محمد أحمد',
      fullNameEn: 'Sara Osman Mohamed Ahmed',
      status: 'ADMITTED',
      admittedOn: D(2026, 1, 2),
      programmeId: c.u.programmeIds.MBBS,
      batchId: c.u.batchId,
      admissionCategoryId: c.u.admissionCategories.GENERAL,
    });
    const second = await proposeAward(c.sponsorOfficer, {
      schemeId: scheme.id,
      studentId: other.id,
      amount: '200000',
      reason: 'Second in the cohort',
    });

    await expect(approveAward(c.sponsorApprover, second.id)).rejects.toThrow(
      /100000.00 left of a 500000.00 budget/,
    );

    const budget = await schemeBudget(c.sponsorOfficer, scheme.id);
    expect(budget.awarded).toBe('400000.0000');
    expect(budget.pendingCount).toBe(1);
  });

  it('refuses the approver who proposed it', async () => {
    const c = await scene();
    const both = await makePrincipal(
      c.u.tenantId,
      ['scholarship.manage', 'scholarship.approve', 'student.read'],
      { name: 'schboth' },
    );
    const scheme = await createScheme(both, {
      code: 'HARDSHIP',
      nameAr: 'منحة العسر',
      nameEn: 'Hardship fund',
    });
    const award = await proposeAward(both, {
      schemeId: scheme.id,
      studentId: c.studentId,
      amount: '100000',
      reason: 'Hardship',
    });
    await expect(approveAward(both, award.id)).rejects.toThrow(SelfApprovalError);
  });

  it('keeps a register, and a rejection carries its reason', async () => {
    const c = await scene();
    const scheme = await createScheme(c.sponsorOfficer, {
      code: 'STAFF',
      nameAr: 'أبناء العاملين',
      nameEn: 'Staff children',
    });
    const award = await proposeAward(c.sponsorOfficer, {
      schemeId: scheme.id,
      studentId: c.studentId,
      amount: '250000',
      reason: 'Parent employed by the university',
    });

    await expect(rejectAward(c.sponsorApprover, award.id, '  ')).rejects.toThrow(
      ScholarshipError,
    );
    await rejectAward(c.sponsorApprover, award.id, 'Employment could not be confirmed');

    const register = await awardRegister(c.sponsorOfficer, { schemeId: scheme.id });
    expect(register).toHaveLength(1);
    expect(register[0].status).toBe('REJECTED');
    expect(register[0].proposedBy).toBe('sponsorofficer');
    expect(register[0].decidedBy).toBe('sponsorapprover');
  });

  it('refuses a discount booked to a scheme the student has no award under', async () => {
    const c = await scene();
    const scheme = await createScheme(c.sponsorOfficer, {
      code: 'SIBLING',
      nameAr: 'منحة الأشقاء',
      nameEn: 'Sibling discount',
    });

    await expect(
      registerStudent(c.registrar, {
        studentId: c.studentId,
        academicTermId: c.u.termIds[1],
        levelYear: 1,
        registrationDate: D(2026, 1, 15),
        discounts: [{ feeItemId: c.tuition, amount: '50000' }],
        discountReason: 'Sibling',
        discountSchemeId: scheme.id,
      }),
    ).rejects.toThrow(/no approved award/);
  });

  it('books a discount to a scheme once the award is approved', async () => {
    const c = await scene();
    const scheme = await createScheme(c.sponsorOfficer, {
      code: 'SIBLING',
      nameAr: 'منحة الأشقاء',
      nameEn: 'Sibling discount',
      budgetCap: '1000000',
    });
    const award = await proposeAward(c.sponsorOfficer, {
      schemeId: scheme.id,
      studentId: c.studentId,
      amount: '100000',
      reason: 'Two siblings enrolled',
    });
    await approveAward(c.sponsorApprover, award.id);

    const reg = await registerStudent(c.registrar, {
      studentId: c.studentId,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      registrationDate: D(2026, 1, 15),
      discounts: [{ feeItemId: c.tuition, amount: '100000' }],
      discountReason: 'Sibling discount, award SIBLING',
      discountSchemeId: scheme.id,
    });
    expect(reg.discountSchemeId).toBe(scheme.id);
    expect(reg.discount).toBe('100000.0000');
  });

  it('refuses a discount larger than the award', async () => {
    const c = await scene();
    const scheme = await createScheme(c.sponsorOfficer, {
      code: 'SMALL',
      nameAr: 'منحة صغيرة',
      nameEn: 'Small grant',
    });
    const award = await proposeAward(c.sponsorOfficer, {
      schemeId: scheme.id,
      studentId: c.studentId,
      amount: '10000',
      reason: 'Small grant',
    });
    await approveAward(c.sponsorApprover, award.id);

    await expect(
      registerStudent(c.registrar, {
        studentId: c.studentId,
        academicTermId: c.u.termIds[1],
        levelYear: 1,
        registrationDate: D(2026, 1, 15),
        discounts: [{ feeItemId: c.tuition, amount: '90000' }],
        discountReason: 'Small grant',
        discountSchemeId: scheme.id,
      }),
    ).rejects.toThrow(/exceeds the 10000.00 awarded/);
  });

  it('refuses a hand-written award that overspends the budget', async () => {
    const c = await scene();
    const scheme = await createScheme(c.sponsorOfficer, {
      code: 'CAPPED',
      nameAr: 'محدودة',
      nameEn: 'Capped scheme',
      budgetCap: '100000',
    });
    await expect(
      asSystem((tx) =>
        tx.scholarshipScheme.update({
          where: { id: scheme.id },
          data: { awardedAmount: '200000' },
        }),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Discount exposure — REQ-SPN-04
// ---------------------------------------------------------------------------

describe('discount exposure reporting', () => {
  it('reports exposure by scheme against its budget, and names the unschemed', async () => {
    const c = await scene();
    const scheme = await createScheme(c.sponsorOfficer, {
      code: 'MERIT',
      nameAr: 'منحة التفوق',
      nameEn: 'Merit scholarship',
      budgetCap: '900000',
    });
    const award = await proposeAward(c.sponsorOfficer, {
      schemeId: scheme.id,
      studentId: c.studentId,
      amount: '200000',
      reason: 'Merit',
    });
    await approveAward(c.sponsorApprover, award.id);

    await registerStudent(c.registrar, {
      studentId: c.studentId,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      registrationDate: D(2026, 1, 15),
      discounts: [{ feeItemId: c.tuition, amount: '200000' }],
      discountReason: 'Merit award',
      discountSchemeId: scheme.id,
    });

    // A second student with a negotiated reduction and no scheme named.
    const other = await createStudent(c.registryOfficer, {
      studentNo: 'U-2026-0002',
      fullNameAr: 'سارة عثمان محمد أحمد',
      fullNameEn: 'Sara Osman Mohamed Ahmed',
      status: 'ADMITTED',
      admittedOn: D(2026, 1, 2),
      programmeId: c.u.programmeIds.MBBS,
      batchId: c.u.batchId,
      admissionCategoryId: c.u.admissionCategories.GENERAL,
    });
    await registerStudent(c.registrar, {
      studentId: other.id,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      registrationDate: D(2026, 1, 16),
      discounts: [{ feeItemId: c.tuition, amount: '50000' }],
      discountReason: 'Negotiated with the dean',
    });

    const byScheme = await discountExposure(c.reporter, 'scheme');
    expect(byScheme.totalDiscount).toBe('250000.0000');

    const merit = byScheme.rows.find((r) => r.key === scheme.id);
    expect(merit?.discount).toBe('200000.0000');
    expect(merit?.budgetCap).toBe('900000.0000');

    // The reduction nobody attached to a scheme is the figure an institution
    // needs to see most, so it is grouped rather than dropped.
    const unschemed = byScheme.rows.find((r) => r.key === 'UNSCHEMED');
    expect(unschemed?.label).toBe('No scheme named');
    expect(unschemed?.discount).toBe('50000.0000');
  });

  it('reports by faculty, programme, batch and year', async () => {
    const c = await scene();
    await registerStudent(c.registrar, {
      studentId: c.studentId,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      registrationDate: D(2026, 1, 15),
      discounts: [{ feeItemId: c.tuition, amount: '100000' }],
      discountReason: 'Negotiated',
    });

    for (const dimension of ['faculty', 'programme', 'batch', 'academicYear'] as const) {
      const report = await discountExposure(c.reporter, dimension);
      expect(report.rows).toHaveLength(1);
      expect(report.rows[0].discount).toBe('100000.0000');
      expect(report.rows[0].studentCount).toBe(1);
    }

    const byFaculty = await discountExposure(c.reporter, 'faculty');
    expect(byFaculty.rows[0].label).toBe('Faculty of Medicine');
    // 100,000 of 1,050,000.
    expect(byFaculty.rows[0].discountPct).toBe('9.5238');
  });

  it('excludes a cancelled registration — a reversed discount cost nothing', async () => {
    const c = await scene();
    const reg = await registerStudent(c.registrar, {
      studentId: c.studentId,
      academicTermId: c.u.termIds[1],
      levelYear: 1,
      registrationDate: D(2026, 1, 15),
      discounts: [{ feeItemId: c.tuition, amount: '100000' }],
      discountReason: 'Negotiated',
    });
    expect(reg.discount).toBe('100000.0000');

    await changeStudentStatus(c.registryOfficer, {
      studentId: c.studentId,
      to: 'DEFERRED',
      effectiveDate: D(2026, 2, 10),
      reason: 'Deferred',
      approvedById: c.sponsorApprover.userId,
    });

    const report = await discountExposure(c.reporter, 'faculty');
    expect(report.totalDiscount).toBe('0.0000');
  });
});

// ---------------------------------------------------------------------------
// Isolation
// ---------------------------------------------------------------------------

describe('sponsors stay inside their tenant', () => {
  it('does not show one university a sponsor of another', async () => {
    const a = await scene();
    const b = await scene();
    await sponsorTuition(a, '50');

    const seenFromB = await asTenant(b.u.tenantId, (tx) =>
      tx.sponsor.findMany({ select: { id: true } }),
    );
    expect(seenFromB.map((s) => s.id)).not.toContain(a.ministryId);

    const contractsFromB = await asTenant(b.u.tenantId, (tx) =>
      tx.sponsorship.findMany({ where: { studentId: a.studentId } }),
    );
    expect(contractsFromB).toHaveLength(0);
  });

  it('keeps the student sub-ledger tied to its control account with a sponsor in play', async () => {
    const c = await scene();
    await sponsorTuition(c, '60');
    await register(c);
    await takeReceipt(
      c.cashier,
      {
        studentId: c.studentId,
        docDate: D(2026, 1, 20),
        channel: 'CASH',
        amount: '450000.00',
      },
      'student-pays-1',
    );

    const subledger = await asSystem(async (tx) => {
      const rows = await tx.studentCharge.findMany({
        where: { tenantId: c.u.tenantId, reversedAt: null },
        select: { netAmount: true, sponsoredAmount: true, settledAmount: true },
      });
      return rows.reduce(
        (t, r) =>
          t + Number(r.netAmount) - Number(r.sponsoredAmount) - Number(r.settledAmount),
        0,
      );
    });

    const control = await asSystem(async (tx) => {
      const mapping = await tx.accountMapping.findFirstOrThrow({
        where: { tenantId: c.u.tenantId, role: 'STUDENT_AR_CONTROL' },
        select: { accountId: true },
      });
      const lines = await tx.transactionLine.findMany({
        where: { accountId: mapping.accountId, header: { tenantId: c.u.tenantId } },
        select: { debitAmount: true, creditAmount: true },
      });
      return lines.reduce(
        (t, l) => t + Number(l.debitAmount) - Number(l.creditAmount),
        0,
      );
    });

    expect(control).toBeCloseTo(subledger, 4);
    expect(control).toBeCloseTo(0, 4);
  });
});
