import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { studentHeader } from '@/lib/console/lookups';
import { studentBalance } from '@/lib/students/account';
import { listHolds, registrationBlocks } from '@/lib/students/holds';
import { statusHistory } from '@/lib/students/status';
import { listRegistrations } from '@/lib/registration/engine';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  Amount,
  Empty,
  Fact,
  FactGrid,
  PageHeader,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
  WarningBanner,
} from '@/components/console/ui';
import { StudentStrip } from '@/components/console/student-strip';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  void params;
  const t = await getTranslations('registry.profile');
  return { title: t('subtitle') };
}

/**
 * The student record (Track D3).
 *
 * Four things the legacy build could not put on one screen, because they were
 * in four tables keyed by four different things and one of them was a table
 * of people the institution had decided were *not* its students:
 *
 *   · what they owe — net of anything a sponsor is carrying (B6);
 *   · whether anything blocks them registering, **and who may lift it**;
 *   · their standing over time, as an effective-dated chain rather than a
 *     column that was overwritten;
 *   · every term they have registered for, cancelled ones included.
 *
 * The hold banner is the one that changes a day at the desk. B5 made a hold a
 * control rather than a report; this is where a registrar sees it before
 * starting a registration that would be refused at the end.
 */
export default async function StudentProfile({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: raw, id } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/students/[id]');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const header = await studentHeader(principal, id);
  if (!header) notFound();

  const t = await getTranslations('registry');
  const p = await getTranslations('print');
  const rp = await getTranslations('reports');
  const [balance, holds, blocks, history, registrations] = await Promise.all([
    studentBalance(principal, id),
    listHolds(principal, id, { includeCleared: true }),
    registrationBlocks(principal, id),
    statusHistory(principal, id),
    listRegistrations(principal, { studentId: id }),
  ]);

  const currency = registrations[0]?.currency ?? 'SDG';

  return (
    <div className="space-y-6">
      <PageHeader
        title={pickText(locale, header.fullNameAr, header.fullNameEn)}
        subtitle={t('profile.subtitle')}
        actions={
          <>
            <Link
              href={`/console/registry/register?student=${id}`}
              className="inline-flex h-11 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {t('profile.register')}
            </Link>
            <Link
              href={`/console/registry/holds?student=${id}`}
              className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              {t('profile.placeHold')}
            </Link>
            {/* The student card (D5). */}
            <Link
              href={`/console/registry/students/${id}/card`}
              className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              {p('profileCard')}
            </Link>
            {/* And their statement of account, which is a report rather than a
                document — it belongs to the reports section and is reached
                from here because this is where somebody is standing when a
                student disputes a balance. */}
            <Link
              href={`/console/reports/student-account?student=${id}`}
              className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              {rp('studentAccount.title')}
            </Link>
            <Link
              href={`/console/registry/lifecycle?student=${id}`}
              className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-muted"
            >
              {t('profile.changeStanding')}
            </Link>
          </>
        }
      />

      <StudentStrip header={header} locale={locale} />

      {blocks.length > 0 && (
        <WarningBanner>
          <strong className="block">{t('profile.blocked')}</strong>
          <span className="block">{t('profile.blockedNote')}</span>
          <ul className="mt-2 space-y-1">
            {blocks.map((b, i) => (
              <li key={b.id ?? `derived-${i}`}>
                <Pill tone="warn">{t(`holdType.${b.holdType}`)}</Pill>{' '}
                {b.reason}{' '}
                <span className="text-muted-foreground">
                  —{' '}
                  {b.id === null
                    ? t('profile.derivedHold')
                    : t('profile.clearedBy', {
                        role: b.clearanceRoleName ?? t('profile.anyHoldManager'),
                      })}
                </span>
              </li>
            ))}
          </ul>
        </WarningBanner>
      )}

      <Panel title={t('profile.account')}>
        <FactGrid>
          <Fact label={t('profile.charged')}>
            <Amount value={balance.charged} currency={currency} />
          </Fact>
          <Fact label={t('profile.settled')}>
            <Amount value={balance.settled} currency={currency} />
          </Fact>
          <Fact label={t('profile.outstanding')}>
            <Amount value={balance.outstanding} currency={currency} className="font-semibold" />
          </Fact>
          <Fact label={t('profile.creditBalance')}>
            <Amount value={balance.creditBalance} currency={currency} />
          </Fact>
          <Fact label={t('profile.netDue')}>
            <Amount value={balance.netDue} currency={currency} className="font-semibold" />
          </Fact>
        </FactGrid>
      </Panel>

      <Panel title={t('profile.timeline')}>
        {history.length === 0 ? (
          <Empty>{t('profile.noTimeline')}</Empty>
        ) : (
          <ol className="space-y-3">
            {history.map((h) => (
              <li key={h.id} className="border-s-2 border-border ps-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="numeric text-sm text-muted-foreground">{h.effectiveDate}</span>
                  {h.fromStatus && (
                    <>
                      <Pill>{t(`status.${h.fromStatus}`)}</Pill>
                      <span aria-hidden>→</span>
                    </>
                  )}
                  <Pill tone={h.toStatus === 'ACTIVE' ? 'good' : 'neutral'}>
                    {t(`status.${h.toStatus}`)}
                  </Pill>
                  <span className="text-xs text-muted-foreground">
                    {t(`consequence.${h.consequence}`)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{h.reason}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {h.recordedBy && `${t('profile.recordedBy')}: ${h.recordedBy}`}
                  {h.approvedBy && ` · ${t('profile.approvedBy')}: ${h.approvedBy}`}
                </p>
                {(h.amountReversed || h.amountRetained || h.amountRefundable) && (
                  <p className="mt-1 flex flex-wrap gap-4 text-xs">
                    {h.amountReversed && (
                      <span>
                        {t('profile.reversed')}:{' '}
                        <Amount value={h.amountReversed} currency={currency} />
                      </span>
                    )}
                    {h.amountRefundable && (
                      <span>
                        {t('profile.refundable')}:{' '}
                        <Amount value={h.amountRefundable} currency={currency} />
                      </span>
                    )}
                    {h.amountRetained && (
                      <span>
                        {t('profile.retained')}:{' '}
                        <Amount value={h.amountRetained} currency={currency} />
                      </span>
                    )}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </Panel>

      <Panel
        title={t('profile.holds')}
        actions={
          <Link href={`/console/registry/holds?student=${id}`} className="text-sm underline">
            {t('profile.placeHold')}
          </Link>
        }
      >
        {holds.length === 0 ? (
          <Empty>{t('profile.noHolds')}</Empty>
        ) : (
          <ul className="space-y-3 text-sm">
            {holds.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-2">
                <Pill tone={h.clearedAt ? 'neutral' : h.blocksRegistration ? 'bad' : 'warn'}>
                  {t(`holdType.${h.holdType}`)}
                </Pill>
                <span>{h.reason}</span>
                <span className="text-xs text-muted-foreground">
                  <span className="numeric">{h.effectiveFrom}</span> · {t('holds.placedBy')}{' '}
                  {h.placedBy}
                  {h.clearedAt && ` · ${t('holds.cleared')} ${h.clearedBy ?? ''}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t('profile.registrations')}>
        {registrations.length === 0 ? (
          <Empty>{t('profile.noRegistrations')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('registrations.no')}</Th>
                  <Th>{t('registrations.term')}</Th>
                  <Th>{t('registrations.level')}</Th>
                  <Th numeric>{t('register.net')}</Th>
                  <Th>{t('registrations.statusFilter')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <Td className="numeric">{r.registrationNo}</Td>
                    <Td>{r.termNameEn}</Td>
                    <Td className="numeric">{r.levelYear}</Td>
                    <Td numeric>
                      <Amount value={r.net} currency={r.currency} />
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          r.status === 'REGISTERED'
                            ? 'good'
                            : r.status === 'CANCELLED'
                              ? 'neutral'
                              : 'warn'
                        }
                      >
                        {t(`regStatus.${r.status}`)}
                      </Pill>
                    </Td>
                    <Td>
                      <Link
                        href={`/console/registry/registrations/${r.id}`}
                        className="text-sm underline"
                      >
                        {t('students.open')}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link href={`/console/registry/documents?student=${id}`} className="underline">
          {t('profile.documents')}
        </Link>
        <Link href={`/console/registry/medical?student=${id}`} className="underline">
          {t('profile.medical')}
        </Link>
      </div>
    </div>
  );
}
