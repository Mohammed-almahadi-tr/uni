import { cn } from '@/lib/utils';
import { toCurrency, type MoneyInput } from '@/lib/money';

/**
 * A monetary figure.
 *
 * Always LTR with tabular digits, even inside Arabic text. Left to the
 * surrounding direction, "1,234.56" renders with its decimal separator or
 * minus sign in the wrong place next to Arabic characters, and a column of
 * figures fails to align — which is how a cashier reconciling a till reads
 * the wrong row.
 */
export function Money({
  amount,
  currency,
  className,
  showCode = false,
}: {
  amount: MoneyInput;
  currency: string;
  className?: string;
  showCode?: boolean;
}) {
  const value = toCurrency(amount, currency);
  const formatted = value.toFixed(
    currency.toUpperCase() === 'KWD' || currency.toUpperCase() === 'BHD' ? 3 : 2,
  );
  const withSeparators = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return (
    <span className={cn('numeric', className)}>
      {withSeparators}
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
  amount: MoneyInput;
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
