import 'server-only';
import type { NationalityCategory } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { money, type Money } from '@/lib/money';

/**
 * Automatic eligibility screening (SRS REQ-ADM-CAP-02, Track B2).
 *
 * The legacy system had no concept of this at all: an application was a paper
 * form and a committee, and the only thing the software knew was who had paid.
 *
 * Two decisions shape this module.
 *
 * **Scores are normalised before they are compared.** A certificate type
 * carries the mark it is reported out of — Sudanese secondary out of 100, some
 * international certificates out of 700 or 1600 — and the rule states a
 * percentage. Comparing a raw 620 against a minimum of 70 would admit or
 * refuse the wrong people, and it is the kind of error that looks right on the
 * screen.
 *
 * **A failure is reported, never enforced.** Screening produces a verdict and
 * a list of the specific rules that failed; it does not block anything. The
 * committee decides, with the reasons in front of them (REQ-ADM-CAP-03). A
 * system that silently discarded applications would hide exactly the cases a
 * committee exists to consider — the applicant one mark short with a strong
 * reference.
 */

export class EligibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EligibilityError';
  }
}

export interface EligibilityRuleInput {
  programmeId: string;
  certificateTypeId: string;
  /** Minimum overall percentage, 0-100. */
  minPercentage: number | string;
  /** Subjects the applicant must have sat. Matched case-insensitively. */
  requiredSubjects?: string[];
  minAge?: number | null;
  maxAge?: number | null;
  nationalityCategory?: NationalityCategory | null;
}

