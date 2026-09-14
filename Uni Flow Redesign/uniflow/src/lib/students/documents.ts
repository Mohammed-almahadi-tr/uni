import 'server-only';
import type { DocumentState } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { toDateOnly } from '@/lib/ledger/period';

/**
 * Student documents and per-programme checklists (SRS REQ-ST-05).
 *
 * There is no file handling anywhere in the legacy codebase — no
 * `OpenFileDialog`, no `PictureBox` bound to a column, no binary column in any
 * insert. Certificates and ID scans lived in a filing cabinet, which is why
 * "verified" was never a state the system could hold and why a registrar
 * chasing a missing passport had nothing to consult.
 *
 * Two rules make this more than a file list:
 *
 *   · **Documents supersede; they are not replaced.** Re-uploading a passport
 *     retires the previous row and inserts a new one. A partial unique index
 *     allows exactly one live document per type per student. The legacy
 *     student screen ran `Delete From StudentsProfilees Where StudentIndex=…`
 *     and then inserted, on an autocommit connection — the third screen in
 *     that codebase found doing precisely this.
 *
 *   · **The verifier is never the uploader**, enforced by CHECK. A certificate
 *     uploaded and marked verified by one person has been checked by nobody,
 *     and a forged secondary certificate is the cheapest fraud available
 *     against an admissions office.
 */

export class DocumentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DocumentError';
  }
}

/** 10 MiB. A scan of a certificate is well under this; anything larger is a
 *  photograph nobody downsized, and the object store pays for it forever. */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
]);

const SHA256 = /^[0-9a-f]{64}$/;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export interface DocumentTypeInput {
  code: string;
  nameAr: string;
  nameEn: string;
  requiresExpiry?: boolean;
  sortOrder?: number;
}

export async function createDocumentType(
  principal: Principal,
  input: DocumentTypeInput,
): Promise<{ id: string; code: string }> {
  requirePermission(principal, 'academic.manage');

  const code = input.code.trim().toUpperCase();
  if (!code) throw new DocumentError('A document type needs a code.');

  return withTenant(principal.tenantId, async (tx) => {
    const created = await tx.documentType.create({
      data: {
        tenantId: principal.tenantId,
        code,
        nameAr: input.nameAr.trim(),
        nameEn: input.nameEn.trim(),
        requiresExpiry: input.requiresExpiry ?? false,
        sortOrder: input.sortOrder ?? 0,
      },
      select: { id: true, code: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'document_type',
      resourceId: created.id,
      after: { code, nameEn: input.nameEn },
    });

    return created;
  });
}

export interface RequirementInput {
  documentTypeId: string;
  isMandatory?: boolean;
}

/**
 * Declare which documents a programme requires.
 *
 * Additive and idempotent: naming a type that is already required updates
 * whether it is mandatory. Types **not** named are left alone rather than
 * removed — removing a requirement is `dropProgrammeRequirement`, a separate
 * and deliberate act. A save that silently deletes what is not on screen is
 * the exact defect B1 and B2 both found, and this is the shape of code where
 * it happens.
 */
export async function setProgrammeRequirements(
  principal: Principal,
  programmeId: string,
  entries: RequirementInput[],
): Promise<{ added: number; updated: number }> {
  requirePermission(principal, 'academic.manage');

  return withTenant(principal.tenantId, async (tx) => {
    let added = 0;
    let updated = 0;

    for (const e of entries) {
      const existing = await tx.programmeDocumentRequirement.findUnique({
        where: {
          tenantId_programmeId_documentTypeId: {
            tenantId: principal.tenantId,
            programmeId,
            documentTypeId: e.documentTypeId,
          },
        },
        select: { id: true, isMandatory: true },
      });

      if (existing) {
        if (existing.isMandatory !== (e.isMandatory ?? true)) {
          await tx.programmeDocumentRequirement.update({
            where: { id: existing.id },
            data: { isMandatory: e.isMandatory ?? true },
          });
          updated += 1;
        }
        continue;
      }

      await tx.programmeDocumentRequirement.create({
        data: {
          tenantId: principal.tenantId,
          programmeId,
          documentTypeId: e.documentTypeId,
          isMandatory: e.isMandatory ?? true,
        },
      });
      added += 1;
    }

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'programme_document_requirements',
      resourceId: programmeId,
      after: { added, updated, declared: entries.length },
    });

    return { added, updated };
  });
}

