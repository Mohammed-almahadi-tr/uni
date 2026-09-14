'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PermissionKey } from '@/lib/auth/permissions';
import { addRole, setPermissions, type RoleState } from './actions';

const initial: RoleState = { error: null, message: null };

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

export interface PermissionOption {
  key: PermissionKey;
  description: string;
  needsMfa: boolean;
}

/**
 * The permission grid (tenant administration).
 *
 * Every permission this build knows, with its own description — the text the
 * catalogue carries, not a label invented here, so what an administrator
 * reads is what the permission actually gates.
 *
 * Permissions demanding a second factor are marked. That is worth saying on
 * the screen where a role is composed rather than only at the moment somebody
 * is refused: it tells whoever is designing the role what kind of authority
 * they are handing out.
 *
 * **The conflicting pair is refused when the role is saved**, by
 * `setRolePermissions`, and the refusal names the pair and explains it. This
 * form does not pre-check for conflicts — it would be a second implementation
 * of the matrix, and the one that mattered would be the other one.
 */
function PermissionGrid({
  permissions,
  selected,
}: {
  permissions: PermissionOption[];
  selected: Set<string>;
}) {
  const t = useTranslations('settings.roles');
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {permissions.map((p) => (
        <label key={p.key} className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="permissions"
            value={p.key}
            defaultChecked={selected.has(p.key)}
            className="mt-0.5 h-5 w-5 shrink-0"
          />
          <span>
            <span className="numeric block text-xs text-muted-foreground">{p.key}</span>
            {p.description}
            {p.needsMfa && (
              <span className="ms-1 text-xs text-warning">· {t('mfaRequired')}</span>
            )}
          </span>
        </label>
      ))}
    </div>
  );
}

export function AddRole({ permissions }: { permissions: PermissionOption[] }) {
  const [state, action, pending] = useActionState(addRole, initial);
  const t = useTranslations('settings.roles');
  const c = useTranslations('settings.common');

  if (state.message === 'added') {
    return (
      <p className="rounded-md border border-success/40 bg-success/10 p-3 text-sm">
        {c('added')}
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameEn')}</span>
          <input name="name" required dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{c('nameAr')}</span>
          <input name="nameAr" required dir="rtl" className={field} />
        </label>
      </div>
      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">{t('permissions')}</legend>
        <PermissionGrid permissions={permissions} selected={new Set()} />
      </fieldset>
      <p className="text-xs text-muted-foreground">{t('sodMatrix')}</p>
      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('addRole')}
      </button>
    </form>
  );
}

/** Replace one role's permission set. */
export function EditRole({
  roleId,
  roleName,
  permissions,
  held,
}: {
  roleId: string;
  roleName: string;
  permissions: PermissionOption[];
  held: PermissionKey[];
}) {
  const [state, action, pending] = useActionState(setPermissions, initial);
  const [open, setOpen] = useState(false);
  const t = useTranslations('settings.roles');
  const c = useTranslations('settings.common');

  if (state.message === 'saved') {
    return <p className="text-sm text-success">{c('saved')}</p>;
  }

  if (!open) {
    return (
      <div className="space-y-1">
        {state.error && (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted"
        >
          {t('edit')}
        </button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-md border border-border p-4">
      <input type="hidden" name="roleId" value={roleId} />
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {state.error}
        </p>
      )}
      <p className="text-sm font-medium">{roleName}</p>
      <PermissionGrid permissions={permissions} selected={new Set<string>(held)} />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {pending ? c('working') : c('save')}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted"
        >
          {c('cancel')}
        </button>
      </div>
    </form>
  );
}
