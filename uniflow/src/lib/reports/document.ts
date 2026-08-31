import { money } from '@/lib/money';
import type { TrialBalance } from './trial-balance';
import type { BalanceSheet, IncomeStatement, StatementSection } from './statements';
import type { ReconciliationReport } from './reconciliation';
// Type-only, deliberately. These four live in `server-only` modules, and a
// value import would drag the Prisma client into any client component that
// renders a report table. `import type` is erased before the bundler sees it,
// which is what keeps this module usable from both runtimes.
import type { AgedReceivables, Statement } from '@/lib/students/account';
import type { SponsorAging } from '@/lib/sponsors/billing';
import type { AgingBucket as VendorAgingRow } from '@/lib/procurement/invoices';
import type { ExposureReport } from '@/lib/sponsors/scholarships';

/**
 * One neutral shape that every renderer consumes (SRS REQ-RPT-07).
 *
 * CSV, Excel and the print sheet are three renderings of a report, not three
 * reports. Writing each exporter against `TrialBalance`, `BalanceSheet` and
 * `IncomeStatement` separately would mean nine implementations and nine places
 * for a column to go missing from one format only — the kind of defect nobody
 * notices until an auditor's spreadsheet is short a column.
 *
 * Every figure arrives here already formatted as a decimal string. Nothing
 * downstream does arithmetic, and nothing downstream sees a JavaScript number
 * holding money.
 */

export type CellValue =
  | { kind: 'text'; value: string }
  | { kind: 'money'; value: string }
  | { kind: 'int'; value: number }
  | { kind: 'blank' };

export interface ReportColumn {
  key: string;
  labelEn: string;
  labelAr: string;
  kind: 'text' | 'money' | 'int';
  /** `start`/`end` rather than left/right: the sheet mirrors under RTL. */
  align: 'start' | 'end';
  /** Approximate character width, for the spreadsheet's column sizing. */
  width?: number;
}

export interface ReportRow {
  cells: CellValue[];
  /** Chart depth 1-5, used to indent the first column. */
  level?: number;
  emphasis?: 'none' | 'subtotal' | 'total';
}

export interface ReportMeta {
  labelEn: string;
  labelAr: string;
  value: string;
}

export interface ReportDocument {
  titleEn: string;
  titleAr: string;
  subtitleEn?: string;
  subtitleAr?: string;
  /** Institution name, currency, window, filters — the header block. */
  meta: ReportMeta[];
  columns: ReportColumn[];
  rows: ReportRow[];
  /** Warnings a reader must see before trusting the figures. */
  notesEn: string[];
  notesAr: string[];
}

const text = (value: string): CellValue => ({ kind: 'text', value });
const cash = (value: string): CellValue => ({ kind: 'money', value });

export interface DocumentContext {
  institutionEn: string;
  institutionAr: string;
}

// ---------------------------------------------------------------------------
// Trial balance
// ---------------------------------------------------------------------------

