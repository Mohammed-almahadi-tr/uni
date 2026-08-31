import { getTranslations } from 'next-intl/server';
import type { PreCloseReport } from '@/lib/ledger/close';
import { localeOf } from '@/components/console/text';
import { Panel, Pill } from '@/components/console/ui';
import { SealPeriod } from './forms';

/**
 * The pre-close checklist, on screen (Track D5, SRS REQ-PER-02).
 *
 * ## Why it is a screen and not only a refusal
 *
 * A7 computed every one of these figures and deferred the gate, on the
 * grounds that a hard block with nothing to read is a block a controller
 * cannot act on — they are told "no" and left to guess which of six things is
 * wrong. So the same report that refuses the close is rendered here, in
 * advance, with each check saying what to do about it.
 *
 * ## Blocking and advisory are visibly different
 *
 * A failing advisory check is amber and the close still proceeds; a failing
 * blocking check is red and it does not. Presenting them identically would
 * teach a reader that some red rows can be ignored, which is the habit that
 * makes the red rows that matter invisible.
 *
 * A check reading "not applicable" is shown rather than hidden — a period with
 * no assets has no depreciation to post, and a controller needs to see that
 * the question was asked and answered rather than wonder whether it was.
 */
export async function PreCloseChecklist({
  report,
  locale: raw,
  periodStatus,
  maySeal,
}: {
  report: PreCloseReport;
  locale: string;
  periodStatus: string;
  maySeal: boolean;
}) {
  const t = await getTranslations('period');
  const locale = localeOf(raw);
  const ar = locale === 'ar';

  return (
    <Panel
      title={t('checklist', { period: report.periodLabel })}
      actions={
        <Pill tone={report.mayClose ? 'good' : 'bad'}>
          {report.mayClose ? t('mayClose') : t('mayNotClose')}
        </Pill>
      }
    >
      <ul className="divide-y divide-border">
        {report.checks.map((c) => (
          <li key={c.key} className="flex flex-wrap items-start gap-4 py-3">
            <span className="w-24 shrink-0">
              <Pill
                tone={
                  c.status === 'PASS'
                    ? 'good'
                    : c.status === 'NOT_APPLICABLE'
                      ? 'neutral'
                      : c.blocking
                        ? 'bad'
                        : 'warn'
                }
              >
                {t(`checkStatus.${c.status}`)}
              </Pill>
            </span>
            <div className="min-w-56 flex-1">
              <div className="text-sm font-medium">{ar ? c.labelAr : c.labelEn}</div>
              <div className="text-xs text-muted-foreground">
                {ar ? c.detailAr : c.detailEn}
              </div>
            </div>
            {!c.blocking && (
              <span className="text-xs text-muted-foreground">{t('advisory')}</span>
            )}
          </li>
        ))}
      </ul>

      {/* Sealing a year is here and nowhere else. D4 left the button off the
          month list deliberately: `PERMANENTLY_CLOSED` cannot be undone, and a
          state with no way back does not belong beside twelve reversible ones.
          It belongs after the checklist has been read. */}
      {periodStatus === 'CLOSED' && maySeal && (
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-sm text-muted-foreground">{t('sealHint')}</p>
          <SealPeriod periodId={report.fiscalPeriodId} />
        </div>
      )}
    </Panel>
  );
}
