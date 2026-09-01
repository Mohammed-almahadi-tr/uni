import 'server-only';
import type {
  ApplicationState,
  PaymentChannel,
  RegistrationStatus,
} from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { buildBalance, buildStatement, type Statement, type StudentBalance } from '@/lib/students/account';
import { instalmentSchedule, type SchedulePlan } from '@/lib/billing/instalments';
import { arrearsInTx, blockingHoldsInTx, type ArrearsPosition, type BlockingHold } from '@/lib/students/holds';
import { buildChecklist, type Checklist } from '@/lib/students/documents';
import { buildRegistrationCard, type RegistrationCard } from '@/lib/registration/card';
import { letterheadForTenant } from '@/lib/print/letterhead';
import type { Letterhead } from '@/lib/print/sheet';
import { readAsStudent, type PortalPrincipal, type PortalStudent } from './guard';

/**
 * What a student or guardian may read (SRS REQ-LP-05, Track C3).
 *
 * ## Every figure here already existed
 *
 * Nothing in this file computes money. The balance is A3's, the arrears
 * position and the blocking holds are B5's, the instalment schedule is A3's,
 * the statement is the one D5 prints at the counter, and the registration
 * card is B4's with D3's QR on it. What C3 adds is an **audience**: the
 * person the figures are about.
 *
 * That is deliberate to the point of being the design. A portal that computed
 * its own version of what a student owes would be a second answer to a
 * question the cashier's screen already answers, and the first time the two
 * disagreed the student would be right to believe neither. So every entry
 * point below calls the same builder the staff screen calls, inside a
 * transaction that can see one student.
 *
 * ## What is deliberately not here
 *
 * · **The screening outcome and the committee's rationale.** C2 withholds
 *   both from an applicant and the same reasoning holds after admission.
 * · **The medical record.** B3 put it behind `medical.read` because it is
 *   read by a clinic and not by a registry; a portal transaction is refused
 *   the table outright rather than trusted to leave it alone.
 * · **Anything about another student**, including the sibling a guardian also
 *   has access to. Each page is opened for one student and confined to them,
 *   so a guardian switching children is a new transaction, not a wider one.
 */

// ---------------------------------------------------------------------------
// The dashboard
// ---------------------------------------------------------------------------

export interface NextInstalment {
  dueDate: Date;
  amount: string;
  overdue: boolean;
}

export interface PortalOverview {
  student: PortalStudent;
  balance: StudentBalance;
  arrears: ArrearsPosition;
  /** Every reason they cannot register, in the words a registrar would use.
   *  Shown to the student, not only to the desk — see below. */
  blocks: BlockingHold[];
  nextInstalment: NextInstalment | null;
  latestRegistration: PortalRegistration | null;
  documentsOutstanding: string[];
  application: { applicationNo: string; state: ApplicationState } | null;
}

/**
 * Tenant policy the arrears calculation needs.
 *
 * Read under `withTenant`, because a portal transaction is refused the
 * `tenants` row: it carries the institution's own thresholds, and a student's
 * confinement has no business including them. Passed into `blockingHoldsInTx`
 * rather than read there, which is the same shape as the registration card's
 * `university` argument and for the same reason.
 */
async function arrearsPolicy(tenantId: string) {
  return withTenant(tenantId, (tx) =>
    tx.tenant.findUniqueOrThrow({
      where: { id: tenantId },
      select: { arrearsGraceDays: true, arrearsBlockThreshold: true },
    }),
  );
}

/**
 * The first page after signing in.
 *
 * The blocking holds are on it, and that is the one thing here a legacy
 * system would never have shown a student. B5 made a hold a control rather
 * than a report and D3 put it in front of the registrar *before* the work
 * rather than after it; the same argument reaches one step further. A student
 * who learns at the registration desk that a document expired in March has
 * lost the queue and the morning. A student who has been able to read it
 * since March has not.
 */
