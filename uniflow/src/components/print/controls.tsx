'use client';

import { useTranslations } from 'next-intl';

/**
 * The print button (Track D5).
 *
 * A client component for one reason: `window.print()`. It carries `.no-print`
 * so it never appears on the paper it produces — a printed page with a "Print"
 * button drawn on it is the oldest defect in this category.
 *
 * There is no "Download PDF" beside it, and that is the decision A7 recorded
 * rather than an omission. The browser's own print dialogue offers "Save as
 * PDF" on every platform this runs on, and it produces that PDF with the same
 * text shaper that laid the page out. A button here would have to produce it
 * with a different one — and Arabic laid out by a second shaper is wrong in a
 * way that still looks like Arabic to whoever ships it.
 */
export function PrintButton({ className }: { className?: string }) {
  const t = useTranslations('print');

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className={
        className ??
        'no-print inline-flex h-11 items-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90'
      }
    >
      {t('print')}
    </button>
  );
}
