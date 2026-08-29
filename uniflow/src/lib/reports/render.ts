import type { ReportDocument, ReportRow, CellValue } from './document';

/**
 * CSV and print rendering (SRS REQ-RPT-07).
 *
 * ## On PDF
 *
 * REQ-RPT-07 asks for "bilingual PDF with university letterhead… correctly
 * shaped and right-aligned, with tabular figures". That is produced by
 * printing `toPrintableHtml` — not by a PDF writer in this repository, and the
 * distinction is a decision rather than an omission.
 *
 * Arabic is a cursive script: every letter has isolated, initial, medial and
 * final forms, several pairs form obligatory ligatures, and the whole run then
 * has to be reordered bidirectionally against any Latin text and any digits
 * beside it. A PDF content stream carries positioned glyphs, so a generator
 * has to do all of that itself before it writes a single byte. Doing it
 * *nearly* right is the failure mode that matters: the output looks like
 * Arabic, prints, gets signed, and is wrong in ways an English-reading
 * developer cannot see. Browsers already contain a correct implementation —
 * HarfBuzz, or the platform equivalent — and every target here has one.
 *
 * So the PDF path is: render this HTML, print it. The stylesheet below carries
 * the page setup, the letterhead and the repeated table header, so what comes
 * out of the print dialog is the document, not a screenshot of a screen.
 */

export interface RenderOptions {
  locale?: 'ar' | 'en';
}

