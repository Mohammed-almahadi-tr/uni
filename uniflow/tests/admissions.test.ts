import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import {
  capacityForBatch,
  CapacityExceededError,
  countTaken,
  SeatQuotaError,
  setSeatQuota,
} from '@/lib/admissions/quota';
import {
  ageAt,
  EligibilityError,
  screenApplication,
  setEligibilityRule,
} from '@/lib/admissions/eligibility';
import {
  ApplicationError,
  createApplication,
  decideApplication,
  duplicatesFor,
  rankedList,
  scoreApplication,
  submitApplication,
  withdrawApplication,
} from '@/lib/admissions/applications';
import {
  acceptOffer,
  declineOffer,
  enrolAcceptedOffer,
  issueOffer,
  lapseExpiredOffers,
  OfferError,
  promoteFromWaitlist,
  waitlistFor,
  withdrawOffer,
} from '@/lib/admissions/offers';
import {
  commitIntake,
  IntakeImportError,
  previewIntake,
  type IntakeRow,
} from '@/lib/admissions/intake-import';
import { STANDARD_CERTIFICATE_TYPES } from '@/lib/academic/defaults';
import { findSodViolations } from '@/lib/auth/permissions';
import { ForbiddenError } from '@/lib/auth/rbac';
import { feeScheduleForStudent } from '@/lib/academic/fee-matrix';

/**
 * Admissions: capacity, eligibility, committee workflow (SRS Module 17, B2).
 *
 * The legacy baseline is two findings from one file, `frmStudentsVacants.vb`,
 * which existed only in the Ribat/UOT build:
 *
 *   · The quota was saved with `Delete From StudentsVacants Where College=N'..'`
 *     followed by an insert naming college AND batch (lines 94-98), so setting
 *     one batch's quota destroyed every other batch's for that college. The
 *     same defect as the fee matrix, in a second screen.
 *   · Nothing consulted the quota when a place was given. The report counted
 *     students who had *paid*, from receipt vouchers, by rebuilding two SQL
 *     views at runtime with `ALTER VIEW` (lines 141-160).
 *
 * So the property this suite is mostly about is the one the legacy build never
 * had at all: **a seat cannot be given away twice.**
 */

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

let uni: University;

beforeAll(async () => {
  uni = await makeUniversity();
});

afterAll(disconnectAll);

async function fresh() {
  const u = await makeUniversity();
  return {
    uni: u,
    // Registrar: runs admissions day to day, but cannot authorise an override.
    registrar: await makePrincipal(
      u.tenantId,
      [
        'admission.capacity',
        'application.read',
        'application.decide',
        'application.offer',
        'application.enrol',
        'student.manage',
      ],
      { name: 'registrar' },
    ),
    // A separate authority for exceeding published capacity.
    dean: await makePrincipal(u.tenantId, ['application.read', 'admission.override'], {
      name: 'dean',
    }),
  };
}

/** Somebody who can both offer and override, for the override-path tests. */
async function offerOverrider(tenantId: string) {
  return makePrincipal(
    tenantId,
    ['application.read', 'application.offer', 'admission.override', 'admission.capacity'],
    { name: 'override' },
  );
}

interface ApplicantOpts {
  name?: string;
  nationalId?: string | null;
  passportNo?: string | null;
  dateOfBirth?: Date | null;
  nationality?: string;
  certificate?: string;
  score?: string;
  subjects?: string[];
  choices?: string[];
  category?: string;
}

async function applicant(
  principal: Awaited<ReturnType<typeof fresh>>['registrar'],
  u: University,
  opts: ApplicantOpts = {},
) {
  return createApplication(principal, {
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories[opts.category ?? 'GENERAL'],
    fullNameAr: opts.name ?? 'أحمد محمد علي',
    fullNameEn: opts.name ?? 'Ahmed Mohammed Ali',
    nationalId: opts.nationalId ?? null,
    passportNo: opts.passportNo ?? null,
    dateOfBirth: opts.dateOfBirth ?? D(2007, 5, 12),
    nationalityId: opts.nationality ? u.nationalities[opts.nationality] : null,
    certificateTypeId: u.certificateTypes[opts.certificate ?? 'SD_SECONDARY'],
    certificateScore: opts.score ?? '85',
    certificateYear: 2025,
    subjects: opts.subjects ?? ['Physics', 'Chemistry', 'Biology'],
    choices: opts.choices ?? [u.programmeIds.MBBS],
  });
}

// ---------------------------------------------------------------------------
// Seat quotas
// ---------------------------------------------------------------------------

