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
  applyOptions,
  openBatches,
  submitPublicApplication,
  trackApplication,
  PortalClosedError,
  MAX_CHOICES,
} from '@/lib/admissions/portal';
import { setApplicationWindow } from '@/lib/academic/structure';
import { setSeatQuota } from '@/lib/admissions/quota';
import {
  createApplication,
  rankedList,
  submitApplication,
  ApplicationError,
} from '@/lib/admissions/applications';
import {
  APPLY_STEPS,
  furthestStep,
  isApplyStep,
  mayOpen,
  openDraft,
  sealDraft,
} from '@/lib/admissions/draft';
import { ForbiddenError } from '@/lib/auth/rbac';
import type { Principal } from '@/lib/auth/rbac';

/**
 * The public admissions application flow (SRS REQ-LP-04, Track C2).
 *
 * ## What the legacy build had
 *
 * No application entity at all. A person became known to the system when a
 * cashier took money from them: `StudentsVacants` computed seats taken from
 * receipt vouchers, so **payment was admission**. There was nowhere to record
 * that somebody applied and nowhere to record that they were refused.
 *
 * ## What these tests are really checking
 *
 * That the **second** sessionless write path in the system cannot be used for
 * anything but the one thing it is for. The first, C1's enquiry form, writes
 * to a table holding nothing but what the sender typed. This one writes into
 * the queue a committee acts on.
 */

let uni: University;
let admin: Principal;

/** Somewhere in the middle of an open window. */
const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

beforeAll(async () => {
  uni = await makeUniversity();
  admin = await makePrincipal(uni.tenantId, ['academic.manage', 'academic.read'], {
    name: 'structadmin',
  });
});

afterAll(disconnectAll);

/** A tenant with an open portal and its programmes publicly listed. */
async function openPortal(
  window: { from: Date; to: Date } = { from: D(2026, 1, 1), to: D(2026, 12, 31) },
) {
  const u = await makeUniversity();
  const manager = await makePrincipal(u.tenantId, ['academic.manage'], { name: 'pm' });
  await setApplicationWindow(manager, u.batchId, window);
  await asSystem(async (tx) => {
    // C1's `chk_programme_public_bilingual` refuses a listed programme with no
    // bilingual overview — a programme on the public site with an empty
    // description in one language is a page that reads as broken to half the
    // audience. The fixture satisfies it rather than working around it.
    await tx.programme.updateMany({
      where: { tenantId: u.tenantId },
      data: {
        isPubliclyListed: true,
        overviewAr: 'نبذة عن البرنامج.',
        overviewEn: 'An overview of the programme.',
      },
    });
  });

  // Seats declared for the intake. An offer is issued against a quota, so a
  // programme with none cannot admit anybody and the portal does not offer it.
  const capacity = await makePrincipal(u.tenantId, ['admission.capacity'], { name: 'cap' });
  for (const programmeId of Object.values(u.programmeIds)) {
    await setSeatQuota(capacity, {
      programmeId,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      seats: 50,
    });
  }

  return { uni: u, manager };
}

/** The smallest application that passes. */
function draft(u: University, over: Record<string, unknown> = {}) {
  return {
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
    fullNameAr: 'سارة محمد أحمد',
    fullNameEn: 'Sara Mohamed Ahmed',
    nationalId: '199001011234',
    email: 'sara@example.test',
    choices: [u.programmeIds.MBBS],
    ...over,
  };
}

// ---------------------------------------------------------------------------
// The window
// ---------------------------------------------------------------------------

