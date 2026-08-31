import 'server-only';
import { withTenant } from '@/lib/db/client';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import type { PaymentChannel } from '@/generated/prisma/enums';

/**
 * The reads behind the printed documents (Track D5).
 *
 * D2, D3 and D4 each built the screen that *produces* one of these and left
 * the printed form to here. What they have in common is the shape of the read:
 * one row by id, its lines, and the names of everything it points at — because
 * a printed document has no dropdowns to resolve a foreign key against later.
 *
 * Every function is gated on the permission of the screen the document belongs
 * to, never on a looser "print" permission. Whoever may read a receipt may
 * print one; nobody gains a new capability by walking through the print
 * surface, which is exactly what a separate print role would create.
 *
 * ## What none of these do
 *
 * Arithmetic. Every figure is stored, and a document that recomputed a total
 * would eventually print a different one from the screen that produced it —
 * which is what the legacy build did on `frmStudantReceiptVoucher`, where the
 * printed receipt summed the grid again and the ledger had already been
 * written from a different sum.
 */

export interface ReceiptDocumentLine {
  chargeId: string;
  feeCode: string;
  feeNameAr: string;
  feeNameEn: string;
  termLabel: string | null;
  amount: string;
}

export interface ReceiptDocument {
  id: string;
  receiptNo: string;
  docDate: string;
  channel: PaymentChannel;
  amount: string;
  currency: string;
  reference: string | null;
  allocated: string;
  /** What was taken and not matched to a charge — the student's credit. */
  unallocated: string;
  cheque: {
    chequeNo: string;
    bank: string | null;
    branch: string | null;
    dueDate: string | null;
    drawer: string | null;
  } | null;
  student: {
    id: string;
    studentNo: string;
    fullNameAr: string;
    fullNameEn: string;
    programmeNameAr: string | null;
    programmeNameEn: string | null;
  };
  cashierName: string;
  lines: ReceiptDocumentLine[];
  /**
   * A receipt that is no longer good, and why. Printed **on the document**
   * rather than withheld: a cancelled receipt still exists, the student may
   * still be holding their copy, and the useful thing to hand them is a page
   * that says so.
   */
  voided: { kind: 'CANCELLED' | 'DISHONOURED'; at: string; reason: string | null } | null;
}

export async function receiptDocument(
  principal: Principal,
  receiptId: string,
): Promise<ReceiptDocument | null> {
  requirePermission(principal, 'receipt.create');

  return withTenant(principal.tenantId, async (tx) => {
    const r = await tx.studentReceipt.findUnique({
      where: { id: receiptId },
      select: {
        id: true,
        tenantId: true,
        receiptNo: true,
        docDate: true,
        channel: true,
        amount: true,
        currency: true,
        reference: true,
        allocatedAmount: true,
        chequeNo: true,
        chequeBank: true,
        chequeBranch: true,
        chequeDueDate: true,
        drawerName: true,
        cancelledAt: true,
        cancellationReason: true,
        dishonouredAt: true,
        cashier: { select: { fullName: true } },
        student: {
          select: {
            id: true,
            studentNo: true,
            fullNameAr: true,
            fullNameEn: true,
            programme: { select: { nameAr: true, nameEn: true } },
          },
        },
        allocations: {
          orderBy: { createdAt: 'asc' },
          select: {
            amount: true,
            charge: {
              select: {
                id: true,
                termLabel: true,
                feeItem: { select: { code: true, nameAr: true, nameEn: true } },
              },
            },
          },
        },
      },
    });
    if (!r || r.tenantId !== principal.tenantId) return null;

    return {
      id: r.id,
      receiptNo: r.receiptNo,
      docDate: iso(r.docDate),
      channel: r.channel,
      amount: r.amount.toFixed(4),
      currency: r.currency.trim(),
      reference: r.reference,
      allocated: r.allocatedAmount.toFixed(4),
      unallocated: r.amount.minus(r.allocatedAmount).toFixed(4),
      cheque: r.chequeNo
        ? {
            chequeNo: r.chequeNo,
            bank: r.chequeBank,
            branch: r.chequeBranch,
            dueDate: r.chequeDueDate ? iso(r.chequeDueDate) : null,
            drawer: r.drawerName,
          }
        : null,
      student: {
        id: r.student.id,
        studentNo: r.student.studentNo,
        fullNameAr: r.student.fullNameAr,
        fullNameEn: r.student.fullNameEn,
        programmeNameAr: r.student.programme?.nameAr ?? null,
        programmeNameEn: r.student.programme?.nameEn ?? null,
      },
      cashierName: r.cashier.fullName,
      lines: r.allocations.map((a) => ({
        chargeId: a.charge.id,
        feeCode: a.charge.feeItem.code,
        feeNameAr: a.charge.feeItem.nameAr,
        feeNameEn: a.charge.feeItem.nameEn,
        termLabel: a.charge.termLabel,
        amount: a.amount.toFixed(4),
      })),
      // Dishonour is checked first: a receipt can be both, and the bank
      // refusing the money is the more consequential of the two.
      voided: r.dishonouredAt
        ? { kind: 'DISHONOURED', at: iso(r.dishonouredAt), reason: null }
        : r.cancelledAt
          ? { kind: 'CANCELLED', at: iso(r.cancelledAt), reason: r.cancellationReason }
          : null,
    };
  });
}

