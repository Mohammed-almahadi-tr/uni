import 'server-only';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { letterheadFor } from '@/lib/print/letterhead';
import { tenantCurrency } from './lookups';
import { trialBalance } from '@/lib/reports/trial-balance';
import { balanceSheet, incomeStatement } from '@/lib/reports/statements';
import { subledgerReconciliation } from '@/lib/reports/reconciliation';
import { agedReceivables, statementOfAccount } from '@/lib/students/account';
import { sponsorAging } from '@/lib/sponsors/billing';
import { apAging } from '@/lib/procurement/invoices';
import { discountExposure, type ExposureDimension } from '@/lib/sponsors/scholarships';
import {
  balanceSheetDocument,
  exposureDocument,
  incomeStatementDocument,
  payablesAgingDocument,
  reconciliationDocument,
  sponsorAgingDocument,
  statementDocument,
  studentAgingDocument,
  trialBalanceDocument,
  type DocumentContext,
  type ReportDocument,
} from '@/lib/reports/document';

/**
 * Running a report, once, for both the screen and the export (Track D5).
 *
 * ## The claim this module exists to make
 *
 * **The spreadsheet an auditor is handed is the report the accountant looked
 * at.** Not a report built from the same engine by a second code path with its
 * own filter parsing — the same call, from the same parsed request, producing
 * the same `ReportDocument`. The page renders that document as a table and the
 * export route renders it as CSV, XLSX or a print sheet. Nothing about *what
 * the report says* is decided twice.
 *
 * That is the same discipline as D2's `previewAllocation` and `takeReceipt`
 * sharing one allocation, and it is here for a sharper reason. The legacy
 * build's report screen and its export were two procedures:
 *
 * ```vb
 * Private Sub btnView_Click(...)
 *     DGV.DataSource = SelectQuery("Select ... Where TDate Between '" & ...)
 * Private Sub btnExcel_Click(...)
 *     ExportToExcel("Select ... Where TDate >= '" & ...)
 * ```
 *
 * — two queries, two date predicates, one of them inclusive at both ends and
 * the other not. A figure on screen and the same figure in the exported file
 * could differ by a day's transactions, and nothing anywhere said so.
 *
 * ## Why the parse is here too
 *
 * `parseReportRequest` is exported and used by both callers. A shared engine
 * reached through two different readings of the same query string is the same
 * defect wearing a better coat: the screen would show the first quarter and
 * the download would hold the first three months plus a day.
 */

export type ReportKind =
  | 'trial-balance'
  | 'balance-sheet'
  | 'income-statement'
  | 'aging-students'
  | 'aging-sponsors'
  | 'aging-vendors'
  | 'reconciliation'
  | 'student-account'
  | 'discounts';

const KINDS: ReadonlySet<string> = new Set<ReportKind>([
  'trial-balance',
  'balance-sheet',
  'income-statement',
  'aging-students',
  'aging-sponsors',
  'aging-vendors',
  'reconciliation',
  'student-account',
  'discounts',
]);

/** Which permission each report answers to. The student statement is the one
 *  a registrar may read without being trusted with the general ledger. */
const PERMISSION: Record<ReportKind, 'report.financial' | 'report.student'> = {
  'trial-balance': 'report.financial',
  'balance-sheet': 'report.financial',
  'income-statement': 'report.financial',
  'aging-students': 'report.financial',
  'aging-sponsors': 'report.financial',
  'aging-vendors': 'report.financial',
  reconciliation: 'report.financial',
  'student-account': 'report.student',
  discounts: 'report.financial',
};

export interface ReportRequest {
  kind: ReportKind;
  /** Movement window, for the reports that have one. */
  from: string;
  to: string;
  /** Cutoff, for the reports that are a position rather than a movement. */
  asOf: string;
  costCenterId: string | null;
  maxLevel: number | null;
  studentId: string | null;
  dimension: ExposureDimension;
  academicYearId: string | null;
  batchId: string | null;
  facultyId: string | null;
  /** Income statement only: show the same window a year earlier beside it. */
  comparative: boolean;
}

export interface ReportResult {
  kind: ReportKind;
  request: ReportRequest;
  document: ReportDocument;
  /** Filename stem for a download — no extension, the renderer adds one. */
  filename: string;
  /**
   * A figure on this report cannot be trusted, and the reader must be told
   * before they act on it. Resolved here so the screen's banner and the
   * exported file's notes cannot disagree about whether anything is wrong.
   */
  alert: boolean;
}

