import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { money, ZERO, type Money } from '@/lib/money';
import {
  classifyOrNull,
  normalDirectionOf,
  type AccountClass,
} from '@/lib/coa/classification';
import { ledgerSlice, iso, ReportRangeError } from './balances';
import { loadReportChart, rollUp, isEmpty, ZERO_TOTALS, type ReportAccount, type Totals } from './chart';

/**
 * Balance sheet (الميزانية العمومية) and income statement (قائمة الدخل) —
 * SRS REQ-RPT-04 and REQ-RPT-05.
 *
 * Both are the same walk over the same chart with the same figures from
 * `balances.ts`; they differ in which major classes they keep and whether they
 * read a cumulative position or a period's movement.
 *
 * ## Sign convention
 *
 * A figure is presented positive when the account is sitting the way its
 * *class* normally sits — assets and expenses debit, liabilities, equity and
 * revenue credit. That is deliberately the class's direction and not the
 * individual account's, so a contra account reduces the group it belongs to:
 * accumulated depreciation is a credit-normal account under debit-normal
 * Assets, and it must appear as a negative inside the asset section rather than
 * adding to it.
 */

export interface StatementRow {
  accountId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  level: number;
  parentId: string | null;
  isPostable: boolean;
  /** Signed, positive when the account sits the normal way for its class. */
  amount: string;
  /** Present only when a comparative window was requested. */
  comparative?: string;
  variance?: string;
}

export interface StatementSection {
  cls: AccountClass;
  labelEn: string;
  labelAr: string;
  rows: StatementRow[];
  total: string;
  comparativeTotal?: string;
}

const SECTION_LABELS: Record<AccountClass, { en: string; ar: string }> = {
  ASSET: { en: 'Assets', ar: 'الأصول' },
  LIABILITY: { en: 'Liabilities', ar: 'الخصوم' },
  EQUITY: { en: 'Equity', ar: 'حقوق الملكية' },
  REVENUE: { en: 'Revenues', ar: 'الإيرادات' },
  EXPENSE: { en: 'Expenses', ar: 'المصروفات' },
};

/**
 * A date early enough to precede any ledger this system will hold, used as the
 * lower bound when a report wants everything up to a cutoff. Not `new Date(0)`
 * — a 1970 epoch is inside living memory for an institution's founding, and a
 * report that silently starts after some of its own history is worse than one
 * that is slow.
 */
const LEDGER_EPOCH = new Date(Date.UTC(1900, 0, 1));

// ---------------------------------------------------------------------------
// Balance sheet
// ---------------------------------------------------------------------------

export interface BalanceSheetOptions {
  /** Cutoff. Any date — a period the cutoff cuts is read line by line. */
  asOf: Date;
  /** Deepest level to show, 1-4 (REQ-RPT-04). Defaults to 4. */
  maxLevel?: number;
  costCenterId?: string | null;
  includeZeroRows?: boolean;
}

export interface BalanceSheet {
  asOf: string;
  currency: string;
  costCenterId: string | null;
  maxLevel: number;
  assets: StatementSection;
  liabilities: StatementSection;
  equity: StatementSection;
  /**
   * Result earned but not yet transferred to reserves — the net of every
   * revenue and expense account still carrying a balance at the cutoff.
   *
   * After a year-end close this is the current year to date, which is what an
   * accountant expects to read here. Before one, or if a prior year was never
   * closed, it is everything since the last close, and `spansPriorYears` says
   * so rather than letting the figure quietly mean something else.
   */
  unappropriatedResult: string;
  spansPriorYears: boolean;
  totalAssets: string;
  totalLiabilities: string;
  /** Equity accounts plus the unappropriated result. */
  totalEquity: string;
  /** Assets − (Liabilities + Equity). Zero on a balance sheet worth signing. */
  difference: string;
  balanced: boolean;
  segmented: boolean;
}

