'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/components/site/chrome';
import { blankActivate, submitActivation } from './actions';

const field = 'h-11 w-full rounded-md border border-input bg-background px-3 text-sm';

/**
 * Two steps on one page (Track C3).
 *
 * The code first, then the password — because until the code has been
 * checked, neither the form nor the person filling it in knows whether an
 * account already exists at that address, and the two cases want different
 * questions. Somebody creating an account is asked to type a new password
 * twice; somebody adding a second child to an account they already have is
 * asked for the one they already know, once.
 */
export function ActivateForm({ locale }: { locale: Locale }) {
  const [state, action, pending] = useActionState(submitActivation, blankActivate);
  const t = useTranslations('portal.activate');
  const router = useRouter();

  useEffect(() => {
    if (state.ok) router.replace('/portal');
  }, [state.ok, router]);

  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="stage" value={state.preview ? 'password' : 'code'} />
      <input type="hidden" name="code" value={state.code} />

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

      {!state.preview ? (
        <>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">{t('code')}</span>
            <input
              name="code"
              required
              autoComplete="off"
              dir="ltr"
              className={`numeric ${field}`}
            />
            <span className="mt-1 block text-xs text-muted-foreground">{t('codeHint')}</span>
          </label>
          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t('working') : t('checkCode')}
          </button>
        </>
      ) : (
        <>
          {/* What the code turned out to mean, before anything is set. A
              person who was handed the wrong code should find out here and
              not after they have chosen a password. */}
          <div className="rounded-md border border-border bg-muted/40 p-4 text-sm">
            <p>{t('for', { name: state.preview.fullName })}</p>
            <p className="mt-1 text-muted-foreground">
              {t('student', {
                name: pick(state.preview.studentNameAr, state.preview.studentNameEn),
              })}
            </p>
            <p className="mt-1 text-muted-foreground" dir="ltr">
              {state.preview.email}
            </p>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">
              {state.preview.accountExists ? t('existingPassword') : t('newPassword')}
            </span>
            <input
              name="password"
              type="password"
              required
              autoComplete={state.preview.accountExists ? 'current-password' : 'new-password'}
              dir="ltr"
              className={field}
            />
            {!state.preview.accountExists && (
              <span className="mt-1 block text-xs text-muted-foreground">
                {t('passwordHint')}
              </span>
            )}
          </label>

          {!state.preview.accountExists && (
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
          )}

          <button
            type="submit"
            disabled={pending}
            className="h-11 w-full rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {pending ? t('working') : t('finish')}
          </button>
        </>
      )}
    </form>
  );
}
