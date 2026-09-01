import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import type { PortalRole } from '@/generated/prisma/enums';
import { withPortal, withTenant, type Tx } from '@/lib/db/client';
import { currentTenant } from '@/lib/cms/request';
import { PORTAL_COOKIE, verifyPortalToken } from './session';

/**
 * Who is asking, and whose record they may read (Track C3).
 *
 * ## The access model, in one sentence
 *
 * A portal account holds no permission; it holds **relationships**, and a
 * relationship names exactly one student.
 *
 * That is why there is no `portal.read` permission key and no portal entry in
 * `lib/auth/permissions.ts`. A permission is a capability that can be granted
 * once and then applies to every row of a kind — which is the correct shape
 * for a registrar who reads all students and the catastrophic shape for a
 * parent who reads one. The question the portal has to answer is not *may
 * this account read student records* but *may it read **this** student*, and
 * the only honest way to store the answer is a row per pair.
 *
 * ## Two checks, not one
 *
 * `assertStudentAccess` reads `portal_access` under `withTenant` and refuses
 * a student the account is not linked to. Then `readAsStudent` opens a
 * `withPortal` transaction, and the database refuses the same thing again —
 * restrictive policies on every table confine it to that one student.
 *
 * The second is not a belt on top of the first's braces. The first can be
 * forgotten by a page written next year; the second cannot, because it is not
 * something the page does. A query inside `readAsStudent` that omits its
 * `where` returns no rows rather than another family's.
 *
 * ## The session carries no student
 *
 * Not the student id and not the list of children a guardian may read — only
 * the account. Both are looked up per request, so a grant withdrawn at the
 * registry desk this morning is not still live in a pocket until teatime.
 */

export interface PortalStudent {
  studentId: string;
  studentNo: string;
  fullNameAr: string;
  fullNameEn: string;
  /** How the account is related to them. Null on a student's own account. */
  relationship: string | null;
  programmeNameAr: string | null;
  programmeNameEn: string | null;
}

export interface PortalPrincipal {
  tenantId: string;
  accountId: string;
  fullName: string;
  email: string;
  role: PortalRole;
  /** Every student this account may read, in the order they were granted.
   *  Never empty: an account with no live grant cannot sign in and is signed
   *  out at the request after its last grant is withdrawn. */
  students: readonly PortalStudent[];
}

export class PortalAccessError extends Error {
  constructor(message = 'That record does not belong to this account.') {
    super(message);
    this.name = 'PortalAccessError';
  }
}

/**
 * The signed-in portal account for this request, or null.
 *
 * Wrapped in React's `cache`, so a page and the layout above it share one
 * resolution rather than each opening a transaction.
 *
 * Four ways to be null, treated identically: no cookie, a token that does not
 * verify as a **portal** token, an account that has been deactivated or whose
 * session version has moved on, and an account with no live grant left. The
 * last is what makes revocation immediate — `revokePortalAccess` bumps the
 * version in the same transaction that withdraws the grant.
 */
export const currentPortalAccount = cache(async (): Promise<PortalPrincipal | null> => {
  const tenant = await currentTenant();
  if (!tenant) return null;

  const jar = await cookies();
  const session = await verifyPortalToken(jar.get(PORTAL_COOKIE)?.value);
  if (!session) return null;

  // A token minted for one university presented at another's host. The
  // signing secret is shared across tenants, so this comparison is the thing
  // that stops it, and it happens before any query.
  if (session.tenantId !== tenant.tenantId) return null;

  return loadPortalPrincipal(tenant.tenantId, session.accountId, session.version);
});

export async function loadPortalPrincipal(
  tenantId: string,
  accountId: string,
  version: number,
): Promise<PortalPrincipal | null> {
  return withTenant(tenantId, async (tx) => {
    const account = await tx.portalAccount.findUnique({
      where: { id: accountId },
      select: {
        id: true,
        tenantId: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        sessionVersion: true,
      },
    });
    if (!account || account.tenantId !== tenantId || !account.isActive) return null;
    if (account.sessionVersion !== version) return null;

    const students = await liveAccess(tx, tenantId, account.id);
    if (students.length === 0) return null;

    return {
      tenantId,
      accountId: account.id,
      fullName: account.fullName,
      email: account.email,
      role: account.role,
      students,
    };
  });
}

async function liveAccess(
  tx: Tx,
  tenantId: string,
  accountId: string,
): Promise<PortalStudent[]> {
  const rows = await tx.portalAccess.findMany({
    where: { tenantId, accountId, revokedAt: null },
    orderBy: { grantedAt: 'asc' },
    select: {
      relationship: true,
      student: {
        select: {
          id: true,
          studentNo: true,
          fullNameAr: true,
          fullNameEn: true,
          programme: { select: { nameAr: true, nameEn: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    studentId: r.student.id,
    studentNo: r.student.studentNo,
    fullNameAr: r.student.fullNameAr,
    fullNameEn: r.student.fullNameEn,
    relationship: r.relationship,
    programmeNameAr: r.student.programme?.nameAr ?? null,
    programmeNameEn: r.student.programme?.nameEn ?? null,
  }));
}

/**
 * Which student a request is about.
 *
 * A guardian with three children has a `?student=` on every page. An id that
 * is not one of theirs is refused rather than silently replaced with one that
 * is — quietly showing a different child than the one asked for is how
 * somebody ends up paying the wrong fee. An **absent** id, by contrast, is
 * ordinary: it means the first student, which is the only one most accounts
 * have.
 */
export function selectStudent(
  principal: PortalPrincipal,
  studentId?: string | null,
): PortalStudent {
  const wanted = studentId?.trim();
  if (!wanted) return principal.students[0];
  const found = principal.students.find((s) => s.studentId === wanted);
  if (!found) throw new PortalAccessError();
  return found;
}

/**
 * Read one student's record under the portal's confinement.
 *
 * The access check happens here rather than being left to the caller, and the
 * transaction it opens is the confined one, so there is no way to reach the
 * data without passing both. `fn` receives a transaction that can see this
 * student and nothing else in the database, and that cannot write.
 */
export async function readAsStudent<T>(
  principal: PortalPrincipal,
  studentId: string,
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  if (!principal.students.some((s) => s.studentId === studentId)) {
    throw new PortalAccessError();
  }
  return withPortal(principal.tenantId, studentId, fn);
}
