'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import {
  approveHeldInvoice,
  recordInvoice,
  rejectHeldInvoice,
  type InvoiceLineInput,
} from '@/lib/procurement/invoices';

/**
 * Supplier invoices and the three-way match (Track D4, SRS REQ-PRC-04).
 *
 * Order, delivery, invoice. A mismatch **holds** the invoice rather than
 * blocking it: somebody with authority may still approve it, with a reason,
 * and the reason is stored beside what did not match. Blocking outright would
 * mean an institution that cannot pay a supplier whose freight came to two
 * pounds more than quoted; approving silently would mean the match was
 * decoration.
 *
 * A non-PO invoice — a utility bill — has no order to match against. It still
 * needs an account and an approver.
 */

export interface InvoiceState {
  error: string | null;
  recorded: { internalNo: string; state: string; issues: string[] } | null;
  decided: 'approved' | 'rejected' | null;
}

function blank(): InvoiceState {
  return { error: null, recorded: null, decided: null };
}

const str = (f: FormData, k: string): string => {
  const v = f.get(k);
  return typeof v === 'string' ? v.trim() : '';
};

const date = (f: FormData, k: string): Date | null => {
  const v = str(f, k);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00.000Z`) : null;
};

function explain(e: unknown): string {
  if (e instanceof Error && e.name !== 'Error' && e.message) return e.message;
  console.error('[invoices]', e);
  return 'That could not be completed.';
}

function refresh(): void {
  revalidatePath('/console/procurement/invoices');
  revalidatePath('/console/procurement/orders');
  revalidatePath('/console/finance/payments');
}

function collectLines(form: FormData): InvoiceLineInput[] {
  const indices = new Set<number>();
  for (const key of form.keys()) {
    const m = key.match(/^line_(\d+)_description$/);
    if (m) indices.add(Number(m[1]));
  }
  const out: InvoiceLineInput[] = [];
  for (const i of [...indices].sort((a, b) => a - b)) {
    const description = str(form, `line_${i}_description`);
    const quantity = str(form, `line_${i}_quantity`);
    const unitPrice = str(form, `line_${i}_unitPrice`);
    if (!description || !quantity || !unitPrice) continue;
    out.push({
      description,
      poLineId: str(form, `line_${i}_poLineId`) || null,
      accountId: str(form, `line_${i}_accountId`),
      costCenterId: str(form, `line_${i}_costCenterId`) || null,
      quantity,
      unitPrice,
    });
  }
  return out;
}

export async function record(_prev: InvoiceState, form: FormData): Promise<InvoiceState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const invoiceDate = date(form, 'invoiceDate');
  if (!invoiceDate) return { ...blank(), error: 'Give the date on the invoice.' };

  try {
    const result = await recordInvoice(ctx.principal, {
      vendorId: str(form, 'vendorId'),
      vendorInvoiceNo: str(form, 'vendorInvoiceNo'),
      purchaseOrderId: str(form, 'purchaseOrderId') || null,
      invoiceDate,
      dueDate: date(form, 'dueDate') ?? undefined,
      lines: collectLines(form),
    });
    refresh();
    return {
      ...blank(),
      recorded: {
        internalNo: result.internalNo,
        state: result.state,
        issues: result.matchIssues,
      },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Release a held invoice, or refuse it. Both need a stated reason. */
export async function decide(_prev: InvoiceState, form: FormData): Promise<InvoiceState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const invoiceId = str(form, 'invoiceId');
  const reason = str(form, 'reason');

  try {
    if (str(form, 'how') === 'reject') {
      await rejectHeldInvoice(ctx.principal, invoiceId, reason);
      refresh();
      return { ...blank(), decided: 'rejected' };
    }
    await approveHeldInvoice(ctx.principal, invoiceId, reason);
    refresh();
    return { ...blank(), decided: 'approved' };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