export async function balanceSheet(
  principal: Principal,
  opts: BalanceSheetOptions,
): Promise<BalanceSheet> {
  requirePermission(principal, 'report.financial');
  return withTenant(principal.tenantId, (tx) =>
    buildBalanceSheet(tx, principal.tenantId, opts),
  );
}

export async function buildBalanceSheet(
  tx: Tx,
  tenantId: string,
  opts: BalanceSheetOptions,
): Promise<BalanceSheet> {
  const maxLevel = opts.maxLevel ?? 4;
  if (maxLevel < 1 || maxLevel > 5) {
    throw new ReportRangeError(`Balance sheet levels run 1 to 5; asked for ${maxLevel}.`);
  }

  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });

  const accounts = await loadReportChart(tx, tenantId);
  // Everything up to the cutoff. Opening and movement are added together —
  // a balance sheet is a position, and the distinction between "brought in at
  // go-live" and "earned since" belongs on the trial balance, not here.
  const slices = await ledgerSlice(tx, tenantId, {
    from: LEDGER_EPOCH,
    to: opts.asOf,
    costCenterId: opts.costCenterId,
  });
  const totals = rollUp(accounts, slices);

  const cumulative = (t: Totals) => t.openingDebit.plus(t.movementDebit).minus(t.openingCredit).minus(t.movementCredit);

  const build = (cls: AccountClass): StatementSection =>
    section(cls, accounts, totals, maxLevel, opts.includeZeroRows ?? false, cumulative);

  const assets = build('ASSET');
  const liabilities = build('LIABILITY');
  const equity = build('EQUITY');

  // The result sitting in the revenue and expense accounts. It is part of
  // equity even though it is not posted there yet — without it the two sides
  // of the statement cannot agree, because the ledger's balance includes it.
  let result = ZERO;
  for (const a of accounts) {
    const cls = classifyOrNull(a.code);
    if (cls !== 'REVENUE' && cls !== 'EXPENSE') continue;
    if (!a.isPostable) continue;
    const t = totals.get(a.id);
    if (!t) continue;
    // Debit-positive; revenue nets negative, expense positive, so the surplus
    // is the negation of the sum.
    result = result.minus(cumulative(t));
  }

  // Does that result belong entirely to the current year? Compare it with the
  // same figure computed over the current fiscal year alone. Anything left
  // over came from a year that was never closed, and the reader has to know:
  // the line means "this year's surplus" only when the difference is nil.
  const cutoffYearStart = await fiscalYearStartCovering(tx, tenantId, opts.asOf);
  let spansPriorYears = false;
  if (!result.isZero() && cutoffYearStart) {
    const yearSlices = await ledgerSlice(tx, tenantId, {
      from: cutoffYearStart,
      to: opts.asOf,
      costCenterId: opts.costCenterId,
    });
    const yearTotals = rollUp(accounts, yearSlices);
    let yearResult = ZERO;
    for (const a of accounts) {
      const cls = classifyOrNull(a.code);
      if ((cls !== 'REVENUE' && cls !== 'EXPENSE') || !a.isPostable) continue;
      const t = yearTotals.get(a.id);
      if (!t) continue;
      // Movement, not cumulative: the question is what this year earned. Read
      // cumulatively it would include the prior year and always match, which
      // would make the flag report "no prior years" precisely when there are.
      yearResult = yearResult.minus(t.movementDebit.minus(t.movementCredit));
    }
    spansPriorYears = !result.equals(yearResult);
  }

  const totalAssets = money(assets.total);
  const totalLiabilities = money(liabilities.total);
  const totalEquity = money(equity.total).plus(result);
  const difference = totalAssets.minus(totalLiabilities).minus(totalEquity);

  return {
    asOf: iso(opts.asOf),
    currency: tenant.functionalCurrency.trim(),
    costCenterId: opts.costCenterId ?? null,
    maxLevel,
    assets,
    liabilities,
    equity,
    unappropriatedResult: result.toFixed(4),
    spansPriorYears,
    totalAssets: totalAssets.toFixed(4),
    totalLiabilities: totalLiabilities.toFixed(4),
    totalEquity: totalEquity.toFixed(4),
    difference: difference.toFixed(4),
    balanced: difference.isZero(),
    segmented: Boolean(opts.costCenterId),
  };
}