describe('seat quotas', () => {
  it('is keyed on programme, batch and admission category — not on a college', async () => {
    const { uni: u, registrar } = await fresh();

    const med = await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 60,
    });
    const medPrivate = await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.PRIVATE,
      seats: 20,
    });
    const nursing = await setSeatQuota(registrar, {
      programmeId: u.programmeIds.NURS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 40,
    });

    // Three separate quotas where the legacy table could hold one row per
    // college — and where saving any of them deleted the others.
    expect(new Set([med.id, medPrivate.id, nursing.id]).size).toBe(3);

    const capacity = await capacityForBatch(registrar, u.batchId);
    expect(capacity).toHaveLength(3);
    expect(capacity.map((c) => c.seats).sort((a, b) => a - b)).toEqual([20, 40, 60]);
  });

  it('updating one quota leaves the others untouched', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 60,
    });
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.NURS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 40,
    });

    // The legacy equivalent of this second save deleted Nursing's row.
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 75,
    });

    const capacity = await capacityForBatch(registrar, u.batchId);
    const byCode = Object.fromEntries(capacity.map((c) => [c.programmeCode, c.seats]));
    expect(byCode).toEqual({ MBBS: 75, NURS: 40 });
  });

  it('refuses a quota that cannot hold what it has already given out', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 2,
    });

    for (const n of [1, 2]) {
      const app = await applicant(registrar, u, { nationalId: `Q-${n}` });
      await submitApplication(registrar, app.id);
      await issueOffer(registrar, {
        applicationId: app.id,
        programmeId: u.programmeIds.MBBS,
        acceptBy: D(2026, 9, 1),
      });
    }

    await expect(
      setSeatQuota(registrar, {
        programmeId: u.programmeIds.MBBS,
        batchId: u.batchId,
        admissionCategoryId: u.admissionCategories.GENERAL,
        seats: 1,
      }),
    ).rejects.toThrow(/2 place\(s\) are already held/);
  });

  it('refuses to move a quota to another programme, even written directly', async () => {
    const { uni: u, registrar } = await fresh();
    const quota = await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 10,
    });

    // Moving a quota sideways would move every offer already counted against
    // it, and the counters would look correct on both sides.
    await expect(
      asSystem((tx) =>
        tx.seatQuota.update({
          where: { id: quota.id },
          data: { programmeId: u.programmeIds.NURS },
        }),
      ),
    ).rejects.toThrow(/cannot be moved to a different programme/);
  });

  it('refuses reserved seats beyond the quota', async () => {
    const { uni: u, registrar } = await fresh();
    await expect(
      setSeatQuota(registrar, {
        programmeId: u.programmeIds.MBBS,
        batchId: u.batchId,
        admissionCategoryId: u.admissionCategories.GENERAL,
        seats: 10,
        reservedSeats: 12,
      }),
    ).rejects.toThrow(SeatQuotaError);
  });

  it('requires admission.capacity', async () => {
    const nobody = await makePrincipal(uni.tenantId, [], { name: 'nobody-cap' });
    await expect(
      setSeatQuota(nobody, {
        programmeId: uni.programmeIds.MBBS,
        batchId: uni.batchId,
        admissionCategoryId: uni.admissionCategories.GENERAL,
        seats: 1,
      }),
    ).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Capacity enforcement — the property the legacy build never had
// ---------------------------------------------------------------------------

describe('capacity enforcement', () => {
  it('refuses an offer beyond the quota', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 1,
    });

    const first = await applicant(registrar, u, { nationalId: 'C-1' });
    await submitApplication(registrar, first.id);
    await issueOffer(registrar, {
      applicationId: first.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });

    const second = await applicant(registrar, u, { nationalId: 'C-2' });
    await submitApplication(registrar, second.id);

    await expect(
      issueOffer(registrar, {
        applicationId: second.id,
        programmeId: u.programmeIds.MBBS,
        acceptBy: D(2026, 9, 1),
      }),
    ).rejects.toThrow(CapacityExceededError);
  });

  it('counts an unanswered offer as a seat taken', async () => {
    const { uni: u, registrar } = await fresh();
    const quota = await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 3,
    });

    const app = await applicant(registrar, u, { nationalId: 'H-1' });
    await submitApplication(registrar, app.id);
    await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });

    const counts = await asTenant(u.tenantId, (tx) =>
      countTaken(tx, u.tenantId, quota.id),
    );
    // Nobody has replied yet, and the seat is still gone. Treating it as free
    // is how a programme finds itself over-subscribed on deadline day.
    expect(counts).toMatchObject({ offered: 1, confirmed: 0, held: 1, released: 0 });

    const capacity = await capacityForBatch(registrar, u.batchId);
    expect(capacity[0].available).toBe(2);
  });

  it('subtracts reserved seats from what can be offered', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 3,
      reservedSeats: 2,
    });

    const first = await applicant(registrar, u, { nationalId: 'R-1' });
    await submitApplication(registrar, first.id);
    await issueOffer(registrar, {
      applicationId: first.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });

    const second = await applicant(registrar, u, { nationalId: 'R-2' });
    await submitApplication(registrar, second.id);
    await expect(
      issueOffer(registrar, {
        applicationId: second.id,
        programmeId: u.programmeIds.MBBS,
        acceptBy: D(2026, 9, 1),
      }),
    ).rejects.toThrow(CapacityExceededError);
  });

  it('allows an override, and records who allowed it and why', async () => {
    const { uni: u, registrar } = await fresh();
    const overrider = await offerOverrider(u.tenantId);

    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 1,
    });

    const first = await applicant(registrar, u, { nationalId: 'O-1' });
    await submitApplication(registrar, first.id);
    await issueOffer(registrar, {
      applicationId: first.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });

    const second = await applicant(registrar, u, { nationalId: 'O-2' });
    await submitApplication(registrar, second.id);

    // The registrar cannot authorise their own exception.
    await expect(
      issueOffer(registrar, {
        applicationId: second.id,
        programmeId: u.programmeIds.MBBS,
        acceptBy: D(2026, 9, 1),
        override: { reason: 'Ministry directive 44/2026.' },
      }),
    ).rejects.toThrow(ForbiddenError);

    const offer = await issueOffer(overrider, {
      applicationId: second.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
      override: { reason: 'Ministry directive 44/2026.' },
    });

    expect(offer.overrodeCapacity).toBe(true);
    expect(offer.seatsRemaining).toBe(-1);

    const stored = await asSystem((tx) =>
      tx.admissionOffer.findUniqueOrThrow({
        where: { id: offer.offerId },
        select: { overrodeCapacity: true, overrideReason: true, overriddenById: true },
      }),
    );
    expect(stored.overrideReason).toBe('Ministry directive 44/2026.');
    expect(stored.overriddenById).toBe(overrider.userId);

    const capacity = await capacityForBatch(registrar, u.batchId);
    expect(capacity[0].overrides).toBe(1);
    expect(capacity[0].available).toBe(-1);
  });

  it('refuses an override with no reason, at the database too', async () => {
    const { uni: u, registrar } = await fresh();
    const overrider = await offerOverrider(u.tenantId);
    const quota = await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 1,
    });
    const app = await applicant(registrar, u, { nationalId: 'ORX-1' });
    await submitApplication(registrar, app.id);

    await expect(
      issueOffer(overrider, {
        applicationId: app.id,
        programmeId: u.programmeIds.MBBS,
        acceptBy: D(2026, 9, 1),
        override: { reason: '   ' },
      }),
    ).rejects.toThrow(/needs a stated reason/);

    // And directly: recording that capacity was exceeded without recording who
    // allowed it is indistinguishable from never having checked.
    await expect(
      asSystem((tx) =>
        tx.admissionOffer.create({
          data: {
            tenantId: u.tenantId,
            applicationId: app.id,
            seatQuotaId: quota.id,
            programmeId: u.programmeIds.MBBS,
            issuedById: registrar.userId,
            acceptBy: D(2026, 9, 1),
            overrodeCapacity: true,
          },
        }),
      ),
    ).rejects.toThrow(/chk_offer_override_evidence|violates check constraint/i);
  });

  it('honours a quota that forbids overrides entirely', async () => {
    const { uni: u, registrar } = await fresh();
    const overrider = await offerOverrider(u.tenantId);
    await setSeatQuota(overrider, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 1,
      allowOverride: false,
    });

    const first = await applicant(registrar, u, { nationalId: 'NO-1' });
    await submitApplication(registrar, first.id);
    await issueOffer(registrar, {
      applicationId: first.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });

    const second = await applicant(registrar, u, { nationalId: 'NO-2' });
    await submitApplication(registrar, second.id);
    await expect(
      issueOffer(overrider, {
        applicationId: second.id,
        programmeId: u.programmeIds.MBBS,
        acceptBy: D(2026, 9, 1),
        override: { reason: 'Exceptional case.' },
      }),
    ).rejects.toThrow(/does not permit overrides/);
  });

  it('refuses an offer with no quota declared', async () => {
    const { uni: u, registrar } = await fresh();
    const app = await applicant(registrar, u, { nationalId: 'NQ-1' });
    await submitApplication(registrar, app.id);

    await expect(
      issueOffer(registrar, {
        applicationId: app.id,
        programmeId: u.programmeIds.MBBS,
        acceptBy: D(2026, 9, 1),
      }),
    ).rejects.toThrow(/Capacity has to be declared/);
  });

  it('refuses an offer for a programme the applicant did not ask for', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.NURS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 5,
    });
    const app = await applicant(registrar, u, {
      nationalId: 'W-1',
      choices: [u.programmeIds.MBBS],
    });
    await submitApplication(registrar, app.id);

    await expect(
      issueOffer(registrar, {
        applicationId: app.id,
        programmeId: u.programmeIds.NURS,
        acceptBy: D(2026, 9, 1),
      }),
    ).rejects.toThrow(/did not apply for this programme/);
  });

  it('refuses a second live offer to one applicant', async () => {
    const { uni: u, registrar } = await fresh();
    for (const p of ['MBBS', 'NURS'] as const) {
      await setSeatQuota(registrar, {
        programmeId: u.programmeIds[p],
        batchId: u.batchId,
        admissionCategoryId: u.admissionCategories.GENERAL,
        seats: 5,
      });
    }

    const app = await applicant(registrar, u, {
      nationalId: 'T-1',
      choices: [u.programmeIds.MBBS, u.programmeIds.NURS],
    });
    await submitApplication(registrar, app.id);
    await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });

    await expect(
      issueOffer(registrar, {
        applicationId: app.id,
        programmeId: u.programmeIds.NURS,
        acceptBy: D(2026, 9, 1),
      }),
    ).rejects.toThrow(/already holds an unanswered offer/);
  });

  it('keeps the SoD pairs that make an override a second signature', () => {
    expect(findSodViolations(['admission.capacity', 'admission.override'])).toHaveLength(1);
    expect(findSodViolations(['application.offer', 'admission.override'])).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Eligibility screening
// ---------------------------------------------------------------------------

describe('eligibility screening', () => {
  it('normalises the score against the certificate scale before comparing', async () => {
    const { uni: u, registrar } = await fresh();

    await setEligibilityRule(registrar, {
      programmeId: u.programmeIds.MBBS,
      certificateTypeId: u.certificateTypes.IB,
      minPercentage: 80,
    });

    // 38 out of the IB's 45 is 84.4%, which passes an 80% rule. Compared as a
    // raw number against 80 it would fail — the error this normalisation
    // exists to prevent, and the one that looks right on screen.
    const strong = await applicant(registrar, u, {
      nationalId: 'IB-1',
      certificate: 'IB',
      score: '38',
    });
    const result = await submitApplication(registrar, strong.id);
    expect(result.normalisedScore).toBe('84.444');
    expect(result.choices[0].outcome).toBe('PASS');

    const weak = await applicant(registrar, u, {
      nationalId: 'IB-2',
      certificate: 'IB',
      score: '30',
    });
    const weakResult = await submitApplication(registrar, weak.id);
    expect(weakResult.choices[0].outcome).toBe('FAIL');
    expect(weakResult.choices[0].notes[0]).toMatch(/66\.67% is below the 80\.00% minimum/);
  });

  it('reports a missing required subject by name', async () => {
    const { uni: u, registrar } = await fresh();
    await setEligibilityRule(registrar, {
      programmeId: u.programmeIds.MBBS,
      certificateTypeId: u.certificateTypes.SD_SECONDARY,
      minPercentage: 60,
      requiredSubjects: ['Physics', 'Chemistry', 'Biology'],
    });

    const app = await applicant(registrar, u, {
      nationalId: 'S-1',
      subjects: ['Physics', 'Chemistry'],
    });
    const result = await submitApplication(registrar, app.id);

    expect(result.choices[0].outcome).toBe('FAIL');
    expect(result.choices[0].notes.join(' ')).toMatch(/Required subject\(s\) not sat: biology/);
  });

  it('matches subjects regardless of case and spacing', async () => {
    const { uni: u, registrar } = await fresh();
    await setEligibilityRule(registrar, {
      programmeId: u.programmeIds.MBBS,
      certificateTypeId: u.certificateTypes.SD_SECONDARY,
      minPercentage: 60,
      requiredSubjects: ['Pure Maths'],
    });

    const app = await applicant(registrar, u, {
      nationalId: 'S-2',
      subjects: ['  pure   MATHS '],
    });
    const result = await submitApplication(registrar, app.id);
    // Nobody should be refused a place over a double space.
    expect(result.choices[0].outcome).toBe('PASS');
  });

  it('reports a programme with no rule as unassessed rather than as a pass', async () => {
    const { uni: u, registrar } = await fresh();
    const app = await applicant(registrar, u, { nationalId: 'U-1' });
    const result = await submitApplication(registrar, app.id);

    // A programme that has not said it accepts this certificate has not said
    // it accepts this certificate.
    expect(result.choices[0].outcome).toBe('NOT_ASSESSED');
    expect(result.choices[0].notes[0]).toMatch(/no published rule/);
  });

  it('applies age limits from whole years, not from a division', async () => {
    // Someone whose birthday is tomorrow is not yet eighteen.
    expect(ageAt(D(2008, 6, 2), D(2026, 6, 1))).toBe(17);
    expect(ageAt(D(2008, 6, 1), D(2026, 6, 1))).toBe(18);
    expect(ageAt(D(2008, 5, 31), D(2026, 6, 1))).toBe(18);

    const { uni: u, registrar } = await fresh();
    await setEligibilityRule(registrar, {
      programmeId: u.programmeIds.MBBS,
      certificateTypeId: u.certificateTypes.SD_SECONDARY,
      minPercentage: 50,
      minAge: 18,
    });

    const young = await applicant(registrar, u, {
      nationalId: 'A-1',
      dateOfBirth: D(2012, 1, 1),
    });
    const result = await submitApplication(registrar, young.id);
    expect(result.choices[0].outcome).toBe('FAIL');
    expect(result.choices[0].notes.join(' ')).toMatch(/below the minimum of 18/);
  });

  it('restricts a rule by nationality category', async () => {
    const { uni: u, registrar } = await fresh();
    await setEligibilityRule(registrar, {
      programmeId: u.programmeIds.MBBS,
      certificateTypeId: u.certificateTypes.SD_SECONDARY,
      minPercentage: 50,
      nationalityCategory: 'NATIONAL',
    });

    const local = await applicant(registrar, u, { nationalId: 'N-1', nationality: 'SD' });
    expect((await submitApplication(registrar, local.id)).choices[0].outcome).toBe('PASS');

    const foreign = await applicant(registrar, u, { nationalId: 'N-2', nationality: 'ET' });
    const result = await submitApplication(registrar, foreign.id);
    expect(result.choices[0].outcome).toBe('FAIL');
  });

  it('does not block anything — a failing applicant can still be offered a place', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 5,
    });
    await setEligibilityRule(registrar, {
      programmeId: u.programmeIds.MBBS,
      certificateTypeId: u.certificateTypes.SD_SECONDARY,
      minPercentage: 90,
    });

    const nearMiss = await applicant(registrar, u, { nationalId: 'NM-1', score: '89' });
    const screening = await submitApplication(registrar, nearMiss.id);
    expect(screening.choices[0].outcome).toBe('FAIL');

    // Screening advises; the committee decides. A system that discarded this
    // application would hide exactly the case a committee exists for.
    await decideApplication(
      registrar,
      nearMiss.id,
      'ACCEPT',
      'One mark short; strong school reference and interview.',
    );
    await expect(
      issueOffer(registrar, {
        applicationId: nearMiss.id,
        programmeId: u.programmeIds.MBBS,
        acceptBy: D(2026, 9, 1),
      }),
    ).resolves.toBeTruthy();
  });

  it('refuses a minimum that is not a percentage', async () => {
    const { uni: u, registrar } = await fresh();
    await expect(
      setEligibilityRule(registrar, {
        programmeId: u.programmeIds.MBBS,
        certificateTypeId: u.certificateTypes.SD_SECONDARY,
        minPercentage: 620,
      }),
    ).rejects.toThrow(EligibilityError);
  });

  it('re-screens after a corrected score', async () => {
    const { uni: u, registrar } = await fresh();
    await setEligibilityRule(registrar, {
      programmeId: u.programmeIds.MBBS,
      certificateTypeId: u.certificateTypes.SD_SECONDARY,
      minPercentage: 80,
    });

    const app = await applicant(registrar, u, { nationalId: 'RS-1', score: '70' });
    expect((await submitApplication(registrar, app.id)).choices[0].outcome).toBe('FAIL');

    await asSystem((tx) =>
      tx.application.update({ where: { id: app.id }, data: { certificateScore: '92' } }),
    );
    const again = await screenApplication(registrar, app.id);
    expect(again.choices[0].outcome).toBe('PASS');
  });
});

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

