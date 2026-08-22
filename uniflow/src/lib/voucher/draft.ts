import 'server-only';
import { Prisma } from '@/generated/prisma/client';
import type { DraftState, SourceModule, VoucherType } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import {
  assertNotSelfApproval,
  requirePermission,
  type Principal,
} from '@/lib/auth/rbac';
import type { PermissionKey } from '@/lib/auth/permissions';
import { summariseLines, type LineIssue, type PostingLine } from '@/lib/ledger/lines';
import { checkLinesAgainstChart } from '@/lib/ledger/postability';
import { post, type PostedVoucher } from '@/lib/ledger/posting';
import { resolvePeriod, toDateOnly } from '@/lib/ledger/period';
import { toStorage } from '@/lib/money';
import { allocateDraftNumber } from './numbering';

/**
 * Journal vouchers and the maker-checker workflow (SRS REQ-FIN-04, Track A2).
 *
 * What the legacy system did, in full: a voucher was staged in `TempVouchers`,
 * and "approval" meant inserting its lines into `Transactionees` and then
 *
 *     DELETE FROM TempVouchers WHERE MoveNo = ...
 *
 * (frmApprovingVouchers.vb:941-991). There was no reviewer stage, no reject
 * path, no comment, no record of who approved anything — and the delete
 * destroyed the only evidence that the voucher had ever been reviewed at all.
 * Anyone who could open the approvals screen could approve their own work,
 * because there were no roles.
 *
 * The replacement is a four-state machine with every transition retained:
 *
 *     DRAFT ──submit──> PENDING_REVIEW ──review──> PENDING_APPROVAL ──approve──> POSTED
 *       │                    │                          │
 *       │                    └────── reject ────────────┘
 *       │                                │
 *       │                                v
 *       └──── cancel ──> CANCELLED    REJECTED ──resubmit──> PENDING_REVIEW
 *
 * Four properties are worth calling out, because each closes a specific hole:
 *
 *   1. Drafts are never deleted. Enforced by trigger, not convention.
 *   2. Content is frozen once submitted, so a maker cannot get a clean voucher
 *      through review and then change the lines before approval. Also a
 *      trigger — the attack works against whichever code path forgets.
 *   3. The approver may be neither the maker nor the reviewer, checked against
 *      the actual people who acted on this document rather than against the
 *      roles they happen to hold today.
 *   4. Approval and posting are the same database transaction. A voucher
 *      marked POSTED whose ledger entry rolled back cannot exist.
 */

export class DraftStateError extends Error {
  constructor(
    readonly draftNo: string,
    readonly actual: DraftState,
    readonly expected: readonly DraftState[],
  ) {
    super(
      `Voucher ${draftNo} is ${actual}; this action needs it to be ` +
        `${expected.join(' or ')}. Someone else may have acted on it — reload it.`,
    );
    this.name = 'DraftStateError';
  }
}

export class DraftValidationError extends Error {
  constructor(
    readonly draftNo: string,
    readonly issues: readonly LineIssue[],
  ) {
    super(
      `Voucher ${draftNo} is not ready:\n` +
        issues.map((i) => `  · ${i.message}`).join('\n'),
    );
    this.name = 'DraftValidationError';
  }
}

export class NotTheMakerError extends Error {
  constructor(readonly draftNo: string) {
    super(
      `Voucher ${draftNo} belongs to the person who drafted it. ` +
        `Only they can edit, submit or cancel it.`,
    );
    this.name = 'NotTheMakerError';
  }
}

/**
 * The approver already acted on this document as its reviewer.
 *
 * Distinct from a segregation-of-duties violation, which is about permissions
 * held. This is about what one person actually did to one document — the case
 * the permission matrix cannot see, because the roles may have changed
 * between the two stages, or because a stand-in was granted review rights for
 * an afternoon.
 */
