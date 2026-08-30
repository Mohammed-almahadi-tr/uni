import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { guardConsole } from '@/lib/console/guard';
import { tenantCurrency } from '@/lib/console/lookups';
import { batchOptions, offersFor, programmeRows } from '@/lib/console/backoffice';
import { rankedList } from '@/lib/admissions/applications';
import { waitlistFor } from '@/lib/admissions/offers';
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
import { ApplicantActions, IssueOffer, OfferActions, Promote } from './forms';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('academic.committee');
  return { title: t('title') };
}

/**
 * The admissions committee (Track D4, SRS REQ-ADM-CAP-03/04).
 *
 * One programme and one intake at a time, chosen in the address, because that
 * is the unit a committee actually sits over.
 *
 * **Applicants who failed screening are listed and marked, not filtered out.**
 * That is the engine's decision and this screen keeps it: a committee that
 * cannot see the near-misses cannot exercise the discretion it exists for, and
 * a list that quietly omits them looks identical to one where nobody applied.
 *
 * The legacy build had no part of this. An admission was a row appearing in
 * the students table — no screening verdict, no rationale, no offer to accept
 * or decline, no seat to run out of, and no waiting list. Deciding and having
 * capacity were the same act.
 */
export default async function AdmissionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ programme?: string; batch?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const guard = await guardConsole(raw, 'registry/admissions');
  if (!guard.ok) return <ForbiddenScreen />;
  const principal = guard.ctx.principal;

  const t = await getTranslations('academic.committee');
  const c = await getTranslations('academic.common');
  const st = await getTranslations('academic.applicationState');
  const dec = await getTranslations('academic.decision');
  const el = await getTranslations('academic.eligibility');
  const os = await getTranslations('academic.offerState');
  const sp = await searchParams;

  const [currency, programmes, batches] = await Promise.all([
    tenantCurrency(principal),
    programmeRows(principal, 'application.read'),
    batchOptions(principal, 'application.read'),
  ]);

  const active = programmes.filter((p) => p.isActive);
  const programmeId = sp.programme ?? '';
  const batchId = sp.batch ?? '';
  const chosen = Boolean(programmeId && batchId);

  const [ranked, offers, waiting] = chosen
    ? await Promise.all([
        rankedList(principal, programmeId, batchId),
        offersFor(principal, programmeId, batchId),
        waitlistFor(principal, programmeId, batchId),
      ])
    : [[], [], []];

  const mayDecide = principal.permissions.has('application.decide');
  const mayOffer = principal.permissions.has('application.offer');
  const mayEnrol = principal.permissions.has('application.enrol');
  const mayOverride = principal.permissions.has('admission.override');

  // A seat comes free when an offer is declined, lapses or is withdrawn.
  // Those are the offers a promotion can be attached to.
  const freed = offers.filter(
    (o) => o.state === 'DECLINED' || o.state === 'LAPSED' || o.state === 'WITHDRAWN',
  );

  const selector = (
    <Panel>
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block min-w-56 flex-1">
          <span className="mb-1 block text-sm font-medium">{t('programme')}</span>
          <select
            name="programme"
            defaultValue={programmeId}
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              —
            </option>
            {active.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} · {pickText(locale, p.nameAr, p.nameEn)}
              </option>
            ))}
          </select>
        </label>
        <label className="block min-w-40">
          <span className="mb-1 block text-sm font-medium">{t('batch')}</span>
          <select
            name="batch"
            defaultValue={batchId}
            required
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="" disabled>
              —
            </option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="h-11 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {t('show')}
        </button>
      </form>
    </Panel>
  );

  if (!chosen) {
    return (
      <div className="space-y-6">
        <PageHeader title={t('title')} subtitle={t('subtitle')} />
        {selector}
        <Panel>
          <Empty>{t('chooseCohort')}</Empty>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('title')} subtitle={t('subtitle')} />
      {selector}

      <Panel title={t('ranked')}>
        {ranked.length === 0 ? (
          <Empty>{t('noApplicants')}</Empty>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th numeric>{t('rank')}</Th>
                  <Th>{t('applicationNo')}</Th>
                  <Th>{t('applicant')}</Th>
                  <Th numeric>{t('choiceRank')}</Th>
                  <Th numeric>{t('certificateScore')}</Th>
                  <Th numeric>{t('committeeScore')}</Th>
                  <Th>{t('eligibilityLabel')}</Th>
                  <Th>{t('state')}</Th>
                  <Th>{t('decisionLabel')}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {ranked.map((r) => (
                  <tr key={r.applicationId}>
                    <Td numeric>
                      <span className="numeric">{r.rank}</span>
                    </Td>
                    <Td>
                      <span className="numeric">{r.applicationNo}</span>
                    </Td>
                    <Td>
                      <div>{r.fullNameAr}</div>
                      <div className="text-xs text-muted-foreground" dir="ltr">
                        {r.fullNameEn}
                      </div>
                    </Td>
                    <Td numeric>
                      <span className="numeric">{r.choiceRank}</span>
                    </Td>
                    <Td numeric>
                      <span className="numeric">{r.certificateScore ?? '—'}</span>
                    </Td>
                    <Td numeric>
                      <span className="numeric">{r.committeeScore ?? '—'}</span>
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          r.eligibility === 'PASS'
                            ? 'good'
                            : r.eligibility === 'FAIL'
                              ? 'bad'
                              : 'neutral'
                        }
                      >
                        {el(r.eligibility)}
                      </Pill>
                      {r.eligibilityNotes.length > 0 && (
                        <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {r.eligibilityNotes.map((n, i) => (
                            <li key={i}>{n}</li>
                          ))}
                        </ul>
                      )}
                    </Td>
                    <Td>{st(r.state)}</Td>
                    <Td>{r.decision ? dec(r.decision) : '—'}</Td>
                    <Td>
                      <div className="space-y-2">
                        <ApplicantActions
                          applicationId={r.applicationId}
                          committeeScore={r.committeeScore}
                          mayDecide={mayDecide}
                        />
                        {mayOffer &&
                          (r.decision === 'ACCEPT' ||
                            r.decision === 'CONDITIONAL_ACCEPT') &&
                          r.state !== 'OFFERED' &&
                          r.state !== 'ENROLLED' && (
                            <IssueOffer
                              applicationId={r.applicationId}
                              programmeId={programmeId}
                              mayOverride={mayOverride}
                            />
                          )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}
        <p className="mt-4 text-xs text-muted-foreground">{t('failsShown')}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t('rescreenHint')}</p>
      </Panel>

      <Panel title={t('offers')}>
        {offers.length === 0 ? (
          <Empty>{t('noOffers')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {offers.map((o) => (
              <li key={o.id} className="py-4">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="numeric text-sm text-muted-foreground">
                    {o.applicationNo}
                  </span>
                  <span className="font-medium">
                    {pickText(locale, o.fullNameAr, o.fullNameEn)}
                  </span>
                  <Pill
                    tone={
                      o.state === 'ACCEPTED'
                        ? 'good'
                        : o.state === 'ISSUED'
                          ? 'warn'
                          : 'neutral'
                    }
                  >
                    {os(o.state)}
                  </Pill>
                  <span className="numeric text-xs text-muted-foreground">
                    {t('acceptBy')} {o.acceptBy}
                  </span>
                  {o.overrodeCapacity && (
                    <Pill tone="bad">{t('overrodeCapacity')}</Pill>
                  )}
                  {o.promotedFromId && (
                    <span className="text-xs text-muted-foreground">
                      {t('promotedInto')}
                    </span>
                  )}
                </div>
                {o.conditions && <p className="mt-1 text-sm">{o.conditions}</p>}
                {o.overrideReason && (
                  <p className="mt-1 text-xs text-muted-foreground">{o.overrideReason}</p>
                )}
                {o.closeReason && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t('closedBecause', { reason: o.closeReason })}
                  </p>
                )}
                {mayOffer && (
                  <div className="mt-3">
                    <OfferActions row={o} mayEnrol={mayEnrol} currency={currency} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title={t('waitlist')}>
        {waiting.length === 0 ? (
          <Empty>{t('noWaitlist')}</Empty>
        ) : (
          <ul className="divide-y divide-border">
            {waiting.map((w) => (
              <li key={w.applicationId} className="py-3">
                <div className="flex flex-wrap items-baseline gap-3">
                  <span className="numeric text-sm text-muted-foreground">
                    {w.applicationNo}
                  </span>
                  <span className="flex-1">{w.fullNameEn}</span>
                  <span className="numeric text-sm">
                    {w.committeeScore ?? w.certificateScore ?? '—'}
                  </span>
                </div>
                {mayOffer && (
                  <div className="mt-2">
                    <Promote
                      applicationId={w.applicationId}
                      applicationNo={w.applicationNo}
                      programmeId={programmeId}
                      freed={freed}
                    />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {freed.length === 0 && waiting.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">{c('nothing')}</p>
        )}
      </Panel>
    </div>
  );
}