export async function dropProgrammeRequirement(
  principal: Principal,
  programmeId: string,
  documentTypeId: string,
): Promise<void> {
  requirePermission(principal, 'academic.manage');

  await withTenant(principal.tenantId, async (tx) => {
    await tx.programmeDocumentRequirement.deleteMany({
      where: { tenantId: principal.tenantId, programmeId, documentTypeId },
    });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'DELETE',
      resourceType: 'programme_document_requirement',
      resourceId: `${programmeId}:${documentTypeId}`,
      before: { programmeId, documentTypeId },
    });
  });
}

// ---------------------------------------------------------------------------
// Upload
// ---------------------------------------------------------------------------

export interface UploadInput {
  studentId: string;
  documentTypeId: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  /** Object-storage path. The bytes are written there before this is called. */
  storageKey: string;
  /** Digest of the stored bytes, lowercase hex. */
  sha256: string;
  issuedOn?: Date | null;
  expiresOn?: Date | null;
}

export interface UploadResult {
  id: string;
  supersededId: string | null;
}

export async function uploadDocument(
  principal: Principal,
  input: UploadInput,
): Promise<UploadResult> {
  requirePermission(principal, 'student.manage');

  if (!input.fileName.trim()) throw new DocumentError('A document needs a file name.');
  if (!ALLOWED_CONTENT_TYPES.has(input.contentType)) {
    throw new DocumentError(
      `${input.contentType} is not accepted. Documents are PDF or an image ` +
        `(JPEG, PNG, WebP, TIFF) — the formats a scanner and a phone produce.`,
    );
  }
  if (!Number.isInteger(input.byteSize) || input.byteSize <= 0) {
    throw new DocumentError('An empty upload is not a document.');
  }
  if (input.byteSize > MAX_DOCUMENT_BYTES) {
    throw new DocumentError(
      `${(input.byteSize / 1024 / 1024).toFixed(1)} MB exceeds the ` +
        `${MAX_DOCUMENT_BYTES / 1024 / 1024} MB limit.`,
    );
  }
  if (!SHA256.test(input.sha256)) {
    throw new DocumentError(
      'The content digest must be 64 lowercase hex characters. It is what lets a ' +
        'later audit prove the file served today is the file that was verified.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: input.studentId },
      select: { tenantId: true },
    });
    if (!student || student.tenantId !== principal.tenantId) {
      throw new DocumentError('Student not found in this tenant.');
    }

    // Retire the live document of this type first. Not deleted: a replaced
    // passport scan is the evidence of what was checked last year.
    const live = await tx.studentDocument.findFirst({
      where: {
        tenantId: principal.tenantId,
        studentId: input.studentId,
        documentTypeId: input.documentTypeId,
        supersededAt: null,
      },
      select: { id: true },
    });
    if (live) {
      await tx.studentDocument.update({
        where: { id: live.id },
        data: { supersededAt: new Date() },
      });
    }

    const doc = await tx.studentDocument.create({
      data: {
        tenantId: principal.tenantId,
        studentId: input.studentId,
        documentTypeId: input.documentTypeId,
        fileName: input.fileName.trim(),
        contentType: input.contentType,
        byteSize: input.byteSize,
        storageKey: input.storageKey,
        sha256: input.sha256,
        issuedOn: input.issuedOn ? toDateOnly(input.issuedOn) : null,
        expiresOn: input.expiresOn ? toDateOnly(input.expiresOn) : null,
        uploadedById: principal.userId,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'student_document',
      resourceId: doc.id,
      after: {
        studentId: input.studentId,
        documentTypeId: input.documentTypeId,
        fileName: input.fileName.trim(),
        sha256: input.sha256,
        supersededId: live?.id ?? null,
      },
    });

    return { id: doc.id, supersededId: live?.id ?? null };
  });
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

