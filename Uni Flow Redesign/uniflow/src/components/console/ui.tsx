import { cn } from '@/lib/utils';
import { Money } from '@/components/ui/money';

/**
 * Console primitives (Track D1/D3).
 *
 * Small and deliberately plain. The design decisions that matter here were
 * already made in `globals.css` — tabular figures, LTR-isolated amounts,
 * debit and credit coloured as sides rather than as good and bad, a 44px
 * touch target because cashiers work on tablets in a hurry. These components
 * only apply them consistently so that every D2-D5 screen does not re-decide.
 */

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string | null;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  className,
  actions,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}) {
  return (
    <section className={cn('rounded-lg border border-border bg-card', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
          {title && <h2 className="font-semibold">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/**
 * An error a member of staff has to act on.
 *
 * `role="alert"` because these are announced after a form submission and a
 * screen reader user must not have to go looking for the reason their
 * registration was refused.
 */
export function ErrorBanner({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role="alert"
      className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
    >
      {children}
    </p>
  );
}

export function SuccessBanner({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">{children}</p>
  );
}

export function WarningBanner({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return (
    <div className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
      {children}
    </div>
  );
}

/** A short status word. Colour carries no judgement — see globals.css. */
export function Pill({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const tones = {
    neutral: 'border-border bg-muted text-muted-foreground',
    good: 'border-success/40 bg-success/10 text-success',
    warn: 'border-warning/40 bg-warning/10 text-warning',
    bad: 'border-destructive/40 bg-destructive/10 text-destructive',
  } as const;
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}

/** Wide tables scroll inside their own box; the page never scrolls sideways. */
export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return <table className="w-full border-collapse text-sm">{children}</table>;
}

export function Th({
  children,
  numeric,
}: {
  children?: React.ReactNode;
  numeric?: boolean;
}) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-border px-3 py-2 text-start font-medium text-muted-foreground',
        numeric && 'text-end',
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  numeric,
  className,
}: {
  children?: React.ReactNode;
  numeric?: boolean;
  className?: string;
}) {
  return (
    <td
      className={cn(
        'border-b border-border px-3 py-2 align-top',
        numeric && 'text-end',
        className,
      )}
    >
      {children}
    </td>
  );
}

/** A labelled fact. Used everywhere a screen shows a stored value. */
export function Fact({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

export function FactGrid({ children }: { children: React.ReactNode }) {
  return <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</dl>;
}

export function Field({
  name,
  label,
  type = 'text',
  required,
  defaultValue,
  placeholder,
  dir,
  step,
  min,
  max,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string | number;
  placeholder?: string;
  dir?: 'ltr' | 'rtl';
  step?: string;
  min?: string | number;
  max?: string | number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        placeholder={placeholder}
        dir={dir}
        step={step}
        min={min}
        max={max}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function TextArea({
  name,
  label,
  required,
  rows = 3,
  defaultValue,
  hint,
}: {
  name: string;
  label: string;
  required?: boolean;
  rows?: number;
  defaultValue?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <textarea
        name={name}
        required={required}
        rows={rows}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

export function Select({
  name,
  label,
  options,
  defaultValue,
  required,
  hint,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

/** A monetary amount in a table cell. Always LTR, always tabular. */
export function Amount({
  value,
  currency,
  className,
}: {
  value: string;
  currency: string;
  className?: string;
}) {
  return <Money amount={value} currency={currency} className={className} />;
}
