import type { Tx } from '@/lib/db/client';
import type { LineIssue, PreparedLine } from './lines';

/**
 * Check proposed lines against the chart of accounts, before anything is
 * posted.
 *
 * The database enforces all of this already, in `assert_line_postable()`. The
 * point of repeating it here is *when* and *how* it is reported: a checker
 * should never be handed a voucher that cannot post, and a maker should be
 * told "line 3: account 41111 was deactivated on 2 March" rather than being
 * shown a constraint violation at the moment someone else presses Approve.
 *
 * So this is not the guarantee — the trigger is. This is the courtesy.
 */
export async function checkLinesAgainstChart(
  tx: Tx,
  tenantId: string,
  lines: readonly PreparedLine[],
): Promise<LineIssue[]> {
  const issues: LineIssue[] = [];
  if (lines.length === 0) return issues;

  const accountIds = [...new Set(lines.map((l) => l.accountId))];
  const costCenterIds = [...new Set(lines.map((l) => l.costCenterId).filter((v) => v !== null))];

  const accounts = await tx.account.findMany({
    where: { tenantId, id: { in: accountIds } },
    select: {
      id: true,
      code: true,
      nameEn: true,
      level: true,
      isActive: true,
      isPostable: true,
      isControlAccount: true,
      subledgerType: true,
      requiresCostCenter: true,
    },
  });
  const byId = new Map(accounts.map((a) => [a.id, a]));

  const costCenters =
    costCenterIds.length > 0
      ? await tx.costCenter.findMany({
          where: { tenantId, id: { in: costCenterIds as string[] } },
          select: { id: true, code: true, isActive: true },
        })
      : [];
  const ccById = new Map(costCenters.map((c) => [c.id, c]));

  for (const line of lines) {
    const at = (message: string) => issues.push({ lineNo: line.lineNo, code: 'LINE', message });
    const account = byId.get(line.accountId);

    if (!account) {
      // Includes the cross-tenant case: RLS means another tenant's account is
      // simply not there, which is the answer we want to give anyway.
      at(`Line ${line.lineNo}: no such account in this chart.`);
      continue;
    }
    if (!account.isActive) {
      at(`Line ${line.lineNo}: account ${account.code} (${account.nameEn}) has been deactivated.`);
      continue;
    }
    if (!account.isPostable || account.level !== 5) {
      at(
        `Line ${line.lineNo}: account ${account.code} is a level-${account.level} heading. ` +
          `Only level-5 detail accounts receive postings.`,
      );
      continue;
    }
    if (account.isControlAccount) {
      if (!line.subledgerType || !line.subledgerId) {
        at(
          `Line ${line.lineNo}: account ${account.code} controls the ${account.subledgerType} ` +
            `sub-ledger, so the line must say which ${String(account.subledgerType).toLowerCase()} it belongs to.`,
        );
      } else if (line.subledgerType !== account.subledgerType) {
        at(
          `Line ${line.lineNo}: account ${account.code} controls the ${account.subledgerType} ` +
            `sub-ledger, but the line names a ${line.subledgerType}.`,
        );
      }
    } else if (line.subledgerType) {
      at(
        `Line ${line.lineNo}: account ${account.code} is not a control account, so it carries no ` +
          `sub-ledger identity.`,
      );
    }
    if (account.requiresCostCenter && !line.costCenterId) {
      at(`Line ${line.lineNo}: account ${account.code} requires a cost centre.`);
    }
    if (line.costCenterId) {
      const cc = ccById.get(line.costCenterId);
      if (!cc) at(`Line ${line.lineNo}: no such cost centre in this tenant.`);
      else if (!cc.isActive) at(`Line ${line.lineNo}: cost centre ${cc.code} has been deactivated.`);
    }
  }

  return issues;
}
