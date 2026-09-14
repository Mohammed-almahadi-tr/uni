import 'server-only';
import type { DegreeLevel } from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { resolveFeeSchedule } from '@/lib/academic/fee-matrix';
import {
  brandingInTx,
  socialLinksInTx,
  type BrandingTokens,
} from './branding';
import {
  campusesInTx,
  heroInTx,
  publishedCalendarInTx,
  sectionsInTx,
  type PublishedCalendarEntry,
  type SectionRow,
} from './content';
import { resolveTenantByHost, type ResolvedTenant } from './hosts';

/**
 * The public read path (SRS REQ-LP-01 to REQ-LP-06, Track C1).
 *
 * Everything here serves a request that carries no session. Three properties
 * hold across all of it:
 *
 *   · **The tenant comes from the host, and only from the host.** There is no
 *     fallback to "the only tenant" and no query-string override. If the host
 *     resolves to nothing the answer is nothing — guessing is how one
 *     university's page ends up on another's domain.
 *
 *   · **Everything after the host lookup runs under `withTenant`**, as the
 *     app role, confined by RLS. The public site is not privileged; it simply
 *     has no user.
 *
 *   · **Published means published.** A draft is invisible here, not merely
 *     unlinked. The only exception is `preview`, which takes an explicit flag
 *     the caller may set only after checking `cms.manage`.
 */

export interface PublicProgramme {
  code: string;
  nameAr: string;
  nameEn: string;
  degreeLevel: DegreeLevel;
  durationYears: number;
  durationTerms: number;
  overviewAr: string | null;
  overviewEn: string | null;
  careerProspectsAr: string | null;
  careerProspectsEn: string | null;
  facultyCode: string;
  facultyNameAr: string;
  facultyNameEn: string;
  /** Null when no approved schedule is in force — see `publishedTuition`. */
  tuition: PublishedTuition | null;
}

export interface PublishedTuition {
  currency: string;
  /** Mandatory items only: what every student on this cohort is billed. */
  perTerm: string;
  /** Which batch and category the figure was quoted for. */
  batchCode: string;
  admissionCategoryCode: string;
  effectiveFrom: string;
}

export interface PublicFaculty {
  code: string;
  nameAr: string;
  nameEn: string;
  programmes: PublicProgramme[];
}

export interface PublicNewsItem {
  slug: string;
  kind: string;
  titleAr: string;
  titleEn: string;
  excerptAr: string | null;
  excerptEn: string | null;
  coverImageUrl: string | null;
  publishedAt: string | null;
  isPinned: boolean;
}

export interface PublicSite {
  tenant: ResolvedTenant;
  branding: BrandingTokens;
  social: { platform: string; url: string }[];
  sections: SectionRow[];
  hero: Awaited<ReturnType<typeof heroInTx>>;
  faculties: PublicFaculty[];
  news: PublicNewsItem[];
  calendar: PublishedCalendarEntry[];
  campuses: Awaited<ReturnType<typeof campusesInTx>>;
}

/**
 * The published tuition for a programme (REQ-LP-03).
 *
 * Read from the **same** approved, effective-dated fee schedule the
 * registration engine bills from — never from a separate "published fees"
 * field. B1 made a schedule immutable and versioned so that "what did this
 * student owe when they registered" stays answerable; publishing a second
 * copy of the number on the website would give the institution two answers to
 * "what does this programme cost", which is the position the legacy build was
 * already in with `CollegeFees.TuitionFees` and `Transactions.TuitionFees`.
 *
 * Returns null rather than a stale figure when nothing is in force. The page
 * then says to contact admissions, which is true, instead of quoting a price
 * the cashier will not honour.
 *
 * The quote is for the **newest active batch** and the tenant's GENERAL
 * admission category, on the any-nationality fallback row — an indicative
 * figure for a prospective national entrant, which is who reads this page. A
 * specific applicant's price is resolved at registration against their own
 * four dimensions.
 */
export async function publishedTuitionInTx(
  tx: Tx,
  tenantId: string,
  programmeId: string,
  onDate: Date,
): Promise<PublishedTuition | null> {
  const batch = await tx.batch.findFirst({
    where: { tenantId, isActive: true },
    orderBy: { admissionYear: 'desc' },
    select: { id: true, code: true },
  });
  if (!batch) return null;

  const category = await tx.admissionCategory.findFirst({
    where: { tenantId, code: 'GENERAL' },
    select: { id: true, code: true },
  });
  if (!category) return null;

  const resolved = await resolveFeeSchedule(tx, tenantId, {
    programmeId,
    batchId: batch.id,
    admissionCategoryId: category.id,
    nationalityCategory: null,
    onDate,
  });
  if (!resolved) return null;

  return {
    currency: resolved.currency,
    perTerm: resolved.mandatoryTotal,
    batchCode: batch.code,
    admissionCategoryCode: category.code,
    effectiveFrom: resolved.effectiveFrom,
  };
}

/**
 * The public catalogue, grouped by faculty.
 *
 * A faculty appears because it has a publicly listed programme, not because
 * somebody ticked a box on the faculty. One less thing to keep in step: a
 * faculty whose last programme is withdrawn leaves the catalogue on its own.
 */