export interface PrintOptions extends RenderOptions {
  /** Absolute or data URL. Omitted rather than broken if the tenant has none. */
  logoUrl?: string | null;
  /** Shown under the institution name — address, phone, registration number. */
  letterheadLines?: string[];
  /** Printed in the footer beside the page number. */
  generatedBy?: string;
  generatedAt?: Date;
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

/**
 * RFC 4180 CSV, CRLF-terminated, with a UTF-8 byte-order mark.
 *
 * The BOM is not decoration. Excel on Windows opens a BOM-less UTF-8 CSV in
 * the system ANSI codepage, which on an Arabic-locale machine renders every
 * account name as mojibake and on a Western one renders it as question marks.
 * Three bytes at the front are the whole difference between a usable export
 * and a support ticket.
 */
export function toCsv(doc: ReportDocument, opts: RenderOptions = {}): string {
  const locale = opts.locale ?? 'ar';
  const label = (en: string, ar: string) => (locale === 'ar' ? ar : en);
  const lines: string[] = [];

  lines.push(csvRow([label(doc.titleEn, doc.titleAr)]));
  const subtitle = locale === 'ar' ? doc.subtitleAr : doc.subtitleEn;
  if (subtitle) lines.push(csvRow([subtitle]));
  for (const m of doc.meta) lines.push(csvRow([label(m.labelEn, m.labelAr), m.value]));
  lines.push('');

  lines.push(csvRow(doc.columns.map((c) => label(c.labelEn, c.labelAr))));
  for (const row of doc.rows) lines.push(csvRow(row.cells.map(cellText)));

  const notes = locale === 'ar' ? doc.notesAr : doc.notesEn;
  if (notes.length > 0) {
    lines.push('');
    for (const n of notes) lines.push(csvRow([n]));
  }

  return '﻿' + lines.join('\r\n') + '\r\n';
}

function csvRow(cells: string[]): string {
  return cells.map(csvCell).join(',');
}

function csvCell(value: string): string {
  // Quote when the value contains a delimiter, a quote or a line break — and
  // also when it has leading or trailing space, which some parsers otherwise
  // strip and others do not.
  if (/[",\r\n]/.test(value) || value !== value.trim()) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function cellText(cell: CellValue): string {
  switch (cell.kind) {
    case 'blank':
      return '';
    case 'int':
      return String(cell.value);
    case 'money':
    case 'text':
      return cell.value;
  }
}

// ---------------------------------------------------------------------------
// Print sheet
// ---------------------------------------------------------------------------

export function toPrintableHtml(doc: ReportDocument, opts: PrintOptions = {}): string {
  const locale = opts.locale ?? 'ar';
  const rtl = locale === 'ar';
  const label = (en: string, ar: string) => (locale === 'ar' ? ar : en);
  const title = label(doc.titleEn, doc.titleAr);
  const subtitle = locale === 'ar' ? doc.subtitleAr : doc.subtitleEn;
  const notes = locale === 'ar' ? doc.notesAr : doc.notesEn;
  const generatedAt = opts.generatedAt ?? new Date();

  const head = doc.columns
    .map((c) => `<th class="${c.align === 'end' ? 'num' : ''}">${esc(label(c.labelEn, c.labelAr))}</th>`)
    .join('');

  const body = doc.rows.map((row) => renderRow(doc, row)).join('');

  const meta = doc.meta
    .map(
      (m) =>
        `<div class="meta-item"><span class="meta-label">${esc(label(m.labelEn, m.labelAr))}</span>` +
        `<span class="meta-value">${esc(m.value)}</span></div>`,
    )
    .join('');

  const letterhead = (opts.letterheadLines ?? [])
    .map((l) => `<div class="letterhead-line">${esc(l)}</div>`)
    .join('');

  const noteBlock =
    notes.length > 0
      ? `<section class="notes">${notes.map((n) => `<p>${esc(n)}</p>`).join('')}</section>`
      : '';

  return `<!doctype html>
<html lang="${rtl ? 'ar' : 'en'}" dir="${rtl ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  @page { size: A4 landscape; margin: 14mm 12mm 16mm; }

  :root {
    --ink: #0f1729;
    --muted: #65758b;
    --line: #e1e7ef;
    --band: #f8fafc;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    color: var(--ink);
    background: #fff;
    font-family: ${rtl ? '"Cairo", "Noto Naskh Arabic", "Segoe UI"' : '"Inter", "Segoe UI"'}, system-ui, sans-serif;
    font-size: 11px;
    line-height: 1.45;
  }

  /* Figures stay left-to-right inside Arabic text. Without the isolation the
     decimal separator and the minus sign are reordered by the bidi algorithm
     and land at the wrong end of the number. */
  .num {
    font-family: "JetBrains Mono", ui-monospace, "Courier New", monospace;
    font-variant-numeric: tabular-nums;
    direction: ltr;
    unicode-bidi: isolate;
    text-align: ${rtl ? 'left' : 'right'};
    white-space: nowrap;
  }

  header.sheet { display: flex; align-items: flex-start; gap: 16px;
                 border-bottom: 2px solid var(--ink); padding-bottom: 10px; margin-bottom: 12px; }
  header.sheet img { height: 54px; width: auto; }
  .institution { font-size: 15px; font-weight: 700; }
  .letterhead-line { color: var(--muted); font-size: 10px; }
  .title-block { margin-inline-start: auto; text-align: ${rtl ? 'left' : 'right'}; }
  .doc-title { font-size: 17px; font-weight: 700; }
  .doc-subtitle { color: var(--muted); }

  .meta { display: flex; flex-wrap: wrap; gap: 4px 22px; margin-bottom: 10px; }
  .meta-label { color: var(--muted); }
  .meta-label::after { content: ": "; }
  .meta-value { font-weight: 600; }

  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; page-break-inside: avoid; }
  th, td { padding: 4px 6px; border-bottom: 1px solid var(--line); vertical-align: top; }
  th { background: var(--band); text-align: ${rtl ? 'right' : 'left'};
       font-weight: 700; border-bottom: 1.5px solid var(--ink); }
  th.num { text-align: ${rtl ? 'left' : 'right'}; }

  tr.subtotal td { background: var(--band); font-weight: 600; }
  tr.total td { font-weight: 700; border-top: 1.5px solid var(--ink);
                border-bottom: 3px double var(--ink); }
  td.negative { color: #c52020; }

  .notes { margin-top: 14px; padding-top: 8px; border-top: 1px solid var(--line); }
  .notes p { margin: 0 0 4px; color: #8a5a00; font-size: 10px; }

  footer.sheet { margin-top: 12px; padding-top: 6px; border-top: 1px solid var(--line);
                 display: flex; justify-content: space-between; color: var(--muted); font-size: 9px; }

  @media print {
    /* Backgrounds carry meaning here — the banded subtotal rows are how the
       hierarchy reads on paper — so ask the browser to keep them. */
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
  }
</style>
</head>
<body>
<header class="sheet">
  ${opts.logoUrl ? `<img src="${esc(opts.logoUrl)}" alt="">` : ''}
  <div>
    <div class="institution">${esc(doc.meta.find((m) => m.labelEn === 'Institution')?.value ?? '')}</div>
    ${letterhead}
  </div>
  <div class="title-block">
    <div class="doc-title">${esc(title)}</div>
    ${subtitle ? `<div class="doc-subtitle">${esc(subtitle)}</div>` : ''}
  </div>
</header>

<section class="meta">${meta}</section>

<table>
  <thead><tr>${head}</tr></thead>
  <tbody>${body}</tbody>
</table>

${noteBlock}

<footer class="sheet">
  <span>${esc(opts.generatedBy ? `${label('Generated by', 'أصدرها')} ${opts.generatedBy}` : '')}</span>
  <span class="num">${esc(generatedAt.toISOString().slice(0, 19).replace('T', ' '))}</span>
</footer>
</body>
</html>`;
}

function renderRow(doc: ReportDocument, row: ReportRow): string {
  const cls = row.emphasis && row.emphasis !== 'none' ? ` class="${row.emphasis}"` : '';
  const cells = row.cells
    .map((cell, i) => {
      const col = doc.columns[i];
      const isNum = col?.align === 'end';
      const value = cellText(cell);
      const negative = cell.kind === 'money' && value.trim().startsWith('-');
      const indent =
        i === 1 && row.level ? ` style="padding-inline-start:${(row.level - 1) * 12 + 6}px"` : '';
      const classes = [isNum ? 'num' : '', negative ? 'negative' : ''].filter(Boolean).join(' ');
      return `<td${classes ? ` class="${classes}"` : ''}${indent}>${esc(value)}</td>`;
    })
    .join('');
  return `<tr${cls}>${cells}</tr>`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
