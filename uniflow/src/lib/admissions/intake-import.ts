import 'server-only';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { buildSearchKey } from '@/lib/i18n/arabic';
import { money } from '@/lib/money';
import { toDateOnly } from '@/lib/ledger/period';
import { findDuplicates, insertApplication, type DuplicateMatch } from './applications';

/**
 * Bulk intake import (SRS REQ-ADM-CAP-06, Track B2).
 *
 * Sudanese universities receive a large share of their intake as a roster from
 * the national admissions body rather than as individual applications. This is
 * the path for that, and for the spreadsheet an institution has been keeping
 * by hand.
 *
 * ## Dry run first, always
 *
 * `previewIntake` validates the whole file and reports what *would* happen,
 * writing nothing. `commitIntake` takes the same rows and applies them. The
 * separation is the requirement, and it is also the only humane way to handle a
 * 900-row roster: a partial import that stopped at row 412 leaves somebody
 * reconciling two lists by hand.
 *
 * ## All or nothing
 *
 * The commit runs in one transaction. Either every valid row lands or none
 * does. The legacy system's habit — `DELETE` then loop `INSERT` on an
 * autocommit connection, in both the fee screen and the seat-quota screen — is
 * precisely the failure mode this avoids.
 */

export class IntakeImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IntakeImportError';
  }
}

/** One row as it arrives from a spreadsheet: everything is a string. */
export interface IntakeRow {
  fullNameAr?: string;
  fullNameEn?: string;
  nationalId?: string;
  passportNo?: string;
  /** ISO `YYYY-MM-DD`. */
  dateOfBirth?: string;
  nationalityCode?: string;
  admissionCategoryCode?: string;
  certificateTypeCode?: string;
  certificateScore?: string;
  certificateYear?: string;
  /** Semicolon- or comma-separated. */
  subjects?: string;
  /** Programme codes in preference order, semicolon- or comma-separated. */
  programmeCodes?: string;
  email?: string;
  phone?: string;
}

export interface RowIssue {
  rowNumber: number;
  field: string;
  message: string;
}

export interface RowPreview {
  rowNumber: number;
  fullNameEn: string;
  applicationNo: string | null;
  programmeCodes: string[];
  duplicates: DuplicateMatch[];
  issues: RowIssue[];
  willImport: boolean;
}

export interface IntakePreview {
  batchCode: string;
  totalRows: number;
  importable: number;
  rejected: number;
  withDuplicates: number;
  rows: RowPreview[];
  issues: RowIssue[];
}

/**
 * Validate a roster without writing anything.
 *
 * Every row is reported, valid or not. A preview that silently dropped the bad
 * rows would tell the registrar the import succeeded and leave them to notice
 * the missing forty students later.
 */
export async function previewIntake(
  principal: Principal,
  batchId: string,
  rows: IntakeRow[],
): Promise<IntakePreview> {
  requirePermission(principal, 'application.read');
  return previewInternal(principal, batchId, rows);
}

/** The same pass, keeping the resolved ids the commit needs. */
function previewInternal(
  principal: Principal,
  batchId: string,
  rows: IntakeRow[],
): Promise<IntakePreview & { rows: RowPreviewInternal[] }> {
  return withTenant(principal.tenantId, (tx) =>
    validateRows(tx, principal.tenantId, batchId, rows),
  );
}

export interface IntakeCommitResult {
  batchCode: string;
  imported: number;
  skipped: number;
  applicationNos: string[];
  issues: RowIssue[];
}

/**
 * Apply a roster.
 *
 * Re-validates from scratch rather than trusting a preview handed back to it:
 * the preview may be minutes old, and a programme could have been deactivated
 * or an applicant entered by hand in between. A validation that only runs on
 * the screen is not a validation.
 */
