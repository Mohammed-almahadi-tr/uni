'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { changeStudentStatus, type StatusChangeResult } from '@/lib/students/status';
import { transferProgramme, type TransferResult } from '@/lib/students/transfer';
import type { RefundElection, StudentStatus } from '@/generated/prisma/enums';

/**
 * Changes of standing and programme transfers (Track D3, SRS REQ-LIF-01/02,
 * REQ-REG-04).
 *
 * Neither action decides anything. `changeStudentStatus` consults B5's
 * transition table, refuses a move that is not on it by name, and carries out
 * the declared financial consequence in the same transaction as the history
 * row. `transferProgramme` reverses the old programme's billing, moves the
 * student, and *then* raises the new registration — an order that is a rule,
 * not an implementation detail, because the engine prices from the student's
 * placement.
 *
 * What this file adds is that the operator is told the consequence **before**
 * they confirm. The legacy transfer screen reversed whatever two numbers were
 * in its text boxes, one of which was the string literal `"1,030.00"`.
 */

export interface LifecycleState {
  error: string | null;
  status: StatusChangeResult | null;
  transfer: TransferResult | null;
}

const blank = (): LifecycleState => ({ error: null, status: null, transfer: null });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date | undefined => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : undefined;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[lifecycle]', e);
  return 'That could not be completed.';
}

export async function changeStanding(
  _prev: LifecycleState,
  form: FormData,
): Promise<LifecycleState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const studentId = str(form, 'studentId');
  try {
    const result = await changeStudentStatus(ctx.principal, {
      studentId,
      to: str(form, 'to') as StudentStatus,
      effectiveDate: date(form, 'effectiveDate'),
      reason: str(form, 'reason'),
      requestedBy: str(form, 'requestedBy') || null,
      approvedById: str(form, 'approvedById') || null,
      refundElection: (str(form, 'refundElection') || undefined) as RefundElection | undefined,
      postingDate: date(form, 'postingDate'),
    });
    revalidatePath(`/console/registry/students/${studentId}`);
    return { error: null, status: result, transfer: null };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

export async function transfer(
  _prev: LifecycleState,
  form: FormData,
): Promise<LifecycleState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const studentId = str(form, 'studentId');
  try {
    const levelYear = Number.parseInt(str(form, 'levelYear'), 10);
    const result = await transferProgramme(ctx.principal, {
      studentId,
      toProgrammeId: str(form, 'toProgrammeId'),
      academicTermId: str(form, 'academicTermId'),
      levelYear: Number.isFinite(levelYear) ? levelYear : 1,
      effectiveDate: date(form, 'effectiveDate'),
      reason: str(form, 'reason'),
      approvedById: str(form, 'approvedById') || null,
      postingDate: date(form, 'postingDate'),
    });
    revalidatePath(`/console/registry/students/${studentId}`);
    return { error: null, status: null, transfer: result };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
