import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { PortalRole } from '@/generated/prisma/enums';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { dummyHash, hashPassword, verifyPassword } from '@/lib/auth/password';
import { createPortalToken } from './session';

/**
 * Portal accounts, and how one comes to exist (SRS REQ-LP-05, Track C3).
 *
 * ## The legacy build had no such thing, and could not have had one
 *
 * A student's balance was assembled by a report screen out of a transactions
 * table keyed on a free-typed student name, and there was no student identity
 * to authenticate. The nearest thing to an account was `frmLogin.vb`, which
 * selected a cleartext password out of `Users` and compared it in application
 * code. What C3 adds is not "a login for students" — it is the first record
 * in this system of *who may see a particular student's money*, which is a
 * different fact from who may see the student.
 *
 * ## Nobody chooses somebody else's password
 *
 * A registrar decides that a person may see a student's account. They do not
 * decide, know, or type that person's password. They issue an invitation and
 * hand over a one-time code; the person who accepts it sets their own
 * password. This is the whole reason for the invitation table: a staff member
 * who never knew a credential cannot be accused of having used it, and the
 * alternative — the registrar types a starting password and reads it out —
 * produces a portal where a fifth of the accounts still have it.
 *
 * ## An address that already has an account
 *
 * A guardian with two children at the university is invited twice. The second
 * acceptance must attach to the account they already have rather than fail on
 * the unique index or quietly create a second one. So acceptance takes a
 * password either way, and where an account already exists that password is
 * **checked against it** rather than set. A stolen invitation therefore
 * cannot take over an existing account: it can only add a student to one
 * whose password the holder already knows.
 */

/** How long an invitation code is good for. Long enough to be posted, read
 *  out over a telephone, or handed across a counter and typed at home that
 *  evening; short enough that one left in an inbox is not a live credential a
 *  year later. */
export const INVITATION_TTL_DAYS = 14;

/** Failed sign-ins before the account is locked, and for how long. Matched to
 *  the staff figures rather than invented, because a second set of numbers is
 *  a second thing to keep true. */
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

export class PortalAccountError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortalAccountError';
  }
}

/** The code as it is handed over, and the digest as it is stored. Only the
 *  first is ever shown, and only the second is ever written. */
function newInvitationCode(): { code: string; hash: string } {
  const code = randomBytes(16).toString('hex');
  return { code, hash: digest(code) };
}

function digest(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/** Compare digests without leaking, through timing, how much of a code was
 *  right. The lookup below is by digest and so is already constant-shaped;
 *  this guards the second comparison. */
function sameDigest(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  return x.length === y.length && timingSafeEqual(x, y);
}

export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

// ---------------------------------------------------------------------------
// Granting access — staff side
// ---------------------------------------------------------------------------

export interface InviteInput {
  studentId: string;
  role: PortalRole;
  email: string;
  fullName: string;
  /** Required of a guardian and refused for a student, by CHECK constraint. */
  relationship?: string | null;
}

export interface Invitation {
  invitationId: string;
  /** Shown to the registrar **once**, to hand over. Never stored. */
  code: string;
  expiresAt: Date;
  email: string;
}

/**
 * Invite somebody to see a student's account.
 *
 * `student.manage` — the same authority as editing the student's record.
 * Deciding who may read a student's file is not a lesser act than editing it,
 * and a separate permission nobody thinks to grant is a portal nobody can be
 * let into.
 */
export async function invitePortalAccount(
  principal: Principal,
  input: InviteInput,
): Promise<Invitation> {
  requirePermission(principal, 'student.manage');

  const email = normaliseEmail(input.email);
  const fullName = input.fullName.trim();
  const relationship = input.relationship?.trim() || null;

  if (!input.studentId?.trim()) {
    throw new PortalAccountError('Which student is this access for?');
  }
  if (!email) throw new PortalAccountError('An email address is required.');
  if (fullName.length < 2) {
    throw new PortalAccountError('A name of at least two characters is required.');
  }
  if (input.role === 'GUARDIAN' && !relationship) {
    throw new PortalAccountError(
      'Say how the guardian is related to the student — mother, father, uncle.',
    );
  }
  if (input.role === 'STUDENT' && relationship) {
    throw new PortalAccountError('A student is not related to themselves.');
  }

  const { code, hash } = newInvitationCode();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60_000);

  return withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: { id: true, isActive: true },
    });
    if (!student) throw new PortalAccountError('No such student at this university.');

    // An account that already reads this student does not need inviting
    // again, and issuing a second code would produce two live invitations for
    // one relationship — one of which nobody ever revokes.
    const existing = await tx.portalAccess.findFirst({
      where: {
        tenantId: principal.tenantId,
        studentId: student.id,
        revokedAt: null,
        account: { email },
      },
      select: { id: true },
    });
    if (existing) {
      throw new PortalAccountError('That address can already see this student.');
    }

    const invitation = await tx.portalInvitation.create({
      data: {
        tenantId: principal.tenantId,
        studentId: student.id,
        role: input.role,
        email,
        fullName,
        relationship,
        tokenHash: hash,
        issuedById: principal.userId,
        expiresAt,
      },
      select: { id: true },
    });

    // The code itself is not in the audit entry. An audit log is read by more
    // people than a credential should be, and the entry's purpose is to
    // record that access was granted and by whom, not to be a second copy of
    // the secret.
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'portal_invitation',
      resourceId: invitation.id,
      after: { studentId: student.id, role: input.role, email, relationship, expiresAt },
    });

    return { invitationId: invitation.id, code, expiresAt, email };
  });
}