export function trialBalanceDocument(
  tb: TrialBalance,
  ctx: DocumentContext,
): ReportDocument {
  const notesEn: string[] = [];
  const notesAr: string[] = [];

  if (tb.segmented) {
    notesEn.push(
      'Filtered to one cost centre. A segment of the ledger does not balance: ' +
        'entries whose other side carries a different cost centre, or none, are ' +
        'only half present.',
    );
    notesAr.push(
      'التقرير مُرشَّح على مركز تكلفة واحد، ولذلك لا يتوازن: القيود التي يقع طرفها ' +
        'الآخر على مركز تكلفة آخر أو بلا مركز تظهر بنصفها فقط.',
    );
  } else if (!tb.balanced) {
    notesEn.push(
      'THIS TRIAL BALANCE DOES NOT BALANCE. Total debits differ from total ' +
        'credits, which means something has written to the ledger outside the ' +
        'posting engine. Treat every figure below as unverified and raise this ' +
        'before acting on it.',
    );
    notesAr.push(
      'هذا الميزان غير متوازن. مجموع المدين لا يساوي مجموع الدائن، ما يعني أن جهة ما ' +
        'كتبت في دفتر الأستاذ من خارج محرك القيد. لا يُعتمد أي رقم أدناه قبل معالجة السبب.',
    );
  }

  return {
    titleEn: 'Trial Balance',
    titleAr: 'ميزان المراجعة',
    subtitleEn: `${tb.from} to ${tb.to}`,
    subtitleAr: `من ${tb.from} إلى ${tb.to}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionEn },
      { labelEn: 'Currency', labelAr: 'العملة', value: tb.currency },
      { labelEn: 'From', labelAr: 'من', value: tb.from },
      { labelEn: 'To', labelAr: 'إلى', value: tb.to },
    ],
    columns: [
      { key: 'code', labelEn: 'Code', labelAr: 'الرمز', kind: 'text', align: 'start', width: 12 },
      { key: 'name', labelEn: 'Account', labelAr: 'الحساب', kind: 'text', align: 'start', width: 42 },
      { key: 'od', labelEn: 'Opening Dr', labelAr: 'رصيد افتتاحي مدين', kind: 'money', align: 'end', width: 16 },
      { key: 'oc', labelEn: 'Opening Cr', labelAr: 'رصيد افتتاحي دائن', kind: 'money', align: 'end', width: 16 },
      { key: 'md', labelEn: 'Movement Dr', labelAr: 'حركة مدينة', kind: 'money', align: 'end', width: 16 },
      { key: 'mc', labelEn: 'Movement Cr', labelAr: 'حركة دائنة', kind: 'money', align: 'end', width: 16 },
      { key: 'cd', labelEn: 'Closing Dr', labelAr: 'رصيد ختامي مدين', kind: 'money', align: 'end', width: 16 },
      { key: 'cc', labelEn: 'Closing Cr', labelAr: 'رصيد ختامي دائن', kind: 'money', align: 'end', width: 16 },
    ],
    rows: [
      ...tb.rows.map((r) => ({
        level: r.level,
        emphasis: (r.isPostable ? 'none' : 'subtotal') as ReportRow['emphasis'],
        cells: [
          text(r.code),
          text(r.nameAr),
          cash(r.openingDebit),
          cash(r.openingCredit),
          cash(r.movementDebit),
          cash(r.movementCredit),
          cash(r.closingDebit),
          cash(r.closingCredit),
        ],
      })),
      {
        emphasis: 'total',
        cells: [
          text(''),
          text('الإجمالي — Total'),
          cash(tb.totals.openingDebit),
          cash(tb.totals.openingCredit),
          cash(tb.totals.movementDebit),
          cash(tb.totals.movementCredit),
          cash(tb.totals.closingDebit),
          cash(tb.totals.closingCredit),
        ],
      },
    ],
    notesEn,
    notesAr,
  };
}

// ---------------------------------------------------------------------------
// Balance sheet
// ---------------------------------------------------------------------------

export function balanceSheetDocument(
  bs: BalanceSheet,
  ctx: DocumentContext,
): ReportDocument {
  const rows: ReportRow[] = [];

  const pushSection = (s: StatementSection, totalLabel: string) => {
    rows.push({
      emphasis: 'subtotal',
      cells: [text(''), text(`${s.labelAr} — ${s.labelEn}`), { kind: 'blank' }],
    });
    for (const r of s.rows) {
      rows.push({
        level: r.level,
        emphasis: r.isPostable ? 'none' : 'subtotal',
        cells: [text(r.code), text(r.nameAr), cash(r.amount)],
      });
    }
    rows.push({ emphasis: 'total', cells: [text(''), text(totalLabel), cash(s.total)] });
  };

  pushSection(bs.assets, 'إجمالي الأصول — Total assets');
  pushSection(bs.liabilities, 'إجمالي الخصوم — Total liabilities');
  pushSection(bs.equity, 'حقوق الملكية — Equity accounts');

  rows.push({
    emphasis: 'subtotal',
    cells: [
      text(''),
      text('فائض (عجز) لم يُرحَّل بعد — Result not yet transferred to reserves'),
      cash(bs.unappropriatedResult),
    ],
  });
  rows.push({
    emphasis: 'total',
    cells: [text(''), text('إجمالي حقوق الملكية — Total equity'), cash(bs.totalEquity)],
  });
  rows.push({
    emphasis: 'total',
    cells: [
      text(''),
      text('الأصول ناقص (الخصوم وحقوق الملكية) — Assets less liabilities and equity'),
      cash(bs.difference),
    ],
  });

  const notesEn: string[] = [];
  const notesAr: string[] = [];

  if (bs.spansPriorYears) {
    notesEn.push(
      'The result line covers more than the current fiscal year: at least one ' +
        'earlier year was never closed, so its surplus is still sitting in the ' +
        'revenue and expense accounts rather than in reserves. Run the year-end ' +
        'close for the earlier year before publishing this statement.',
    );
    notesAr.push(
      'سطر النتيجة يشمل أكثر من السنة المالية الجارية: هناك سنة سابقة لم تُقفل، ' +
        'وفائضها ما زال في حسابات الإيرادات والمصروفات بدل الاحتياطيات. ' +
        'يُنفَّذ إقفال السنة السابقة قبل اعتماد هذه القائمة.',
    );
  }
  if (bs.segmented) {
    notesEn.push(
      'Filtered to one cost centre, so the two sides are not expected to agree. ' +
        'A balance sheet is a statement about an institution, not about a department.',
    );
    notesAr.push(
      'التقرير مُرشَّح على مركز تكلفة واحد، فلا يُتوقع تطابق الطرفين. ' +
        'الميزانية العمومية بيان عن المؤسسة لا عن قسم داخلها.',
    );
  } else if (!bs.balanced) {
    notesEn.push(
      `THIS BALANCE SHEET DOES NOT BALANCE — out by ${bs.difference}. ` +
        'Assets must equal liabilities plus equity including the result for the ' +
        'period. Raise this before the statement leaves the building.',
    );
    notesAr.push(
      `هذه الميزانية غير متوازنة — الفرق ${bs.difference}. ` +
        'الأصول يجب أن تساوي الخصوم وحقوق الملكية شاملةً نتيجة الفترة. ' +
        'تُعالَج هذه المسألة قبل خروج القائمة.',
    );
  }

  return {
    titleEn: 'Balance Sheet',
    titleAr: 'الميزانية العمومية',
    subtitleEn: `As at ${bs.asOf}`,
    subtitleAr: `كما في ${bs.asOf}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionAr },
      { labelEn: 'Currency', labelAr: 'العملة', value: bs.currency },
      { labelEn: 'As at', labelAr: 'كما في', value: bs.asOf },
      { labelEn: 'Detail level', labelAr: 'مستوى التفصيل', value: String(bs.maxLevel) },
    ],
    columns: [
      { key: 'code', labelEn: 'Code', labelAr: 'الرمز', kind: 'text', align: 'start', width: 12 },
      { key: 'name', labelEn: 'Account', labelAr: 'الحساب', kind: 'text', align: 'start', width: 56 },
      { key: 'amount', labelEn: 'Amount', labelAr: 'المبلغ', kind: 'money', align: 'end', width: 18 },
    ],
    rows,
    notesEn,
    notesAr,
  };
}

