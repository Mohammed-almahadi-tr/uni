import { money } from '@/lib/money';
import type { TrialBalance } from './trial-balance';
import type { BalanceSheet, IncomeStatement, StatementSection } from './statements';
import type { ReconciliationReport } from './reconciliation';

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
