import 'server-only';
import { withTenant } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { DraftStateError, NotTheMakerError } from './draft';

/**
 * Supporting documents on a voucher draft.
 *
 * A journal voucher without its evidence is an assertion. The supplier
 * invoice, the bank advice, the signed request — the checker's job is to look
 * at those, and the legacy system had nowhere to put them, so they lived in a
 * lever-arch file that nobody consulted once the voucher was approved.
 *
 * Only the metadata is stored here; the bytes live in object storage under
 * `storageKey` (Supabase Storage in production). The digest is recorded at
 * upload so a later audit can prove the file being served today is the file
 * the checker approved — a storage bucket is not append-only, and this is the
 * cheap way to notice if it changes.
 *
 * Attachments may only be added or removed while the draft is editable. Once
 * it goes for review the bundle is frozen by the same trigger that freezes
 * the lines, because "a checker approves what they were shown" has to include
 * the evidence.
 */

export interface AttachmentInput {
  fileName: string;
  contentType: string;
  byteSize: number;
  /** Path in object storage. Unique across the tenant. */
  storageKey: string;
  /** SHA-256 of the uploaded bytes, lowercase hex. */
  sha256: string;
}

export interface AttachmentRecord {
  id: string;
  fileName: string;
  contentType: string;
  byteSize: number;
  storageKey: string;
  sha256: string;
  uploadedById: string;
  uploadedAt: Date;
}

/** 25 MB. A scanned invoice is under 2 MB; anything far past this is somebody
 *  attaching a video, and object storage costs are per tenant. */
export const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const SHA256_RE = /^[0-9a-f]{64}$/;

export class AttachmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttachmentError';
  }
}

export async function attachToDraft(
  principal: Principal,
  draftId: string,
  input: AttachmentInput,
): Promise<AttachmentRecord> {
  requirePermission(principal, 'voucher.create');

  const fileName = input.fileName?.trim();
  if (!fileName) throw new AttachmentError('An attachment needs a file name.');
  if (!Number.isInteger(input.byteSize) || input.byteSize <= 0) {
    throw new AttachmentError('An attachment needs a positive byte length.');
  }
  if (input.byteSize > MAX_ATTACHMENT_BYTES) {
    throw new AttachmentError(
      `"${fileName}" is ${(input.byteSize / 1024 / 1024).toFixed(1)} MB; the limit is ` +
        `${MAX_ATTACHMENT_BYTES / 1024 / 1024} MB.`,
    );
  }
  if (!SHA256_RE.test(input.sha256)) {
    throw new AttachmentError(
      'An attachment must carry the SHA-256 digest of its bytes, in lowercase hex.',
    );
  }

  return withTenant(principal.tenantId, async (tx) => {
    const draft = await tx.voucherDraft.findUniqueOrThrow({
      where: { id: draftId },
      select: { draftNo: true, state: true, createdById: true },
    });
    if (draft.state !== 'DRAFT' && draft.state !== 'REJECTED') {
      throw new DraftStateError(draft.draftNo, draft.state, ['DRAFT', 'REJECTED']);
    }
    if (draft.createdById !== principal.userId) throw new NotTheMakerError(draft.draftNo);

    const created = await tx.voucherAttachment.create({
      data: {
        tenantId: principal.tenantId,
        draftId,
        fileName,
        contentType: input.contentType.trim(),
        byteSize: input.byteSize,
        storageKey: input.storageKey,
        sha256: input.sha256,
        uploadedById: principal.userId,
      },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        byteSize: true,
        storageKey: true,
        sha256: true,
        uploadedById: true,
        uploadedAt: true,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'voucher.attachment',
      resourceId: created.id,
      after: {
        draftNo: draft.draftNo,
        fileName,
        byteSize: input.byteSize,
        sha256: input.sha256,
      },
    });

    return created;
  });
}

export async function listAttachments(
  principal: Principal,
  draftId: string,
): Promise<AttachmentRecord[]> {
  requirePermission(principal, 'voucher.read');

  return withTenant(principal.tenantId, (tx) =>
    tx.voucherAttachment.findMany({
      where: { draftId, tenantId: principal.tenantId },
      orderBy: { uploadedAt: 'asc' },
      select: {
        id: true,
        fileName: true,
        contentType: true,
        byteSize: true,
        storageKey: true,
        sha256: true,
        uploadedById: true,
        uploadedAt: true,
      },
    }),
  );
}

/**
 * Remove an attachment from a draft that has not been submitted.
 *
 * A hard delete, unlike almost everything else here, and deliberately so: at
 * this point nobody has been asked to review it, so there is nothing to
 * preserve. The moment the draft is submitted the trigger refuses, and from
 * then on the evidence bundle is permanent. The audit entry records the
 * removal either way.
 */
export async function removeAttachment(
  principal: Principal,
  attachmentId: string,
): Promise<void> {
  requirePermission(principal, 'voucher.create');

  await withTenant(principal.tenantId, async (tx) => {
    const att = await tx.voucherAttachment.findUniqueOrThrow({
      where: { id: attachmentId },
      select: {
        fileName: true,
        sha256: true,
        storageKey: true,
        uploadedById: true,
        draft: { select: { draftNo: true, state: true, createdById: true } },
      },
    });
    if (att.draft.state !== 'DRAFT' && att.draft.state !== 'REJECTED') {
      throw new DraftStateError(att.draft.draftNo, att.draft.state, ['DRAFT', 'REJECTED']);
    }
    if (att.draft.createdById !== principal.userId) {
      throw new NotTheMakerError(att.draft.draftNo);
    }

    await tx.voucherAttachment.delete({ where: { id: attachmentId } });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'DELETE',
      resourceType: 'voucher.attachment',
      resourceId: attachmentId,
      before: {
        draftNo: att.draft.draftNo,
        fileName: att.fileName,
        sha256: att.sha256,
        storageKey: att.storageKey,
      },
    });
  });
}
