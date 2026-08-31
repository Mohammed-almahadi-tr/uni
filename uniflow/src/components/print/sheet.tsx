import type { ReactNode } from 'react';
import {
  institutionName,
  pickLines,
  signatureLabel,
  type DocumentRef,
  type Letterhead,
  type SignatureSlot,
} from '@/lib/print/sheet';

/**
 * The printed document's chrome (Track D5).
 *
 * D2, D3 and D4 each shipped a screen that prints — the receipt, the
 * registration card, the voucher — and each deferred the same three things to
 * here: the letterhead, the page setup, and the signature block. This is
 * where they land, once, for all of them.
 *
 * ## Why the controls are outside the sheet
 *
 * Everything a reader must not see on paper carries `.no-print`, which
 * `globals.css` hides. The sheet itself carries nothing conditional: what is
 * inside `<PrintSheet>` is the document, and what is outside it is the
 * application. A screen that hides half its own content at print time is a
 * screen where somebody eventually prints the half that was meant to be
 * hidden.
 */

export function PrintSheet({
  letterhead,
  locale,
  title,
  subtitle,
  reference,
  children,
}: {
  letterhead: Letterhead;
  locale: 'ar' | 'en';
  title: string;
  subtitle?: string;
  reference?: DocumentRef;
  children: ReactNode;
}) {
  return (
    <article className="print-sheet mx-auto max-w-3xl rounded-lg border border-border bg-card p-8 print:max-w-none print:rounded-none print:border-0 print:p-0">
      <PrintLetterhead letterhead={letterhead} locale={locale} />

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        {reference && (
          <dl className="text-end text-sm">
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{reference.numberLabel}</dt>
              <dd className="numeric font-semibold">{reference.number}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-muted-foreground">{reference.dateLabel}</dt>
              <dd className="numeric">{reference.date}</dd>
            </div>
          </dl>
        )}
      </div>

      {children}
    </article>
  );
}

/**
 * The header block.
 *
 * The institution's name appears in **both** languages regardless of the
 * locale being read, and that is deliberate rather than an oversight of the
 * bilingual rule elsewhere. A printed document leaves the building: it is
 * presented to a bank, a ministry, an embassy, and the reader on the other
 * side does not get to choose which language the header was rendered in. The
 * *body* follows the locale; the name on the paper does not.
 */
function PrintLetterhead({
  letterhead,
  locale,
}: {
  letterhead: Letterhead;
  locale: 'ar' | 'en';
}) {
  const lines = pickLines(letterhead, locale);
  const other = locale === 'ar' ? letterhead.institutionEn : letterhead.institutionAr;

  return (
    <header className="mb-6 flex items-start gap-4 border-b-2 border-foreground pb-4">
      {letterhead.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={letterhead.logoUrl} alt="" className="h-14 w-auto" />
      )}
      <div className="min-w-0 flex-1">
        <div className="text-base font-bold">{institutionName(letterhead, locale)}</div>
        <div className="text-sm text-muted-foreground" dir={locale === 'ar' ? 'ltr' : 'rtl'}>
          {other}
        </div>
        {lines.map((l) => (
          <div key={l} className="text-xs text-muted-foreground">
            {l}
          </div>
        ))}
      </div>
      {letterhead.shortCode && (
        <div className="numeric text-sm font-semibold text-muted-foreground">
          {letterhead.shortCode}
        </div>
      )}
    </header>
  );
}

/**
 * The block at the bottom where somebody signs.
 *
 * Ruled lines, not empty space. A signature written across a gap with no rule
 * under it lands wherever the pen starts, and a document with three of those
 * cannot be read at a glance to see which of them is missing — which is the
 * one question anybody filing it is asking.
 *
 * `break-inside: avoid` on each slot: a signature line split across a page
 * boundary is a signature line nobody signs.
 */
export function SignatureBlock({
  slots,
  locale,
}: {
  slots: SignatureSlot[];
  locale: 'ar' | 'en';
}) {
  if (slots.length === 0) return null;

  return (
    <section className="mt-10 grid gap-8 sm:grid-cols-3">
      {slots.map((s) => (
        <div key={s.role} className="break-inside-avoid">
          <div className="mb-1 text-xs text-muted-foreground">
            {signatureLabel(s, locale)}
          </div>
          {/* The name sits ABOVE the rule when it is known, so the rule stays
              empty for the signature itself. Printing a known name onto the
              line leaves nowhere to sign. */}
          <div className="min-h-5 text-sm">{s.name ?? ' '}</div>
          <div className="mt-6 border-t border-foreground" />
        </div>
      ))}
    </section>
  );
}

/**
 * The footer.
 *
 * Who produced the document and when, because a printed figure with no issue
 * date is a figure that can be presented years later as current — which is
 * precisely what a legacy Crystal Report printout was, and why a student could
 * present one to a hostel indefinitely.
 */
export function PrintFooter({
  locale,
  generatedBy,
  generatedAt,
  note,
}: {
  locale: 'ar' | 'en';
  generatedBy: string;
  generatedAt: string;
  note?: string;
}) {
  return (
    <footer className="mt-8 flex flex-wrap justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
      <span>
        {locale === 'ar' ? 'أصدرها' : 'Issued by'} {generatedBy}
      </span>
      {note && <span className="min-w-0 flex-1 text-center">{note}</span>}
      <span className="numeric" dir="ltr">
        {generatedAt}
      </span>
    </footer>
  );
}

/** A two-column list of facts, the shape most of these documents are. */
export function PrintFacts({ children }: { children: ReactNode }) {
  return <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2">{children}</dl>;
}

export function PrintFact({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="break-inside-avoid">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}
