import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';

/**
 * Seat quotas and capacity (SRS REQ-ADM-CAP-01, Track B2).
 *
 * ## What the legacy screen was
 *
 * `frmStudentsVacants`, present only in the Ribat/UOT build, held one row per
 * **college** — no programme, no admission channel — and saved it like this:
 *
 * ```vb
 * Dim cmdDel As New SqlCommand("Delete From StudentsVacants Where College=N'" & _
 *                              Me.CombColleges.SelectedItem & "'", cnn)
 * Dim cmd As New SqlCommand("Insert Into StudentsVacants (College,Batch,Amount) Values (...)")
 * cmdDel.ExecuteNonQuery()
 * cmd.ExecuteNonQuery()
 * ```
 * (frmStudentsVacants.vb:94-101)
 *
 * The DELETE names the college. The INSERT names the college *and* the batch.
 * So setting the 2026 quota for Medicine deleted Medicine's quota for every
 * other batch — the same defect as the fee matrix, in a second screen. Two
 * `ExecuteNonQuery` calls on an autocommit connection, so a failure between
 * them left the college with no quota at all.
 *
 * ## The deeper problem: capacity was a report, not a control
 *
 * Nothing consulted the quota when a place was given. The screen's report
 * rebuilt two SQL views *at runtime* —
 * `ALTER VIEW [dbo].[viewCollegRegTotal] AS SELECT College, COUNT(DISTINCT StudID) …
 * WHERE Transtype = N'سند قبض'` (frmStudentsVacants.vb:141-160) — and counted
 * students **who had already paid**. Seats taken meant money received. An
 * institution could over-admit freely and find out when the cash arrived.
 *
 * (Two incidental consequences of that `ALTER VIEW`: the application needed
 * DDL rights on the live database, and two people running the report at once
 * overwrote each other's view definition, so the second user's academic year
 * decided what the first user saw.)
 *
 * ## What replaces it
 *
 * Capacity is checked **when an offer is issued**, under a row lock on the
 * quota, and the counters are counted from the offers rather than stored. A
 * stored counter is a second record of the same fact, and this codebase's
 * whole legacy audit is a catalogue of what happens to those.
 */

export class SeatQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SeatQuotaError';
  }
}

export class CapacityExceededError extends Error {
  constructor(
    readonly programmeCode: string,
    readonly seats: number,
    readonly taken: number,
  ) {
    super(
      `${programmeCode} has ${seats} seat(s) for this intake and ${taken} are already ` +
        `taken. Issuing this offer needs an explicit override with a stated reason, ` +
        `recorded against the offer.`,
    );
    this.name = 'CapacityExceededError';
  }
}

export interface SeatQuotaInput {
  programmeId: string;
  batchId: string;
  admissionCategoryId: string;
  seats: number;
  /** Held back from general allocation — a ministry block, a scholarship. */
  reservedSeats?: number;
  /** When false, an offer beyond capacity is refused outright. */
  allowOverride?: boolean;
}

/**
 * Create or adjust a quota.
 *
 * Adjusting changes the seat count only. The three dimensions are immutable —
 * enforced by trigger — because moving a quota sideways would move every offer
 * already counted against it.
 */
