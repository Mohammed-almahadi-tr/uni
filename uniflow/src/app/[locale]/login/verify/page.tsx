import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { redirectLocalised } from '@/lib/console/redirect';
import { currentContext } from '@/lib/console/session';
import { safeNext } from '@/lib/console/guard';
import { MfaForm } from './mfa-form';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('console.mfa');
  return { title: t('heading') };
}

/** The second-factor step-up (Track D1, SRS REQ-NFR-05). */
export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);

  const t = await getTranslations('console.mfa');
  const next = safeNext((await searchParams).next);

  // Reached without a session — including a session belonging to a different
  // university than this host serves. Back to the start.
  const ctx = await currentContext();
  if (!ctx) redirectLocalised(raw, { pathname: '/login', query: { next } });
  if (ctx.principal.mfaVerified) redirectLocalised(raw, next);

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center p-6">
      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="mb-4 font-semibold">{t('heading')}</h1>
        <MfaForm next={next} />
      </div>
    </main>
  );
}
