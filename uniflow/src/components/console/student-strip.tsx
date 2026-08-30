import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { StudentHeader } from '@/lib/console/lookups';
import { pickText, type Locale } from './text';
import { Pill } from './ui';

/**
 * The identity strip at the top of every student-scoped screen (Track D3).
 *
 * It shows the name **in both scripts**, always, rather than only the one
 * matching the interface language. A registrar working in Arabic still has to
 * check a passport printed in English, and a clerk working in English still
 * has to read the name on an Arabic certificate. Showing one and hiding the
 * other is how the wrong student gets registered — and the legacy build stored
 * four Arabic name parts and four Latin ones precisely because both are used,
 * then displayed whichever the screen had been written for.
 */
export async function StudentStrip({
  header,
  locale,
  href,
}: {
  header: StudentHeader;
  locale: Locale;
  /** Set when the strip is shown away from the profile, so it links back. */
  href?: string;
}) {
  const t = await getTranslations('registry');

  const body = (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div>
        <div className="font-semibold">{header.fullNameAr}</div>
        <div className="text-sm text-muted-foreground" dir="ltr">
          {header.fullNameEn}
        </div>
      </div>
      <div className="text-sm">
        <span className="text-muted-foreground">{t('students.studentNo')}: </span>
        <span className="numeric">{header.studentNo}</span>
      </div>
      {(header.programmeNameAr || header.programmeNameEn) && (
        <div className="text-sm">
          {pickText(locale, header.programmeNameAr, header.programmeNameEn)}
          {header.batchCode && (
            <span className="numeric text-muted-foreground"> · {header.batchCode}</span>
          )}
        </div>
      )}
      <Pill tone={header.status === 'ACTIVE' ? 'good' : 'neutral'}>
        {t(`status.${header.status}`)}
      </Pill>
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-muted/40 px-5 py-4">
      {href ? (
        <Link href={href} className="block hover:opacity-80">
          {body}
        </Link>
      ) : (
        body
      )}
    </div>
  );
}
