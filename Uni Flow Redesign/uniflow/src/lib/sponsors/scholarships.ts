import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import { sum, toStorage, ZERO, type Money, type MoneyInput } from '@/lib/money';

/**
 * Scholarship schemes, awards and discount exposure (SRS REQ-SPN-04, B6).
 *
 * ## The legacy scholarship is a combo box entry
 *
 * `"منحة مجانية"` — free scholarship — is one of five string literals compiled
 * into the Ribat registration form (frmRegisteration.designer.vb:587), stored
 * as an `AcceptType` column on the student row. There is no scheme, no
 * budget, no eligibility rule, no approval and no register: nobody can say
 * how many scholarships were granted this year, what they cost, or whether
 * any authority approved them.
 *
 * ## The budget is a control, not a report
 *
 * This is the third time the system has had to say so — B2 said it about seat
 * quotas, A6 about budget lines — and the legacy build got all three wrong the
 * same way: it computed the number and consulted it nowhere. An award that
 * would exceed its scheme's budget is refused here and refused again by
 * trigger, and the scheme's `awardedAmount` is maintained as awards are
 * approved rather than totalled up afterwards.
 *
 * ## Exposure reporting rebuilds `viewDiscount` honestly
 *
 * The Ribat reports read two SQL views that reconstruct what was given away
 * as `CollegeFees.TuitionFees - Transactions.TuitionFees` — a subtraction
 * between the published fee table and a posting that B4 showed does not agree
 * with the registration it came from. The number they print is the difference
 * between the right fee and a wrong entry. Here the discount is a posted line
 * in its own expense account, so exposure is a sum rather than a
 * reconstruction.
 */

export class ScholarshipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScholarshipError';
  }
}

// ---------------------------------------------------------------------------
// Schemes
// ---------------------------------------------------------------------------

export interface CreateSchemeInput {
  code: string;
  nameAr: string;
  nameEn: string;
  academicYearId?: string | null;
  /** Omit for an uncapped scheme — a decision, not a default. */
  budgetCap?: MoneyInput | null;
  eligibilityNote?: string | null;
}

export async function createScheme(
  principal: Principal,
  input: CreateSchemeInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'scholarship.manage');

  const code = input.code?.trim().toUpperCase();
  if (!code) throw new ScholarshipError('A scheme needs a code.');
  if (!input.nameAr?.trim() || !input.nameEn?.trim()) {
    throw new ScholarshipError('A scheme needs a name in both Arabic and English.');
  }

  const budgetCap = input.budgetCap == null ? null : toStorage(input.budgetCap);
  if (budgetCap && budgetCap.lessThanOrEqualTo(0)) {
    throw new ScholarshipError('A budget of zero is an inactive scheme, not a capped one.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const clash = await tx.scholarshipScheme.findFirst({
      where: { tenantId: principal.tenantId, code },
      select: { nameEn: true },
    });
    if (clash) {
      throw new ScholarshipError(`Scheme code ${code} already belongs to ${clash.nameEn}.`);
    }

    if (input.academicYearId) {
      const year = await tx.academicYear.findFirst({
        where: { id: input.academicYearId, tenantId: principal.tenantId },
        select: { id: true },
      });
      if (!year) {
        throw new ScholarshipError('That academic year does not belong to this university.');
      }
    }

    const scheme = await tx.scholarshipScheme.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        academicYearId: input.academicYearId ?? null,
        budgetCap,
        eligibilityNote: input.eligibilityNote?.trim() || null,
        createdById: principal.userId,
      },
      select: { id: true, code: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'scholarship_scheme',
      resourceId: scheme.id,
      after: { code, nameEn: input.nameEn.trim(), budgetCap: budgetCap?.toFixed(4) ?? null },
    });

    return scheme;
  });
}

