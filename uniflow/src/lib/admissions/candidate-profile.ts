import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { withTenant } from '@/lib/db/client';

const CODE_RE = /^[0-9a-f]{32}$/;
const TTL_DAYS = 14;

export class CandidateProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CandidateProfileError';
  }
}

const digest = (code: string) => createHash('sha256').update(code).digest('hex');

function codePair() {
  const code = randomBytes(16).toString('hex');
  return { code, hash: digest(code) };
}

function sameDigest(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function issueCandidateProfileCode(principal: Principal, candidateId: string) {
  requirePermission(principal, 'admission.manage');
  const { code, hash } = codePair();
  const expiresAt = new Date(Date.now() + TTL_DAYS * 86_400_000);

  return withTenant(principal.tenantId, async (tx) => {
    const candidate = await tx.ministryCandidate.findUnique({
      where: { id: candidateId },
      select: { id: true, state: true },
    });
    if (!candidate || !['IMPORTED', 'PROFILE_COMPLETED'].includes(candidate.state)) {
      throw new CandidateProfileError('Only an imported candidate may receive a profile-completion code.');
    }
    await tx.candidateInvitation.updateMany({
      where: { tenantId: principal.tenantId, candidateId, acceptedAt: null, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    const invitation = await tx.candidateInvitation.create({
      data: { tenantId: principal.tenantId, candidateId, tokenHash: hash, expiresAt },
      select: { id: true },
    });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId, action: 'INSERT', resourceType: 'candidate_invitation', resourceId: invitation.id,
      after: { candidateId, expiresAt },
    });
    return { code, expiresAt };
  });
}

export interface CandidateProfilePreview { fullNameAr: string; nationalId: string; admissionYear: number; }

export async function previewCandidateProfile(tenantId: string, code: string): Promise<CandidateProfilePreview | null> {
  const cleaned = code.trim().toLowerCase();
  if (!CODE_RE.test(cleaned)) return null;
  return withTenant(tenantId, async (tx) => {
    const row = await tx.candidateInvitation.findUnique({
      where: { tokenHash: digest(cleaned) },
      select: { tenantId: true, tokenHash: true, expiresAt: true, acceptedAt: true, revokedAt: true, candidate: { select: { fullNameAr: true, nationalId: true, admissionYear: true } } },
    });
    if (!row || row.tenantId !== tenantId || row.acceptedAt || row.revokedAt || row.expiresAt <= new Date() || !sameDigest(row.tokenHash, digest(cleaned))) return null;
    return row.candidate;
  });
}

export async function completeCandidateProfile(tenantId: string, code: string, input: { fullNameEn: string; guardianName: string; email: string; phone: string }) {
  const cleaned = code.trim().toLowerCase();
  if (!CODE_RE.test(cleaned)) throw new CandidateProfileError('This profile code is not valid.');
  const fullNameEn = input.fullNameEn.trim();
  const guardianName = input.guardianName.trim();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim();
  if (fullNameEn.length < 2 || guardianName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.length < 5) {
    throw new CandidateProfileError('Complete the English name, guardian name, email and phone number.');
  }
  return withTenant(tenantId, async (tx) => {
    const invitation = await tx.candidateInvitation.findUnique({
      where: { tokenHash: digest(cleaned) }, select: { id: true, tenantId: true, tokenHash: true, candidateId: true, expiresAt: true, acceptedAt: true, revokedAt: true },
    });
    if (!invitation || invitation.tenantId !== tenantId || invitation.acceptedAt || invitation.revokedAt || invitation.expiresAt <= new Date() || !sameDigest(invitation.tokenHash, digest(cleaned))) throw new CandidateProfileError('This profile code is not valid.');
    await tx.ministryCandidate.update({ where: { id: invitation.candidateId }, data: { fullNameEn, guardianName, email, phone, state: 'PROFILE_COMPLETED', profileCompletedAt: new Date() } });
    await tx.candidateInvitation.update({ where: { id: invitation.id }, data: { acceptedAt: new Date() } });
  });
}
