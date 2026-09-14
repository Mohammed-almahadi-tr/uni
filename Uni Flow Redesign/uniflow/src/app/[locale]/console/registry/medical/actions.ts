'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { recordExamination } from '@/lib/students/medical';
import type {
  BloodGroup,
  FitnessVerdict,
  ScreeningResult,
} from '@/generated/prisma/enums';

/**
 * Recording a medical examination (Track D3, SRS REQ-ST-02).
 *
 * The legacy form validated four Arabic name fields it then discarded, and
 * stored *not tested* and *screened negative* identically because
 * `AddWithValue("@Aids", CombAids.Text)` on an unset combo box passes the
 * empty string. B3 made a screening result a three-valued enum and demanded a
 * verdict; this form sends all three values explicitly and never an absence.
 */

export interface MedicalState {
  error: string | null;
  recorded: boolean;
}

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
  console.error('[medical]', e);
  return 'That could not be completed.';
}

export async function record(_prev: MedicalState, form: FormData): Promise<MedicalState> {
  const ctx = await currentContext();
  if (!ctx) return { error: 'Your session has ended. Sign in again.', recorded: false };

  const studentId = str(form, 'studentId');
  const examDate = date(form, 'examDate');
  if (!examDate) return { error: 'Give the date of the examination.', recorded: false };

  try {
    await recordExamination(ctx.principal, {
      studentId,
      examDate,
      medicalOfficer: str(form, 'medicalOfficer'),
      bloodGroup: (str(form, 'bloodGroup') || null) as BloodGroup | null,
      // Explicit on every submission: the select defaults to NOT_TESTED, so
      // "we did not test" and "we tested and it was negative" are different
      // stored values rather than the same empty string.
      hepatitisB: str(form, 'hepatitisB') as ScreeningResult,
      hiv: str(form, 'hiv') as ScreeningResult,
      chronicConditions: str(form, 'chronicConditions') || null,
      allergies: str(form, 'allergies') || null,
      officerNotes: str(form, 'officerNotes') || null,
      verdict: str(form, 'verdict') as FitnessVerdict,
      verdictNote: str(form, 'verdictNote') || null,
      validUntil: date(form, 'validUntil') ?? null,
    });
    revalidatePath(`/console/registry/medical`);
    revalidatePath(`/console/registry/students/${studentId}`);
    return { error: null, recorded: true };
  } catch (e) {
    return { error: explain(e), recorded: false };
  }
}
