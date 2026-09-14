/**
 * Which statement an account belongs to.
 *
 * The chart's coding scheme carries this: the first character of the code is
 * the major class, and `coa/template.ts` fixes the five of them —
 * 1 Assets · 2 Liabilities · 3 Equity · 4 Revenue · 5 Expenses. That
 * convention is the only classification the schema has, so rather than have
 * the balance sheet, the income statement and the year-end close each
 * rediscover it with their own `code.startsWith('4')`, it is read once here.
 *
 * A tenant that invents a code outside 1-5 gets a refusal naming the account,
 * not a statement that quietly omits it. An account missing from both the
 * balance sheet and the income statement is invisible money, and the whole
 * point of a trial balance is that nothing is invisible.
 */

export type AccountClass = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

/** Accounts whose balances close to equity at year end and restart at zero. */
export const RESULT_CLASSES: readonly AccountClass[] = ['REVENUE', 'EXPENSE'];

/** Accounts that carry forward. */
export const POSITION_CLASSES: readonly AccountClass[] = ['ASSET', 'LIABILITY', 'EQUITY'];

const BY_MAJOR: Record<string, AccountClass> = {
  '1': 'ASSET',
  '2': 'LIABILITY',
  '3': 'EQUITY',
  '4': 'REVENUE',
  '5': 'EXPENSE',
};

export class AccountClassificationError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AccountClassificationError';
  }
}

export function classify(code: string): AccountClass {
  const major = code.trim().charAt(0);
  const cls = BY_MAJOR[major];
  if (!cls) {
    throw new AccountClassificationError(
      code,
      `Account ${code} starts with "${major}", which is not one of the five ` +
        `major classes (1 Assets, 2 Liabilities, 3 Equity, 4 Revenue, ` +
        `5 Expenses). Every account must sit under one of them or it appears ` +
        `on no financial statement at all.`,
    );
  }
  return cls;
}

/** Classification that returns null instead of throwing, for callers filtering
 *  a chart they do not own — a report that must render *something*. */
export function classifyOrNull(code: string): AccountClass | null {
  return BY_MAJOR[code.trim().charAt(0)] ?? null;
}

export function isResultAccount(code: string): boolean {
  const c = classifyOrNull(code);
  return c === 'REVENUE' || c === 'EXPENSE';
}

/** Which way round the class normally sits. Used to present a statement figure
 *  as a positive number when the account is behaving as expected. */
export function normalDirectionOf(cls: AccountClass): 'DEBIT' | 'CREDIT' {
  return cls === 'ASSET' || cls === 'EXPENSE' ? 'DEBIT' : 'CREDIT';
}
