/**
 * Journal vouchers and maker-checker (Track A2, SRS REQ-FIN-04/05).
 *
 * The legacy approval flow was: insert the lines into `Transactionees`, then
 * `DELETE FROM TempVouchers`. No reviewer, no reject path, no comment, no
 * approver recorded, and the delete destroyed the only evidence that a review
 * had ever taken place (frmApprovingVouchers.vb:941-991).
 *
 * These tests pin the replacement. The ones that matter most are not the happy
 * path — they are the four that describe an attack:
 *
 *   · a maker approving their own voucher,
 *   · one person taking both checker stages,
 *   · a maker editing the lines after review and before approval,
 *   · two approvers pressing the button at the same instant.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Principal } from '@/lib/auth/rbac';
import { ForbiddenError, MfaRequiredError, SelfApprovalError } from '@/lib/auth/rbac';
import type { PermissionKey } from '@/lib/auth/permissions';
import { syncPermissions } from '@/lib/auth/provisioning';
import { summariseLines } from '@/lib/ledger/lines';
import { verifyChain } from '@/lib/audit/log';
import {
  approveAndPost,
  cancelDraft,
  createDraft,
  DraftStateError,
  DraftValidationError,
  DuplicateCheckerError,
  getDraft,
  listDrafts,
  NotTheMakerError,
  rejectDraft,
  reviewDraft,
  submitForReview,
  updateDraft,
} from '@/lib/voucher/draft';
import {
  attachToDraft,
  AttachmentError,
  listAttachments,
  MAX_ATTACHMENT_BYTES,
  removeAttachment,
} from '@/lib/voucher/attachments';
import { reverseVoucher } from '@/lib/voucher/reversal';
import { asSystem, asTenant, disconnectAll, makeTenant, JAN, MAR, type Fixture } from './helpers';

let f: Fixture;
let maker: Principal;
let reviewer: Principal;
let approver: Principal;
let outsider: Principal;

let userSeq = 0;

/**
 * A person with exactly the permissions named, and nothing else.
 *
 * Built directly rather than from DEFAULT_ROLES so each test says which
 * capability it is exercising. `mfaVerified` defaults to true because these
 * tests are about the workflow; the one test that is about the second factor
 * turns it off explicitly.
 */
async function principalWith(
  permissions: PermissionKey[],
  opts: { mfaVerified?: boolean; name?: string } = {},
): Promise<Principal> {
  userSeq += 1;
  const label = opts.name ?? `user${userSeq}`;
  const userId = await asSystem(async (tx) => {
    const u = await tx.user.create({
      data: {
        tenantId: f.tenantId,
        email: `${label}.${userSeq}@voucher.test`,
        fullName: label,
        passwordHash: 'x',
      },
      select: { id: true },
    });
    const role = await tx.role.create({
      data: { tenantId: f.tenantId, name: `${label}-${userSeq}`, nameAr: label },
      select: { id: true },
    });
    if (permissions.length > 0) {
      await tx.rolePermission.createMany({
        data: permissions.map((permissionKey) => ({ roleId: role.id, permissionKey })),
      });
    }
    await tx.userRole.create({ data: { userId: u.id, roleId: role.id } });
    return u.id;
  });

  return {
    tenantId: f.tenantId,
    userId,
    mfaVerified: opts.mfaVerified ?? true,
    permissions: new Set(permissions),
  };
}

/** A balanced two-line journal: debit an expense, credit the safe. */
function balancedLines(amount = '1000.00') {
  return [
    { accountId: f.accounts.expense, debit: amount, description: 'Salaries' },
    { accountId: f.accounts.cash, credit: amount, description: 'Paid from the safe' },
  ];
}

async function draftReadyForApproval(amount = '1000.00') {
  const d = await createDraft(maker, {
    voucherType: 'JOURNAL',
    docDate: JAN,
    description: 'Monthly salaries',
    lines: balancedLines(amount),
  });
  await submitForReview(maker, d.draftId);
  await reviewDraft(reviewer, d.draftId, 'Supporting schedule checked');
  return d;
}

