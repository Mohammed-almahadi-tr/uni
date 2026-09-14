import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { BrandingTokens } from '@/lib/cms/branding';
import type { ResolvedTenant } from '@/lib/cms/hosts';
import type { ConsolePhase, VisibleSection } from '@/lib/console/navigation';
import { signOut, setTheme } from '@/app/[locale]/console/actions';
import { currentTheme } from '@/lib/console/theme';
import { ConsoleNav, ConsoleNavDrawer } from './nav';
import { ThemeToggle } from './theme-toggle';

/**
 * The console shell (Track D1).
 *
 * Every screen D2-D5 adds mounts inside this. It renders the tenant's own
 * branding — the same C1 tokens the public site uses, one theme path rather
 * than two — and a navigation tree **generated from the signed-in user's
 * permissions** rather than filtered by CSS.
 *
 * The legacy equivalent is `frmMainPanal`: a form carrying two buttons that
 * every authenticated user saw, because `Priv` was read at login and never
 * consulted again.
 *
 * ## Why a sidebar
 *
 * Six sections carrying some forty screens do not fit a horizontal tab bar
 * without scrolling it, and a section a user cannot see is a section they
 * believe they lack permission for. The sidebar is a sticky column on its own
 * dark ground — the tenant's secondary, so it is still the university's
 * colour — and collapses into a drawer below `md`. The column is reserved by a
 * flex sibling rather than by a fixed panel plus a margin, so it mirrors in
 * RTL with no second set of rules, and it is removed on paper: a printed
 * voucher is a document, not a screenshot of a screen.
 */

type Locale = 'ar' | 'en';

const pick = <T,>(locale: Locale, ar: T, en: T): T => (locale === 'ar' ? ar : en);

function Brand({
  tenant,
  branding,
  locale,
  subtitle,
  tone,
}: {
  tenant: ResolvedTenant;
  branding: BrandingTokens;
  locale: Locale;
  subtitle: string;
  tone: 'sidebar' | 'page';
}) {
  return (
    <Link href="/console" className="flex min-w-0 items-center gap-3">
      {branding.logoUrl ? (
        // Tenant-supplied URL on storage this application does not control.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={branding.logoUrl} alt="" className="h-9 w-auto shrink-0" />
      ) : (
        <span
          className={
            tone === 'sidebar'
              ? 'grid h-9 w-9 shrink-0 place-items-center rounded-md bg-accent text-[0.7rem] font-bold text-accent-foreground'
              : 'grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-[0.7rem] font-bold text-primary-foreground'
          }
          aria-hidden
        >
          {branding.shortCode.slice(0, 3)}
        </span>
      )}
      <span className="min-w-0">
        <span className="block truncate font-display text-sm font-bold leading-tight">
          {pick(locale, tenant.nameAr, tenant.nameEn)}
        </span>
        <span
          className={
            tone === 'sidebar'
              ? 'eyebrow block truncate text-sidebar-muted'
              : 'eyebrow block truncate text-muted-foreground'
          }
        >
          {subtitle}
        </span>
      </span>
    </Link>
  );
}