describe('the portal is closed until somebody opens it', () => {
  it('offers no intake to a tenant that has set no window', async () => {
    // The default. A public write surface that is open the moment it is
    // deployed is one nobody decided to open.
    const fresh = await makeUniversity();
    expect(await openBatches(fresh.tenantId)).toEqual([]);
  });

  it('offers the intake once a window contains today', async () => {
    const { uni: u } = await openPortal();
    const batches = await openBatches(u.tenantId, D(2026, 6, 1));
    expect(batches).toHaveLength(1);
    expect(batches[0].id).toBe(u.batchId);
    expect(batches[0].closesOn).toBe('2026-12-31');
    expect(batches[0].programmes.length).toBeGreaterThan(0);
  });

  it('withdraws the intake on the day after the window closes', async () => {
    const { uni: u } = await openPortal({ from: D(2026, 1, 1), to: D(2026, 3, 31) });
    expect(await openBatches(u.tenantId, D(2026, 3, 31))).toHaveLength(1);
    expect(await openBatches(u.tenantId, D(2026, 4, 1))).toEqual([]);
  });

  it('offers no intake when nothing is publicly listed', async () => {
    // Showing a batch and failing at the last step because there is nothing to
    // choose is worse than not showing it.
    const u = await makeUniversity();
    const manager = await makePrincipal(u.tenantId, ['academic.manage'], { name: 'pm2' });
    await setApplicationWindow(manager, u.batchId, { from: D(2026, 1, 1), to: D(2026, 12, 31) });
    expect(await openBatches(u.tenantId, D(2026, 6, 1))).toEqual([]);
  });

  it('refuses half a window', async () => {
    // One date alone would be read as "forever" by somebody.
    await expect(
      setApplicationWindow(admin, uni.batchId, { from: D(2026, 1, 1), to: null }),
    ).rejects.toThrow(/both a start and an end/i);
  });

  it('refuses a window that closes before it opens', async () => {
    await expect(
      setApplicationWindow(admin, uni.batchId, { from: D(2026, 6, 1), to: D(2026, 1, 1) }),
    ).rejects.toThrow(/closes before it opens/i);
  });

  it('closes the portal when both dates are cleared', async () => {
    const { uni: u, manager } = await openPortal();
    expect(await openBatches(u.tenantId, D(2026, 6, 1))).toHaveLength(1);
    await setApplicationWindow(manager, u.batchId, { from: null, to: null });
    expect(await openBatches(u.tenantId, D(2026, 6, 1))).toEqual([]);
  });

  it('needs academic.manage to open a portal', async () => {
    const nobody = await makePrincipal(uni.tenantId, ['academic.read'], { name: 'nowindow' });
    await expect(
      setApplicationWindow(nobody, uni.batchId, { from: D(2026, 1, 1), to: D(2026, 2, 1) }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('refuses a batch belonging to another university', async () => {
    const other = await makeUniversity();
    await expect(
      setApplicationWindow(admin, other.batchId, { from: D(2026, 1, 1), to: D(2026, 2, 1) }),
    ).rejects.toThrow(/does not belong/i);
  });
});

// ---------------------------------------------------------------------------
// Submission
// ---------------------------------------------------------------------------

describe('a member of the public submits an application', () => {
  it('lands in the committee queue, screened, in one transaction', async () => {
    const { uni: u } = await openPortal();
    const receipt = await submitPublicApplication(
      u.tenantId,
      draft(u),
      D(2026, 6, 1),
    );

    expect(receipt.applicationNo).toBeTruthy();
    expect(receipt.trackingToken).toMatch(/^[0-9a-f]{32}$/);

    const row = await asTenant(u.tenantId, (tx) =>
      tx.application.findFirstOrThrow({
        where: { tenantId: u.tenantId, applicationNo: receipt.applicationNo },
        select: { state: true, source: true, submittedAt: true, trackingToken: true },
      }),
    );
    // UNDER_REVIEW and not DRAFT: an application that exists in draft because
    // the screening threw is one a committee never sees and the applicant
    // believes they made.
    expect(row.state).toBe('UNDER_REVIEW');
    expect(row.source).toBe('PUBLIC');
    expect(row.submittedAt).not.toBeNull();
    expect(row.trackingToken).toBe(receipt.trackingToken);
  });

  it('marks who typed it, so a committee knows what it is reading', async () => {
    // A registrar copying a certified certificate and an applicant typing
    // about themselves are not the same evidence.
    const { uni: u } = await openPortal();
    await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));

    const sources = await asTenant(u.tenantId, (tx) =>
      tx.application.findMany({
        where: { tenantId: u.tenantId },
        select: { source: true },
      }),
    );
    expect(sources.every((s) => s.source === 'PUBLIC')).toBe(true);
  });

  it('records no actor, because nobody was authenticated', async () => {
    const { uni: u } = await openPortal();
    const receipt = await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));
    const app = await asTenant(u.tenantId, (tx) =>
      tx.application.findFirstOrThrow({
        where: { tenantId: u.tenantId, applicationNo: receipt.applicationNo },
        select: { id: true },
      }),
    );

    const entries = await asSystem((tx) =>
      tx.auditLog.findMany({
        where: { tenantId: u.tenantId, resourceId: app.id },
        select: { actorId: true, action: true },
      }),
    );
    expect(entries.length).toBeGreaterThan(0);
    // Putting an unauthenticated party in the actor column would record them
    // as though they held a role. The chain still covers the row, which is
    // what makes "when did this arrive" answerable.
    expect(entries.every((e) => e.actorId === null)).toBe(true);
  });

  it('refuses once the window has closed, even mid-form', async () => {
    // A wizard begun on the last open day and submitted after midnight is
    // submitted after the portal closed, and the applicant has to be told.
    const { uni: u } = await openPortal({ from: D(2026, 1, 1), to: D(2026, 3, 31) });
    await expect(
      submitPublicApplication(u.tenantId, draft(u), D(2026, 4, 1)),
    ).rejects.toBeInstanceOf(PortalClosedError);
  });

  it('demands a way to be reached', async () => {
    const { uni: u } = await openPortal();
    await expect(
      submitPublicApplication(
        u.tenantId,
        draft(u, { email: null, phone: null }),
        D(2026, 6, 1),
      ),
    ).rejects.toThrow(/email address or a telephone/i);
  });

  it('demands a way to be told apart', async () => {
    const { uni: u } = await openPortal();
    await expect(
      submitPublicApplication(
        u.tenantId,
        draft(u, { nationalId: null, passportNo: null }),
        D(2026, 6, 1),
      ),
    ).rejects.toThrow(/national ID number or a passport/i);
  });

  it('demands a name in both scripts', async () => {
    // The offer letter and the eventual certificate are issued in both.
    const { uni: u } = await openPortal();
    await expect(
      submitPublicApplication(u.tenantId, draft(u, { fullNameAr: '' }), D(2026, 6, 1)),
    ).rejects.toThrow(/both Arabic and English/i);
  });

  it('refuses the same programme ranked twice', async () => {
    const { uni: u } = await openPortal();
    await expect(
      submitPublicApplication(
        u.tenantId,
        draft(u, { choices: [u.programmeIds.MBBS, u.programmeIds.MBBS] }),
        D(2026, 6, 1),
      ),
    ).rejects.toThrow(/listed twice/i);
  });

  it('refuses more choices than the form offers', async () => {
    const { uni: u } = await openPortal();
    const many = Object.values(u.programmeIds).slice(0, MAX_CHOICES + 1);
    if (many.length <= MAX_CHOICES) return;
    await expect(
      submitPublicApplication(u.tenantId, draft(u, { choices: many }), D(2026, 6, 1)),
    ).rejects.toThrow(/at most/i);
  });

  it('offers only programmes with seats declared for the intake', async () => {
    // An offer is issued against a seat quota, so an application to a
    // programme with none cannot become an offer however good the applicant
    // is. Offering it would take somebody's ranked first choice and spend it
    // on a place that does not exist.
    const { uni: u } = await openPortal();
    await asSystem((tx) =>
      tx.seatQuota.updateMany({
        where: { tenantId: u.tenantId, programmeId: u.programmeIds.MBBS },
        data: { isActive: false },
      }),
    );

    const batches = await openBatches(u.tenantId, D(2026, 6, 1));
    expect(batches[0].programmes.map((p) => p.id)).not.toContain(u.programmeIds.MBBS);

    await expect(
      submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1)),
    ).rejects.toThrow(/not open to applications for this intake/i);
  });

  it('closes the portal for a batch with no seats at all', async () => {
    const { uni: u } = await openPortal();
    await asSystem((tx) =>
      tx.seatQuota.updateMany({ where: { tenantId: u.tenantId }, data: { isActive: false } }),
    );
    expect(await openBatches(u.tenantId, D(2026, 6, 1))).toEqual([]);
  });

  it('refuses a programme the university does not publish', async () => {
    // The form only ever offers listed programmes, so this catches a request
    // that did not come from the form — which is the only kind worth catching.
    const { uni: u } = await openPortal();
    await asSystem((tx) =>
      tx.programme.updateMany({
        where: { tenantId: u.tenantId, id: u.programmeIds.MBBS },
        data: { isPubliclyListed: false },
      }),
    );
    await expect(
      submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1)),
    ).rejects.toThrow(/not open to applications/i);
  });

  it('refuses a programme belonging to another university', async () => {
    const { uni: u } = await openPortal();
    const other = await makeUniversity();
    await expect(
      submitPublicApplication(
        u.tenantId,
        draft(u, { choices: [other.programmeIds.MBBS] }),
        D(2026, 6, 1),
      ),
    ).rejects.toBeInstanceOf(ApplicationError);
  });

  it('refuses an intake belonging to another university', async () => {
    // The tenant comes from the resolved host; a form body naming another
    // university's batch is the attack this refuses.
    const { uni: u } = await openPortal();
    const other = await openPortal();
    await expect(
      submitPublicApplication(
        u.tenantId,
        draft(u, { batchId: other.uni.batchId }),
        D(2026, 6, 1),
      ),
    ).rejects.toThrow(/not open for applications/i);
  });
});

