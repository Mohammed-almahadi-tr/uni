import { setRequestLocale } from 'next-intl/server';
import { redirectLocalised } from '@/lib/console/redirect';
import { brandingFor } from '@/lib/cms/branding';
import { currentContext, currentUser } from '@/lib/console/session';
import { navigationFor } from '@/lib/console/navigation';
import { ConsoleShell } from '@/components/console/shell';
import { localeOf } from '@/components/site/chrome';

/**
 * The authenticated console layout (Track D1).
 *
 * Two jobs, and only two. It establishes that there **is** a usable session
 * for the university this host serves, and it renders the shell around
 * whatever the page returns.
 *
 * It does not decide whether the user may see the page. That belongs to the
 * page, which calls `guardConsole()` with its own path against the single
 * route declaration — a layout cannot see which route below it is rendering,
 * so a guard placed here would be a guard for the wrong thing.
 */
export default async function ConsoleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const ctx = await currentContext();
  if (!ctx) redirectLocalised(raw, '/login');

  const [branding, user] = await Promise.all([
    brandingFor(ctx.principal.tenantId),
    currentUser(),
  ]);

  return (
    <ConsoleShell
      tenant={ctx.tenant}
      branding={branding}
      locale={locale}
      nav={navigationFor(ctx.principal.permissions)}
      user={user}
      mfaVerified={ctx.principal.mfaVerified}
    >
      {children}
    </ConsoleShell>
  );
}
