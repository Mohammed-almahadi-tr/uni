'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { signIn, type SignInState } from './actions';

const initial: SignInState = { ok: false, error: null };

/**
 * The sign-in form (Track D1).
 *
 * There is no "look up my name" step. The legacy form had one —
 * `Select FullName From Users Where SNo=` fired on the serial-number field's
 * `Leave` event — and it was a staff directory for anyone who could reach the
 * login screen. Nothing here tells an unauthenticated caller whether an
 * account exists.
 */
export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, initial);
  const t = useTranslations('console.signIn');
  const router = useRouter();

  useEffect(() => {
    if (!state.ok) return;
    // A password alone establishes the session; an enrolled authenticator
    // means the step-up page is next, and it carries the destination on.
    router.replace(
      state.mfaRequired
        ? `/login/verify?next=${encodeURIComponent(state.next ?? '/console')}`
        : (state.next ?? '/console'),
    );
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {t(state.error)}
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('email')}</span>
        <input
          name="email"
          type="email"
          autoComplete="username"
          required
          dir="ltr"
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('password')}</span>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          required
          dir="ltr"
          className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('working') : t('submit')}
      </Button>
    </form>
  );
}
