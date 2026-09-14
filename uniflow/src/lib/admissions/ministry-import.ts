import 'server-only';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { withTenant } from '@/lib/db/client';

/** The required columns in the ministry's workbook, after its header row has
 * been normalised by the spreadsheet adapter. Keeping parsing outside this
 * module makes the import rules identical for an uploaded xlsx and a test. */
export interface MinistryCandidateRow {
  fullNameAr: string;
  school: string;
  nationalId: string;
  admissionYear: number | string;
  batchCode: string;
}

export interface MinistryImportInput {
  fileName: string;
  fileSha256: string;
  rows: MinistryCandidateRow[];
}

export interface MinistryImportIssue {
  rowNumber: number;
  field: keyof MinistryCandidateRow | 'row';
  message: string;
}

export class MinistryImportError extends Error {
  constructor(
    message: string,
    readonly issues: MinistryImportIssue[] = [],
  ) {
    super(message);
    this.name = 'MinistryImportError';
  }
}

/**
 * Commit a previously parsed ministry roster as one transaction.
 *
 * This intentionally accepts structured rows, not an uploaded File. The
 * server action owns MIME/size checks and the `.xlsx` adapter; this domain
 * layer owns the rules that must also hold for scripts and tests. No row is
 * written until the complete roster has passed validation.
 */
export async function importMinistryCandidates(
  principal: Principal,
  input: MinistryImportInput,
): Promise<{ importId: string; imported: number }> {
  requirePermission(principal, 'admission.import');

  const fileName = input.fileName.trim();
  const fileSha256 = input.fileSha256.trim().toLowerCase();
  if (!fileName || fileName.length > 255) {
    throw new MinistryImportError('The source file needs a name of at most 255 characters.');
  }
  if (!/^[a-f0-9]{64}$/.test(fileSha256)) {
    throw new MinistryImportError('The source file checksum is invalid.');
  }
  if (input.rows.length === 0) {
    throw new MinistryImportError('The ministry roster has no candidate rows.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const batchCodes = new Set(input.rows.map((row) => row.batchCode.trim().toUpperCase()));
    if (batchCodes.size !== 1 || batchCodes.has('')) {
      throw new MinistryImportError('A file may contain candidates for exactly one non-empty batch.');
    }

    const batch = await tx.batch.findFirst({
      where: { tenantId: principal.tenantId, code: [...batchCodes][0] },
      select: { id: true, admissionYear: true, isActive: true },
    });
    if (!batch) throw new MinistryImportError('The roster batch does not belong to this university.');
    if (!batch.isActive) throw new MinistryImportError('The roster batch is not active.');

    const issues = validateRows(input.rows, batch.admissionYear);
    const ids = input.rows.map((row) => row.nationalId.trim());
    const existing = await tx.ministryCandidate.findMany({
      where: { tenantId: principal.tenantId, nationalId: { in: ids } },
      select: { nationalId: true },
    });
    const alreadyImported = new Set(existing.map((candidate) => candidate.nationalId));
    for (const [index, row] of input.rows.entries()) {
      if (alreadyImported.has(row.nationalId.trim())) {
        issues.push({
          rowNumber: index + 2,
          field: 'nationalId',
          message: 'This national ID is already present in a ministry roster.',
        });
      }
    }
    if (issues.length > 0) {
      throw new MinistryImportError('Fix the roster errors before importing it.', issues);
    }

    const imported = await tx.ministryImport.create({
      data: {
        tenantId: principal.tenantId,
        batchId: batch.id,
        fileName,
        fileSha256,
        totalRows: input.rows.length,
        importedRows: input.rows.length,
        rejectedRows: 0,
        candidates: {
          create: input.rows.map((row, index) => ({
            tenantId: principal.tenantId,
            batchId: batch.id,
            importRow: index + 2, // the first row is the spreadsheet header
            fullNameAr: row.fullNameAr.trim(),
            school: row.school.trim(),
            nationalId: row.nationalId.trim(),
            admissionYear: batch.admissionYear,
          })),
        },
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'ministry_import',
      resourceId: imported.id,
      after: { batchId: batch.id, fileName, rows: input.rows.length, fileSha256 },
    });

    return { importId: imported.id, imported: input.rows.length };
  });
}

function validateRows(rows: MinistryCandidateRow[], expectedAdmissionYear: number): MinistryImportIssue[] {
  const issues: MinistryImportIssue[] = [];
  const seenNationalIds = new Set<string>();

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const required = (field: keyof Pick<MinistryCandidateRow, 'fullNameAr' | 'school' | 'nationalId' | 'batchCode'>, max: number) => {
      const value = row[field].trim();
      if (value.length < 2 || value.length > max) {
        issues.push({ rowNumber, field, message: `Provide ${field} between 2 and ${max} characters.` });
      }
      return value;
    };

    required('fullNameAr', 200);
    required('school', 200);
    const nationalId = required('nationalId', 64);
    required('batchCode', 80);

    if (nationalId && seenNationalIds.has(nationalId)) {
      issues.push({ rowNumber, field: 'nationalId', message: 'This national ID appears more than once in the file.' });
    }
    seenNationalIds.add(nationalId);

    const admissionYear = Number(row.admissionYear);
    if (!Number.isInteger(admissionYear) || admissionYear !== expectedAdmissionYear) {
      issues.push({
        rowNumber,
        field: 'admissionYear',
        message: `Admission year must match the selected batch (${expectedAdmissionYear}).`,
      });
    }
  }

  return issues;
}
