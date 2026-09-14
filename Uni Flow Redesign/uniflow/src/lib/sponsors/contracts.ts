import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import { toDateOnly } from '@/lib/ledger/period';
import { money, sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';
import type { SponsorBillingCycle, SponsorType } from '@/generated/prisma/enums';

/**
 * Sponsors and sponsorship contracts (SRS REQ-SPN-01/02, Track B6).
 *
 * ## The legacy sponsor is a string in a combo box
 *
 * ```vb
 * Me.CombAccType.Items.AddRange(New Object() { _
 *     "النفقة الخاصة", "أشقاء", "أبناء عاملين", "منحة مجانية", "أبناء شرطة"})
 * ```
 * (frmRegisteration.designer.vb:587 — self-funded, siblings, staff children,
 * free scholarship, police children)
 *
 * The chosen literal is concatenated into an `AcceptType` column on the
 * student row (frmRegisteration.vb:205). There is no counterparty, no
 * contract, no coverage percentage, no cap, no approval and no invoice. A
 * ministry paying for forty students is five characters of Arabic repeated
 * forty times, and the fees are billed to the students anyway.
 *
 * ## What a contract is here
 *
 * One sponsor, one student, a date range, and coverage per fee item —
 * `feeItemId` null being the fallback that covers anything, the same shape as
 * the fee matrix's nationality fallback and for the same reason. Two ceilings:
 * a per-line cap ("100% of tuition, up to 800,000") and a contract cap across
 * the whole undertaking, maintained as charges are split so that it is a
 * control rather than a figure somebody reconciles later.
 *
 * Two signatures, as with a fee schedule: whoever writes the coverage terms
 * does not put them into force. One person otherwise commits the institution
 * to funding it never agreed to.
 */

export class SponsorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SponsorError';
  }
}

// ---------------------------------------------------------------------------
// Sponsor master (REQ-SPN-01)
// ---------------------------------------------------------------------------

export interface CreateSponsorInput {
  code: string;
  nameAr: string;
  nameEn: string;
  sponsorType: SponsorType;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  billingAddress?: string | null;
  billingCycle?: SponsorBillingCycle;
  paymentTermDays?: number;
}

export async function createSponsor(
  principal: Principal,
  input: CreateSponsorInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'sponsor.manage');

  const code = input.code?.trim().toUpperCase();
  if (!code) throw new SponsorError('A sponsor needs a code.');
  if (!input.nameAr?.trim() || !input.nameEn?.trim()) {
    throw new SponsorError(
      'A sponsor needs a name in both Arabic and English. An invoice to a ministry is ' +
        'issued in Arabic and audited in English.',
    );
  }
  const terms = input.paymentTermDays ?? 30;
  if (!Number.isInteger(terms) || terms < 0) {
    throw new SponsorError('Payment terms are a whole number of days.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const clash = await tx.sponsor.findFirst({
      where: { tenantId: principal.tenantId, code },
      select: { nameEn: true },
    });
    if (clash) {
      throw new SponsorError(
        `Sponsor code ${code} already belongs to ${clash.nameEn}. Codes are how invoices ` +
          `and receipts refer to a counterparty, so they cannot be shared.`,
      );
    }

    const sponsor = await tx.sponsor.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        sponsorType: input.sponsorType,
        contactName: input.contactName?.trim() || null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        billingAddress: input.billingAddress?.trim() || null,
        billingCycle: input.billingCycle ?? 'PER_TERM',
        paymentTermDays: terms,
        createdById: principal.userId,
      },
      select: { id: true, code: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'sponsor',
      resourceId: sponsor.id,
      after: { code, nameEn: input.nameEn.trim(), sponsorType: input.sponsorType },
    });

    return sponsor;
  });
}

export async function deactivateSponsor(
  principal: Principal,
  sponsorId: string,
  reason: string,
): Promise<void> {
  requirePermission(principal, 'sponsor.manage');
  const trimmed = reason?.trim();
  if (!trimmed) throw new SponsorError('Deactivating a sponsor requires a reason.');

  await withTenant(principal.tenantId, async (tx) => {
    const sponsor = await tx.sponsor.findUnique({
      where: { id: sponsorId },
      select: { tenantId: true, code: true, isActive: true },
    });
    if (!sponsor || sponsor.tenantId !== principal.tenantId) {
      throw new SponsorError('That sponsor does not belong to this university.');
    }

    // Deactivated, never deleted — the trigger refuses a delete once contracts
    // exist, because the ledger still refers to the counterparty.
    await tx.sponsor.update({ where: { id: sponsorId }, data: { isActive: false } });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'sponsor',
      resourceId: sponsorId,
      before: { isActive: sponsor.isActive },
      after: { isActive: false, code: sponsor.code, reason: trimmed },
    });
  });
}

