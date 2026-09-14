import { getTranslations } from 'next-intl/server';
import type { CellValue, ReportDocument, ReportRow } from '@/lib/reports/document';
import { Table, TableWrap, Th, WarningBanner } from './ui';
import { exportHref, type ReportRequest } from '@/lib/console/reports';
import { cn } from '@/lib/utils';

/**
 * Rendering a report on screen (Track D5).
 *
 * The fourth renderer of `ReportDocument`, beside CSV, XLSX and the print
 * sheet — and deliberately the same shape as the other three rather than a
 * hand-built table per report. Six report screens each drawing their own table
 * is six places for a column to be dropped, and the one that gets dropped is
 * always the one nobody looks at until an auditor does.
 *
 * What this renderer adds that the file renderers cannot: the reader's
 * language chooses the labels, and a figure that is negative is coloured.
 * What it deliberately does not add: any figure the document does not carry.
 * There is no arithmetic in this file.
 */

export function ReportTable({
  doc,
  locale,
}: {
  doc: ReportDocument;
  locale: 'ar' | 'en';
}) {
  const label = (en: string, ar: string) => (locale === 'ar' ? ar : en);

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            {doc.columns.map((c) => (
              <Th key={c.key} numeric={c.align === 'end'}>
                {label(c.labelEn, c.labelAr)}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {doc.rows.map((row, i) => (
            <Row key={i} doc={doc} row={row} />
          ))}
        </tbody>
      </Table>
    </TableWrap>
  );
}

function Row({ doc, row }: { doc: ReportDocument; row: ReportRow }) {
  const emphasis = row.emphasis ?? 'none';

  return (
    <tr
      className={cn(
        'break-inside-avoid',
        emphasis === 'subtotal' && 'bg-muted font-medium',
        emphasis === 'total' && 'border-t-2 border-foreground font-semibold',
      )}
    >
      {row.cells.map((cell, i) => {
        const col = doc.columns[i];
        const numeric = col?.align === 'end';
        const value = cellText(cell);
        const negative = cell.kind === 'money' && value.trim().startsWith('-');

        return (
          <td
            key={col?.key ?? i}
            className={cn(
              'border-b border-border px-3 py-1.5 align-top',
              numeric && 'numeric text-end',
              negative && 'text-destructive',
            )}
            // The chart's depth is indented rather than shown as a number,
            // because a reader scanning a trial balance is looking for the
            // shape of the hierarchy and not for its arithmetic.
            style={
              i === 1 && row.level
                ? { paddingInlineStart: `${(row.level - 1) * 12 + 12}px` }
                : undefined
            }
          >
            {value}
          </td>
        );
      })}
    </tr>
  );
}

function cellText(cell: CellValue): string {
  switch (cell.kind) {
    case 'blank':
      return '';
    case 'int':
      return String(cell.value);
    default:
      return cell.value;
  }
}

/**
 * The notes under a report.
 *
 * Rendered as a warning rather than a footnote when the report is flagged,
 * because the notes on these documents are not commentary — "this trial
 * balance does not balance" is the single most important thing on the page,
 * and a reader who has already read the figures has read them for nothing.
 */
export async function ReportNotes({
  doc,
  locale,
  alert,
}: {
  doc: ReportDocument;
  locale: 'ar' | 'en';
  alert: boolean;
}) {
  const notes = locale === 'ar' ? doc.notesAr : doc.notesEn;
  if (notes.length === 0) return null;

  if (alert) {
    return (
      <div className="mt-4 space-y-2">
        {notes.map((n) => (
          <WarningBanner key={n}>{n}</WarningBanner>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-1 border-t border-border pt-3">
      {notes.map((n) => (
        <p key={n} className="text-xs text-muted-foreground">
          {n}
        </p>
      ))}
    </div>
  );
}

/**
 * The three ways out of a report.
 *
 * Links, not buttons: the query string is the report, so an export can be
 * bookmarked, sent to a colleague, and read before it is opened. Each one
 * carries the **same** query the screen was rendered from — built by
 * `reportQuery` rather than assembled here — so what downloads is what is on
 * screen. Two hand-built query strings is how the legacy build's grid and its
 * Excel button came to disagree by a day.
 */
export async function ExportBar({
  request,
  locale,
}: {
  request: ReportRequest;
  locale: 'ar' | 'en';
}) {
  const t = await getTranslations('reports');
  const cls =
    'inline-flex h-9 items-center rounded-md border border-border px-3 text-sm hover:bg-muted';

  return (
    <div className="no-print flex flex-wrap gap-2">
      <a href={exportHref(locale, request, 'csv')} className={cls}>
        {t('exportCsv')}
      </a>
      <a href={exportHref(locale, request, 'xlsx')} className={cls}>
        {t('exportXlsx')}
      </a>
      {/* The print sheet opens in a new tab because it replaces the whole
          document — it is a standalone page with its own letterhead, not a
          view of this screen. */}
      <a
        href={exportHref(locale, request, 'html')}
        target="_blank"
        rel="noopener"
        className={cls}
      >
        {t('printSheet')}
      </a>
    </div>
  );
}