async function decide(
  principal: Principal,
  documentId: string,
  state: Extract<DocumentState, 'VERIFIED' | 'REJECTED'>,
  reason: string | null,
): Promise<void> {
  requirePermission(principal, 'document.verify');

  await withTenant(principal.tenantId, async (tx) => {
    const doc = await tx.studentDocument.findUnique({
      where: { id: documentId },
      select: {
        tenantId: true,
        fileName: true,
        state: true,
        supersededAt: true,
        uploadedById: true,
      },
    });
    if (!doc || doc.tenantId !== principal.tenantId) {
      throw new DocumentError('Document not found in this tenant.');
    }
    if (doc.supersededAt) {
      throw new DocumentError(
        `${doc.fileName} was replaced by a newer upload. Check that one instead.`,
      );
    }
    if (doc.state !== 'PENDING') {
      throw new DocumentError(
        `${doc.fileName} is already ${doc.state.toLowerCase()}. To change that verdict, ` +
          `have the document uploaded again — a verification is a statement about a ` +
          `file at a moment, not a switch.`,
      );
    }
    if (doc.uploadedById === principal.userId) {
      throw new DocumentError(
        `You uploaded ${doc.fileName}, so you cannot be the one who checks it. ` +
          `A document verified by the person who supplied it has been verified by nobody.`,
      );
    }

    await tx.studentDocument.update({
      where: { id: documentId },
      data: {
        state,
        verifiedById: principal.userId,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'student_document',
      resourceId: documentId,
      before: { state: doc.state },
      after: { state, rejectionReason: reason },
    });
  });
}

export async function verifyDocument(
  principal: Principal,
  documentId: string,
): Promise<void> {
  return decide(principal, documentId, 'VERIFIED', null);
}

/**
 * Reject a document, with the reason the student will be shown.
 *
 * Mandatory, and enforced by CHECK as well as here. A rejection with no reason
 * is one the student cannot act on, and they will be back at the counter
 * asking what was wrong with it.
 */
export async function rejectDocument(
  principal: Principal,
  documentId: string,
  reason: string,
): Promise<void> {
  if (!reason?.trim()) {
    throw new DocumentError(
      'A rejection needs a reason — it is the only thing that tells the student ' +
        'what to bring back.',
    );
  }
  return decide(principal, documentId, 'REJECTED', reason.trim());
}

// ---------------------------------------------------------------------------
// Checklist
// ---------------------------------------------------------------------------

/** What the registrar sees against one required document. */
export type ChecklistState =
  | 'MISSING'
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'EXPIRED';

export interface ChecklistRow {
  documentTypeId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  isMandatory: boolean;
  state: ChecklistState;
  documentId: string | null;
  fileName: string | null;
  expiresOn: Date | null;
  rejectionReason: string | null;
}

export interface Checklist {
  rows: ChecklistRow[];
  /** True when every mandatory row is VERIFIED and unexpired. */
  satisfied: boolean;
  /** Mandatory rows that are not. Named, so the answer is actionable. */
  outstanding: string[];
}

/**
 * The document checklist for a student, against their programme's
 * requirements (REQ-ST-05).
 *
 * `EXPIRED` outranks `VERIFIED`: a passport verified in 2024 and expired in
 * 2025 is not a satisfied requirement, and a checklist that says otherwise is
 * how a university discovers in June that its foreign students are out of
 * status.
 */
export async function documentChecklist(
  principal: Principal,
  studentId: string,
  asOf: Date = new Date(),
): Promise<Checklist> {
  requirePermission(principal, 'student.read');

  return withTenant(principal.tenantId, (tx) =>
    buildChecklist(tx, principal.tenantId, studentId, asOf),
  );
}

/**
 * The same checklist, inside a transaction the caller already holds.
 *
 * The student portal (C3) shows it to the person who has to go and find the
 * documents, which is the audience it was always for — B3 built it for a
 * registrar chasing them. Shared rather than reimplemented, so a student is
 * never told they are missing a different set of papers than the registry
 * office is chasing them for.
 */
export async function buildChecklist(
  tx: Tx,
  tenantId: string,
  studentId: string,
  asOf: Date = new Date(),
): Promise<Checklist> {
  const today = toDateOnly(asOf);

  const student = await tx.student.findUnique({
    where: { id: studentId },
    select: { tenantId: true, programmeId: true },
  });
  if (!student || student.tenantId !== tenantId) {
    throw new DocumentError('Student not found in this tenant.');
  }

  const requirements = student.programmeId
    ? await tx.programmeDocumentRequirement.findMany({
        where: { tenantId: tenantId, programmeId: student.programmeId },
        select: { documentTypeId: true, isMandatory: true },
      })
    : [];

  const documents = await tx.studentDocument.findMany({
    where: { tenantId: tenantId, studentId, supersededAt: null },
    select: {
      id: true,
      documentTypeId: true,
      fileName: true,
      state: true,
      expiresOn: true,
      rejectionReason: true,
    },
  });

  // Every required type, plus any type the student has uploaded that the
  // programme does not require — a document on file that nothing asks for is
  // still a document on file, and hiding it is how it gets uploaded twice.
  const typeIds = new Set<string>([
    ...requirements.map((r) => r.documentTypeId),
    ...documents.map((d) => d.documentTypeId),
  ]);
  if (typeIds.size === 0) return { rows: [], satisfied: true, outstanding: [] };

  const types = await tx.documentType.findMany({
    where: { tenantId: tenantId, id: { in: [...typeIds] } },
    select: { id: true, code: true, nameAr: true, nameEn: true, sortOrder: true },
    orderBy: { sortOrder: 'asc' },
  });

  const mandatory = new Map(requirements.map((r) => [r.documentTypeId, r.isMandatory]));
  const byType = new Map(documents.map((d) => [d.documentTypeId, d]));

  const rows: ChecklistRow[] = types.map((t) => {
    const doc = byType.get(t.id);
    let state: ChecklistState = 'MISSING';
    if (doc) {
      if (doc.expiresOn && doc.expiresOn.getTime() < today.getTime()) {
        state = 'EXPIRED';
      } else {
        state = doc.state;
      }
    }
    return {
      documentTypeId: t.id,
      code: t.code,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      // A type the student uploaded that the programme does not list is not
      // mandatory; it is simply present.
      isMandatory: mandatory.get(t.id) ?? false,
      state,
      documentId: doc?.id ?? null,
      fileName: doc?.fileName ?? null,
      expiresOn: doc?.expiresOn ?? null,
      rejectionReason: doc?.rejectionReason ?? null,
    };
  });

  const outstanding = rows
    .filter((r) => r.isMandatory && r.state !== 'VERIFIED')
    .map((r) => r.nameEn);

  return { rows, satisfied: outstanding.length === 0, outstanding };
}

export interface ExpiringDocument {
  documentId: string;
  studentId: string;
  studentNo: string;
  fullNameEn: string;
  code: string;
  fileName: string;
  expiresOn: Date;
}

/**
 * Documents that have expired or will within `withinDays`.
 *
 * The reason `requires_expiry` exists at all: a renewable document with no
 * expiry cannot appear here, so the trigger that demands one is what makes
 * this report complete rather than merely non-empty.
 */
export async function expiringDocuments(
  principal: Principal,
  opts: { withinDays?: number; asOf?: Date } = {},
): Promise<ExpiringDocument[]> {
  requirePermission(principal, 'student.read');

  const asOf = toDateOnly(opts.asOf ?? new Date());
  const horizon = new Date(asOf);
  horizon.setUTCDate(horizon.getUTCDate() + (opts.withinDays ?? 60));

  return withTenant(principal.tenantId, async (tx) => {
    const docs = await tx.studentDocument.findMany({
      where: {
        tenantId: principal.tenantId,
        supersededAt: null,
        expiresOn: { not: null, lte: horizon },
      },
      select: {
        id: true,
        studentId: true,
        fileName: true,
        expiresOn: true,
        documentTypeId: true,
      },
      orderBy: { expiresOn: 'asc' },
    });
    if (docs.length === 0) return [];

    const students = await tx.student.findMany({
      where: { id: { in: [...new Set(docs.map((d) => d.studentId))] } },
      select: { id: true, studentNo: true, fullNameEn: true },
    });
    const types = await tx.documentType.findMany({
      where: { id: { in: [...new Set(docs.map((d) => d.documentTypeId))] } },
      select: { id: true, code: true },
    });

    const byStudent = new Map(students.map((s) => [s.id, s]));
    const byType = new Map(types.map((t) => [t.id, t.code]));

    return docs.map((d) => ({
      documentId: d.id,
      studentId: d.studentId,
      studentNo: byStudent.get(d.studentId)?.studentNo ?? '',
      fullNameEn: byStudent.get(d.studentId)?.fullNameEn ?? '',
      code: byType.get(d.documentTypeId) ?? '',
      fileName: d.fileName,
      expiresOn: d.expiresOn as Date,
    }));
  });
}