const DIMENSIONS: ReadonlySet<string> = new Set<ExposureDimension>([
  'faculty',
  'programme',
  'batch',
  'scheme',
  'academicYear',
]);

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** A date-only value read as UTC midnight, or null. A report window is a range
 *  of calendar days; letting the server's timezone shift it by one is how a
 *  quarter quietly gains or loses a day of transactions. */
function isoDate(v: string | undefined, fallback: string): string {
  return v && ISO.test(v) ? v : fallback;
}

function utc(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

/** Today, as the tenant's calendar sees it. Reports default to it, so a screen
 *  opened with no filters answers the question somebody actually has. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/** The first day of the current calendar year, the default start of a window.
 *  Not the fiscal year: resolving that needs a query, and a default that
 *  sometimes needs the database is a default that sometimes fails. The screen
 *  offers the fiscal year as a filter. */
export function yearStart(): string {
  return `${new Date().getUTCFullYear()}-01-01`;
}

/**
 * Read a request out of a query string.
 *
 * Every field is defaulted rather than validated-and-refused, because a report
 * screen reached with a mistyped parameter should render the default report
 * and let the user correct the filter — not a stack trace. The one field with
 * no sensible default is `kind`, and an unknown one is refused.
 */
export function parseReportRequest(
  sp: Record<string, string | string[] | undefined>,
  fallbackKind: ReportKind,
): ReportRequest {
  const one = (k: string): string | undefined => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const rawKind = one('kind');
  const kind = rawKind && KINDS.has(rawKind) ? (rawKind as ReportKind) : fallbackKind;

  const rawDim = one('dimension');
  const dimension =
    rawDim && DIMENSIONS.has(rawDim) ? (rawDim as ExposureDimension) : 'faculty';

  const level = Number(one('level'));

  return {
    kind,
    from: isoDate(one('from'), yearStart()),
    to: isoDate(one('to'), today()),
    asOf: isoDate(one('asOf'), today()),
    costCenterId: one('costCenter') || null,
    maxLevel: Number.isInteger(level) && level >= 1 && level <= 5 ? level : null,
    studentId: one('student') || null,
    dimension,
    academicYearId: one('year') || null,
    batchId: one('batch') || null,
    facultyId: one('faculty') || null,
    comparative: one('comparative') === '1',
  };
}

/** The request back as a query string, so a screen's export links carry
 *  exactly the filters the screen was rendered with. Building them by hand at
 *  each call site is how an export starts answering a different question. */
export function reportQuery(req: ReportRequest, extra: Record<string, string> = {}): string {
  const q = new URLSearchParams({ kind: req.kind });
  q.set('from', req.from);
  q.set('to', req.to);
  q.set('asOf', req.asOf);
  if (req.costCenterId) q.set('costCenter', req.costCenterId);
  if (req.maxLevel) q.set('level', String(req.maxLevel));
  if (req.studentId) q.set('student', req.studentId);
  q.set('dimension', req.dimension);
  if (req.academicYearId) q.set('year', req.academicYearId);
  if (req.batchId) q.set('batch', req.batchId);
  if (req.facultyId) q.set('faculty', req.facultyId);
  if (req.comparative) q.set('comparative', '1');
  for (const [k, v] of Object.entries(extra)) q.set(k, v);
  return q.toString();
}

export type ExportFormat = 'csv' | 'xlsx' | 'html';

/**
 * The URL of a report's export, in the one place that builds one.
 *
 * **The locale prefix is not optional.** `localePrefix: 'always'` means an
 * unprefixed `/console/...` is redirected to the *default* locale — Arabic —
 * whatever the reader was using, and the export route picks the language of
 * the CSV and the print sheet off that segment. So an English user following
 * an unprefixed link downloads an Arabic spreadsheet, silently, with the right
 * figures in it. `Link` from `@/i18n/navigation` handles this for ordinary
 * navigation; a file download and a new tab want a real anchor, and a real
 * anchor has to be told.
 */
export function exportHref(
  locale: 'ar' | 'en',
  request: ReportRequest,
  format: ExportFormat,
): string {
  return `/${locale}/console/reports/export?${reportQuery(request, { format })}`;
}

/**
 * Run one report.
 *
 * Throws rather than returning an empty document when the caller may not read
 * it: the export route and the screen both need the refusal to be the same
 * refusal, and a permission failure that renders as a blank spreadsheet is a
 * permission failure somebody will file a bug about instead of noticing.
 */
export async function runReport(
  principal: Principal,
  request: ReportRequest,
): Promise<ReportResult> {
  requirePermission(principal, PERMISSION[request.kind]);

  const [letterhead, currency] = await Promise.all([
    letterheadFor(principal),
    tenantCurrency(principal),
  ]);

  const ctx: DocumentContext = {
    institutionAr: letterhead.institutionAr,
    institutionEn: letterhead.institutionEn,
  };

  switch (request.kind) {
    case 'trial-balance': {
      const tb = await trialBalance(principal, {
        from: utc(request.from),
        to: utc(request.to),
        costCenterId: request.costCenterId,
        maxLevel: request.maxLevel ?? 5,
      });
      return {
        kind: request.kind,
        request,
        document: trialBalanceDocument(tb, ctx),
        filename: `trial-balance_${tb.from}_${tb.to}`,
        // A segmented run is not expected to balance, and flagging it as an
        // alarm would train the reader to ignore the alarm.
        alert: !tb.balanced && !tb.segmented,
      };
    }

    case 'balance-sheet': {
      const bs = await balanceSheet(principal, {
        asOf: utc(request.asOf),
        costCenterId: request.costCenterId,
        maxLevel: request.maxLevel ?? 4,
      });
      return {
        kind: request.kind,
        request,
        document: balanceSheetDocument(bs, ctx),
        filename: `balance-sheet_${bs.asOf}`,
        alert: !bs.balanced && !bs.segmented,
      };
    }

    case 'income-statement': {
      const is = await incomeStatement(principal, {
        from: utc(request.from),
        to: utc(request.to),
        costCenterId: request.costCenterId,
        maxLevel: request.maxLevel ?? 4,
        comparative: request.comparative ? 'prior-year' : null,
      });
      return {
        kind: request.kind,
        request,
        document: incomeStatementDocument(is, ctx),
        filename: `income-statement_${is.from}_${is.to}`,
        alert: false,
      };
    }

    case 'aging-students': {
      const ar = await agedReceivables(principal, utc(request.asOf));
      return {
        kind: request.kind,
        request,
        document: studentAgingDocument(ar, ctx, currency),
        filename: `aged-student-receivables_${request.asOf}`,
        alert: false,
      };
    }

    case 'aging-sponsors': {
      const sa = await sponsorAging(principal, utc(request.asOf));
      return {
        kind: request.kind,
        request,
        document: sponsorAgingDocument(sa, ctx, currency),
        filename: `aged-sponsor-receivables_${request.asOf}`,
        alert: false,
      };
    }

    case 'aging-vendors': {
      const rows = await apAging(principal, utc(request.asOf));
      return {
        kind: request.kind,
        request,
        document: payablesAgingDocument(rows, ctx, currency, request.asOf),
        filename: `aged-payables_${request.asOf}`,
        alert: false,
      };
    }

    case 'reconciliation': {
      const rr = await subledgerReconciliation(principal);
      return {
        kind: request.kind,
        request,
        document: reconciliationDocument(rr, ctx),
        filename: `reconciliation_${rr.asOf}`,
        alert: !rr.ok,
      };
    }

    case 'student-account': {
      if (!request.studentId) throw new ReportRequestError('Choose a student first.');
      const st = await statementOfAccount(principal, request.studentId, {
        from: utc(request.from),
        to: utc(request.to),
      });
      return {
        kind: request.kind,
        request,
        document: statementDocument(st, ctx, currency),
        filename: `statement_${st.studentNo}_${request.from}_${request.to}`,
        alert: false,
      };
    }

    case 'discounts': {
      const ex = await discountExposure(principal, request.dimension, {
        academicYearId: request.academicYearId ?? undefined,
        batchId: request.batchId ?? undefined,
        facultyId: request.facultyId ?? undefined,
      });
      return {
        kind: request.kind,
        request,
        document: exposureDocument(ex, ctx, currency),
        filename: `discount-exposure_${ex.dimension}_${today()}`,
        alert: false,
      };
    }
  }
}

/** A request that cannot be run at all, as opposed to one that runs and finds
 *  nothing. A statement of account needs a student; there is no useful
 *  default for "which one". */
export class ReportRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReportRequestError';
  }
}