// ---------------------------------------------------------------------------
// Income statement
// ---------------------------------------------------------------------------

export interface IncomeStatementOptions {
  from: Date;
  to: Date;
  maxLevel?: number;
  /** Restrict to one faculty or department (REQ-RPT-05). */
  costCenterId?: string | null;
  includeZeroRows?: boolean;
  /**
   * The window to compare against. `'prior-year'` is the same calendar window
   * shifted back a year, which is the comparison an academic institution
   * actually wants: enrolment is seasonal, so last month is not a fair
   * comparison for this month but last year's same month is.
   */
  comparative?: { from: Date; to: Date } | 'prior-year' | 'prior-period' | null;
}

export interface IncomeStatement {
  from: string;
  to: string;
  currency: string;
  costCenterId: string | null;
  maxLevel: number;
  comparative: { from: string; to: string } | null;
  revenue: StatementSection;
  expenses: StatementSection;
  totalRevenue: string;
  totalExpenses: string;
  /** Positive is a surplus, negative a deficit. */
  netSurplus: string;
  comparativeTotalRevenue?: string;
  comparativeTotalExpenses?: string;
  comparativeNetSurplus?: string;
  /** Current less comparative. Present only with a comparative. */
  netVariance?: string;
  segmented: boolean;
}

export async function incomeStatement(
  principal: Principal,
  opts: IncomeStatementOptions,
): Promise<IncomeStatement> {
  requirePermission(principal, 'report.financial');
  return withTenant(principal.tenantId, (tx) =>
    buildIncomeStatement(tx, principal.tenantId, opts),
  );
}

export async function buildIncomeStatement(
  tx: Tx,
  tenantId: string,
  opts: IncomeStatementOptions,
): Promise<IncomeStatement> {
  const maxLevel = opts.maxLevel ?? 5;
  if (maxLevel < 1 || maxLevel > 5) {
    throw new ReportRangeError(`Income statement levels run 1 to 5; asked for ${maxLevel}.`);
  }

  const tenant = await tx.tenant.findUniqueOrThrow({
    where: { id: tenantId },
    select: { functionalCurrency: true },
  });

  const accounts = await loadReportChart(tx, tenantId);
  const window = { from: opts.from, to: opts.to, costCenterId: opts.costCenterId };
  const slices = await ledgerSlice(tx, tenantId, window);
  const totals = rollUp(accounts, slices);

  // Movement only. An opening-balance injection on a revenue account is the
  // position the university arrived with, not income it earned in this window,
  // and REQ-PER-03 keeps the two apart.
  const periodAmount = (t: Totals) => t.movementDebit.minus(t.movementCredit);

  const comp = resolveComparative(opts);
  let compTotals: Map<string, Totals> | null = null;
  if (comp) {
    const compSlices = await ledgerSlice(tx, tenantId, {
      from: comp.from,
      to: comp.to,
      costCenterId: opts.costCenterId,
    });
    compTotals = rollUp(accounts, compSlices);
  }

  const build = (cls: AccountClass): StatementSection => {
    const s = section(cls, accounts, totals, maxLevel, opts.includeZeroRows ?? false, periodAmount);
    if (!compTotals) return s;

    const dir = normalDirectionOf(cls);
    let compTotal = ZERO;
    for (const row of s.rows) {
      const ct = compTotals.get(row.accountId) ?? ZERO_TOTALS;
      const amount = signedOf(periodAmount(ct), dir);
      row.comparative = amount.toFixed(4);
      row.variance = money(row.amount).minus(amount).toFixed(4);
      if (row.isPostable) compTotal = compTotal.plus(amount);
    }
    s.comparativeTotal = compTotal.toFixed(4);
    return s;
  };

  const revenue = build('REVENUE');
  const expenses = build('EXPENSE');

  const totalRevenue = money(revenue.total);
  const totalExpenses = money(expenses.total);
  const netSurplus = totalRevenue.minus(totalExpenses);

  const out: IncomeStatement = {
    from: iso(opts.from),
    to: iso(opts.to),
    currency: tenant.functionalCurrency.trim(),
    costCenterId: opts.costCenterId ?? null,
    maxLevel,
    comparative: comp ? { from: iso(comp.from), to: iso(comp.to) } : null,
    revenue,
    expenses,
    totalRevenue: totalRevenue.toFixed(4),
    totalExpenses: totalExpenses.toFixed(4),
    netSurplus: netSurplus.toFixed(4),
    segmented: Boolean(opts.costCenterId),
  };

  if (comp) {
    const cr = money(revenue.comparativeTotal ?? '0');
    const ce = money(expenses.comparativeTotal ?? '0');
    const cn = cr.minus(ce);
    out.comparativeTotalRevenue = cr.toFixed(4);
    out.comparativeTotalExpenses = ce.toFixed(4);
    out.comparativeNetSurplus = cn.toFixed(4);
    out.netVariance = netSurplus.minus(cn).toFixed(4);
  }

  return out;
}