describe('duplicate detection', () => {
  it('flags a national ID already on another application', async () => {
    const { uni: u, registrar } = await fresh();
    const first = await applicant(registrar, u, { nationalId: '199912345' });
    const second = await applicant(registrar, u, { nationalId: '199912345' });

    expect(first.duplicates).toHaveLength(0);
    expect(second.duplicates).toHaveLength(1);
    expect(second.duplicates[0]).toMatchObject({
      basis: 'NATIONAL_ID',
      confidence: 'HIGH',
      applicationId: first.id,
    });
  });

  it('flags a national ID already belonging to an enrolled student', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 5,
    });

    const app = await applicant(registrar, u, { nationalId: '20015555' });
    await submitApplication(registrar, app.id);
    const offer = await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });
    await acceptOffer(registrar, offer.offerId);
    await enrolAcceptedOffer(registrar, offer.offerId, { studentNo: 'STU-0001' });

    // The interesting duplicate is the person already enrolled quietly
    // applying again — one human, two student numbers, two ledgers.
    const again = await applicant(registrar, u, { nationalId: '20015555' });
    expect(again.duplicates.some((d) => d.studentId !== null)).toBe(true);
    expect(again.duplicates.find((d) => d.studentId)?.reference).toBe('STU-0001');
  });

  it('matches an Arabic name across spelling variants when the birthday agrees', async () => {
    const { uni: u, registrar } = await fresh();

    await createApplication(registrar, {
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      fullNameAr: 'أحمد فاطمة',
      fullNameEn: 'Ahmed Fatima',
      dateOfBirth: D(2007, 3, 4),
      choices: [u.programmeIds.MBBS],
    });

    // Bare alef and taa marbuta written as haa — the same person, typed by
    // somebody else from the same ID card.
    const second = await createApplication(registrar, {
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      fullNameAr: 'احمد فاطمه',
      fullNameEn: 'Ahmed Fatima',
      dateOfBirth: D(2007, 3, 4),
      choices: [u.programmeIds.MBBS],
    });

    expect(second.duplicates.some((d) => d.basis === 'NAME_AND_DOB')).toBe(true);
    expect(second.duplicates.find((d) => d.basis === 'NAME_AND_DOB')?.confidence).toBe(
      'MEDIUM',
    );
  });

  it('does not match on name alone when the birthdays differ', async () => {
    const { uni: u, registrar } = await fresh();
    await applicant(registrar, u, { name: 'Mohammed Ali', dateOfBirth: D(2007, 1, 1) });
    const other = await applicant(registrar, u, {
      name: 'Mohammed Ali',
      dateOfBirth: D(2005, 9, 9),
    });
    expect(other.duplicates).toHaveLength(0);
  });

  it('re-runs detection for a reviewer without matching the application itself', async () => {
    const { uni: u, registrar } = await fresh();
    const first = await applicant(registrar, u, { nationalId: 'DR-1' });
    await applicant(registrar, u, { nationalId: 'DR-1' });

    const found = await duplicatesFor(registrar, first.id);
    expect(found).toHaveLength(1);
    expect(found[0].applicationId).not.toBe(first.id);
  });
});