export interface SchemeBudget {
  id: string;
  code: string;
  nameEn: string;
  budgetCap: string | null;
  awarded: string;
  /** Null when the scheme is uncapped. */
  remaining: string | null;
  awardCount: number;
  /** Awards proposed but not yet decided, and what they would cost. */
  pendingCount: number;
  pendingAmount: string;
}

export async function schemeBudget(
  principal: Principal,
  schemeId: string,
): Promise<SchemeBudget> {
  requirePermission(principal, 'scholarship.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const scheme = await tx.scholarshipScheme.findUnique({
      where: { id: schemeId },
      select: {
        tenantId: true,
        id: true,
        code: true,
        nameEn: true,
        budgetCap: true,
        awardedAmount: true,
      },
    });
    if (!scheme || scheme.tenantId !== principal.tenantId) {
      throw new ScholarshipError('That scheme does not belong to this university.');
    }

    const awards = await tx.scholarshipAward.findMany({
      where: { schemeId, status: { in: ['APPROVED', 'PROPOSED'] } },
      select: { amount: true, status: true },
    });
    const pending = awards.filter((a) => a.status === 'PROPOSED');

    return {
      id: scheme.id,
      code: scheme.code,
      nameEn: scheme.nameEn,
      budgetCap: scheme.budgetCap?.toFixed(4) ?? null,
      awarded: scheme.awardedAmount.toFixed(4),
      remaining: scheme.budgetCap
        ? scheme.budgetCap.minus(scheme.awardedAmount).toFixed(4)
        : null,
      awardCount: awards.length - pending.length,
      pendingCount: pending.length,
      pendingAmount: sum(pending.map((a) => a.amount)).toFixed(4),
    };
  });
}

// ---------------------------------------------------------------------------
// Awards
// ---------------------------------------------------------------------------

export interface ProposeAwardInput {
  schemeId: string;
  studentId: string;
  academicYearId?: string | null;
  amount: MoneyInput;
  reason: string;
}

export async function proposeAward(
  principal: Principal,
  input: ProposeAwardInput,
): Promise<{ id: string }> {
  requirePermission(principal, 'scholarship.manage');

  const amount = toStorage(input.amount);
  if (amount.lessThanOrEqualTo(0)) {
    throw new ScholarshipError('An award is for a positive amount.');
  }
  const reason = input.reason?.trim();
  if (!reason) {
    throw new ScholarshipError(
      'An award needs a stated reason. The legacy build recorded a scholarship as the ' +
        'word "منحة مجانية" in a combo box, with no eligibility on file at all.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const scheme = await tx.scholarshipScheme.findFirst({
      where: { id: input.schemeId, tenantId: principal.tenantId },
      select: { id: true, code: true, isActive: true, academicYearId: true },
    });
    if (!scheme) {
      throw new ScholarshipError('That scheme does not belong to this university.');
    }
    if (!scheme.isActive) {
      throw new ScholarshipError(`Scheme ${scheme.code} is closed to new awards.`);
    }

    const student = await tx.student.findFirst({
      where: { id: input.studentId, tenantId: principal.tenantId },
      select: { id: true, studentNo: true },
    });
    if (!student) {
      throw new ScholarshipError('That student does not belong to this university.');
    }

    const award = await tx.scholarshipAward.create({
      data: {
        tenantId: principal.tenantId,
        schemeId: scheme.id,
        studentId: student.id,
        academicYearId: input.academicYearId ?? scheme.academicYearId ?? null,
        amount,
        reason,
        status: 'PROPOSED',
        proposedById: principal.userId,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'scholarship_award',
      resourceId: award.id,
      after: {
        scheme: scheme.code,
        studentNo: student.studentNo,
        amount: amount.toFixed(4),
        reason,
      },
    });

    return award;
  });
}

/**
 * Approve an award, which spends the scheme's budget.
 *
 * Refused when the scheme has not got the money, by name and by figures — the
 * check the legacy build had nowhere to perform because it had no scheme. The
 * database refuses it again at COMMIT, so a concurrent pair of approvals
 * cannot both fit into the last of a budget.
 */