export async function setEligibilityRule(
  principal: Principal,
  input: EligibilityRuleInput,
): Promise<{ id: string; created: boolean }> {
  requirePermission(principal, 'admission.capacity');

  const pct = money(input.minPercentage);
  if (pct.isNegative() || pct.greaterThan(100)) {
    throw new EligibilityError(
      `A minimum of ${pct.toFixed(2)}% is not a percentage. Rules are stated as a ` +
        `percentage so certificates reported on different scales can be compared.`,
    );
  }
  if (input.minAge != null && input.maxAge != null && input.maxAge < input.minAge) {
    throw new EligibilityError(
      `Age range ${input.minAge}-${input.maxAge} is inverted.`,
    );
  }

  const subjects = normaliseSubjects(input.requiredSubjects ?? []);

  return withTenant(principal.tenantId, async (tx) => {
    const existing = await tx.eligibilityRule.findFirst({
      where: {
        tenantId: principal.tenantId,
        programmeId: input.programmeId,
        certificateTypeId: input.certificateTypeId,
      },
      select: { id: true },
    });

    const data = {
      minPercentage: pct.toFixed(3),
      requiredSubjects: subjects,
      minAge: input.minAge ?? null,
      maxAge: input.maxAge ?? null,
      nationalityCategory: input.nationalityCategory ?? null,
      isActive: true,
    };

    if (existing) {
      await tx.eligibilityRule.update({ where: { id: existing.id }, data });
      await audit(tx, principal.tenantId, {
        actorId: principal.userId,
        action: 'UPDATE',
        resourceType: 'eligibility_rule',
        resourceId: existing.id,
        after: data,
      });
      return { id: existing.id, created: false };
    }

    const rule = await tx.eligibilityRule.create({
      data: {
        tenantId: principal.tenantId,
        programmeId: input.programmeId,
        certificateTypeId: input.certificateTypeId,
        ...data,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'eligibility_rule',
      resourceId: rule.id,
      after: { programmeId: input.programmeId, ...data },
    });

    return { id: rule.id, created: true };
  });
}

export interface ChoiceAssessment {
  choiceId: string;
  programmeId: string;
  programmeCode: string;
  outcome: 'PASS' | 'FAIL' | 'NOT_ASSESSED';
  notes: string[];
}

export interface ScreeningResult {
  applicationId: string;
  applicationNo: string;
  /** Percentage of the certificate maximum, or null if not stated. */
  normalisedScore: string | null;
  choices: ChoiceAssessment[];
}

/**
 * Screen one application against the rules of every programme it asked for.
 *
 * Writes the verdict and its reasons onto each choice. Re-runnable: a
 * corrected certificate score is re-screened by calling this again, and the
 * previous verdict is simply replaced.
 */
export async function screenApplication(
  principal: Principal,
  applicationId: string,
): Promise<ScreeningResult> {
  requirePermission(principal, 'application.read');
  return withTenant(principal.tenantId, (tx) =>
    screen(tx, principal.tenantId, applicationId),
  );
}

export async function screen(
  tx: Tx,
  tenantId: string,
  applicationId: string,
): Promise<ScreeningResult> {
  const application = await tx.application.findUnique({
    where: { id: applicationId },
    select: {
      tenantId: true,
      applicationNo: true,
      certificateTypeId: true,
      certificateScore: true,
      dateOfBirth: true,
      subjects: true,
      nationalityId: true,
      submittedAt: true,
    },
  });
  if (!application || application.tenantId !== tenantId) {
    throw new EligibilityError('That application does not belong to this university.');
  }

  const certificate = application.certificateTypeId
    ? await tx.certificateType.findUnique({
        where: { id: application.certificateTypeId },
        select: { code: true, maxScore: true },
      })
    : null;

  // Normalise once, here, rather than inside the per-rule comparison. A
  // certificate out of 700 compared against a rule stated as a percentage is
  // the error this whole step exists to prevent.
  let normalised: Money | null = null;
  if (certificate && application.certificateScore) {
    normalised = application.certificateScore
      .dividedBy(certificate.maxScore)
      .times(100)
      .toDecimalPlaces(3);
  }

  const nationalityCategory = application.nationalityId
    ? (
        await tx.nationality.findUnique({
          where: { id: application.nationalityId },
          select: { category: true },
        })
      )?.category ?? null
    : null;

  const age = application.dateOfBirth
    ? ageAt(application.dateOfBirth, application.submittedAt ?? new Date())
    : null;

  const held = normaliseSubjects(application.subjects);

  const choices = await tx.application.findUnique({
    where: { id: applicationId },
    select: {
      choices: {
        orderBy: { rank: 'asc' },
        select: {
          id: true,
          programmeId: true,
          programme: { select: { code: true } },
        },
      },
    },
  });

  const assessments: ChoiceAssessment[] = [];

  for (const choice of choices?.choices ?? []) {
    const notes: string[] = [];
    let outcome: 'PASS' | 'FAIL' | 'NOT_ASSESSED' = 'PASS';

    const rule = application.certificateTypeId
      ? await tx.eligibilityRule.findFirst({
          where: {
            tenantId,
            programmeId: choice.programmeId,
            certificateTypeId: application.certificateTypeId,
            isActive: true,
          },
          select: {
            minPercentage: true,
            requiredSubjects: true,
            minAge: true,
            maxAge: true,
            nationalityCategory: true,
          },
        })
      : null;

    if (!application.certificateTypeId) {
      outcome = 'NOT_ASSESSED';
      notes.push('No certificate declared, so nothing can be screened.');
    } else if (!rule) {
      // Deliberately not a pass. A programme with no rule for this certificate
      // has not said it accepts it, and silently admitting on that basis is
      // how an unrecognised qualification gets through.
      outcome = 'NOT_ASSESSED';
      notes.push(
        `${choice.programme.code} has no published rule for ${certificate?.code ?? 'this certificate'}. ` +
          `A committee decision is required.`,
      );
    } else {
      if (normalised === null) {
        outcome = 'NOT_ASSESSED';
        notes.push('No certificate score recorded.');
      } else if (normalised.lessThan(rule.minPercentage)) {
        outcome = 'FAIL';
        notes.push(
          `Score ${normalised.toFixed(2)}% is below the ${money(rule.minPercentage).toFixed(2)}% ` +
            `minimum for ${choice.programme.code}.`,
        );
      }

      const missing = normaliseSubjects(rule.requiredSubjects).filter(
        (s) => !held.includes(s),
      );
      if (missing.length > 0) {
        outcome = 'FAIL';
        notes.push(`Required subject(s) not sat: ${missing.join(', ')}.`);
      }

      if (rule.minAge != null || rule.maxAge != null) {
        if (age === null) {
          notes.push('Date of birth not recorded, so the age rule could not be checked.');
          if (outcome === 'PASS') outcome = 'NOT_ASSESSED';
        } else {
          if (rule.minAge != null && age < rule.minAge) {
            outcome = 'FAIL';
            notes.push(`Age ${age} is below the minimum of ${rule.minAge}.`);
          }
          if (rule.maxAge != null && age > rule.maxAge) {
            outcome = 'FAIL';
            notes.push(`Age ${age} is above the maximum of ${rule.maxAge}.`);
          }
        }
      }

      if (
        rule.nationalityCategory != null &&
        nationalityCategory !== rule.nationalityCategory
      ) {
        outcome = 'FAIL';
        notes.push(
          `${choice.programme.code} admits ${rule.nationalityCategory} applicants on this ` +
            `certificate; this application is ${nationalityCategory ?? 'of no recorded nationality'}.`,
        );
      }
    }

    await tx.applicationChoice.update({
      where: { id: choice.id },
      data: {
        eligibility: outcome,
        eligibilityNotes: notes,
        assessedAt: new Date(),
      },
    });

    assessments.push({
      choiceId: choice.id,
      programmeId: choice.programmeId,
      programmeCode: choice.programme.code,
      outcome,
      notes,
    });
  }

  return {
    applicationId,
    applicationNo: application.applicationNo,
    normalisedScore: normalised?.toFixed(3) ?? null,
    choices: assessments,
  };
}

/**
 * Whole years completed by `on`.
 *
 * Month and day compared explicitly rather than dividing a millisecond
 * difference by 365.25: an applicant whose birthday is tomorrow is not yet
 * eighteen, and a rounding answer that says otherwise admits someone a year
 * early.
 */
export function ageAt(dateOfBirth: Date, on: Date): number {
  let age = on.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const monthDiff = on.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && on.getUTCDate() < dateOfBirth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Fold subject names so a comparison survives how they were typed.
 *
 * Case, surrounding space and internal runs of space are all noise here.
 * "Pure Maths", "pure  maths" and "PURE MATHS" are one subject, and an
 * applicant should not be refused a place over a double space.
 */
function normaliseSubjects(subjects: string[]): string[] {
  return subjects
    .map((s) => s.trim().replace(/\s+/g, ' ').toLowerCase())
    .filter((s) => s.length > 0);
}
