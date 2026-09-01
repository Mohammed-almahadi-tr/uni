import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirectLocalised } from '@/lib/console/redirect';
import { portalPage } from '@/lib/portal/page';
import { portalSchedule } from '@/lib/portal/views';
import { NoSiteConfigured } from '@/components/site/chrome';
import { PortalShell } from '@/components/portal/shell';
import {
  Amount,
  Empty,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.nav');
  return { title: t('instalments'), robots: { index: false, follow: false } };
}

/**
 * The instalment schedule with its due dates (SRS REQ-LP-05, REQ-CSH-02).
 *
 * ## What it replaces
 *
 * A checkbox. The legacy system recorded a payment plan as `ChkBoPrem` on the
 * registration screen, which wrote a `Remain` balance and a `PaymentStatus`
 * flag onto the registration row. There were no instalment records and no
 * dates, so nobody — not the student, not the finance office — could say when
 * money was wanted, and "overdue" was not a question the data could answer.
 *
 * ## The balance is on the page, beside the dates
 *
 * Never the schedule alone. Payments settle charges, not instalments, so a
 * date that has passed does not mean money is owed: a student who paid the
 * whole term up front would otherwise be shown three instalments "overdue"
 * and would turn up at a counter to argue about it. The overdue figure here
 * is the smaller of what the schedule expected and what the account actually
 * still owes — the same figure `overdueInstalments` computes for the finance
 * office chasing them, so the two cannot disagree.
 */
export default async function PortalInstalmentsPage({
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
  const { plans, arrears } = await portalSchedule(principal, student.studentId);
  const currency = site.tenant.functionalCurrency;
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const inArrears = arrears.overdue !== '0.0000';

  return (
    <PortalShell
      site={site}
      locale={locale}
      principal={principal}
      student={student}
      active="instalments"
    >
      <div className="space-y-6">
        <Panel title={t('instalments.position')}>
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-muted-foreground">{t('overview.owed')}</dt>
              <dd className="mt-1 font-semibold">
                <Amount value={arrears.netDue} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('instalments.overdueNow')}</dt>
              <dd className="mt-1 font-semibold">
                <Amount value={arrears.overdue} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('instalments.daysOverdue')}</dt>
              <dd className="numeric mt-1 font-semibold">{arrears.daysOverdue}</dd>
            </div>
          </dl>

          {/* Said in words, because the number on its own is the thing people
              misread: a passed date with nothing owing is not arrears. */}
          <p className="mt-4 text-xs text-muted-foreground">
            {inArrears ? t('instalments.behind') : t('instalments.notBehind')}
          </p>
        </Panel>

        {plans.length === 0 ? (
          <Panel title={t('nav.instalments')}>
            <Empty>{t('instalments.noPlan')}</Empty>
          </Panel>
        ) : (
          plans.map((plan) => (
            <Panel
              key={plan.planId}
              title={plan.termLabel ?? t('instalments.plan')}
              actions={<Amount value={plan.totalAmount} currency={currency} />}
            >
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th numeric>{t('instalments.seq')}</Th>
                      <Th>{t('instalments.due')}</Th>
                      <Th numeric>{t('account.amount')}</Th>
                      <Th>{t('account.state')}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.instalments.map((i) => (
                      <tr key={i.seq}>
                        <Td numeric>
                          <span className="numeric">{i.seq}</span>
                        </Td>
                        <Td>
                          <span className="numeric">{iso(i.dueDate)}</span>
                        </Td>
                        <Td numeric>
                          <Amount value={i.amount} currency={currency} />
                        </Td>
                        <Td>
                          {i.overdue ? (
                            inArrears ? (
                              <Pill tone="bad">{t('instalments.datePassedOwing')}</Pill>
                            ) : (
                              <Pill tone="good">{t('instalments.datePassedPaid')}</Pill>
                            )
                          ) : (
                            <Pill>{t('instalments.upcoming')}</Pill>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            </Panel>
          ))
        )}
      </div>
    </PortalShell>
  );
}