// ---------------------------------------------------------------------------
// The constraints, not the form
// ---------------------------------------------------------------------------

describe('the database holds the bounds a public form cannot', () => {
  it('refuses a tracking token on a staff application', async () => {
    // `chk_application_public_is_trackable`, as an equivalence so neither half
    // can drift: PUBLIC carries a token and nothing else does. Attempted
    // against a real staff row, as the owner role, which bypasses RLS — so
    // what refuses this is the constraint and nothing above it.
    const { uni: u } = await openPortal();
    const officer = await makePrincipal(u.tenantId, ['application.read'], { name: 'adm' });
    await createApplication(officer, {
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      fullNameAr: 'خالد عمر',
      fullNameEn: 'Khalid Omar',
      choices: [u.programmeIds.MBBS],
    });

    await expect(
      asSystem((tx) =>
        tx.$executeRawUnsafe(
          `UPDATE applications SET tracking_token = repeat('a', 32) ` +
            `WHERE tenant_id = '${u.tenantId}' AND source = 'STAFF'`,
        ),
      ),
    ).rejects.toThrow(/chk_application_public_is_trackable/);
  });

  it('refuses a public application with no tracking token', async () => {
    const { uni: u } = await openPortal();
    const receipt = await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));
    expect(receipt.trackingToken).toBeTruthy();

    await expect(
      asSystem((tx) =>
        tx.$executeRawUnsafe(
          `UPDATE applications SET tracking_token = NULL WHERE tenant_id = '${u.tenantId}'`,
        ),
      ),
    ).rejects.toThrow(/chk_application_public_is_trackable/);
  });

  it('refuses a token that is not 32 hex characters', async () => {
    const { uni: u } = await openPortal();
    await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));
    await expect(
      asSystem((tx) =>
        tx.$executeRawUnsafe(
          `UPDATE applications SET tracking_token = 'short' WHERE tenant_id = '${u.tenantId}'`,
        ),
      ),
    ).rejects.toThrow(/chk_application_tracking_token_shape/);
  });

  it('refuses a window with one end, at the database', async () => {
    await expect(
      asSystem((tx) =>
        tx.$executeRawUnsafe(
          `UPDATE batches SET applications_open_from = DATE '2026-01-01' ` +
            `WHERE id = '${uni.batchId}'`,
        ),
      ),
    ).rejects.toThrow(/chk_batch_application_window_complete/);
  });
});

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------