export interface AccessRow {
  accessId: string;
  accountId: string;
  fullName: string;
  email: string;
  role: PortalRole;
  relationship: string | null;
  grantedAt: Date;
  revokedAt: Date | null;
  lastLoginAt: Date | null;
  isActive: boolean;
}

export interface PendingInvitation {
  invitationId: string;
  fullName: string;
  email: string;
  role: PortalRole;
  relationship: string | null;
  issuedAt: Date;
  expiresAt: Date;
  expired: boolean;
}

/**
 * Who can see this student, and who has been asked. Revoked grants are
 * returned too — the question a registry office is asked after a custody
 * dispute is who *could* see the account in March, and a list of only the
 * live rows cannot answer it.
 */
export async function listPortalAccess(
  principal: Principal,
  studentId: string,
  now: Date = new Date(),
): Promise<{ access: AccessRow[]; pending: PendingInvitation[] }> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.portalAccess.findMany({
      where: { tenantId: principal.tenantId, studentId },
      orderBy: [{ revokedAt: 'asc' }, { grantedAt: 'desc' }],
      select: {
        id: true,
        accountId: true,
        relationship: true,
        grantedAt: true,
        revokedAt: true,
        account: {
          select: {
            fullName: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
          },
        },
      },
    });

    const invitations = await tx.portalInvitation.findMany({
      where: {
        tenantId: principal.tenantId,
        studentId,
        acceptedAt: null,
        revokedAt: null,
      },
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        relationship: true,
        issuedAt: true,
        expiresAt: true,
      },
    });

    return {
      access: rows.map((r) => ({
        accessId: r.id,
        accountId: r.accountId,
        fullName: r.account.fullName,
        email: r.account.email,
        role: r.account.role,
        relationship: r.relationship,
        grantedAt: r.grantedAt,
        revokedAt: r.revokedAt,
        lastLoginAt: r.account.lastLoginAt,
        isActive: r.account.isActive,
      })),
      pending: invitations.map((i) => ({
        invitationId: i.id,
        fullName: i.fullName,
        email: i.email,
        role: i.role,
        relationship: i.relationship,
        issuedAt: i.issuedAt,
        expiresAt: i.expiresAt,
        expired: i.expiresAt <= now,
      })),
    };
  });
}

/**
 * Withdraw access.
 *
 * The session version on the account is bumped in the same transaction, so a
 * guardian who is signed in when the grant is withdrawn is refused at their
 * next request rather than at the end of their two hours. A revocation that
 * takes effect eventually is not a revocation; the reason somebody withdraws
 * one of these in a hurry is that the relationship has gone wrong.
 */
