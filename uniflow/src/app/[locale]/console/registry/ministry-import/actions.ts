'use server';

import { createHash } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { importMinistryCandidates, MinistryImportError } from '@/lib/admissions/ministry-import';
import { parseMinistryWorkbook, MinistryWorkbookError } from '@/lib/admissions/ministry-xlsx';

export interface MinistryUploadState {
  error: string | null;
  issues: Array<{ rowNumber: number; field: string; message: string }>;
  imported: number | null;
}

const blank = (): MinistryUploadState => ({ error: null, issues: [], imported: null });

export async function uploadMinistryRoster(
  _previous: MinistryUploadState,
  form: FormData,
): Promise<MinistryUploadState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const file = form.get('roster');
  if (!(file instanceof File) || file.size === 0) {
    return { ...blank(), error: 'Choose an Excel workbook first.' };
  }
  if (!/\.xlsx$/i.test(file.name)) {
    return { ...blank(), error: 'Upload an .xlsx workbook.' };
  }
  if (file.size > 5 * 1024 * 1024) {
    return { ...blank(), error: 'The workbook must be 5 MB or smaller.' };
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const rows = parseMinistryWorkbook(bytes);
    const result = await importMinistryCandidates(ctx.principal, {
      fileName: file.name,
      fileSha256: createHash('sha256').update(bytes).digest('hex'),
      rows,
    });
    revalidatePath('/console/registry/ministry-import');
    return { ...blank(), imported: result.imported };
  } catch (error) {
    if (error instanceof MinistryImportError) {
      return { ...blank(), error: error.message, issues: error.issues };
    }
    if (error instanceof MinistryWorkbookError) return { ...blank(), error: error.message };
    console.error('[ministry-import]', error);
    return { ...blank(), error: 'The roster could not be imported.' };
  }
}
