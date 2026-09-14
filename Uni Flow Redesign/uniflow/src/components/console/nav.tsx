'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  Building2,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
  ShoppingCart,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

/**
 * The console's navigation (Track D1, restyled as a persistent sidebar).
 *
 * The sections it receives have already been filtered by the server against
 * the signed-in user's permissions — this component cannot show a section the
 * server did not send, and could not reach one if it did, because the same
 * declaration guards the route.
 *
 * It is a client component for two presentational reasons only: highlighting
 * the current section from the pathname, and opening the drawer on a narrow
 * screen. Nothing about authorisation happens here.
 */

export interface NavSection {
  key: string;
  path: string;
}

/**
 * A section's mark. Twenty-odd routes read as a wall of words without one, and
 * a cashier who works one section learns its shape before its label. Unknown
 * keys fall back rather than crash — a new section added to the declaration
 * must not be able to take the console down.
 */
const ICONS: Record<string, LucideIcon> = {
  finance: Wallet,
  registry: Users,
  academic: GraduationCap,
  procurement: ShoppingCart,
  reports: BarChart3,
  settings: Settings,
};

function NavList({
  sections,
  onNavigate,
}: {
  sections: NavSection[];
  onNavigate?: () => void;
}) {
  const t = useTranslations('console.sections');
  const pathname = usePathname();

  return (
    <nav aria-label="Console" className="flex flex-col gap-0.5 p-3">
      <Item
        href="/console"
        label={t('dashboard')}
        icon={LayoutDashboard}
        active={pathname === '/console'}
        onNavigate={onNavigate}
      />

      {sections.map((s) => {
        const href = `/console/${s.path}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Item
            key={s.key}
            href={href}
            label={t(s.key)}
            icon={ICONS[s.key] ?? Building2}
            active={active}
            onNavigate={onNavigate}
          />
        );
      })}
    </nav>
  );
}

function Item({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
}: {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-sidebar-active font-medium text-sidebar-foreground'
          : 'text-sidebar-muted hover:bg-sidebar-active/60 hover:text-sidebar-foreground',
      )}
    >
      <Icon
        className={cn('h-4 w-4 shrink-0', active ? 'text-accent' : 'opacity-80')}
        aria-hidden
      />
      <span className="min-w-0 truncate">{label}</span>
    </Link>
  );
}

/** The desktop sidebar's list. The chrome around it lives in the shell. */
export function ConsoleNav({ sections }: { sections: NavSection[] }) {
  return <NavList sections={sections} />;
}

/**
 * The same list, in a drawer, for a screen narrower than the sidebar.
 *
 * `footer` is rendered by the server — the sign-out form is a server action and
 * stays that way; this component only decides whether the panel is visible.
 */
export function ConsoleNavDrawer({
  sections,
  label,
  brand,
  footer,
}: {
  sections: NavSection[];
  label: string;
  brand?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // A drawer that survives navigation covers the page the user just asked for.
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label}
        aria-expanded={open}
        className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-border text-foreground hover:bg-muted md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={label}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-secondary/50 backdrop-blur-sm"
          />
          <div className="absolute inset-y-0 start-0 flex w-[min(19rem,86vw)] flex-col bg-sidebar text-sidebar-foreground shadow-raised">
            <div className="flex items-center gap-2 border-b border-sidebar-border p-3">
              <div className="min-w-0 flex-1">{brand}</div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={label}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-sidebar-muted hover:bg-sidebar-active hover:text-sidebar-foreground"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <NavList sections={sections} onNavigate={() => setOpen(false)} />
            </div>
            {footer && (
              <div className="border-t border-sidebar-border p-3">{footer}</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