// ---------------------------------------------------------------------------
// Committee
// ---------------------------------------------------------------------------

describe('committee workflow', () => {
  it('ranks applicants by committee score, then certificate score', async () => {
    const { uni: u, registrar } = await fresh();

    const a = await applicant(registrar, u, { name: 'A', nationalId: 'K-1', score: '70' });
    const b = await applicant(registrar, u, { name: 'B', nationalId: 'K-2', score: '90' });
    const c = await applicant(registrar, u, { name: 'C', nationalId: 'K-3', score: '80' });
    for (const app of [a, b, c]) await submitApplication(registrar, app.id);

    let list = await rankedList(registrar, u.programmeIds.MBBS, u.batchId);
    expect(list.map((r) => r.certificateScore)).toEqual([
      '90.000',
      '80.000',
      '70.000',
    ]);

    // A committee score overrides the certificate for ranking.
    await scoreApplication(registrar, a.id, '99');
    list = await rankedList(registrar, u.programmeIds.MBBS, u.batchId);
    expect(list[0].applicationId).toBe(a.id);
    expect(list[0].committeeScore).toBe('99.000');
  });

  it('includes applicants who failed screening, marked', async () => {
    const { uni: u, registrar } = await fresh();
    await setEligibilityRule(registrar, {
      programmeId: u.programmeIds.MBBS,
      certificateTypeId: u.certificateTypes.SD_SECONDARY,
      minPercentage: 85,
    });

    const pass = await applicant(registrar, u, { nationalId: 'L-1', score: '90' });
    const fail = await applicant(registrar, u, { nationalId: 'L-2', score: '84' });
    for (const app of [pass, fail]) await submitApplication(registrar, app.id);

    const list = await rankedList(registrar, u.programmeIds.MBBS, u.batchId);
    expect(list).toHaveLength(2);
    const failed = list.find((r) => r.applicationId === fail.id);
    expect(failed?.eligibility).toBe('FAIL');
    expect(failed?.eligibilityNotes.join(' ')).toMatch(/below the 85\.00% minimum/);
  });

  it('demands a rationale for every decision, in the database as well', async () => {
    const { uni: u, registrar } = await fresh();
    const app = await applicant(registrar, u, { nationalId: 'M-1' });
    await submitApplication(registrar, app.id);

    await expect(decideApplication(registrar, app.id, 'REJECT', '  ')).rejects.toThrow(
      /stated rationale/,
    );

    await expect(
      asSystem((tx) =>
        tx.application.update({
          where: { id: app.id },
          data: { decision: 'REJECT', decidedById: registrar.userId, decidedAt: new Date() },
        }),
      ),
    ).rejects.toThrow(/chk_application_decision_complete|violates check constraint/i);
  });

  it('does not turn an ACCEPT into a place — that needs a seat', async () => {
    const { uni: u, registrar } = await fresh();
    const app = await applicant(registrar, u, { nationalId: 'P-1' });
    await submitApplication(registrar, app.id);
    await decideApplication(registrar, app.id, 'ACCEPT', 'Strong candidate.');

    const state = await asSystem((tx) =>
      tx.application.findUniqueOrThrow({
        where: { id: app.id },
        select: { state: true, decision: true },
      }),
    );
    // Deciding and having capacity are different questions. Collapsing them is
    // how the legacy build over-admitted.
    expect(state.decision).toBe('ACCEPT');
    expect(state.state).toBe('UNDER_REVIEW');
  });

  it('refuses to decide an unsubmitted application', async () => {
    const { uni: u, registrar } = await fresh();
    const app = await applicant(registrar, u, { nationalId: 'Z-1' });
    await expect(
      decideApplication(registrar, app.id, 'ACCEPT', 'Looks fine.'),
    ).rejects.toThrow(/has not been submitted/);
  });

  it('withdraws an application with a reason', async () => {
    const { uni: u, registrar } = await fresh();
    const app = await applicant(registrar, u, { nationalId: 'WD-1' });
    await submitApplication(registrar, app.id);
    await withdrawApplication(registrar, app.id, 'Applicant went elsewhere.');

    const state = await asSystem((tx) =>
      tx.application.findUniqueOrThrow({
        where: { id: app.id },
        select: { state: true },
      }),
    );
    expect(state.state).toBe('WITHDRAWN');
  });

  it('refuses an application with duplicate or empty choices', async () => {
    const { uni: u, registrar } = await fresh();
    await expect(
      applicant(registrar, u, { choices: [] }),
    ).rejects.toThrow(ApplicationError);
    await expect(
      applicant(registrar, u, { choices: [u.programmeIds.MBBS, u.programmeIds.MBBS] }),
    ).rejects.toThrow(/appears twice/);
  });
});

