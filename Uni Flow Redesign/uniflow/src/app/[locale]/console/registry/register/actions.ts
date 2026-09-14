'use server';

import { currentContext } from '@/lib/console/session';
import { optionalItems, type OptionalItem } from '@/lib/console/lookups';
import {
  previewRegistration,
  registerStudent,
  type DiscountInput,
  type RegisteredResult,
  type RegistrationQuote,
} from '@/lib/registration/engine';
import { registrationBlocks } from '@/lib/students/holds';
import type { BlockingHold } from '@/lib/students/holds';

/**
 * The registration desk's server actions (Track D3, SRS REQ-REG-01).
 *
 * **Price and commit run the same code path.** `previewRegistration` and
 * `registerStudent` share `quote()` inside the engine, so the figures a
 * registrar signs off are the figures that post — which is precisely what the
 * legacy screen could not say:
 *
 * ```vb
 * cmd.Parameters.AddWithValue("@TuitionFees1", ttxtTuitionFeesafterdiscount.Text)  ' net
 * ...
 * cmd2.Parameters.AddWithValue("@Debit", txtTuitionFees.Text)                      ' gross
 * ```
 *
 * The registration stored the discounted figure and the ledger entry stored
 * the undiscounted one, so the two disagreed by exactly the discount and
 * nobody reconciled them. Here there is one quote, and committing re-runs it
 * rather than trusting what the browser sent back.
 *
 * The action deliberately does **not** carry the priced figures in the form.
 * A hidden field holding a total is a number an attacker controls; the only
 * things that cross the wire are the inputs — student, term, level, discounts
 * — and the engine prices them again.
 */

/** What the desk shows before anything has been priced. */
function blank(): DeskState {
  return { error: null, quote: null, optional: [], blocks: [], result: null };
}

export interface DeskState {
  error: string | null;
  quote: RegistrationQuote | null;
  optional: OptionalItem[];
  blocks: BlockingHold[];
  result: RegisteredResult | null;
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const num = (f: FormData, k: string, fallback: number): number => {
  const n = Number.parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : fallback;
};

const date = (f: FormData, k: string): Date | undefined => {
  const v = str(f, k);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
  // Parsed as UTC midnight. A registration is a date, not a moment, and
  // letting the server's zone decide would move a January registration into
  // December for anybody west of Khartoum.
  return new Date(`${v}T00:00:00.000Z`);
};

/** Discount rows come back as `pct_<feeItemId>` and `amt_<feeItemId>`. */
function collectDiscounts(form: FormData): DiscountInput[] {
  const out: DiscountInput[] = [];
  for (const [key, value] of form.entries()) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const pct = key.match(/^pct_(.+)$/);
    const amt = key.match(/^amt_(.+)$/);
    if (pct) out.push({ feeItemId: pct[1], pct: value.trim() });
    else if (amt) out.push({ feeItemId: amt[1], amount: value.trim() });
  }
  // Two entries for one item means both boxes were filled. Passed through as
  // they are: the engine refuses the pair by name, and its message is better
  // than one invented here.
  return out;
}

function readInput(form: FormData) {
  const optionalFeeItemIds = form
    .getAll('optional')
    .filter((v): v is string => typeof v === 'string');

  return {
    studentId: str(form, 'studentId'),
    academicTermId: str(form, 'academicTermId'),
    levelYear: num(form, 'levelYear', 1),
    registrationDate: date(form, 'registrationDate'),
    optionalFeeItemIds,
    discounts: collectDiscounts(form),
    discountReason: str(form, 'discountReason') || undefined,
    discountSchemeId: str(form, 'discountSchemeId') || null,
  };
}

/**
 * Anything the engine raises deliberately is written for a registrar and is
 * safe to show. Anything else is not — it would describe the shape of the
 * system to whoever provoked it — so it becomes a flat refusal and the real
 * error goes to the server log.
 */
function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[registration desk]', e);
  return 'That could not be completed.';
}

export async function priceOrRegister(
  _prev: DeskState,
  form: FormData,
): Promise<DeskState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const principal = ctx.principal;
  const input = readInput(form);
  const commit = str(form, 'intent') === 'commit';

  if (!input.studentId || !input.academicTermId) {
    return { ...blank(), error: 'Choose a student and a term.' };
  }

  try {
    // Holds are checked here as well as inside the engine, so a blocked
    // student is named on the screen before anything is attempted rather than
    // as a refusal at the end. The engine still refuses — this is the banner,
    // not the control.
    const blocks = await registrationBlocks(
      principal,
      input.studentId,
      input.registrationDate ?? new Date(),
    );

    if (commit) {
      const result = await registerStudent(principal, input);
      return { error: null, quote: result, optional: [], blocks, result };
    }

    const quote = await previewRegistration(principal, input);
    const optional = await optionalItems(principal, quote.feeScheduleId);
    return { error: null, quote, optional, blocks, result: null };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
