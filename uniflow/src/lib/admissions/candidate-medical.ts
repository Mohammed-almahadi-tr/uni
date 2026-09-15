import 'server-only';
import type { BloodGroup, FitnessVerdict } from '@/generated/prisma/enums';
import type { Prisma } from '@/generated/prisma/client';
import { audit } from '@/lib/audit/log';
import { can, requirePermission, type Principal } from '@/lib/auth/rbac';
import { withTenant } from '@/lib/db/client';
import { toDateOnly } from '@/lib/ledger/period';

export type CandidateCheckResult = 'PASS' | 'FAIL';

export class CandidateMedicalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateMedicalError';
  }
}

const requiredText = (value: string, label: string, max = 160) => {
  const clean = value.trim();
  if (clean.length < 2 || clean.length > max) {
    throw new CandidateMedicalError(`${label} must be between 2 and ${max} characters.`);
  }
  return clean;
};

export async function addCandidateMedicalRequirement(
  principal: Principal,
  input: { facultyId: string; code: string; nameAr: string; nameEn: string; isRequired: boolean },
) {
  requirePermission(principal, 'medical.manage');
  const code = input.code.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!/^[A-Z0-9_]{2,40}$/.test(code)) {
    throw new CandidateMedicalError('The requirement code must use 2–40 letters, numbers, or underscores.');
  }
  const nameAr = requiredText(input.nameAr, 'Arabic name');
  const nameEn = requiredText(input.nameEn, 'English name');

  return withTenant(principal.tenantId, async (tx) => {
    const faculty = await tx.faculty.findFirst({
      where: { id: input.facultyId, tenantId: principal.tenantId, isActive: true },
      select: { id: true },
    });
    if (!faculty) throw new CandidateMedicalError('Active faculty not found.');

    const row = await tx.candidateMedicalRequirement.create({
      data: { tenantId: principal.tenantId, facultyId: faculty.id, code, nameAr, nameEn, isRequired: input.isRequired },
      select: { id: true },
    });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'candidate_medical_requirement',
      resourceId: row.id,
      after: { facultyId: faculty.id, code, nameAr, nameEn, isRequired: input.isRequired },
    });
    return row;
  });
}

export async function deactivateCandidateMedicalRequirement(principal: Principal, requirementId: string) {
  requirePermission(principal, 'medical.manage');
  return withTenant(principal.tenantId, async (tx) => {
    const current = await tx.candidateMedicalRequirement.findFirst({
      where: { id: requirementId, tenantId: principal.tenantId, isActive: true },
      select: { id: true, code: true, facultyId: true },
    });
    if (!current) throw new CandidateMedicalError('Active requirement not found.');
    await tx.candidateMedicalRequirement.update({ where: { id: current.id }, data: { isActive: false } });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'candidate_medical_requirement',
      resourceId: current.id,
      before: { isActive: true },
      after: { isActive: false, code: current.code, facultyId: current.facultyId },
    });
  });
}

export async function assignCandidateProgramme(
  principal: Principal,
  candidateId: string,
  programmeId: string,
) {
  requirePermission(principal, 'admission.manage');
  return withTenant(principal.tenantId, async (tx) => {
    const [candidate, programme] = await Promise.all([
      tx.ministryCandidate.findFirst({
        where: { id: candidateId, tenantId: principal.tenantId },
        select: { id: true, state: true, programmeId: true, medicalAssessments: { where: { supersededAt: null }, select: { id: true }, take: 1 } },
      }),
      tx.programme.findFirst({
        where: { id: programmeId, tenantId: principal.tenantId, isActive: true },
        select: { id: true, facultyId: true },
      }),
    ]);
    if (!candidate) throw new CandidateMedicalError('Candidate not found.');
    if (!programme) throw new CandidateMedicalError('Active programme not found.');
    if (!['PROFILE_COMPLETED', 'MEDICAL_PENDING'].includes(candidate.state)) {
      throw new CandidateMedicalError('Programme placement requires a completed candidate profile.');
    }
    if (candidate.medicalAssessments.length > 0) {
      throw new CandidateMedicalError('The programme cannot change after a medical assessment has been recorded.');
    }

    await tx.ministryCandidate.update({
      where: { id: candidate.id },
      data: { programmeId: programme.id, state: 'MEDICAL_PENDING' },
    });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'ministry_candidate',
      resourceId: candidate.id,
      before: { programmeId: candidate.programmeId, state: candidate.state },
      after: { programmeId: programme.id, state: 'MEDICAL_PENDING', facultyId: programme.facultyId },
    });
  });
}

