import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { studentHeader, tenantCurrency } from '@/lib/console/lookups';
import { bankAccountOptions } from '@/lib/console/finance';
import { cashierDaySheet, previewAllocation } from '@/lib/cashier/receipt';
import { studentBalance } from '@/lib/students/account';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { Empty, Fact, FactGrid, PageHeader, Panel, WarningBanner } from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { StudentStrip } from '@/components/console/student-strip';
import { StudentPicker } from '@/components/console/student-picker';
import { CashierDesk } from './desk';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('finance.cashier');
  return { title: t('title') };
}

/**
 * The cashier desk (Track D2, SRS REQ-CSH-01, REQ-CSH-04).
 *
 * Student first, then the money — the same shape as the registration desk,
 * because it is the same counter and often the same person.
 *
 * The day sheet sits underneath rather than on a screen of its own. A cashier
 * who has to navigate somewhere else to see what they have taken does not
 * look, and the figure they need at four o'clock is the one to count the
 * drawer against.
 */
export default async function CashierPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'finance/cashier');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('finance.cashier');
  const ch = await getTranslations('finance.channel');
  const c = await getTranslations('finance.common');
  const sp = await searchParams;

  const [day, currency] = await Promise.all([
    cashierDaySheet(principal),
    tenantCurrency(principal),
  ]);

  const daySheet = (
    <Panel title={t('daySheet')}>
      <FactGrid>
        <Fact label={t('myTill')}>
          {day.till ? (
            <>
              <span className="numeric">{day.till.accountCode}</span>{' '}
              {locale === 'ar' ? day.till.accountNameAr : day.till.accountNameEn}
            </>
          ) : (
            <span className="text-muted-foreground">{c('none')}</span>
          )}
        </Fact>
        <Fact label={t('cashToCount')}>
          <Money amount={day.cashTotal} currency={currency} />
        </Fact>
        <Fact label={c('total')}>
          <Money amount={day.total} currency={currency} />
        </Fact>
      </FactGrid>

      {day.byChannel.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">{t('nothingToday')}</p>
      ) : (
        <ul className="mt-4 space-y-1 text-sm">
          {day.byChannel.map((b) => (
            <li key={b.channel} className="flex flex-wrap items-baseline gap-2">
              <span>{ch(b.channel)}</span>
              <span className="numeric text-muted-foreground">×{b.count}</span>
              <Money amount={b.total} currency={currency} />
            </li>
          ))}
        </ul>
      )}

      {day.cancelledCount > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {t('cancelledToday', { count: day.cancelledCount, amount: day.cancelledTotal })}
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">{t('daySheetHint')}</p>
    </Panel>
  );

  const header = sp.student ? await studentHeader(principal, sp.student) : null;

  if (!header) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        {!day.till && <WarningBanner>{t('noTill')}</WarningBanner>}
        <StudentPicker
          principal={principal}
          locale={locale}
          query={sp.q ?? ''}
          basePath="/console/finance/cashier"
        />
        {daySheet}
      </div>
    );
  }

  // Zero, so the opening view lists the charges without proposing an
  // allocation — nothing has been typed yet, and a proposal against an amount
  // nobody entered is a figure waiting to be misread.
  const [balance, opening, banks] = await Promise.all([
    studentBalance(principal, header.id),
    previewAllocation(principal, header.id, 0),
    bankAccountOptions(principal),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <StudentStrip
        header={header}
        locale={locale}
        href={`/console/registry/students/${header.id}`}
      />

      {!day.till && <WarningBanner>{t('noTill')}</WarningBanner>}

      {banks.length === 0 && <Empty>{c('nothing')}</Empty>}

      <CashierDesk
        studentId={header.id}
        charges={opening.charges}
        balance={balance}
        banks={banks}
        hasTill={day.till !== null}
        currency={currency}
        locale={locale}
      />

      {daySheet}
    </div>
  );
}
