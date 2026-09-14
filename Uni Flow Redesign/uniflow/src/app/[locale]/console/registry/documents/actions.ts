'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { rejectDocument, verifyDocument } from '@/lib/students/documents';

/**
 * Verifying and rejecting documents (Track D3, SRS REQ-ST-05).
 *
 * `verifyDocument` refuses a verification by the person who uploaded the
 * file. That is the whole point of the screen — B3 recorded that *a document
 * uploaded and verified by one person has been checked by nobody* — and it is
 * enforced in the module and by the database, not here.
 */

export interface DocState {
  error: string | null;
  verified: boolean;
  rejected: boolean;
}

const blank = (): DocState => ({ error: null, verified: false, rejected: false });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[documents]', e);
  return 'That could not be completed.';
}

export async function verify(_prev: DocState, form: FormData): Promise<DocState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const studentId = str(form, 'studentId');
  try {
    await verifyDocument(ctx.principal, str(form, 'documentId'));
    revalidatePath(`/console/registry/documents`);
    revalidatePath(`/console/registry/students/${studentId}`);
    return { error: null, verified: true, rejected: false };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

export async function reject(_prev: DocState, form: FormData): Promise<DocState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const studentId = str(form, 'studentId');
  try {
    await rejectDocument(ctx.principal, str(form, 'documentId'), str(form, 'reason'));
    revalidatePath(`/console/registry/documents`);
    revalidatePath(`/console/registry/students/${studentId}`);
    return { error: null, verified: false, rejected: true };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