export async function ConsoleShell({
  tenant,
  branding,
  locale,
  nav,
  user,
  mfaVerified,
  children,
}: {
  tenant: ResolvedTenant;
  branding: BrandingTokens;
  locale: Locale;
  nav: VisibleSection[];
  user: { fullName: string; email: string } | null;
  mfaVerified: boolean;
  children: React.ReactNode;
}) {
  const t = await getTranslations('console');
  const theme = await currentTheme();
  const other: Locale = locale === 'ar' ? 'en' : 'ar';
  const sections = nav.map((s) => ({ key: s.key, path: s.path }));

  const signOutButton = (
    <form action={signOut}>
      <button
        type="submit"
        className="w-full rounded-md border border-sidebar-border px-3 py-2 text-xs font-medium text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground"
      >
        {t('signOut')}
      </button>
    </form>
  );

  // Chrome, so it sits with the language switch and the sign-out button rather
  // than on a settings screen: it is a comfort control, used at the start of a
  // shift and then not again.
  const themeToggle = <ThemeToggle value={theme} action={setTheme} />;

  const identity = user && (
    <div className="min-w-0">
      <span className="block truncate text-sm leading-tight">{user.fullName}</span>
      <span className="block truncate text-xs text-sidebar-muted">{user.email}</span>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-1">
      {/* The sidebar. Application chrome, so it leaves on paper. */}
      <aside className="no-print sticky top-0 hidden h-screen w-[var(--sidebar-width)] shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground md:flex print:hidden">
        <div className="border-b border-sidebar-border p-4">
          <Brand
            tenant={tenant}
            branding={branding}
            locale={locale}
            subtitle={t('title')}
            tone="sidebar"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConsoleNav sections={sections} />
        </div>

        <div className="space-y-3 border-t border-sidebar-border p-3">
          {identity}
          {themeToggle}
          <div className="flex items-center gap-2">
            <Link
              href="/console"
              locale={other}
              className="rounded-md border border-sidebar-border px-2 py-2 text-xs font-medium text-sidebar-muted transition-colors hover:bg-sidebar-active hover:text-sidebar-foreground"
            >
              {other === 'ar' ? 'العربية' : 'English'}
            </Link>
            <div className="min-w-0 flex-1">{signOutButton}</div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* The top bar carries only what the sidebar cannot: the drawer trigger
            and, on a narrow screen, the brand. */}
        <header className="no-print sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur supports-[backdrop-filter]:bg-card/75 print:hidden">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-2.5 md:px-8">
            <ConsoleNavDrawer
              sections={sections}
              label={t('nav.menu')}
              brand={
                <Brand
                  tenant={tenant}
                  branding={branding}
                  locale={locale}
                  subtitle={t('title')}
                  tone="sidebar"
                />
              }
              footer={
                <div className="space-y-3">
                  {identity}
                  {themeToggle}
                  {signOutButton}
                </div>
              }
            />

            <div className="min-w-0 md:hidden">
              <Brand
                tenant={tenant}
                branding={branding}
                locale={locale}
                subtitle={t('title')}
                tone="page"
              />
            </div>
            <span className="hidden md:block" />

            <div className="flex items-center gap-2 text-sm">
              <Link
                href="/console"
                locale={other}
                className="rounded-md border border-border px-2 py-1.5 text-xs font-medium hover:bg-muted md:hidden"
              >
                {other === 'ar' ? 'العربية' : 'English'}
              </Link>
              {user && (
                <span className="hidden text-end md:block">
                  <span className="block truncate text-sm leading-tight">{user.fullName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </span>
              )}
            </div>
          </div>
        </header>

        {!mfaVerified && (
          <p className="no-print border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-foreground md:px-8 print:hidden">
            {t('dashboard.mfaBanner')}
          </p>
        )}

        <main className="print-sheet mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}

/**
 * A screen that is declared, permitted, and not yet built.
 *
 * Named rather than hidden. A user holding `voucher.approve` should be able
 * to see that the approval queue is coming and which phase brings it, rather
 * than wondering whether their permission is broken. The function behind each
 * one is complete and tested; what is missing is the screen.
 */
export async function PendingBadge({ phase }: { phase: ConsolePhase }) {
  const t = await getTranslations('console.pending');
  return (
    <span
      className="shrink-0 rounded-full border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground"
      title={t('note', { phase })}
    >
      {t('badge')} · {phase}
    </span>
  );
}

export async function ForbiddenScreen() {
  const t = await getTranslations('console.forbidden');
  return (
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sheet">
      <h1 className="font-display font-bold">{t('heading')}</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t('body')}</p>
      <Link href="/console" className="mt-4 inline-block text-sm text-primary underline">
        {t('back')}
      </Link>
    </div>
  );
}

export { pick };
export type { Locale };
