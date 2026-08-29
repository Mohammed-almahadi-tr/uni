import 'server-only';
import type { FeeRecurrence, NationalityCategory } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import { money, sum, toStorage, type Money, type MoneyInput } from '@/lib/money';
import { toDateOnly } from '@/lib/ledger/period';

/**
 * The fee matrix (SRS REQ-AC-04, Track B1).
 *
 * A schedule prices one cohort: programme × batch × admission category ×
 * nationality category, in one currency, over a range of dates. It is
 * **versioned and effective-dated**, and it is never edited.
 *
 * ## The legacy save, and why this module exists
 *
 * ```vb
 * cmd.CommandText = "Delete From TuitionFees Where Batch=N'" & combBatch.SelectedItem & "'"
 * cmd.ExecuteNonQuery()
 * cmd.CommandText = "insert into TuitionFees (Batch,Colleges,Program,TuitionFees,RegFees,Type,Employee) ..."
 * For Each row As DataGridViewRow In GridFees.Rows ...
 * ```
 * (frmTuitionFees.vb:89-104)
 *
 * The grid being re-inserted was loaded with
 * `where Batch=.. and Colleges=.. and Type=..` (line 48). The DELETE names only
 * the batch. So saving the Medicine/General fee grid **deleted the fee
 * schedules of every faculty and every admission type in that batch** and
 * re-inserted the dozen rows on screen. No transaction, on an autocommit
 * connection, so a failure between the DELETE and the last INSERT left the
 * batch priced at nothing. There were exactly two fee columns, `TuitionFees`
 * and `RegFees`, both `Double`, and the only record of who changed them was an
 * `Employee` column overwritten on every save.
 *
 * Four properties here answer that directly, and three of the four are enforced
 * by the database rather than by this file:
 *
 *   1. **A schedule is never edited.** Once approved it is immutable —
 *      trigger. Revision creates a new version.
 *   2. **Prior versions are retained.** They keep their effective range and
 *      stay attached to every registration raised under them, so
 *      "what did this student owe when they registered" stays answerable.
 *   3. **One answer per cohort per day.** An exclusion constraint refuses two
 *      approved versions whose effective ranges overlap on the same key.
 *   4. **Two signatures.** Whoever prepares a schedule may not approve it, and
 *      whoever sets published fees may not also approve individual discounts —
 *      that pair is already in the SoD matrix.
 */

export class FeeMatrixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeeMatrixError';
  }
}

/** The four dimensions a schedule is keyed on. */
export interface FeeMatrixKey {
  programmeId: string;
  batchId: string;
  admissionCategoryId: string;
  /** Null is the fallback that applies to any nationality. */
  nationalityCategory?: NationalityCategory | null;
}

export interface FeeScheduleLineInput {
  feeItemId: string;
  amount: MoneyInput;
  isMandatory?: boolean;
  /** Overrides the fee item's catalogue recurrence for this schedule only. */
  recurrence?: FeeRecurrence | null;
  sortOrder?: number;
  note?: string | null;
}

export interface DraftFeeScheduleInput extends FeeMatrixKey {
  currency: string;
  /** First day the schedule prices. */
  effectiveFrom: Date;
  lines: FeeScheduleLineInput[];
  note?: string;
}

export interface DraftedFeeSchedule {
  id: string;
  versionNo: number;
  total: string;
  lineCount: number;
}

/**
 * Draft a new version.
 *
 * Version numbers run per key, not per tenant: Medicine 2026 General is on its
 * own sequence from Pharmacy 2026 General, because they are separately priced
 * things that are separately revised.
 */
