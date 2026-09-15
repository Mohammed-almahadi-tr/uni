'use server';

import { revalidatePath } from 'next/cache';
import type { AdmissionDecision } from '@/generated/prisma/enums';
import { CandidateInterviewError, finalizeCandidateAdmission, recordCandidateInterviewDecision } from '@/lib/admissions/candidate-interview';
import { currentContext } from '@/lib/console/session';

export interface InterviewActionState { error: string | null; done: boolean }
const str = (data: FormData, key: string) => typeof data.get(key) === 'string' ? String(data.get(key)).trim() : '';
const fail = (error: string): InterviewActionState => ({ error, done: false });
const explain = (error: unknown) => error instanceof CandidateInterviewError ? error.message : 'That could not be completed.';
const refresh = () => revalidatePath('/console/registry/candidate-interviews');

export async function decideInterview(_previous: InterviewActionState, data: FormData): Promise<InterviewActionState> {
  const ctx = await currentContext();
  if (!ctx) return fail('Your session has ended. Sign in again.');
  const scoreText = str(data, 'score');
  try {
    await recordCandidateInterviewDecision(ctx.principal, {
      candidateId: str(data, 'candidateId'),
      decision: str(data, 'decision') as AdmissionDecision,
      score: scoreText ? Number(scoreText) : null,
      notes: str(data, 'notes') || null,
      conditions: str(data, 'conditions') || null,
      discountPct: Number(str(data, 'discountPct') || 0),
      instalmentCount: Number(str(data, 'instalmentCount') || 1),
    });
    refresh();
    return { error: null, done: true };
  } catch (error) { return fail(explain(error)); }
}

export async function finalizeAdmission(_previous: InterviewActionState, data: FormData): Promise<InterviewActionState> {
  const ctx = await currentContext();
  if (!ctx) return fail('Your session has ended. Sign in again.');
  try { await finalizeCandidateAdmission(ctx.principal, str(data, 'candidateId')); refresh(); return { error: null, done: true }; }
  catch (error) { return fail(explain(error)); }
}
