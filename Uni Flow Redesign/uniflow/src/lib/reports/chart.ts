import 'server-only';
import type { NormalBalance } from '@/generated/prisma/enums';
import type { Tx } from '@/lib/db/client';
import { ZERO } from '@/lib/money';
import { EMPTY_SLICE, type AccountSlice } from './balances';

/**
 * The chart as reports need it: flat, ordered by code, with enough on each row
 * to render it and to roll it up.
 *
 * `coa/tree.ts` builds a nested tree for the maintenance screen. A statement
 * wants the opposite shape — a flat ordered list it walks once — so this is a
 * second projection of the same table rather than a second source of truth.
 */

export interface ReportAccount {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  level: number;
  parentId: string | null;
  normalBalance: NormalBalance;
  isPostable: boolean;
  isActive: boolean;
}

export async function loadReportChart(
  tx: Tx,
  tenantId: string,
): Promise<ReportAccount[]> {
  return tx.account.findMany({
    where: { tenantId },
    // Code order is the order every accountant expects a statement in, and it
    // puts every parent immediately before its children because the coding
    // scheme is a prefix hierarchy.
    orderBy: { code: 'asc' },
    select: {
      id: true,
      code: true,
      nameAr: true,
      nameEn: true,
      level: true,
      parentId: true,
      normalBalance: true,
      isPostable: true,
      isActive: true,
    },
  });
}

export type Totals = Omit<AccountSlice, 'accountId'>;

/**
 * Push every account's own figures up through its ancestors.
 *
 * Raw debit and credit columns are summed separately and netted afterwards by
 * each row's own normal balance. Netting first and summing the signed results
 * would get contra accounts wrong: accumulated depreciation is a CREDIT
 * account sitting under DEBIT-normal Assets, and it has to *reduce* the asset
 * group. Summing raw sides does that automatically; summing signed children
 * would add its balance instead of subtracting it.
 *
 * Returns a map covering every account, parents included, with zeros for
 * accounts that saw no activity.
 */
export function rollUp(
  accounts: ReportAccount[],
  slices: Map<string, AccountSlice>,
): Map<string, Totals> {
  const parentOf = new Map<string, string | null>();
  for (const a of accounts) parentOf.set(a.id, a.parentId);

  const out = new Map<string, Totals>();
  for (const a of accounts) out.set(a.id, { ...EMPTY_SLICE });

  for (const a of accounts) {
    const own = slices.get(a.id);
    if (!own) continue;

    // Walk to the root, adding as we go. `seen` is not paranoia about bad data
    // so much as insurance: a cycle in the chart would otherwise hang the
    // report process rather than produce a wrong number, and a hung report is
    // harder to diagnose than a wrong one.
    const seen = new Set<string>();
    let cursor: string | null = a.id;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      const acc = out.get(cursor);
      if (acc) {
        acc.openingDebit = acc.openingDebit.plus(own.openingDebit);
        acc.openingCredit = acc.openingCredit.plus(own.openingCredit);
        acc.movementDebit = acc.movementDebit.plus(own.movementDebit);
        acc.movementCredit = acc.movementCredit.plus(own.movementCredit);
      }
      cursor = parentOf.get(cursor) ?? null;
    }
  }

  return out;
}

/** True when every one of the four figures is zero. */
export function isEmpty(t: Totals): boolean {
  return (
    t.openingDebit.isZero() &&
    t.openingCredit.isZero() &&
    t.movementDebit.isZero() &&
    t.movementCredit.isZero()
  );
}

export const ZERO_TOTALS: Totals = {
  openingDebit: ZERO,
  openingCredit: ZERO,
  movementDebit: ZERO,
  movementCredit: ZERO,
};
