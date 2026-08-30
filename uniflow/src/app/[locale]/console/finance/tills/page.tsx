import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { cashAccountOptions, tillAssignments } from '@/lib/console/finance';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill, WarningBanner } from '@/components/console/ui';
import { AssignTill } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('finance.tills');
  return { title: t('title') };
}

/**
 * Cash tills (Track D2, SRS REQ-CSH-04).
 *
 * The screen exists because `resolveDebitAccount` refuses a cash receipt from
 * a cashier with no till — correctly, since there is nowhere for the money to
 * be recorded — and that refusal happens at the counter, with a student
 * waiting. Somebody has to be able to see it coming, and until this screen
 * there was no way to.
 *
 * It also states the reason the constraint exists at all: one safe per
 * cashier is what turns "who is short today" from a report reconstructed out
 * of a name column into an account balance.
 */
export default async function TillsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/tills');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('finance.tills');

  const [rows, accounts] = await Promise.all([
    tillAssignments(principal),
    cashAccountOptions(principal),
  ]);

  const unassigned = rows.filter((r) => !r.isActive || !r.accountId);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {unassigned.length > 0 && <WarningBanner>{t('warning')}</WarningBanner>}

      <Panel>
        {rows.length === 0 ? (
          <Empty>{t('noCashiers')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.userId} className="flex flex-wrap items-center gap-4 py-4">
                <div className="min-w-48 flex-1">
                  <div className="font-medium">{r.fullName}</div>
                  <div className="text-xs text-muted-foreground" dir="ltr">
                    {r.email}
                  </div>
                </div>
                <div className="min-w-40">
                  {r.accountId && r.isActive ? (
                    <Pill tone="good">
                      <span className="numeric">{r.accountCode}</span>{' '}
                      {locale === 'ar' ? r.accountNameAr : r.accountNameEn}
                    </Pill>
                  ) : (
                    <Pill tone="warn">{t('unassigned')}</Pill>
                  )}
                </div>
                <div className="min-w-64 flex-1">
                  <AssignTill
                    userId={r.userId}
                    accounts={accounts}
                    currentAccountId={r.accountId}
                    locale={locale}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('perCashier')}</p>
      </Panel>
    </div>
  );
}
