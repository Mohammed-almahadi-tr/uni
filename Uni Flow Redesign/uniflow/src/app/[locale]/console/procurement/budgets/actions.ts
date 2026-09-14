'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import {
  approveBudget,
  draftBudget,
  rejectBudget,
  submitBudget,
  type BudgetLineInput,
} from '@/lib/budget/budget';

/**
 * Budgets (Track D4, SRS REQ-BUD-01/02).
 *
 * **There is no "edit the approved budget."** A change is a new version, and
 * approving it supersedes the last — because the approved budget is the
 * authority every availability check has already been made against, and
 * editing it in place would retrospectively change decisions that were taken
 * correctly at the time.
 *
 * A line's default policy is BLOCK. `draftBudget` makes that the default
 * rather than WARN because a budget nobody is held to is a spreadsheet, and
 * the institution already has those.
 */

export interface BudgetState {
  error: string | null;
  message: string | null;
}

const blank = (): BudgetState => ({ error: null, message: null });

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[budgets]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/procurement/budgets');
  revalidatePath('/console/procurement/orders');
}

function collectLines(form: FormData): BudgetLineInput[] {
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^line_(\d+)_amount$/);
    if (m) indices.add(Number(m[1]));
  }
  const out: BudgetLineInput[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const annualAmount = str(form, `line_${i}_amount`);
    const accountId = str(form, `line_${i}_accountId`);
    if (!annualAmount || !accountId) continue;
    out.push({
      accountId,
      costCenterId: str(form, `line_${i}_costCenterId`) || null,
      annualAmount,
      note: str(form, `line_${i}_note`) || undefined,
    });
  }
  return out;
}

export async function draft(_prev: BudgetState, form: FormData): Promise<BudgetState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await draftBudget(ctx.principal, {
      fiscalYearId: str(form, 'fiscalYearId'),
      label: str(form, 'label'),
      lines: collectLines(form),
    });
    refresh();
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Submit, approve or reject. The state decides which is offered. */
export async function transition(_prev: BudgetState, form: FormData): Promise<BudgetState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const budgetId = str(form, 'budgetId');
  const how = str(form, 'how');

  try {
    if (how === 'submit') await submitBudget(ctx.principal, budgetId);
    else if (how === 'approve') {
      await approveBudget(ctx.principal, budgetId, { note: str(form, 'note') || undefined });
    } else if (how === 'reject') {
      await rejectBudget(ctx.principal, budgetId, str(form, 'note'));
    } else return { ...blank(), error: 'Unknown action.' };

    refresh();
    return { ...blank(), message: 'saved' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