// ---------------------------------------------------------------------------
// Income statement
// ---------------------------------------------------------------------------

export function incomeStatementDocument(
  is: IncomeStatement,
  ctx: DocumentContext,
): ReportDocument {
  const comparative = is.comparative !== null;
  const rows: ReportRow[] = [];

  const pad = (cells: CellValue[]): CellValue[] =>
    comparative ? cells : cells.slice(0, 3);

  const pushSection = (s: StatementSection, totalLabel: string) => {
    rows.push({
      emphasis: 'subtotal',
      cells: pad([text(''), text(`${s.labelAr} — ${s.labelEn}`), { kind: 'blank' }, { kind: 'blank' }, { kind: 'blank' }]),
    });
    for (const r of s.rows) {
      rows.push({
        level: r.level,
        emphasis: r.isPostable ? 'none' : 'subtotal',
        cells: pad([
          text(r.code),
          text(r.nameAr),
          cash(r.amount),
          cash(r.comparative ?? '0.0000'),
          cash(r.variance ?? '0.0000'),
        ]),
      });
    }
    rows.push({
      emphasis: 'total',
      cells: pad([
        text(''),
        text(totalLabel),
        cash(s.total),
        cash(s.comparativeTotal ?? '0.0000'),
        cash(diff(s.total, s.comparativeTotal)),
      ]),
    });
  };

  pushSection(is.revenue, 'إجمالي الإيرادات — Total revenue');
  pushSection(is.expenses, 'إجمالي المصروفات — Total expenses');

  rows.push({
    emphasis: 'total',
    cells: pad([
      text(''),
      text('صافي الفائض (العجز) — Net surplus / (deficit)'),
      cash(is.netSurplus),
      cash(is.comparativeNetSurplus ?? '0.0000'),
      cash(is.netVariance ?? '0.0000'),
    ]),
  });

  const columns: ReportColumn[] = [
    { key: 'code', labelEn: 'Code', labelAr: 'الرمز', kind: 'text', align: 'start', width: 12 },
    { key: 'name', labelEn: 'Account', labelAr: 'الحساب', kind: 'text', align: 'start', width: 52 },
    { key: 'amount', labelEn: 'Period', labelAr: 'الفترة', kind: 'money', align: 'end', width: 18 },
  ];
  if (comparative) {
    columns.push(
      { key: 'comparative', labelEn: 'Comparative', labelAr: 'المقارنة', kind: 'money', align: 'end', width: 18 },
      { key: 'variance', labelEn: 'Variance', labelAr: 'الفرق', kind: 'money', align: 'end', width: 18 },
    );
  }

  const notesEn: string[] = [];
  const notesAr: string[] = [];
  if (is.segmented) {
    notesEn.push(
      'Filtered to one cost centre. Expenses carrying no cost centre — shared ' +
        'overheads, for the most part — are excluded, so this is a contribution ' +
        'figure and not a full result for the department.',
    );
    notesAr.push(
      'التقرير مُرشَّح على مركز تكلفة واحد. المصروفات غير المحمَّلة على مركز تكلفة — ' +
        'وأغلبها أعباء مشتركة — غير مشمولة، فالرقم مساهمة لا نتيجة كاملة للقسم.',
    );
  }

  return {
    titleEn: 'Income Statement',
    titleAr: 'قائمة الدخل',
    subtitleEn: `${is.from} to ${is.to}`,
    subtitleAr: `من ${is.from} إلى ${is.to}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionAr },
      { labelEn: 'Currency', labelAr: 'العملة', value: is.currency },
      { labelEn: 'From', labelAr: 'من', value: is.from },
      { labelEn: 'To', labelAr: 'إلى', value: is.to },
      ...(is.comparative
        ? [
            {
              labelEn: 'Comparative',
              labelAr: 'فترة المقارنة',
              value: `${is.comparative.from} → ${is.comparative.to}`,
            },
          ]
        : []),
    ],
    columns,
    rows,
    notesEn,
    notesAr,
  };
}

// ---------------------------------------------------------------------------
// Sub-ledger reconciliation
// ---------------------------------------------------------------------------

export function reconciliationDocument(
  rr: ReconciliationReport,
  ctx: DocumentContext,
): ReportDocument {
  const notesEn: string[] = [];
  const notesAr: string[] = [];

  if (!rr.ok) {
    notesEn.push(
      `${rr.breaches.length} control account(s) disagree with their sub-ledger. ` +
        'This is a P1 data-integrity alert, not a rounding difference: two records ' +
        'of the same money differ and it is not yet known which is wrong. Do not ' +
        'close the period until it is resolved.',
    );
    notesAr.push(
      `${rr.breaches.length} من حسابات المراقبة لا تطابق دفاترها المساعدة. ` +
        'هذا إنذار سلامة بيانات من الدرجة الأولى وليس فرق تقريب: سجلّان لنفس المال ' +
        'يختلفان ولم يُعرف بعد أيهما الخطأ. لا يُقفل الدور قبل معالجته.',
    );
  }

  // A line carries a note when the numbers alone do not explain it — the
  // orphaned-control-balance check reads zero in a healthy system, and a
  // reader seeing a row of zeros deserves to know why it is there. Added in
  // D5: the engine had always produced these and every renderer dropped them.
  for (const line of rr.lines) {
    if (!line.note) continue;
    notesEn.push(`${line.labelEn}: ${line.note}`);
    notesAr.push(`${line.labelAr}: ${line.note}`);
  }

  return {
    titleEn: 'Sub-Ledger Reconciliation',
    titleAr: 'مطابقة الدفاتر المساعدة',
    subtitleEn: `As at ${rr.asOf}`,
    subtitleAr: `كما في ${rr.asOf}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionAr },
      { labelEn: 'Currency', labelAr: 'العملة', value: rr.currency },
      { labelEn: 'As at', labelAr: 'كما في', value: rr.asOf },
      {
        labelEn: 'Status',
        labelAr: 'الحالة',
        value: rr.ok ? 'OK — مطابق' : `${rr.breaches.length} variance(s) — فروقات`,
      },
    ],
    columns: [
      { key: 'check', labelEn: 'Check', labelAr: 'المطابقة', kind: 'text', align: 'start', width: 52 },
      { key: 'subledger', labelEn: 'Sub-ledger', labelAr: 'الدفتر المساعد', kind: 'money', align: 'end', width: 18 },
      { key: 'control', labelEn: 'Control account', labelAr: 'حساب المراقبة', kind: 'money', align: 'end', width: 18 },
      { key: 'variance', labelEn: 'Variance', labelAr: 'الفرق', kind: 'money', align: 'end', width: 18 },
      { key: 'status', labelEn: 'Status', labelAr: 'الحالة', kind: 'text', align: 'start', width: 12 },
    ],
    rows: rr.lines.map((l) => ({
      emphasis: (l.severity === 'VARIANCE' ? 'total' : 'none') as ReportRow['emphasis'],
      cells: [
        text(l.labelAr),
        cash(l.subledger),
        cash(l.control),
        cash(l.variance),
        text(l.severity === 'OK' ? 'مطابق' : 'فرق'),
      ],
    })),
    notesEn,
    notesAr,
  };
}