// ---------------------------------------------------------------------------
// Contracts (REQ-SPN-01)
// ---------------------------------------------------------------------------

export interface SponsorshipLineInput {
  /** Null or omitted covers any fee item. */
  feeItemId?: string | null;
  /** 0-100. */
  coveragePct: MoneyInput;
  /** Ceiling per charge under this line. */
  capAmount?: MoneyInput | null;
}

export interface DraftSponsorshipInput {
  sponsorId: string;
  studentId: string;
  reference?: string | null;
  validFrom: Date;
  validTo?: Date | null;
  /** Ceiling across the whole contract. */
  capAmount?: MoneyInput | null;
  lines: SponsorshipLineInput[];
}

export async function draftSponsorship(
  principal: Principal,
  input: DraftSponsorshipInput,
): Promise<{ id: string; lineCount: number }> {
  requirePermission(principal, 'sponsor.manage');

  if (input.lines.length === 0) {
    throw new SponsorError(
      'A contract with no coverage lines funds nothing, and looks exactly like a contract.',
    );
  }

  const validFrom = toDateOnly(input.validFrom);
  const validTo = input.validTo ? toDateOnly(input.validTo) : null;
  if (validTo && validTo < validFrom) {
    throw new SponsorError('The contract ends before it starts.');
  }

  const seen = new Set<string>();
  const lines = input.lines.map((l) => {
    const key = l.feeItemId ?? '*';
    if (seen.has(key)) {
      throw new SponsorError(
        key === '*'
          ? 'Two fallback lines. One row says what the contract covers by default.'
          : 'The same fee item appears twice on this contract.',
      );
    }
    seen.add(key);

    const pct = money(l.coveragePct);
    if (pct.lessThanOrEqualTo(0) || pct.greaterThan(100)) {
      throw new SponsorError(
        `Coverage of ${pct.toFixed(2)}% is not a percentage. A contract that covers ` +
          `nothing is an ended contract, not a zero one.`,
      );
    }
    const cap = l.capAmount == null ? null : toStorage(l.capAmount);
    if (cap && cap.lessThanOrEqualTo(0)) {
      throw new SponsorError('A coverage cap must be positive.');
    }
    return { feeItemId: l.feeItemId ?? null, coveragePct: toStorage(pct), capAmount: cap };
  });

  const contractCap = input.capAmount == null ? null : toStorage(input.capAmount);
  if (contractCap && contractCap.lessThanOrEqualTo(0)) {
    throw new SponsorError('A contract cap must be positive.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const sponsor = await tx.sponsor.findFirst({
      where: { id: input.sponsorId, tenantId: principal.tenantId },
      select: { id: true, code: true, isActive: true },
    });
    if (!sponsor) throw new SponsorError('That sponsor does not belong to this university.');
    if (!sponsor.isActive) {
      throw new SponsorError(
        `Sponsor ${sponsor.code} is deactivated. Reactivate it before writing new contracts.`,
      );
    }

    const student = await tx.student.findFirst({
      where: { id: input.studentId, tenantId: principal.tenantId },
      select: { id: true, studentNo: true },
    });
    if (!student) throw new SponsorError('That student does not belong to this university.');

    for (const l of lines) {
      if (!l.feeItemId) continue;
      const item = await tx.feeItem.findFirst({
        where: { id: l.feeItemId, tenantId: principal.tenantId },
        select: { code: true, isActive: true },
      });
      if (!item) throw new SponsorError('A coverage line names an unknown fee item.');
      if (!item.isActive) {
        throw new SponsorError(`Fee item ${item.code} is deactivated and cannot be covered.`);
      }
    }

    const sponsorship = await tx.sponsorship.create({
      data: {
        tenantId: principal.tenantId,
        sponsorId: sponsor.id,
        studentId: student.id,
        reference: input.reference?.trim() || null,
        validFrom,
        validTo,
        capAmount: contractCap,
        status: 'DRAFT',
        createdById: principal.userId,
        lines: {
          create: lines.map((l) => ({
            tenantId: principal.tenantId,
            feeItemId: l.feeItemId,
            coveragePct: l.coveragePct,
            capAmount: l.capAmount,
          })),
        },
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'sponsorship',
      resourceId: sponsorship.id,
      after: {
        sponsor: sponsor.code,
        studentNo: student.studentNo,
        validFrom: iso(validFrom),
        validTo: validTo ? iso(validTo) : null,
        capAmount: contractCap?.toFixed(4) ?? null,
        lines: lines.length,
      },
    });

    return { id: sponsorship.id, lineCount: lines.length };
  });
}

/**
 * Put a contract into force.
 *
 * The second signature. Until this happens the contract funds nothing — a
 * draft is refused by `resolveCoverage` as firmly as an expired one, so a
 * contract somebody typed but nobody approved cannot quietly start paying
 * students' fees.
 */