beforeAll(async () => {
  await syncPermissions();
  f = await makeTenant();
  maker = await principalWith(['voucher.create', 'voucher.read'], { name: 'maker' });
  reviewer = await principalWith(['voucher.review', 'voucher.read'], { name: 'reviewer' });
  approver = await principalWith(['voucher.approve', 'voucher.read', 'voucher.reverse'], {
    name: 'approver',
  });
  outsider = await principalWith(['voucher.read'], { name: 'outsider' });
});

afterAll(async () => {
  await disconnectAll();
});

// ---------------------------------------------------------------------------

describe('live balancing', () => {
  // This is what the voucher grid calls on every keystroke. It shares an
  // implementation with the posting engine rather than a specification,
  // because a grid that says "balanced" against a server that says "out by
  // 0.01" leaves the maker unable to proceed and unable to see why.

  it('reports totals and balance without touching the database', () => {
    const s = summariseLines(balancedLines('250.50'), 'SDG');
    expect(s.balanced).toBe(true);
    expect(s.totalDebit.toFixed(2)).toBe('250.50');
    expect(s.totalCredit.toFixed(2)).toBe('250.50');
    expect(s.difference.isZero()).toBe(true);
    expect(s.issues).toEqual([]);
  });

  it('signs the difference, so the maker knows which side is short', () => {
    const s = summariseLines(
      [
        { accountId: 'a', debit: '100' },
        { accountId: 'b', credit: '60' },
      ],
      'SDG',
    );
    expect(s.balanced).toBe(false);
    expect(s.difference.toFixed(2)).toBe('40.00');
    expect(s.issues.some((i) => i.code === 'UNBALANCED')).toBe(true);
  });

  it('names the root cause, not its consequence, on a one-sided voucher', () => {
    const s = summariseLines([{ accountId: 'a', debit: '100' }], 'SDG');
    // It is also unbalanced, but "you have only entered one line" is what the
    // maker needs to read first.
    expect(s.issues[0].code).toBe('LINE_COUNT');
  });

  it('flags a line carrying both a debit and a credit', () => {
    const s = summariseLines(
      [
        { accountId: 'a', debit: '100', credit: '40' },
        { accountId: 'b', credit: '60' },
      ],
      'SDG',
    );
    expect(s.issues.find((i) => i.lineNo === 1)?.message).toMatch(/both a debit and a credit/);
  });

  it('refuses a negative amount rather than treating it as the other side', () => {
    const s = summariseLines(
      [
        { accountId: 'a', debit: '-100' },
        { accountId: 'b', credit: '100' },
      ],
      'SDG',
    );
    expect(s.issues.find((i) => i.lineNo === 1)?.message).toMatch(/non-negative/);
  });

  it('flags a balanced voucher that totals zero', () => {
    const s = summariseLines(
      [
        { accountId: 'a', debit: '0' },
        { accountId: 'b', credit: '0' },
      ],
      'SDG',
    );
    // Both lines fail first ("carries neither"), which is the more useful
    // message; the zero-total rule is the backstop for the case where they do
    // not.
    expect(s.balanced).toBe(false);
  });

  it('agrees with the ledger to the last digit on a foreign-currency line', async () => {
    // 10.005 USD at 601.3333 is 6016.3396665 SDG, which rounds half-up to
    // 6016.3397 at ledger scale. If the grid rounded differently from the
    // posting engine the maker would see "balanced" and the server would
    // refuse — with no way for either of them to see why. Hence one
    // implementation, exercised here from both ends.
    const lines = [
      {
        accountId: f.accounts.expense,
        txnCurrency: 'USD',
        fxRate: '601.3333',
        debit: '10.005',
        description: 'Journal subscription, paid in USD',
      },
      { accountId: f.accounts.cash, credit: '6016.3397' },
    ];

    const s = summariseLines(lines, 'SDG');
    expect(s.totalDebit.toFixed(4)).toBe('6016.3397');
    expect(s.balanced).toBe(true);

    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'FX line',
      lines,
    });
    await submitForReview(maker, d.draftId);
    await reviewDraft(reviewer, d.draftId);
    const posted = await approveAndPost(approver, d.draftId);

    expect(posted.totalAmount).toBe(s.totalDebit.toFixed(4));
  });
});

// ---------------------------------------------------------------------------

