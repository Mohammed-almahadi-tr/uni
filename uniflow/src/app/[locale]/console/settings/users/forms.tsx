'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import type { RoleRow } from '@/lib/console/backoffice';
import { addUser, grantRole, type UserState } from './actions';

const initial: UserState = { error: null, message: null };

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * Add somebody (tenant administration).
 *
 * Roles are checkboxes rather than a single select, because a person holds a
 * set. The SoD matrix is evaluated against that whole set at save time — two
 * individually clean roles can combine into a conflict, and a control that
 * only fires when somebody tries to misuse the combination has already
 * failed.
 */
export function AddUser({ roles }: { roles: RoleRow[] }) {
  const [state, action, pending] = useActionState(addUser, initial);
  const t = useTranslations('settings.users');
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('fullName')}</span>
          <input name="fullName" required className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('email')}</span>
          <input name="email" type="email" required dir="ltr" className={field} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('password')}</span>
          <input
            name="password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            dir="ltr"
            className={field}
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {t('passwordHint')}
          </span>
        </label>
      </div>

      <fieldset className="rounded-lg border border-border p-4">
        <legend className="px-2 text-sm font-medium">{t('roles')}</legend>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((r) => (
            <label key={r.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="roleIds" value={r.id} className="h-5 w-5" />
              <span>{r.name}</span>
              <span className="numeric text-xs text-muted-foreground">
                {r.permissions.length}
              </span>
            </label>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">{t('sodHint')}</p>
      </fieldset>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? c('working') : t('addUser')}
      </button>
    </form>
  );
}

/** Give somebody one more role, checked against everything they already hold. */
export function GrantRole({
  userId,
  roles,
  held,
}: {
  userId: string;
  roles: RoleRow[];
  held: string[];
}) {
  const [state, action, pending] = useActionState(grantRole, initial);
  const t = useTranslations('settings.users');
  const c = useTranslations('settings.common');

  const available = roles.filter((r) => !held.includes(r.id));
  if (available.length === 0) return null;

  if (state.message === 'assigned') {
    return <p className="text-xs text-success">{t('assigned')}</p>;
  }

  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="userId" value={userId} />
      {state.error && (
        <p role="alert" className="w-full text-xs text-destructive">
          {state.error}
        </p>
      )}
      <label className="block">
        <span className="mb-1 block text-xs text-muted-foreground">{t('assign')}</span>
        <select
          name="roleId"
          required
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {available.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={pending}
        className="h-9 rounded-md border border-border px-3 text-sm hover:bg-muted disabled:opacity-50"
      >
        {pending ? c('working') : c('save')}
      </button>
    </form>
  );
}
