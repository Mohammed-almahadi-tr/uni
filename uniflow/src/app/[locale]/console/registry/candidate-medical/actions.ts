'use server';

import { revalidatePath } from 'next/cache';
import type { BloodGroup, FitnessVerdict } from '@/generated/prisma/enums';
import {
  addCandidateMedicalRequirement,
  assignCandidateProgramme,
  CandidateMedicalError,
  deactivateCandidateMedicalRequirement,
  queueCandidateForInterview,
  recordCandidateMedicalAssessment,
  type CandidateCheckResult,
} from '@/lib/admissions/candidate-medical';
import { currentContext } from '@/lib/console/session';

export interface CandidateMedicalActionState { error: string | null; done: boolean }
const failed = (error: string): CandidateMedicalActionState => ({ error, done: false });
const str = (data: FormData, key: string) => typeof data.get(key) === 'string' ? String(data.get(key)).trim() : '';
const explain = (error: unknown) => error instanceof CandidateMedicalError ? error.message : 'That could not be completed.';
const refresh = () => revalidatePath('/console/registry/candidate-medical');

export async function addRequirement(_previous: CandidateMedicalActionState, data: FormData): Promise<CandidateMedicalActionState> {
  const ctx = await currentContext();
  if (!ctx) return failed('Your session has ended. Sign in again.');
  try {
    await addCandidateMedicalRequirement(ctx.principal, {
      facultyId: str(data, 'facultyId'), code: str(data, 'code'), nameAr: str(data, 'nameAr'), nameEn: str(data, 'nameEn'), isRequired: data.get('isRequired') === 'on',
    });
    refresh();
    return { error: null, done: true };
  } catch (error) { return failed(explain(error)); }
}

export async function deactivateRequirement(_previous: CandidateMedicalActionState, data: FormData): Promise<CandidateMedicalActionState> {
  const ctx = await currentContext();
  if (!ctx) return failed('Your session has ended. Sign in again.');
  try { await deactivateCandidateMedicalRequirement(ctx.principal, str(data, 'requirementId')); refresh(); return { error: null, done: true }; }
  catch (error) { return failed(explain(error)); }
}

export async function placeCandidate(_previous: CandidateMedicalActionState, data: FormData): Promise<CandidateMedicalActionState> {
  const ctx = await currentContext();
  if (!ctx) return failed('Your session has ended. Sign in again.');
  try { await assignCandidateProgramme(ctx.principal, str(data, 'candidateId'), str(data, 'programmeId')); refresh(); return { error: null, done: true }; }
  catch (error) { return failed(explain(error)); }
}

export async function recordAssessment(_previous: CandidateMedicalActionState, data: FormData): Promise<CandidateMedicalActionState> {
  const ctx = await currentContext();
  if (!ctx) return failed('Your session has ended. Sign in again.');
  const date = str(data, 'examDate');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return failed('Give the examination date.');
  const results: Record<string, CandidateCheckResult> = {};
  for (const [key, value] of data.entries()) {
    if (key.startsWith('check:') && (value === 'PASS' || value === 'FAIL')) results[key.slice(6)] = value;
  }
  try {
    await recordCandidateMedicalAssessment(ctx.principal, {
      candidateId: str(data, 'candidateId'), examDate: new Date(`${date}T00:00:00.000Z`), bloodGroup: str(data, 'bloodGroup') as BloodGroup,
      medicalOfficer: str(data, 'medicalOfficer'), verdict: str(data, 'verdict') as FitnessVerdict, verdictNote: str(data, 'verdictNote') || null, results,
    });
    refresh();
    return { error: null, done: true };
  } catch (error) { return failed(explain(error)); }
}

export async function queueInterview(_previous: CandidateMedicalActionState, data: FormData): Promise<CandidateMedicalActionState> {
  const ctx = await currentContext();
  if (!ctx) return failed('Your session has ended. Sign in again.');
  try { await queueCandidateForInterview(ctx.principal, str(data, 'candidateId')); refresh(); return { error: null, done: true }; }
  catch (error) { return failed(explain(error)); }
}
