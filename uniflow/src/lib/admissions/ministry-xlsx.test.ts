import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { MinistryWorkbookError, parseMinistryWorkbook } from './ministry-xlsx';

function workbook(rows: unknown[][]): Buffer {
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet(rows), 'Candidates');
  return XLSX.write(book, { bookType: 'xlsx', type: 'buffer' }) as Buffer;
}

describe('parseMinistryWorkbook', () => {
  it('parses the Arabic ministry template and preserves identity text', () => {
    const rows = parseMinistryWorkbook(workbook([
      ['الاسم الرباعي', 'المدرسة', 'الرقم الوطني', 'سنة القبول', 'الدفعة'],
      ['آمنة محمد علي حسن', 'مدرسة النيل', '0012345678', '2026', 'B26'],
    ]));

    expect(rows).toEqual([{
      fullNameAr: 'آمنة محمد علي حسن',
      school: 'مدرسة النيل',
      nationalId: '0012345678',
      admissionYear: '2026',
      batchCode: 'B26',
    }]);
  });

  it('rejects a missing required column', () => {
    expect(() => parseMinistryWorkbook(workbook([
      ['full name', 'school', 'national id', 'admission year'],
      ['A B C D', 'School', '1234', '2026'],
    ]))).toThrowError(MinistryWorkbookError);
  });

  it('rejects duplicate aliases for the same required column', () => {
    expect(() => parseMinistryWorkbook(workbook([
      ['full name', 'school', 'national id', 'national number', 'admission year', 'batch'],
      ['A B C D', 'School', '1234', '1234', '2026', 'B26'],
    ]))).toThrow(/ambiguous/i);
  });

  it('rejects unreadable input', () => {
    expect(() => parseMinistryWorkbook(Buffer.from('not an xlsx file'))).toThrowError(MinistryWorkbookError);
  });
});
