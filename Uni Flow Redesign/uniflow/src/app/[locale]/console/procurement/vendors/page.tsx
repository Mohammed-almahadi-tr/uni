import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { vendorOptions } from '@/lib/console/backoffice';
import { pendingBankChanges } from '@/lib/procurement/vendors';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { AddVendor, BlockVendor, DecideBank, ProposeBank } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('procurement.vendors');
  return { title: t('title') };
}

const stamp = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Suppliers (Track D4, SRS REQ-PRC-01).
 *
 * The pending bank changes sit at the top rather than in a corner, because a
 * proposal nobody notices is a proposal that gets approved in a hurry when
 * somebody complains they have not been paid — and hurry is what the fraud
 * relies on. The previous account number is shown beside the proposed one so
 * an approver can see what is actually changing.
 */
export default async function VendorsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'procurement/vendors');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.vendors');
  const c = await getTranslations('procurement.common');

  const mayManage = principal.permissions.has('vendor.manage');
  const mayApprove = principal.permissions.has('vendor.approve');

  const vendors = mayManage ? await vendorOptions(principal, 'vendor.manage') : [];
  const pending = mayApprove ? await pendingBankChanges(principal) : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {mayApprove && (
        <Panel title={t('pendingChanges')}>
          {pending.length === 0 ? (
            <Empty>{t('noPending')}</Empty>
          ) : (
            <ul className="divide-y divide-border">
              {pending.map((p) => (
                <li key={p.id} className="py-4">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <span className="numeric text-sm text-muted-foreground">
                      {p.vendorCode}
                    </span>
                    <span className="font-medium">{p.vendorName}</span>
                    <span className="numeric text-xs text-muted-foreground">
                      {stamp(p.requestedAt)}
                    </span>
                  </div>
                  <dl className="mt-2 flex flex-wrap gap-6 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('previous')}</dt>
                      <dd className="numeric" dir="ltr">
                        {p.previousAccountNo ?? c('none')}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">{t('proposed')}</dt>
                      <dd className="numeric font-semibold" dir="ltr">
                        {p.proposedAccountNo ?? c('none')}
                      </dd>
                    </div>
                  </dl>
                  <p className="mt-1 text-sm">{p.reason}</p>
                  <div className="mt-3">
                    <DecideBank requestId={p.id} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-muted-foreground">{t('bankFraudHint')}</p>
        </Panel>
      )}

      <Panel>
        {vendors.length === 0 ? (
          <Empty>{t('noVendors')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {vendors.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center gap-4 py-3">
                <span className="numeric text-sm text-muted-foreground">{v.code}</span>
                <span className="min-w-48 flex-1">
                  {pickText(locale, v.nameAr, v.nameEn)}
                </span>
                {v.isBlocked && <Pill tone="bad">{t('blocked')}</Pill>}
                {mayManage && !v.isBlocked && <BlockVendor vendorId={v.id} />}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {mayManage && vendors.length > 0 && (
        <Panel title={t('requestChange')}>
          <ProposeBank vendors={vendors} locale={locale} />
        </Panel>
      )}

      {mayManage && (
        <Panel title={t('addVendor')}>
          <AddVendor />
        </Panel>
      )}
    </div>
  );
}
