'use client';

import { useOptimistic, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import type { Theme } from '@/lib/console/theme';
import { cn } from '@/lib/utils';

/**
 * The colour-scheme control.
 *
 * A three-way segmented control rather than a two-state switch, because a
 * switch cannot express "follow this machine" — and on a shared terminal that
 * is the setting most people want. Icons carry the meaning; the labels are read
 * by screen readers and shown as tooltips, so the control stays one row wide in
 * the sidebar in both languages.
 *
 * The class is applied to <html> immediately and the preference is written in a
 * transition, so the interface changes on the press rather than on the round
 * trip. The stored value is authoritative on the next render; this is only the
 * optimism in between.
 *
 * No direction-specific styling: the row is a flex line of equal cells, so it
 * mirrors with the document in Arabic without a second set of rules.
 */

const OPTIONS: { value: Theme; icon: LucideIcon }[] = [
  { value: 'system', icon: Monitor },
  { value: 'light', icon: Sun },
  { value: 'dark', icon: Moon },
];

export function ThemeToggle({
  value,
  action,
  tone = 'sidebar',
}: {
  value: Theme;
  action: (theme: Theme) => Promise<void>;
  tone?: 'sidebar' | 'page';
}) {
  const t = useTranslations('console.theme');
  const [, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(value);

  const choose = (theme: Theme) => {
    // Written before the request so the surface changes under the finger. The
    // inline script's observer picks the attribute up for `system`.
    document.documentElement.setAttribute('data-theme', theme);
    startTransition(async () => {
      setCurrent(theme);
      await action(theme);
    });
  };

  return (
    <div
      role="group"
      aria-label={t('label')}
      className={cn(
        'flex items-center gap-0.5 rounded-md border p-0.5',
        tone === 'sidebar' ? 'border-sidebar-border' : 'border-border',
      )}
    >
      {OPTIONS.map(({ value: option, icon: Icon }) => {
        const active = current === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => choose(option)}
            aria-pressed={active}
            title={t(option)}
            className={cn(
              'grid h-7 flex-1 place-items-center rounded-[0.3rem] transition-colors',
              tone === 'sidebar'
                ? active
                  ? 'bg-sidebar-active text-sidebar-foreground'
                  : 'text-sidebar-muted hover:text-sidebar-foreground'
                : active
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            <span className="sr-only">{t(option)}</span>
          </button>
        );
      })}
    </div>
  );
}
