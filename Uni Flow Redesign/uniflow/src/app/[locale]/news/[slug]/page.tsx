import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { currentSite, currentTenant } from '@/lib/cms/request';
import { publicPost } from '@/lib/cms/public';
import {
  localeOf,
  NoSiteConfigured,
  pick,
  SectionShell,
  SiteFooter,
  SiteHeader,
} from '@/components/site/chrome';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const tenant = await currentTenant();
  if (!tenant) return {};
  const post = await publicPost(tenant.tenantId, slug);
  if (!post) return {};
  return { title: locale === 'ar' ? post.titleAr : post.titleEn };
}

/**
 * One news item (SRS REQ-LP-05, Track C1).
 *
 * An **archived** post still resolves. It was public, it has been shared and
 * printed, and turning it into a 404 destroys the record of what the
 * institution said; the page marks it out of date instead. A draft, which was
 * never public, is not found.
 */
export default async function NewsPost({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: raw, slug } = await params;
  setRequestLocale(raw);
  const locale = localeOf(raw);

  const t = await getTranslations('site.news');
  const site = await currentSite();
  if (!site) {
    const h = await headers();
    return <NoSiteConfigured host={h.get('x-forwarded-host') ?? h.get('host')} />;
  }

  const post = await publicPost(site.tenant.tenantId, slug);
  if (!post) notFound();

  const body = pick(locale, post.bodyAr, post.bodyEn);

  return (
    <>
      <SiteHeader site={site} locale={locale} />
      <main className="flex-1">
        <SectionShell>
          <article className="mx-auto max-w-3xl">
            {post.isArchived && (
              <p className="mb-4 rounded-md border border-border bg-muted p-3 text-sm text-muted-foreground">
                {t('archived')}
              </p>
            )}
            <h1 className="text-2xl font-bold md:text-3xl">
              {pick(locale, post.titleAr, post.titleEn)}
            </h1>
            {post.publishedAt && (
              <p className="mt-2 text-sm text-muted-foreground">
                <span className="numeric">{post.publishedAt.slice(0, 10)}</span>
              </p>
            )}
            {post.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- tenant-supplied URL.
              <img
                src={post.coverImageUrl}
                alt=""
                className="mt-6 w-full rounded-lg object-cover"
              />
            )}
            {/* Body is stored as plain text and rendered as paragraphs. Rich
                text arrives with the D4 editor, and it will arrive sanitised —
                interpolating editor HTML into a public page is how a CMS
                becomes an XSS delivery mechanism. */}
            <div className="mt-6 space-y-4 leading-relaxed">
              {body
                .split(/\n{2,}/)
                .filter((p) => p.trim())
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </div>
          </article>
        </SectionShell>
      </main>
      <SiteFooter site={site} locale={locale} />
    </>
  );
}
