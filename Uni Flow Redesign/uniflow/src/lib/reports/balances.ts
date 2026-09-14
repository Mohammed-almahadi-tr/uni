import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import type { Tx } from '@/lib/db/client';
import { money, ZERO, type Money } from '@/lib/money';
import { toDateOnly } from '@/lib/ledger/period';

/**
 * The one place any financial statement gets its numbers.
 *
 * Trial balance, balance sheet and income statement are three presentations of
 * the same four figures per account — opening debit, opening credit, movement
 * debit, movement credit — over a window. Computing them three times would
 * eventually produce three different answers to the same question, which is
 * the legacy system's central defect in a new costume: it kept two ledger
 * tables with two amount-column pairs and reconciled them by hand.
 *
 * ## Where opening balances come from
 *
 * Not from a stored carry-forward. `account_period_balances.opening_*` holds
 * only balances INJECTED from outside the ledger — a tenant's go-live opening
 * entry (REQ-PER-03), which is flagged `is_opening_entry` and therefore
 * excluded from period movement. Everything else, a prior year's result
 * included, is derived by summing the periods that came before.
 *
 * That is a deliberate departure from the usual design of copying each year's
 * closing balances into the next year's opening columns. A copied figure can
 * drift from the postings it claims to summarise — a correction posted into a
 * reopened period moves the movement but not the copy downstream, and nothing
 * reports the divergence. A derived figure cannot drift, because it is
 * recomputed from the same rows the movement column is built from. SRS
 * REQ-PER-04 asks that balance-sheet accounts "carry forward as the next
 * year's opening balances"; here they carry forward by derivation. The
 * year-end close still posts its closing voucher, so revenue and expense open
 * the new year at zero and the surplus sits in equity — see
 * `ledger/year-end.ts`.
 *
 * ## Why any cutoff date works
 *
 * REQ-RPT-04 wants a balance sheet "for any cutoff date", but the aggregates
 * are per period, not per day. So periods are classified against the window:
 * those wholly before it and wholly inside it are read from the aggregate
 * table, and only a period the window CUTS is read line by line. In the normal
 * case — a report run to a period boundary — nothing is read line by line at
 * all, which is what keeps REQ-NFR-02's promise of a trial balance under 100ms
 * over a million journal lines.
 */

export interface LedgerSliceOptions {
  /** Inclusive start of the movement window. */
  from: Date;
  /** Inclusive end of the movement window. */
  to: Date;
  /**
   * Restrict to one cost centre. Note that this makes the slice a *segment* of
   * the ledger, not the ledger: it will not balance, because the other side of
   * many entries carries a different cost centre or none at all.
   */
  costCenterId?: string | null;
}

export interface AccountSlice {
  accountId: string;
  openingDebit: Money;
  openingCredit: Money;
  movementDebit: Money;
  movementCredit: Money;
}

interface SliceRow {
  account_id: string;
  od: Prisma.Decimal;
  oc: Prisma.Decimal;
  md: Prisma.Decimal;
  mc: Prisma.Decimal;
}

/**
 * Read the ledger over a window, keyed by account.
 *
 * Accounts with no activity in or before the window are absent from the map
 * rather than present with zeros; callers rendering the full chart fill the
 * gaps themselves.
 */
