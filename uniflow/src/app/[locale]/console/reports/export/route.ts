import { currentContext, currentUser } from '@/lib/console/session';
import { ruleFor, satisfies } from '@/lib/console/navigation';
import { localeOf } from '@/components/console/text';
import {
  parseReportRequest,
  runReport,
  ReportRequestError,
} from '@/lib/console/reports';
import { letterheadFor } from '@/lib/print/letterhead';
import { pickLines } from '@/lib/print/sheet';
import { toCsv, toPrintableHtml } from '@/lib/reports/render';
import { toXlsx } from '@/lib/reports/xlsx';

/**
 * Report exports (Track D5, SRS REQ-RPT-07).
 *
 * One handler for every report and every format, because the report is
 * `runReport` and the format is a renderer — and a handler per pair would be
 * eighteen places for a column to go missing from one of them.
 *
 * ## Why this is a route handler and not a server action
 *
 * An action returns a value to a React tree. A file has to arrive with a
 * `Content-Type` and a `Content-Disposition` so the browser saves it under a
 * name the user can find again, and that needs a response of its own. It also
 * means the export is a **link** — a URL carrying the filters, which can be
 * bookmarked, mailed to a colleague, and read in the address bar to check what
 * it will contain before it is opened.
 *
 * ## The permission is checked twice, deliberately
 *
 * Once here against the console's route table — the coarse check that stops a
 * user reaching a surface at all — and once inside `runReport`, which demands
 * the permission belonging to the specific report. The second is the one that
 * matters: `report.student` reaches the statement of account and not the trial
 * balance, and the route-level rule is the union of both.
 */

const FORMATS = new Set(['csv', 'xlsx', 'html']);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ locale: string }> },
): Promise<Response> {
  const { locale: raw } = await params;
  const locale = localeOf(raw);

  const ctx = await currentContext();
  // 401 rather than a redirect. This is a file endpoint: a browser following a
  // redirect to the sign-in page would save the HTML of a login form under the
  // name of a trial balance.
  if (!ctx) return refuse(401, 'Sign in first.');

  const rule = ruleFor('reports/export');
  if (!rule || !satisfies(ctx.principal.permissions, rule.anyOf)) {
    return refuse(403, 'You do not have access to reports.');
  }

  const url = new URL(request.url);
  const sp = Object.fromEntries(url.searchParams.entries());
  const format = sp.format && FORMATS.has(sp.format) ? sp.format : 'csv';

  let result;
  try {
    result = await runReport(ctx.principal, parseReportRequest(sp, 'trial-balance'));
  } catch (e) {
    if (e instanceof ReportRequestError) return refuse(400, e.message);
    // A permission failure from `runReport` is a 403 and not a 500: the user
    // asked for a report they may not read, which is an answer rather than a
    // fault. Matched on the error's own name so this file does not import the
    // RBAC module to name two classes.
    if (e instanceof Error && (e.name === 'ForbiddenError' || e.name === 'MfaRequiredError')) {
      return refuse(403, e.message);
    }
    throw e;
  }

  const { document: doc, filename } = result;

  if (format === 'csv') {
    return file(toCsv(doc, { locale }), `${filename}.csv`, 'text/csv; charset=utf-8');
  }

  if (format === 'xlsx') {
    return file(
      toXlsx(doc, { locale }),
      `${filename}.xlsx`,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  }

  // The print sheet. Served inline rather than as an attachment, because the
  // point of it is the browser's own print dialogue — and A7 settled that the
  // PDF is produced by printing this HTML rather than by a generator in this
  // repository that would have to shape Arabic itself.
  const [letterhead, user] = await Promise.all([
    letterheadFor(ctx.principal),
    currentUser(),
  ]);
  const html = toPrintableHtml(doc, {
    locale,
    logoUrl: letterhead.logoUrl,
    letterheadLines: pickLines(letterhead, locale),
    generatedBy: user?.fullName ?? '',
    generatedAt: new Date(),
  });

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-disposition': `inline; filename="${asciiName(filename)}.html"`,
      'cache-control': 'no-store',
    },
  });
}

function file(body: string | Buffer, name: string, contentType: string): Response {
  // `filename*` carries the real name in UTF-8 for anything written this
  // decade; `filename` carries an ASCII fallback, because a browser that reads
  // only the fallback saves a file called "trial-balance" and one that reads
  // neither saves it called "export".
  const disposition =
    `attachment; filename="${asciiName(name)}"; ` +
    `filename*=UTF-8''${encodeURIComponent(name)}`;

  return new Response(body as BodyInit, {
    headers: {
      'content-type': contentType,
      'content-disposition': disposition,
      // A report is a snapshot of a moving ledger. Caching one means somebody
      // downloads yesterday's figures from today's link.
      'cache-control': 'no-store',
    },
  });
}

function asciiName(name: string): string {
  return name.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, '');
}

function refuse(status: number, message: string): Response {
  return new Response(message, {
    status,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' },
  });
}
