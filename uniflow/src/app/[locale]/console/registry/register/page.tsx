import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { schemeOptions, studentHeader, termOptions } from '@/lib/console/lookups';
import { ForbiddenScreen, localeOf } from '@/components/console/text';
import { PageHeader } from '@/components/console/ui';
import { StudentStrip } from '@/components/console/student-strip';
import { StudentPicker } from '@/components/console/student-picker';
import { RegistrationDesk } from './desk';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.register');
  return { title: t('title') };
}

/**
 * The registration desk (Track D3).
 *
 * Student first, by search, because that is the order the work happens in:
 * somebody is standing at the counter. Once chosen, the desk is the client
 * component below — the only interactive screen in D3, because pricing is a
 * conversation and everything else is a form.
 */
export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ student?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/register');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('registry');
  const sp = await searchParams;
  const studentId = sp.student ?? '';

  const header = studentId ? await studentHeader(principal, studentId) : null;

  if (!header) {
    return (
      <div>
        <PageHeader title={t('register.title')} subtitle={t('register.subtitle')} />
        <StudentPicker
          principal={principal}
          locale={locale}
          query={sp.q ?? ''}
          basePath="/console/registry/register"
        />
      </div>
    );
  }

  const [terms, schemes] = await Promise.all([
    termOptions(principal),
    schemeOptions(principal),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('register.title')}
        subtitle={t('register.subtitle')}
        actions={
          <Link
            href="/console/registry/register"
            className="inline-flex h-11 items-center rounded-md border border-border px-4 text-sm hover:bg-muted"
          >
            {t('common.search')}
          </Link>
        }
      />

      <StudentStrip
        header={header}
        locale={locale}
        href={`/console/registry/students/${header.id}`}
      />

      <RegistrationDesk
        terms={terms}
        schemes={schemes}
        studentId={header.id}
        locale={locale}
      />
    </div>
  );
}