export async function ledgerSlice(
  tx: Tx,
  tenantId: string,
  opts: LedgerSliceOptions,
): Promise<Map<string, AccountSlice>> {
  const from = toDateOnly(opts.from);
  const to = toDateOnly(opts.to);
  if (to < from) {
    throw new ReportRangeError(
      `Report window ends before it starts: ${iso(from)} to ${iso(to)}.`,
    );
  }

  // A cost centre of `undefined` means "every cost centre"; `null` would mean
  // "only lines carrying no cost centre", which is a different report nobody
  // has asked for. Only the first is offered, so this is a presence check.
  const cc = opts.costCenterId ?? null;
  const ccFilter = cc === null ? Prisma.sql`TRUE` : Prisma.sql`b.cost_center_id = ${cc}::uuid`;
  const ccLineFilter =
    cc === null ? Prisma.sql`TRUE` : Prisma.sql`l.cost_center_id = ${cc}::uuid`;

  const rows = await tx.$queryRaw<SliceRow[]>`
    WITH cls AS (
      SELECT p.id,
             CASE
               WHEN p.end_date   <  ${from}::date THEN 'before'
               WHEN p.start_date >= ${from}::date
                AND p.end_date   <= ${to}::date   THEN 'inside'
               WHEN p.start_date >  ${to}::date   THEN 'after'
               ELSE 'partial'
             END AS klass
        FROM fiscal_periods p
        JOIN fiscal_years y ON y.id = p.fiscal_year_id
       WHERE y.tenant_id = ${tenantId}::uuid
    ),
    agg AS (
      SELECT b.account_id,
             SUM(CASE WHEN c.klass = 'before' THEN b.opening_debit + b.movement_debit
                      WHEN c.klass = 'inside' THEN b.opening_debit
                      ELSE 0 END) AS od,
             SUM(CASE WHEN c.klass = 'before' THEN b.opening_credit + b.movement_credit
                      WHEN c.klass = 'inside' THEN b.opening_credit
                      ELSE 0 END) AS oc,
             SUM(CASE WHEN c.klass = 'inside' THEN b.movement_debit  ELSE 0 END) AS md,
             SUM(CASE WHEN c.klass = 'inside' THEN b.movement_credit ELSE 0 END) AS mc
        FROM account_period_balances b
        JOIN cls c ON c.id = b.fiscal_period_id
       WHERE b.tenant_id = ${tenantId}::uuid
         AND c.klass IN ('before', 'inside')
         AND ${ccFilter}
       GROUP BY b.account_id
    ),
    part AS (
      SELECT l.account_id,
             SUM(CASE WHEN h.doc_date < ${from}::date OR h.is_opening_entry
                      THEN l.debit_amount ELSE 0 END) AS od,
             SUM(CASE WHEN h.doc_date < ${from}::date OR h.is_opening_entry
                      THEN l.credit_amount ELSE 0 END) AS oc,
             SUM(CASE WHEN h.doc_date >= ${from}::date AND NOT h.is_opening_entry
                      THEN l.debit_amount ELSE 0 END) AS md,
             SUM(CASE WHEN h.doc_date >= ${from}::date AND NOT h.is_opening_entry
                      THEN l.credit_amount ELSE 0 END) AS mc
        FROM transaction_lines l
        JOIN transaction_headers h ON h.id = l.header_id
        JOIN cls c ON c.id = h.fiscal_period_id AND c.klass = 'partial'
       WHERE h.tenant_id = ${tenantId}::uuid
         AND h.doc_date <= ${to}::date
         AND ${ccLineFilter}
       GROUP BY l.account_id
    )
    SELECT account_id,
           SUM(od) AS od, SUM(oc) AS oc, SUM(md) AS md, SUM(mc) AS mc
      FROM (SELECT * FROM agg UNION ALL SELECT * FROM part) u
     GROUP BY account_id
  `;

  const out = new Map<string, AccountSlice>();
  for (const r of rows) {
    out.set(r.account_id, {
      accountId: r.account_id,
      openingDebit: money(r.od),
      openingCredit: money(r.oc),
      movementDebit: money(r.md),
      movementCredit: money(r.mc),
    });
  }
  return out;
}

export const EMPTY_SLICE: Omit<AccountSlice, 'accountId'> = {
  openingDebit: ZERO,
  openingCredit: ZERO,
  movementDebit: ZERO,
  movementCredit: ZERO,
};

/**
 * Signed balance in the account's own normal direction.
 *
 * A debit account with 900 debit and 100 credit is at 800; the same account
 * with the sides reversed is at -800, and the minus sign is information — a
 * cash account in credit means the books claim the safe holds less than
 * nothing. Reports print that rather than hiding it behind an absolute value.
 */
export function signed(
  slice: Omit<AccountSlice, 'accountId'>,
  normalBalance: 'DEBIT' | 'CREDIT',
): { opening: Money; movement: Money; closing: Money } {
  const opening = slice.openingDebit.minus(slice.openingCredit);
  const movement = slice.movementDebit.minus(slice.movementCredit);
  const sign = normalBalance === 'DEBIT' ? 1 : -1;
  return {
    opening: opening.times(sign),
    movement: movement.times(sign),
    closing: opening.plus(movement).times(sign),
  };
}

/**
 * Split a signed amount back into a debit/credit pair for presentation.
 *
 * A trial balance has two columns, not one signed column, and an accountant
 * reading it expects each account to appear on exactly one side.
 */
export function twoSided(net: Money): { debit: Money; credit: Money } {
  return net.isNegative()
    ? { debit: ZERO, credit: net.negated() }
    : { debit: net, credit: ZERO };
}

export class ReportRangeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportRangeError';
  }
}

export function iso(d: Date): string {
  return toDateOnly(d).toISOString().slice(0, 10);
}
