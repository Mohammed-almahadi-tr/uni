import { afterAll, describe, expect, it } from 'vitest';
import {
  asPortal,
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import { approveFeeSchedule, draftFeeSchedule } from '@/lib/academic/fee-matrix';
import { createStudent } from '@/lib/students/registry';
import { registerStudent } from '@/lib/registration/engine';
import { registrationCard } from '@/lib/registration/card';
import { assignTill, takeReceipt } from '@/lib/cashier/receipt';
import { createInstalmentPlan } from '@/lib/billing/instalments';
import { placeHold } from '@/lib/students/holds';
import { statementOfAccount, studentBalance } from '@/lib/students/account';
import { documentChecklist } from '@/lib/students/documents';
import {
  acceptInvitation,
  invitePortalAccount,
  listPortalAccess,
  changePortalPassword,
  portalLogin,
  previewInvitation,
  PortalAccountError,
  revokeInvitation,
  revokePortalAccess,
} from '@/lib/portal/account';
import {
  loadPortalPrincipal,
  readAsStudent,
  selectStudent,
  PortalAccessError,
  type PortalPrincipal,
} from '@/lib/portal/guard';
import {
  portalCard,
  portalCharges,
  portalDocuments,
  portalOverview,
  portalSchedule,
  portalStatement,
} from '@/lib/portal/views';
import { createSessionToken } from '@/lib/auth/session';
import { createPortalToken, verifyPortalToken } from '@/lib/portal/session';
import { verifySessionToken } from '@/lib/auth/session';
import { ForbiddenError } from '@/lib/auth/rbac';
import { WeakPasswordError } from '@/lib/auth/password';
import type { Principal } from '@/lib/auth/rbac';

/**
 * The student and guardian portal (SRS REQ-LP-05, Track C3).
 *
 * ## What the legacy build had
 *
 * No student identity of any kind. A student's balance was a `Remain` column
 * on the registration row, written by whichever screen last touched it, and
 * the only way to read it was to stand in front of somebody with the
 * application open. `frmLogin.vb` — the one login in the system — selected a
 * cleartext password out of `Users` and compared it in application code; its
 * `Priv` column had two values and gated nothing.
 *
 * So there was nothing to authenticate a student *as*, and no record anywhere
 * of who was entitled to see a particular student's money. C3 adds both, and
 * the second is the harder one: a guardian is the first party in this system
 * allowed to read a record that is neither theirs nor the institution's.
 *
 * ## What these tests are really checking
 *
 * That the answer to *what stops a portal request reading a student who is
 * not theirs* is *the database*, not the diligence of whoever writes the next
 * page. Every query a portal page makes runs inside `withPortal`, and the
 * restrictive policies this phase adds confine it to one student or refuse it
 * the table. A forgotten `where` returns no rows rather than another family's
 * child.
 */

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

/** A password that satisfies the policy, used wherever the password is not
 *  what a test is about. */
const PASS = 'Khartoum2026Portal';

interface Scene {
  u: University;
  registry: Principal;
  cashier: Principal;
  registrar: Principal;
  /** The student the portal account is attached to. */
  studentId: string;
  studentNo: string;
  /** A second student at the same university, whose rows must stay invisible. */
  otherId: string;
  registrationId: string;
  chargeIds: string[];
  receiptId: string;
}

let counter = 0;

/**
 * A university with two admitted students, one of whom has a term registered,
 * a receipt against it, an instalment plan and a hold.
 *
 * The second student exists for one reason: almost every claim in this file
 * is of the form "and not that one".
 */
async function scene(): Promise<Scene> {
  counter += 1;
  const u = await makeUniversity();

  const setter = await makePrincipal(u.tenantId, ['feematrix.manage', 'feematrix.read'], {
    name: `set${counter}`,
  });
  const feeApprover = await makePrincipal(u.tenantId, ['feematrix.approve'], {
    name: `fa${counter}`,
  });
  const draft = await draftFeeSchedule(setter, {
    programmeId: u.programmeIds.MBBS,
    batchId: u.batchId,
    admissionCategoryId: u.admissionCategories.GENERAL,
    currency: 'SDG',
    effectiveFrom: D(2026, 1, 1),
    lines: [
      { feeItemId: u.feeItems.TUITION, amount: '1200000.00', sortOrder: 1 },
      {
        feeItemId: u.feeItems.REGISTRATION,
        amount: '50000.00',
        recurrence: 'ONE_OFF',
        sortOrder: 2,
      },
    ],
  });
  await approveFeeSchedule(feeApprover, draft.id);

  const registry = await makePrincipal(
    u.tenantId,
    ['student.manage', 'student.read', 'charge.create', 'hold.manage', 'registration.read'],
    { name: `reg${counter}` },
  );

  const admit = async (no: string, nameEn: string, nameAr: string) =>
    createStudent(registry, {
      studentNo: no,
      fullNameAr: nameAr,
      fullNameEn: nameEn,
      status: 'ADMITTED',
      programmeId: u.programmeIds.MBBS,
      batchId: u.batchId,
      admissionCategoryId: u.admissionCategories.GENERAL,
      nationalityId: u.nationalities.SD,
    });

  const student = await admit(`P-${counter}-0001`, 'Portal Student', 'طالب البوابة');
  const other = await admit(`P-${counter}-0002`, 'Other Student', 'طالب آخر');

  const registrar = await makePrincipal(
    u.tenantId,
    ['registration.create', 'registration.read'],
    { name: `rgr${counter}` },
  );
  const registration = await registerStudent(registrar, {
    studentId: student.id,
    academicTermId: u.termIds[1],
    levelYear: 1,
    registrationDate: D(2026, 1, 15),
  });

  // The other student registers too, so "invisible" is a claim about rows
  // that exist rather than about an empty table.
  await registerStudent(registrar, {
    studentId: other.id,
    academicTermId: u.termIds[1],
    levelYear: 1,
    registrationDate: D(2026, 1, 15),
  });

  const cashier = await makePrincipal(u.tenantId, ['receipt.create', 'student.read'], {
    name: `csh${counter}`,
  });
  const tillAdmin = await makePrincipal(u.tenantId, ['coa.manage'], { name: `till${counter}` });
  await assignTill(tillAdmin, cashier.userId, u.accounts['11111']);

  const charges = await asSystem((tx) =>
    tx.studentCharge.findMany({
      where: { tenantId: u.tenantId, studentId: student.id },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    }),
  );

  const receipt = await takeReceipt(
    cashier,
    {
      studentId: student.id,
      docDate: D(2026, 1, 20),
      channel: 'CASH',
      amount: '50000.00',
      allocations: [{ chargeId: charges[charges.length - 1].id, amount: '50000.00' }],
    },
    `portal-rcpt-${counter}`,
  );

  await createInstalmentPlan(registry, {
    studentId: student.id,
    termLabel: '2026-T1',
    totalAmount: '1200000.00',
    dueDates: [D(2026, 2, 1), D(2026, 4, 1)],
  });

  await placeHold(registry, {
    studentId: student.id,
    holdType: 'DOCUMENTARY',
    reason: 'Certified secondary certificate not on file',
    effectiveFrom: D(2026, 1, 1),
  });

  return {
    u,
    registry,
    cashier,
    registrar,
    studentId: student.id,
    studentNo: student.studentNo,
    otherId: other.id,
    registrationId: registration.registrationId,
    chargeIds: charges.map((c) => c.id),
    receiptId: receipt.receiptId,
  };
}

/** Invite, accept, and hand back a live principal. */
async function grant(
  s: Scene,
  opts: {
    email?: string;
    role?: 'STUDENT' | 'GUARDIAN';
    relationship?: string | null;
    studentId?: string;
    password?: string;
  } = {},
): Promise<{ principal: PortalPrincipal; email: string; accountId: string }> {
  counter += 1;
  const email = opts.email ?? `portal${counter}@example.test`;
  const invitation = await invitePortalAccount(s.registry, {
    studentId: opts.studentId ?? s.studentId,
    role: opts.role ?? 'STUDENT',
    email,
    fullName: opts.role === 'GUARDIAN' ? 'A Guardian' : 'Portal Student',
    relationship:
      opts.relationship ?? (opts.role === 'GUARDIAN' ? 'Mother' : null),
  });
  const accepted = await acceptInvitation(
    s.u.tenantId,
    invitation.code,
    opts.password ?? PASS,
  );

  const version = await asSystem((tx) =>
    tx.portalAccount
      .findUniqueOrThrow({
        where: { id: accepted.accountId },
        select: { sessionVersion: true },
      })
      .then((a) => a.sessionVersion),
  );
  const principal = await loadPortalPrincipal(s.u.tenantId, accepted.accountId, version);
  if (!principal) throw new Error('fixture: the account did not load');
  return { principal, email, accountId: accepted.accountId };
}

afterAll(disconnectAll);

// ---------------------------------------------------------------------------
// The confinement — the claim the rest of the phase rests on
// ---------------------------------------------------------------------------

describe('a portal transaction can see one student and nothing else', () => {
  it('returns only that student, even for a query with no filter at all', async () => {
    const s = await scene();

    const [all, mine] = await Promise.all([
      asTenant(s.u.tenantId, (tx) => tx.student.findMany({ select: { id: true } })),
      asPortal(s.u.tenantId, s.studentId, (tx) =>
        tx.student.findMany({ select: { id: true } }),
      ),
    ]);

    // The staff transaction sees both students. The portal one, running the
    // identical query with no `where`, sees one.
    expect(all.length).toBeGreaterThanOrEqual(2);
    expect(mine.map((r) => r.id)).toEqual([s.studentId]);
  });

  it('hides the other student’s charges, receipts and registrations', async () => {
    const s = await scene();

    const seen = await asPortal(s.u.tenantId, s.studentId, async (tx) => ({
      charges: await tx.studentCharge.findMany({ select: { studentId: true } }),
      receipts: await tx.studentReceipt.findMany({ select: { studentId: true } }),
      registrations: await tx.semesterRegistration.findMany({
        select: { studentId: true },
      }),
      holds: await tx.hold.findMany({ select: { studentId: true } }),
      plans: await tx.instalmentPlan.findMany({ select: { studentId: true } }),
    }));

    for (const rows of Object.values(seen)) {
      expect(rows.length).toBeGreaterThan(0);
      expect(new Set(rows.map((r) => r.studentId))).toEqual(new Set([s.studentId]));
    }
  });

  it('hides a child row whose parent belongs to somebody else', async () => {
    const s = await scene();

    // Registration lines carry no student of their own; the registration they
    // hang off does, and the policy reaches through it.
    const lines = await asPortal(s.u.tenantId, s.studentId, (tx) =>
      tx.registrationLine.findMany({ select: { registrationId: true } }),
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(new Set(lines.map((l) => l.registrationId))).toEqual(
      new Set([s.registrationId]),
    );
  });

  it('refuses the medical record outright rather than filtering it', async () => {
    const s = await scene();
    const rows = await asPortal(s.u.tenantId, s.studentId, (tx) =>
      tx.medicalRecord.findMany({ select: { id: true } }),
    );
    expect(rows).toEqual([]);
  });

  it('refuses the credential tables it authenticated with', async () => {
    const s = await scene();
    await grant(s);

    const seen = await asPortal(s.u.tenantId, s.studentId, async (tx) => ({
      accounts: await tx.portalAccount.count(),
      access: await tx.portalAccess.count(),
      invitations: await tx.portalInvitation.count(),
      users: await tx.user.count(),
      audit: await tx.auditLog.count(),
    }));

    expect(seen).toEqual({ accounts: 0, access: 0, invitations: 0, users: 0, audit: 0 });
  });

  it('shows the vouchers behind its own documents and no others', async () => {
    const s = await scene();

    const mine = await asPortal(s.u.tenantId, s.studentId, (tx) =>
      tx.transactionHeader.findMany({ select: { id: true } }),
    );
    const all = await asSystem((tx) =>
      tx.transactionHeader.findMany({
        where: { tenantId: s.u.tenantId },
        select: { id: true },
      }),
    );
    const ownIds = await asSystem(async (tx) => {
      const charges = await tx.studentCharge.findMany({
        where: { tenantId: s.u.tenantId, studentId: s.studentId },
        select: { postedHeaderId: true },
      });
      const receipts = await tx.studentReceipt.findMany({
        where: { tenantId: s.u.tenantId, studentId: s.studentId },
        select: { postedHeaderId: true },
      });
      return new Set([
        ...charges.map((c) => c.postedHeaderId),
        ...receipts.map((r) => r.postedHeaderId),
      ]);
    });

    // Not empty — the statement needs these to name the reversal and the
    // dishonour. Not everything — the other student's postings are in the
    // same table.
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.length).toBeLessThan(all.length);
    expect(mine.every((h) => ownIds.has(h.id))).toBe(true);
  });

  it('refuses the ledger postings even for its own vouchers', async () => {
    const s = await scene();
    const lines = await asPortal(s.u.tenantId, s.studentId, (tx) =>
      tx.transactionLine.findMany({ select: { id: true } }),
    );
    expect(lines).toEqual([]);
  });

  it('cannot write anything at all', async () => {
    const s = await scene();

    await expect(
      asPortal(s.u.tenantId, s.studentId, (tx) =>
        tx.student.update({
          where: { id: s.studentId },
          data: { fullNameEn: 'Renamed By The Portal' },
        }),
      ),
    ).rejects.toThrow();

    const name = await asSystem((tx) =>
      tx.student
        .findUniqueOrThrow({ where: { id: s.studentId }, select: { fullNameEn: true } })
        .then((r) => r.fullNameEn),
    );
    expect(name).toBe('Portal Student');
  });

  /**
   * The structural claim, and the reason the deny list is generated rather
   * than typed. A table added by a later migration inherits nothing; this
   * fails until somebody decides which of the two it is.
   */
  it('every table with row-level security has decided about the portal', async () => {
    const rows = await asSystem<Array<{ relname: string }>>(
      (tx) => tx.$queryRawUnsafe(`
        SELECT c.relname
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public'
           AND c.relkind = 'r'
           AND c.relrowsecurity
           AND NOT EXISTS (
             SELECT 1 FROM pg_policy p
              WHERE p.polrelid = c.oid
                AND p.polname IN ('portal_scope', 'portal_denied')
           )
         ORDER BY 1
      `),
    );
    expect(rows.map((r) => r.relname)).toEqual([]);
  });

  it('leaves every other kind of transaction untouched', async () => {
    const s = await scene();
    // The GUC is unset outside `withPortal`, so each restrictive predicate is
    // `NULL IS NULL` and staff see what they always saw.
    const all = await asTenant(s.u.tenantId, (tx) => tx.student.count());
    expect(all).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Access is a relationship, not a permission
// ---------------------------------------------------------------------------

describe('what an account may read is decided by who it is related to', () => {
  it('refuses a student the account is not linked to', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    await expect(
      readAsStudent(principal, s.otherId, (tx) => tx.student.count()),
    ).rejects.toBeInstanceOf(PortalAccessError);

    expect(() => selectStudent(principal, s.otherId)).toThrow(PortalAccessError);
  });

  it('falls back to the only student when none is named', async () => {
    const s = await scene();
    const { principal } = await grant(s);
    expect(selectStudent(principal).studentId).toBe(s.studentId);
  });

  it('lets a guardian hold two children and keeps each page to one', async () => {
    const s = await scene();
    const email = `parent${(counter += 1)}@example.test`;

    await grant(s, { email, role: 'GUARDIAN', relationship: 'Mother' });
    // The second child is added to the *same* account, by its password.
    const second = await invitePortalAccount(s.registry, {
      studentId: s.otherId,
      role: 'GUARDIAN',
      email,
      fullName: 'A Guardian',
      relationship: 'Mother',
    });
    const accepted = await acceptInvitation(s.u.tenantId, second.code, PASS);

    const accounts = await asSystem((tx) =>
      tx.portalAccount.count({ where: { tenantId: s.u.tenantId, email } }),
    );
    expect(accounts).toBe(1);

    const version = await asSystem((tx) =>
      tx.portalAccount
        .findUniqueOrThrow({
          where: { id: accepted.accountId },
          select: { sessionVersion: true },
        })
        .then((a) => a.sessionVersion),
    );
    const principal = await loadPortalPrincipal(
      s.u.tenantId,
      accepted.accountId,
      version,
    );
    expect(principal?.students.map((x) => x.studentId).sort()).toEqual(
      [s.studentId, s.otherId].sort(),
    );

    // Two children on the account; one student per transaction.
    const seen = await readAsStudent(principal!, s.otherId, (tx) =>
      tx.student.findMany({ select: { id: true } }),
    );
    expect(seen.map((r) => r.id)).toEqual([s.otherId]);
  });

  /**
   * Written as the owner, which bypasses RLS — because that is the only way
   * this row could ever come into existence, and it is the worst row this
   * schema could hold.
   */
  it('refuses a grant that crosses a tenant, even written as the owner', async () => {
    const a = await scene();
    const b = await scene();
    const { accountId } = await grant(a);

    await expect(
      asSystem((tx) =>
        tx.portalAccess.create({
          data: { tenantId: a.u.tenantId, accountId, studentId: b.studentId },
        }),
      ),
    ).rejects.toThrow(/cross tenants/i);
  });

  it('refuses a second live grant on a student’s own account', async () => {
    const s = await scene();
    const { accountId } = await grant(s, { role: 'STUDENT' });

    await expect(
      asSystem((tx) =>
        tx.portalAccess.create({
          data: { tenantId: s.u.tenantId, accountId, studentId: s.otherId },
        }),
      ),
    ).rejects.toThrow(/one student/i);
  });

  it('refuses two live grants for the same pair', async () => {
    const s = await scene();
    const { accountId } = await grant(s, { role: 'GUARDIAN', relationship: 'Father' });

    await expect(
      asSystem((tx) =>
        tx.portalAccess.create({
          data: { tenantId: s.u.tenantId, accountId, studentId: s.studentId },
        }),
      ),
    ).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// How an account comes to exist
// ---------------------------------------------------------------------------

describe('invitations', () => {
  it('demands student.manage, the same authority as editing the record', async () => {
    const s = await scene();
    const reader = await makePrincipal(s.u.tenantId, ['student.read'], {
      name: `ro${(counter += 1)}`,
    });

    await expect(
      invitePortalAccount(reader, {
        studentId: s.studentId,
        role: 'STUDENT',
        email: 'nope@example.test',
        fullName: 'Nobody',
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('makes a guardian say how they are related, and a student not', async () => {
    const s = await scene();

    await expect(
      invitePortalAccount(s.registry, {
        studentId: s.studentId,
        role: 'GUARDIAN',
        email: 'g1@example.test',
        fullName: 'A Guardian',
      }),
    ).rejects.toBeInstanceOf(PortalAccountError);

    await expect(
      invitePortalAccount(s.registry, {
        studentId: s.studentId,
        role: 'STUDENT',
        email: 'g2@example.test',
        fullName: 'The Student',
        relationship: 'Self',
      }),
    ).rejects.toBeInstanceOf(PortalAccountError);
  });

  it('stores the code hashed, never as it was handed over', async () => {
    const s = await scene();
    const invitation = await invitePortalAccount(s.registry, {
      studentId: s.studentId,
      role: 'STUDENT',
      email: `hash${(counter += 1)}@example.test`,
      fullName: 'Portal Student',
    });

    const row = await asSystem((tx) =>
      tx.portalInvitation.findUniqueOrThrow({
        where: { id: invitation.invitationId },
        select: { tokenHash: true },
      }),
    );
    expect(row.tokenHash).not.toBe(invitation.code);
    expect(row.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(invitation.code).toMatch(/^[0-9a-f]{32}$/);
  });

  it('keeps the code out of the audit entry that records the grant', async () => {
    const s = await scene();
    const invitation = await invitePortalAccount(s.registry, {
      studentId: s.studentId,
      role: 'STUDENT',
      email: `aud${(counter += 1)}@example.test`,
      fullName: 'Portal Student',
    });

    const entry = await asSystem((tx) =>
      tx.auditLog.findFirstOrThrow({
        where: {
          tenantId: s.u.tenantId,
          resourceType: 'portal_invitation',
          resourceId: invitation.invitationId,
        },
        select: { afterJson: true, actorId: true },
      }),
    );
    expect(JSON.stringify(entry.afterJson)).not.toContain(invitation.code);
    // A member of staff granted this, and the chain says which one.
    expect(entry.actorId).toBe(s.registry.userId);
  });

  it('creates the account and its access in one go', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    expect(principal.students).toHaveLength(1);
    expect(principal.students[0].studentNo).toBe(s.studentNo);
    expect(principal.role).toBe('STUDENT');
  });

  it('records the acceptance with no actor, because there is none', async () => {
    const s = await scene();
    const { accountId } = await grant(s);

    const entry = await asSystem((tx) =>
      tx.auditLog.findFirstOrThrow({
        where: {
          tenantId: s.u.tenantId,
          resourceType: 'portal_access',
          resourceId: accountId,
        },
        select: { actorId: true },
      }),
    );
    // The invited person is not a `User`. Recording them in the actor column
    // would put a party with no role where "a member of staff did this" goes.
    expect(entry.actorId).toBeNull();
  });

  it('refuses the code a second time', async () => {
    const s = await scene();
    const invitation = await invitePortalAccount(s.registry, {
      studentId: s.studentId,
      role: 'STUDENT',
      email: `once${(counter += 1)}@example.test`,
      fullName: 'Portal Student',
    });
    await acceptInvitation(s.u.tenantId, invitation.code, PASS);

    await expect(
      acceptInvitation(s.u.tenantId, invitation.code, PASS),
    ).rejects.toBeInstanceOf(PortalAccountError);
  });

  it('refuses an expired code, and previews it as though it did not exist', async () => {
    const s = await scene();
    const invitation = await invitePortalAccount(s.registry, {
      studentId: s.studentId,
      role: 'STUDENT',
      email: `exp${(counter += 1)}@example.test`,
      fullName: 'Portal Student',
    });
    await asSystem((tx) =>
      tx.portalInvitation.update({
        where: { id: invitation.invitationId },
        data: { expiresAt: D(2026, 1, 2), issuedAt: D(2026, 1, 1) },
      }),
    );

    expect(await previewInvitation(s.u.tenantId, invitation.code)).toBeNull();
    await expect(
      acceptInvitation(s.u.tenantId, invitation.code, PASS),
    ).rejects.toBeInstanceOf(PortalAccountError);
  });

  it('refuses a withdrawn code', async () => {
    const s = await scene();
    const invitation = await invitePortalAccount(s.registry, {
      studentId: s.studentId,
      role: 'STUDENT',
      email: `rev${(counter += 1)}@example.test`,
      fullName: 'Portal Student',
    });
    await revokeInvitation(s.registry, invitation.invitationId);

    expect(await previewInvitation(s.u.tenantId, invitation.code)).toBeNull();
    await expect(
      acceptInvitation(s.u.tenantId, invitation.code, PASS),
    ).rejects.toBeInstanceOf(PortalAccountError);
  });

  it('answers a wrong code and an unknown one the same way', async () => {
    const s = await scene();
    expect(await previewInvitation(s.u.tenantId, 'f'.repeat(32))).toBeNull();
    expect(await previewInvitation(s.u.tenantId, 'not-a-code')).toBeNull();
  });

  it('refuses to invite an address that can already see the student', async () => {
    const s = await scene();
    const { email } = await grant(s, { role: 'GUARDIAN', relationship: 'Father' });

    await expect(
      invitePortalAccount(s.registry, {
        studentId: s.studentId,
        role: 'GUARDIAN',
        email,
        fullName: 'A Guardian',
        relationship: 'Father',
      }),
    ).rejects.toBeInstanceOf(PortalAccountError);
  });

  it('will not let a stolen invitation take over an existing account', async () => {
    const s = await scene();
    const { email } = await grant(s, { role: 'GUARDIAN', relationship: 'Mother' });

    const second = await invitePortalAccount(s.registry, {
      studentId: s.otherId,
      role: 'GUARDIAN',
      email,
      fullName: 'A Guardian',
      relationship: 'Mother',
    });

    await expect(
      acceptInvitation(s.u.tenantId, second.code, 'TheWrongPassword9'),
    ).rejects.toBeInstanceOf(PortalAccountError);

    // And the grant was not made on the strength of holding the code alone.
    const live = await asSystem((tx) =>
      tx.portalAccess.count({
        where: { tenantId: s.u.tenantId, studentId: s.otherId, revokedAt: null },
      }),
    );
    expect(live).toBe(0);
  });

  it('applies the password policy to a new account and not to linking one', async () => {
    const s = await scene();

    const weak = await invitePortalAccount(s.registry, {
      studentId: s.studentId,
      role: 'GUARDIAN',
      email: `weak${(counter += 1)}@example.test`,
      fullName: 'A Guardian',
      relationship: 'Uncle',
    });
    await expect(
      acceptInvitation(s.u.tenantId, weak.code, 'short'),
    ).rejects.toBeInstanceOf(WeakPasswordError);

    // An account that already exists is being *proved*, not set — so a
    // password that predates a tightening of the policy still links.
    const { email, accountId } = await grant(s, {
      role: 'GUARDIAN',
      relationship: 'Aunt',
    });
    await asSystem((tx) =>
      tx.portalAccount.update({
        where: { id: accountId },
        data: { fullName: 'A Guardian' },
      }),
    );
    const link = await invitePortalAccount(s.registry, {
      studentId: s.otherId,
      role: 'GUARDIAN',
      email,
      fullName: 'A Guardian',
      relationship: 'Aunt',
    });
    const accepted = await acceptInvitation(s.u.tenantId, link.code, PASS);
    expect(accepted.accountId).toBe(accountId);
  });
});

// ---------------------------------------------------------------------------
// Signing in
// ---------------------------------------------------------------------------

describe('signing in', () => {
  it('does not distinguish a wrong password from an unknown address', async () => {
    const s = await scene();
    const { email } = await grant(s);

    expect(await portalLogin(s.u.tenantId, email, 'WrongPassword12')).toEqual({
      ok: false,
      reason: 'invalid',
    });
    expect(
      await portalLogin(s.u.tenantId, 'nobody@example.test', 'WrongPassword12'),
    ).toEqual({ ok: false, reason: 'invalid' });
  });

  it('locks the account after five failures', async () => {
    const s = await scene();
    const { email } = await grant(s);

    for (let i = 0; i < 5; i += 1) {
      await portalLogin(s.u.tenantId, email, 'WrongPassword12');
    }
    // Even the right password, now.
    expect(await portalLogin(s.u.tenantId, email, PASS)).toEqual({
      ok: false,
      reason: 'locked',
    });
  });

  it('tells an account with no live grant that it has no students', async () => {
    const s = await scene();
    const { email, principal } = await grant(s);
    const access = await listPortalAccess(s.registry, s.studentId);
    await revokePortalAccess(s.registry, access.access[0].accessId);

    const result = await portalLogin(s.u.tenantId, email, PASS);
    expect(result).toEqual({ ok: false, reason: 'noAccess' });
    expect(principal.accountId).toBeTruthy();
  });

  it('will not accept a console token, and the console will not accept its own', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    const staff = await createSessionToken({
      tenantId: s.u.tenantId,
      userId: s.registry.userId,
      mfaVerified: true,
      version: 1,
    });
    const portal = await createPortalToken({
      tenantId: s.u.tenantId,
      accountId: principal.accountId,
      version: 1,
    });

    // Same signing secret, different audience. Neither door opens the other.
    expect(await verifyPortalToken(staff.token)).toBeNull();
    expect(await verifySessionToken(portal.token)).toBeNull();
    expect(await verifyPortalToken(portal.token)).not.toBeNull();
  });

  it('refuses a session whose version has moved on', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    await asSystem((tx) =>
      tx.portalAccount.update({
        where: { id: principal.accountId },
        data: { sessionVersion: { increment: 1 } },
      }),
    );

    expect(
      await loadPortalPrincipal(s.u.tenantId, principal.accountId, 1),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Withdrawing access
// ---------------------------------------------------------------------------

describe('withdrawing access', () => {
  it('takes effect at the next request rather than at token expiry', async () => {
    const s = await scene();
    const { principal } = await grant(s);
    const before = await loadPortalPrincipal(
      s.u.tenantId,
      principal.accountId,
      1,
    );
    expect(before).not.toBeNull();

    const access = await listPortalAccess(s.registry, s.studentId);
    await revokePortalAccess(s.registry, access.access[0].accessId);

    // The session version moved, so the token in their pocket is dead — not
    // in two hours, now.
    expect(await loadPortalPrincipal(s.u.tenantId, principal.accountId, 1)).toBeNull();
  });

  it('keeps the withdrawn row, so who could see it in March stays answerable', async () => {
    const s = await scene();
    await grant(s);

    const before = await listPortalAccess(s.registry, s.studentId);
    await revokePortalAccess(s.registry, before.access[0].accessId);

    const after = await listPortalAccess(s.registry, s.studentId);
    expect(after.access).toHaveLength(1);
    expect(after.access[0].revokedAt).not.toBeNull();
  });

  it('demands student.manage to withdraw, as it did to grant', async () => {
    const s = await scene();
    await grant(s);
    const reader = await makePrincipal(s.u.tenantId, ['student.read'], {
      name: `ro2-${(counter += 1)}`,
    });
    const access = await listPortalAccess(s.registry, s.studentId);

    await expect(
      revokePortalAccess(reader, access.access[0].accessId),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// What the student is shown — and that it is the same answer staff get
// ---------------------------------------------------------------------------

describe('the figures are the institution’s, not a second set', () => {
  it('shows the balance the finance office would quote', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    const staff = await studentBalance(s.registry, s.studentId);
    const view = await portalCharges(principal, s.studentId);
    expect(view.balance).toEqual(staff);
  });

  it('prints the statement the counter prints, line for line', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    const staff = await statementOfAccount(s.registry, s.studentId);
    const mine = await portalStatement(principal, s.studentId);

    expect(mine).toEqual(staff);
    // Including the voucher reference the reversal and dishonour lines are
    // dated from — the reason the portal is allowed that table at all.
    expect(mine.lines.every((l) => typeof l.reference === 'string')).toBe(true);
    expect(mine.lines.some((l) => l.reference !== '')).toBe(true);
  });

  it('issues the card the registry issues, with the same verification token', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    const staff = await registrationCard(s.registrar, s.registrationId);
    const { card } = await portalCard(principal, s.studentId, s.registrationId);

    expect(card.verifyToken).toBe(staff.verifyToken);
    expect(card.registrationNo).toBe(staff.registrationNo);
    expect(card.fees).toEqual(staff.fees);
  });

  it('refuses a card for a registration that is not theirs', async () => {
    const s = await scene();
    const { principal } = await grant(s);
    const other = await asSystem((tx) =>
      tx.semesterRegistration.findFirstOrThrow({
        where: { tenantId: s.u.tenantId, studentId: s.otherId },
        select: { id: true },
      }),
    );

    await expect(
      portalCard(principal, s.studentId, other.id),
    ).rejects.toThrow();
  });

  it('shows the same document checklist the registrar is chasing', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    const staff = await documentChecklist(s.registry, s.studentId);
    const mine = await portalDocuments(principal, s.studentId);
    expect(mine).toEqual(staff);
  });

  it('shows the schedule with the arrears position beside it', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    const { plans, arrears } = await portalSchedule(
      principal,
      s.studentId,
      D(2026, 3, 1),
    );
    expect(plans).toHaveLength(1);
    expect(plans[0].instalments).toHaveLength(2);
    // The first date has passed; the second has not.
    expect(plans[0].instalments.map((i) => i.overdue)).toEqual([true, false]);
    expect(arrears.netDue).not.toBe('0.0000');
  });

  it('tells the student why they cannot register, in the registrar’s words', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    const overview = await portalOverview(principal, principal.students[0], D(2026, 3, 1));
    expect(overview.blocks.map((b) => b.holdType)).toContain('DOCUMENTARY');
    expect(overview.blocks.find((b) => b.holdType === 'DOCUMENTARY')?.reason).toContain(
      'secondary certificate',
    );
    expect(overview.latestRegistration?.id).toBe(s.registrationId);
    expect(overview.nextInstalment).not.toBeNull();
  });

  it('shows the sponsored portion and the reversed bill rather than dropping them', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    const view = await portalCharges(principal, s.studentId);
    expect(view.charges.length).toBeGreaterThan(0);
    for (const c of view.charges) {
      expect(c).toHaveProperty('sponsored');
      expect(c).toHaveProperty('reversed');
    }
    // The receipt is on the page whatever became of it.
    expect(view.receipts.map((r) => r.id)).toContain(s.receiptId);
  });
});

// ---------------------------------------------------------------------------
// The account itself
// ---------------------------------------------------------------------------

describe('changing a password', () => {
  it('demands the current one, and hands back a session that still works', async () => {
    const s = await scene();
    const { principal } = await grant(s);

    await expect(
      changePortalPassword(
        s.u.tenantId,
        principal.accountId,
        'NotThePassword1',
        'AnotherGoodPassword2',
      ),
    ).rejects.toBeInstanceOf(PortalAccountError);

    const { token } = await changePortalPassword(
      s.u.tenantId,
      principal.accountId,
      PASS,
      'AnotherGoodPassword2',
    );
    const session = await verifyPortalToken(token);
    expect(session?.accountId).toBe(principal.accountId);

    // The new token is live; the version the old one carried is not.
    const live = await loadPortalPrincipal(
      s.u.tenantId,
      principal.accountId,
      session!.version,
    );
    expect(live).not.toBeNull();
    expect(await loadPortalPrincipal(s.u.tenantId, principal.accountId, 1)).toBeNull();
  });

  it('refuses to store anything that is not an Argon2 digest', async () => {
    const s = await scene();
    const { accountId } = await grant(s);

    await expect(
      asSystem((tx) =>
        tx.portalAccount.update({
          where: { id: accountId },
          data: { passwordHash: 'plaintext-password' },
        }),
      ),
    ).rejects.toThrow();
  });
});