export class DuplicateCheckerError extends Error {
  constructor(readonly draftNo: string) {
    super(
      `You reviewed ${draftNo}, so you cannot also approve it. ` +
        `The second check has to be a second person, or it is not a check.`,
    );
    this.name = 'DuplicateCheckerError';
  }
}

// ---------------------------------------------------------------------------
// Stored line shape
// ---------------------------------------------------------------------------

/**
 * How a proposed line is persisted in `lines_json`.
 *
 * Amounts are strings at ledger scale, never JavaScript numbers. `linesJson`
 * round-trips through `jsonb`, and a numeric there would come back as a
 * double — which is precisely the defect this product exists to fix. The
 * legacy system carried money in VB `Double` from the grid to the database.
 */
export interface StoredLine {
  accountId: string;
  costCenterId: string | null;
  subledgerType: string | null;
  subledgerId: string | null;
  txnCurrency: string | null;
  fxRate: string | null;
  debit: string | null;
  credit: string | null;
  description: string | null;
}

function storeAmount(value: unknown, lineNo: number, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  try {
    return toStorage(value as never).toFixed(4);
  } catch {
    throw new DraftValidationError('(unsaved)', [
      { lineNo, code: 'LINE', message: `Line ${lineNo}: "${String(value)}" is not a valid ${field}.` },
    ]);
  }
}

function storeRate(value: unknown, lineNo: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  try {
    return new Prisma.Decimal(value as never).toString();
  } catch {
    throw new DraftValidationError('(unsaved)', [
      {
        lineNo,
        code: 'LINE',
        message: `Line ${lineNo}: "${String(value)}" is not a valid exchange rate.`,
      },
    ]);
  }
}

function toStored(lines: readonly PostingLine[]): StoredLine[] {
  return lines.map((l, i) => ({
    accountId: l.accountId,
    costCenterId: l.costCenterId ?? null,
    subledgerType: l.subledgerType ?? null,
    subledgerId: l.subledgerId ?? null,
    txnCurrency: l.txnCurrency?.trim() ?? null,
    fxRate: storeRate(l.fxRate, i + 1),
    debit: storeAmount(l.debit, i + 1, 'debit'),
    credit: storeAmount(l.credit, i + 1, 'credit'),
    description: l.description ?? null,
  }));
}