export async function revokePortalAccess(
  principal: Principal,
  accessId: string,
  now: Date = new Date(),
): Promise<void> {
  requirePermission(principal, 'student.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const row = await tx.portalAccess.findUnique({
      where: { id: accessId },
      select: { id: true, tenantId: true, accountId: true, studentId: true, revokedAt: true },
    });
    if (!row || row.tenantId !== principal.tenantId) {
      throw new PortalAccountError('No such portal access at this university.');
    }
    if (row.revokedAt) return;

    await tx.portalAccess.update({
      where: { id: row.id },
      data: { revokedAt: now, revokedById: principal.userId },
    });
    await tx.portalAccount.update({
      where: { id: row.accountId },
      data: { sessionVersion: { increment: 1 } },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'DELETE',
      resourceType: 'portal_access',
      resourceId: row.id,
      before: { accountId: row.accountId, studentId: row.studentId },
    });
  });
}

/** Withdraw an invitation that has not been accepted. The code stops working
 *  the moment somebody realises it went to the wrong address. */
export async function revokeInvitation(
  principal: Principal,
  invitationId: string,
  now: Date = new Date(),
): Promise<void> {
  requirePermission(principal, 'student.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const row = await tx.portalInvitation.findUnique({
      where: { id: invitationId },
      select: { id: true, tenantId: true, acceptedAt: true, revokedAt: true, studentId: true },
    });
    if (!row || row.tenantId !== principal.tenantId) {
      throw new PortalAccountError('No such invitation at this university.');
    }
    if (row.acceptedAt) {
      throw new PortalAccountError(
        'That invitation has already been accepted. Withdraw the access instead.',
      );
    }
    if (row.revokedAt) return;

    await tx.portalInvitation.update({ where: { id: row.id }, data: { revokedAt: now } });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'DELETE',
      resourceType: 'portal_invitation',
      resourceId: row.id,
      before: { studentId: row.studentId },
    });
  });
}

// ---------------------------------------------------------------------------
// Accepting — the invited person's side, with no session
// ---------------------------------------------------------------------------

export interface InvitationPreview {
  fullName: string;
  email: string;
  role: PortalRole;
  studentNameAr: string;
  studentNameEn: string;
  /** Whether an account already exists at this address, so the form can ask
   *  for the existing password rather than a new one. */
  accountExists: boolean;
}

/**
 * What an invitation code says, before it is used.
 *
 * Returns null for a code that is unknown, expired, withdrawn or already
 * accepted — all four the same way, because the difference between them is
 * exactly what somebody guessing codes wants to learn.
 */
export async function previewInvitation(
  tenantId: string,
  code: string,
  now: Date = new Date(),
): Promise<InvitationPreview | null> {
  const trimmed = code.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(trimmed)) return null;

  return withTenant(tenantId, async (tx) => {
    const row = await tx.portalInvitation.findUnique({
      where: { tokenHash: digest(trimmed) },
      select: {
        id: true,
        tenantId: true,
        tokenHash: true,
        fullName: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        student: { select: { fullNameAr: true, fullNameEn: true } },
      },
    });
    if (!row || row.tenantId !== tenantId) return null;
    if (!sameDigest(row.tokenHash, digest(trimmed))) return null;
    if (row.acceptedAt || row.revokedAt || row.expiresAt <= now) return null;

    const account = await tx.portalAccount.findUnique({
      where: { tenantId_email: { tenantId, email: row.email } },
      select: { id: true },
    });

    return {
      fullName: row.fullName,
      email: row.email,
      role: row.role,
      studentNameAr: row.student.fullNameAr,
      studentNameEn: row.student.fullNameEn,
      accountExists: account !== null,
    };
  });
}

/** Whether the address on this invitation already has an account. Read on its
 *  own so the decision above can be made before anything expensive happens. */
async function accountExists(tenantId: string, code: string): Promise<boolean> {
  return withTenant(tenantId, async (tx) => {
    const invitation = await tx.portalInvitation.findUnique({
      where: { tokenHash: digest(code) },
      select: { email: true },
    });
    if (!invitation) return false;
    const account = await tx.portalAccount.findUnique({
      where: { tenantId_email: { tenantId, email: invitation.email } },
      select: { id: true },
    });
    return account !== null;
  });
}

export interface AcceptResult {
  token: string;
  expiresAt: Date;
  accountId: string;
}

/**
 * Turn an invitation into access.
 *
 * Two paths, one function, because the caller has no way to know in advance
 * which applies and asking them to would leak whether an address is already
 * registered:
 *
 *   · **No account at this address** — one is created and `password` becomes
 *     its password, subject to the same strength policy staff passwords meet.
 *   · **An account exists** — `password` is checked against it, and on a
 *     match the student is added to what that account may read. A stolen
 *     invitation cannot take over an account whose password the thief does
 *     not have.
 *
 * The whole of it is one transaction. An account created without its access
 * row is an account that can sign in and see nothing, and a student would be
 * telephoning the registry about it within the hour.
 */
