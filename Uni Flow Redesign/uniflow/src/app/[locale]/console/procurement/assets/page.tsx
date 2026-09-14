import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { bankAccountOptions } from '@/lib/console/finance';
import { assetRegister, fiscalCalendar } from '@/lib/console/backoffice';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  Empty,
  PageHeader,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { DisposeAsset, RunDepreciation } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('procurement.assets');
  return { title: t('title') };
}

/**
 * The fixed asset register (Track D4, SRS Module 9).
 *
 * Cost, accumulated depreciation and net book value, side by side — the three
 * figures the legacy build could not produce, because an asset was a chart-of-
 * accounts row with a percentage on it and there was no accumulated
 * depreciation account to hold the second one.
 *
 * Accumulated is summed from **posted** depreciation entries, never
 * recomputed from cost and rate. A figure derived twice by two formulas is a
 * figure that will eventually disagree with itself.
 */
export default async function AssetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'procurement/assets');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('procurement.assets');
  const c = await getTranslations('procurement.common');

  const mayManage = principal.permissions.has('asset.manage');
  const mayDepreciate = principal.permissions.has('asset.depreciate');
  const mayDispose = principal.permissions.has('asset.dispose');

  const currency = await tenantCurrency(principal);
  const assets = mayManage ? await assetRegister(principal) : [];
  const years =
    mayDepreciate && principal.permissions.has('period.read')
      ? await fiscalCalendar(principal)
      : [];
  // Only somebody who may dispose needs the proceeds accounts, and the lookup
  // is gated on a permission they may not hold.
  const banks =
    mayDispose && principal.permissions.has('cheque.manage')
      ? await bankAccountOptions(principal, 'cheque.manage')
      : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      {mayDepreciate && (
        <Panel title={t('runDepreciation')}>
          <RunDepreciation years={years} currency={currency} />
        </Panel>
      )}

      <Panel>
        {assets.length === 0 ? (
          <Empty>{t('noAssets')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('assetNo')}</Th>
                  <Th>{t('assetName')}</Th>
                  <Th>{t('category')}</Th>
                  <Th>{t('acquiredOn')}</Th>
                  <Th numeric>{t('cost')}</Th>
                  <Th numeric>{t('accumulated')}</Th>
                  <Th numeric>{t('netBookValue')}</Th>
                  <Th>{c('status')}</Th>
                  {mayDispose && <Th />}
                </tr>
              </thead>
              <tbody>
                {assets.map((a) => (
                  <tr key={a.id}>
                    <Td>
                      <span className="numeric">{a.assetCode}</span>
                      {a.serialNo && (
                        <span className="numeric block text-xs text-muted-foreground">
                          {a.serialNo}
                        </span>
                      )}
                    </Td>
                    <Td>
                      {pickText(locale, a.nameAr, a.nameEn)}
                      {a.location && (
                        <span className="block text-xs text-muted-foreground">
                          {a.location}
                        </span>
                      )}
                    </Td>
                    <Td>{a.categoryName}</Td>
                    <Td>
                      <span className="numeric">{a.inServiceDate}</span>
                    </Td>
                    <Td numeric>
                      <Money amount={a.cost} currency={currency} />
                    </Td>
                    <Td numeric>
                      <Money amount={a.accumulated} currency={currency} />
                    </Td>
                    <Td numeric>
                      <Money amount={a.netBookValue} currency={currency} />
                    </Td>
                    <Td>
                      <Pill tone={a.status === 'IN_SERVICE' ? 'good' : 'neutral'}>
                        {a.status}
                      </Pill>
                    </Td>
                    {mayDispose && (
                      <Td>
                        {a.status === 'IN_SERVICE' && (
                          <DisposeAsset
                            assetId={a.id}
                            banks={banks}
                            currency={currency}
                            netBookValue={a.netBookValue}
                            locale={locale}
                          />
                        )}
                      </Td>
                    )}
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
