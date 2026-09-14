import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import type { PublicSite } from '@/lib/cms/public';
import type { PortalPrincipal, PortalStudent } from '@/lib/portal/guard';
import { pick, type Locale } from '@/components/site/chrome';

/**
 * The portal's furniture (Track C3).
 *
 * It wears the university's branding, because it *is* the university's — a
 * student signing in to see what they owe is on their institution's site, not
 * on a platform's. That is the opposite of the verification page C2 built,
 * which deliberately makes no claim to be anybody's: the difference is that a
 * verifier is being asked to believe an assertion, and a student is being
 * shown their own record.
 *
 * Reuses the console's small primitives — `Panel`, `Table`, `Amount` — rather
 * than growing a second set. They carry the decisions that were made once in
 * `globals.css`: tabular figures, amounts isolated LTR inside Arabic text,
 * 44px touch targets. A student on a telephone needs those more than a
 * cashier on a desktop does.
 */

export const PORTAL_TABS = [
  { key: 'overview', href: '/portal' },
  { key: 'account', href: '/portal/account' },
  { key: 'statement', href: '/portal/statement' },
  { key: 'instalments', href: '/portal/instalments' },
  { key: 'registrations', href: '/portal/registrations' },
  { key: 'documents', href: '/portal/documents' },
] as const;

export type PortalTab = (typeof PORTAL_TABS)[number]['key'];

/** Carry the selected student through every link, or a guardian's second
 *  child would revert to their first on every navigation. */
function withStudent(href: string, principal: PortalPrincipal, student: PortalStudent) {
  if (principal.students.length < 2) return href;
  return `${href}?student=${student.studentId}`;
}

export async function PortalShell({
  site,
  locale,
  principal,
  student,
  active,
  children,
}: {
  site: PublicSite;
  locale: Locale;
  principal: PortalPrincipal;
  student: PortalStudent;
  active: PortalTab | null;
  children: React.ReactNode;
}) {
  const t = await getTranslations('portal');
  const { tenant, branding } = site;

  return (
    <>
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3 md:px-6">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            {branding.logoUrl ? (
              // A tenant-supplied URL on storage this application does not
              // control, so next/image has no remote pattern for it.
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
            <span className="min-w-0 truncate font-semibold">
              {pick(locale, tenant.nameAr, tenant.nameEn)}
            </span>
          </Link>

          <div className="ms-auto flex items-center gap-3 text-sm">
            <span className="hidden text-muted-foreground sm:inline">
              {principal.fullName}
            </span>
            <Link
              href="/portal/settings"
              className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
            >
              {t('nav.settings')}
            </Link>
          </div>
        </div>

        {/* A guardian with more than one child chooses between them here, and
            the choice rides on every link below. An account with one student
            — which is most of them — is shown no chooser at all. */}
        {principal.students.length > 1 && (
          <div className="border-t border-border bg-muted/40">
            <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-2 px-4 py-2 md:px-6">
              <span className="text-xs text-muted-foreground">{t('nav.viewing')}</span>
              {principal.students.map((s) => (
                <Link
                  key={s.studentId}
                  href={`${active ? tabHref(active) : '/portal'}?student=${s.studentId}`}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs',
                    s.studentId === student.studentId
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border hover:bg-background',
                  )}
                >
                  {pick(locale, s.fullNameAr, s.fullNameEn)}
                </Link>
              ))}
            </div>
          </div>
        )}

        <nav className="border-t border-border">
          <ul className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-2 md:px-4">
            {PORTAL_TABS.map((tab) => (
              <li key={tab.key}>
                <Link
                  href={withStudent(tab.href, principal, student)}
                  className={cn(
                    'block whitespace-nowrap border-b-2 px-3 py-3 text-sm',
                    tab.key === active
                      ? 'border-primary font-medium'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  {t(`nav.${tab.key}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 md:px-6">
        {/* Whose record this is, on every page. A guardian looking at two
            children's accounts in two tabs must never have to work out from
            the figures which tab is which. */}
        <div className="mb-6">
          <h1 className="text-xl font-bold md:text-2xl">
            {pick(locale, student.fullNameAr, student.fullNameEn)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <span className="numeric">{student.studentNo}</span>
            {student.programmeNameEn && (
              <>
                {' · '}
                {pick(locale, student.programmeNameAr ?? '', student.programmeNameEn)}
              </>
            )}
            {student.relationship && <> · {student.relationship}</>}
          </p>
        </div>
        {children}
      </main>

      <footer className="border-t border-border py-6">
        <p className="mx-auto max-w-5xl px-4 text-xs text-muted-foreground md:px-6">
          {t('footer')}
        </p>
      </footer>
    </>
  );
}

function tabHref(key: PortalTab): string {
  return PORTAL_TABS.find((t) => t.key === key)?.href ?? '/portal';
}