// ---------------------------------------------------------------------------
// Offer of admission (SRS REQ-ADM-04, the template B2 deferred)
// ---------------------------------------------------------------------------

export interface OfferLetter {
  id: string;
  state: string;
  applicationNo: string;
  applicantNameAr: string;
  applicantNameEn: string;
  programmeNameAr: string;
  programmeNameEn: string;
  facultyNameAr: string;
  facultyNameEn: string;
  batchNameAr: string;
  batchNameEn: string;
  admissionCategoryAr: string;
  admissionCategoryEn: string;
  issuedOn: string;
  acceptBy: string;
  conditions: string | null;
  depositRequired: string | null;
  depositPaid: boolean;
  currency: string;
  issuedByName: string;
}

export async function offerLetter(
  principal: Principal,
  offerId: string,
): Promise<OfferLetter | null> {
  requirePermission(principal, 'application.offer');

  return withTenant(principal.tenantId, async (tx) => {
    const o = await tx.admissionOffer.findUnique({
      where: { id: offerId },
      select: {
        id: true,
        tenantId: true,
        state: true,
        issuedAt: true,
        acceptBy: true,
        conditions: true,
        depositRequired: true,
        depositPaidAt: true,
        issuedBy: { select: { fullName: true } },
        programme: {
          select: {
            nameAr: true,
            nameEn: true,
            faculty: { select: { nameAr: true, nameEn: true } },
          },
        },
        application: {
          select: {
            applicationNo: true,
            fullNameAr: true,
            fullNameEn: true,
            batch: { select: { nameAr: true, nameEn: true } },
            admissionCategory: { select: { nameAr: true, nameEn: true } },
          },
        },
      },
    });
    if (!o || o.tenantId !== principal.tenantId) return null;

    const { functionalCurrency } = await tx.tenant.findUniqueOrThrow({
      where: { id: principal.tenantId },
      select: { functionalCurrency: true },
    });

    return {
      id: o.id,
      state: o.state,
      applicationNo: o.application.applicationNo,
      applicantNameAr: o.application.fullNameAr,
      applicantNameEn: o.application.fullNameEn,
      programmeNameAr: o.programme.nameAr,
      programmeNameEn: o.programme.nameEn,
      facultyNameAr: o.programme.faculty.nameAr,
      facultyNameEn: o.programme.faculty.nameEn,
      batchNameAr: o.application.batch.nameAr,
      batchNameEn: o.application.batch.nameEn,
      admissionCategoryAr: o.application.admissionCategory.nameAr,
      admissionCategoryEn: o.application.admissionCategory.nameEn,
      issuedOn: iso(o.issuedAt),
      acceptBy: iso(o.acceptBy),
      conditions: o.conditions,
      depositRequired: o.depositRequired ? o.depositRequired.toFixed(4) : null,
      depositPaid: o.depositPaidAt !== null,
      currency: functionalCurrency.trim(),
      issuedByName: o.issuedBy.fullName,
    };
  });
}

// ---------------------------------------------------------------------------
// Sponsor invoice (SRS REQ-SPN-02)
// ---------------------------------------------------------------------------

export interface SponsorInvoiceLine {
  studentNo: string;
  studentNameAr: string;
  studentNameEn: string;
  feeNameAr: string;
  feeNameEn: string;
  termLabel: string | null;
  amount: string;
}

export interface SponsorInvoiceDocument {
  id: string;
  invoiceNo: string;
  status: string;
  docDate: string;
  dueDate: string;
  periodFrom: string;
  periodTo: string;
  currency: string;
  totalAmount: string;
  settledAmount: string;
  outstanding: string;
  sponsor: {
    code: string;
    nameAr: string;
    nameEn: string;
    contactName: string | null;
    billingAddress: string | null;
  };
  lines: SponsorInvoiceLine[];
  preparedByName: string;
}

/**
 * The bill a ministry is sent.
 *
 * Every line names **the student it is for**, because that is the question the
 * sponsor's own accounts department asks and the legacy build could not
 * answer: a sponsorship there was a discount typed onto a registration, so
 * there was nothing to invoice and the university chased ministries by
 * telephone against a list somebody kept privately.
 */
