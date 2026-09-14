import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { listInquiries } from '@/lib/cms/inquiries';
import { ForbiddenScreen } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { HandleEnquiry } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.enquiries');
  return { title: t('title') };
}

const stamp = (d: Date) => d.toISOString().slice(0, 16).replace('T', ' ');

/**
 * The enquiry inbox (SRS REQ-LP-06).
 *
 * C1 built the public contact form; this is where what it collects is dealt
 * with. Ordered new first, then oldest first within each status — the queue
 * order somebody working through it actually wants, and `listInquiries`
 * already sorts that way.
 */
export default async function EnquiriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'settings/enquiries');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('settings.enquiries');
  const st = await getTranslations('settings.inquiryStatus');

  const rows = await listInquiries(principal);

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        {rows.length === 0 ? (
          <Empty>{t('noEnquiries')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-medium">{r.subject}</span>
                  <Pill
                    tone={
                      r.status === 'NEW'
                        ? 'warn'
                        : r.status === 'CLOSED'
                          ? 'neutral'
                          : 'good'
                    }
                  >
                    {st(r.status)}
                  </Pill>
                  <span className="numeric text-xs text-muted-foreground">
                    {stamp(r.createdAt)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {t('sender')}: {r.senderName}
                  {r.email && (
                    <span dir="ltr">
                      {' · '}
                      {r.email}
                    </span>
                  )}
                  {r.phone && (
                    <span className="numeric" dir="ltr">
                      {' · '}
                      {r.phone}
                    </span>
                  )}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">{r.message}</p>
                {r.responseNote && (
                  <p className="mt-2 text-sm text-muted-foreground">{r.responseNote}</p>
                )}
                {r.status !== 'CLOSED' && (
                  <div className="mt-3">
                    <HandleEnquiry inquiryId={r.id} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('handledHint')}</p>
      </Panel>
    </div>
  );
}