describe('drafting', () => {
  it('numbers drafts from their own series, not the voucher series', async () => {
    const journalNext = () =>
      asTenant(f.tenantId, async (tx) =>
        (
          await tx.documentSequence.findFirstOrThrow({
            where: { tenantId: f.tenantId, docType: 'JOURNAL' },
            select: { nextValue: true },
          })
        ).nextValue,
      );

    const before = await journalNext();
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'First draft of the year',
      lines: balancedLines(),
    });
    expect(d.draftNo).toMatch(/^DFT-2026-\d{6}$/);

    // The voucher series is untouched: a draft that is never approved must not
    // burn a statutory number, or an auditor asking why JV-2026-000041 does
    // not exist gets "someone changed their mind" for an answer.
    expect(await journalNext()).toBe(before);
  });

  it('saves an unbalanced draft, and says what is still missing', async () => {
    // Work in progress is the normal state of a forty-line journal being typed
    // from a paper original. Refusing to save it is how people end up keeping
    // it in a spreadsheet.
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Half entered',
      lines: [
        { accountId: f.accounts.expense, debit: '500' },
        { accountId: f.accounts.cash, credit: '300' },
      ],
    });
    expect(d.issues.some((i) => i.code === 'UNBALANCED')).toBe(true);

    const loaded = await getDraft(maker, d.draftId);
    expect(loaded.state).toBe('DRAFT');
    expect(loaded.totalDebit).toBe('500.0000');
  });

  it('stores amounts as strings at ledger scale, never as JSON numbers', async () => {
    // jsonb would hand a numeric back as a double. The legacy system carried
    // money in VB Double from the grid all the way to the database; this is
    // the one place in the new system where money passes through JSON, so it
    // is the one place that could reintroduce the defect.
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Precision',
      lines: balancedLines('0.1'),
    });
    const raw = await asTenant(f.tenantId, (tx) =>
      tx.voucherDraft.findUniqueOrThrow({
        where: { id: d.draftId },
        select: { linesJson: true },
      }),
    );
    const lines = raw.linesJson as unknown as Array<{ debit: string | null }>;
    expect(typeof lines[0].debit).toBe('string');
    expect(lines[0].debit).toBe('0.1000');
  });

  it('refuses a draft with no description', async () => {
    await expect(
      createDraft(maker, {
        voucherType: 'JOURNAL',
        docDate: JAN,
        description: '   ',
        lines: balancedLines(),
      }),
    ).rejects.toBeInstanceOf(DraftValidationError);
  });

  it('accepts a document date in a period that is not yet open', async () => {
    // Preparing next month's accrual in advance is ordinary. The period lock
    // applies when it posts, not when it is typed.
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: MAR,
      description: 'March accrual, prepared early',
      lines: balancedLines(),
    });
    expect(d.draftNo).toBeTruthy();
  });

  it('allocates draft numbers without collision under concurrent saves', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        createDraft(maker, {
          voucherType: 'JOURNAL',
          docDate: JAN,
          description: `Concurrent ${i}`,
          lines: balancedLines(),
        }),
      ),
    );
    const numbers = new Set(results.map((r) => r.draftNo));
    expect(numbers.size).toBe(20);
  });

  it('lets the maker edit, and nobody else', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Editable',
      lines: balancedLines('100'),
    });

    await updateDraft(maker, d.draftId, { description: 'Edited', lines: balancedLines('200') });
    const after = await getDraft(maker, d.draftId);
    expect(after.description).toBe('Edited');
    expect(after.totalDebit).toBe('200.0000');

    const otherMaker = await principalWith(['voucher.create', 'voucher.read'], { name: 'other' });
    await expect(
      updateDraft(otherMaker, d.draftId, { description: 'Not yours' }),
    ).rejects.toBeInstanceOf(NotTheMakerError);
  });

  it('refuses to draft at all without voucher.create', async () => {
    await expect(
      createDraft(outsider, {
        voucherType: 'JOURNAL',
        docDate: JAN,
        description: 'No permission',
        lines: balancedLines(),
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------

describe('submission', () => {
  it('refuses an unbalanced voucher, listing every problem at once', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Not finished',
      lines: [
        { accountId: f.accounts.expense, debit: '500' },
        { accountId: f.accounts.cash, credit: '300' },
      ],
    });
    await expect(submitForReview(maker, d.draftId)).rejects.toThrow(/does not balance/);
  });

  it('refuses a voucher that could not post, before a reviewer wastes time on it', async () => {
    // A heading account rather than a level-5 detail account. The database
    // would reject this too, but at the moment the approver presses the
    // button — by which point two people have looked at it.
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Posted to a heading',
      lines: [
        { accountId: f.accounts.parentNotPostable, debit: '100' },
        { accountId: f.accounts.cash, credit: '100' },
      ],
    });
    await expect(submitForReview(maker, d.draftId)).rejects.toThrow(/level-4 heading/);
  });

  it('refuses a control-account line with no sub-ledger identity', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Student debtor with no student',
      lines: [
        { accountId: f.accounts.studentAr, debit: '100' },
        { accountId: f.accounts.tuitionRevenue, credit: '100' },
      ],
    });
    await expect(submitForReview(maker, d.draftId)).rejects.toThrow(/sub-ledger/i);
  });

  it('refuses a line missing a cost centre the account demands', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Lab consumables',
      lines: [
        { accountId: f.accounts.needsCostCenter, debit: '100' },
        { accountId: f.accounts.cash, credit: '100' },
      ],
    });
    await expect(submitForReview(maker, d.draftId)).rejects.toThrow(/requires a cost centre/);
  });

  it('only the maker may submit', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Mine',
      lines: balancedLines(),
    });
    const other = await principalWith(['voucher.create', 'voucher.read'], { name: 'other2' });
    await expect(submitForReview(other, d.draftId)).rejects.toBeInstanceOf(NotTheMakerError);
  });
});

