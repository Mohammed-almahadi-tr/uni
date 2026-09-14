import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirectLocalised } from '@/lib/console/redirect';
import { portalPage } from '@/lib/portal/page';
import { NoSiteConfigured, pick } from '@/components/site/chrome';
import { PortalShell } from '@/components/portal/shell';
import { Fact, FactGrid, Panel } from '@/components/console/ui';
import { PasswordForm, SignOutButton } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('portal.settings');
  return { title: t('title'), robots: { index: false, follow: false } };
}

/**
 * The account itself (Track C3).
 *
 * ## What it lists, and why the list is here at all
 *
 * Every student this account can read, and how it is related to each. A
 * guardian should be able to see the whole of what they were given access to
 * in one place — and, just as much, a student should be able to see that
 * somebody else can read their account. There is no way to grant that access
 * from this page and no way to withdraw it: the university decided it at the
 * registry desk and the registry desk is where it is withdrawn. What the
 * portal owes the people involved is that it is not a secret.
 *
 * ## What is not here
 *
 * Changing an email address. It is the account's identity and it was the
 * address an invitation was sent to, so moving it is a change to who holds
 * the account — a registry decision, not a settings toggle. Somebody who has
 * lost the address telephones, and the registry issues a fresh invitation.
 */
export default async function PortalSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const sp = await searchParams;

  const state = await portalPage(raw, sp.student);
  if (!state.ok) {
    if (state.reason === 'noSite') return <NoSiteConfigured host={state.host} />;
    if (state.reason === 'noStudent') notFound();
    redirectLocalised(raw, '/portal/login');
  }
  const { locale, site, principal, student } = state;

  const t = await getTranslations('portal.settings');
  const roles = await getTranslations('portal.role');

  return (
    <PortalShell
      site={site}
      locale={locale}
      principal={principal}
      student={student}
      active={null}
    >
      <div className="space-y-6">
        <Panel title={t('account')} actions={<SignOutButton />}>
          <FactGrid>
            <Fact label={t('name')}>{principal.fullName}</Fact>
            <Fact label={t('email')}>
              <span dir="ltr">{principal.email}</span>
            </Fact>
            <Fact label={t('kind')}>{roles(principal.role)}</Fact>
          </FactGrid>
        </Panel>

        <Panel title={t('students')}>
          <ul className="space-y-2 text-sm">
            {principal.students.map((s) => (
              <li key={s.studentId} className="flex flex-wrap items-baseline gap-2">
                <span className="font-medium">
                  {pick(locale, s.fullNameAr, s.fullNameEn)}
                </span>
                <span className="numeric text-xs text-muted-foreground">{s.studentNo}</span>
                {s.relationship && (
                  <span className="text-xs text-muted-foreground">· {s.relationship}</span>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">{t('accessNote')}</p>
        </Panel>

        <Panel title={t('password')}>
          <PasswordForm />
        </Panel>
      </div>
    </PortalShell>
  );
}