/** Read `lines_json` back into the shape the posting engine takes. */
export function fromStored(value: Prisma.JsonValue): PostingLine[] {
  const rows = (value ?? []) as unknown as StoredLine[];
  return rows.map((r) => ({
    accountId: r.accountId,
    costCenterId: r.costCenterId,
    subledgerType: (r.subledgerType ?? null) as PostingLine['subledgerType'],
    subledgerId: r.subledgerId,
    ...(r.txnCurrency ? { txnCurrency: r.txnCurrency } : {}),
    ...(r.fxRate ? { fxRate: r.fxRate } : {}),
    ...(r.debit ? { debit: r.debit } : {}),
    ...(r.credit ? { credit: r.credit } : {}),
    description: r.description,
  }));
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

const DRAFT_SELECT = {
  id: true,
  draftNo: true,
  voucherType: true,
  docDate: true,
  description: true,
  state: true,
  linesJson: true,
  fiscalYearId: true,
  totalAmount: true,
  sourceModule: true,
  sourceRef: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
  postedHeaderId: true,
} as const;

/**
 * Lock the draft row for the duration of this transaction.
 *
 * Every transition takes this lock first. Two approvers pressing the button at
 * the same moment therefore queue: the second one, when it finally reads the
 * row, sees POSTED and stops — rather than both posting and one of them being
 * rolled back after having already allocated a voucher number.
 */
async function lockDraft(tx: Tx, tenantId: string, draftId: string) {
  const locked = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM voucher_drafts
     WHERE id = ${draftId}::uuid AND tenant_id = ${tenantId}::uuid
     FOR UPDATE
  `;
  if (locked.length === 0) throw new Error(`Voucher draft ${draftId} not found in this tenant.`);

  return tx.voucherDraft.findUniqueOrThrow({
    where: { id: draftId },
    select: DRAFT_SELECT,
  });
}

function assertState(
  draft: { draftNo: string; state: DraftState },
  expected: readonly DraftState[],
): void {
  if (!expected.includes(draft.state)) {
    throw new DraftStateError(draft.draftNo, draft.state, expected);
  }
}

// ---------------------------------------------------------------------------
// Create and edit
// ---------------------------------------------------------------------------

export interface DraftInput {
  voucherType: VoucherType;
  docDate: Date;
  description: string;
  lines: PostingLine[];
  sourceModule?: SourceModule;
  sourceRef?: string | null;
}

export interface DraftSaved {
  draftId: string;
  draftNo: string;
  /** Live balance of what was saved. A draft is allowed to be incomplete;
   *  this is how the maker knows what is still missing. */
  totalDebit: string;
  totalCredit: string;
  issues: LineIssue[];
}

/**
 * Save a new draft.
 *
 * Deliberately accepts an unbalanced voucher. A draft is work in progress: a
 * clerk entering forty lines from a paper journal will save halfway through
 * and go to lunch, and refusing to keep their work is how people end up
 * keeping it in a spreadsheet instead. Balance is required at submission,
 * where it is the maker asserting the voucher is finished.
 *
 * The period must exist, but need not be open — vouchers are routinely
 * prepared for a period that opens next week.
 */
export async function createDraft(
  principal: Principal,
  input: DraftInput,
): Promise<DraftSaved> {
  requirePermission(principal, 'voucher.create');

  const description = input.description?.trim();
  if (!description) {
    throw new DraftValidationError('(unsaved)', [
      { lineNo: 0, code: 'LINE', message: 'A voucher needs a description of what it is for.' },
    ]);
  }

  return withTenant(principal.tenantId, async (tx) => {
    const { functionalCurrency } = await tx.tenant.findUniqueOrThrow({
      where: { id: principal.tenantId },
      select: { functionalCurrency: true },
    });

    const docDate = toDateOnly(input.docDate);
    const period = await resolvePeriod(tx, principal.tenantId, docDate);
    const fiscalYear = await tx.fiscalYear.findUniqueOrThrow({
      where: { id: period.fiscalYearId },
      select: { name: true },
    });

    const stored = toStored(input.lines);
    const summary = summariseLines(input.lines, functionalCurrency.trim());

    const { draftNo } = await allocateDraftNumber(
      tx,
      principal.tenantId,
      period.fiscalYearId,
      fiscalYear.name,
    );

    const draft = await tx.voucherDraft.create({
      data: {
        tenantId: principal.tenantId,
        draftNo,
        voucherType: input.voucherType,
        docDate,
        description,
        state: 'DRAFT',
        linesJson: stored as unknown as Prisma.InputJsonValue,
        fiscalYearId: period.fiscalYearId,
        totalAmount: summary.totalDebit,
        sourceModule: input.sourceModule ?? 'MANUAL',
        sourceRef: input.sourceRef ?? null,
        createdById: principal.userId,
      },
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'voucher.draft',
      resourceId: draft.id,
      after: {
        draftNo,
        voucherType: input.voucherType,
        docDate: docDate.toISOString().slice(0, 10),
        description,
        lineCount: stored.length,
        totalDebit: summary.totalDebit.toFixed(4),
      },
    });

    return {
      draftId: draft.id,
      draftNo,
      totalDebit: summary.totalDebit.toFixed(4),
      totalCredit: summary.totalCredit.toFixed(4),
      issues: summary.issues,
    };
  });
}

export interface DraftChanges {
  docDate?: Date;
  description?: string;
  lines?: PostingLine[];
  voucherType?: VoucherType;
}

/**
 * Edit a draft that has not yet been submitted.
 *
 * Only the maker may edit, and only in DRAFT or REJECTED. The database
 * enforces the second half; the first half is enforced here because the
 * database does not know who is asking. Both matter: a second maker quietly
 * editing someone else's draft would leave the approval history naming the
 * wrong person.
 */
export async function updateDraft(
  principal: Principal,
  draftId: string,
  changes: DraftChanges,
): Promise<DraftSaved> {
  requirePermission(principal, 'voucher.create');

  return withTenant(principal.tenantId, async (tx) => {
    const draft = await lockDraft(tx, principal.tenantId, draftId);
    assertState(draft, ['DRAFT', 'REJECTED']);
    if (draft.createdById !== principal.userId) throw new NotTheMakerError(draft.draftNo);

    const { functionalCurrency } = await tx.tenant.findUniqueOrThrow({
      where: { id: principal.tenantId },
      select: { functionalCurrency: true },
    });

    const docDate = changes.docDate ? toDateOnly(changes.docDate) : draft.docDate;
    const period = await resolvePeriod(tx, principal.tenantId, docDate);

    const lines = changes.lines ?? fromStored(draft.linesJson);
    const stored = toStored(lines);
    const summary = summariseLines(lines, functionalCurrency.trim());

    const description = changes.description?.trim() ?? draft.description;
    if (!description) {
      throw new DraftValidationError(draft.draftNo, [
        { lineNo: 0, code: 'LINE', message: 'A voucher needs a description of what it is for.' },
      ]);
    }

    await tx.voucherDraft.update({
      where: { id: draftId },
      data: {
        docDate,
        description,
        voucherType: changes.voucherType ?? draft.voucherType,
        linesJson: stored as unknown as Prisma.InputJsonValue,
        fiscalYearId: period.fiscalYearId,
        totalAmount: summary.totalDebit,
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'voucher.draft',
      resourceId: draftId,
      before: {
        docDate: draft.docDate.toISOString().slice(0, 10),
        description: draft.description,
        totalDebit: draft.totalAmount.toFixed(4),
        lineCount: (draft.linesJson as unknown as StoredLine[]).length,
      },
      after: {
        docDate: docDate.toISOString().slice(0, 10),
        description,
        totalDebit: summary.totalDebit.toFixed(4),
        lineCount: stored.length,
      },
    });

    return {
      draftId,
      draftNo: draft.draftNo,
      totalDebit: summary.totalDebit.toFixed(4),
      totalCredit: summary.totalCredit.toFixed(4),
      issues: summary.issues,
    };
  });
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

async function recordTransition(
  tx: Tx,
  draftId: string,
  from: DraftState,
  to: DraftState,
  actorId: string,
  comment: string | null,
): Promise<void> {
  await tx.approvalEvent.create({
    data: { draftId, fromState: from, toState: to, actorId, comment },
  });
}

/**
 * Submit for review.
 *
 * This is where the voucher stops being work in progress, so this is where it
 * has to be complete: balanced, and postable against the chart as it stands
 * today. Handing a reviewer a voucher that cannot post wastes their time and
 * teaches them to approve without looking.
 */
export async function submitForReview(
  principal: Principal,
  draftId: string,
  comment?: string,
): Promise<void> {
  requirePermission(principal, 'voucher.create');

  await withTenant(principal.tenantId, async (tx) => {
    const draft = await lockDraft(tx, principal.tenantId, draftId);
    assertState(draft, ['DRAFT', 'REJECTED']);
    if (draft.createdById !== principal.userId) throw new NotTheMakerError(draft.draftNo);

    const { functionalCurrency } = await tx.tenant.findUniqueOrThrow({
      where: { id: principal.tenantId },
      select: { functionalCurrency: true },
    });

    const lines = fromStored(draft.linesJson);
    const summary = summariseLines(lines, functionalCurrency.trim());
    const chartIssues = await checkLinesAgainstChart(tx, principal.tenantId, summary.lines);
    const issues = [...summary.issues, ...chartIssues];
    if (issues.length > 0) throw new DraftValidationError(draft.draftNo, issues);

    await tx.voucherDraft.update({
      where: { id: draftId },
      data: { state: 'PENDING_REVIEW' },
    });
    await recordTransition(
      tx,
      draftId,
      draft.state,
      'PENDING_REVIEW',
      principal.userId,
      comment?.trim() || null,
    );

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'voucher.draft',
      resourceId: draftId,
      before: { state: draft.state },
      after: { state: 'PENDING_REVIEW', draftNo: draft.draftNo },
    });
  });
}

/**
 * First check: the reviewer.
 *
 * Passes the voucher to the approver. Cannot be the maker — this is the entire
 * purpose of the stage, and the legacy system had no equivalent of it at all.
 */
export async function reviewDraft(
  principal: Principal,
  draftId: string,
  comment?: string,
): Promise<void> {
  requirePermission(principal, 'voucher.review');

  await withTenant(principal.tenantId, async (tx) => {
    const draft = await lockDraft(tx, principal.tenantId, draftId);
    assertState(draft, ['PENDING_REVIEW']);
    assertNotSelfApproval(principal, draft.createdById, draft.draftNo);

    await tx.voucherDraft.update({
      where: { id: draftId },
      data: { state: 'PENDING_APPROVAL' },
    });
    await recordTransition(
      tx,
      draftId,
      'PENDING_REVIEW',
      'PENDING_APPROVAL',
      principal.userId,
      comment?.trim() || null,
    );

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'voucher.draft',
      resourceId: draftId,
      before: { state: 'PENDING_REVIEW' },
      after: { state: 'PENDING_APPROVAL', draftNo: draft.draftNo, stage: 'review' },
    });
  });
}

/**
 * Send it back, with a reason.
 *
 * Reachable from either checker stage. The comment is mandatory in code and by
 * CHECK constraint: a rejection with no reason leaves the maker guessing, and
 * guessing produces a resubmission with the same defect.
 */
export async function rejectDraft(
  principal: Principal,
  draftId: string,
  comment: string,
): Promise<void> {
  const reason = comment?.trim();
  if (!reason) {
    throw new DraftValidationError('(rejection)', [
      {
        lineNo: 0,
        code: 'LINE',
        message: 'A rejection must say what is wrong, or the maker cannot fix it.',
      },
    ]);
  }

  await withTenant(principal.tenantId, async (tx) => {
    const draft = await lockDraft(tx, principal.tenantId, draftId);
    assertState(draft, ['PENDING_REVIEW', 'PENDING_APPROVAL']);

    // Whoever holds the stage the voucher is sitting at is the one who may
    // send it back from there.
    const needed: PermissionKey =
      draft.state === 'PENDING_REVIEW' ? 'voucher.review' : 'voucher.approve';
    requirePermission(principal, needed);
    assertNotSelfApproval(principal, draft.createdById, draft.draftNo);

    await tx.voucherDraft.update({ where: { id: draftId }, data: { state: 'REJECTED' } });
    await recordTransition(tx, draftId, draft.state, 'REJECTED', principal.userId, reason);

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'REJECT',
      resourceType: 'voucher.draft',
      resourceId: draftId,
      before: { state: draft.state },
      after: { state: 'REJECTED', draftNo: draft.draftNo, reason },
    });
  });
}

/**
 * Abandon a draft that was never submitted.
 *
 * Distinct from rejection, which is a checker's verdict. Neither deletes
 * anything: a cancelled draft stays visible, with its maker and its reason,
 * because "why is there a gap in the draft numbers" is a question somebody
 * will eventually ask.
 */
export async function cancelDraft(
  principal: Principal,
  draftId: string,
  comment?: string,
): Promise<void> {
  requirePermission(principal, 'voucher.create');

  await withTenant(principal.tenantId, async (tx) => {
    const draft = await lockDraft(tx, principal.tenantId, draftId);
    assertState(draft, ['DRAFT', 'REJECTED']);
    if (draft.createdById !== principal.userId) throw new NotTheMakerError(draft.draftNo);

    await tx.voucherDraft.update({ where: { id: draftId }, data: { state: 'CANCELLED' } });
    await recordTransition(
      tx,
      draftId,
      draft.state,
      'CANCELLED',
      principal.userId,
      comment?.trim() || null,
    );

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'voucher.draft',
      resourceId: draftId,
      before: { state: draft.state },
      after: { state: 'CANCELLED', draftNo: draft.draftNo },
    });
  });
}

/**
 * Second check: approve and post, in one transaction.
 *
 * `voucher.approve` demands a verified second factor on the session — see
 * MFA_REQUIRED_PERMISSIONS. The plan called for MFA "above the approval
 * threshold"; the threshold is zero, deliberately. A threshold below which
 * approvals need no second factor is a documented amount an attacker can stay
 * under, and the cost of a six-digit code on every approval is a few seconds.
 *
 * Three separate checks stand between one person and a voucher of their own:
 *
 *   · the SoD matrix, which stops `voucher.create` and `voucher.approve`
 *     being held together at all;
 *   · `assertNotSelfApproval`, which catches the same person holding two
 *     roles, or a role edited after the draft was made;
 *   · the reviewer check below, which catches one person taking both checker
 *     stages on this particular document.
 *
 * The posting happens inside this transaction, so a voucher marked POSTED
 * whose ledger entry failed cannot exist — and neither can a ledger entry
 * whose draft was not marked posted.
 */
export async function approveAndPost(
  principal: Principal,
  draftId: string,
  opts: { comment?: string } = {},
): Promise<PostedVoucher> {
  requirePermission(principal, 'voucher.approve');

  return withTenant(principal.tenantId, async (tx) => {
    const draft = await lockDraft(tx, principal.tenantId, draftId);
    assertState(draft, ['PENDING_APPROVAL']);
    assertNotSelfApproval(principal, draft.createdById, draft.draftNo);

    const reviewed = await tx.approvalEvent.findFirst({
      where: { draftId, toState: 'PENDING_APPROVAL' },
      orderBy: { occurredAt: 'desc' },
      select: { actorId: true },
    });
    if (reviewed?.actorId === principal.userId) {
      throw new DuplicateCheckerError(draft.draftNo);
    }

    const posted = await post(tx, principal.tenantId, {
      voucherType: draft.voucherType,
      docDate: draft.docDate,
      description: draft.description,
      sourceModule: draft.sourceModule,
      sourceRef: draft.sourceRef,
      lines: fromStored(draft.linesJson),
      postedById: principal.userId,
    });

    await tx.voucherDraft.update({
      where: { id: draftId },
      data: { state: 'POSTED', postedHeaderId: posted.headerId },
    });
    await recordTransition(
      tx,
      draftId,
      'PENDING_APPROVAL',
      'POSTED',
      principal.userId,
      opts.comment?.trim() || null,
    );

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'POST',
      resourceType: 'voucher',
      resourceId: posted.headerId,
      before: { draftNo: draft.draftNo, state: 'PENDING_APPROVAL' },
      after: {
        draftNo: draft.draftNo,
        state: 'POSTED',
        voucherRef: posted.voucherRef,
        totalAmount: posted.totalAmount,
      },
    });

    return posted;
  });
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export interface DraftDetail {
  id: string;
  draftNo: string;
  voucherType: VoucherType;
  docDate: Date;
  description: string;
  state: DraftState;
  lines: PostingLine[];
  totalDebit: string;
  totalCredit: string;
  issues: LineIssue[];
  createdById: string;
  createdAt: Date;
  postedHeaderId: string | null;
  history: Array<{
    fromState: DraftState;
    toState: DraftState;
    actorId: string;
    actorName: string;
    comment: string | null;
    occurredAt: Date;
  }>;
}

/** One draft with its full approval history. */
export async function getDraft(
  principal: Principal,
  draftId: string,
): Promise<DraftDetail> {
  requirePermission(principal, 'voucher.read');

  return withTenant(principal.tenantId, async (tx) => {
    const draft = await tx.voucherDraft.findUniqueOrThrow({
      where: { id: draftId },
      select: {
        ...DRAFT_SELECT,
        events: {
          orderBy: { occurredAt: 'asc' },
          select: {
            fromState: true,
            toState: true,
            actorId: true,
            comment: true,
            occurredAt: true,
          },
        },
      },
    });

    const { functionalCurrency } = await tx.tenant.findUniqueOrThrow({
      where: { id: principal.tenantId },
      select: { functionalCurrency: true },
    });

    const lines = fromStored(draft.linesJson);
    const summary = summariseLines(lines, functionalCurrency.trim());

    const actorIds = [...new Set(draft.events.map((e) => e.actorId))];
    const actors = await tx.user.findMany({
      where: { id: { in: actorIds } },
      select: { id: true, fullName: true },
    });
    const nameById = new Map(actors.map((a) => [a.id, a.fullName]));

    return {
      id: draft.id,
      draftNo: draft.draftNo,
      voucherType: draft.voucherType,
      docDate: draft.docDate,
      description: draft.description,
      state: draft.state,
      lines,
      totalDebit: summary.totalDebit.toFixed(4),
      totalCredit: summary.totalCredit.toFixed(4),
      issues: summary.issues,
      createdById: draft.createdById,
      createdAt: draft.createdAt,
      postedHeaderId: draft.postedHeaderId,
      history: draft.events.map((e) => ({
        ...e,
        actorName: nameById.get(e.actorId) ?? '(removed user)',
      })),
    };
  });
}

export interface DraftListItem {
  id: string;
  draftNo: string;
  voucherType: VoucherType;
  docDate: Date;
  description: string;
  state: DraftState;
  totalAmount: string;
  createdById: string;
  updatedAt: Date;
}

/**
 * The work queue.
 *
 * `mine` and `awaitingMe` are the two views that matter in practice: what have
 * I got to finish, and what is waiting on my signature. `awaitingMe` excludes
 * the caller's own drafts, so the queue never shows someone work they are not
 * allowed to action — a queue that lists items you cannot act on trains people
 * to ignore it.
 */
export async function listDrafts(
  principal: Principal,
  filter: {
    state?: DraftState | DraftState[];
    mine?: boolean;
    awaitingMe?: boolean;
    take?: number;
    skip?: number;
  } = {},
): Promise<DraftListItem[]> {
  requirePermission(principal, 'voucher.read');

  let states: DraftState[] | undefined;
  if (filter.awaitingMe) {
    states = [];
    if (principal.permissions.has('voucher.review')) states.push('PENDING_REVIEW');
    if (principal.permissions.has('voucher.approve')) states.push('PENDING_APPROVAL');
    // Asked for my queue while holding neither checker permission: the answer
    // is "nothing", not "everything".
    if (states.length === 0) return [];
  } else if (filter.state) {
    states = Array.isArray(filter.state) ? filter.state : [filter.state];
  }

  return withTenant(principal.tenantId, async (tx) => {
    const rows = await tx.voucherDraft.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(states ? { state: { in: states } } : {}),
        ...(filter.mine ? { createdById: principal.userId } : {}),
        ...(filter.awaitingMe ? { createdById: { not: principal.userId } } : {}),
      },
      orderBy: { updatedAt: 'desc' },
      take: filter.take ?? 100,
      skip: filter.skip ?? 0,
      select: {
        id: true,
        draftNo: true,
        voucherType: true,
        docDate: true,
        description: true,
        state: true,
        totalAmount: true,
        createdById: true,
        updatedAt: true,
      },
    });

    return rows.map((r) => ({ ...r, totalAmount: r.totalAmount.toFixed(4) }));
  });
}
