import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { guardConsole } from '@/lib/console/guard';
import { listRegistrations } from '@/lib/registration/engine';
import { termOptions } from '@/lib/console/lookups';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  Amount,
  Empty,
  PageHeader,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';
import type { RegistrationStatus } from '@/generated/prisma/enums';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('registry.registrations');
  return { title: t('title') };
}

const STATUSES: RegistrationStatus[] = ['PENDING_APPROVAL', 'REGISTERED', 'CANCELLED'];

/**
 * Registrations (Track D3).
 *
 * `PENDING_APPROVAL` is first in the filter and first in the default order of
 * a registrar's attention: those are registrations that exist, carry a
 * discount above the tenant's threshold, and have **posted nothing**. Until
 * somebody with `discount.approve` signs one, the student owes nothing and
 * the ledger has never heard of it — which is the state B4 introduced and the
 * legacy build had no way to represent, because a discount there was a number
 * typed into a box with nobody's name against it.
 */
export default async function RegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; term?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/registrations');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('registry');
  const sp = await searchParams;
  const status = STATUSES.includes(sp.status as RegistrationStatus)
    ? (sp.status as RegistrationStatus)
    : undefined;

  const [rows, terms] = await Promise.all([
    listRegistrations(principal, { status, academicTermId: sp.term || undefined }),
    termOptions(principal),
  ]);

  return (
    <div>
      <PageHeader title={t('registrations.title')} />

      <form method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {t('registrations.statusFilter')}
          </span>
          <select
            name="status"
            defaultValue={status ?? ''}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t('common.all')}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {t(`regStatus.${s}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">{t('registrations.term')}</span>
          <select
            name="term"
            defaultValue={sp.term ?? ''}
            className="h-11 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">{t('common.all')}</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.academicYearCode} · {pickText(locale, term.nameAr, term.nameEn)}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('common.search')}
        </button>
      </form>

      <Panel>
        {rows.length === 0 ? (
          <Empty>{t('registrations.none')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('registrations.no')}</Th>
                  <Th>{t('common.student')}</Th>
                  <Th>{t('registrations.term')}</Th>
                  <Th numeric>{t('register.net')}</Th>
                  <Th>{t('registrations.statusFilter')}</Th>
                  <Th>{t('registrations.voucher')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="numeric">{r.registrationNo}</Td>
                    <Td>
                      <span className="block">
                        {pickText(locale, r.studentNameAr, r.studentNameEn)}
                      </span>
                      <span className="numeric block text-xs text-muted-foreground">
                        {r.studentNo}
                      </span>
                    </Td>
                    <Td>{r.termNameEn}</Td>
                    <Td numeric>
                      <Amount value={r.net} currency={r.currency} />
                      {r.discountPct !== '0.0000' && (
                        <span className="numeric block text-xs text-muted-foreground">
                          −{r.discountPct}%
                        </span>
                      )}
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          r.status === 'REGISTERED'
                            ? 'good'
                            : r.status === 'CANCELLED'
                              ? 'neutral'
                              : 'warn'
                        }
                      >
                        {t(`regStatus.${r.status}`)}
                      </Pill>
                    </Td>
                    <Td className="numeric">{r.voucherRef ?? '—'}</Td>
                    <Td>
                      <Link
                        href={`/console/registry/registrations/${r.id}`}
                        className="text-sm underline"
                      >
                        {t('students.open')}
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>
    </div>
  );
}
