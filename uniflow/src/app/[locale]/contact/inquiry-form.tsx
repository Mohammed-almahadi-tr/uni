'use client';

import { useActionState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { sendInquiry, type InquiryFormState } from './actions';

const initial: InquiryFormState = { ok: false, message: null };

/**
 * The enquiry form (SRS REQ-LP-06, Track C1).
 *
 * The only client component on the public site, and the only place an
 * unauthenticated request writes anything. Its constraints are repeated here
 * as `required`/`maxLength` for the sender's convenience, and enforced for
 * real in `submitInquiry` and by `chk_inquiry_bounds` — the browser's
 * validation is a courtesy, not a control.
 */
export function InquiryForm() {
  const [state, action, pending] = useActionState(sendInquiry, initial);
  const t = useTranslations('site.contact');

  if (state.ok) {
    return <p className="rounded-md border border-border bg-muted p-4 text-sm">{t('thanks')}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {/* Validation messages come back from the server already written for
              the sender; anything else is reported as the generic failure, so
              the shape of the system is not described to an anonymous caller. */}
          {state.message === 'FAILED' ? t('failed') : state.message}
        </p>
      )}

      <Field name="senderName" label={t('name')} required maxLength={120} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field name="email" label={t('email')} type="email" maxLength={200} dir="ltr" />
        <Field name="phone" label={t('phone')} type="tel" maxLength={32} dir="ltr" />
      </div>
      <p className="text-xs text-muted-foreground">{t('reach')}</p>

      <Field name="subject" label={t('subject')} required maxLength={200} />

      <label className="block">
        <span className="mb-1 block text-sm font-medium">{t('message')}</span>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? t('sending') : t('send')}
      </Button>
    </form>
  );
}

function Field({
  name,
  label,
  type = 'text',
  required,
  maxLength,
  dir,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        maxLength={maxLength}
        dir={dir}
        className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </label>
  );
}