// ---------------------------------------------------------------------------

describe('the two checker stages', () => {
  it('runs the whole path and posts a balanced voucher linked to its draft', async () => {
    const d = await draftReadyForApproval('1500.00');
    const posted = await approveAndPost(approver, d.draftId, { comment: 'Approved' });

    expect(posted.voucherRef).toMatch(/^JV-2026-\d{6}$/);
    expect(posted.totalAmount).toBe('1500.0000');

    const detail = await getDraft(maker, d.draftId);
    expect(detail.state).toBe('POSTED');
    expect(detail.postedHeaderId).toBe(posted.headerId);

    // Linked in both directions, and the ledger balances.
    const header = await asTenant(f.tenantId, (tx) =>
      tx.transactionHeader.findUniqueOrThrow({
        where: { id: posted.headerId },
        select: { lines: true, draft: { select: { draftNo: true } }, postedById: true },
      }),
    );
    expect(header.draft?.draftNo).toBe(d.draftNo);
    expect(header.postedById).toBe(approver.userId);
    const debits = header.lines.reduce((a, l) => a + Number(l.debitAmount), 0);
    const credits = header.lines.reduce((a, l) => a + Number(l.creditAmount), 0);
    expect(debits).toBe(credits);
  });

  it('keeps the full transition history, with who and when', async () => {
    const d = await draftReadyForApproval();
    await approveAndPost(approver, d.draftId);

    const detail = await getDraft(maker, d.draftId);
    expect(detail.history.map((h) => `${h.fromState}->${h.toState}`)).toEqual([
      'DRAFT->PENDING_REVIEW',
      'PENDING_REVIEW->PENDING_APPROVAL',
      'PENDING_APPROVAL->POSTED',
    ]);
    expect(detail.history[1].actorId).toBe(reviewer.userId);
    expect(detail.history[1].comment).toBe('Supporting schedule checked');
    expect(detail.history[2].actorId).toBe(approver.userId);
  });

  it('refuses to let the maker review their own voucher', async () => {
    // The maker holding voucher.review at all is already an SoD violation; this
    // is the per-document check that catches the case the matrix cannot see —
    // one person with two roles, or a role edited after the draft was made.
    const makerWhoAlsoReviews = await principalWith(['voucher.create', 'voucher.review', 'voucher.read'], {
      name: 'both',
    });
    const d = await createDraft(makerWhoAlsoReviews, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Self review attempt',
      lines: balancedLines(),
    });
    await submitForReview(makerWhoAlsoReviews, d.draftId);
    await expect(reviewDraft(makerWhoAlsoReviews, d.draftId)).rejects.toBeInstanceOf(
      SelfApprovalError,
    );
  });

  it('refuses to let the maker approve their own voucher', async () => {
    const makerWhoAlsoApproves = await principalWith(
      ['voucher.create', 'voucher.approve', 'voucher.read'],
      { name: 'bothapprove' },
    );
    const d = await createDraft(makerWhoAlsoApproves, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Self approval attempt',
      lines: balancedLines(),
    });
    await submitForReview(makerWhoAlsoApproves, d.draftId);
    await reviewDraft(reviewer, d.draftId);
    await expect(approveAndPost(makerWhoAlsoApproves, d.draftId)).rejects.toBeInstanceOf(
      SelfApprovalError,
    );
  });

  it('refuses to let one person take both checker stages', async () => {
    // The reviewer signed it off at stage one. Letting them also approve makes
    // the second check no check at all.
    const bothChecker = await principalWith(['voucher.review', 'voucher.approve', 'voucher.read'], {
      name: 'bothchecker',
    });
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Two stages one person',
      lines: balancedLines(),
    });
    await submitForReview(maker, d.draftId);
    await reviewDraft(bothChecker, d.draftId);
    await expect(approveAndPost(bothChecker, d.draftId)).rejects.toBeInstanceOf(
      DuplicateCheckerError,
    );
  });

  it('demands a verified second factor to approve', async () => {
    const noMfa = await principalWith(['voucher.approve', 'voucher.read'], {
      name: 'nomfa',
      mfaVerified: false,
    });
    const d = await draftReadyForApproval();
    await expect(approveAndPost(noMfa, d.draftId)).rejects.toBeInstanceOf(MfaRequiredError);
  });

  it('refuses approval to someone who only holds voucher.review', async () => {
    const d = await draftReadyForApproval();
    await expect(approveAndPost(reviewer, d.draftId)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('refuses to approve a voucher that has not been reviewed', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Skipping review',
      lines: balancedLines(),
    });
    await submitForReview(maker, d.draftId);
    await expect(approveAndPost(approver, d.draftId)).rejects.toBeInstanceOf(DraftStateError);
  });
});