// ---------------------------------------------------------------------------
// Offers, lapse and waitlist
// ---------------------------------------------------------------------------

describe('offers, lapse and waitlist', () => {
  async function withQuota(seats = 1) {
    const f = await fresh();
    await setSeatQuota(f.registrar, {
      programmeId: f.uni.programmeIds.MBBS,
      batchId: f.uni.batchId,
      admissionCategoryId: f.uni.admissionCategories.GENERAL,
      seats,
    });
    return f;
  }

  it('frees the seat when an offer lapses, and says when', async () => {
    const { uni: u, registrar } = await withQuota(1);

    const app = await applicant(registrar, u, { nationalId: 'LP-1' });
    await submitApplication(registrar, app.id);
    const offer = await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 3, 1),
    });

    // Before the deadline, nothing happens.
    expect((await lapseExpiredOffers(registrar, D(2026, 2, 28))).lapsed).toBe(0);

    const result = await lapseExpiredOffers(registrar, D(2026, 3, 2));
    expect(result.lapsed).toBe(1);
    expect(result.applicationNos).toEqual([app.applicationNo]);

    const stored = await asSystem((tx) =>
      tx.admissionOffer.findUniqueOrThrow({
        where: { id: offer.offerId },
        select: { state: true, closedAt: true, closeReason: true },
      }),
    );
    expect(stored.state).toBe('LAPSED');
    expect(stored.closedAt).not.toBeNull();
    expect(stored.closeReason).toMatch(/deadline passed on 2026-03-02/);

    const capacity = await capacityForBatch(registrar, u.batchId);
    expect(capacity[0].available).toBe(1);
    expect(capacity[0].released).toBe(1);
  });

  it('promotes a waitlisted applicant into a lapsed seat, and records where it came from', async () => {
    const { uni: u, registrar } = await withQuota(1);

    const holder = await applicant(registrar, u, { nationalId: 'PR-1', score: '70' });
    const waiting = await applicant(registrar, u, { nationalId: 'PR-2', score: '88' });
    for (const app of [holder, waiting]) await submitApplication(registrar, app.id);

    const first = await issueOffer(registrar, {
      applicationId: holder.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 3, 1),
    });
    await decideApplication(registrar, waiting.id, 'WAITLIST', 'No seats remaining.');

    const queue = await waitlistFor(registrar, u.programmeIds.MBBS, u.batchId);
    expect(queue.map((c) => c.applicationId)).toEqual([waiting.id]);

    await lapseExpiredOffers(registrar, D(2026, 3, 2));

    const promoted = await promoteFromWaitlist(registrar, {
      applicationId: waiting.id,
      programmeId: u.programmeIds.MBBS,
      lapsedOfferId: first.offerId,
      acceptBy: D(2026, 4, 1),
    });

    expect(promoted.overrodeCapacity).toBe(false);
    const stored = await asSystem((tx) =>
      tx.admissionOffer.findUniqueOrThrow({
        where: { id: promoted.offerId },
        select: { promotedFromId: true },
      }),
    );
    // "Who held this seat before me" has an answer.
    expect(stored.promotedFromId).toBe(first.offerId);
  });

  it('will not promote into a seat somebody still holds', async () => {
    const { uni: u, registrar } = await withQuota(2);
    const holder = await applicant(registrar, u, { nationalId: 'PH-1' });
    const waiting = await applicant(registrar, u, { nationalId: 'PH-2' });
    for (const app of [holder, waiting]) await submitApplication(registrar, app.id);

    const live = await issueOffer(registrar, {
      applicationId: holder.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });
    await decideApplication(registrar, waiting.id, 'WAITLIST', 'Held in reserve.');

    await expect(
      promoteFromWaitlist(registrar, {
        applicationId: waiting.id,
        programmeId: u.programmeIds.MBBS,
        lapsedOfferId: live.offerId,
        acceptBy: D(2026, 9, 1),
      }),
    ).rejects.toThrow(/still live/);
  });

  it('frees the seat on a decline and on a withdrawal', async () => {
    const { uni: u, registrar } = await withQuota(1);

    const first = await applicant(registrar, u, { nationalId: 'DC-1' });
    await submitApplication(registrar, first.id);
    const offer = await issueOffer(registrar, {
      applicationId: first.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });
    await declineOffer(registrar, offer.offerId);

    const second = await applicant(registrar, u, { nationalId: 'DC-2' });
    await submitApplication(registrar, second.id);
    const replacement = await issueOffer(registrar, {
      applicationId: second.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });
    await withdrawOffer(registrar, replacement.offerId, 'Documents not produced.');

    const capacity = await capacityForBatch(registrar, u.batchId);
    expect(capacity[0].held).toBe(0);
    expect(capacity[0].released).toBe(2);
  });

  it('refuses to reopen a closed offer, at the database', async () => {
    const { uni: u, registrar } = await withQuota(1);
    const app = await applicant(registrar, u, { nationalId: 'RO-1' });
    await submitApplication(registrar, app.id);
    const offer = await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });
    await declineOffer(registrar, offer.offerId);

    await expect(acceptOffer(registrar, offer.offerId)).rejects.toThrow(OfferError);
    await expect(
      asSystem((tx) =>
        tx.admissionOffer.update({
          where: { id: offer.offerId },
          data: { state: 'ISSUED' },
        }),
      ),
    ).rejects.toThrow(/cannot be moved to/);
  });

  it('will not accept an offer whose seat deposit has not been taken', async () => {
    const { uni: u, registrar } = await withQuota(1);
    const app = await applicant(registrar, u, { nationalId: 'DP-1' });
    await submitApplication(registrar, app.id);
    const offer = await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
      depositRequired: '50000.00',
    });

    await expect(acceptOffer(registrar, offer.offerId)).rejects.toThrow(
      /requires a seat deposit/,
    );
  });

  it('refuses a paid deposit with no receipt behind it', async () => {
    const { uni: u, registrar } = await withQuota(1);
    const app = await applicant(registrar, u, { nationalId: 'DP-2' });
    await submitApplication(registrar, app.id);
    const offer = await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
      depositRequired: '50000.00',
    });

    // The deposit is money a cashier took, not a flag somebody set.
    await expect(
      asSystem((tx) =>
        tx.admissionOffer.update({
          where: { id: offer.offerId },
          data: { depositPaidAt: new Date() },
        }),
      ),
    ).rejects.toThrow(/chk_offer_deposit_receipt|violates check constraint/i);
  });
});