export async function draftFeeSchedule(
  principal: Principal,
  input: DraftFeeScheduleInput,
): Promise<DraftedFeeSchedule> {
  requirePermission(principal, 'feematrix.manage');

  const currency = input.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    throw new FeeMatrixError(`"${input.currency}" is not a three-letter currency code.`);
  }
  if (input.lines.length === 0) {
    throw new FeeMatrixError(
      'A fee schedule needs at least one line. An empty schedule bills a student nothing ' +
        'and looks exactly like a correct one.',
    );
  }

  const effectiveFrom = toDateOnly(input.effectiveFrom);
  const nationalityCategory = input.nationalityCategory ?? null;

  return withTenant(principal.tenantId, async (tx) => {
    await assertKeyExists(tx, principal.tenantId, input);
    const lines = await prepareLines(tx, principal.tenantId, input.lines);

    // Next version for this key. Read under a lock on the tenant so two people
    // drafting the same cohort at once cannot both take version 3 — the same
    // hazard the legacy `MAX(MoveNo)+1` voucher numbering had.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${
      principal.tenantId + ':feeschedule'
    }::text, 0))`;

    const latest = await tx.feeSchedule.findFirst({
      where: {
        tenantId: principal.tenantId,
        programmeId: input.programmeId,
        batchId: input.batchId,
        admissionCategoryId: input.admissionCategoryId,
        nationalityCategory,
      },
      orderBy: { versionNo: 'desc' },
      select: { versionNo: true },
    });
    const versionNo = (latest?.versionNo ?? 0) + 1;

    const schedule = await tx.feeSchedule.create({
      data: {
        tenantId: principal.tenantId,
        programmeId: input.programmeId,
        batchId: input.batchId,
        admissionCategoryId: input.admissionCategoryId,
        nationalityCategory,
        currency,
        versionNo,
        effectiveFrom,
        status: 'DRAFT',
        preparedById: principal.userId,
        note: input.note?.trim() || null,
        lines: {
          create: lines.map((l, i) => ({
            tenantId: principal.tenantId,
            feeItemId: l.feeItemId,
            amount: l.amount,
            isMandatory: l.isMandatory,
            recurrence: l.recurrence,
            sortOrder: l.sortOrder ?? i,
            note: l.note,
          })),
        },
      },
      select: { id: true },
    });

    const total = sum(lines.map((l) => l.amount));

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'fee_schedule',
      resourceId: schedule.id,
      after: {
        versionNo,
        currency,
        effectiveFrom: iso(effectiveFrom),
        lines: lines.length,
        total: total.toFixed(4),
      },
    });

    return {
      id: schedule.id,
      versionNo,
      total: total.toFixed(4),
      lineCount: lines.length,
    };
  });
}

/**
 * Revise an existing schedule: copy its lines into a new draft, then adjust.
 *
 * This is what the legacy screen was reaching for when it deleted and
 * re-inserted. The difference is that the old rows stay where they are.
 */
export async function reviseFeeSchedule(
  principal: Principal,
  feeScheduleId: string,
  input: {
    effectiveFrom: Date;
    /** Lines to replace wholesale. Omit to copy the source version's lines. */
    lines?: FeeScheduleLineInput[];
    currency?: string;
    note?: string;
  },
): Promise<DraftedFeeSchedule> {
  requirePermission(principal, 'feematrix.manage');

  const source = await withTenant(principal.tenantId, async (tx) => {
    const s = await tx.feeSchedule.findUnique({
      where: { id: feeScheduleId },
      select: {
        tenantId: true,
        programmeId: true,
        batchId: true,
        admissionCategoryId: true,
        nationalityCategory: true,
        currency: true,
        versionNo: true,
        lines: {
          select: {
            feeItemId: true,
            amount: true,
            isMandatory: true,
            recurrence: true,
            sortOrder: true,
            note: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });
    if (!s || s.tenantId !== principal.tenantId) {
      throw new FeeMatrixError('That fee schedule does not belong to this university.');
    }
    return s;
  });

  return draftFeeSchedule(principal, {
    programmeId: source.programmeId,
    batchId: source.batchId,
    admissionCategoryId: source.admissionCategoryId,
    nationalityCategory: source.nationalityCategory,
    currency: input.currency ?? source.currency.trim(),
    effectiveFrom: input.effectiveFrom,
    lines:
      input.lines ??
      source.lines.map((l) => ({
        feeItemId: l.feeItemId,
        amount: l.amount,
        isMandatory: l.isMandatory,
        recurrence: l.recurrence,
        sortOrder: l.sortOrder,
        note: l.note,
      })),
    note: input.note ?? `Revision of version ${source.versionNo}`,
  });
}

export interface ApprovedFeeSchedule {
  id: string;
  versionNo: number;
  effectiveFrom: string;
  /** The version this one closed, if any. */
  supersededVersionNo: number | null;
  supersededEffectiveTo: string | null;
}

/**
 * Approve a draft, closing whichever version it replaces.
 *
 * The prior approved version is not deleted and not blanked: its effective
 * range is closed the day before this one opens, and it is stamped SUPERSEDED.
 * Every registration raised while it was in force still points at it and still
 * resolves to the same figures.
 */
export async function approveFeeSchedule(
  principal: Principal,
  feeScheduleId: string,
): Promise<ApprovedFeeSchedule> {
  requirePermission(principal, 'feematrix.approve');

  return withTenant(principal.tenantId, async (tx) => {
    const draft = await tx.feeSchedule.findUnique({
      where: { id: feeScheduleId },
      select: {
        tenantId: true,
        status: true,
        versionNo: true,
        programmeId: true,
        batchId: true,
        admissionCategoryId: true,
        nationalityCategory: true,
        effectiveFrom: true,
        preparedById: true,
      },
    });
    if (!draft || draft.tenantId !== principal.tenantId) {
      throw new FeeMatrixError('That fee schedule does not belong to this university.');
    }
    if (draft.status !== 'DRAFT') {
      throw new FeeMatrixError(
        `Fee schedule version ${draft.versionNo} is ${draft.status}, not a draft.`,
      );
    }

    assertNotSelfApproval(
      principal,
      draft.preparedById,
      `fee schedule version ${draft.versionNo}`,
    );

    const lineCount = await tx.feeScheduleLine.count({
      where: { feeScheduleId },
    });
    if (lineCount === 0) {
      throw new FeeMatrixError(
        `Fee schedule version ${draft.versionNo} has no lines. Approving it would price ` +
          `this cohort at nothing.`,
      );
    }

    // The version currently in force for the same key.
    const current = await tx.feeSchedule.findFirst({
      where: {
        tenantId: principal.tenantId,
        programmeId: draft.programmeId,
        batchId: draft.batchId,
        admissionCategoryId: draft.admissionCategoryId,
        nationalityCategory: draft.nationalityCategory,
        status: 'APPROVED',
      },
      select: { id: true, versionNo: true, effectiveFrom: true },
    });

    let supersededEffectiveTo: Date | null = null;

    if (current) {
      if (draft.effectiveFrom <= current.effectiveFrom) {
        throw new FeeMatrixError(
          `Version ${draft.versionNo} takes effect on ${iso(draft.effectiveFrom)}, which is ` +
            `not after version ${current.versionNo} (${iso(current.effectiveFrom)}). A new ` +
            `version must start after the one it replaces, or the two would both claim the ` +
            `same days and there would be no single answer to what a student owed.`,
        );
      }

      // Close the outgoing version the day before the new one opens. Adjacent,
      // never overlapping and never leaving a gap — a day priced by nothing is
      // a day a registration cannot be billed.
      supersededEffectiveTo = addDays(draft.effectiveFrom, -1);

      await tx.feeSchedule.update({
        where: { id: current.id },
        data: {
          status: 'SUPERSEDED',
          effectiveTo: supersededEffectiveTo,
          supersededAt: new Date(),
        },
      });
    }

    await tx.feeSchedule.update({
      where: { id: feeScheduleId },
      data: {
        status: 'APPROVED',
        approvedById: principal.userId,
        approvedAt: new Date(),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'fee_schedule',
      resourceId: feeScheduleId,
      before: { status: 'DRAFT' },
      after: {
        status: 'APPROVED',
        versionNo: draft.versionNo,
        effectiveFrom: iso(draft.effectiveFrom),
        supersededVersionNo: current?.versionNo ?? null,
      },
    });

    return {
      id: feeScheduleId,
      versionNo: draft.versionNo,
      effectiveFrom: iso(draft.effectiveFrom),
      supersededVersionNo: current?.versionNo ?? null,
      supersededEffectiveTo: supersededEffectiveTo ? iso(supersededEffectiveTo) : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Resolution — what Track B4 will call on every registration
// ---------------------------------------------------------------------------

export interface ResolvedFeeLine {
  feeItemId: string;
  feeItemCode: string;
  feeItemNameAr: string;
  feeItemNameEn: string;
  amount: string;
  isMandatory: boolean;
  /** The schedule's override, or the fee item's own catalogue recurrence. */
  recurrence: FeeRecurrence;
  sortOrder: number;
}

export interface ResolvedFeeSchedule {
  feeScheduleId: string;
  versionNo: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  /** True when the fallback (any-nationality) row was used. */
  usedFallback: boolean;
  lines: ResolvedFeeLine[];
  mandatoryTotal: string;
  total: string;
}

/**
 * The schedule in force for a cohort on a day.
 *
 * Resolution is two lookups, most specific first: a schedule naming the
 * student's nationality category wins over the any-nationality fallback. That
 * order is the whole reason the fallback is nullable rather than a fourth enum
 * member — an institution prices most programmes once and only some of them
 * differently for expatriates, and it should not have to write three identical
 * schedules to say so.
 *
 * Returns null rather than throwing: "this cohort has no approved fee schedule"
 * is a normal state during setup, and the caller (registration) has a better
 * sentence to say about it than this function does.
 */
export async function resolveFeeSchedule(
  tx: Tx,
  tenantId: string,
  key: FeeMatrixKey & { onDate: Date },
): Promise<ResolvedFeeSchedule | null> {
  const day = toDateOnly(key.onDate);

  const inForce = {
    tenantId,
    programmeId: key.programmeId,
    batchId: key.batchId,
    admissionCategoryId: key.admissionCategoryId,
    status: 'APPROVED' as const,
    effectiveFrom: { lte: day },
    OR: [{ effectiveTo: null }, { effectiveTo: { gte: day } }],
  };

  let usedFallback = false;
  let schedule =
    key.nationalityCategory != null
      ? await tx.feeSchedule.findFirst({
          where: { ...inForce, nationalityCategory: key.nationalityCategory },
          select: SCHEDULE_SELECT,
        })
      : null;

  if (!schedule) {
    usedFallback = true;
    schedule = await tx.feeSchedule.findFirst({
      where: { ...inForce, nationalityCategory: null },
      select: SCHEDULE_SELECT,
    });
  }

  if (!schedule) return null;

  const lines = await tx.feeScheduleLine.findMany({
    where: { feeScheduleId: schedule.id },
    orderBy: { sortOrder: 'asc' },
    select: {
      feeItemId: true,
      amount: true,
      isMandatory: true,
      recurrence: true,
      sortOrder: true,
      // One relation load. Read separately from the schedule above rather than
      // nested inside it: Prisma 7 allows two relation loads per query counting
      // nested ones, and a schedule → lines → feeItem chain spends both on a
      // shape that reads no better.
      feeItem: { select: { code: true, nameAr: true, nameEn: true, recurrence: true } },
    },
  });

  const resolved: ResolvedFeeLine[] = lines.map((l) => ({
    feeItemId: l.feeItemId,
    feeItemCode: l.feeItem.code,
    feeItemNameAr: l.feeItem.nameAr,
    feeItemNameEn: l.feeItem.nameEn,
    amount: l.amount.toFixed(4),
    isMandatory: l.isMandatory,
    recurrence: l.recurrence ?? l.feeItem.recurrence,
    sortOrder: l.sortOrder,
  }));

  const total = sum(resolved.map((l) => l.amount));
  const mandatoryTotal = sum(
    resolved.filter((l) => l.isMandatory).map((l) => l.amount),
  );

  return {
    feeScheduleId: schedule.id,
    versionNo: schedule.versionNo,
    currency: schedule.currency.trim(),
    effectiveFrom: iso(schedule.effectiveFrom),
    effectiveTo: schedule.effectiveTo ? iso(schedule.effectiveTo) : null,
    usedFallback,
    lines: resolved,
    mandatoryTotal: mandatoryTotal.toFixed(4),
    total: total.toFixed(4),
  };
}

const SCHEDULE_SELECT = {
  id: true,
  versionNo: true,
  currency: true,
  effectiveFrom: true,
  effectiveTo: true,
} as const;

export class StudentNotPlacedError extends Error {
  constructor(
    readonly studentNo: string,
    readonly missing: string[],
  ) {
    super(
      `Student ${studentNo} cannot be priced: ${missing.join(', ')} not set. ` +
        `A fee schedule is keyed on all four, so there is nothing to bill against ` +
        `until they are.`,
    );
    this.name = 'StudentNotPlacedError';
  }
}

/**
 * The schedule that applies to one student on a day.
 *
 * The entry point Track B4's registration engine uses. Kept here rather than in
 * the registration module so that the fee matrix owns the question of what a
 * student's fees are, and registration only owns what to do with the answer.
 */
export async function feeScheduleForStudent(
  tx: Tx,
  tenantId: string,
  studentId: string,
  onDate: Date,
): Promise<ResolvedFeeSchedule | null> {
  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: {
      tenantId: true,
      studentNo: true,
      programmeId: true,
      batchId: true,
      admissionCategoryId: true,
      nationalityId: true,
    },
  });
  if (!student || student.tenantId !== tenantId) {
    throw new FeeMatrixError('That student does not belong to this university.');
  }

  const missing: string[] = [];
  if (!student.programmeId) missing.push('programme');
  if (!student.batchId) missing.push('batch');
  if (!student.admissionCategoryId) missing.push('admission category');
  if (missing.length > 0) {
    throw new StudentNotPlacedError(student.studentNo, missing);
  }

  // Nationality is optional: a student with none resolves against the
  // any-nationality fallback, which is the correct behaviour for an
  // institution that does not price by nationality at all.
  let nationalityCategory: NationalityCategory | null = null;
  if (student.nationalityId) {
    const nat = await tx.nationality.findUnique({
      where: { id: student.nationalityId },
      select: { category: true },
    });
    nationalityCategory = nat?.category ?? null;
  }

  return resolveFeeSchedule(tx, tenantId, {
    programmeId: student.programmeId!,
    batchId: student.batchId!,
    admissionCategoryId: student.admissionCategoryId!,
    nationalityCategory,
    onDate,
  });
}

/** Permissioned wrapper for the fee-enquiry screen. */
export async function lookupStudentFees(
  principal: Principal,
  studentId: string,
  onDate: Date = new Date(),
): Promise<ResolvedFeeSchedule | null> {
  requirePermission(principal, 'feematrix.read');
  return withTenant(principal.tenantId, (tx) =>
    feeScheduleForStudent(tx, principal.tenantId, studentId, onDate),
  );
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export interface FeeScheduleSummary {
  id: string;
  versionNo: number;
  status: 'DRAFT' | 'APPROVED' | 'SUPERSEDED';
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  nationalityCategory: NationalityCategory | null;
  lineCount: number;
  total: string;
}

/**
 * Every version for one cohort, newest first.
 *
 * The history the legacy screen destroyed on every save. Superseded versions
 * are included deliberately: the question this list exists to answer is
 * usually "what changed, and when".
 */
export async function feeScheduleHistory(
  principal: Principal,
  key: FeeMatrixKey,
): Promise<FeeScheduleSummary[]> {
  requirePermission(principal, 'feematrix.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.feeSchedule.findMany({
      where: {
        tenantId: principal.tenantId,
        programmeId: key.programmeId,
        batchId: key.batchId,
        admissionCategoryId: key.admissionCategoryId,
        ...(key.nationalityCategory !== undefined
          ? { nationalityCategory: key.nationalityCategory }
          : {}),
      },
      orderBy: [{ versionNo: 'desc' }],
      select: {
        id: true,
        versionNo: true,
        status: true,
        currency: true,
        effectiveFrom: true,
        effectiveTo: true,
        nationalityCategory: true,
        lines: { select: { amount: true } },
      },
    });

    return rows.map((r) => ({
      id: r.id,
      versionNo: r.versionNo,
      status: r.status,
      currency: r.currency.trim(),
      effectiveFrom: iso(r.effectiveFrom),
      effectiveTo: r.effectiveTo ? iso(r.effectiveTo) : null,
      nationalityCategory: r.nationalityCategory,
      lineCount: r.lines.length,
      total: sum(r.lines.map((l) => l.amount)).toFixed(4),
    }));
  });
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

interface PreparedLine {
  feeItemId: string;
  amount: Money;
  isMandatory: boolean;
  recurrence: FeeRecurrence | null;
  sortOrder: number | null;
  note: string | null;
}

async function prepareLines(
  tx: Tx,
  tenantId: string,
  input: FeeScheduleLineInput[],
): Promise<PreparedLine[]> {
  const ids = input.map((l) => l.feeItemId);
  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new FeeMatrixError(
      'The same fee item appears twice on this schedule. Two rows for one item is how the ' +
        'legacy table silently doubled a charge; enter one line with the total instead.',
    );
  }

  const items = await tx.feeItem.findMany({
    where: { tenantId, id: { in: [...unique] } },
    select: { id: true, code: true, isActive: true },
  });
  const byId = new Map(items.map((i) => [i.id, i]));

  return input.map((l) => {
    const item = byId.get(l.feeItemId);
    if (!item) {
      throw new FeeMatrixError(
        `No fee item ${l.feeItemId} in this university's catalogue.`,
      );
    }
    if (!item.isActive) {
      throw new FeeMatrixError(
        `Fee item ${item.code} is deactivated and cannot be added to a new schedule.`,
      );
    }

    const amount = toStorage(money(l.amount));
    if (amount.isNegative()) {
      throw new FeeMatrixError(
        `Fee item ${item.code} is priced at ${amount.toFixed(2)}. A fee cannot be negative — ` +
          `a reduction is a discount, which is approved separately and recorded as one.`,
      );
    }

    return {
      feeItemId: l.feeItemId,
      amount,
      isMandatory: l.isMandatory ?? true,
      recurrence: l.recurrence ?? null,
      sortOrder: l.sortOrder ?? null,
      note: l.note?.trim() || null,
    };
  });
}

async function assertKeyExists(
  tx: Tx,
  tenantId: string,
  key: FeeMatrixKey,
): Promise<void> {
  const [programme, batch, category] = await Promise.all([
    tx.programme.findFirst({
      where: { id: key.programmeId, tenantId },
      select: { isActive: true, code: true },
    }),
    tx.batch.findFirst({
      where: { id: key.batchId, tenantId },
      select: { isActive: true, code: true },
    }),
    tx.admissionCategory.findFirst({
      where: { id: key.admissionCategoryId, tenantId },
      select: { isActive: true, code: true },
    }),
  ]);

  if (!programme) throw new FeeMatrixError('No such programme in this university.');
  if (!batch) throw new FeeMatrixError('No such batch in this university.');
  if (!category) throw new FeeMatrixError('No such admission category in this university.');

  if (!programme.isActive) {
    throw new FeeMatrixError(
      `Programme ${programme.code} is deactivated. Pricing a programme nobody can be admitted ` +
        `to is almost always a mistyped programme.`,
    );
  }
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
