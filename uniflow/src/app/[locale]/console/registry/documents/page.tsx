import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { studentHeader } from '@/lib/console/lookups';
import { documentChecklist, expiringDocuments } from '@/lib/students/documents';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  Empty,
  PageHeader,
  Panel,
  Pill,
  SuccessBanner,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';
import { StudentStrip } from '@/components/console/student-strip';
import { StudentPicker } from '@/components/console/student-picker';
import { DocumentVerdict } from './forms';
import type { ChecklistState } from '@/lib/students/documents';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.documents');
  return { title: t('title') };
}

const TONE: Record<ChecklistState, 'neutral' | 'good' | 'warn' | 'bad'> = {
  MISSING: 'neutral',
  PENDING: 'warn',
  VERIFIED: 'good',
  REJECTED: 'bad',
  EXPIRED: 'bad',
};

/**
 * Document verification (Track D3, SRS REQ-ST-05).
 *
 * The checklist is against the student's **programme's** requirements, not a
 * fixed list, and `EXPIRED` outranks `VERIFIED` — a passport verified in 2024
 * and expired in 2025 is not a satisfied requirement. B3 wrote that rule
 * because the alternative is how a university discovers in June that its
 * foreign students are out of status; the screen exists so somebody sees it in
 * March.
 */
export default async function DocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/documents');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('registry');
  const sp = await searchParams;
  const header = sp.student ? await studentHeader(principal, sp.student) : null;

  if (!header) {
    const expiring = await expiringDocuments(principal, { withinDays: 60 });
    return (
      <div className="space-y-6">
        <PageHeader title={t('documents.title')} subtitle={t('documents.subtitle')} />
        <StudentPicker
          principal={principal}
          locale={locale}
          query={sp.q ?? ''}
          basePath="/console/registry/documents"
        />
        <Panel title={t('documents.expiring')}>
          {expiring.length === 0 ? (
            <Empty>{t('documents.noExpiring')}</Empty>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{t('common.student')}</Th>
                    <Th>{t('documents.type')}</Th>
                    <Th>{t('documents.expires')}</Th>
                    <Th />
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((d) => (
                    <tr key={d.documentId}>
                      <Td>
                        <span className="numeric text-xs text-muted-foreground">
                          {d.studentNo}
                        </span>{' '}
                        {d.fullNameEn}
                      </Td>
                      <Td className="numeric">{d.code}</Td>
                      <Td className="numeric">{d.expiresOn.toISOString().slice(0, 10)}</Td>
                      <Td>
                        <Link
                          href={`/console/registry/documents?student=${d.studentId}`}
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
      </div>
    );
  }

  const checklist = await documentChecklist(principal, header.id);

  return (
    <div className="space-y-6">
      <PageHeader title={t('documents.title')} subtitle={t('documents.subtitle')} />

      <StudentStrip
        header={header}
        locale={locale}
        href={`/console/registry/students/${header.id}`}
      />

      {checklist.satisfied ? (
        <SuccessBanner>{t('documents.satisfied')}</SuccessBanner>
      ) : (
        checklist.outstanding.length > 0 && (
          <p className="rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
            {t('documents.outstanding', { items: checklist.outstanding.join(', ') })}
          </p>
        )
      )}

      <Panel title={t('documents.checklist')}>
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>{t('documents.type')}</Th>
                <Th>{t('documents.state')}</Th>
                <Th>{t('documents.file')}</Th>
                <Th>{t('documents.expires')}</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {checklist.rows.map((r) => (
                <tr key={r.documentTypeId}>
                  <Td>
                    {pickText(locale, r.nameAr, r.nameEn)}
                    {r.isMandatory && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        ({t('documents.mandatory')})
                      </span>
                    )}
                  </Td>
                  <Td>
                    <Pill tone={TONE[r.state]}>{t(`documents.${r.state}`)}</Pill>
                    {r.rejectionReason && (
                      <span className="ms-2 text-xs text-muted-foreground">
                        {r.rejectionReason}
                      </span>
                    )}
                  </Td>
                  <Td className="text-xs text-muted-foreground">{r.fileName ?? '—'}</Td>
                  <Td className="numeric">
                    {r.expiresOn ? r.expiresOn.toISOString().slice(0, 10) : '—'}
                  </Td>
                  <Td>
                    {r.documentId && r.state === 'PENDING' && (
                      <DocumentVerdict documentId={r.documentId} studentId={header.id} />
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      </Panel>
    </div>
  );
}
