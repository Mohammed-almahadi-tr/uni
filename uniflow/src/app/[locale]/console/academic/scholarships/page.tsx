import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { schemeOptions, studentHeader, tenantCurrency } from '@/lib/console/lookups';
import { academicYearOptions } from '@/lib/console/backoffice';
import { awardRegister, schemeBudget } from '@/lib/sponsors/scholarships';
import { ForbiddenScreen, localeOf, pickText } from '@/components/console/text';
import {
  Empty,
  PageHeader,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from '@/components/console/ui';
import { Money } from '@/components/ui/money';
import { StudentPicker } from '@/components/console/student-picker';
import { AddScheme, AwardDecision, ProposeAward } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academic.scholarships');
  return { title: t('title') };
}

/**
 * Scholarships (Track D4, SRS REQ-SCH-01/02).
 *
 * The legacy equivalent was the phrase `"منحة مجانية"` chosen in a combo box
 * on the registration form — no scheme, no eligibility on file, no budget it
 * came out of, and nobody's signature against it. "How much did we give away
 * last year" and "who decided this one" were both unanswerable.
 *
 * The budget line under each scheme is what makes the first question
 * answerable, and it shows **proposed alongside approved**: an award waiting
 * for a signature is money that will be gone if it is signed, and a budget
 * that ignores the queue tells whoever is about to approve one that there is
 * more room than there is.
 */
export default async function ScholarshipsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ scheme?: string; student?: string; q?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'academic/scholarships');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('academic.scholarships');
  const c = await getTranslations('academic.common');
  const aw = await getTranslations('academic.awardStatus');
  const sp = await searchParams;

  const mayManage = principal.permissions.has('scholarship.manage');
  const mayApprove = principal.permissions.has('scholarship.approve');

  if (!mayManage) {
    // `awardRegister` and `schemeBudget` both demand `scholarship.manage`;
    // an approver who holds only `scholarship.approve` reaches the screen and
    // would otherwise meet a permission error rendered as a broken page.
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        <Panel>
          <Empty>{c('nothing')}</Empty>
        </Panel>
      </div>
    );
  }

  const [currency, schemes, years] = await Promise.all([
    tenantCurrency(principal),
    schemeOptions(principal),
    academicYearOptions(principal, 'scholarship.manage'),
  ]);

  const schemeId = sp.scheme ?? schemes[0]?.id ?? '';
  const [budget, awards] = schemeId
    ? await Promise.all([
        schemeBudget(principal, schemeId),
        awardRegister(principal, { schemeId }),
      ])
    : [null, []];

  const header = sp.student ? await studentHeader(principal, sp.student) : null;

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Panel title={t('schemes')}>
        {schemes.length === 0 ? (
          <Empty>{t('noSchemes')}</Empty>
        ) : (
          <form method="get" className="flex flex-wrap items-end gap-3">
            <label className="block min-w-56 flex-1">
              <span className="mb-1 block text-sm font-medium">{t('scheme')}</span>
              <select
                name="scheme"
                defaultValue={schemeId}
                className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                {schemes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {pickText(locale, s.nameAr, s.nameEn)}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {c('search')}
            </button>
          </form>
        )}

        {budget && (
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground">{t('budgetCap')}</dt>
              <dd>
                {budget.budgetCap ? (
                  <Money amount={budget.budgetCap} currency={currency} />
                ) : (
                  <span className="text-muted-foreground">{t('uncapped')}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('awarded')}</dt>
              <dd>
                <Money amount={budget.awarded} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{aw('PROPOSED')}</dt>
              <dd>
                <span className="numeric text-muted-foreground">
                  ×{budget.pendingCount}
                </span>{' '}
                <Money amount={budget.pendingAmount} currency={currency} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t('remaining')}</dt>
              <dd className="font-semibold">
                {budget.remaining !== null ? (
                  <Money amount={budget.remaining} currency={currency} />
                ) : (
                  <span className="text-muted-foreground">{t('uncapped')}</span>
                )}
              </dd>
            </div>
          </dl>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('capHint')}</p>
      </Panel>

      <Panel title={t('register')}>
        {awards.length === 0 ? (
          <Empty>{t('noAwards')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t('student')}</Th>
                  <Th numeric>{t('amount')}</Th>
                  <Th>{t('status')}</Th>
                  <Th>{c('reason')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {awards.map((a) => (
                  <tr key={a.id}>
                    <Td>
                      {a.studentNameEn}
                      <span className="numeric block text-xs text-muted-foreground">
                        {a.studentNo}
                      </span>
                    </Td>
                    <Td numeric>
                      <Money amount={a.amount} currency={currency} />
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          a.status === 'APPROVED'
                            ? 'good'
                            : a.status === 'PROPOSED'
                              ? 'warn'
                              : 'neutral'
                        }
                      >
                        {aw(a.status)}
                      </Pill>
                      <span className="block text-xs text-muted-foreground">
                        {a.proposedBy}
                        {a.decidedBy && ` → ${a.decidedBy}`}
                      </span>
                    </Td>
                    <Td>{a.reason}</Td>
                    <Td>
                      {a.status === 'PROPOSED' && mayApprove && (
                        <AwardDecision awardId={a.id} />
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
      </Panel>

      <Panel title={t('propose')}>
        {header ? (
          <ProposeAward
            schemes={schemes}
            studentId={header.id}
            years={years}
            locale={locale}
          />
        ) : (
          <StudentPicker
            principal={principal}
            locale={locale}
            query={sp.q ?? ''}
            basePath={`/console/academic/scholarships?scheme=${schemeId}`}
          />
        )}
      </Panel>

      <Panel title={t('addScheme')}>
        <AddScheme years={years} />
      </Panel>
    </div>
  );
}
