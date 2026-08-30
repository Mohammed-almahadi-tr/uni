import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { roleRows } from '@/lib/console/backoffice';
import { MFA_REQUIRED_PERMISSIONS } from '@/lib/auth/rbac';
import { PERMISSIONS, SOD_CONFLICTS } from '@/lib/auth/permissions';
import { ForbiddenScreen } from '@/components/console/text';
import { Empty, PageHeader, Panel, Pill } from '@/components/console/ui';
import { AddRole, EditRole, type PermissionOption } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('settings.roles');
  return { title: t('title') };
}

/**
 * Roles (tenant administration).
 *
 * The legacy build had no role table. `Priv` held one of two strings typed
 * into a combo box, was read at sign-in, and was consulted exactly once more
 * in the entire application — to fill a dropdown on a report filter. So the
 * role existed, was stored, was loaded, and gated nothing.
 *
 * The segregation matrix is printed on this page, in full, with the reason
 * each pair carries. Those reasons were written to be read by a registrar
 * rather than a developer, and the screen where somebody composes a role is
 * where they are worth reading — a refusal at save time explains itself
 * better if the rule was visible beforehand.
 */
export default async function RolesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const guard = await guardConsole(raw, 'settings/roles');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('settings.roles');

  const roles = await roleRows(principal);
  const mayManage = principal.permissions.has('role.manage');

  const mfa = new Set<string>(MFA_REQUIRED_PERMISSIONS);
  const options: PermissionOption[] = PERMISSIONS.map((p) => ({
    key: p.key,
    description: p.description,
    needsMfa: mfa.has(p.key),
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel>
        {roles.length === 0 ? (
          <Empty>{t('noRoles')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {roles.map((r) => (
              <li key={r.id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-sm text-muted-foreground">{r.nameAr}</span>
                  <Pill>{t('permissionCount', { count: r.permissions.length })}</Pill>
                  <span className="text-xs text-muted-foreground">
                    {t('holders')}: <span className="numeric">{r.userCount}</span>
                  </span>
                </div>
                <p className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
                  {r.permissions.map((p) => (
                    <span key={p} className="numeric">
                      {p}
                    </span>
                  ))}
                </p>
                {mayManage && (
                  <div className="mt-3">
                    <EditRole
                      roleId={r.id}
                      roleName={r.name}
                      permissions={options}
                      held={r.permissions}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('legacy')}</p>
      </Panel>

      {mayManage && (
        <Panel title={t('addRole')}>
          <AddRole permissions={options} />
        </Panel>
      )}

      <Panel title={t('matrixTitle')}>
        <ul className="space-y-3 text-sm">
          {SOD_CONFLICTS.map((conflict) => (
            <li key={`${conflict.a}|${conflict.b}`} className="rounded-md border border-border p-3">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="numeric font-medium">{conflict.a}</span>
                <span className="text-muted-foreground">+</span>
                <span className="numeric font-medium">{conflict.b}</span>
              </div>
              <p className="mt-1 text-muted-foreground">{conflict.reason}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-muted-foreground">{t('sodMatrix')}</p>
      </Panel>
    </div>
  );
}
