'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { FeeItemRow, Named } from '@/lib/console/backoffice';
import {
  activate,
  addSponsor,
  draftContract,
  end,
  raiseInvoice,
  takeReceipt,
  type SponsorState,
} from './actions';

const initial: SponsorState = { error: null, message: null, drafted: null, invoiced: null };

const SPONSOR_TYPES = [
  'GOVERNMENT_MINISTRY',
  'EMBASSY',
  'CORPORATE',
  'FOUNDATION',
  'INDIVIDUAL',
] as const;
const CYCLES = ['PER_TERM', 'PER_YEAR', 'MONTHLY'] as const;

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';
const small = 'h-9 w-full rounded-md border border-input bg-background px-2 text-sm';

const Err = ({ children }: { children: React.ReactNode }) =>
  children ? (
    <p role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
      {children}
    </p>
  ) : null;

/** Add a sponsor. Both names required — an invoice to a ministry is issued in
 *  Arabic and audited in English, and the module refuses one of them. */
export function AddSponsor() {
  const [state, action, pending] = useActionState(addSponsor, initial);
  const t = useTranslations('academic.sponsors');
  const c = useTranslations('academic.common');
  const ty = useTranslations('academic.sponsorType');
  const cy = useTranslations('academic.billingCycle');

  if (state.message === 'added') {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {c('added')}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Err>{state.error}</Err>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('code')}</span>
          <input name="code" required dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameAr')}</span>
          <input name="nameAr" required dir="rtl" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameEn')}</span>
          <input name="nameEn" required dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('sponsorType')}</span>
          <select name="sponsorType" defaultValue="GOVERNMENT_MINISTRY" className={field}>
            {SPONSOR_TYPES.map((k) => (
              <option key={k} value={k}>
                {ty(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('billingCycle')}</span>
          <select name="billingCycle" defaultValue="PER_TERM" className={field}>
            {CYCLES.map((k) => (
              <option key={k} value={k}>
                {cy(k)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('paymentTerms')}</span>
          <input
            name="paymentTermDays"
            type="number"
            min={0}
            defaultValue={30}
            className={`numeric ${field}`}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('contact')}</span>
          <input name="contactName" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('email')}</span>
          <input name="email" type="email" dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('phone')}</span>
          <input name="phone" dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="mb-1 block text-sm font-medium">{t('billingAddress')}</span>
          <input name="billingAddress" className={field} />
        </label>
      </div>
      <p className="text-xs text-muted-foreground">{t('bothNames')}</p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('addSponsor')}
      </button>
    </form>
  );
}

/**
 * Draft a coverage contract (Track D4, SRS REQ-SPN-01).
 *
 * Four coverage rows, one of which may name no fee item — that row is the
 * fallback, the answer to "and everything else?". `draftSponsorship` refuses
 * two fallbacks and refuses a contract with no rows at all, because a
 * contract that funds nothing looks exactly like a contract.
 */
export function DraftContract({
  sponsors,
  studentId,
  feeItems,
  locale,
}: {
  sponsors: Named[];
  studentId: string;
  feeItems: FeeItemRow[];
  locale: 'ar' | 'en';
}) {
  const [state, action, pending] = useActionState(draftContract, initial);
  const t = useTranslations('academic.sponsors');
  const c = useTranslations('academic.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const rows = [0, 1, 2, 3];

  if (state.drafted) {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {t('drafted', { lineCount: state.drafted.lineCount })}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="studentId" value={studentId} />
      <Err>{state.error}</Err>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block lg:col-span-2">
          <span className="mb-1 block text-sm font-medium">{t('sponsor')}</span>
          <select name="sponsorId" required className={field}>
            {sponsors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code} · {pick(s.nameAr, s.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('reference')}</span>
          <input name="reference" dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('cap')}</span>
          <input name="capAmount" inputMode="decimal" dir="ltr" className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('validFrom')}</span>
          <input name="validFrom" type="date" required className={`numeric ${field}`} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('validTo')}</span>
          <input name="validTo" type="date" className={`numeric ${field}`} />
        </label>
      </div>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">{t('coverage')}</legend>
        <div className="space-y-3">
          {rows.map((i) => (
            <div key={i} className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('feeItem')}</span>
                <select name={`item_${i}`} defaultValue="" className={small}>
                  <option value="">{t('anyFeeItem')}</option>
                  {feeItems.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.code} · {pick(f.nameAr, f.nameEn)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">
                  {t('coveragePct')}
                </span>
                <input
                  name={`pct_${i}`}
                  inputMode="decimal"
                  dir="ltr"
                  className={`numeric ${small}`}
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-muted-foreground">{t('lineCap')}</span>
                <input
                  name={`cap_${i}`}
                  inputMode="decimal"
                  dir="ltr"
                  className={`numeric ${small}`}
                />
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <p className="text-xs text-muted-foreground">{t('emptyContract')}</p>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('draftContract')}
      </button>
    </form>
  );
}

/** Activate a drafted contract, or end a live one. */
export function ContractActions({
  sponsorshipId,
  status,
  mayApprove,
}: {
  sponsorshipId: string;
  status: string;
  mayApprove: boolean;
}) {
  const [activateState, activateAction, activating] = useActionState(activate, initial);
  const [endState, endAction, ending] = useActionState(end, initial);
  const [open, setOpen] = useState(false);
  const t = useTranslations('academic.sponsors');
  const c = useTranslations('academic.common');

  if (activateState.message === 'activated') {
    return <p className="text-sm text-success">{t('activated')}</p>;
  }
  if (endState.message === 'ended') {
    return <p className="text-sm text-muted-foreground">{t('ended')}</p>;
  }

  const error = activateState.error ?? endState.error;

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}

      {status === 'DRAFT' && mayApprove && (
        <form action={activateAction}>
          <input type="hidden" name="sponsorshipId" value={sponsorshipId} />
          <button
            type="submit"
            disabled={activating}
            className="h-9 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {activating ? c('working') : t('activate')}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">{t('activateHint')}</p>
        </form>
      )}

      {status === 'ACTIVE' &&
        (open ? (
          <form action={endAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="sponsorshipId" value={sponsorshipId} />
            <label className="block min-w-56 flex-1">
              <span className="mb-1 block text-xs text-muted-foreground">{c('reason')}</span>
              <input name="reason" required autoFocus className={small} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-muted-foreground">{c('date')}</span>
              <input name="endedOn" type="date" className={`numeric ${small} w-40`} />
            </label>
            <button
              type="submit"
              disabled={ending}
              className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
            >
              {ending ? c('working') : t('endContract')}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
            >
              {c('cancel')}
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
          >
            {t('endContract')}
          </button>
        ))}

      {status === 'ACTIVE' && <p className="text-xs text-muted-foreground">{t('endHint')}</p>}
    </div>
  );
}

/** Consolidate a period into one invoice, and record money against it. */
export function Invoicing({ sponsors, locale }: { sponsors: Named[]; locale: 'ar' | 'en' }) {
  const [invoiceState, invoiceAction, invoicing] = useActionState(raiseInvoice, initial);
  const [receiptState, receiptAction, receiving] = useActionState(takeReceipt, initial);
  const t = useTranslations('academic.sponsors');
  const c = useTranslations('academic.common');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const options = sponsors.map((s) => (
    <option key={s.id} value={s.id}>
      {s.code} · {pick(s.nameAr, s.nameEn)}
    </option>
  ));

  return (
    <div className="space-y-6">
      <form action={invoiceAction} className="space-y-3">
        <Err>{invoiceState.error}</Err>
        {invoiceState.invoiced && (
          <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
            {t('invoiced', {
              invoiceNo: invoiceState.invoiced.invoiceNo,
              total: invoiceState.invoiced.total,
              studentCount: invoiceState.invoiced.studentCount,
            })}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-sm font-medium">{t('sponsor')}</span>
            <select name="sponsorId" required className={field}>
              {options}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('periodFrom')}</span>
            <input name="periodFrom" type="date" required className={`numeric ${field}`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('periodTo')}</span>
            <input name="periodTo" type="date" required className={`numeric ${field}`} />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('dueDate')}</span>
            <input name="dueDate" type="date" className={`numeric ${field}`} />
          </label>
        </div>
        <button
          type="submit"
          disabled={invoicing}
          className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {invoicing ? c('working') : t('raiseInvoice')}
        </button>
        <p className="text-xs text-muted-foreground">{t('invoiceHint')}</p>
      </form>

      <form action={receiptAction} className="space-y-3 border-t border-border pt-6">
        <Err>{receiptState.error}</Err>
        {receiptState.message === 'received' && (
          <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
            {c('added')}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-sm font-medium">{t('sponsor')}</span>
            <select name="sponsorId" required className={field}>
              {options}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{c('amount')}</span>
            <input
              name="amount"
              inputMode="decimal"
              required
              dir="ltr"
              className={`numeric ${field}`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{c('date')}</span>
            <input name="docDate" type="date" required className={`numeric ${field}`} />
          </label>
          <label className="block lg:col-span-2">
            <span className="mb-1 block text-sm font-medium">{t('reference')}</span>
            <input name="reference" dir="ltr" className={field} />
          </label>
        </div>
        <button
          type="submit"
          disabled={receiving}
          className="h-11 rounded-md border border-border px-5 text-sm font-medium hover:bg-muted disabled:opacity-50"
        >
          {receiving ? c('working') : t('settled')}
        </button>
      </form>
    </div>
  );
}
