import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { currentSite, currentTenant } from '@/lib/cms/request';
import { applyOptions, openBatches, MAX_CHOICES } from '@/lib/admissions/portal';
import {
  APPLY_STEPS,
  DRAFT_COOKIE,
  furthestStep,
  isApplyStep,
  mayOpen,
  openDraft,
  type ApplyStep,
} from '@/lib/admissions/draft';
import {
  localeOf,
  NoSiteConfigured,
  SectionShell,
  SiteFooter,
  SiteHeader,
} from '@/components/site/chrome';
import {
  CertificateStep,
  ChoicesStep,
  IdentityStep,
  IntakeStep,
  SubmitStep,
} from './steps';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('apply');
  return { title: t('title') };
}

/**
 * The public admissions application (SRS REQ-LP-04, Track C2).
 *
 * ## What did not exist before
 *
 * The legacy build had no application entity at all. A person became known to
 * the system when a cashier took money from them — `StudentsVacants` computed
 * seats taken from receipt vouchers, so **payment was admission**. There was
 * nowhere to record that somebody applied, nowhere to record that they were
 * refused, and no public surface of any kind: an applicant travelled to the
 * campus, queued, and was typed into a form by a clerk, or they did not apply.
 *
 * ## The portal is closed unless somebody opened it
 *
 * A batch carries an application window and both dates default to NULL, which
 * means closed. This page says so plainly when there is no open intake rather
 * than showing a form that will refuse at the last step.
 *
 * ## The step is in the URL
 *
 * So the back button works, a half-finished form survives a reload, and a link
 * to "the certificate step" is a thing that exists. The answers are **not** in
 * the URL — they are in a signed HttpOnly cookie, because a national ID number
 * in a query string ends up in browser history and in a server log.
 */
export default async function ApplyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { locale: raw } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('apply');
  const site = await currentSite();
  const tenant = await currentTenant();
  if (!site || !tenant) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  const batches = await openBatches(tenant.tenantId);

  if (batches.length === 0) {
    return (
      <>
        <SiteHeader site={site} locale={locale} />
        <main className="flex-1">
          <SectionShell heading={t('title')}>
            <div className="max-w-xl space-y-4">
              <p className="text-sm text-muted-foreground">{t('closed.blurb')}</p>
              <Link
                href="/contact"
                className="inline-flex h-11 items-center rounded-md border border-border px-5 text-sm hover:bg-muted"
              >
                {t('closed.contact')}
              </Link>
            </div>
          </SectionShell>
        </main>
        <SiteFooter site={site} locale={locale} />
      </>
    );
  }

  const jar = await cookies();
  const draft = await openDraft(tenant.tenantId, jar.get(DRAFT_COOKIE)?.value);
  const sp = await searchParams;

  // A step the draft has not reached is not opened. Somebody typing
  // `?step=review` into an empty form is sent to the first thing they have not
  // answered rather than shown a review of nothing.
  const asked = isApplyStep(sp.step) ? sp.step : 'intake';
  const step: ApplyStep = mayOpen(asked, draft) ? asked : furthestStep(draft);

  const options = await applyOptions(tenant.tenantId);
  const batch = batches.find((b) => b.id === draft.batchId) ?? batches[0];

  return (
    <>
      <SiteHeader site={site} locale={locale} />
      <main className="flex-1">
        <SectionShell heading={t('title')} blurb={t('blurb')}>
          <div className="max-w-3xl space-y-8">
            <Progress current={step} draft={draft} />

            {step === 'intake' && (
              <IntakeStep batches={batches} draft={draft} locale={locale} />
            )}
            {step === 'identity' && (
              <IdentityStep
                draft={draft}
                nationalities={options.nationalities}
                locale={locale}
              />
            )}
            {step === 'certificate' && (
              <CertificateStep
                draft={draft}
                certificates={options.certificates}
                locale={locale}
              />
            )}
            {step === 'choices' && (
              <ChoicesStep
                draft={draft}
                batch={batch}
                locale={locale}
                maxChoices={MAX_CHOICES}
              />
            )}
            {step === 'review' && (
              <div className="space-y-6">
                <Review draft={draft} batch={batch} locale={locale} options={options} />
                <SubmitStep />
              </div>
            )}

            <p className="no-print text-xs text-muted-foreground">
              {t('trackHint')}{' '}
              <Link href="/apply/status" className="underline hover:no-underline">
                {t('trackLink')}
              </Link>
            </p>
          </div>
        </SectionShell>
      </main>
      <SiteFooter site={site} locale={locale} />
    </>
  );
}

