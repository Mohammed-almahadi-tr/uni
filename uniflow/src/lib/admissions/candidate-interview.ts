import 'server-only';
import type { AdmissionDecision } from '@/generated/prisma/enums';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { withTenant } from '@/lib/db/client';

export class CandidateInterviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateInterviewError';
  }
}

export async function recordCandidateInterviewDecision(
  principal: Principal,
  input: {
    candidateId: string;
    decision: AdmissionDecision;
    score?: number | null;
    notes?: string | null;
    conditions?: string | null;
    discountPct: number;
    instalmentCount: number;
  },
) {
  requirePermission(principal, 'admission.manage');
  if (!['ACCEPT', 'CONDITIONAL_ACCEPT', 'REJECT'].includes(input.decision)) {
    throw new CandidateInterviewError('Choose accept, conditional accept, or reject.');
  }
  if (input.score != null && (!Number.isFinite(input.score) || input.score < 0 || input.score > 100)) {
    throw new CandidateInterviewError('Interview score must be between 0 and 100.');
  }
  if (!Number.isFinite(input.discountPct) || input.discountPct < 0 || input.discountPct > 100) {
    throw new CandidateInterviewError('Discount must be between 0 and 100 percent.');
  }
  if (!Number.isInteger(input.instalmentCount) || input.instalmentCount < 1 || input.instalmentCount > 24) {
    throw new CandidateInterviewError('Instalment count must be a whole number between 1 and 24.');
  }
  const notes = input.notes?.trim() || null;
  const conditions = input.conditions?.trim() || null;
  if (input.decision === 'CONDITIONAL_ACCEPT' && !conditions) {
    throw new CandidateInterviewError('Conditional acceptance must state its conditions.');
  }
  if (input.decision === 'REJECT' && !notes) {
    throw new CandidateInterviewError('A rejection must record the committee reason.');
  }
  if (input.decision === 'REJECT' && (input.discountPct !== 0 || input.instalmentCount !== 1)) {
    throw new CandidateInterviewError('A rejected candidate cannot receive fee or instalment terms.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const candidate = await tx.ministryCandidate.findFirst({
      where: { id: input.candidateId, tenantId: principal.tenantId },
      select: { id: true, state: true, programmeId: true, interviewDecision: { select: { id: true } } },
    });
    if (!candidate || candidate.state !== 'INTERVIEW_PENDING' || !candidate.programmeId) {
      throw new CandidateInterviewError('Only a medically cleared candidate in the interview queue may be decided.');
    }
    if (candidate.interviewDecision) throw new CandidateInterviewError('The committee has already recorded a decision for this candidate.');

    const decision = await tx.candidateInterviewDecision.create({
      data: {
        tenantId: principal.tenantId,
        candidateId: candidate.id,
        decision: input.decision,
        score: input.score == null ? null : input.score.toFixed(3),
        notes,
        conditions,
        discountPct: input.discountPct.toFixed(4),
        instalmentCount: input.instalmentCount,
        decidedById: principal.userId,
      },
      select: { id: true },
    });
    const nextState = input.decision === 'REJECT' ? 'REJECTED' : 'ACCEPTED';
    await tx.ministryCandidate.update({ where: { id: candidate.id }, data: { state: nextState } });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'candidate_interview_decision',
      resourceId: decision.id,
      after: {
        candidateId: candidate.id,
        decision: input.decision,
        score: input.score ?? null,
        discountPct: input.discountPct,
        instalmentCount: input.instalmentCount,
        nextState,
      },
    });
    return decision;
  }, { isolationLevel: 'Serializable' });
}

export async function finalizeCandidateAdmission(principal: Principal, candidateId: string) {
  requirePermission(principal, 'admission.manage');
  return withTenant(principal.tenantId, async (tx) => {
    const candidate = await tx.ministryCandidate.findFirst({
      where: { id: candidateId, tenantId: principal.tenantId },
      select: { id: true, state: true, interviewDecision: { select: { id: true, decision: true, finalizedAt: true } } },
    });
    if (!candidate || candidate.state !== 'ACCEPTED' || !candidate.interviewDecision || candidate.interviewDecision.finalizedAt) {
      throw new CandidateInterviewError('Only an accepted, unfinalized candidate can proceed to registration.');
    }
    if (!['ACCEPT', 'CONDITIONAL_ACCEPT'].includes(candidate.interviewDecision.decision)) {
      throw new CandidateInterviewError('The committee decision does not permit registration.');
    }
    const now = new Date();
    await tx.candidateInterviewDecision.update({ where: { id: candidate.interviewDecision.id }, data: { finalizedAt: now } });
    await tx.ministryCandidate.update({ where: { id: candidate.id }, data: { state: 'REGISTRATION_PENDING' } });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'ministry_candidate',
      resourceId: candidate.id,
      before: { state: candidate.state },
      after: { state: 'REGISTRATION_PENDING', interviewDecisionId: candidate.interviewDecision.id, finalizedAt: now },
    });
  }, { isolationLevel: 'Serializable' });
}