export async function acceptInvitation(
  tenantId: string,
  code: string,
  password: string,
  ip?: string,
  now: Date = new Date(),
): Promise<AcceptResult> {
  const trimmed = code.trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(trimmed)) {
    throw new PortalAccountError('That invitation code is not valid.');
  }

  // Whether this acceptance is going to *create* an account decides two
  // things, and both are wrong if the question is not asked first:
  //
  //   · the password strength policy applies to a password being set, not to
  //     one being proved. A guardian adding a second child, whose password
  //     predates a tightening of the policy, must not be refused for a rule
  //     they cannot retroactively have met;
  //   · Argon2 is deliberately slow, and hashing inside the transaction would
  //     pin a connection for the length of the work that is meant to cost.
  //
  // The read below can be stale by the time the write runs — two acceptances
  // for one address at once — so the transaction decides again and hashes
  // there in the rare case it disagrees. The unique index is what makes that
  // safe rather than the timing.
  const creating = !(await accountExists(tenantId, trimmed));
  const preHashed = creating ? await hashPassword(password) : null;

  const { accountId, version } = await withTenant(tenantId, async (tx) => {
    const invitation = await tx.portalInvitation.findUnique({
      where: { tokenHash: digest(trimmed) },
      select: {
        id: true,
        tenantId: true,
        studentId: true,
        role: true,
        email: true,
        fullName: true,
        relationship: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
      },
    });
    if (
      !invitation ||
      invitation.tenantId !== tenantId ||
      invitation.acceptedAt ||
      invitation.revokedAt ||
      invitation.expiresAt <= now
    ) {
      throw new PortalAccountError('That invitation code is not valid.');
    }

    const existing = await tx.portalAccount.findUnique({
      where: { tenantId_email: { tenantId, email: invitation.email } },
      select: { id: true, passwordHash: true, isActive: true, sessionVersion: true },
    });

    let account: { id: string; sessionVersion: number };

    if (existing) {
      if (!existing.isActive) {
        throw new PortalAccountError('That invitation code is not valid.');
      }
      const ok = await verifyPassword(password, existing.passwordHash);
      if (!ok) {
        throw new PortalAccountError(
          'An account already exists for that address. Enter its password to add this student to it.',
        );
      }
      account = { id: existing.id, sessionVersion: existing.sessionVersion };
    } else {
      const created = await tx.portalAccount.create({
        data: {
          tenantId,
          email: invitation.email,
          fullName: invitation.fullName,
          passwordHash: preHashed ?? (await hashPassword(password)),
          role: invitation.role,
        },
        select: { id: true, sessionVersion: true },
      });
      account = created;
    }

    await tx.portalAccess.create({
      data: {
        tenantId,
        accountId: account.id,
        studentId: invitation.studentId,
        relationship: invitation.relationship,
        grantedViaInvitationId: invitation.id,
      },
    });

    await tx.portalInvitation.update({
      where: { id: invitation.id },
      data: { acceptedAt: now, acceptedAccountId: account.id },
    });

    // No actor. A portal account is not a `User`, and the audit chain's actor
    // column is a user — recording the invited person there would put a party
    // with no role into a column that means "a member of staff did this". The
    // same choice C2 makes for a public applicant, for the same reason. Who
    // authorised the access is on the invitation, which this row names.
    await audit(tx, tenantId, {
      actorId: null,
      ip,
      action: 'INSERT',
      resourceType: 'portal_access',
      resourceId: account.id,
      after: {
        studentId: invitation.studentId,
        invitationId: invitation.id,
        role: invitation.role,
        accountCreated: existing === null,
      },
    });

    return { accountId: account.id, version: account.sessionVersion };
  });

  const { token, expiresAt } = await createPortalToken({ tenantId, accountId, version });
  return { token, expiresAt, accountId };
}

// ---------------------------------------------------------------------------
// Signing in
// ---------------------------------------------------------------------------

