import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LedgerAmount, Money } from '@/components/ui/money';
import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/navigation';
import { directionOf } from '@/i18n/routing';
import { spellMoney } from '@/lib/i18n/spell';
import { formatDual } from '@/lib/i18n/calendar';

/**
 * Phase 0 shell.
 *
 * Not a product screen — a demonstration that the localisation layer works
 * end to end: RTL mirroring, Arabic typography, تفقيط, the dual calendar and
 * the ledger colour semantics. Track C replaces it with the real landing page.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations();
  const dir = directionOf(locale);
  const other = locale === 'ar' ? 'en' : 'ar';
  const spellLocale = locale === 'ar' ? 'ar' : 'en';

  const amount = '1234.56';
  const currency = 'SDG';
  const today = new Date();

  return (
    <main className="mx-auto w-full max-w-3xl p-6 md:p-10 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('app.name')}</h1>
          <p className="text-sm text-muted-foreground">{t('app.tagline')}</p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/" locale={other}>
            {t('common.language')}: {other.toUpperCase()}
          </Link>
        </Button>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t('ledger.amountInWords')}</CardTitle>
          <CardDescription>
            dir=<code>{dir}</code> · {formatDual(today, { locale: spellLocale })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="text-sm text-muted-foreground">{t('ledger.balance')}</span>
            <Money amount={amount} currency={currency} showCode className="text-xl font-semibold" />
          </div>

          {/* The control that stops a figure being altered after signature. */}
          <p className="rounded-md bg-muted p-3 text-sm leading-relaxed">
            {spellMoney(amount, currency, spellLocale)}
          </p>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t('ledger.totalDebit')}</div>
              <LedgerAmount amount={amount} currency={currency} side="debit" className="font-semibold" />
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">{t('ledger.totalCredit')}</div>
              <LedgerAmount amount={amount} currency={currency} side="credit" className="font-semibold" />
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