export async function commitIntake(
  principal: Principal,
  batchId: string,
  rows: IntakeRow[],
  opts: { skipDuplicates?: boolean } = {},
): Promise<IntakeCommitResult> {
  requirePermission(principal, 'application.read');

  const preview = await previewInternal(principal, batchId, rows);
  if (preview.importable === 0) {
    throw new IntakeImportError(
      `Nothing in this file can be imported: ${preview.rejected} of ${preview.totalRows} ` +
        `row(s) have problems. Fix the file rather than importing part of it.`,
    );
  }

  const applicationNos: string[] = [];
  let skipped = 0;

  // One transaction for the whole roster. A 900-row import that stopped at row
  // 412 would leave a registrar reconciling two lists by hand, which is exactly
  // what the legacy DELETE-then-loop-INSERT did on an autocommit connection.
  await withTenant(principal.tenantId, async (tx) => {
    for (const row of preview.rows) {
      if (!row.willImport || !row.resolved) {
        skipped += 1;
        continue;
      }
      if (opts.skipDuplicates !== false && row.duplicates.some((d) => d.confidence === 'HIGH')) {
        skipped += 1;
        continue;
      }

      const source = rows[row.rowNumber - 1];
      const created = await insertApplication(tx, principal.tenantId, principal.userId, {
        batchId,
        admissionCategoryId: row.resolved.admissionCategoryId,
        fullNameAr: source.fullNameAr!.trim(),
        fullNameEn: source.fullNameEn!.trim(),
        nationalId: source.nationalId?.trim() || null,
        passportNo: source.passportNo?.trim() || null,
        dateOfBirth: row.resolved.dateOfBirth,
        nationalityId: row.resolved.nationalityId,
        email: source.email,
        phone: source.phone,
        certificateTypeId: row.resolved.certificateTypeId,
        certificateScore: row.resolved.certificateScore,
        certificateYear: row.resolved.certificateYear,
        subjects: splitList(source.subjects),
        choices: row.resolved.programmeIds,
      }, { source: 'IMPORT' });
      applicationNos.push(created.applicationNo);
    }

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'intake_import',
      resourceId: batchId,
      after: {
        batch: preview.batchCode,
        rows: preview.totalRows,
        imported: applicationNos.length,
        skipped,
      },
    });
  });

  return {
    batchCode: preview.batchCode,
    imported: applicationNos.length,
    skipped,
    applicationNos,
    issues: preview.issues,
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

interface ResolvedRow {
  admissionCategoryId: string;
  nationalityId: string | null;
  certificateTypeId: string | null;
  certificateScore: string | null;
  certificateYear: number | null;
  dateOfBirth: Date | null;
  programmeIds: string[];
}

interface RowPreviewInternal extends RowPreview {
  resolved?: ResolvedRow;
}

async function validateRows(
  tx: Tx,
  tenantId: string,
  batchId: string,
  rows: IntakeRow[],
): Promise<IntakePreview & { rows: RowPreviewInternal[] }> {
  const batch = await tx.batch.findFirst({
    where: { id: batchId, tenantId },
    select: { code: true, isActive: true },
  });
  if (!batch) {
    throw new IntakeImportError('That intake batch does not belong to this university.');
  }
  if (!batch.isActive) {
    throw new IntakeImportError(
      `Batch ${batch.code} is not active. Importing an intake into a closed cohort is ` +
        `almost always the wrong batch selected.`,
    );
  }

  const [programmes, categories, nationalities, certificates] = await Promise.all([
    tx.programme.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, code: true },
    }),
    tx.admissionCategory.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, code: true },
    }),
    tx.nationality.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, code: true },
    }),
    tx.certificateType.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, code: true, maxScore: true },
    }),
  ]);

  const byProgramme = codeMap(programmes);
  const byCategory = codeMap(categories);
  const byNationality = codeMap(nationalities);
  const byCertificate = new Map(
    certificates.map((c) => [c.code.trim().toUpperCase(), c]),
  );

  const issues: RowIssue[] = [];
  const previews: RowPreviewInternal[] = [];

  // Duplicates *within the file*, which no database lookup would catch: the
  // same person listed twice on a ministry roster is common.
  const seenNationalIds = new Map<string, number>();

  for (const [i, row] of rows.entries()) {
    const rowNumber = i + 1;
    const rowIssues: RowIssue[] = [];
    const fail = (field: string, message: string) =>
      rowIssues.push({ rowNumber, field, message });

    // Bounds, not just presence. C2 put `chk_application_name_bounds` on the
    // table when it opened it to public writes, and the whole value of a
    // dry-run preview is that it refuses exactly what the commit would — a
    // preview that passes a row the commit rejects is a preview that has
    // told a registrar their spreadsheet is clean when it is not.
    const nameBounds = (value: string | undefined, field: 'fullNameAr' | 'fullNameEn') => {
      const name = value?.trim() ?? '';
      if (!name) {
        fail(field, field === 'fullNameAr' ? 'Arabic name is missing.' : 'English name is missing.');
      } else if (name.length < 2 || name.length > 200) {
        fail(field, 'A name is between 2 and 200 characters.');
      }
    };
    nameBounds(row.fullNameAr, 'fullNameAr');
    nameBounds(row.fullNameEn, 'fullNameEn');

    const categoryCode = (row.admissionCategoryCode ?? '').trim().toUpperCase();
    const admissionCategoryId = byCategory.get(categoryCode);
    if (!admissionCategoryId) {
      fail(
        'admissionCategoryCode',
        categoryCode
          ? `No active admission category with code "${categoryCode}".`
          : 'Admission category is missing.',
      );
    }

    const programmeCodes = splitList(row.programmeCodes).map((c) => c.toUpperCase());
    const programmeIds: string[] = [];
    if (programmeCodes.length === 0) {
      fail('programmeCodes', 'No programme choices given.');
    }
    for (const code of programmeCodes) {
      const id = byProgramme.get(code);
      if (!id) fail('programmeCodes', `No active programme with code "${code}".`);
      else if (programmeIds.includes(id)) {
        fail('programmeCodes', `Programme "${code}" is listed twice.`);
      } else programmeIds.push(id);
    }

    let nationalityId: string | null = null;
    if (row.nationalityCode?.trim()) {
      nationalityId = byNationality.get(row.nationalityCode.trim().toUpperCase()) ?? null;
      if (!nationalityId) {
        fail('nationalityCode', `No active nationality with code "${row.nationalityCode.trim()}".`);
      }
    }

    let certificateTypeId: string | null = null;
    let certificateScore: string | null = null;
    if (row.certificateTypeCode?.trim()) {
      const cert = byCertificate.get(row.certificateTypeCode.trim().toUpperCase());
      if (!cert) {
        fail(
          'certificateTypeCode',
          `No active certificate type with code "${row.certificateTypeCode.trim()}".`,
        );
      } else {
        certificateTypeId = cert.id;
        if (row.certificateScore?.trim()) {
          try {
            const score = money(row.certificateScore.trim());
            if (score.isNegative()) {
              fail('certificateScore', 'Score is negative.');
            } else if (score.greaterThan(cert.maxScore)) {
              // The single most common roster error: a score entered against
              // the wrong certificate's scale. Silently accepting it would put
              // the applicant through screening at the wrong percentage.
              fail(
                'certificateScore',
                `Score ${score.toFixed(2)} exceeds the maximum of ${cert.maxScore.toFixed(2)} ` +
                  `for ${cert.code}. Check which certificate this row is for.`,
              );
            } else {
              certificateScore = score.toFixed(3);
            }
          } catch {
            fail('certificateScore', `"${row.certificateScore}" is not a number.`);
          }
        }
      }
    }

    let dateOfBirth: Date | null = null;
    if (row.dateOfBirth?.trim()) {
      const parsed = parseIsoDate(row.dateOfBirth.trim());
      if (!parsed) {
        fail('dateOfBirth', `"${row.dateOfBirth}" is not a date in YYYY-MM-DD form.`);
      } else {
        dateOfBirth = parsed;
      }
    }

    let certificateYear: number | null = null;
    if (row.certificateYear?.trim()) {
      const y = Number(row.certificateYear.trim());
      if (!Number.isInteger(y) || y < 1900 || y > 2200) {
        fail('certificateYear', `"${row.certificateYear}" is not a year.`);
      } else certificateYear = y;
    }

    const nationalId = row.nationalId?.trim();
    if (nationalId) {
      const earlier = seenNationalIds.get(nationalId);
      if (earlier) {
        fail(
          'nationalId',
          `National ID ${nationalId} also appears on row ${earlier} of this file.`,
        );
      } else {
        seenNationalIds.set(nationalId, rowNumber);
      }
    }

    const duplicates =
      rowIssues.length === 0
        ? await findDuplicates(tx, tenantId, {
            nationalId: nationalId || null,
            passportNo: row.passportNo?.trim() || null,
            searchKey: buildSearchKey(row.fullNameAr, row.fullNameEn),
            dateOfBirth,
          })
        : [];

    issues.push(...rowIssues);
    previews.push({
      rowNumber,
      fullNameEn: row.fullNameEn?.trim() ?? '(no name)',
      applicationNo: null,
      programmeCodes,
      duplicates,
      issues: rowIssues,
      willImport: rowIssues.length === 0,
      ...(rowIssues.length === 0 && admissionCategoryId
        ? {
            resolved: {
              admissionCategoryId,
              nationalityId,
              certificateTypeId,
              certificateScore,
              certificateYear,
              dateOfBirth,
              programmeIds,
            },
          }
        : {}),
    });
  }

  const importable = previews.filter((p) => p.willImport).length;

  return {
    batchCode: batch.code,
    totalRows: rows.length,
    importable,
    rejected: rows.length - importable,
    withDuplicates: previews.filter((p) => p.duplicates.length > 0).length,
    rows: previews,
    issues,
  };
}

function codeMap(rows: Array<{ id: string; code: string }>): Map<string, string> {
  return new Map(rows.map((r) => [r.code.trim().toUpperCase(), r.id]));
}

/** Split on semicolons or commas, trim, drop blanks. */
function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse `YYYY-MM-DD` strictly.
 *
 * `new Date(string)` is not used: it accepts `2026-02-31` and quietly rolls it
 * into March, which turns a typo in a date of birth into a plausible wrong
 * answer rather than an error somebody can fix.
 */
function parseIsoDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return toDateOnly(date);
}
