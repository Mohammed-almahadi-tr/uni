'use server';

import { revalidatePath } from 'next/cache';
import { randomUUID } from 'node:crypto';
import type { SponsorBillingCycle, SponsorType } from '@/generated/prisma/enums';
import { currentContext } from '@/lib/console/session';
import {
  activateSponsorship,
  createSponsor,
  draftSponsorship,
  endSponsorship,
  type SponsorshipLineInput,
} from '@/lib/sponsors/contracts';
import { raiseSponsorInvoice, takeSponsorReceipt } from '@/lib/sponsors/billing';

/**
 * Sponsors and their contracts (Track D4, SRS REQ-SPN-01/02).
 *
 * ## What the legacy build did about sponsors
 *
 * Nothing. A sponsored student was billed **in full**, the institution
 * chased the ministry by telephone, and there was no record of what had been
 * agreed, what had been invoiced or what had been paid. The student's own
 * statement showed a debt that was somebody else's.
 *
 * Three things here follow from that and none of them is optional:
 *
 *   · a contract says what is covered, by fee item, with a ceiling;
 *   · it funds nothing until a second person activates it;
 *   · the sponsor's share is debited to Sponsor AR, so a student's statement
 *     shows only what the student personally owes.
 */

export interface SponsorState {
  error: string | null;
  message: string | null;
  drafted: { lineCount: number } | null;
  invoiced: { invoiceNo: string; total: string; studentCount: number } | null;
}

function blank(): SponsorState {
  return { error: null, message: null, drafted: null, invoiced: null };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const num = (f: FormData, k: string, fallback: number): number => {
  const n = Number.parseInt(str(f, k), 10);
  return Number.isFinite(n) ? n : fallback;
};

const date = (f: FormData, k: string): Date | null => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : null;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[sponsors]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/academic/sponsors');
}

export async function addSponsor(_prev: SponsorState, form: FormData): Promise<SponsorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await createSponsor(ctx.principal, {
      code: str(form, 'code'),
      nameAr: str(form, 'nameAr'),
      nameEn: str(form, 'nameEn'),
      sponsorType: str(form, 'sponsorType') as SponsorType,
      contactName: str(form, 'contactName') || null,
      email: str(form, 'email') || null,
      phone: str(form, 'phone') || null,
      billingAddress: str(form, 'billingAddress') || null,
      billingCycle: (str(form, 'billingCycle') || 'PER_TERM') as SponsorBillingCycle,
      paymentTermDays: num(form, 'paymentTermDays', 30),
    });
    refresh();
    return { ...blank(), message: 'added' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Coverage lines come back as `pct_<i>` / `item_<i>` / `cap_<i>`.
 *
 * A line naming no fee item is the fallback: what the contract covers by
 * default. `draftSponsorship` refuses two of those, because one row has to be
 * the answer to "and everything else?".
 */
function collectLines(form: FormData): SponsorshipLineInput[] {
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^pct_(\d+)$/);
    if (m) indices.add(Number(m[1]));
  }
  const out: SponsorshipLineInput[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const pct = str(form, `pct_${i}`);
    if (!pct) continue;
    out.push({
      feeItemId: str(form, `item_${i}`) || null,
      coveragePct: pct,
      capAmount: str(form, `cap_${i}`) || null,
    });
  }
  return out;
}

export async function draftContract(
  _prev: SponsorState,
  form: FormData,
): Promise<SponsorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const validFrom = date(form, 'validFrom');
  if (!validFrom) return { ...blank(), error: 'Give the date the contract starts.' };

  try {
    const result = await draftSponsorship(ctx.principal, {
      sponsorId: str(form, 'sponsorId'),
      studentId: str(form, 'studentId'),
      reference: str(form, 'reference') || null,
      validFrom,
      validTo: date(form, 'validTo'),
      capAmount: str(form, 'capAmount') || null,
      lines: collectLines(form),
    });
    refresh();
    return { ...blank(), drafted: { lineCount: result.lineCount } };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** The second signature. Until it happens the contract funds nothing. */
export async function activate(_prev: SponsorState, form: FormData): Promise<SponsorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await activateSponsorship(ctx.principal, str(form, 'sponsorshipId'));
    refresh();
    return { ...blank(), message: 'activated' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Ended, not deleted — charges already split under it stay attributed. */
export async function end(_prev: SponsorState, form: FormData): Promise<SponsorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    await endSponsorship(
      ctx.principal,
      str(form, 'sponsorshipId'),
      str(form, 'reason'),
      date(form, 'endedOn') ?? undefined,
    );
    refresh();
    return { ...blank(), message: 'ended' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Consolidate a period's shares into one invoice.
 *
 * Re-runnable without risk: a share's `invoice_id` is set once, so running
 * the consolidation again picks up only what is not already billed.
 */
export async function raiseInvoice(
  _prev: SponsorState,
  form: FormData,
): Promise<SponsorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const periodFrom = date(form, 'periodFrom');
  const periodTo = date(form, 'periodTo');
  if (!periodFrom || !periodTo) {
    return { ...blank(), error: 'Give the period the invoice covers.' };
  }

  try {
    const result = await raiseSponsorInvoice(ctx.principal, {
      sponsorId: str(form, 'sponsorId'),
      periodFrom,
      periodTo,
      dueDate: date(form, 'dueDate') ?? undefined,
    });
    refresh();
    return {
      ...blank(),
      invoiced: {
        invoiceNo: result.invoiceNo,
        total: result.totalAmount,
        studentCount: result.studentCount,
      },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/**
 * Money in from a sponsor.
 *
 * Carries an idempotency key for the same reason a student receipt does. It
 * is minted here rather than in the browser because this is a treasury
 * screen used deliberately, not a counter worked at speed on a bad link —
 * and `takeSponsorReceipt` requires one either way.
 */
export async function takeReceipt(
  _prev: SponsorState,
  form: FormData,
): Promise<SponsorState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const docDate = date(form, 'docDate');
  if (!docDate) return { ...blank(), error: 'Give the date the money arrived.' };

  try {
    await takeSponsorReceipt(
      ctx.principal,
      {
        sponsorId: str(form, 'sponsorId'),
        docDate,
        channel: 'BANK_TRANSFER',
        amount: str(form, 'amount'),
        reference: str(form, 'reference') || null,
      },
      randomUUID(),
    );
    refresh();
    return { ...blank(), message: 'received' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
