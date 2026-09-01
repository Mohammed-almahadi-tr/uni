'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { blankSignIn, portalSignIn } from './actions';

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

/** The portal sign-in form (Track C3). Nothing on it tells an unauthenticated
 *  caller whether an address has an account — see `portalLogin`. */
export function PortalLoginForm() {
  const [state, action, pending] = useActionState(portalSignIn, blankSignIn);
  const t = useTranslations('portal.signIn');
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.replace('/portal');
  }, [state.ok, router]);

  return (
    <form action={action} className="space-y-4">
      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {t(`errors.${state.error}`)}
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('email')}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          dir="ltr"
          className={field}
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('password')}</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          dir="ltr"
          className={field}
        />
      </label>

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {pending ? t('working') : t('submit')}
      </button>
    </form>
  );
}