// ---------------------------------------------------------------------------
// Shared
// ---------------------------------------------------------------------------

function section(
  cls: AccountClass,
  accounts: ReportAccount[],
  totals: Map<string, Totals>,
  maxLevel: number,
  includeZeroRows: boolean,
  extract: (t: Totals) => Money,
): StatementSection {
  const dir = normalDirectionOf(cls);
  const rows: StatementRow[] = [];
  let total = ZERO;

  for (const a of accounts) {
    if (classifyOrNull(a.code) !== cls) continue;
    const t = totals.get(a.id);
    if (!t) continue;

    // A postable account with no activity is dropped from the face of the
    // statement but still counted, so hiding it can never change a total.
    const raw = extract(t);
    if (a.isPostable) total = total.plus(signedOf(raw, dir));
    if (a.level > maxLevel) continue;
    if (!includeZeroRows && isEmpty(t)) continue;

    rows.push({
      accountId: a.id,
      code: a.code,
      nameAr: a.nameAr,
      nameEn: a.nameEn,
      level: a.level,
      parentId: a.parentId,
      isPostable: a.isPostable,
      amount: signedOf(raw, dir).toFixed(4),
    });
  }

  return {
    cls,
    labelEn: SECTION_LABELS[cls].en,
    labelAr: SECTION_LABELS[cls].ar,
    rows,
    total: total.toFixed(4),
  };
}

/** `signed` takes the four-column shape; here only one net is in hand. */
function signedOf(debitPositive: Money, dir: 'DEBIT' | 'CREDIT'): Money {
  return dir === 'DEBIT' ? debitPositive : debitPositive.negated();
}

function resolveComparative(
  opts: IncomeStatementOptions,
): { from: Date; to: Date } | null {
  const c = opts.comparative;
  if (!c) return null;
  if (typeof c === 'object') return c;

  if (c === 'prior-year') {
    return { from: shiftYears(opts.from, -1), to: shiftYears(opts.to, -1) };
  }

  // prior-period: the same number of days immediately before this window.
  const dayMs = 24 * 60 * 60 * 1000;
  const span = Math.round((opts.to.getTime() - opts.from.getTime()) / dayMs) + 1;
  return {
    from: new Date(opts.from.getTime() - span * dayMs),
    to: new Date(opts.from.getTime() - dayMs),
  };
}

function shiftYears(d: Date, by: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear() + by, d.getUTCMonth(), d.getUTCDate()));
}

/** Start of the fiscal year covering a date, or null if none does. */
async function fiscalYearStartCovering(
  tx: Tx,
  tenantId: string,
  date: Date,
): Promise<Date | null> {
  const y = await tx.fiscalYear.findFirst({
    where: { tenantId, startDate: { lte: date }, endDate: { gte: date } },
    select: { startDate: true },
  });
  return y?.startDate ?? null;
}
