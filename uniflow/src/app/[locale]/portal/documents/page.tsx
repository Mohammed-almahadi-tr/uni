import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirectLocalised } from '@/lib/console/redirect';
import { portalPage } from '@/lib/portal/page';
import { portalDocuments } from '@/lib/portal/views';
import { NoSiteConfigured } from '@/components/site/chrome';
import { PortalShell } from '@/components/portal/shell';
import {
  Empty,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
  WarningBanner,
} from '@/components/console/ui';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.nav');
  return { title: t('documents'), robots: { index: false, follow: false } };
}

/**
 * The document checklist (SRS REQ-LP-05, REQ-ST-05, Track C3).
 *
 * B3 built this list for a registrar chasing papers. This is the same list,
 * shown to the person who has to go and find them — including the expiry rule
 * that makes a passport verified in 2024 and expired in 2025 count as
 * missing. A student learning that at a counter in June has lost the morning;
 * a student who could read it in March has not.
 *
 * ## Uploading is not here, and there is a reason rather than an omission
 *
 * The object-storage endpoint does not exist. It is the same one A2's voucher
 * attachments, B3's student documents, C1's media library, D3's photo
 * capture, D4's branding logos, D5's student card and C2's national-ID page
 * are all waiting on — **eight surfaces now**, which is why it is scheduled
 * rather than improvised here for one of them.
 *
 * So the page says, in words, to bring the originals to the registry. A
 * control that accepted a file and dropped it would be worse than no control:
 * a student who believes they have submitted a document does not bring it,
 * and finds out at the registration desk.
 */
export default async function PortalDocumentsPage({
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
  const docStates = await getTranslations('registry.documents');
  const checklist = await portalDocuments(principal, student.studentId);
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const tone = (s: string) =>
    s === 'VERIFIED' ? 'good' : s === 'PENDING' ? 'warn' : s === 'MISSING' ? 'neutral' : 'bad';

  return (
    <PortalShell
      site={site}
      locale={locale}
      principal={principal}
      student={student}
      active="documents"
    >
      <div className="space-y-6">
        {!checklist.satisfied && checklist.rows.length > 0 && (
          <WarningBanner>{t('documents.outstanding')}</WarningBanner>
        )}

        <Panel title={t('nav.documents')}>
          {checklist.rows.length === 0 ? (
            <Empty>{t('documents.none')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('documents.document')}</Th>
                    <Th>{t('documents.required')}</Th>
                    <Th>{t('account.state')}</Th>
                    <Th>{t('documents.expires')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {checklist.rows.map((row) => (
                    <tr key={row.documentTypeId}>
                      <Td>
                        {pick(row.nameAr, row.nameEn)}
                        {/* A rejection is the one state that is useless
                            without its reason: "rejected" tells a student to
                            come and ask, and the reason tells them what to
                            bring instead. */}
                        {row.rejectionReason && (
                          <span className="block text-xs text-destructive">
                            {row.rejectionReason}
                          </span>
                        )}
                      </Td>
                      <Td>
                        {row.isMandatory ? t('documents.mandatory') : t('documents.optional')}
                      </Td>
                      <Td>
                        <Pill tone={tone(row.state)}>{docStates(row.state)}</Pill>
                      </Td>
                      <Td>
                        <span className="numeric">
                          {row.expiresOn ? row.expiresOn.toISOString().slice(0, 10) : '—'}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}

          <p className="mt-5 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
            {t('documents.howToSubmit')}
          </p>
        </Panel>
      </div>
    </PortalShell>
  );
}
