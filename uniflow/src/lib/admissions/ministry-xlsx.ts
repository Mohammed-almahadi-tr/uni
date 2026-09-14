import * as XLSX from 'xlsx';
import type { MinistryCandidateRow } from './ministry-import';

export class MinistryWorkbookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MinistryWorkbookError';
  }
}

const HEADERS: Record<keyof MinistryCandidateRow, readonly string[]> = {
  fullNameAr: ['الاسم الرباعي', 'الاسم الكامل', 'full name', 'full name ar', 'arabic full name'],
  school: ['المدرسة', 'school'],
  nationalId: ['الرقم الوطني', 'رقم وطني', 'national id', 'national number'],
  admissionYear: ['سنة القبول', 'عام القبول', 'admission year'],
  batchCode: ['الدفعة', 'batch', 'batch code'],
};

/** Parse the first non-empty worksheet. Formula values are read as their
 * displayed values so identity numbers never become JavaScript numbers. */
export function parseMinistryWorkbook(file: Buffer): MinistryCandidateRow[] {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(file, { type: 'buffer', cellText: true, cellDates: false });
  } catch {
    throw new MinistryWorkbookError('The uploaded file is not a readable Excel workbook.');
  }

  const sheetName = workbook.SheetNames.find((name) => {
    const sheet = workbook.Sheets[name];
    return sheet && sheet['!ref'];
  });
  if (!sheetName) throw new MinistryWorkbookError('The workbook does not contain a worksheet with data.');

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    raw: false,
    blankrows: false,
  });
  if (matrix.length < 2) throw new MinistryWorkbookError('The worksheet needs a header row and at least one candidate row.');

  const columns = resolveHeaders(matrix[0]);
  return matrix.slice(1).map((cells) => ({
    fullNameAr: cell(cells, columns.fullNameAr),
    school: cell(cells, columns.school),
    nationalId: cell(cells, columns.nationalId),
    admissionYear: cell(cells, columns.admissionYear),
    batchCode: cell(cells, columns.batchCode),
  }));
}

function resolveHeaders(header: unknown[]): Record<keyof MinistryCandidateRow, number> {
  const normalised = header.map((value) => normalise(String(value ?? '')));
  const result = {} as Record<keyof MinistryCandidateRow, number>;
  for (const [field, names] of Object.entries(HEADERS) as Array<[keyof MinistryCandidateRow, readonly string[]]>) {
    const aliases = new Set(names.map(normalise));
    const matches = normalised
      .map((value, index) => aliases.has(value) ? index : -1)
      .filter((index) => index >= 0);
    if (matches.length === 0) {
      throw new MinistryWorkbookError(`The required column "${names[0]}" is missing.`);
    }
    if (matches.length > 1) {
      throw new MinistryWorkbookError(`The column "${names[0]}" is ambiguous because it appears more than once.`);
    }
    result[field] = matches[0];
  }
  return result;
}

function normalise(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function cell(cells: unknown[], index: number): string {
  return String(cells[index] ?? '').trim();
}
