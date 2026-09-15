'use server';

import { issueCandidateProfileCode, CandidateProfileError } from '@/lib/admissions/candidate-profile';
import { currentContext } from '@/lib/console/session';

export interface CandidateCodeState { error: string | null; code: string | null; expiresAt: string | null; }
const blank = (): CandidateCodeState => ({ error: null, code: null, expiresAt: null });

export async function issueProfileCode(_previous: CandidateCodeState, form: FormData): Promise<CandidateCodeState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };
  const candidateId = form.get('candidateId');
  if (typeof candidateId !== 'string') return { ...blank(), error: 'Candidate not found.' };
  try {
    const invitation = await issueCandidateProfileCode(ctx.principal, candidateId);
    return { ...blank(), code: invitation.code, expiresAt: invitation.expiresAt.toISOString().slice(0, 10) };
  } catch (error) {
    return { ...blank(), error: error instanceof CandidateProfileError ? error.message : 'The code could not be issued.' };
  }
}
