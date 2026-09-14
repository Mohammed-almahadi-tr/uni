import { getTranslations } from 'next-intl/server';
import type { CostCenterOption } from '@/lib/console/finance';
import type { ReportRequest } from '@/lib/console/reports';

/**
 * The filter bar every report screen wears (Track D5).
 *
 * A **GET form**, like every other filter in this console, so the report a
 * user is looking at is in the address bar. That matters more here than
 * anywhere else: the URL is what the export links carry, so a report that
 * could not be described by a query string would be a report whose export
 * could not be trusted to match it.
 *
 * The fields are composed rather than fixed, because the six reports do not
 * ask the same questions. What is shared is the shape, the submit, and the
 * hidden `kind` — not a union of every filter with most of them disabled.
 */

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

export async function FilterBar({
  kind,
  children,
}: {
  kind: string;
  children: React.ReactNode;
}) {
  const t = await getTranslations('reports');

  return (
    <form method="get" className="no-print flex flex-wrap items-end gap-3">
      <input type="hidden" name="kind" value={kind} />
      {children}
      <button
        type="submit"
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        {t('run')}
      </button>
    </form>
  );
}

/** A movement window. Both ends inclusive, and said so on the screen, because
 *  "to 31 March" meaning "up to but not including" is the ambiguity that made
 *  the legacy grid and its Excel export disagree by a day. */
export async function WindowFields({ req }: { req: ReportRequest }) {
  const t = await getTranslations('reports');

  return (
    <>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('from')}</span>
        <input
          name="from"
          type="date"
          defaultValue={req.from}
          className={`numeric ${field}`}
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('to')}</span>
        <input name="to" type="date" defaultValue={req.to} className={`numeric ${field}`} />
      </label>
    </>
  );
}

/** A cutoff. A position rather than a movement — what the books say on one day. */
export async function AsOfField({ req }: { req: ReportRequest }) {
  const t = await getTranslations('reports');

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{t('asOf')}</span>
      <input name="asOf" type="date" defaultValue={req.asOf} className={`numeric ${field}`} />
    </label>
  );
}

/**
 * Restrict to one cost centre.
 *
 * The screen warns that a segment does not balance rather than hiding the
 * option, because a faculty's own income and expenditure is a question worth
 * asking — and the report itself says so in its notes when the filter is on.
 */
export async function CostCentreField({
  req,
  options,
}: {
  req: ReportRequest;
  options: CostCenterOption[];
}) {
  const t = await getTranslations('reports');
  if (options.length === 0) return null;

  return (
    <label className="block min-w-48">
      <span className="mb-1 block text-sm font-medium">{t('costCentre')}</span>
      <select name="costCenter" defaultValue={req.costCenterId ?? ''} className={field}>
        <option value="">{t('allCostCentres')}</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.code} · {c.nameEn}
          </option>
        ))}
      </select>
    </label>
  );
}

/** How deep into the chart to go. REQ-RPT-03 asks for levels 1-5. */
export async function LevelField({ req, max }: { req: ReportRequest; max: 4 | 5 }) {
  const t = await getTranslations('reports');
  const levels = Array.from({ length: max }, (_, i) => i + 1);

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{t('level')}</span>
      <select name="level" defaultValue={String(req.maxLevel ?? max)} className={field}>
        {levels.map((l) => (
          <option key={l} value={l}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Tabs across the top of a report that has more than one form.
 *
 * Links rather than a select, because each is its own report with its own
 * export — and a tab that changed the report without changing the address bar
 * would leave the export links pointing at the one that is no longer shown.
 */
export function ReportTabs({
  tabs,
  active,
}: {
  tabs: Array<{ href: string; label: string; key: string }>;
  active: string;
}) {
  return (
    <nav className="no-print flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <a
          key={tab.key}
          href={tab.href}
          aria-current={tab.key === active ? 'page' : undefined}
          className={
            tab.key === active
              ? 'inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground'
              : 'inline-flex h-9 items-center rounded-md border border-border px-4 text-sm hover:bg-muted'
          }
        >
          {tab.label}
        </a>
      ))}
    </nav>
  );
}