export type PortalLoginResult =
  | { ok: true; token: string; expiresAt: Date; accountId: string }
  | { ok: false; reason: 'invalid' | 'locked' | 'inactive' | 'noAccess' };

/**
 * Sign in to the portal.
 *
 * `invalid` covers both "no such address" and "wrong password", and a missing
 * account still pays for one Argon2 verification against a dummy hash, so
 * response time does not turn the form into a list of the university's
 * parents.
 *
 * `noAccess` is separate and is returned only after the password was
 * *correct*: an account whose every grant has been withdrawn is told that it
 * has no students rather than that its password is wrong, because the second
 * would send somebody to reset a password that was never the problem.
 */
export async function portalLogin(
  tenantId: string,
  email: string,
  password: string,
  ip?: string,
  now: Date = new Date(),
): Promise<PortalLoginResult> {
  const normalised = normaliseEmail(email);

  const account = await withTenant(tenantId, (tx) =>
    tx.portalAccount.findUnique({
      where: { tenantId_email: { tenantId, email: normalised } },
      select: {
        id: true,
        passwordHash: true,
        isActive: true,
        failedLoginCount: true,
        lockedUntil: true,
        sessionVersion: true,
      },
    }),
  );

  if (!account) {
    await verifyPassword(password, await dummyHash());
    return { ok: false, reason: 'invalid' };
  }
  if (account.lockedUntil && account.lockedUntil > now) {
    return { ok: false, reason: 'locked' };
  }
  if (!account.isActive) return { ok: false, reason: 'inactive' };

  const valid = await verifyPassword(password, account.passwordHash);

  if (!valid) {
    const failed = account.failedLoginCount + 1;
    await withTenant(tenantId, (tx) =>
      tx.portalAccount.update({
        where: { id: account.id },
        data: {
          failedLoginCount: failed,
          lockedUntil:
            failed >= MAX_FAILED ? new Date(now.getTime() + LOCK_MINUTES * 60_000) : null,
        },
      }),
    );
    return { ok: false, reason: 'invalid' };
  }

  const live = await withTenant(tenantId, (tx) =>
    tx.portalAccess.count({
      where: { tenantId, accountId: account.id, revokedAt: null },
    }),
  );
  if (live === 0) return { ok: false, reason: 'noAccess' };

  await withTenant(tenantId, async (tx) => {
    await tx.portalAccount.update({
      where: { id: account.id },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
    });
    await audit(tx, tenantId, {
      actorId: null,
      ip,
      action: 'LOGIN',
      resourceType: 'portal_account',
      resourceId: account.id,
      after: { email: normalised },
    });
  });

  const { token, expiresAt } = await createPortalToken({
    tenantId,
    accountId: account.id,
    version: account.sessionVersion,
  });
  return { ok: true, token, expiresAt, accountId: account.id };
}

/**
 * Change a portal password.
 *
 * The current password is required even though the caller is already signed
 * in, because the threat this defends against is a borrowed telephone with a
 * live session on it, not a stranger with no session at all.
 *
 * The session version is bumped, which kills **every** session on the account
 * — including the one making the request. That is the intent: the borrowed
 * device must not still be signed in afterwards. So a fresh token is returned
 * and the caller replaces the cookie with it, which is the difference between
 * changing your password and being logged out for having done so.
 */
export async function changePortalPassword(
  tenantId: string,
  accountId: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ token: string; expiresAt: Date }> {
  const hashed = await hashPassword(newPassword);

  const version = await withTenant(tenantId, async (tx) => {
    const account = await tx.portalAccount.findUnique({
      where: { id: accountId },
      select: { id: true, tenantId: true, passwordHash: true },
    });
    if (!account || account.tenantId !== tenantId) {
      throw new PortalAccountError('No such account.');
    }
    if (!(await verifyPassword(currentPassword, account.passwordHash))) {
      throw new PortalAccountError('The current password is not right.');
    }
    const updated = await tx.portalAccount.update({
      where: { id: account.id },
      data: { passwordHash: hashed, sessionVersion: { increment: 1 } },
      select: { sessionVersion: true },
    });
    await audit(tx, tenantId, {
      actorId: null,
      action: 'UPDATE',
      resourceType: 'portal_account',
      resourceId: account.id,
      after: { passwordChanged: true },
    });
    return updated.sessionVersion;
  });

  return createPortalToken({ tenantId, accountId, version });
}