export async function publicCatalogueInTx(
  tx: Tx,
  tenantId: string,
  onDate: Date,
): Promise<PublicFaculty[]> {
  const programmes = await tx.programme.findMany({
    where: { tenantId, isActive: true, isPubliclyListed: true },
    orderBy: [{ facultyId: 'asc' }, { code: 'asc' }],
    select: {
      id: true,
      code: true,
      nameAr: true,
      nameEn: true,
      degreeLevel: true,
      durationYears: true,
      durationTerms: true,
      overviewAr: true,
      overviewEn: true,
      careerProspectsAr: true,
      careerProspectsEn: true,
      faculty: { select: { code: true, nameAr: true, nameEn: true, isActive: true } },
    },
  });

  const byFaculty = new Map<string, PublicFaculty>();
  for (const p of programmes) {
    if (!p.faculty.isActive) continue;
    const tuition = await publishedTuitionInTx(tx, tenantId, p.id, onDate);

    let bucket = byFaculty.get(p.faculty.code);
    if (!bucket) {
      bucket = {
        code: p.faculty.code,
        nameAr: p.faculty.nameAr,
        nameEn: p.faculty.nameEn,
        programmes: [],
      };
      byFaculty.set(p.faculty.code, bucket);
    }
    bucket.programmes.push({
      code: p.code,
      nameAr: p.nameAr,
      nameEn: p.nameEn,
      degreeLevel: p.degreeLevel,
      durationYears: p.durationYears,
      durationTerms: p.durationTerms,
      overviewAr: p.overviewAr,
      overviewEn: p.overviewEn,
      careerProspectsAr: p.careerProspectsAr,
      careerProspectsEn: p.careerProspectsEn,
      facultyCode: p.faculty.code,
      facultyNameAr: p.faculty.nameAr,
      facultyNameEn: p.faculty.nameEn,
      tuition,
    });
  }

  return [...byFaculty.values()].sort((a, b) => a.code.localeCompare(b.code));
}

export async function publicCatalogue(
  tenantId: string,
  onDate = new Date(),
): Promise<PublicFaculty[]> {
  return withTenant(tenantId, (tx) => publicCatalogueInTx(tx, tenantId, onDate));
}

export async function publicNewsInTx(
  tx: Tx,
  tenantId: string,
  limit = 6,
): Promise<PublicNewsItem[]> {
  const rows = await tx.newsPost.findMany({
    where: { tenantId, status: 'PUBLISHED' },
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    take: limit,
    select: {
      slug: true,
      kind: true,
      titleAr: true,
      titleEn: true,
      excerptAr: true,
      excerptEn: true,
      coverImageUrl: true,
      publishedAt: true,
      isPinned: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  }));
}

export interface PublicPost extends PublicNewsItem {
  bodyAr: string;
  bodyEn: string;
}

/**
 * One post by slug.
 *
 * An **archived** post is still served. It was public, it has been shared and
 * printed, and turning it into a 404 destroys the only record of what the
 * institution said. The page marks it out of date; it does not pretend it
 * never existed. A draft, which was never public, is not found.
 */
export async function publicPost(
  tenantId: string,
  slug: string,
): Promise<(PublicPost & { isArchived: boolean }) | null> {
  return withTenant(tenantId, async (tx) => {
    const row = await tx.newsPost.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
      select: {
        slug: true,
        kind: true,
        titleAr: true,
        titleEn: true,
        excerptAr: true,
        excerptEn: true,
        bodyAr: true,
        bodyEn: true,
        coverImageUrl: true,
        publishedAt: true,
        isPinned: true,
        status: true,
      },
    });
    if (!row || row.status === 'DRAFT') return null;
    return {
      slug: row.slug,
      kind: row.kind,
      titleAr: row.titleAr,
      titleEn: row.titleEn,
      excerptAr: row.excerptAr,
      excerptEn: row.excerptEn,
      bodyAr: row.bodyAr,
      bodyEn: row.bodyEn,
      coverImageUrl: row.coverImageUrl,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      isPinned: row.isPinned,
      isArchived: row.status === 'ARCHIVED',
    };
  });
}

/**
 * Everything the landing page needs, in one transaction.
 *
 * One transaction rather than seven round trips, because the page is a single
 * consistent picture of the institution and because the public site is the
 * one surface that will be hit by people who are not logged in and not
 * counted.
 */
export async function publicSite(
  rawHost: string | null | undefined,
  opts: { onDate?: Date; newsLimit?: number } = {},
): Promise<PublicSite | null> {
  const tenant = await resolveTenantByHost(rawHost);
  if (!tenant) return null;

  const onDate = opts.onDate ?? new Date();

  return withTenant(tenant.tenantId, async (tx) => {
    const [branding, social, sections, hero, faculties, news, calendar, campuses] =
      await Promise.all([
        brandingInTx(tx, tenant.tenantId),
        socialLinksInTx(tx, tenant.tenantId),
        sectionsInTx(tx, tenant.tenantId),
        heroInTx(tx, tenant.tenantId),
        publicCatalogueInTx(tx, tenant.tenantId, onDate),
        publicNewsInTx(tx, tenant.tenantId, opts.newsLimit ?? 6),
        publishedCalendarInTx(tx, tenant.tenantId, { from: onDate }),
        campusesInTx(tx, tenant.tenantId),
      ]);

    return { tenant, branding, social, sections, hero, faculties, news, calendar, campuses };
  });
}
