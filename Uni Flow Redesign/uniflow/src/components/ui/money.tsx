import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/currency';

/**
 * A monetary figure.
 *
 * Always LTR with tabular digits, even inside Arabic text. Left to the
 * surrounding direction, "1,234.56" renders with its decimal separator or
 * minus sign in the wrong place next to Arabic characters, and a column of
 * figures fails to align — which is how a cashier reconciling a till reads
 * the wrong row.
 *
 * Formatting comes from `lib/currency.ts` rather than `lib/money.ts` so that
 * this component can be rendered inside a client component — the registration
 * desk prices a term in the browser. `lib/money.ts` is built on
 * `Prisma.Decimal` and cannot cross that boundary; nothing about *displaying*
 * an already-computed figure needs it to.
 */
export function Money({
  amount,
  currency,
  className,
  showCode = false,
}: {
  amount: string | number;
  currency: string;
  className?: string;
  showCode?: boolean;
}) {
  return (
    <span className={cn('numeric', className)}>
      {formatMoney(amount, currency)}
      {showCode ? ` ${currency.toUpperCase()}` : null}
    </span>
  );
}

/** A ledger side. Debit and credit are coloured as *sides*, not as good and
 *  bad — colouring a debit red implies an error where there is none. */
export function LedgerAmount({
  amount,
  currency,
  side,
  className,
}: {
  amount: string | number;
  currency: string;
  side: 'debit' | 'credit';
  className?: string;
}) {
  return (
    <Money
      amount={amount}
      currency={currency}
      className={cn(side === 'debit' ? 'text-debit' : 'text-credit', className)}
    />
  );
}
