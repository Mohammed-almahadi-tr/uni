import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { Money } from '@/components/ui/money';
import { formatDual } from '@/lib/i18n/calendar';
import type { PublicFaculty, PublicNewsItem, PublicSite } from '@/lib/cms/public';
import type { PublishedCalendarEntry } from '@/lib/cms/content';
import { pick, SectionShell, type Locale } from './chrome';

/**
 * The landing page's sections (SRS REQ-LP-02, REQ-LP-03, REQ-LP-05,
 * REQ-LP-06, Track C1).
 *
 * Each takes the data the CMS produced and renders it; none of them queries.
 * Which sections appear and in what order is `landing_sections`, read once by
 * the page.
 */

export function Hero({ site, locale }: { site: PublicSite; locale: Locale }) {
  const hero = site.hero;
  if (!hero) return null;

  const headline = pick(locale, hero.headlineAr, hero.headlineEn);
  const sub = pick(locale, hero.subheadlineAr, hero.subheadlineEn);
  const hasMedia = hero.mediaKind !== 'NONE' && hero.mediaUrl;

  return (
    <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
      {hasMedia && hero.mediaKind === 'IMAGE' && (
        // Tenant-supplied URL on storage this application does not control.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.mediaUrl!}
          alt=""
          className="absolute inset-0 -z-10 h-full w-full object-cover"
        />
      )}
      {hasMedia && hero.mediaKind === 'VIDEO' && (
        <video
          className="absolute inset-0 -z-10 h-full w-full object-cover"
          poster={hero.posterUrl ?? undefined}
          autoPlay
          muted
          loop
          playsInline
        >
          <source src={hero.mediaUrl!} />
        </video>
      )}
      {hasMedia && (
        // The overlay is why a headline stays readable over a photograph
        // nobody vetted for contrast. Its opacity is the tenant's, bounded
        // 0-100 by chk_hero_overlay_pct.
        <div
          className="absolute inset-0 -z-10 bg-black"
          style={{ opacity: hero.overlayPct / 100 }}
          aria-hidden
        />
      )}

      <div className="mx-auto w-full max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <h1 className="max-w-3xl text-3xl font-bold leading-tight md:text-5xl">{headline}</h1>
        {sub && <p className="mt-4 max-w-2xl text-base opacity-90 md:text-lg">{sub}</p>}

        {hero.ctas.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-3">
            {hero.ctas.map((c) => {
              const label = pick(locale, c.labelAr, c.labelEn);
              const className =
                c.variant === 'PRIMARY'
                  ? 'inline-flex h-11 items-center rounded-md bg-background px-5 font-medium text-foreground hover:opacity-90'
                  : 'inline-flex h-11 items-center rounded-md border border-current px-5 font-medium hover:bg-white/10';
              // An internal path goes through the locale-aware Link so it keeps
              // the prefix; an absolute URL is a plain anchor.
              return c.href.startsWith('/') ? (
                <Link key={c.href} href={c.href} className={className}>
                  {label}
                </Link>
              ) : (
                <a key={c.href} href={c.href} rel="noreferrer noopener" className={className}>
                  {label}
                </a>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export async function FacultiesSection({
  faculties,
  locale,
  heading,
  blurb,
}: {
  faculties: PublicFaculty[];
  locale: Locale;
  heading: string;
  blurb?: string | null;
}) {
  const t = await getTranslations('site.duration');
  if (faculties.length === 0) return null;
  return (
    <SectionShell heading={heading} blurb={blurb}>
      <div className="grid gap-6 md:grid-cols-2">
        {faculties.map((f) => (
          <div key={f.code} className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">{pick(locale, f.nameAr, f.nameEn)}</h3>
            <ul className="mt-3 space-y-2">
              {f.programmes.map((p) => (
                <li key={p.code} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/programmes/${p.code.toLowerCase()}`} className="hover:underline">
                    {pick(locale, p.nameAr, p.nameEn)}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {t('years', { count: p.durationYears })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

export function NewsSection({
  news,
  locale,
  heading,
  blurb,
}: {
  news: PublicNewsItem[];
  locale: Locale;
  heading: string;
  blurb?: string | null;
}) {
  if (news.length === 0) return null;
  return (
    <SectionShell heading={heading} blurb={blurb}>
      <div className="grid gap-6 md:grid-cols-3">
        {news.map((n) => (
          <NewsCard key={n.slug} item={n} locale={locale} />
        ))}
      </div>
    </SectionShell>
  );
}

export async function NewsCard({ item, locale }: { item: PublicNewsItem; locale: Locale }) {
  const t = await getTranslations('site.news');
  return (
    <article className="flex flex-col rounded-lg border border-border bg-card">
      {item.coverImageUrl && (
        // Tenant-supplied URL on storage this application does not control.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.coverImageUrl}
          alt=""
          className="h-40 w-full rounded-t-lg object-cover"
        />
      )}
      <div className="flex flex-1 flex-col p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          {item.kind === 'ANNOUNCEMENT' ? t('announcement') : t('news')}
          {item.publishedAt && (
            <>
              {' · '}
              <span className="numeric">{item.publishedAt.slice(0, 10)}</span>
            </>
          )}
        </div>
        <h3 className="mt-1 font-semibold leading-snug">
          <Link href={`/news/${item.slug}`} className="hover:underline">
            {pick(locale, item.titleAr, item.titleEn)}
          </Link>
        </h3>
        {pick(locale, item.excerptAr, item.excerptEn) && (
          <p className="mt-2 text-sm text-muted-foreground">
            {pick(locale, item.excerptAr, item.excerptEn)}
          </p>
        )}
      </div>
    </article>
  );
}

export async function CalendarSection({
  entries,
  locale,
  heading,
  blurb,
  limit,
}: {
  entries: PublishedCalendarEntry[];
  locale: Locale;
  heading: string;
  blurb?: string | null;
  limit?: number;
}) {
  const t = await getTranslations('site.calendar');
  const rows = limit ? entries.slice(0, limit) : entries;
  if (rows.length === 0) return null;

  return (
    <SectionShell heading={heading} blurb={blurb}>
      <ol className="divide-y divide-border rounded-lg border border-border bg-card">
        {rows.map((e, i) => (
          <li key={`${e.kind}-${e.startDate}-${i}`} className="flex flex-wrap gap-3 p-4">
            <div className="w-44 shrink-0 text-sm text-muted-foreground">
              {/* Dual calendar: these institutions work to both, and a date
                  printed in only one of them gets transcribed wrongly. */}
              {formatDual(new Date(`${e.startDate}T00:00:00Z`), { locale })}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium">{pick(locale, e.titleAr, e.titleEn)}</div>
              <div className="text-xs text-muted-foreground">{t(e.kind)}</div>
              {pick(locale, e.descriptionAr, e.descriptionEn) && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {pick(locale, e.descriptionAr, e.descriptionEn)}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

export async function CampusSection({
  site,
  locale,
  heading,
  blurb,
}: {
  site: PublicSite;
  locale: Locale;
  heading: string;
  blurb?: string | null;
}) {
  const t = await getTranslations('site.campus');
  if (site.campuses.length === 0) return null;
  return (
    <SectionShell heading={heading} blurb={blurb}>
      <div className="grid gap-6 md:grid-cols-2">
        {site.campuses.map((c) => (
          <div key={c.code} className="rounded-lg border border-border bg-card p-5">
            <h3 className="font-semibold">{pick(locale, c.nameAr, c.nameEn)}</h3>
            {pick(locale, c.addressAr, c.addressEn) && (
              <p className="mt-1 text-sm text-muted-foreground">
                {pick(locale, c.addressAr, c.addressEn)}
              </p>
            )}
            <dl className="mt-3 space-y-1 text-sm">
              {c.phone && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">{t('phone')}</dt>
                  <dd className="numeric">{c.phone}</dd>
                </div>
              )}
              {c.email && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">{t('email')}</dt>
                  <dd>{c.email}</dd>
                </div>
              )}
            </dl>
            {c.latitude && c.longitude && (
              <a
                className="mt-3 inline-block text-sm underline"
                target="_blank"
                rel="noreferrer noopener"
                href={`https://www.openstreetmap.org/?mlat=${c.latitude}&mlon=${c.longitude}#map=16/${c.latitude}/${c.longitude}`}
              >
                {t('map')}
              </a>
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
}

/**
 * The published tuition figure.
 *
 * Read from the approved fee schedule the registration engine bills from — so
 * a prospective student and the cashier are looking at the same number. Where
 * nothing is in force it says so, rather than showing a stale figure the
 * cashier will not honour.
 */
export async function TuitionLine({
  tuition,
}: {
  tuition: PublicFaculty['programmes'][number]['tuition'];
}) {
  const t = await getTranslations('site.programmes');
  if (!tuition) {
    return <p className="text-sm text-muted-foreground">{t('feesUnpublished')}</p>;
  }
  return (
    <p className="text-sm">
      <span className="text-muted-foreground">{t('tuitionPerTerm')}: </span>
      <Money
        amount={tuition.perTerm}
        currency={tuition.currency}
        showCode
        className="font-semibold"
      />
    </p>
  );
}