export async function sponsorInvoiceDocument(
  principal: Principal,
  invoiceId: string,
): Promise<SponsorInvoiceDocument | null> {
  requirePermission(principal, 'sponsor.invoice');

  return withTenant(principal.tenantId, async (tx) => {
    const inv = await tx.sponsorInvoice.findUnique({
      where: { id: invoiceId },
      select: {
        id: true,
        tenantId: true,
        invoiceNo: true,
        status: true,
        docDate: true,
        dueDate: true,
        periodFrom: true,
        periodTo: true,
        currency: true,
        totalAmount: true,
        settledAmount: true,
        createdBy: { select: { fullName: true } },
        sponsor: {
          select: {
            code: true,
            nameAr: true,
            nameEn: true,
            contactName: true,
            billingAddress: true,
          },
        },
        shares: {
          orderBy: { createdAt: 'asc' },
          select: {
            amount: true,
            charge: {
              select: {
                termLabel: true,
                feeItem: { select: { nameAr: true, nameEn: true } },
                student: {
                  select: { studentNo: true, fullNameAr: true, fullNameEn: true },
                },
              },
            },
          },
        },
      },
    });
    if (!inv || inv.tenantId !== principal.tenantId) return null;

    return {
      id: inv.id,
      invoiceNo: inv.invoiceNo,
      status: inv.status,
      docDate: iso(inv.docDate),
      dueDate: iso(inv.dueDate),
      periodFrom: iso(inv.periodFrom),
      periodTo: iso(inv.periodTo),
      currency: inv.currency.trim(),
      totalAmount: inv.totalAmount.toFixed(4),
      settledAmount: inv.settledAmount.toFixed(4),
      outstanding: inv.totalAmount.minus(inv.settledAmount).toFixed(4),
      sponsor: inv.sponsor,
      lines: inv.shares.map((s) => ({
        studentNo: s.charge.student.studentNo,
        studentNameAr: s.charge.student.fullNameAr,
        studentNameEn: s.charge.student.fullNameEn,
        feeNameAr: s.charge.feeItem.nameAr,
        feeNameEn: s.charge.feeItem.nameEn,
        termLabel: s.charge.termLabel,
        amount: s.amount.toFixed(4),
      })),
      preparedByName: inv.createdBy.fullName,
    };
  });
}

// ---------------------------------------------------------------------------
// Student card (SRS REQ-ST-01)
// ---------------------------------------------------------------------------

export interface ProfileCard {
  studentId: string;
  studentNo: string;
  fullNameAr: string;
  fullNameEn: string;
  status: string;
  nationalId: string | null;
  passportNo: string | null;
  dateOfBirth: string | null;
  placeOfBirth: string | null;
  gender: string | null;
  programmeNameAr: string | null;
  programmeNameEn: string | null;
  facultyNameAr: string | null;
  facultyNameEn: string | null;
  batchCode: string | null;
  nationalityAr: string | null;
  nationalityEn: string | null;
  emergencyContact: { name: string; phone: string } | null;
}

export async function profileCard(
  principal: Principal,
  studentId: string,
): Promise<ProfileCard | null> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, async (tx) => {
    const s = await tx.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        tenantId: true,
        studentNo: true,
        fullNameAr: true,
        fullNameEn: true,
        status: true,
        nationalId: true,
        programme: {
          select: {
            nameAr: true,
            nameEn: true,
            faculty: { select: { nameAr: true, nameEn: true } },
          },
        },
        batch: { select: { code: true } },
        nationality: { select: { nameAr: true, nameEn: true } },
      },
    });
    if (!s || s.tenantId !== principal.tenantId) return null;

    const p = await tx.studentProfile.findUnique({
      where: { studentId },
      select: {
        dateOfBirth: true,
        placeOfBirth: true,
        gender: true,
        passportNo: true,
        emergencyName: true,
        emergencyPhone: true,
      },
    });

    // No photograph. The card has a ruled box where one belongs, because the
    // object-storage upload endpoint does not exist yet — the same gap B3, D3
    // and D4's branding screen are waiting on. A card printed with a blank
    // frame is a card somebody can affix a photograph to; a card silently
    // laid out as though photographs were never intended is one that has to be
    // redesigned when the endpoint lands.
    //
    // No blood group either. It lives on the medical record, and reading that
    // needs `medical.read` — which a registrar printing a card does not hold
    // and should not need to be given.
    return {
      studentId: s.id,
      studentNo: s.studentNo,
      fullNameAr: s.fullNameAr,
      fullNameEn: s.fullNameEn,
      status: s.status,
      nationalId: s.nationalId,
      passportNo: p?.passportNo ?? null,
      dateOfBirth: p?.dateOfBirth ? iso(p.dateOfBirth) : null,
      placeOfBirth: p?.placeOfBirth ?? null,
      gender: p?.gender ?? null,
      programmeNameAr: s.programme?.nameAr ?? null,
      programmeNameEn: s.programme?.nameEn ?? null,
      facultyNameAr: s.programme?.faculty.nameAr ?? null,
      facultyNameEn: s.programme?.faculty.nameEn ?? null,
      batchCode: s.batch?.code ?? null,
      nationalityAr: s.nationality?.nameAr ?? null,
      nationalityEn: s.nationality?.nameEn ?? null,
      emergencyContact:
        p?.emergencyName && p.emergencyPhone
          ? { name: p.emergencyName, phone: p.emergencyPhone }
          : null,
    };
  });
}

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}
