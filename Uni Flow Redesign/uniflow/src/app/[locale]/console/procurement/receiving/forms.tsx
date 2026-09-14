'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { OrderRow } from '@/lib/console/backoffice';
import { receive, type ReceiveState } from './actions';

const initial: ReceiveState = { error: null, received: null };

const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Record what arrived against one order (Track D4).
 *
 * Each line shows what was ordered and what has already been received, so
 * the outstanding figure is on the screen rather than in the head of whoever
 * is counting boxes. `receiveGoods` refuses more than is still outstanding —
 * over-receipt is a refusal, not a warning, because a delivery note claiming
 * more than was ordered is either a mistake or an attempt.
 */
export function ReceiveOrder({ order }: { order: OrderRow }) {
  const [state, action, pending] = useActionState(receive, initial);
  const t = useTranslations('procurement.receiving');
  const c = useTranslations('procurement.common');
  const o = useTranslations('procurement.orders');

  if (state.received) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('recorded', {
          grnNo: state.received.grnNo,
          voucherRef: state.received.voucherRef,
        })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="purchaseOrderId" value={order.id} />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th scope="col" className="border-b border-border px-3 py-2 text-start font-medium text-muted-foreground">
                {c('description')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                {o('ordered')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                {o('receivedQty')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                {o('outstanding')}
              </th>
              <th scope="col" className="border-b border-border px-3 py-2 text-end font-medium text-muted-foreground">
                {t('receiveQty')}
              </th>
            </tr>
          </thead>
          <tbody>
            {order.lines.map((l) => {
              const outstanding = (Number(l.quantity) - Number(l.receivedQty)).toFixed(4);
              return (
                <tr key={l.id}>
                  <td className="border-b border-border px-3 py-2">{l.description}</td>
                  <td className="numeric border-b border-border px-3 py-2 text-end">
                    {l.quantity}
                  </td>
                  <td className="numeric border-b border-border px-3 py-2 text-end">
                    {l.receivedQty}
                  </td>
                  <td className="numeric border-b border-border px-3 py-2 text-end font-medium">
                    {outstanding}
                  </td>
                  <td className="border-b border-border px-3 py-2 text-end">
                    {Number(outstanding) > 0 ? (
                      <input
                        name={`qty_${l.id}`}
                        inputMode="decimal"
                        dir="ltr"
                        aria-label={`${l.description} — ${t('receiveQty')}`}
                        className={`numeric ${small} w-28 text-end`}
                      />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs text-muted-foreground">{t('receivedOn')}</span>
          <input
            name="receivedOn"
            type="date"
            required
            defaultValue={today()}
            className={`numeric ${small} w-44`}
          />
        </label>
        <label className="block min-w-56 flex-1">
          <span className="mb-1 block text-xs text-muted-foreground">{c('note')}</span>
          <input name="note" className={small} />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? c('working') : t('record')}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{t('neverMore')}</p>
    </form>
  );
}
