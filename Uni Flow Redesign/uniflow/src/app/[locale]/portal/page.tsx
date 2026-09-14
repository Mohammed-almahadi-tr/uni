import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { redirectLocalised } from '@/lib/console/redirect';
import { portalPage } from '@/lib/portal/page';
import { portalOverview } from '@/lib/portal/views';
import { NoSiteConfigured } from '@/components/site/chrome';
import { PortalShell } from '@/components/portal/shell';
import { Amount, Empty, Panel, Pill } from '@/components/console/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.nav');
  return { title: t('overview'), robots: { index: false, follow: false } };
}

/**
 * The first page after signing in (SRS REQ-LP-05, Track C3).
 *
 * ## What a student could find out before
 *
 * Nothing, without travelling to the campus. Their balance lived in a
 * `Remain` column written by whichever screen last touched the registration
 * row, and the only way to read it was to stand in front of somebody with the
 * application open. A student who wanted to know what they owed asked a
 * cashier, and a cashier who was busy told them to come back.
 *
 * ## Why the blocks are on it
 *
 * B5 made a hold a control rather than a report, and D3 put it in front of
 * the registrar *before* the work rather than after it. The same argument
 * reaches one step further than a staff screen. A student who finds out at
 * the registration desk that a document expired in March has lost the queue
 * and the morning; a student who has been able to read it since March has
 * not, and the university has one fewer person at the front of its queue.
 */
export default async function PortalHome({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string }>;
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
  const holdTypes = await getTranslations('registry.holdType');
  const appStates = await getTranslations('academic.applicationState');
  const regStatus = await getTranslations('registry.regStatus');
  const overview = await portalOverview(principal, student);
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const currency = site.tenant.functionalCurrency;

  return (
    <PortalShell
      site={site}
      locale={locale}
      principal={principal}
      student={student}
      active="overview"
    >
      <div className="space-y-6">
        {/* The blocks first, above the money. Somebody who cannot register is
            reading this page to find out why. */}
        {overview.blocks.length > 0 && (
          <section className="rounded-lg border-2 border-destructive bg-destructive/10 p-5">
            <h2 className="font-semibold">{t('overview.blocked')}</h2>
            <ul className="mt-3 space-y-3 text-sm">
              {overview.blocks.map((b, i) => (
                <li key={b.id ?? `derived-${i}`}>
                  <span className="font-medium">{holdTypes(b.holdType)}</span>
                  <span className="block text-muted-foreground">{b.reason}</span>
                  {b.clearanceRoleName && (
                    <span className="block text-xs text-muted-foreground">
                      {t('overview.clearedBy', { role: b.clearanceRoleName })}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Panel title={t('overview.owed')}>
            <p className="text-2xl font-bold">
              <Amount value={overview.balance.netDue} currency={currency} />
            </p>
            <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between gap-3">
                <dt>{t('overview.charged')}</dt>
                <dd>
                  <Amount value={overview.balance.charged} currency={currency} />
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt>{t('overview.settled')}</dt>
                <dd>
                  <Amount value={overview.balance.settled} currency={currency} />
                </dd>
              </div>
              {overview.balance.creditBalance !== '0.0000' && (
                <div className="flex justify-between gap-3">
                  <dt>{t('overview.credit')}</dt>
                  <dd>
                    <Amount value={overview.balance.creditBalance} currency={currency} />
                  </dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title={t('overview.nextDue')}>
            {overview.nextInstalment ? (
              <>
                <p className="numeric text-2xl font-bold">
                  {overview.nextInstalment.dueDate.toISOString().slice(0, 10)}
                </p>
                <p className="mt-1 text-sm">
                  <Amount value={overview.nextInstalment.amount} currency={currency} />
                </p>
                {overview.nextInstalment.overdue && (
                  <p className="mt-2">
                    <Pill tone="bad">{t('overview.overdue')}</Pill>
                  </p>
                )}
              </>
            ) : (
              <Empty>{t('overview.noSchedule')}</Empty>
            )}
          </Panel>

          <Panel title={t('overview.registration')}>
            {overview.latestRegistration ? (
              <>
                <p className="numeric font-semibold">
                  {overview.latestRegistration.registrationNo}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {pick(
                    overview.latestRegistration.termNameAr,
                    overview.latestRegistration.termNameEn,
                  )}{' '}
                  <span className="numeric">
                    {overview.latestRegistration.academicYearCode}
                  </span>
                </p>
                <p className="mt-2">
                  <Pill
                    tone={
                      overview.latestRegistration.status === 'CANCELLED' ? 'bad' : 'good'
                    }
                  >
                    {regStatus(overview.latestRegistration.status)}
                  </Pill>
                </p>
              </>
            ) : (
              <Empty>{t('overview.noRegistration')}</Empty>
            )}
          </Panel>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Panel title={t('nav.documents')}>
            {overview.documentsOutstanding.length === 0 ? (
              <Empty>{t('overview.documentsDone')}</Empty>
            ) : (
              <>
                <p className="text-sm">{t('overview.documentsOutstanding')}</p>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                  {overview.documentsOutstanding.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-3 text-sm">
              <Link href="/portal/documents" className="underline hover:no-underline">
                {t('overview.seeDocuments')}
              </Link>
            </p>
          </Panel>

          {/* The application that became this student, where there is one.
              C2's public applicants track theirs with a number and a code;
              once they are enrolled the record follows them here, and they
              stop needing the code at all. */}
          <Panel title={t('overview.application')}>
            {overview.application ? (
              <p className="text-sm">
                <span className="numeric font-medium">
                  {overview.application.applicationNo}
                </span>
                {' — '}
                {appStates(overview.application.state)}
              </p>
            ) : (
              <Empty>{t('overview.noApplication')}</Empty>
            )}
          </Panel>
        </div>
      </div>
    </PortalShell>
  );
}