export async function activateSponsorship(
  principal: Principal,
  sponsorshipId: string,
): Promise<void> {
  requirePermission(principal, 'sponsor.approve');

  await withTenant(principal.tenantId, async (tx) => {
    const s = await tx.sponsorship.findUnique({
      where: { id: sponsorshipId },
      select: {
        tenantId: true,
        status: true,
        createdById: true,
        sponsor: { select: { code: true } },
        student: { select: { studentNo: true } },
        lines: { select: { id: true } },
      },
    });
    if (!s || s.tenantId !== principal.tenantId) {
      throw new SponsorError('That contract does not belong to this university.');
    }
    if (s.status !== 'DRAFT') {
      throw new SponsorError(`That contract is already ${s.status.toLowerCase()}.`);
    }
    if (s.lines.length === 0) {
      throw new SponsorError('A contract with no coverage lines cannot be activated.');
    }
    assertNotSelfApproval(principal, s.createdById, `${s.sponsor.code}/${s.student.studentNo}`);

    await tx.sponsorship.update({
      where: { id: sponsorshipId },
      data: {
        status: 'ACTIVE',
        approvedById: principal.userId,
        approvedAt: new Date(),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'sponsorship',
      resourceId: sponsorshipId,
      after: { sponsor: s.sponsor.code, studentNo: s.student.studentNo, status: 'ACTIVE' },
    });
  });
}

/**
 * End a contract.
 *
 * Ended rather than deleted, and the date range it was in force for is
 * retained: charges already split under it stay attributed to the sponsor,
 * which is the whole reason the contract is effective-dated.
 */
export async function endSponsorship(
  principal: Principal,
  sponsorshipId: string,
  reason: string,
  endedOn?: Date,
): Promise<void> {
  requirePermission(principal, 'sponsor.manage');
  const trimmed = reason?.trim();
  if (!trimmed) throw new SponsorError('Ending a contract requires a stated reason.');

  await withTenant(principal.tenantId, async (tx) => {
    const s = await tx.sponsorship.findUnique({
      where: { id: sponsorshipId },
      select: {
        tenantId: true,
        status: true,
        validFrom: true,
        validTo: true,
        sponsor: { select: { code: true } },
      },
    });
    if (!s || s.tenantId !== principal.tenantId) {
      throw new SponsorError('That contract does not belong to this university.');
    }
    if (s.status === 'ENDED') throw new SponsorError('That contract has already ended.');

    const validTo = toDateOnly(endedOn ?? new Date());
    if (validTo < s.validFrom) {
      throw new SponsorError('A contract cannot end before it began.');
    }

    await tx.sponsorship.update({
      where: { id: sponsorshipId },
      data: {
        status: 'ENDED',
        validTo,
        endedAt: new Date(),
        endedReason: trimmed,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'sponsorship',
      resourceId: sponsorshipId,
      before: { status: s.status, validTo: s.validTo ? iso(s.validTo) : null },
      after: { status: 'ENDED', validTo: iso(validTo), reason: trimmed },
    });
  });
}

// ---------------------------------------------------------------------------
// The split resolver (REQ-SPN-02)
// ---------------------------------------------------------------------------

export interface CoverageShare {
  sponsorshipId: string;
  sponsorId: string;
  sponsorCode: string;
  amount: Money;
}

/**
 * How much of one billed fee line each sponsor carries, on a given day.
 *
 * Rules, in the order they apply:
 *
 *   1. Only `ACTIVE` contracts whose date range covers the day count. A draft
 *      funds nothing; an ended one funds nothing after it ended, and keeps
 *      funding the days it was in force.
 *   2. Within a contract, a line naming the fee item wins over the fallback
 *      line — most specific first, as the fee matrix resolves nationality.
 *   3. Coverage is applied to the **net** of the line (after discount), never
 *      to the gross. A sponsor pays what is charged, not what would have been
 *      charged without a scholarship the institution granted.
 *   4. Per-line cap, then contract cap, then the amount still uncovered. The
 *      combined share can never exceed the line: two sponsors covering 70%
 *      each pay 70% and 30%, in contract order, not 140%.
 */
export async function resolveCoverage(
  tx: Tx,
  tenantId: string,
  args: { studentId: string; feeItemId: string; netAmount: Money; onDate: Date },
): Promise<CoverageShare[]> {
  const day = toDateOnly(args.onDate);
  if (args.netAmount.lessThanOrEqualTo(0)) return [];

  const contracts = await tx.sponsorship.findMany({
    where: {
      tenantId,
      studentId: args.studentId,
      status: 'ACTIVE',
      validFrom: { lte: day },
      OR: [{ validTo: null }, { validTo: { gte: day } }],
    },
    orderBy: [{ validFrom: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      sponsorId: true,
      capAmount: true,
      consumedAmount: true,
      sponsor: { select: { code: true, isActive: true } },
      lines: {
        select: { feeItemId: true, coveragePct: true, capAmount: true },
      },
    },
  });

  const shares: CoverageShare[] = [];
  let uncovered = args.netAmount;

  for (const contract of contracts) {
    if (uncovered.lessThanOrEqualTo(0)) break;
    if (!contract.sponsor.isActive) continue;

    // Most specific first: a line naming this fee item, else the fallback.
    const line =
      contract.lines.find((l) => l.feeItemId === args.feeItemId) ??
      contract.lines.find((l) => l.feeItemId === null);
    if (!line) continue;

    let share = toStorage(args.netAmount.times(line.coveragePct).dividedBy(100));
    if (line.capAmount && share.greaterThan(line.capAmount)) share = line.capAmount;

    if (contract.capAmount) {
      const headroom = contract.capAmount.minus(contract.consumedAmount);
      if (headroom.lessThanOrEqualTo(0)) continue;
      if (share.greaterThan(headroom)) share = headroom;
    }

    if (share.greaterThan(uncovered)) share = uncovered;
    if (share.lessThanOrEqualTo(0)) continue;

    shares.push({
      sponsorshipId: contract.id,
      sponsorId: contract.sponsorId,
      sponsorCode: contract.sponsor.code,
      amount: share,
    });
    uncovered = uncovered.minus(share);
  }

  return shares;
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface SponsorshipSummary {
  id: string;
  sponsorCode: string;
  sponsorNameEn: string;
  studentNo: string;
  studentNameEn: string;
  reference: string | null;
  status: string;
  validFrom: string;
  validTo: string | null;
  capAmount: string | null;
  consumedAmount: string;
  lines: Array<{ feeItemCode: string | null; coveragePct: string; capAmount: string | null }>;
}

export async function listSponsorships(
  principal: Principal,
  filter: { sponsorId?: string; studentId?: string; activeOnly?: boolean } = {},
): Promise<SponsorshipSummary[]> {
  requirePermission(principal, 'sponsor.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.sponsorship.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(filter.sponsorId ? { sponsorId: filter.sponsorId } : {}),
        ...(filter.studentId ? { studentId: filter.studentId } : {}),
        ...(filter.activeOnly ? { status: 'ACTIVE' } : {}),
      },
      orderBy: [{ validFrom: 'desc' }],
      select: {
        id: true,
        reference: true,
        status: true,
        validFrom: true,
        validTo: true,
        capAmount: true,
        consumedAmount: true,
        sponsor: { select: { code: true, nameEn: true } },
        student: { select: { studentNo: true, fullNameEn: true } },
      },
    });

    const lineRows = await tx.sponsorshipLine.findMany({
      where: { sponsorshipId: { in: rows.map((r) => r.id) } },
      select: {
        sponsorshipId: true,
        coveragePct: true,
        capAmount: true,
        feeItem: { select: { code: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      sponsorCode: r.sponsor.code,
      sponsorNameEn: r.sponsor.nameEn,
      studentNo: r.student.studentNo,
      studentNameEn: r.student.fullNameEn,
      reference: r.reference,
      status: r.status,
      validFrom: iso(r.validFrom),
      validTo: r.validTo ? iso(r.validTo) : null,
      capAmount: r.capAmount?.toFixed(4) ?? null,
      consumedAmount: r.consumedAmount.toFixed(4),
      lines: lineRows
        .filter((l) => l.sponsorshipId === r.id)
        .map((l) => ({
          feeItemCode: l.feeItem?.code ?? null,
          coveragePct: l.coveragePct.toFixed(4),
          capAmount: l.capAmount?.toFixed(4) ?? null,
        })),
    }));
  });
}

/** What a sponsor still owes, across every student they cover. */
export async function sponsorBalance(
  tx: Tx,
  tenantId: string,
  sponsorId: string,
): Promise<{ billed: string; settled: string; writtenBack: string; outstanding: string }> {
  const shares = await tx.chargeSponsorship.findMany({
    where: { tenantId, sponsorId, charge: { reversedAt: null } },
    select: { amount: true, settledAmount: true, writtenBackAmount: true },
  });

  const billed = sum(shares.map((s) => s.amount));
  const settled = sum(shares.map((s) => s.settledAmount));
  const writtenBack = sum(shares.map((s) => s.writtenBackAmount));

  return {
    billed: billed.toFixed(4),
    settled: settled.toFixed(4),
    writtenBack: writtenBack.toFixed(4),
    outstanding: billed.minus(settled).minus(writtenBack).toFixed(4),
  };
}

export { ZERO };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
