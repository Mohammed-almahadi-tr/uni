import 'server-only';
import { withTenant, withSystem } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { RegistrationError } from './engine';
import type { RegistrationStatus } from '@/generated/prisma/enums';

/**
 * Registration card and its public verification endpoint (SRS REQ-REG-05).
 *
 * The legacy proof of registration was a Crystal Report printed from the same
 * screen that saved the row (`printFile(File2)`), with nothing on it a third
 * party could check. A student presenting a printout at a hostel, a bank or a
 * ministry office was presenting a piece of paper.
 *
 * The card here carries a QR code resolving to `verifyRegistrationCard`, which
 * is deliberately the narrowest endpoint in the product:
 *
 *   · It takes an **opaque 32-hex token** and nothing else. There is no
 *     student id and no student number in the URL, so possession of one card
 *     tells you nothing about any other, and the endpoint cannot be walked.
 *   · It runs **without a session**, because the person scanning is a
 *     landlord or a registrar at another institution. It therefore reads
 *     across tenants by token — the token is the tenant scope — and returns
 *     the minimum a verifier needs: name, university, programme, term, and
 *     whether the registration is live.
 *   · It returns **no money**. What a student paid is not a fact a QR scan
 *     should disclose, and a verifier does not need it to answer the question
 *     they are asking.
 */

export interface RegistrationCard {
  registrationNo: string;
  status: RegistrationStatus;
  issuedOn: string;
  university: { nameAr: string; nameEn: string; logoUrl: string | null };
  student: {
    studentNo: string;
    nameAr: string;
    nameEn: string;
    programmeNameAr: string;
    programmeNameEn: string;
    facultyNameAr: string;
    facultyNameEn: string;
    batchNameEn: string;
  };
  term: {
    academicYearCode: string;
    nameAr: string;
    nameEn: string;
    levelYear: number;
  };
  fees: {
    currency: string;
    gross: string;
    discount: string;
    net: string;
    lines: Array<{ code: string; nameAr: string; nameEn: string; net: string }>;
  };
  /** Path the QR code encodes. Prefix with the tenant's public origin. */
  verifyPath: string;
  verifyToken: string;
}

export async function registrationCard(
  principal: Principal,
  registrationId: string,
): Promise<RegistrationCard> {
  requirePermission(principal, 'registration.read');

  return withTenant(principal.tenantId, async (tx) => {
    const reg = await tx.semesterRegistration.findUnique({
      where: { id: registrationId },
      select: {
        id: true,
        tenantId: true,
        registrationNo: true,
        status: true,
        levelYear: true,
        registrationDate: true,
        currency: true,
        grossAmount: true,
        discountAmount: true,
        netAmount: true,
        verifyToken: true,
        student: {
          select: { studentNo: true, fullNameAr: true, fullNameEn: true },
        },
        programme: {
          select: {
            nameAr: true,
            nameEn: true,
            faculty: { select: { nameAr: true, nameEn: true } },
          },
        },
        batch: { select: { nameEn: true } },
        academicYear: { select: { code: true } },
        academicTerm: { select: { nameAr: true, nameEn: true } },
      },
    });
    if (!reg || reg.tenantId !== principal.tenantId) {
      throw new RegistrationError('That registration does not belong to this university.');
    }

    const tenant = await tx.tenant.findUniqueOrThrow({
      where: { id: principal.tenantId },
      select: { nameAr: true, nameEn: true, logoUrl: true },
    });

    const lines = await tx.registrationLine.findMany({
      where: { registrationId: reg.id },
      orderBy: { sortOrder: 'asc' },
      select: {
        netAmount: true,
        feeItem: { select: { code: true, nameAr: true, nameEn: true } },
      },
    });

    return {
      registrationNo: reg.registrationNo,
      status: reg.status,
      issuedOn: reg.registrationDate.toISOString().slice(0, 10),
      university: tenant,
      student: {
        studentNo: reg.student.studentNo,
        nameAr: reg.student.fullNameAr,
        nameEn: reg.student.fullNameEn,
        programmeNameAr: reg.programme.nameAr,
        programmeNameEn: reg.programme.nameEn,
        facultyNameAr: reg.programme.faculty.nameAr,
        facultyNameEn: reg.programme.faculty.nameEn,
        batchNameEn: reg.batch.nameEn,
      },
      term: {
        academicYearCode: reg.academicYear.code,
        nameAr: reg.academicTerm.nameAr,
        nameEn: reg.academicTerm.nameEn,
        levelYear: reg.levelYear,
      },
      fees: {
        currency: reg.currency.trim(),
        gross: reg.grossAmount.toFixed(4),
        discount: reg.discountAmount.toFixed(4),
        net: reg.netAmount.toFixed(4),
        lines: lines.map((l) => ({
          code: l.feeItem.code,
          nameAr: l.feeItem.nameAr,
          nameEn: l.feeItem.nameEn,
          net: l.netAmount.toFixed(4),
        })),
      },
      verifyPath: `/verify/registration/${reg.verifyToken}`,
      verifyToken: reg.verifyToken,
    };
  });
}