function diff(a: string, b: string | undefined): string {
  if (b === undefined) return '0.0000';
  return money(a).minus(money(b)).toFixed(4);
}

// ---------------------------------------------------------------------------
// Aged receivables and payables (Track D5, SRS REQ-RPT-02)
// ---------------------------------------------------------------------------

/**
 * Three aging reports, three document builders, one shape.
 *
 * Students, sponsors and vendors are aged by three different modules against
 * three different sub-ledgers, and they deliberately stay three reports rather
 * than one with a "party type" column. What each one *means* differs: a
 * student is aged from the charge's due date, a sponsor from the date the
 * invoice was sent them — never from the charge, because a sponsor is not late
 * for a bill nobody posted — and a vendor from the terms on their invoice.
 * Stacking them in one table would put three definitions of "60 days overdue"
 * in one column and invite somebody to total it.
 */

export function studentAgingDocument(
  ar: AgedReceivables,
  ctx: DocumentContext,
  currency: string,
): ReportDocument {
  const asOf = ar.asOf.toISOString().slice(0, 10);

  return {
    titleEn: 'Aged Student Receivables',
    titleAr: 'أعمار ذمم الطلاب',
    subtitleEn: `As at ${asOf}`,
    subtitleAr: `كما في ${asOf}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionAr },
      { labelEn: 'Currency', labelAr: 'العملة', value: currency },
      { labelEn: 'As at', labelAr: 'كما في', value: asOf },
      { labelEn: 'Students', labelAr: 'عدد الطلاب', value: String(ar.students.length) },
    ],
    columns: [
      { key: 'studentNo', labelEn: 'Student no.', labelAr: 'الرقم الجامعي', kind: 'text', align: 'start', width: 16 },
      { key: 'name', labelEn: 'Name', labelAr: 'الاسم', kind: 'text', align: 'start', width: 34 },
      ...ar.buckets.map((b) => ({
        key: `b${b.fromDays}`,
        labelEn: b.label,
        labelAr: bucketAr(b.fromDays, b.toDays),
        kind: 'money' as const,
        align: 'end' as const,
        width: 16,
      })),
      { key: 'total', labelEn: 'Total', labelAr: 'الإجمالي', kind: 'money', align: 'end', width: 18 },
    ],
    rows: [
      ...ar.students.map((s) => ({
        cells: [
          text(s.studentNo),
          text(s.fullNameEn),
          ...s.byBucket.map((v) => cash(v)),
          cash(s.total),
        ],
      })),
      {
        emphasis: 'total' as const,
        cells: [
          text(''),
          text('Total — الإجمالي'),
          ...ar.buckets.map((b) => cash(b.amount)),
          cash(ar.total),
        ],
      },
    ],
    notesEn: [
      'Aged from each charge’s due date, falling back to its document date. ' +
        'A charge with no stated due date is payable on demand, so it starts ageing ' +
        'the day it is raised rather than never.',
      'Sponsored portions are excluded: that debt belongs to the sponsor and is aged ' +
        'on the sponsor report.',
    ],
    notesAr: [
      'تُحتسب الأعمار من تاريخ استحقاق الرسم، وإن لم يُحدَّد فمن تاريخ قيده؛ ' +
        'فالرسم بلا تاريخ استحقاق واجب عند الطلب ويبدأ عمره يوم قيده لا أن لا يبدأ أبداً.',
      'حصص الجهات الراعية مستثناة، فهي دين على الراعي ويظهر عمره في تقرير الرعاة.',
    ],
  };
}

function bucketAr(fromDays: number, toDays: number | null): string {
  if (fromDays === 0) return 'جارٍ';
  if (toDays === null) return `${fromDays}+ يوم`;
  return `${fromDays}–${toDays - 1} يوم`;
}

export function sponsorAgingDocument(
  sa: SponsorAging,
  ctx: DocumentContext,
  currency: string,
): ReportDocument {
  return {
    titleEn: 'Aged Sponsor Receivables',
    titleAr: 'أعمار ذمم الجهات الراعية',
    subtitleEn: `As at ${sa.asOf}`,
    subtitleAr: `كما في ${sa.asOf}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionAr },
      { labelEn: 'Currency', labelAr: 'العملة', value: currency },
      { labelEn: 'As at', labelAr: 'كما في', value: sa.asOf },
      { labelEn: 'Sponsors', labelAr: 'عدد الجهات', value: String(sa.rows.length) },
    ],
    columns: [
      { key: 'code', labelEn: 'Code', labelAr: 'الرمز', kind: 'text', align: 'start', width: 14 },
      { key: 'name', labelEn: 'Sponsor', labelAr: 'الجهة الراعية', kind: 'text', align: 'start', width: 36 },
      ...sa.bucketLabels.map((l, i) => ({
        key: `b${i}`,
        labelEn: l,
        labelAr: i === 0 ? 'جارٍ' : `${l} يوم`,
        kind: 'money' as const,
        align: 'end' as const,
        width: 16,
      })),
      { key: 'total', labelEn: 'Total', labelAr: 'الإجمالي', kind: 'money', align: 'end', width: 18 },
    ],
    rows: [
      ...sa.rows.map((r) => ({
        cells: [
          text(r.sponsorCode),
          text(r.sponsorNameEn),
          ...r.buckets.map((v) => cash(v)),
          cash(r.total),
        ],
      })),
      {
        emphasis: 'total' as const,
        cells: [
          text(''),
          text('Total — الإجمالي'),
          ...sa.bucketLabels.map(() => ({ kind: 'blank' as const })),
          cash(sa.total),
        ],
      },
    ],
    notesEn: [
      'Aged from the invoice due date. An uninvoiced share sits in Current however ' +
        'old the underlying charge is: a sponsor is not late for a bill nobody has ' +
        'sent them, and ageing them from the charge date would produce a dunning ' +
        'list of the institution’s own administrative backlog.',
    ],
    notesAr: [
      'تُحتسب الأعمار من تاريخ استحقاق الفاتورة. والحصة غير المفوترة تبقى في خانة ' +
        '«جارٍ» مهما قدُم الرسم: فالراعي ليس متأخراً عن فاتورة لم تُرسل إليه، ' +
        'واحتساب العمر من تاريخ الرسم يُنتج قائمة مطالبات هي في حقيقتها تأخّر إداري داخلي.',
    ],
  };
}

