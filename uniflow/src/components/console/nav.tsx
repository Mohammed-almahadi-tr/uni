'use client';

import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The console's section bar (Track D1).
 *
 * The sections it receives have already been filtered by the server against
 * the signed-in user's permissions — this component cannot show a section the
 * server did not send, and could not reach one if it did, because the same
 * declaration guards the route.
 *
 * It is a client component only so that the current section can be
 * highlighted from the pathname. Nothing about authorisation happens here.
 */
export function ConsoleNav({ sections }: { sections: { key: string; path: string }[] }) {
  const t = useTranslations('console.sections');
  const pathname = usePathname();

  if (sections.length === 0) return null;

  return (
    <nav className="border-t border-border">
      <div className="mx-auto flex w-full max-w-7xl gap-1 overflow-x-auto px-4 md:px-6">
        {sections.map((s) => {
          const href = `/console/${s.path}`;
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={s.key}
              href={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'whitespace-nowrap border-b-2 px-3 py-2 text-sm',
                active
                  ? 'border-primary font-medium text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t(s.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