// ---------------------------------------------------------------------------
// Enrolment — the handover to the student master and the fee matrix
// ---------------------------------------------------------------------------

describe('enrolment', () => {
  it('creates a student carrying the four dimensions the fee matrix needs', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 5,
    });

    const app = await applicant(registrar, u, {
      nationalId: 'EN-1',
      nationality: 'SD',
    });
    await submitApplication(registrar, app.id);
    const offer = await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });
    await acceptOffer(registrar, offer.offerId);

    const enrolled = await enrolAcceptedOffer(registrar, offer.offerId, {
      studentNo: 'MED-2026-001',
      admittedOn: D(2026, 8, 1),
    });

    const student = await asSystem((tx) =>
      tx.student.findUniqueOrThrow({
        where: { id: enrolled.studentId },
        select: {
          studentNo: true,
          status: true,
          programmeId: true,
          batchId: true,
          admissionCategoryId: true,
          nationalityId: true,
          nationalId: true,
        },
      }),
    );

    expect(student).toMatchObject({
      studentNo: 'MED-2026-001',
      status: 'ADMITTED',
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      nationalityId: u.nationalities.SD,
      nationalId: 'EN-1',
    });

    // And B1 can price them immediately — the whole point of carrying the
    // four dimensions across at this moment rather than in a later step.
    await expect(
      asTenant(u.tenantId, (tx) =>
        feeScheduleForStudent(tx, u.tenantId, enrolled.studentId, D(2026, 9, 1)),
      ),
    ).resolves.toBeNull();

    const application = await asSystem((tx) =>
      tx.application.findUniqueOrThrow({
        where: { id: app.id },
        select: { state: true, studentId: true },
      }),
    );
    expect(application.state).toBe('ENROLLED');
    expect(application.studentId).toBe(enrolled.studentId);
  });

  it('only an accepted offer produces a student', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 5,
    });
    const app = await applicant(registrar, u, { nationalId: 'EN-2' });
    await submitApplication(registrar, app.id);
    const offer = await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });

    await expect(
      enrolAcceptedOffer(registrar, offer.offerId, { studentNo: 'X-1' }),
    ).rejects.toThrow(/Only an accepted offer/);
  });

  it('refuses to enrol the same application twice', async () => {
    const { uni: u, registrar } = await fresh();
    await setSeatQuota(registrar, {
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 5,
    });
    const app = await applicant(registrar, u, { nationalId: 'EN-3' });
    await submitApplication(registrar, app.id);
    const offer = await issueOffer(registrar, {
      applicationId: app.id,
      programmeId: u.programmeIds.MBBS,
      acceptBy: D(2026, 9, 1),
    });
    await acceptOffer(registrar, offer.offerId);
    await enrolAcceptedOffer(registrar, offer.offerId, { studentNo: 'EN3-A' });

    await expect(
      enrolAcceptedOffer(registrar, offer.offerId, { studentNo: 'EN3-B' }),
    ).rejects.toThrow(/already produced a student record/);
  });

  it('requires application.enrol', async () => {
    const noRights = await makePrincipal(uni.tenantId, ['application.read'], {
      name: 'noenrol',
    });
    await expect(
      enrolAcceptedOffer(noRights, uni.batchId, { studentNo: 'X' }),
    ).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Bulk intake import
// ---------------------------------------------------------------------------

describe('bulk intake import', () => {
  function roster(u: University): IntakeRow[] {
    return [
      {
        fullNameAr: 'سارة عبد الله',
        fullNameEn: 'Sara Abdalla',
        nationalId: 'BI-1',
        dateOfBirth: '2007-02-11',
        nationalityCode: 'SD',
        admissionCategoryCode: 'GENERAL',
        certificateTypeCode: 'SD_SECONDARY',
        certificateScore: '91',
        certificateYear: '2025',
        subjects: 'Physics;Chemistry;Biology',
        programmeCodes: 'MBBS;NURS',
      },
      {
        fullNameAr: 'خالد إبراهيم',
        fullNameEn: 'Khalid Ibrahim',
        nationalId: 'BI-2',
        dateOfBirth: '2006-12-30',
        nationalityCode: 'SD',
        admissionCategoryCode: 'GENERAL',
        certificateTypeCode: 'SD_SECONDARY',
        certificateScore: '76',
        programmeCodes: 'NURS',
      },
    ];
  }

  it('previews without writing anything', async () => {
    const { uni: u, registrar } = await fresh();
    const preview = await previewIntake(registrar, u.batchId, roster(u));

    expect(preview.totalRows).toBe(2);
    expect(preview.importable).toBe(2);
    expect(preview.rejected).toBe(0);

    const count = await asSystem((tx) =>
      tx.application.count({ where: { tenantId: u.tenantId } }),
    );
    expect(count).toBe(0);
  });

  it('reports every bad row rather than silently dropping it', async () => {
    const { uni: u, registrar } = await fresh();
    const rows: IntakeRow[] = [
      ...roster(u),
      { fullNameEn: 'No Arabic Name', admissionCategoryCode: 'GENERAL', programmeCodes: 'MBBS' },
      {
        fullNameAr: 'اسم',
        fullNameEn: 'Bad Programme',
        admissionCategoryCode: 'GENERAL',
        programmeCodes: 'NOPE',
      },
      {
        fullNameAr: 'اسم',
        fullNameEn: 'Bad Date',
        admissionCategoryCode: 'GENERAL',
        programmeCodes: 'MBBS',
        dateOfBirth: '2007-02-31',
      },
    ];

    const preview = await previewIntake(registrar, u.batchId, rows);
    expect(preview.totalRows).toBe(5);
    expect(preview.importable).toBe(2);
    expect(preview.rejected).toBe(3);

    const fields = preview.issues.map((i) => i.field);
    expect(fields).toContain('fullNameAr');
    expect(fields).toContain('programmeCodes');
    // 2026-02-31 must not roll silently into March.
    expect(fields).toContain('dateOfBirth');
  });

  it('catches a score entered against the wrong certificate scale', async () => {
    const { uni: u, registrar } = await fresh();
    const preview = await previewIntake(registrar, u.batchId, [
      {
        fullNameAr: 'اسم',
        fullNameEn: 'Wrong Scale',
        admissionCategoryCode: 'GENERAL',
        programmeCodes: 'MBBS',
        certificateTypeCode: 'IB',
        certificateScore: '620',
      },
    ]);

    expect(preview.importable).toBe(0);
    expect(preview.issues[0].message).toMatch(/exceeds the maximum of 45/);
  });

  it('catches the same national ID twice within one file', async () => {
    const { uni: u, registrar } = await fresh();
    const rows = roster(u);
    rows[1].nationalId = rows[0].nationalId;

    const preview = await previewIntake(registrar, u.batchId, rows);
    expect(preview.issues.some((i) => /also appears on row 1/.test(i.message))).toBe(true);
  });

  it('commits every valid row in one transaction', async () => {
    const { uni: u, registrar } = await fresh();
    const result = await commitIntake(registrar, u.batchId, roster(u));

    expect(result.imported).toBe(2);
    expect(result.applicationNos).toHaveLength(2);
    // Numbered sequentially within the intake.
    expect(result.applicationNos[0]).toMatch(/-00001$/);
    expect(result.applicationNos[1]).toMatch(/-00002$/);

    const stored = await asSystem((tx) =>
      tx.application.findMany({
        where: { tenantId: u.tenantId },
        select: { applicationNo: true, choices: { select: { rank: true } } },
      }),
    );
    expect(stored).toHaveLength(2);
    // The first row asked for two programmes, in order.
    expect(stored.flatMap((s) => s.choices).length).toBe(3);
  });

  it('skips rows that duplicate an existing applicant', async () => {
    const { uni: u, registrar } = await fresh();
    await commitIntake(registrar, u.batchId, roster(u));

    const again = await commitIntake(registrar, u.batchId, roster(u));
    expect(again.imported).toBe(0);
    expect(again.skipped).toBe(2);
  });

  it('refuses a file in which nothing is importable', async () => {
    const { uni: u, registrar } = await fresh();
    await expect(
      commitIntake(registrar, u.batchId, [{ fullNameEn: 'Nothing Else' }]),
    ).rejects.toThrow(IntakeImportError);
  });
});

// ---------------------------------------------------------------------------
// Onboarding defaults and isolation
// ---------------------------------------------------------------------------

describe('admissions isolation and defaults', () => {
  it('installs certificate types with the scale each is reported on', async () => {
    const certs = await asSystem((tx) =>
      tx.certificateType.findMany({
        where: { tenantId: uni.tenantId },
        select: { code: true, maxScore: true },
        orderBy: { sortOrder: 'asc' },
      }),
    );
    expect(certs.map((c) => c.code)).toEqual(
      STANDARD_CERTIFICATE_TYPES.map((c) => c.code),
    );
    expect(certs.find((c) => c.code === 'IB')?.maxScore.toFixed(0)).toBe('45');
  });

  it('never reads another university capacity or applications', async () => {
    const a = await fresh();
    const b = await fresh();

    await setSeatQuota(a.registrar, {
      programmeId: a.uni.programmeIds.MBBS,
      batchId: a.uni.batchId,
      admissionCategoryId: a.uni.admissionCategories.GENERAL,
      seats: 50,
    });
    await applicant(a.registrar, a.uni, { nationalId: 'ISO-1' });

    expect(await capacityForBatch(b.registrar, b.uni.batchId)).toHaveLength(0);
    expect(await rankedList(b.registrar, b.uni.programmeIds.MBBS, b.uni.batchId)).toHaveLength(
      0,
    );

    // The same national ID in another university is not a duplicate here.
    const theirs = await applicant(b.registrar, b.uni, { nationalId: 'ISO-1' });
    expect(theirs.duplicates).toHaveLength(0);
  });
});