export function payablesAgingDocument(
  rows: VendorAgingRow[],
  ctx: DocumentContext,
  currency: string,
  asOf: string,
): ReportDocument {
  const totalOf = (pick: (r: VendorAgingRow) => string): string =>
    rows.reduce((acc, r) => acc.plus(money(pick(r))), money('0')).toFixed(4);

  return {
    titleEn: 'Aged Accounts Payable',
    titleAr: 'أعمار الذمم الدائنة',
    subtitleEn: `As at ${asOf}`,
    subtitleAr: `كما في ${asOf}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionAr },
      { labelEn: 'Currency', labelAr: 'العملة', value: currency },
      { labelEn: 'As at', labelAr: 'كما في', value: asOf },
      { labelEn: 'Vendors', labelAr: 'عدد الموردين', value: String(rows.length) },
    ],
    columns: [
      { key: 'code', labelEn: 'Code', labelAr: 'الرمز', kind: 'text', align: 'start', width: 14 },
      { key: 'name', labelEn: 'Vendor', labelAr: 'المورّد', kind: 'text', align: 'start', width: 34 },
      { key: 'current', labelEn: 'Current', labelAr: 'جارٍ', kind: 'money', align: 'end', width: 16 },
      { key: 'd30', labelEn: '1–30 days', labelAr: '1–30 يوم', kind: 'money', align: 'end', width: 16 },
      { key: 'd60', labelEn: '31–60 days', labelAr: '31–60 يوم', kind: 'money', align: 'end', width: 16 },
      { key: 'd90', labelEn: '61–90 days', labelAr: '61–90 يوم', kind: 'money', align: 'end', width: 16 },
      { key: 'over', labelEn: 'Over 90 days', labelAr: 'أكثر من 90 يوم', kind: 'money', align: 'end', width: 16 },
      { key: 'total', labelEn: 'Total', labelAr: 'الإجمالي', kind: 'money', align: 'end', width: 18 },
    ],
    rows: [
      ...rows.map((r) => ({
        cells: [
          text(r.vendorCode),
          text(r.vendorName),
          cash(r.current),
          cash(r.days1to30),
          cash(r.days31to60),
          cash(r.days61to90),
          cash(r.over90),
          cash(r.total),
        ],
      })),
      {
        emphasis: 'total' as const,
        cells: [
          text(''),
          text('Total — الإجمالي'),
          cash(totalOf((r) => r.current)),
          cash(totalOf((r) => r.days1to30)),
          cash(totalOf((r) => r.days31to60)),
          cash(totalOf((r) => r.days61to90)),
          cash(totalOf((r) => r.over90)),
          cash(totalOf((r) => r.total)),
        ],
      },
    ],
    notesEn: [
      'Aged by due date rather than invoice date: an invoice on 60-day terms raised ' +
        'sixty-one days ago is one day late, not two months late.',
    ],
    notesAr: [
      'تُحتسب الأعمار من تاريخ الاستحقاق لا من تاريخ الفاتورة: فالفاتورة بأجل ستين يوماً ' +
        'الصادرة قبل واحد وستين يوماً متأخرة يوماً واحداً لا شهرين.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Student statement of account (Track D5, SRS REQ-RPT-01)
// ---------------------------------------------------------------------------

/**
 * The document a student is handed when they dispute what they owe.
 *
 * The opening balance is a **row**, not a note in the header, because a
 * running-balance column that starts at a figure the reader cannot see the
 * origin of is a column the reader has to take on trust. It carries the
 * emphasis of a subtotal so it reads as a boundary rather than a transaction.
 */
export function statementDocument(
  st: Statement,
  ctx: DocumentContext,
  currency: string,
): ReportDocument {
  const from = st.from ? st.from.toISOString().slice(0, 10) : null;
  const to = st.to ? st.to.toISOString().slice(0, 10) : null;
  const window =
    from && to ? `${from} → ${to}` : from ? `from ${from}` : to ? `to ${to}` : 'All dates';

  return {
    titleEn: 'Statement of Account',
    titleAr: 'كشف حساب',
    subtitleEn: `${st.fullNameEn} · ${st.studentNo} · ${window}`,
    subtitleAr: `${st.fullNameAr} · ${st.studentNo}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionAr },
      { labelEn: 'Student', labelAr: 'الطالب', value: st.fullNameAr },
      { labelEn: 'Student no.', labelAr: 'الرقم الجامعي', value: st.studentNo },
      { labelEn: 'Currency', labelAr: 'العملة', value: currency },
      { labelEn: 'Period', labelAr: 'الفترة', value: window },
    ],
    columns: [
      { key: 'date', labelEn: 'Date', labelAr: 'التاريخ', kind: 'text', align: 'start', width: 14 },
      { key: 'ref', labelEn: 'Reference', labelAr: 'المرجع', kind: 'text', align: 'start', width: 18 },
      { key: 'desc', labelEn: 'Description', labelAr: 'البيان', kind: 'text', align: 'start', width: 44 },
      { key: 'debit', labelEn: 'Debit', labelAr: 'مدين', kind: 'money', align: 'end', width: 16 },
      { key: 'credit', labelEn: 'Credit', labelAr: 'دائن', kind: 'money', align: 'end', width: 16 },
      { key: 'balance', labelEn: 'Balance', labelAr: 'الرصيد', kind: 'money', align: 'end', width: 18 },
    ],
    rows: [
      {
        emphasis: 'subtotal' as const,
        cells: [
          text(from ?? ''),
          text(''),
          text('Opening balance — رصيد افتتاحي'),
          { kind: 'blank' as const },
          { kind: 'blank' as const },
          cash(st.openingBalance),
        ],
      },
      ...st.lines.map((l) => ({
        cells: [
          text(l.date.toISOString().slice(0, 10)),
          text(l.reference),
          text(l.description),
          l.debit === '0.0000' ? ({ kind: 'blank' } as CellValue) : cash(l.debit),
          l.credit === '0.0000' ? ({ kind: 'blank' } as CellValue) : cash(l.credit),
          cash(l.runningBalance),
        ],
      })),
      {
        emphasis: 'total' as const,
        cells: [
          text(to ?? ''),
          text(''),
          text('Closing balance — رصيد ختامي'),
          { kind: 'blank' as const },
          { kind: 'blank' as const },
          cash(st.closingBalance),
        ],
      },
    ],
    notesEn: [
      'A positive balance is owed by the student. Sponsored portions are not shown ' +
        'here: that debt is the sponsor’s and appears on the sponsor’s statement.',
      'Cancelled and dishonoured receipts appear as the reversals they are, not as ' +
        'deletions. A receipt that was taken and then bounced is two lines, because ' +
        'that is two events.',
    ],
    notesAr: [
      'الرصيد الموجب مستحق على الطالب. ولا تظهر هنا حصص الجهات الراعية، فهي دين ' +
        'على الراعي ويظهر في كشف حسابه.',
      'تظهر الإيصالات الملغاة والمرتدّة بوصفها عكوساً لا حذفاً؛ فالإيصال الذي قُبض ' +
        'ثم ارتدّ سطران لأنه حدثان.',
    ],
  };
}