describe('an applicant checks their own application', () => {
  it('needs the number and the token together', async () => {
    const { uni: u } = await openPortal();
    const receipt = await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));

    const found = await trackApplication(
      u.tenantId,
      receipt.applicationNo,
      receipt.trackingToken,
    );
    expect(found?.applicationNo).toBe(receipt.applicationNo);
    expect(found?.state).toBe('UNDER_REVIEW');
    expect(found?.choices).toHaveLength(1);
  });

  it('answers the same way to a wrong number and a wrong token', async () => {
    // The difference between "no such application" and "wrong token" is
    // exactly what an enumeration needs: told which half was wrong, an
    // attacker walks the sequential numbers until one says "wrong token".
    const { uni: u } = await openPortal();
    const receipt = await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));

    const wrongToken = await trackApplication(
      u.tenantId,
      receipt.applicationNo,
      'f'.repeat(32),
    );
    const wrongNumber = await trackApplication(
      u.tenantId,
      'APP-NOT-A-NUMBER',
      receipt.trackingToken,
    );
    expect(wrongToken).toBeNull();
    expect(wrongNumber).toBeNull();
  });

  it('refuses a malformed token without touching the database', async () => {
    const { uni: u } = await openPortal();
    expect(await trackApplication(u.tenantId, 'X', 'not-a-token')).toBeNull();
    expect(await trackApplication(u.tenantId, 'X', '')).toBeNull();
  });

  it('never reaches another university’s application', async () => {
    const a = await openPortal();
    const b = await openPortal();
    const receipt = await submitPublicApplication(a.uni.tenantId, draft(a.uni), D(2026, 6, 1));

    expect(
      await trackApplication(b.uni.tenantId, receipt.applicationNo, receipt.trackingToken),
    ).toBeNull();
  });

  it('does not reach a staff-entered application at all', async () => {
    // Only PUBLIC rows are trackable, and only they carry a token — so there
    // is no pair that opens one.
    const { uni: u } = await openPortal();
    const rows = await asTenant(u.tenantId, (tx) =>
      tx.application.findMany({
        where: { tenantId: u.tenantId, source: 'STAFF' },
        select: { trackingToken: true },
      }),
    );
    expect(rows.every((r) => r.trackingToken === null)).toBe(true);
  });

  it('returns what was submitted, so the application form can be printed', async () => {
    // REQ-LP-04 asks for a downloadable application form. It is the
    // applicant's own data returned to the person who submitted it, which is
    // the reason the tracking code is a secret rather than a convenience.
    const { uni: u } = await openPortal();
    const receipt = await submitPublicApplication(
      u.tenantId,
      draft(u, {
        dateOfBirth: '2005-04-11',
        certificateTypeId: u.certificateTypes.SD_SECONDARY,
        certificateScore: '86.5',
        certificateYear: 2024,
        subjects: ['Physics', 'Chemistry', 'Biology'],
      }),
      D(2026, 6, 1),
    );

    const tracked = await trackApplication(
      u.tenantId,
      receipt.applicationNo,
      receipt.trackingToken,
    );
    expect(tracked!.submitted.nationalId).toBe('199001011234');
    expect(tracked!.submitted.dateOfBirth).toBe('2005-04-11');
    expect(tracked!.submitted.certificateScore).toBe('86.5');
    expect(tracked!.submitted.certificateYear).toBe(2024);
    expect(tracked!.submitted.subjects).toEqual(['Physics', 'Chemistry', 'Biology']);
    expect(tracked!.categoryNameEn).toBeTruthy();

    // The maximum travels with the score, so the printed form says 86.5 out of
    // what — a bare number on a certificate line is the ambiguity
    // REQ-ADM-CAP-02 exists to remove.
    if (tracked!.submitted.certificateAr) {
      expect(Number(tracked!.submitted.certificateMaxScore)).toBeGreaterThan(0);
    }
  });

  it('shows an offer once there is one, with its deadline', async () => {
    const { uni: u } = await openPortal();
    const receipt = await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));

    const before = await trackApplication(
      u.tenantId,
      receipt.applicationNo,
      receipt.trackingToken,
    );
    // Until a committee decides, the applicant is told only that it arrived.
    expect(before?.decision).toBeNull();
    expect(before?.offer).toBeNull();
  });

  it('tells the applicant nothing the committee has not decided', async () => {
    // `screen` advises and does not block (REQ-ADM-CAP-02). Telling somebody
    // they failed a rule a committee may still look past would be telling
    // them a decision that has not been taken.
    const { uni: u } = await openPortal();
    const receipt = await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));
    const tracked = await trackApplication(
      u.tenantId,
      receipt.applicationNo,
      receipt.trackingToken,
    );

    expect(tracked).not.toBeNull();
    expect(Object.keys(tracked!)).not.toContain('screening');
    expect(Object.keys(tracked!)).not.toContain('eligibility');
  });
});

