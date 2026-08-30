'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';
import { submitMfa, type MfaState } from '../actions';

const initial: MfaState = { ok: false, error: null };

/**
 * TOTP step-up (Track D1).
 *
 * The session already exists — a password established it — so this raises it
 * rather than completing it. `Continue without verifying` is offered
 * deliberately: everything but the actions in `MFA_REQUIRED_PERMISSIONS`
 * works without a code, and a second factor demanded for reading a report is
 * a control people find a way around.
 */
export function MfaForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(submitMfa, initial);
  const t = useTranslations('console.mfa');
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.replace(state.next ?? '/console');
  }, [state, router]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />

      <p className="text-sm text-muted-foreground">{t('hint')}</p>

      {state.error && (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm"
        >
          {t(state.error)}
        </p>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('code')}</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          dir="ltr"
          className="numeric h-11 w-full rounded-md border border-input bg-background px-3 text-center text-lg tracking-[0.4em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? t('working') : t('submit')}
      </Button>

      <p className="text-xs text-muted-foreground">{t('why')}</p>
      <Link href={next} className="block text-center text-sm underline">
        {t('skip')}
      </Link>
    </form>
  );
}
