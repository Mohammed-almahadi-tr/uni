import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirectLocalised } from '@/lib/console/redirect';
import { portalPage } from '@/lib/portal/page';
import { portalStatement } from '@/lib/portal/views';
import { letterheadForTenant } from '@/lib/print/letterhead';
import { NoSiteConfigured } from '@/components/site/chrome';
import { PortalShell } from '@/components/portal/shell';
import { PrintButton } from '@/components/print/controls';
import { PrintFooter, PrintSheet } from '@/components/print/sheet';
import { Amount, Empty, Panel, Table, TableWrap, Td, Th } from '@/components/console/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.nav');
  return { title: t('statement'), robots: { index: false, follow: false } };
}

/**
 * The statement of account (SRS REQ-LP-05, REQ-RPT-01, Track C3).
 *
 * The **same** statement D5 prints at the counter, from the same builder, on
 * the same letterhead. There is not a student version and an official
 * version. A student who prints this at midnight and takes it to the finance
 * office is holding the document the finance office would have printed, which
 * is the entire point of a self-service portal — otherwise every query still
 * ends at a counter, and all the portal saved was the first sentence of the
 * conversation.
 *
 * The opening balance is a real figure carried in from before the range, not
 * zero. A statement that starts at zero and calls the total a closing balance
 * is one a student cannot check against the last one they were given.
 */
export default async function PortalStatementPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string; from?: string; to?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const sp = await searchParams;

  const state = await portalPage(raw, sp.student);
  if (!state.ok) {
    if (state.reason === 'noSite') return <NoSiteConfigured host={state.host} />;
    if (state.reason === 'noStudent') notFound();
    redirectLocalised(raw, '/portal/login');
  }
  const { locale, site, principal, student } = state;

  const t = await getTranslations('portal');
  const kinds = await getTranslations('portal.statementKind');

  // A range typed into the address bar is bounded by being a date or being
  // ignored — an unparseable one is not an error worth a screen, it is simply
  // not a filter.
  const parse = (v?: string) => {
    if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return undefined;
    const d = new Date(`${v}T00:00:00.000Z`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };

  const [statement, letterhead] = await Promise.all([
    portalStatement(principal, student.studentId, {
      from: parse(sp.from),
      to: parse(sp.to),
    }),
    letterheadForTenant(principal.tenantId),
  ]);

  const currency = site.tenant.functionalCurrency;
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const rows = (
    <>
      <thead>
        <tr>
          <Th>{t('statement.date')}</Th>
          <Th>{t('statement.detail')}</Th>
          <Th>{t('statement.reference')}</Th>
          <Th numeric>{t('statement.debit')}</Th>
          <Th numeric>{t('statement.credit')}</Th>
          <Th numeric>{t('statement.balance')}</Th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <Td />
          <Td className="font-medium">{t('statement.opening')}</Td>
          <Td />
          <Td />
          <Td />
          <Td numeric>
            <Amount value={statement.openingBalance} currency={currency} />
          </Td>
        </tr>
        {statement.lines.map((l, i) => (
          <tr key={`${l.kind}-${l.reference}-${i}`}>
            <Td>
              <span className="numeric">{iso(l.date)}</span>
            </Td>
            <Td>
              <span className="block">{kinds(l.kind)}</span>
              <span className="block text-xs text-muted-foreground">{l.description}</span>
            </Td>
            <Td>
              <span className="numeric">{l.reference}</span>
            </Td>
            <Td numeric>
              <Amount value={l.debit} currency={currency} />
            </Td>
            <Td numeric>
              <Amount value={l.credit} currency={currency} />
            </Td>
            <Td numeric>
              <Amount value={l.runningBalance} currency={currency} />
            </Td>
          </tr>
        ))}
        <tr>
          <Td />
          <Td className="font-semibold">{t('statement.closing')}</Td>
          <Td />
          <Td />
          <Td />
          <Td numeric>
            <Amount
              value={statement.closingBalance}
              currency={currency}
              className="font-semibold"
            />
          </Td>
        </tr>
      </tbody>
    </>
  );

  return (
    <PortalShell
      site={site}
      locale={locale}
      principal={principal}
      student={student}
      active="statement"
    >
      <div className="no-print">
        <Panel
          title={t('nav.statement')}
          actions={<PrintButton />}
        >
          {statement.lines.length === 0 ? (
            <Empty>{t('statement.empty')}</Empty>
          ) : (
            <TableWrap>
              <Table>{rows}</Table>
            </TableWrap>
          )}
        </Panel>
      </div>

      {/* Hidden on screen, shown to the printer: the summary above is what
          somebody reads, and two renderings of one document side by side is a
          page nobody scrolls past. */}
      <div className="hidden print:block">
        <PrintSheet
          letterhead={letterhead}
          locale={locale}
          title={t('statement.title')}
          subtitle={`${student.studentNo} — ${
            locale === 'ar' ? student.fullNameAr : student.fullNameEn
          }`}
          reference={{
            numberLabel: t('statement.range'),
            number: `${statement.from ? iso(statement.from) : '—'} → ${
              statement.to ? iso(statement.to) : '—'
            }`,
            dateLabel: t('statement.printedOn'),
            date: new Date().toISOString().slice(0, 10),
          }}
        >
          <table className="w-full border-collapse text-xs">{rows}</table>
          <PrintFooter
            locale={locale}
            generatedBy={principal.fullName}
            generatedAt={new Date().toISOString().slice(0, 19).replace('T', ' ')}
          />
        </PrintSheet>
      </div>
    </PortalShell>
  );
}