/**
 * Where the applicant is.
 *
 * A step already answered is a link back to it; one not yet reached is plain
 * text. Rendering every step as a link would let somebody skip to the end and
 * be bounced, which reads as the form being broken rather than as a rule.
 */
async function Progress({
  current,
  draft,
}: {
  current: ApplyStep;
  draft: Awaited<ReturnType<typeof openDraft>>;
}) {
  const t = await getTranslations('apply');

  return (
    <ol className="no-print flex flex-wrap gap-x-2 gap-y-1 text-sm">
      {APPLY_STEPS.map((s, i) => {
        const open = mayOpen(s, draft);
        const isCurrent = s === current;
        return (
          <li key={s} className="flex items-center gap-2">
            {i > 0 && <span className="text-muted-foreground">›</span>}
            {open && !isCurrent ? (
              <Link href={`/apply?step=${s}`} className="underline hover:no-underline">
                {t(`steps.${s}`)}
              </Link>
            ) : (
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={isCurrent ? 'font-semibold' : 'text-muted-foreground'}
              >
                {t(`steps.${s}`)}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * What is about to be submitted, in full.
 *
 * Read-only and complete. A review step that summarises selectively is one
 * where the field somebody mistyped is the field it left out — and this is
 * the last moment before a committee reads it.
 */
async function Review({
  draft,
  batch,
  locale,
  options,
}: {
  draft: Awaited<ReturnType<typeof openDraft>>;
  batch: Awaited<ReturnType<typeof openBatches>>[number];
  locale: 'ar' | 'en';
  options: Awaited<ReturnType<typeof applyOptions>>;
}) {
  const t = await getTranslations('apply');
  const pick = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const category = batch.categories.find((c) => c.id === draft.admissionCategoryId);
  const nationality = options.nationalities.find((n) => n.id === draft.nationalityId);
  const certificate = options.certificates.find((c) => c.id === draft.certificateTypeId);
  const chosen = (draft.choices ?? [])
    .map((id) => batch.programmes.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h3 className="font-semibold">{t('review.title')}</h3>
        <Link
          href="/apply?step=intake"
          className="no-print text-sm underline hover:no-underline"
        >
          {t('review.edit')}
        </Link>
      </div>

      <dl className="grid gap-4 sm:grid-cols-2">
        <Fact label={t('intake.batch')} value={pick(batch.nameAr, batch.nameEn)} />
        <Fact
          label={t('intake.category')}
          value={category ? pick(category.nameAr, category.nameEn) : ''}
        />
        <Fact label={t('identity.nameAr')} value={draft.fullNameAr ?? ''} />
        <Fact label={t('identity.nameEn')} value={draft.fullNameEn ?? ''} />
        <Fact label={t('identity.nationalId')} value={draft.nationalId ?? ''} />
        <Fact label={t('identity.passportNo')} value={draft.passportNo ?? ''} />
        <Fact label={t('identity.dateOfBirth')} value={draft.dateOfBirth ?? ''} />
        <Fact
          label={t('identity.nationality')}
          value={nationality ? pick(nationality.nameAr, nationality.nameEn) : ''}
        />
        <Fact label={t('identity.email')} value={draft.email ?? ''} />
        <Fact label={t('identity.phone')} value={draft.phone ?? ''} />
        <Fact
          label={t('certificate.type')}
          value={certificate ? pick(certificate.nameAr, certificate.nameEn) : ''}
        />
        <Fact
          label={t('certificate.score')}
          value={
            draft.certificateScore && certificate
              ? `${draft.certificateScore} / ${certificate.maxScore}`
              : (draft.certificateScore ?? '')
          }
        />
        <Fact label={t('certificate.year')} value={String(draft.certificateYear ?? '')} />
        <Fact
          label={t('certificate.subjects')}
          value={(draft.subjects ?? []).join('، ')}
        />
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <h4 className="mb-2 text-sm font-medium">{t('choices.title')}</h4>
        <ol className="space-y-1 text-sm">
          {chosen.map((p, i) => (
            <li key={p.id}>
              <span className="numeric text-muted-foreground">{i + 1}.</span>{' '}
              {pick(p.facultyNameAr, p.facultyNameEn)} · {pick(p.nameAr, p.nameEn)}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** One reviewed answer. Declared at module scope rather than inside `Review`:
 *  a component created during render is a new component type on every render,
 *  which throws away the subtree's state. */
function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || '—'}</dd>
    </div>
  );
}
