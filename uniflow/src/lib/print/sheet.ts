/**
 * The print surface's shared shape (Track D5).
 *
 * ## Why this module has no server imports
 *
 * Two renderers produce printed paper here, and they cannot be one renderer.
 *
 *   · **Reports** are rendered by `reports/render.ts` as a **standalone HTML
 *     document** — a string with its own `<head>`, served by a route handler
 *     and openable with no application around it. That is what makes an
 *     export a file somebody can keep.
 *   · **Documents** — the receipt, the voucher, the registration card, the
 *     offer letter, the profile card, the sponsor invoice — are React pages
 *     inside the console, because each one is reached from the screen that
 *     produced it and carries controls beside it.
 *
 * What must not be two implementations is the **letterhead itself**: the
 * institution's name as it appears at the top of an official document, its
 * address, its logo, and the block at the bottom where somebody signs. A
 * receipt whose letterhead says one thing and a trial balance whose letterhead
 * says another are two documents from two universities as far as a reader is
 * concerned.
 *
 * So the *content* and the *geometry* live here, in a module neither runtime
 * has to fake, and each renderer draws it in its own idiom. Exactly the shape
 * of `lib/currency.ts` and `lib/cms/theme.ts`, and for the same reason.
 */

export interface Letterhead {
  institutionAr: string;
  institutionEn: string;
  /** NC, RU — as it appears on a certificate or an ID card. */
  shortCode: string;
  mottoAr: string | null;
  mottoEn: string | null;
  logoUrl: string | null;
  /** Address, city, phone, email — already ordered, already non-empty. */
  linesAr: string[];
  linesEn: string[];
}

/**
 * A letterhead for a tenant that has told us nothing.
 *
 * Not an error and not an empty header: a document still has to print, and a
 * university that has not filled in its address has an address anyway. The
 * name is the one thing that is always known, so the name is what remains.
 */
export function bareLetterhead(nameAr: string, nameEn: string): Letterhead {
  return {
    institutionAr: nameAr,
    institutionEn: nameEn,
    shortCode: '',
    mottoAr: null,
    mottoEn: null,
    logoUrl: null,
    linesAr: [],
    linesEn: [],
  };
}

/** The side of a bilingual document a locale reads from. */
export function pickLines(l: Letterhead, locale: 'ar' | 'en'): string[] {
  return locale === 'ar' ? l.linesAr : l.linesEn;
}

export function institutionName(l: Letterhead, locale: 'ar' | 'en'): string {
  return locale === 'ar' ? l.institutionAr : l.institutionEn;
}

// ---------------------------------------------------------------------------
// Signature blocks
// ---------------------------------------------------------------------------

/**
 * Who signs what.
 *
 * A signature line is not decoration. On a receipt it is the cashier
 * acknowledging money they are now accountable for; on a voucher it is the
 * approval the segregation matrix already enforced, written down where an
 * auditor pulling a paper file can see it. The two must agree, which is why
 * the roles are declared here rather than typed into each template.
 *
 * `PREPARED` is filled from the document itself where the system knows who
 * prepared it. The rest print as ruled lines, because the person signing is
 * standing at a desk with a pen and the system does not know their name until
 * they write it.
 */
export type SignatureRole =
  | 'PREPARED'
  | 'RECEIVED'
  | 'CHECKED'
  | 'APPROVED'
  | 'AUTHORISED'
  | 'REGISTRAR'
  | 'STUDENT';

export interface SignatureSlot {
  role: SignatureRole;
  labelAr: string;
  labelEn: string;
  /** A name the system already knows, printed above the rule. */
  name?: string | null;
}

const SIGNATURE_LABELS: Record<SignatureRole, { ar: string; en: string }> = {
  PREPARED: { ar: 'أعدّه', en: 'Prepared by' },
  RECEIVED: { ar: 'استلمه', en: 'Received by' },
  CHECKED: { ar: 'راجعه', en: 'Checked by' },
  APPROVED: { ar: 'اعتمده', en: 'Approved by' },
  AUTHORISED: { ar: 'أذن به', en: 'Authorised by' },
  REGISTRAR: { ar: 'المسجّل', en: 'Registrar' },
  STUDENT: { ar: 'توقيع الطالب', en: "Student's signature" },
};

export function signature(role: SignatureRole, name?: string | null): SignatureSlot {
  return {
    role,
    labelAr: SIGNATURE_LABELS[role].ar,
    labelEn: SIGNATURE_LABELS[role].en,
    name: name ?? null,
  };
}

export function signatureLabel(slot: SignatureSlot, locale: 'ar' | 'en'): string {
  return locale === 'ar' ? slot.labelAr : slot.labelEn;
}

// ---------------------------------------------------------------------------
// Page geometry
// ---------------------------------------------------------------------------

/**
 * Page setup, in one place because a document printed at a different margin
 * from the one beside it in the same file looks like two systems.
 *
 * A4 rather than Letter: both pilot institutions are in Sudan, every printer
 * in the building is loaded with A4, and a document laid out for Letter loses
 * its footer on the short page.
 *
 * Portrait for documents, landscape for reports. A receipt is a column of
 * facts and a trial balance is six columns of figures, and forcing either into
 * the other's orientation is what produces a report nobody can read at arm's
 * length.
 */
export const PAGE = {
  documentSize: 'A4 portrait',
  reportSize: 'A4 landscape',
  /** top, sides, bottom. The bottom is deeper because the footer sits in it. */
  documentMargin: '16mm 16mm 20mm',
  reportMargin: '14mm 12mm 16mm',
} as const;

/**
 * A document reference as it prints: a number that means something to whoever
 * is holding it.
 *
 * Deliberately not the UUID. A receipt number is what a student quotes on the
 * telephone, and a primary key is what a developer quotes in a bug report.
 */
export interface DocumentRef {
  /** Already in the reader's language, from the `print` catalogue. The sheet
   *  does not translate it: the labels exist there once, and a second pair of
   *  Arabic and English strings passed in per document is a second catalogue
   *  nobody would think to check against the first. */
  numberLabel: string;
  number: string;
  dateLabel: string;
  date: string;
}
