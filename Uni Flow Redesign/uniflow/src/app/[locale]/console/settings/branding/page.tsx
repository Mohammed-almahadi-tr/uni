import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { withTenant } from '@/lib/db/client';
import { brandingInTx, socialLinksInTx } from '@/lib/cms/branding';
import { ForbiddenScreen } from '@/components/console/text';
import { PageHeader, Panel } from '@/components/console/ui';
import { BrandingForm, SocialLinks } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.branding');
  return { title: t('title') };
}

/**
 * Tenant identity (SRS REQ-LP-01).
 *
 * The same tokens the public site renders and this console renders — one
 * theme path, not two, which is why C1 built the engine before D1 needed it.
 * Changing a colour here changes both, and the save revalidates both layouts
 * for that reason.
 *
 * Both reads happen in one transaction. Two `withTenant` calls would be two
 * connections and two round trips for a page that is one form.
 */
export default async function BrandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'settings/branding');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('settings.branding');

  const { branding, links } = await withTenant(principal.tenantId, async (tx) => ({
    branding: await brandingInTx(tx, principal.tenantId),
    links: await socialLinksInTx(tx, principal.tenantId),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        <BrandingForm branding={branding} />
      </Panel>

      <Panel title={t('socialLinks')}>
        <SocialLinks links={links} />
      </Panel>
    </div>
  );
}