export async function recordCandidateMedicalAssessment(
  principal: Principal,
  input: {
    candidateId: string;
    examDate: Date;
    bloodGroup: BloodGroup;
    medicalOfficer: string;
    verdict: FitnessVerdict;
    verdictNote?: string | null;
    results: Record<string, CandidateCheckResult>;
  },
) {
  requirePermission(principal, 'medical.manage');
  const officer = requiredText(input.medicalOfficer, 'Medical officer');
  const note = input.verdictNote?.trim() || null;
  if (input.verdict !== 'FIT' && !note) {
    throw new CandidateMedicalError('A conditional or unfit verdict must include a note.');
  }
  const examDate = toDateOnly(input.examDate);
  if (examDate > toDateOnly(new Date())) throw new CandidateMedicalError('The examination date cannot be in the future.');

  return withTenant(principal.tenantId, async (tx) => {
    const candidate = await tx.ministryCandidate.findFirst({
      where: { id: input.candidateId, tenantId: principal.tenantId },
      select: {
        id: true,
        state: true,
        programme: { select: { id: true, facultyId: true } },
      },
    });
    if (!candidate) throw new CandidateMedicalError('Candidate not found.');
    if (candidate.state !== 'MEDICAL_PENDING' || !candidate.programme) {
      throw new CandidateMedicalError('The candidate must have a programme placement and be awaiting medical assessment.');
    }

    const requirements = await tx.candidateMedicalRequirement.findMany({
      where: { tenantId: principal.tenantId, facultyId: candidate.programme.facultyId, isActive: true },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, nameAr: true, nameEn: true, isRequired: true },
    });
    const required = requirements.filter((item) => item.isRequired);
    if (required.length === 0) {
      throw new CandidateMedicalError('Configure at least one required medical check for this faculty first.');
    }
    const missing = required.filter((item) => !['PASS', 'FAIL'].includes(input.results[item.id] ?? ''));
    if (missing.length > 0) {
      throw new CandidateMedicalError(`Complete every required check: ${missing.map((item) => item.nameEn).join(', ')}.`);
    }
    if (input.verdict === 'FIT' && required.some((item) => input.results[item.id] === 'FAIL')) {
      throw new CandidateMedicalError('A fit verdict cannot be recorded while a required check has failed.');
    }

    const snapshot = Object.fromEntries(
      requirements
        .filter((item) => input.results[item.id])
        .map((item) => [item.id, { code: item.code, nameAr: item.nameAr, nameEn: item.nameEn, required: item.isRequired, result: input.results[item.id] }]),
    ) as Prisma.InputJsonValue;

    const live = await tx.candidateMedicalAssessment.findFirst({
      where: { tenantId: principal.tenantId, candidateId: candidate.id, supersededAt: null },
      select: { id: true },
    });
    if (live) await tx.candidateMedicalAssessment.update({ where: { id: live.id }, data: { supersededAt: new Date() } });

    const assessment = await tx.candidateMedicalAssessment.create({
      data: {
        tenantId: principal.tenantId,
        candidateId: candidate.id,
        examDate,
        bloodGroup: input.bloodGroup,
        results: snapshot,
        verdict: input.verdict,
        verdictNote: note,
        medicalOfficer: officer,
        recordedById: principal.userId,
      },
      select: { id: true },
    });
    const nextState = input.verdict === 'FIT' || input.verdict === 'CONDITIONAL' ? 'MEDICALLY_CLEARED' : 'MEDICAL_PENDING';
    await tx.ministryCandidate.update({ where: { id: candidate.id }, data: { state: nextState } });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'candidate_medical_assessment',
      resourceId: assessment.id,
      after: { candidateId: candidate.id, examDate, bloodGroup: input.bloodGroup, verdict: input.verdict, supersededId: live?.id ?? null, nextState },
    });
    return assessment;
  }, { isolationLevel: 'Serializable' });
}

export async function queueCandidateForInterview(principal: Principal, candidateId: string) {
  requirePermission(principal, 'admission.manage');
  return withTenant(principal.tenantId, async (tx) => {
    const candidate = await tx.ministryCandidate.findFirst({
      where: { id: candidateId, tenantId: principal.tenantId },
      select: { id: true, state: true, medicalAssessments: { where: { supersededAt: null, verdict: { in: ['FIT', 'CONDITIONAL'] } }, select: { id: true }, take: 1 } },
    });
    if (!candidate || candidate.state !== 'MEDICALLY_CLEARED' || candidate.medicalAssessments.length !== 1) {
      throw new CandidateMedicalError('Only a medically cleared candidate can be queued for interview.');
    }
    await tx.ministryCandidate.update({ where: { id: candidate.id }, data: { state: 'INTERVIEW_PENDING' } });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'ministry_candidate',
      resourceId: candidate.id,
      before: { state: candidate.state },
      after: { state: 'INTERVIEW_PENDING', medicalAssessmentId: candidate.medicalAssessments[0].id },
    });
  });
}

export function canReadCandidateMedical(principal: Principal) {
  return can(principal, 'medical.read') || can(principal, 'medical.manage') || can(principal, 'admission.manage');
}