// ---------------------------------------------------------------------------

describe('rejection', () => {
  it('sends the voucher back with a mandatory reason, and the maker can fix and resubmit', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Wrong account',
      lines: balancedLines('999'),
    });
    await submitForReview(maker, d.draftId);
    await rejectDraft(reviewer, d.draftId, 'Salaries belong in 51111, not here.');

    const rejected = await getDraft(maker, d.draftId);
    expect(rejected.state).toBe('REJECTED');
    expect(rejected.history.at(-1)?.comment).toMatch(/51111/);

    // Editable again, and resubmittable — the whole point of a reject path.
    await updateDraft(maker, d.draftId, { lines: balancedLines('1000') });
    await submitForReview(maker, d.draftId, 'Corrected');
    expect((await getDraft(maker, d.draftId)).state).toBe('PENDING_REVIEW');
  });

  it('refuses a rejection with no reason', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Silent rejection attempt',
      lines: balancedLines(),
    });
    await submitForReview(maker, d.draftId);
    await expect(rejectDraft(reviewer, d.draftId, '   ')).rejects.toBeInstanceOf(
      DraftValidationError,
    );
  });

  it('is reachable from the approval stage too, and needs the approver permission there', async () => {
    const d = await draftReadyForApproval();
    // The reviewer already passed it on; sending it back from stage two is the
    // approver's call, not theirs.
    await expect(rejectDraft(reviewer, d.draftId, 'Changed my mind')).rejects.toBeInstanceOf(
      ForbiddenError,
    );
    await rejectDraft(approver, d.draftId, 'The supporting invoice is for a different month.');
    expect((await getDraft(maker, d.draftId)).state).toBe('REJECTED');
  });

  it('records the rejection comment where it cannot later be edited', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Append-only history',
      lines: balancedLines(),
    });
    await submitForReview(maker, d.draftId);
    await rejectDraft(reviewer, d.draftId, 'Original reason');

    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE approval_events SET comment = 'softened' WHERE draft_id = ${d.draftId}::uuid`,
      ),
    ).rejects.toThrow(/append-only/i);

    await expect(
      asSystem((tx) =>
        tx.$executeRaw`DELETE FROM approval_events WHERE draft_id = ${d.draftId}::uuid`,
      ),
    ).rejects.toThrow(/append-only/i);
  });
});

// ---------------------------------------------------------------------------

describe('the content freeze', () => {
  it('refuses an edit once the voucher has been submitted', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Frozen',
      lines: balancedLines('100'),
    });
    await submitForReview(maker, d.draftId);
    await expect(
      updateDraft(maker, d.draftId, { lines: balancedLines('1000000') }),
    ).rejects.toBeInstanceOf(DraftStateError);
  });

  it('refuses it at the database, not only in the application', async () => {
    // This is the attack the whole workflow exists to stop: submit something
    // clean, let the reviewer pass it, then swap the lines before the approver
    // signs. It must fail for any code path, including one that does not exist
    // yet.
    const d = await draftReadyForApproval('100');
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`
          UPDATE voucher_drafts
             SET lines_json = '[{"accountId":"x","debit":"9999999"}]'::jsonb
           WHERE id = ${d.draftId}::uuid
        `,
      ),
    ).rejects.toThrow(/frozen/i);
  });

  it('refuses to delete a draft, even from the owner role', async () => {
    // The single behaviour this module exists to replace.
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Never deleted',
      lines: balancedLines(),
    });
    await expect(
      asSystem((tx) => tx.$executeRaw`DELETE FROM voucher_drafts WHERE id = ${d.draftId}::uuid`),
    ).rejects.toThrow(/cannot be deleted/i);
  });

  it('refuses an illegal state jump, even by direct update', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Straight to posted',
      lines: balancedLines(),
    });
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`UPDATE voucher_drafts SET state = 'POSTED' WHERE id = ${d.draftId}::uuid`,
      ),
    ).rejects.toThrow(/not a legal transition|posted_link/i);
  });
});

// ---------------------------------------------------------------------------

describe('concurrency and atomicity', () => {
  it('posts exactly once when two approvers press the button together', async () => {
    const d = await draftReadyForApproval('777.00');
    const second = await principalWith(['voucher.approve', 'voucher.read'], { name: 'approver2' });

    const results = await Promise.allSettled([
      approveAndPost(approver, d.draftId),
      approveAndPost(second, d.draftId),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    expect(ok).toHaveLength(1);

    // And exactly one voucher exists — not two, and not one with a burned
    // number beside it.
    const headers = await asTenant(f.tenantId, (tx) =>
      tx.transactionHeader.findMany({
        where: { tenantId: f.tenantId, description: 'Monthly salaries', totalAmount: '777' },
        select: { id: true },
      }),
    );
    expect(headers).toHaveLength(1);
  });

  it('leaves the draft untouched when the posting fails', async () => {
    // The document date falls in a FUTURE period. Approval and posting are one
    // transaction, so the draft must not be left claiming POSTED.
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: MAR,
      description: 'Into a closed period',
      lines: balancedLines(),
    });
    await submitForReview(maker, d.draftId);
    await reviewDraft(reviewer, d.draftId);

    await expect(approveAndPost(approver, d.draftId)).rejects.toThrow(/FUTURE|OPEN/);

    const after = await getDraft(maker, d.draftId);
    expect(after.state).toBe('PENDING_APPROVAL');
    expect(after.postedHeaderId).toBeNull();
  });
});

// ---------------------------------------------------------------------------

describe('cancellation', () => {
  it('lets the maker abandon a draft without deleting it', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Entered twice by mistake',
      lines: balancedLines(),
    });
    await cancelDraft(maker, d.draftId, 'Duplicate of DFT-2026-000004');

    const after = await getDraft(maker, d.draftId);
    expect(after.state).toBe('CANCELLED');
    expect(after.history.at(-1)?.comment).toMatch(/Duplicate/);
  });

  it('makes cancellation terminal', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Terminal',
      lines: balancedLines(),
    });
    await cancelDraft(maker, d.draftId);
    await expect(submitForReview(maker, d.draftId)).rejects.toBeInstanceOf(DraftStateError);
    await expect(updateDraft(maker, d.draftId, { description: 'x' })).rejects.toBeInstanceOf(
      DraftStateError,
    );
  });

  it('refuses to cancel a voucher already with a checker', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Already submitted',
      lines: balancedLines(),
    });
    await submitForReview(maker, d.draftId);
    await expect(cancelDraft(maker, d.draftId)).rejects.toBeInstanceOf(DraftStateError);
  });
});

// ---------------------------------------------------------------------------

describe('the work queue', () => {
  it('shows a checker only what is waiting on them, and never their own work', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Queue test',
      lines: balancedLines('42'),
    });
    await submitForReview(maker, d.draftId);

    const forReviewer = await listDrafts(reviewer, { awaitingMe: true });
    expect(forReviewer.map((r) => r.id)).toContain(d.draftId);

    // The approver's queue is stage two only.
    const forApprover = await listDrafts(approver, { awaitingMe: true });
    expect(forApprover.map((r) => r.id)).not.toContain(d.draftId);

    // Someone with neither checker permission has an empty queue, not the
    // whole list.
    expect(await listDrafts(outsider, { awaitingMe: true })).toEqual([]);
  });

  it('never offers a checker their own draft', async () => {
    const checkerWhoDrafts = await principalWith(
      ['voucher.create', 'voucher.review', 'voucher.read'],
      { name: 'checkerdrafts' },
    );
    const d = await createDraft(checkerWhoDrafts, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Own work in own queue',
      lines: balancedLines(),
    });
    await submitForReview(checkerWhoDrafts, d.draftId);

    const queue = await listDrafts(checkerWhoDrafts, { awaitingMe: true });
    expect(queue.map((r) => r.id)).not.toContain(d.draftId);
  });

  it('filters to the caller’s own drafts', async () => {
    const mine = await listDrafts(maker, { mine: true, state: 'DRAFT' });
    expect(mine.every((r) => r.createdById === maker.userId)).toBe(true);
  });

  it('refuses to list without voucher.read', async () => {
    const blind = await principalWith(['voucher.create'], { name: 'blind' });
    await expect(listDrafts(blind, {})).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------

describe('attachments', () => {
  const file = (n: string) => ({
    fileName: n,
    contentType: 'application/pdf',
    byteSize: 120_000,
    storageKey: `t/${f.tenantId}/${n}-${Math.random().toString(36).slice(2)}`,
    sha256: 'a'.repeat(64),
  });

  it('carries the evidence the checker is meant to look at', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'With evidence',
      lines: balancedLines(),
    });
    const att = await attachToDraft(maker, d.draftId, file('invoice.pdf'));
    expect(att.fileName).toBe('invoice.pdf');

    const list = await listAttachments(reviewer, d.draftId);
    expect(list).toHaveLength(1);

    await removeAttachment(maker, att.id);
    expect(await listAttachments(reviewer, d.draftId)).toHaveLength(0);
  });

  it('freezes the bundle once the voucher goes for review', async () => {
    // "A checker approves what they were shown" has to include the evidence,
    // or the control is only about the numbers.
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Frozen evidence',
      lines: balancedLines(),
    });
    const att = await attachToDraft(maker, d.draftId, file('advice.pdf'));
    await submitForReview(maker, d.draftId);

    await expect(attachToDraft(maker, d.draftId, file('extra.pdf'))).rejects.toBeInstanceOf(
      DraftStateError,
    );
    await expect(removeAttachment(maker, att.id)).rejects.toBeInstanceOf(DraftStateError);

    // And at the database, for any path that forgets to ask.
    await expect(
      asSystem((tx) =>
        tx.$executeRaw`DELETE FROM voucher_attachments WHERE id = ${att.id}::uuid`,
      ),
    ).rejects.toThrow(/cannot be changed/i);
  });

  it('requires a content digest, so a swapped file is detectable later', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Digest',
      lines: balancedLines(),
    });
    await expect(
      attachToDraft(maker, d.draftId, { ...file('x.pdf'), sha256: 'not-a-digest' }),
    ).rejects.toBeInstanceOf(AttachmentError);
  });

  it('caps the file size', async () => {
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Too big',
      lines: balancedLines(),
    });
    await expect(
      attachToDraft(maker, d.draftId, { ...file('big.pdf'), byteSize: MAX_ATTACHMENT_BYTES + 1 }),
    ).rejects.toBeInstanceOf(AttachmentError);
  });
});

// ---------------------------------------------------------------------------

describe('reversal', () => {
  it('creates a linked opposite entry and stamps the original', async () => {
    const d = await draftReadyForApproval('320.00');
    const posted = await approveAndPost(approver, d.draftId);

    // Reversals post into the period covering the reversal date, which in the
    // fixture calendar means January — correcting a January error in a month
    // whose period is not open yet is exactly what the period lock forbids.
    const reversal = await reverseVoucher(approver, posted.headerId, 'Posted to the wrong month.', {
      reversalDate: JAN,
    });

    const [original, rev] = await asTenant(f.tenantId, async (tx) => [
      await tx.transactionHeader.findUniqueOrThrow({
        where: { id: posted.headerId },
        select: { reversedAt: true, reversedBy: { select: { id: true } } },
      }),
      await tx.transactionHeader.findUniqueOrThrow({
        where: { id: reversal.headerId },
        select: {
          reversesId: true,
          reversalReason: true,
          voucherType: true,
          lines: { orderBy: { lineNo: 'asc' } },
        },
      }),
    ]);

    expect(original.reversedAt).not.toBeNull();
    expect(original.reversedBy?.id).toBe(reversal.headerId);
    expect(rev.reversesId).toBe(posted.headerId);
    expect(rev.reversalReason).toBe('Posted to the wrong month.');
    expect(rev.voucherType).toBe('REVERSAL');

    // Sides swapped, same amounts.
    expect(Number(rev.lines[0].creditAmount)).toBe(320);
    expect(Number(rev.lines[1].debitAmount)).toBe(320);
  });

  it('reverses once and only once', async () => {
    const d = await draftReadyForApproval('50.00');
    const posted = await approveAndPost(approver, d.draftId);
    await reverseVoucher(approver, posted.headerId, 'First and only.', { reversalDate: JAN });
    await expect(
      reverseVoucher(approver, posted.headerId, 'Second attempt.', { reversalDate: JAN }),
    ).rejects.toThrow(/already been reversed/i);
  });

  it('demands a reason', async () => {
    const d = await draftReadyForApproval('60.00');
    const posted = await approveAndPost(approver, d.draftId);
    await expect(reverseVoucher(approver, posted.headerId, '  ')).rejects.toThrow(/reason/i);
  });

  it('refuses to reverse a reversal', async () => {
    const d = await draftReadyForApproval('70.00');
    const posted = await approveAndPost(approver, d.draftId);
    const rev = await reverseVoucher(approver, posted.headerId, 'Correcting.', {
      reversalDate: JAN,
    });
    await expect(
      reverseVoucher(approver, rev.headerId, 'Undo the undo.', { reversalDate: JAN }),
    ).rejects.toThrow(/itself a reversal/i);
  });

  it('refuses without voucher.reverse', async () => {
    const d = await draftReadyForApproval('80.00');
    const posted = await approveAndPost(approver, d.draftId);
    await expect(
      reverseVoucher(maker, posted.headerId, 'Not allowed.', { reversalDate: JAN }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------

describe('the trail', () => {
  it('leaves an intact audit chain after a full workflow', async () => {
    const d = await draftReadyForApproval('91.00');
    await approveAndPost(approver, d.draftId);
    const v = await asTenant(f.tenantId, (tx) => verifyChain(tx, f.tenantId));
    expect(v.ok, v.reason).toBe(true);
  });

  it('keeps drafts inside their tenant', async () => {
    const other = await makeTenant();
    const d = await createDraft(maker, {
      voucherType: 'JOURNAL',
      docDate: JAN,
      description: 'Tenant A only',
      lines: balancedLines(),
    });

    const seenByB = await asTenant(other.tenantId, (tx) =>
      tx.voucherDraft.findMany({ where: { id: d.draftId } }),
    );
    expect(seenByB).toEqual([]);
  });
});