/** What a scan of the QR code returns. Deliberately small. */
export interface CardVerification {
  valid: boolean;
  /** Present only when `valid`. */
  registration?: {
    registrationNo: string;
    status: RegistrationStatus;
    studentNameAr: string;
    studentNameEn: string;
    studentNo: string;
    universityNameAr: string;
    universityNameEn: string;
    programmeNameAr: string;
    programmeNameEn: string;
    academicYearCode: string;
    termNameAr: string;
    termNameEn: string;
    levelYear: number;
    registeredOn: string;
  };
  /** Why a scan failed, in a sentence a member of the public can act on. */
  message: string;
}

/**
 * Verify a card by its token. No session, no tenant context.
 *
 * A cancelled registration verifies as **found but not valid** rather than as
 * unknown. Someone presenting a card for a registration that was reversed last
 * month should be told exactly that; "no such registration" would read as a
 * forgery and send them to the wrong desk.
 *
 * Runs through `withSystem` because the scanner has no tenant identity — the
 * token is the scope, and it selects at most one row across the whole
 * platform by a unique index over 128 bits of randomness.
 */
export async function verifyRegistrationCard(token: string): Promise<CardVerification> {
  const clean = (token ?? '').trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(clean)) {
    return { valid: false, message: 'That is not a registration card code.' };
  }

  return withSystem(async (tx) => {
    const reg = await tx.semesterRegistration.findFirst({
      where: { verifyToken: clean },
      select: {
        registrationNo: true,
        status: true,
        levelYear: true,
        registrationDate: true,
        student: { select: { studentNo: true, fullNameAr: true, fullNameEn: true } },
        programme: { select: { nameAr: true, nameEn: true } },
        academicYear: { select: { code: true } },
        academicTerm: { select: { nameAr: true, nameEn: true } },
        tenant: { select: { nameAr: true, nameEn: true, isActive: true } },
      },
    });

    if (!reg || !reg.tenant.isActive) {
      return {
        valid: false,
        message: 'No registration matches this code.',
      };
    }

    const detail = {
      registrationNo: reg.registrationNo,
      status: reg.status,
      studentNo: reg.student.studentNo,
      studentNameAr: reg.student.fullNameAr,
      studentNameEn: reg.student.fullNameEn,
      universityNameAr: reg.tenant.nameAr,
      universityNameEn: reg.tenant.nameEn,
      programmeNameAr: reg.programme.nameAr,
      programmeNameEn: reg.programme.nameEn,
      academicYearCode: reg.academicYear.code,
      termNameAr: reg.academicTerm.nameAr,
      termNameEn: reg.academicTerm.nameEn,
      levelYear: reg.levelYear,
      registeredOn: reg.registrationDate.toISOString().slice(0, 10),
    };

    if (reg.status === 'CANCELLED') {
      return {
        valid: false,
        registration: detail,
        message: `Registration ${reg.registrationNo} was cancelled and is no longer valid.`,
      };
    }
    if (reg.status === 'PENDING_APPROVAL') {
      return {
        valid: false,
        registration: detail,
        message: `Registration ${reg.registrationNo} has not been completed yet.`,
      };
    }

    return {
      valid: true,
      registration: detail,
      message:
        `${reg.student.fullNameEn} is registered at ${reg.tenant.nameEn} for ` +
        `${reg.academicTerm.nameEn}, ${reg.academicYear.code}.`,
    };
  });
}
