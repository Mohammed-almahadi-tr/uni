import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import type { BrandingTokens } from '@/lib/cms/branding';
import type { ResolvedTenant } from '@/lib/cms/hosts';
import type { ConsolePhase, VisibleSection } from '@/lib/console/navigation';
import { signOut } from '@/app/[locale]/console/actions';
import { ConsoleNav } from './nav';

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
 */

type Locale = 'ar' | 'en';

const pick = <T,>(locale: Locale, ar: T, en: T): T => (locale === 'ar' ? ar : en);

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
  const other: Locale = locale === 'ar' ? 'en' : 'ar';

  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-7xl items-center gap-4 px-4 py-3 md:px-6">
          <Link href="/console" className="flex min-w-0 items-center gap-3">
            {branding.logoUrl ? (
              // Tenant-supplied URL on storage this application does not control.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.logoUrl} alt="" className="h-9 w-auto shrink-0" />
            ) : (
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-xs font-bold text-primary-foreground"
                aria-hidden
              >
                {branding.shortCode.slice(0, 3)}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold leading-tight">
                {pick(locale, tenant.nameAr, tenant.nameEn)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{t('title')}</span>
            </span>
          </Link>

          <div className="ms-auto flex items-center gap-3 text-sm">
            {user && (
              <span className="hidden text-end sm:block">
                <span className="block leading-tight">{user.fullName}</span>
                <span className="block text-xs text-muted-foreground">{user.email}</span>
              </span>
            )}
            <Link
              href="/console"
              locale={other}
              className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-muted"
            >
              {other === 'ar' ? 'العربية' : 'English'}
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                {t('signOut')}
              </button>
            </form>
          </div>
        </div>

        <ConsoleNav sections={nav.map((s) => ({ key: s.key, path: s.path }))} />
      </header>

      {!mfaVerified && (
        <p className="border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs md:px-6">
          {t('dashboard.mfaBanner')}
        </p>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-6">{children}</main>
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
    <div className="mx-auto max-w-md rounded-lg border border-border bg-card p-6 text-center">
      <h1 className="font-semibold">{t('heading')}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t('body')}</p>
      <Link href="/console" className="mt-4 inline-block text-sm underline">
        {t('back')}
      </Link>
    </div>
  );
}

export { pick };
export type { Locale };