export async function portalOverview(
  principal: PortalPrincipal,
  student: PortalStudent,
  asOf: Date = new Date(),
): Promise<PortalOverview> {
  const policy = await arrearsPolicy(principal.tenantId);

  return readAsStudent(principal, student.studentId, async (tx) => {
    const balance = await buildBalance(tx, principal.tenantId, student.studentId);
    const arrears = await arrearsInTx(tx, principal.tenantId, student.studentId, asOf);
    const blocks = await blockingHoldsInTx(
      tx,
      principal.tenantId,
      student.studentId,
      asOf,
      policy,
    );
    const schedule = await instalmentSchedule(tx, principal.tenantId, student.studentId, asOf);
    const checklist = await buildChecklist(tx, principal.tenantId, student.studentId, asOf);

    // The next date money is wanted on. Unpaid instalments are not a thing
    // the schedule records — payments settle charges, not instalments — so
    // "next" is the earliest date that has not passed, and anything already
    // past shows as the oldest overdue one instead. A schedule whose dates
    // have all gone by with a balance still on the account should not say
    // "nothing due".
    const all = schedule.flatMap((p) => p.instalments);
    all.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    const owing = balance.netDue !== '0.0000' && !balance.netDue.startsWith('-');
    const overdueOne = owing ? all.find((i) => i.overdue) : undefined;
    const upcoming = all.find((i) => !i.overdue);
    const next = overdueOne ?? upcoming ?? null;

    const registrations = await registrationsInTx(tx, principal.tenantId, student.studentId);

    const application = await tx.application.findFirst({
      where: { tenantId: principal.tenantId, studentId: student.studentId },
      orderBy: { createdAt: 'desc' },
      select: { applicationNo: true, state: true },
    });

    return {
      student,
      balance,
      arrears,
      blocks,
      nextInstalment: next
        ? { dueDate: next.dueDate, amount: next.amount, overdue: next.overdue }
        : null,
      latestRegistration: registrations[0] ?? null,
      documentsOutstanding: checklist.outstanding,
      application,
    };
  });
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export interface PortalCharge {
  id: string;
  docDate: Date;
  dueDate: Date | null;
  feeNameAr: string;
  feeNameEn: string;
  termLabel: string | null;
  currency: string;
  gross: string;
  discount: string;
  /** What a sponsor carries. Shown rather than netted away silently: a
   *  student who does not know a ministry is paying half assumes the bill is
   *  wrong. */
  sponsored: string;
  /** What the student personally owes on this line. */
  own: string;
  settled: string;
  outstanding: string;
  reversed: boolean;
}

export interface PortalReceipt {
  id: string;
  receiptNo: string;
  docDate: Date;
  channel: PaymentChannel;
  currency: string;
  amount: string;
  /** A cancelled or dishonoured receipt is still shown. A payment that was
   *  taken and then undone is the single most alarming thing that can happen
   *  to somebody's account, and a portal that quietly drops the row leaves
   *  them to discover it from a balance that changed overnight. */
  cancelled: boolean;
  dishonoured: boolean;
}

export interface PortalAccountView {
  balance: StudentBalance;
  charges: PortalCharge[];
  receipts: PortalReceipt[];
}

/** The bills and the payments, newest first. REQ-LP-05's "invoices". */
export async function portalCharges(
  principal: PortalPrincipal,
  studentId: string,
): Promise<PortalAccountView> {
  return readAsStudent(principal, studentId, async (tx) => {
    const balance = await buildBalance(tx, principal.tenantId, studentId);

    const charges = await tx.studentCharge.findMany({
      where: { tenantId: principal.tenantId, studentId },
      orderBy: [{ docDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        docDate: true,
        dueDate: true,
        termLabel: true,
        currency: true,
        grossAmount: true,
        discountAmount: true,
        netAmount: true,
        sponsoredAmount: true,
        settledAmount: true,
        reversedAt: true,
        feeItem: { select: { nameAr: true, nameEn: true } },
      },
    });

    const receipts = await tx.studentReceipt.findMany({
      where: { tenantId: principal.tenantId, studentId },
      orderBy: [{ docDate: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        receiptNo: true,
        docDate: true,
        channel: true,
        currency: true,
        amount: true,
        cancelledAt: true,
        dishonouredAt: true,
      },
    });

    return {
      balance,
      charges: charges.map((c) => {
        const own = c.netAmount.minus(c.sponsoredAmount);
        return {
          id: c.id,
          docDate: c.docDate,
          dueDate: c.dueDate,
          feeNameAr: c.feeItem.nameAr,
          feeNameEn: c.feeItem.nameEn,
          termLabel: c.termLabel,
          currency: c.currency.trim(),
          gross: c.grossAmount.toFixed(4),
          discount: c.discountAmount.toFixed(4),
          sponsored: c.sponsoredAmount.toFixed(4),
          own: own.toFixed(4),
          settled: c.settledAmount.toFixed(4),
          outstanding: c.reversedAt ? '0.0000' : own.minus(c.settledAmount).toFixed(4),
          reversed: c.reversedAt !== null,
        };
      }),
      receipts: receipts.map((r) => ({
        id: r.id,
        receiptNo: r.receiptNo,
        docDate: r.docDate,
        channel: r.channel,
        currency: r.currency.trim(),
        amount: r.amount.toFixed(4),
        cancelled: r.cancelledAt !== null,
        dishonoured: r.dishonouredAt !== null,
      })),
    };
  });
}

/** The same statement of account the finance office prints, for the person it
 *  is about. */
export async function portalStatement(
  principal: PortalPrincipal,
  studentId: string,
  range: { from?: Date; to?: Date } = {},
): Promise<Statement> {
  return readAsStudent(principal, studentId, (tx) =>
    buildStatement(tx, principal.tenantId, studentId, range),
  );
}

export interface PortalSchedule {
  plans: SchedulePlan[];
  arrears: ArrearsPosition;
}

/**
 * The instalment schedule with its due dates (REQ-LP-05, REQ-CSH-02).
 *
 * Returned with the arrears position beside it, never alone. A date that has
 * passed does not mean money is owed — payments settle charges, not
 * instalments — and a schedule shown without the balance is a page that tells
 * a student who paid the whole term up front that they are three instalments
 * behind.
 */
export async function portalSchedule(
  principal: PortalPrincipal,
  studentId: string,
  asOf: Date = new Date(),
): Promise<PortalSchedule> {
  return readAsStudent(principal, studentId, async (tx) => ({
    plans: await instalmentSchedule(tx, principal.tenantId, studentId, asOf),
    arrears: await arrearsInTx(tx, principal.tenantId, studentId, asOf),
  }));
}

// ---------------------------------------------------------------------------
// Registration, proofs and documents
// ---------------------------------------------------------------------------

export interface PortalRegistration {
  id: string;
  registrationNo: string;
  status: RegistrationStatus;
  registrationDate: Date;
  levelYear: number;
  academicYearCode: string;
  termNameAr: string;
  termNameEn: string;
  programmeNameAr: string;
  programmeNameEn: string;
  currency: string;
  gross: string;
  discount: string;
  net: string;
}

async function registrationsInTx(
  tx: Tx,
  tenantId: string,
  studentId: string,
): Promise<PortalRegistration[]> {
  const rows = await tx.semesterRegistration.findMany({
    where: { tenantId, studentId },
    orderBy: { registrationDate: 'desc' },
    select: {
      id: true,
      registrationNo: true,
      status: true,
      registrationDate: true,
      levelYear: true,
      currency: true,
      grossAmount: true,
      discountAmount: true,
      netAmount: true,
      academicYear: { select: { code: true } },
      academicTerm: { select: { nameAr: true, nameEn: true } },
      programme: { select: { nameAr: true, nameEn: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    registrationNo: r.registrationNo,
    status: r.status,
    registrationDate: r.registrationDate,
    levelYear: r.levelYear,
    academicYearCode: r.academicYear.code,
    termNameAr: r.academicTerm.nameAr,
    termNameEn: r.academicTerm.nameEn,
    programmeNameAr: r.programme.nameAr,
    programmeNameEn: r.programme.nameEn,
    currency: r.currency.trim(),
    gross: r.grossAmount.toFixed(4),
    discount: r.discountAmount.toFixed(4),
    net: r.netAmount.toFixed(4),
  }));
}

/**
 * Every term this student has registered for, cancelled ones included.
 *
 * Cancelled registrations are shown rather than hidden, with their status on
 * them. A term that was registered and then withdrawn is a fact the student
 * needs when they are asked to account for a year, and a list that silently
 * omits it is one they cannot use.
 */
export async function portalRegistrations(
  principal: PortalPrincipal,
  studentId: string,
): Promise<PortalRegistration[]> {
  return readAsStudent(principal, studentId, (tx) =>
    registrationsInTx(tx, principal.tenantId, studentId),
  );
}

export interface PortalCard {
  card: RegistrationCard;
  letterhead: Letterhead;
}

/**
 * The registration card, for the student to print (REQ-REG-05, REQ-LP-05).
 *
 * The same card, with the same QR token, that D3 draws and D5 prints at the
 * registry desk. It resolves to the same sessionless `/verify/registration`
 * page C2 built, so a card a student printed at midnight verifies exactly as
 * one a registrar handed them across a counter. There is not a student
 * version and an official version — that distinction is what makes a printed
 * proof worthless.
 *
 * The letterhead is loaded under `withTenant` before the confined transaction
 * opens, and handed to the card, because the portal is refused the `tenants`
 * row. Nothing on a letterhead is a secret: every fact on it is on the
 * university's own contact page.
 */
export async function portalCard(
  principal: PortalPrincipal,
  studentId: string,
  registrationId: string,
): Promise<PortalCard> {
  const letterhead = await letterheadForTenant(principal.tenantId);

  const card = await readAsStudent(principal, studentId, (tx) =>
    buildRegistrationCard(tx, principal.tenantId, registrationId, {
      nameAr: letterhead.institutionAr,
      nameEn: letterhead.institutionEn,
      logoUrl: letterhead.logoUrl,
    }),
  );

  // A registration belonging to another student is not merely absent from the
  // list — the confined transaction cannot see the row at all, so
  // `buildRegistrationCard` raises before this line. The check is stated
  // anyway, because a reader of this function should not have to know the
  // policy to know the answer.
  return { card, letterhead };
}

/**
 * The document checklist, shown to the person who has to go and find the
 * documents.
 *
 * B3 built it for a registrar chasing them. This is the same checklist, not a
 * summary of it: the same mandatory flags, the same expiry rule where a
 * passport verified in 2024 and expired in 2025 counts as missing rather than
 * done.
 *
 * **Uploading is not here.** The object-storage endpoint does not exist —
 * it is the same one A2's voucher attachments, B3's student documents, C1's
 * media library, D3's photo capture, D4's branding logos, D5's student card
 * and C2's national-ID page are all waiting on, and this is the eighth
 * surface. The page says so in words rather than showing a control that does
 * nothing.
 */
export async function portalDocuments(
  principal: PortalPrincipal,
  studentId: string,
  asOf: Date = new Date(),
): Promise<Checklist> {
  return readAsStudent(principal, studentId, (tx) =>
    buildChecklist(tx, principal.tenantId, studentId, asOf),
  );
}