export async function approveAward(
  principal: Principal,
  awardId: string,
  note?: string,
): Promise<{ schemeCode: string; awarded: string; remaining: string | null }> {
  requirePermission(principal, 'scholarship.approve');

  return withTenant(principal.tenantId, async (tx) => {
    // Serialise approvals against this scheme, so two officers cannot each
    // see the same headroom and both spend it.
    const award = await tx.scholarshipAward.findUnique({
      where: { id: awardId },
      select: {
        id: true,
        tenantId: true,
        schemeId: true,
        amount: true,
        status: true,
        proposedById: true,
        student: { select: { studentNo: true } },
      },
    });
    if (!award || award.tenantId !== principal.tenantId) {
      throw new ScholarshipError('That award does not belong to this university.');
    }
    if (award.status !== 'PROPOSED') {
      throw new ScholarshipError(`That award is already ${award.status.toLowerCase()}.`);
    }
    assertNotSelfApproval(principal, award.proposedById, award.student.studentNo);

    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(hashtextextended(${'scheme:' + award.schemeId}::text, 0))
    `;

    const scheme = await tx.scholarshipScheme.findUniqueOrThrow({
      where: { id: award.schemeId },
      select: { code: true, budgetCap: true, awardedAmount: true },
    });

    if (scheme.budgetCap) {
      const remaining = scheme.budgetCap.minus(scheme.awardedAmount);
      if (award.amount.greaterThan(remaining)) {
        throw new ScholarshipError(
          `Scheme ${scheme.code} has ${remaining.toFixed(2)} left of a ` +
            `${scheme.budgetCap.toFixed(2)} budget and this award is for ` +
            `${award.amount.toFixed(2)}. Raise the budget or reduce the award — a scheme ` +
            `that quietly overspends is a scheme with no budget.`,
        );
      }
    }

    await tx.scholarshipAward.update({
      where: { id: awardId },
      data: {
        status: 'APPROVED',
        decidedById: principal.userId,
        decidedAt: new Date(),
        decisionNote: note?.trim() || null,
      },
    });
    await tx.scholarshipScheme.update({
      where: { id: award.schemeId },
      data: { awardedAmount: { increment: award.amount } },
    });

    const after = scheme.awardedAmount.plus(award.amount);

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'scholarship_award',
      resourceId: awardId,
      after: {
        scheme: scheme.code,
        studentNo: award.student.studentNo,
        amount: award.amount.toFixed(4),
        schemeAwarded: after.toFixed(4),
        note: note?.trim() || null,
      },
    });

    return {
      schemeCode: scheme.code,
      awarded: after.toFixed(4),
      remaining: scheme.budgetCap ? scheme.budgetCap.minus(after).toFixed(4) : null,
    };
  });
}

export async function rejectAward(
  principal: Principal,
  awardId: string,
  note: string,
): Promise<void> {
  requirePermission(principal, 'scholarship.approve');
  const trimmed = note?.trim();
  if (!trimmed) {
    throw new ScholarshipError(
      'A rejected award needs a reason the student can be told and, if they wish, appeal.',
    );
  }

  await withTenant(principal.tenantId, async (tx) => {
    const award = await tx.scholarshipAward.findUnique({
      where: { id: awardId },
      select: { tenantId: true, status: true, proposedById: true },
    });
    if (!award || award.tenantId !== principal.tenantId) {
      throw new ScholarshipError('That award does not belong to this university.');
    }
    if (award.status !== 'PROPOSED') {
      throw new ScholarshipError(`That award is already ${award.status.toLowerCase()}.`);
    }
    assertNotSelfApproval(principal, award.proposedById, awardId);

    await tx.scholarshipAward.update({
      where: { id: awardId },
      data: {
        status: 'REJECTED',
        decidedById: principal.userId,
        decidedAt: new Date(),
        decisionNote: trimmed,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'scholarship_award',
      resourceId: awardId,
      after: { status: 'REJECTED', note: trimmed },
    });
  });
}

/** The award register: who has what, under which scheme. */
export interface AwardRecord {
  id: string;
  schemeCode: string;
  studentNo: string;
  studentNameEn: string;
  amount: string;
  status: string;
  reason: string;
  proposedBy: string;
  decidedBy: string | null;
}

export async function awardRegister(
  principal: Principal,
  filter: { schemeId?: string; studentId?: string; status?: 'PROPOSED' | 'APPROVED' } = {},
): Promise<AwardRecord[]> {
  requirePermission(principal, 'scholarship.manage');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.scholarshipAward.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(filter.schemeId ? { schemeId: filter.schemeId } : {}),
        ...(filter.studentId ? { studentId: filter.studentId } : {}),
        ...(filter.status ? { status: filter.status } : {}),
      },
      orderBy: [{ proposedAt: 'desc' }],
      select: {
        id: true,
        amount: true,
        status: true,
        reason: true,
        scheme: { select: { code: true } },
        student: { select: { studentNo: true, fullNameEn: true } },
        proposedBy: { select: { fullName: true } },
        decidedBy: { select: { fullName: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      schemeCode: r.scheme.code,
      studentNo: r.student.studentNo,
      studentNameEn: r.student.fullNameEn,
      amount: r.amount.toFixed(4),
      status: r.status,
      reason: r.reason,
      proposedBy: r.proposedBy.fullName,
      decidedBy: r.decidedBy?.fullName ?? null,
    }));
  });
}

/**
 * The approved award a registration's discount may be booked against.
 *
 * Called by the registration engine so that naming a scheme on a discount is
 * checked rather than decorative: the scheme must exist, the student must
 * hold an approved award under it, and the discount must not exceed what was
 * awarded.
 */
export async function assertAwardCovers(
  tx: Tx,
  tenantId: string,
  args: { schemeId: string; studentId: string; discount: Money },
): Promise<void> {
  const scheme = await tx.scholarshipScheme.findFirst({
    where: { id: args.schemeId, tenantId },
    select: { code: true, isActive: true },
  });
  if (!scheme) {
    throw new ScholarshipError('That scholarship scheme does not belong to this university.');
  }

  const awards = await tx.scholarshipAward.findMany({
    where: {
      tenantId,
      schemeId: args.schemeId,
      studentId: args.studentId,
      status: 'APPROVED',
    },
    select: { amount: true },
  });
  if (awards.length === 0) {
    throw new ScholarshipError(
      `This student holds no approved award under ${scheme.code}. A discount booked to a ` +
        `scheme nobody awarded is what makes exposure reporting fiction.`,
    );
  }

  const awarded = sum(awards.map((a) => a.amount));
  if (args.discount.greaterThan(awarded)) {
    throw new ScholarshipError(
      `A discount of ${args.discount.toFixed(2)} exceeds the ${awarded.toFixed(2)} awarded ` +
        `to this student under ${scheme.code}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Discount exposure (REQ-SPN-04)
// ---------------------------------------------------------------------------

export type ExposureDimension =
  | 'faculty'
  | 'programme'
  | 'batch'
  | 'scheme'
  | 'academicYear';

export interface ExposureRow {
  key: string;
  label: string;
  studentCount: number;
  gross: string;
  discount: string;
  net: string;
  /** Discount as a percentage of what would otherwise have been charged. */
  discountPct: string;
  /** For scheme rows: the budget the exposure is measured against. */
  budgetCap: string | null;
}

export interface ExposureReport {
  dimension: ExposureDimension;
  rows: ExposureRow[];
  totalGross: string;
  totalDiscount: string;
  totalNet: string;
}

/**
 * What the institution gave away, by whichever dimension is asked for.
 *
 * Computed from registrations, whose discount is a posted line in its own
 * expense account — not reconstructed by subtracting a posting from a fee
 * table, which is what `viewDiscount` did and why its figures could not be
 * trusted. Cancelled registrations are excluded: a discount on a term that
 * was reversed cost the institution nothing.
 */
export async function discountExposure(
  principal: Principal,
  dimension: ExposureDimension,
  filter: { academicYearId?: string; batchId?: string; facultyId?: string } = {},
): Promise<ExposureReport> {
  requirePermission(principal, 'report.financial');

  return withTenant(principal.tenantId, async (tx) => {
    const registrations = await tx.semesterRegistration.findMany({
      where: {
        tenantId: principal.tenantId,
        status: { not: 'CANCELLED' },
        ...(filter.academicYearId ? { academicYearId: filter.academicYearId } : {}),
        ...(filter.batchId ? { batchId: filter.batchId } : {}),
        ...(filter.facultyId ? { programme: { facultyId: filter.facultyId } } : {}),
      },
      select: {
        studentId: true,
        grossAmount: true,
        discountAmount: true,
        netAmount: true,
        batchId: true,
        academicYearId: true,
        discountSchemeId: true,
        programme: {
          select: { id: true, nameEn: true, faculty: { select: { id: true, nameEn: true } } },
        },
        batch: { select: { nameEn: true } },
        academicYear: { select: { code: true } },
        discountScheme: { select: { code: true, nameEn: true, budgetCap: true } },
      },
    });

    interface Bucket {
      label: string;
      students: Set<string>;
      gross: Money;
      discount: Money;
      net: Money;
      budgetCap: Money | null;
    }
    const buckets = new Map<string, Bucket>();

    for (const r of registrations) {
      let key: string;
      let label: string;
      let budgetCap: Money | null = null;

      switch (dimension) {
        case 'faculty':
          key = r.programme.faculty.id;
          label = r.programme.faculty.nameEn;
          break;
        case 'programme':
          key = r.programme.id;
          label = r.programme.nameEn;
          break;
        case 'batch':
          key = r.batchId;
          label = r.batch.nameEn;
          break;
        case 'academicYear':
          key = r.academicYearId;
          label = r.academicYear.code;
          break;
        case 'scheme':
          // Discounts with no scheme are grouped under one heading rather than
          // dropped. An institution that has given away 9% of its tuition
          // without naming a scheme needs to see that figure most of all.
          key = r.discountSchemeId ?? 'UNSCHEMED';
          label = r.discountScheme?.nameEn ?? 'No scheme named';
          budgetCap = r.discountScheme?.budgetCap ?? null;
          break;
      }

      const b =
        buckets.get(key) ??
        {
          label,
          students: new Set<string>(),
          gross: ZERO,
          discount: ZERO,
          net: ZERO,
          budgetCap,
        };
      b.students.add(r.studentId);
      b.gross = b.gross.plus(r.grossAmount);
      b.discount = b.discount.plus(r.discountAmount);
      b.net = b.net.plus(r.netAmount);
      buckets.set(key, b);
    }

    const rows: ExposureRow[] = [...buckets.entries()]
      .map(([key, b]) => ({
        key,
        label: b.label,
        studentCount: b.students.size,
        gross: b.gross.toFixed(4),
        discount: b.discount.toFixed(4),
        net: b.net.toFixed(4),
        discountPct: b.gross.isZero()
          ? '0.0000'
          : b.discount.dividedBy(b.gross).times(100).toDecimalPlaces(4).toFixed(4),
        budgetCap: b.budgetCap?.toFixed(4) ?? null,
      }))
      .sort((a, b) => Number(b.discount) - Number(a.discount));

    return {
      dimension,
      rows,
      totalGross: sum(registrations.map((r) => r.grossAmount)).toFixed(4),
      totalDiscount: sum(registrations.map((r) => r.discountAmount)).toFixed(4),
      totalNet: sum(registrations.map((r) => r.netAmount)).toFixed(4),
    };
  });
}
