import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { navigationFor } from '@/lib/console/navigation';
import { ForbiddenScreen, PendingBadge } from '@/components/console/shell';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('console');
  return { title: t('title') };
}

/**
 * The console dashboard (Track D1).
 *
 * It answers one question: **what may I do here?** — which is the question
 * the legacy build could not answer about itself. `Priv` held one of two
 * strings, was loaded into a global at login, and was never read; every
 * authenticated user saw the same two buttons on `frmMainPanal` and could
 * open every screen behind them.
 *
 * This list is generated from the roles the signed-in user actually holds. If
 * something is missing from it, it is missing from their menu and refused at
 * its address, because the navigation and the route guard read the same
 * declaration.
 */
export default async function ConsoleHome({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const guard = await guardConsole(locale, '');
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('console');
  const nav = navigationFor(guard.ctx.principal.permissions);

  return (
    <div>
      <h1 className="text-xl font-bold md:text-2xl">{t('dashboard.heading')}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t('dashboard.blurb')}</p>

      {nav.length === 0 ? (
        <p className="mt-8 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          {t('dashboard.nothing')}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {nav.map((section) => (
            <section key={section.key} className="rounded-lg border border-border bg-card p-5">
              <h2 className="font-semibold">
                <Link href={`/console/${section.path}`} className="hover:underline">
                  {t(`sections.${section.key}`)}
                </Link>
              </h2>
              <ul className="mt-3 space-y-2 text-sm">
                {section.items.map((item) => (
                  <li key={item.key} className="flex items-center justify-between gap-3">
                    {item.built ? (
                      <Link href={`/console/${item.path}`} className="hover:underline">
                        {t(`items.${item.key}`)}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">{t(`items.${item.key}`)}</span>
                    )}
                    {!item.built && <PendingBadge phase={item.phase} />}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