// ---------------------------------------------------------------------------
// Discount exposure (Track D5, SRS REQ-SPN-04)
// ---------------------------------------------------------------------------

const DIMENSION_LABELS: Record<string, { en: string; ar: string }> = {
  faculty: { en: 'Faculty', ar: 'الكلية' },
  programme: { en: 'Programme', ar: 'البرنامج' },
  batch: { en: 'Batch', ar: 'الدفعة' },
  scheme: { en: 'Scheme', ar: 'برنامج المنح' },
  academicYear: { en: 'Academic year', ar: 'العام الدراسي' },
};

/**
 * What the institution gave away.
 *
 * The budget-cap column is present only when the report is cut by scheme,
 * because that is the only dimension a cap exists against. Printing an empty
 * column on the other four would invite the reading that a faculty has a
 * discount budget, which it does not.
 */
export function exposureDocument(
  ex: ExposureReport,
  ctx: DocumentContext,
  currency: string,
): ReportDocument {
  const dim = DIMENSION_LABELS[ex.dimension] ?? { en: ex.dimension, ar: ex.dimension };
  const byScheme = ex.dimension === 'scheme';

  return {
    titleEn: 'Discount Exposure',
    titleAr: 'الخصومات الممنوحة',
    subtitleEn: `By ${dim.en.toLowerCase()}`,
    subtitleAr: `حسب ${dim.ar}`,
    meta: [
      { labelEn: 'Institution', labelAr: 'المؤسسة', value: ctx.institutionAr },
      { labelEn: 'Currency', labelAr: 'العملة', value: currency },
      { labelEn: 'Dimension', labelAr: 'التصنيف', value: dim.ar },
    ],
    columns: [
      { key: 'label', labelEn: dim.en, labelAr: dim.ar, kind: 'text', align: 'start', width: 38 },
      { key: 'students', labelEn: 'Students', labelAr: 'عدد الطلاب', kind: 'int', align: 'end', width: 12 },
      { key: 'gross', labelEn: 'Gross', labelAr: 'الإجمالي', kind: 'money', align: 'end', width: 18 },
      { key: 'discount', labelEn: 'Discount', labelAr: 'الخصم', kind: 'money', align: 'end', width: 18 },
      { key: 'net', labelEn: 'Net', labelAr: 'الصافي', kind: 'money', align: 'end', width: 18 },
      { key: 'pct', labelEn: 'Discount %', labelAr: 'نسبة الخصم', kind: 'text', align: 'end', width: 12 },
      ...(byScheme
        ? [
            {
              key: 'cap',
              labelEn: 'Budget cap',
              labelAr: 'سقف الميزانية',
              kind: 'money' as const,
              align: 'end' as const,
              width: 18,
            },
          ]
        : []),
    ],
    rows: [
      ...ex.rows.map((r) => ({
        cells: [
          text(r.label),
          { kind: 'int' as const, value: r.studentCount },
          cash(r.gross),
          cash(r.discount),
          cash(r.net),
          text(`${r.discountPct}%`),
          ...(byScheme
            ? [r.budgetCap === null ? ({ kind: 'blank' } as CellValue) : cash(r.budgetCap)]
            : []),
        ],
      })),
      {
        emphasis: 'total' as const,
        cells: [
          text('Total — الإجمالي'),
          { kind: 'blank' as const },
          cash(ex.totalGross),
          cash(ex.totalDiscount),
          cash(ex.totalNet),
          text(''),
          ...(byScheme ? [{ kind: 'blank' as const }] : []),
        ],
      },
    ],
    notesEn: [
      'Computed from the discount posted on each registration — its own expense ' +
        'account line — not by subtracting a posting from a fee table. Cancelled ' +
        'registrations are excluded: a discount on a term that was reversed cost the ' +
        'institution nothing.',
    ],
    notesAr: [
      'يُحتسب من الخصم المقيَّد على كل تسجيل في حساب مصروفه، لا بطرح قيدٍ من جدول رسوم. ' +
        'والتسجيلات الملغاة مستثناة، فالخصم على فصل عُكس لم يكلّف المؤسسة شيئاً.',
    ],
  };
}