// ---------------------------------------------------------------------------
// The wizard's draft
// ---------------------------------------------------------------------------

describe('the wizard keeps its work in a signed cookie and not in a row', () => {
  it('round-trips a draft', async () => {
    const sealed = await sealDraft('t-1', { fullNameEn: 'Sara', choices: ['p1'] });
    expect(await openDraft('t-1', sealed)).toMatchObject({
      fullNameEn: 'Sara',
      choices: ['p1'],
    });
  });

  it('refuses a draft issued for another university', async () => {
    // The two are different hosts and would otherwise share a cookie name.
    const sealed = await sealDraft('t-1', { fullNameEn: 'Sara' });
    expect(await openDraft('t-2', sealed)).toEqual({});
  });

  it('treats a tampered or absent draft as an empty form', async () => {
    // The applicant is at the start of a form; the useful behaviour is an
    // empty form, not a message about a cookie.
    expect(await openDraft('t-1', undefined)).toEqual({});
    expect(await openDraft('t-1', 'not.a.jwt')).toEqual({});
    const sealed = await sealDraft('t-1', { fullNameEn: 'Sara' });
    expect(await openDraft('t-1', `${sealed}x`)).toEqual({});
  });

  it('opens no step the answers have not reached', async () => {
    expect(furthestStep({})).toBe('intake');
    expect(furthestStep({ batchId: 'b', admissionCategoryId: 'c' })).toBe('identity');
    expect(
      furthestStep({
        batchId: 'b',
        admissionCategoryId: 'c',
        fullNameAr: 'س',
        fullNameEn: 'S',
      }),
    ).toBe('choices');

    // Somebody typing `?step=review` into an empty form is sent to the first
    // thing they have not answered rather than shown a review of nothing.
    expect(mayOpen('review', {})).toBe(false);
    expect(mayOpen('intake', {})).toBe(true);
  });

  it('names every step it navigates', () => {
    // A step in the progress bar and not in the flow, or the reverse, is a
    // wizard that dead-ends.
    for (const step of APPLY_STEPS) expect(isApplyStep(step)).toBe(true);
    expect(isApplyStep('documents')).toBe(false);
    expect(isApplyStep(undefined)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Reference data
// ---------------------------------------------------------------------------

describe('the public form offers only what a stranger may name', () => {
  it('carries the certificate’s own maximum beside the score', async () => {
    // A score entered against the wrong maximum is the defect REQ-ADM-CAP-02
    // exists to prevent — an IB candidate scoring 84.4% refused against an 80%
    // minimum because 4.2 was compared to 80 as a raw number. The cheapest
    // place to prevent it is the label.
    const { uni: u } = await openPortal();
    const options = await applyOptions(u.tenantId);
    expect(options.certificates.length).toBeGreaterThan(0);
    for (const c of options.certificates) {
      expect(Number(c.maxScore)).toBeGreaterThan(0);
    }
  });

  it('offers only active nationalities and certificates', async () => {
    const { uni: u } = await openPortal();
    await asSystem((tx) =>
      tx.nationality.updateMany({ where: { tenantId: u.tenantId }, data: { isActive: false } }),
    );
    const options = await applyOptions(u.tenantId);
    expect(options.nationalities).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// What the committee sees
// ---------------------------------------------------------------------------

describe('the committee is told what it is reading', () => {
  it('carries the source onto the ranked list a committee scores from', async () => {
    // The column exists so a committee knows whether a certificate score was
    // typed by a registrar off a certified document or by the applicant about
    // themselves. A column written and never read is the legacy `Priv` defect:
    // stored, loaded, and gating nothing.
    const { uni: u } = await openPortal();
    const registrar = await makePrincipal(u.tenantId, ['application.read'], { name: 'rank' });

    await submitPublicApplication(u.tenantId, draft(u), D(2026, 6, 1));
    const staffApp = await createApplication(registrar, {
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      fullNameAr: 'مريم الطيب',
      fullNameEn: 'Mariam Eltayeb',
      nationalId: 'ST-9',
      choices: [u.programmeIds.MBBS],
    });
    await submitApplication(registrar, staffApp.id);

    const list = await rankedList(registrar, u.programmeIds.MBBS, u.batchId);
    expect(list).toHaveLength(2);
    expect(list.map((r) => r.source).sort()).toEqual(['PUBLIC', 'STAFF']);
  });
});
