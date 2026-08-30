import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { auditPage, auditResourceTypes } from '@/lib/console/backoffice';
import { ForbiddenScreen } from '@/components/console/text';
import {
  Empty,
  PageHeader,
  Panel,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';
import { VerifyChain } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.audit');
  return { title: t('title') };
}

const stamp = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');

/** Compact JSON, so a diff is readable in a table cell rather than a wall. */
function summarise(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value !== 'object') return String(value);
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
    .join('  ');
}

/**
 * The audit trail (tenant administration, SRS REQ-NFR-06).
 *
 * Read-only, and there is no write path to this table anywhere in the
 * application — which is what makes the chain worth verifying at all.
 *
 * The before-and-after columns carry what the module recorded rather than a
 * rendering of it. An audit entry is evidence; reformatting it into something
 * friendlier means the thing on screen and the thing that was hashed are two
 * different objects, and only one of them is the record.
 */
export default async function AuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ resource?: string; before?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'settings/audit');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('settings.audit');
  const c = await getTranslations('settings.common');
  const sp = await searchParams;

  const [types, rows] = await Promise.all([
    auditResourceTypes(principal),
    auditPage(principal, {
      resourceType: sp.resource || undefined,
      before: /^\d+$/.test(sp.before ?? '') ? sp.before : undefined,
    }),
  ]);

  const oldest = rows.at(-1)?.seq;

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel title={t('verify')}>
        <VerifyChain />
      </Panel>

      <Panel>
        <form method="get" className="mb-5 flex flex-wrap items-end gap-3">
          <label className="block min-w-56">
            <span className="mb-1 block text-sm font-medium">{t('filterResource')}</span>
            <select
              name="resource"
              defaultValue={sp.resource ?? ''}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{c('all')}</option>
              {types.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {c('search')}
          </button>
        </form>

        {rows.length === 0 ? (
          <Empty>{t('noEntries')}</Empty>
        ) : (
          <>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th numeric>{t('seq')}</Th>
                    <Th>{t('occurredAt')}</Th>
                    <Th>{t('actor')}</Th>
                    <Th>{t('action')}</Th>
                    <Th>{t('resource')}</Th>
                    <Th>{t('details')}</Th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.seq}>
                      <Td numeric>
                        <span className="numeric">{r.seq}</span>
                      </Td>
                      <Td>
                        <span className="numeric text-xs">{stamp(r.occurredAt)}</span>
                      </Td>
                      <Td>{r.actorName ?? '—'}</Td>
                      <Td>
                        <span className="numeric text-xs">{r.action}</span>
                      </Td>
                      <Td>
                        <span className="numeric text-xs">{r.resourceType}</span>
                      </Td>
                      <Td>
                        {r.before !== null && r.before !== undefined && (
                          <div className="text-xs text-muted-foreground">
                            {t('before')}: {summarise(r.before)}
                          </div>
                        )}
                        {r.after !== null && r.after !== undefined && (
                          <div className="text-xs">
                            {t('after')}: {summarise(r.after)}
                          </div>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            {oldest && (
              <form method="get" className="mt-5">
                {sp.resource && (
                  <input type="hidden" name="resource" value={sp.resource} />
                )}
                <input type="hidden" name="before" value={oldest} />
                <button
                  type="submit"
                  className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
                >
                  {t('older')}
                </button>
              </form>
            )}
          </>
        )}
      </Panel>
    </div>
  );
}
