import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { BUILT_PHASES, CONSOLE_SECTIONS, satisfies } from '@/lib/console/navigation';
import { ForbiddenScreen, PendingBadge } from './shell';

/**
 * A console section index (Track D1).
 *
 * Six pages share this because they differ only in which section they name.
 * Each one guards itself against the same route declaration the navigation
 * renders from, so reaching it by typing the address is refused exactly where
 * the menu would not have offered it.
 *
 * Within a section, an item the user may not reach is **absent**, not
 * disabled — a greyed-out control tells someone that a capability exists
 * which they do not have, which the console has no reason to volunteer.
 */
export async function ConsoleSectionPage({
  locale,
  sectionKey,
}: {
  locale: string;
  sectionKey: string;
}) {
  const section = CONSOLE_SECTIONS.find((s) => s.key === sectionKey);
  if (!section) return <ForbiddenScreen />;

  const guard = await guardConsole(locale, section.path);
  if (!guard.ok) return <ForbiddenScreen />;

  const t = await getTranslations('console');
  const held = guard.ctx.principal.permissions;
  const items = section.items.filter((i) => satisfies(held, i.anyOf));

  return (
    <div>
      <h1 className="text-xl font-bold md:text-2xl">{t(`sections.${section.key}`)}</h1>

      <ul className="mt-6 divide-y divide-border rounded-lg border border-border bg-card">
        {items.map((item) => {
          // The same set the sidebar reads. This said `=== 'D1'` until D2,
          // which meant a D3 screen was a working link in the navigation and
          // a greyed-out name on its own section page — the exact
          // disagreement between two renderings of one declaration that
          // CONSOLE_ROUTES exists to make impossible.
          const built = BUILT_PHASES.has(item.phase);
          return (
            <li key={item.key} className="flex items-center justify-between gap-4 p-4">
              {built ? (
                <Link href={`/console/${item.path}`} className="font-medium hover:underline">
                  {t(`items.${item.key}`)}
                </Link>
              ) : (
                <span className="font-medium text-muted-foreground">
                  {t(`items.${item.key}`)}
                </span>
              )}
              {!built && <PendingBadge phase={item.phase} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
