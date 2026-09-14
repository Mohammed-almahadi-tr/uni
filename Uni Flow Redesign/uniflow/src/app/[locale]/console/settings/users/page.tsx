import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { roleRows, userRows } from '@/lib/console/backoffice';
import { ForbiddenScreen } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { AddUser, GrantRole } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.users');
  return { title: t('title') };
}

/**
 * People (tenant administration).
 *
 * The screen whose absence meant a university could not add a member of staff
 * without a developer at a REPL — and the one the legacy build had in a form
 * that stored `PWD` in clear beside a `Priv` column nothing ever read.
 *
 * What is shown about a second factor is **whether one is enrolled**, never
 * the secret. That distinction is the reason `userRows` maps `mfaSecret` to a
 * boolean in the query rather than passing the row through.
 */
export default async function UsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'settings/users');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('settings.users');
  const c = await getTranslations('settings.common');

  const users = await userRows(principal);
  const mayManage = principal.permissions.has('user.manage');
  // The role list is `role.read`; somebody may manage users without it, in
  // which case they see who holds what and cannot grant more.
  const roles = principal.permissions.has('role.read') ? await roleRows(principal) : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        {users.length === 0 ? (
          <Empty>{t('noUsers')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {users.map((u) => (
              <li key={u.id} className="py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <div className="min-w-48 flex-1">
                    <div className="font-medium">{u.fullName}</div>
                    <div className="text-xs text-muted-foreground" dir="ltr">
                      {u.email}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {u.roleNames.length === 0 ? (
                      <Pill>{c('none')}</Pill>
                    ) : (
                      u.roleNames.map((n) => <Pill key={n}>{n}</Pill>)
                    )}
                  </div>
                  <Pill tone={u.mfaEnrolled ? 'good' : 'warn'}>
                    {u.mfaEnrolled ? t('enrolled') : t('notEnrolled')}
                  </Pill>
                  {!u.isActive && <Pill tone="neutral">{c('none')}</Pill>}
                </div>
                {mayManage && roles.length > 0 && (
                  <div className="mt-3">
                    <GrantRole userId={u.id} roles={roles} held={u.roleIds} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('legacy')}</p>
      </Panel>

      {mayManage && (
        <Panel title={t('addUser')}>
          <AddUser roles={roles} />
        </Panel>
      )}
    </div>
  );
}
