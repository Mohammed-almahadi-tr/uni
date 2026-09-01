'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { blankPassword, changePassword, signOut } from './actions';

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

/** Changing the password. The success message says what it did to the other
 *  devices, because that is the reason somebody is doing it. */
export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, blankPassword);
  const t = useTranslations('portal.settings');

  return (
    <form action={action} className="max-w-md space-y-4">
      {state.error && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          <p>{t(`errors.${state.error}`)}</p>
          {state.problems.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 ps-5 text-xs">
              {state.problems.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      {state.ok && (
        <p
          role="status"
          className="rounded-md border border-success/40 bg-success/10 p-3 text-sm"
        >
          {t('changed')}
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('current')}</span>
        <input
          name="current"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('newPassword')}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="new-password"
          dir="ltr"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('confirm')}</span>
        <input
          name="confirm"
          type="password"
          required
          autoComplete="new-password"
          dir="ltr"
          className={field}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-11 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t('working') : t('change')}
      </button>
    </form>
  );
}

export function SignOutButton() {
  const t = useTranslations('portal.settings');
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        router.replace('/portal/login');
      }}
      className="h-11 rounded-md border border-border px-5 text-sm font-medium hover:bg-muted"
    >
      {t('signOut')}
    </button>
  );
}
