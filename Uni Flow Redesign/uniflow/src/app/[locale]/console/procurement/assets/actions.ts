'use server';

import { revalidatePath } from 'next/cache';
import { currentContext } from '@/lib/console/session';
import { runDepreciation } from '@/lib/assets/depreciation';
import { disposeAsset } from '@/lib/assets/register';

/**
 * Fixed assets (Track D4, SRS REQ-AST-03/04).
 *
 * ## There was no asset
 *
 * An "asset" in the legacy build was a row in the chart of accounts —
 * `Acc1 = 'Fixed Assets'` — carrying a `DeprPerc` column and nothing else. No
 * purchase date, no in-service date, no salvage value, no useful life, no
 * serial number, no custodian, no location. And **no accumulated-depreciation
 * account**, so net book value was the purchase cost, permanently.
 *
 * Two things follow that this screen surfaces:
 *
 *   · depreciation is a **schedule laid down at capitalisation**, so the
 *     period-end run is a lookup — and a lookup cannot produce a different
 *     answer on a re-run. `runDepreciation` is keyed on the period, so a
 *     second invocation replays the first result rather than posting again.
 *   · disposal derecognises cost *and* accumulated depreciation, which is the
 *     entry that had nothing to reverse before.
 */

export interface AssetState {
  error: string | null;
  run: { count: number; total: string; voucherRef: string | null; skipped: string[] } | null;
  disposed: { gainOrLoss: string; voucherRef: string } | null;
}

function blank(): AssetState {
  return { error: null, run: null, disposed: null };
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
  console.error('[assets]', e);
  return 'That could not be completed.';
}

/** Charge one period. Safe to press twice — the job key is the period. */
export async function depreciate(_prev: AssetState, form: FormData): Promise<AssetState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  try {
    const result = await runDepreciation(ctx.principal, str(form, 'fiscalPeriodId'));
    revalidatePath('/console/procurement/assets');
    return {
      ...blank(),
      run: {
        count: result.assetsCharged,
        total: result.amount,
        voucherRef: result.voucherRef,
        // Reported rather than swallowed: REQ-AST-03 asks for what was left
        // out and why, because an asset silently skipped every period is an
        // asset that never depreciates.
        skipped: result.skipped.map((s) => `${s.assetCode}: ${s.reason}`),
      },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}

/** Sell, scrap or write one off. */
export async function dispose(_prev: AssetState, form: FormData): Promise<AssetState> {
  const ctx = await currentContext();
  if (!ctx) return { ...blank(), error: 'Your session has ended. Sign in again.' };

  const disposedOn = date(form, 'disposedOn');
  if (!disposedOn) return { ...blank(), error: 'Give the date it left the books.' };

  const proceeds = str(form, 'proceeds');

  try {
    const result = await disposeAsset(ctx.principal, str(form, 'assetId'), {
      disposedOn,
      reason: str(form, 'reason'),
      proceeds: proceeds || 0,
      proceedsAccountId: str(form, 'proceedsAccountId') || null,
      writeOff: !proceeds,
    });
    revalidatePath('/console/procurement/assets');
    return {
      ...blank(),
      disposed: { gainOrLoss: result.gainOrLoss, voucherRef: result.voucherRef },
    };
  } catch (e) {
    return { ...blank(), error: explain(e) };
  }
}