export async function setSeatQuota(
  principal: Principal,
  input: SeatQuotaInput,
): Promise<{ id: string; seats: number; created: boolean }> {
  requirePermission(principal, 'admission.capacity');

  if (!Number.isInteger(input.seats) || input.seats < 0) {
    throw new SeatQuotaError(`A seat count must be a whole number of seats, not ${input.seats}.`);
  }
  const reserved = input.reservedSeats ?? 0;
  if (reserved < 0 || reserved > input.seats) {
    throw new SeatQuotaError(
      `${reserved} reserved seat(s) out of ${input.seats} is not possible. Reserved seats ` +
        `are part of the quota, not additional to it.`,
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const existing = await tx.seatQuota.findFirst({
      where: {
        tenantId: principal.tenantId,
        programmeId: input.programmeId,
        batchId: input.batchId,
        admissionCategoryId: input.admissionCategoryId,
      },
      select: { id: true, seats: true, reservedSeats: true },
    });

    if (existing) {
      // Reducing a quota below what has already been given out is refused. The
      // offers are real; the number is the thing that is wrong.
      const taken = await countTaken(tx, principal.tenantId, existing.id);
      if (input.seats < taken.held) {
        throw new SeatQuotaError(
          `Cannot reduce this quota to ${input.seats}: ${taken.held} place(s) are already ` +
            `held under it. Withdraw the offers first, or set the quota to at least ${taken.held}.`,
        );
      }

      await tx.seatQuota.update({
        where: { id: existing.id },
        data: {
          seats: input.seats,
          reservedSeats: reserved,
          allowOverride: input.allowOverride ?? true,
        },
      });

      await audit(tx, principal.tenantId, {
        actorId: principal.userId,
        action: 'UPDATE',
        resourceType: 'seat_quota',
        resourceId: existing.id,
        before: { seats: existing.seats, reservedSeats: existing.reservedSeats },
        after: { seats: input.seats, reservedSeats: reserved },
      });

      return { id: existing.id, seats: input.seats, created: false };
    }

    const quota = await tx.seatQuota.create({
      data: {
        tenantId: principal.tenantId,
        programmeId: input.programmeId,
        batchId: input.batchId,
        admissionCategoryId: input.admissionCategoryId,
        seats: input.seats,
        reservedSeats: reserved,
        allowOverride: input.allowOverride ?? true,
        createdById: principal.userId,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'seat_quota',
      resourceId: quota.id,
      after: {
        programmeId: input.programmeId,
        batchId: input.batchId,
        admissionCategoryId: input.admissionCategoryId,
        seats: input.seats,
        reservedSeats: reserved,
      },
    });

    return { id: quota.id, seats: input.seats, created: true };
  });
}

export interface SeatCounts {
  /** Offers issued and awaiting an answer. */
  offered: number;
  /** Offers accepted. The seat is gone. */
  confirmed: number;
  /** offered + confirmed — every seat currently spoken for. */
  held: number;
  /** Offers that lapsed, were declined or were withdrawn. Not held. */
  released: number;
}

/**
 * Count what a quota has actually given out.
 *
 * Counted from the offers, every time. The alternative — a stored counter
 * incremented on issue and decremented on lapse — is one missed decrement away
 * from a programme that reports itself full while seats sit empty, and nothing
 * would report the discrepancy.
 */
export async function countTaken(
  tx: Tx,
  tenantId: string,
  seatQuotaId: string,
): Promise<SeatCounts> {
  const rows = await tx.admissionOffer.groupBy({
    by: ['state'],
    where: { tenantId, seatQuotaId },
    _count: { _all: true },
  });

  const byState = new Map(rows.map((r) => [r.state, r._count._all]));
  const offered = byState.get('ISSUED') ?? 0;
  const confirmed = byState.get('ACCEPTED') ?? 0;
  const released =
    (byState.get('LAPSED') ?? 0) +
    (byState.get('DECLINED') ?? 0) +
    (byState.get('WITHDRAWN') ?? 0);

  return { offered, confirmed, held: offered + confirmed, released };
}

export interface CapacityPosition extends SeatCounts {
  seatQuotaId: string;
  programmeId: string;
  programmeCode: string;
  programmeNameAr: string;
  programmeNameEn: string;
  seats: number;
  reservedSeats: number;
  /** seats − reserved − held. Negative means the quota was overridden. */
  available: number;
  allowOverride: boolean;
  /** Offers issued beyond capacity, each with a recorded reason. */
  overrides: number;
}

/**
 * Live capacity for one intake — the screen the legacy build never had.
 *
 * Note what `available` subtracts: reserved seats *and* seats held by
 * unanswered offers. An offer nobody has replied to is not a free seat, and
 * treating it as one is how a programme ends up over-subscribed on the day the
 * deadline passes.
 */
export async function capacityForBatch(
  principal: Principal,
  batchId: string,
  opts: { admissionCategoryId?: string } = {},
): Promise<CapacityPosition[]> {
  requirePermission(principal, 'application.read');

  return withTenant(principal.tenantId, async (tx) => {
    const quotas = await tx.seatQuota.findMany({
      where: {
        tenantId: principal.tenantId,
        batchId,
        isActive: true,
        ...(opts.admissionCategoryId
          ? { admissionCategoryId: opts.admissionCategoryId }
          : {}),
      },
      select: {
        id: true,
        programmeId: true,
        seats: true,
        reservedSeats: true,
        allowOverride: true,
        // One relation load; the budget is two per query counting nested ones.
        programme: { select: { code: true, nameAr: true, nameEn: true } },
      },
      orderBy: { programme: { code: 'asc' } },
    });

    const out: CapacityPosition[] = [];
    for (const q of quotas) {
      const counts = await countTaken(tx, principal.tenantId, q.id);
      const overrides = await tx.admissionOffer.count({
        where: {
          tenantId: principal.tenantId,
          seatQuotaId: q.id,
          overrodeCapacity: true,
          state: { in: ['ISSUED', 'ACCEPTED'] },
        },
      });

      out.push({
        seatQuotaId: q.id,
        programmeId: q.programmeId,
        programmeCode: q.programme.code,
        programmeNameAr: q.programme.nameAr,
        programmeNameEn: q.programme.nameEn,
        seats: q.seats,
        reservedSeats: q.reservedSeats,
        available: q.seats - q.reservedSeats - counts.held,
        allowOverride: q.allowOverride,
        overrides,
        ...counts,
      });
    }
    return out;
  });
}

export interface LockedQuota {
  id: string;
  seats: number;
  reservedSeats: number;
  allowOverride: boolean;
  isActive: boolean;
  programmeCode: string;
}

/**
 * Take the quota row under a lock, then count what it has given out.
 *
 * The lock is what makes capacity a control rather than a suggestion. Without
 * it, two admissions officers issuing the last seat at the same moment both
 * read "one available" and both succeed — the same lost-update race the legacy
 * voucher numbering had with `MAX(MoveNo)+1`, with a person's place instead of
 * a document number.
 */
export async function lockQuota(
  tx: Tx,
  tenantId: string,
  seatQuotaId: string,
): Promise<{ quota: LockedQuota; counts: SeatCounts }> {
  const rows = await tx.$queryRaw<
    Array<{
      id: string;
      seats: number;
      reserved_seats: number;
      allow_override: boolean;
      is_active: boolean;
      code: string;
    }>
  >`
    SELECT q.id, q.seats, q.reserved_seats, q.allow_override, q.is_active, p.code
      FROM seat_quotas q
      JOIN programmes p ON p.id = q.programme_id
     WHERE q.id = ${seatQuotaId}::uuid
       AND q.tenant_id = ${tenantId}::uuid
     FOR UPDATE OF q
  `;

  const row = rows[0];
  if (!row) {
    throw new SeatQuotaError('That seat quota does not belong to this university.');
  }

  return {
    quota: {
      id: row.id,
      seats: row.seats,
      reservedSeats: row.reserved_seats,
      allowOverride: row.allow_override,
      isActive: row.is_active,
      programmeCode: row.code,
    },
    counts: await countTaken(tx, tenantId, seatQuotaId),
  };
}

/** Resolve the quota governing one programme for one application's intake. */
export async function quotaFor(
  tx: Tx,
  tenantId: string,
  key: { programmeId: string; batchId: string; admissionCategoryId: string },
): Promise<string | null> {
  const q = await tx.seatQuota.findFirst({
    where: { tenantId, ...key, isActive: true },
    select: { id: true },
  });
  return q?.id ?? null;
}
