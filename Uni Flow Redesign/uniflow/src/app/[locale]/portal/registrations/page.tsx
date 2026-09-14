import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { redirectLocalised } from '@/lib/console/redirect';
import { portalPage } from '@/lib/portal/page';
import { portalRegistrations } from '@/lib/portal/views';
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
  return { title: t('registrations'), robots: { index: false, follow: false } };
}

/**
 * Every term this student has registered for (SRS REQ-LP-05, REQ-REG-05).
 *
 * Cancelled registrations are on the list with their status on them, not
 * hidden. A term that was registered and then withdrawn is a fact a student
 * has to be able to account for — to a ministry, to a scholarship board, to
 * the university itself — and a list that silently omits it is one they
 * cannot use for the purpose they came for.
 *
 * The card link is only on a registration that is live. A printed proof of a
 * cancelled registration is a document that says something untrue, and the
 * verification page would then have to contradict a card this system issued.
 */
export default async function PortalRegistrationsPage({
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
  const regStatus = await getTranslations('registry.regStatus');
  const registrations = await portalRegistrations(principal, student.studentId);
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const query = principal.students.length > 1 ? `?student=${student.studentId}` : '';

  return (
    <PortalShell
      site={site}
      locale={locale}
      principal={principal}
      student={student}
      active="registrations"
    >
      <Panel title={t('nav.registrations')}>
        {registrations.length === 0 ? (
          <Empty>{t('registrations.none')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('registrations.no')}</Th>
                  <Th>{t('registrations.term')}</Th>
                  <Th numeric>{t('registrations.level')}</Th>
                  <Th>{t('account.date')}</Th>
                  <Th numeric>{t('registrations.net')}</Th>
                  <Th>{t('account.state')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id}>
                    <Td>
                      <span className="numeric">{r.registrationNo}</span>
                    </Td>
                    <Td>
                      {pick(r.termNameAr, r.termNameEn)}{' '}
                      <span className="numeric text-muted-foreground">
                        {r.academicYearCode}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {pick(r.programmeNameAr, r.programmeNameEn)}
                      </span>
                    </Td>
                    <Td numeric>
                      <span className="numeric">{r.levelYear}</span>
                    </Td>
                    <Td>
                      <span className="numeric">{iso(r.registrationDate)}</span>
                    </Td>
                    <Td numeric>
                      <Amount value={r.net} currency={r.currency} />
                    </Td>
                    <Td>
                      <Pill tone={r.status === 'CANCELLED' ? 'bad' : 'good'}>
                        {regStatus(r.status)}
                      </Pill>
                    </Td>
                    <Td>
                      {r.status !== 'CANCELLED' && (
                        <Link
                          href={`/portal/registrations/${r.id}/card${query}`}
                          className="underline hover:no-underline"
                        >
                          {t('registrations.card')}
                        </Link>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </PortalShell>
  );
}
