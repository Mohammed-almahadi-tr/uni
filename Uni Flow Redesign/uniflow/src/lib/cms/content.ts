import 'server-only';
import type {
  CalendarEventKind,
  HeroCtaVariant,
  HeroMediaKind,
  LandingSectionKind,
  PostKind,
  PublishStatus,
} from '@/generated/prisma/enums';
import { withTenant, type Tx } from '@/lib/db/client';
import { audit } from '@/lib/audit/log';
import { requirePermission, type Principal } from '@/lib/auth/rbac';
import { toDateOnly } from '@/lib/ledger/period';

/**
 * The landing CMS (SRS REQ-LP-02, REQ-LP-05, REQ-LP-06, Track C1).
 *
 * Two rules run through everything here, and both are enforced by the
 * database rather than by this file:
 *
 *   1. **Publishing is bilingual or it does not happen.** These institutions
 *      publish in Arabic and English, and the locale is chosen by the reader,
 *      not by the author. A post published with one language filled in
 *      renders as an empty page to half the audience, and renders
 *      *successfully* — 200, no error, nothing to alert on. So
 *      `chk_post_published_complete` and `chk_calendar_published_bilingual`
 *      refuse the state instead of trusting the editor to notice.
 *
 *   2. **Anything the system already knows is not retyped.** The published
 *      academic calendar reads semester dates and the registration deadline
 *      from `academic_terms` — the same rows the registration engine enforces
 *      against. `chk_calendar_event_not_derived` refuses to store them here,
 *      so the website and the registration desk cannot disagree.
 */

export class CmsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CmsError';
  }
}

// ---------------------------------------------------------------------------
// Landing sections
// ---------------------------------------------------------------------------

/** The order a landing page assembles in when nobody has said otherwise. */
export const DEFAULT_SECTION_ORDER: readonly LandingSectionKind[] = [
  'HERO',
  'ABOUT',
  'FACULTIES',
  'NEWS',
  'CALENDAR',
  'CAMPUS',
  'CONTACT',
];

export interface SectionInput {
  kind: LandingSectionKind;
  isEnabled?: boolean;
  sortOrder?: number;
  headingAr?: string | null;
  headingEn?: string | null;
  blurbAr?: string | null;
  blurbEn?: string | null;
}

/**
 * Give a tenant the standard set of sections, all enabled, in the standard
 * order. Idempotent — onboarding may run it twice, and a tenant that has
 * already reordered its page must not have that undone.
 */
export async function installLandingDefaults(
  tenantId: string,
  tx?: Tx,
): Promise<{ created: number }> {
  const run = async (t: Tx) => {
    let created = 0;
    for (const [i, kind] of DEFAULT_SECTION_ORDER.entries()) {
      const existing = await t.landingSection.findUnique({
        where: { tenantId_kind: { tenantId, kind } },
        select: { id: true },
      });
      if (existing) continue;
      await t.landingSection.create({
        data: { tenantId, kind, sortOrder: i, isEnabled: true },
      });
      created += 1;
    }
    return { created };
  };
  return tx ? run(tx) : withTenant(tenantId, run);
}

export async function setSection(
  principal: Principal,
  input: SectionInput,
): Promise<{ id: string }> {
  requirePermission(principal, 'cms.manage');

  const order = input.sortOrder ?? DEFAULT_SECTION_ORDER.indexOf(input.kind);
  if (order < 0) throw new CmsError(`${input.kind} has no default position; give a sortOrder.`);

  return withTenant(principal.tenantId, async (tx) => {
    const data = {
      isEnabled: input.isEnabled ?? true,
      sortOrder: order,
      headingAr: input.headingAr?.trim() || null,
      headingEn: input.headingEn?.trim() || null,
      blurbAr: input.blurbAr?.trim() || null,
      blurbEn: input.blurbEn?.trim() || null,
    };
    const row = await tx.landingSection.upsert({
      where: { tenantId_kind: { tenantId: principal.tenantId, kind: input.kind } },
      create: { tenantId: principal.tenantId, kind: input.kind, ...data },
      update: data,
      select: { id: true },
    });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'LandingSection',
      resourceId: row.id,
      after: { kind: input.kind, ...data },
    });
    return row;
  });
}

export interface SectionRow {
  kind: LandingSectionKind;
  isEnabled: boolean;
  sortOrder: number;
  headingAr: string | null;
  headingEn: string | null;
  blurbAr: string | null;
  blurbEn: string | null;
}

export async function sectionsInTx(tx: Tx, tenantId: string): Promise<SectionRow[]> {
  const rows = await tx.landingSection.findMany({
    where: { tenantId },
    orderBy: { sortOrder: 'asc' },
    select: {
      kind: true,
      isEnabled: true,
      sortOrder: true,
      headingAr: true,
      headingEn: true,
      blurbAr: true,
      blurbEn: true,
    },
  });
  if (rows.length > 0) return rows;
  // A tenant onboarded before C1 has no rows. Render the standard page rather
  // than a blank one — the same reasoning as the default palette.
  return DEFAULT_SECTION_ORDER.map((kind, i) => ({
    kind,
    isEnabled: true,
    sortOrder: i,
    headingAr: null,
    headingEn: null,
    blurbAr: null,
    blurbEn: null,
  }));
}

// ---------------------------------------------------------------------------
// Hero (REQ-LP-02)
// ---------------------------------------------------------------------------

export interface HeroCtaInput {
  labelAr: string;
  labelEn: string;
  href: string;
  variant?: HeroCtaVariant;
}

export interface SetHeroInput {
  headlineAr: string;
  headlineEn: string;
  subheadlineAr?: string | null;
  subheadlineEn?: string | null;
  mediaKind?: HeroMediaKind;
  mediaUrl?: string | null;
  posterUrl?: string | null;
  overlayPct?: number;
  ctas?: HeroCtaInput[];
}

/**
 * Set the hero and its calls to action in one write.
 *
 * The CTAs are replaced wholesale rather than edited individually, for the
 * same reason as the social links: their order is part of the value.
 */
export async function setHero(
  principal: Principal,
  input: SetHeroInput,
): Promise<{ id: string; ctas: number }> {
  requirePermission(principal, 'cms.manage');

  if (!input.headlineAr?.trim() || !input.headlineEn?.trim()) {
    throw new CmsError(
      'A hero headline is needed in both Arabic and English. It is the first line every ' +
        'visitor reads, and half of them read it in the other language.',
    );
  }

  const mediaKind: HeroMediaKind = input.mediaKind ?? 'NONE';
  const mediaUrl = input.mediaUrl?.trim() || null;
  const posterUrl = input.posterUrl?.trim() || null;

  if (mediaKind !== 'NONE' && !mediaUrl) {
    throw new CmsError(`A ${mediaKind.toLowerCase()} hero needs a media URL.`);
  }
  if (mediaKind === 'NONE' && mediaUrl) {
    throw new CmsError('Media was given but the hero is set to carry none.');
  }
  if (mediaKind === 'VIDEO' && !posterUrl) {
    throw new CmsError(
      'A video hero needs a poster image. Without one the headline sits on an empty ' +
        'rectangle until several megabytes have arrived, which on these connections is ' +
        'most of the visit.',
    );
  }

  const overlayPct = input.overlayPct ?? 45;
  if (!Number.isInteger(overlayPct) || overlayPct < 0 || overlayPct > 100) {
    throw new CmsError('Overlay is a percentage, 0-100.');
  }

  const ctas = input.ctas ?? [];
  for (const c of ctas) {
    if (!c.labelAr?.trim() || !c.labelEn?.trim()) {
      throw new CmsError('Every call to action needs a label in both languages.');
    }
    const href = c.href?.trim() ?? '';
    if (!/^\/\S*$/.test(href) && !/^https:\/\/\S+$/.test(href)) {
      throw new CmsError(
        `"${href}" is not a link this page will publish. Give a path beginning with "/" or ` +
          `an https URL — a call to action is the one link every visitor is invited to click.`,
      );
    }
  }

  return withTenant(principal.tenantId, async (tx) => {
    const data = {
      headlineAr: input.headlineAr.trim(),
      headlineEn: input.headlineEn.trim(),
      subheadlineAr: input.subheadlineAr?.trim() || null,
      subheadlineEn: input.subheadlineEn?.trim() || null,
      mediaKind,
      mediaUrl,
      posterUrl,
      overlayPct,
      updatedById: principal.userId,
    };

    const hero = await tx.heroContent.upsert({
      where: { tenantId: principal.tenantId },
      create: { tenantId: principal.tenantId, ...data },
      update: data,
      select: { id: true },
    });

    await tx.heroCta.deleteMany({ where: { heroId: hero.id } });
    if (ctas.length > 0) {
      await tx.heroCta.createMany({
        data: ctas.map((c, i) => ({
          tenantId: principal.tenantId,
          heroId: hero.id,
          labelAr: c.labelAr.trim(),
          labelEn: c.labelEn.trim(),
          href: c.href.trim(),
          variant: c.variant ?? (i === 0 ? 'PRIMARY' : 'SECONDARY'),
          sortOrder: i,
        })),
      });
    }

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'HeroContent',
      resourceId: hero.id,
      after: { headlineEn: data.headlineEn, mediaKind, ctas: ctas.length },
    });

    return { id: hero.id, ctas: ctas.length };
  });
}

export async function heroInTx(tx: Tx, tenantId: string) {
  return tx.heroContent.findUnique({
    where: { tenantId },
    select: {
      headlineAr: true,
      headlineEn: true,
      subheadlineAr: true,
      subheadlineEn: true,
      mediaKind: true,
      mediaUrl: true,
      posterUrl: true,
      overlayPct: true,
      ctas: {
        orderBy: { sortOrder: 'asc' },
        select: { labelAr: true, labelEn: true, href: true, variant: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// News and announcements (REQ-LP-05)
// ---------------------------------------------------------------------------

export interface CreatePostInput {
  slug: string;
  kind?: PostKind;
  titleAr: string;
  titleEn: string;
  excerptAr?: string | null;
  excerptEn?: string | null;
  bodyAr: string;
  bodyEn: string;
  coverImageUrl?: string | null;
  isPinned?: boolean;
}

function assertSlug(slug: string): string {
  const s = slug?.trim().toLowerCase() ?? '';
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) || s.length < 3 || s.length > 120) {
    throw new CmsError(
      `"${slug}" is not a usable address. Lowercase letters, digits and single hyphens — ` +
        `it becomes part of a URL that will be shared and printed.`,
    );
  }
  return s;
}

export async function createPost(
  principal: Principal,
  input: CreatePostInput,
): Promise<{ id: string; slug: string }> {
  requirePermission(principal, 'cms.manage');
  const slug = assertSlug(input.slug);

  if (!input.titleAr?.trim() || !input.titleEn?.trim()) {
    throw new CmsError('A post needs a title in both Arabic and English.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const clash = await tx.newsPost.findUnique({
      where: { tenantId_slug: { tenantId: principal.tenantId, slug } },
      select: { id: true },
    });
    if (clash) throw new CmsError(`A post already exists at "${slug}".`);

    const row = await tx.newsPost.create({
      data: {
        tenantId: principal.tenantId,
        slug,
        kind: input.kind ?? 'NEWS',
        titleAr: input.titleAr.trim(),
        titleEn: input.titleEn.trim(),
        excerptAr: input.excerptAr?.trim() || null,
        excerptEn: input.excerptEn?.trim() || null,
        bodyAr: input.bodyAr ?? '',
        bodyEn: input.bodyEn ?? '',
        coverImageUrl: input.coverImageUrl?.trim() || null,
        isPinned: input.isPinned ?? false,
        authorId: principal.userId,
      },
      select: { id: true, slug: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'NewsPost',
      resourceId: row.id,
      after: { slug, kind: input.kind ?? 'NEWS', status: 'DRAFT' },
    });
    return row;
  });
}

export type UpdatePostInput = Partial<Omit<CreatePostInput, 'slug'>>;

export async function updatePost(
  principal: Principal,
  postId: string,
  input: UpdatePostInput,
): Promise<void> {
  requirePermission(principal, 'cms.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const before = await tx.newsPost.findUnique({
      where: { id: postId },
      select: { id: true, slug: true, status: true, titleEn: true },
    });
    if (!before) throw new CmsError('No such post.');

    await tx.newsPost.update({
      where: { id: postId },
      data: {
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.titleAr !== undefined ? { titleAr: input.titleAr.trim() } : {}),
        ...(input.titleEn !== undefined ? { titleEn: input.titleEn.trim() } : {}),
        ...(input.excerptAr !== undefined ? { excerptAr: input.excerptAr?.trim() || null } : {}),
        ...(input.excerptEn !== undefined ? { excerptEn: input.excerptEn?.trim() || null } : {}),
        ...(input.bodyAr !== undefined ? { bodyAr: input.bodyAr } : {}),
        ...(input.bodyEn !== undefined ? { bodyEn: input.bodyEn } : {}),
        ...(input.coverImageUrl !== undefined
          ? { coverImageUrl: input.coverImageUrl?.trim() || null }
          : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'NewsPost',
      resourceId: postId,
      before,
      after: input,
    });
  });
}

/**
 * Put a post in front of the world.
 *
 * A separate permission from `cms.manage`, because drafting and publishing
 * are different acts: one is work in progress, the other is the institution
 * making a public statement. They are deliberately **not** an SoD pair —
 * unlike a payment, a wrong news item is withdrawn in seconds, and a
 * two-person rule on a notice is a control nobody would follow, which is
 * worse than none.
 */
export async function publishPost(
  principal: Principal,
  postId: string,
  opts: { at?: Date } = {},
): Promise<{ publishedAt: Date }> {
  requirePermission(principal, 'cms.publish');

  return withTenant(principal.tenantId, async (tx) => {
    const post = await tx.newsPost.findUnique({
      where: { id: postId },
      select: {
        id: true,
        slug: true,
        status: true,
        titleAr: true,
        titleEn: true,
        bodyAr: true,
        bodyEn: true,
      },
    });
    if (!post) throw new CmsError('No such post.');
    if (post.status === 'PUBLISHED') {
      throw new CmsError(`"${post.slug}" is already published.`);
    }

    const missing: string[] = [];
    if (!post.titleAr.trim()) missing.push('Arabic title');
    if (!post.titleEn.trim()) missing.push('English title');
    if (!post.bodyAr.trim()) missing.push('Arabic body');
    if (!post.bodyEn.trim()) missing.push('English body');
    if (missing.length > 0) {
      throw new CmsError(
        `"${post.slug}" cannot be published: ${missing.join(', ')} missing. A post published ` +
          `in one language is a blank page to half the people who open it, and it returns a ` +
          `200 while doing so.`,
      );
    }

    const publishedAt = opts.at ?? new Date();
    await tx.newsPost.update({
      where: { id: postId },
      data: { status: 'PUBLISHED', publishedAt, publishedById: principal.userId },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'NewsPost',
      resourceId: postId,
      before: { status: post.status },
      after: { status: 'PUBLISHED', publishedAt },
    });

    return { publishedAt };
  });
}

/**
 * Take a post off the public site without destroying it.
 *
 * `trg_post_not_deleted` refuses to delete anything that has been published,
 * so this is the only way out: a URL that was public and is now a 404 is
 * worse than a notice marked out of date, and the archived row is what an
 * enquiry three months later is answered from.
 */
export async function archivePost(principal: Principal, postId: string): Promise<void> {
  requirePermission(principal, 'cms.publish');

  await withTenant(principal.tenantId, async (tx) => {
    const post = await tx.newsPost.findUnique({
      where: { id: postId },
      select: { id: true, status: true, slug: true },
    });
    if (!post) throw new CmsError('No such post.');
    if (post.status === 'ARCHIVED') return;

    await tx.newsPost.update({ where: { id: postId }, data: { status: 'ARCHIVED' } });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'NewsPost',
      resourceId: postId,
      before: { status: post.status },
      after: { status: 'ARCHIVED' },
    });
  });
}

export interface ListPostsFilter {
  status?: PublishStatus;
  kind?: PostKind;
  limit?: number;
}

export async function listPosts(principal: Principal, filter: ListPostsFilter = {}) {
  requirePermission(principal, 'cms.manage');
  return withTenant(principal.tenantId, (tx) =>
    tx.newsPost.findMany({
      where: {
        tenantId: principal.tenantId,
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.kind ? { kind: filter.kind } : {}),
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
      take: filter.limit ?? 50,
      select: {
        id: true,
        slug: true,
        kind: true,
        titleAr: true,
        titleEn: true,
        status: true,
        publishedAt: true,
        isPinned: true,
      },
    }),
  );
}

// ---------------------------------------------------------------------------
// Academic calendar (REQ-LP-05)
// ---------------------------------------------------------------------------

export interface CalendarEventInput {
  kind: CalendarEventKind;
  titleAr: string;
  titleEn: string;
  descriptionAr?: string | null;
  descriptionEn?: string | null;
  startDate: Date;
  endDate?: Date | null;
  academicYearId?: string | null;
}

/** Kinds the system already holds, and which therefore may not be typed in. */
export const DERIVED_EVENT_KINDS: readonly CalendarEventKind[] = [
  'SEMESTER_START',
  'SEMESTER_END',
  'REGISTRATION_DEADLINE',
];

export async function createCalendarEvent(
  principal: Principal,
  input: CalendarEventInput,
): Promise<{ id: string }> {
  requirePermission(principal, 'cms.manage');

  if (DERIVED_EVENT_KINDS.includes(input.kind)) {
    throw new CmsError(
      `${input.kind} is read from the academic calendar, not typed into the website. ` +
        `Semester dates and the registration deadline come from the term itself — the same ` +
        `row the registration engine refuses a late registration against. Two copies would ` +
        `disagree the first time a registrar extends a deadline.`,
    );
  }
  if (!input.titleAr?.trim() || !input.titleEn?.trim()) {
    throw new CmsError('A calendar entry needs a title in both Arabic and English.');
  }
  const start = toDateOnly(input.startDate);
  const end = input.endDate ? toDateOnly(input.endDate) : null;
  if (end && end < start) {
    throw new CmsError('The entry ends before it begins.');
  }

  return withTenant(principal.tenantId, async (tx) => {
    const row = await tx.calendarEvent.create({
      data: {
        tenantId: principal.tenantId,
        kind: input.kind,
        titleAr: input.titleAr.trim(),
        titleEn: input.titleEn.trim(),
        descriptionAr: input.descriptionAr?.trim() || null,
        descriptionEn: input.descriptionEn?.trim() || null,
        startDate: start,
        endDate: end,
        academicYearId: input.academicYearId ?? null,
        createdById: principal.userId,
      },
      select: { id: true },
    });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'INSERT',
      resourceType: 'CalendarEvent',
      resourceId: row.id,
      after: { kind: input.kind, startDate: start },
    });
    return row;
  });
}

export async function publishCalendarEvent(
  principal: Principal,
  eventId: string,
): Promise<void> {
  requirePermission(principal, 'cms.publish');
  await withTenant(principal.tenantId, async (tx) => {
    const ev = await tx.calendarEvent.findUnique({
      where: { id: eventId },
      select: { id: true, status: true, titleAr: true, titleEn: true },
    });
    if (!ev) throw new CmsError('No such calendar entry.');
    if (!ev.titleAr.trim() || !ev.titleEn.trim()) {
      throw new CmsError('A calendar entry is published in both languages or not at all.');
    }
    await tx.calendarEvent.update({ where: { id: eventId }, data: { status: 'PUBLISHED' } });
    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'APPROVE',
      resourceType: 'CalendarEvent',
      resourceId: eventId,
      before: { status: ev.status },
      after: { status: 'PUBLISHED' },
    });
  });
}

export interface PublishedCalendarEntry {
  kind: CalendarEventKind;
  titleAr: string;
  titleEn: string;
  descriptionAr: string | null;
  descriptionEn: string | null;
  startDate: string;
  endDate: string | null;
  /** True when this entry is read from `academic_terms` rather than stored. */
  derived: boolean;
}

/**
 * The calendar as the public sees it.
 *
 * Assembled from two sources and sorted by date:
 *
 *   · the **terms themselves** — start, end and the registration deadline the
 *     engine enforces (`academic_terms.registration_closes_on`, which B4's
 *     `assert_registration_term_open` refuses a late registration against);
 *   · the **published entries** in this module's own table, which carry only
 *     what the system has no counterpart for: examinations, holidays,
 *     ceremonies.
 *
 * The legacy alternative was a member of staff retyping the dates onto a
 * noticeboard. The web-CMS version of that mistake is a "registration
 * deadline" field, which is why there is not one.
 */
export async function publishedCalendarInTx(
  tx: Tx,
  tenantId: string,
  opts: { academicYearId?: string; from?: Date; to?: Date } = {},
): Promise<PublishedCalendarEntry[]> {
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  const terms = await tx.academicTerm.findMany({
    where: {
      tenantId,
      ...(opts.academicYearId ? { academicYearId: opts.academicYearId } : {}),
      // A term nobody has opened yet is not a promise to anybody.
      status: { in: ['ACTIVE', 'CLOSED', 'PLANNED'] },
    },
    orderBy: [{ startDate: 'asc' }],
    select: {
      nameAr: true,
      nameEn: true,
      startDate: true,
      endDate: true,
      registrationClosesOn: true,
    },
  });

  const derived: PublishedCalendarEntry[] = [];
  for (const t of terms) {
    derived.push({
      kind: 'SEMESTER_START',
      titleAr: `بداية ${t.nameAr}`,
      titleEn: `${t.nameEn} begins`,
      descriptionAr: null,
      descriptionEn: null,
      startDate: iso(t.startDate),
      endDate: null,
      derived: true,
    });
    derived.push({
      kind: 'SEMESTER_END',
      titleAr: `نهاية ${t.nameAr}`,
      titleEn: `${t.nameEn} ends`,
      descriptionAr: null,
      descriptionEn: null,
      startDate: iso(t.endDate),
      endDate: null,
      derived: true,
    });
    if (t.registrationClosesOn) {
      derived.push({
        kind: 'REGISTRATION_DEADLINE',
        titleAr: `آخر موعد للتسجيل — ${t.nameAr}`,
        titleEn: `Registration closes — ${t.nameEn}`,
        descriptionAr: null,
        descriptionEn: null,
        startDate: iso(t.registrationClosesOn),
        endDate: null,
        derived: true,
      });
    }
  }

  const stored = await tx.calendarEvent.findMany({
    where: {
      tenantId,
      status: 'PUBLISHED',
      ...(opts.academicYearId ? { academicYearId: opts.academicYearId } : {}),
    },
    orderBy: { startDate: 'asc' },
    select: {
      kind: true,
      titleAr: true,
      titleEn: true,
      descriptionAr: true,
      descriptionEn: true,
      startDate: true,
      endDate: true,
    },
  });

  const all: PublishedCalendarEntry[] = [
    ...derived,
    ...stored.map((e) => ({
      kind: e.kind,
      titleAr: e.titleAr,
      titleEn: e.titleEn,
      descriptionAr: e.descriptionAr,
      descriptionEn: e.descriptionEn,
      startDate: iso(e.startDate),
      endDate: e.endDate ? iso(e.endDate) : null,
      derived: false,
    })),
  ];

  const from = opts.from ? iso(toDateOnly(opts.from)) : null;
  const to = opts.to ? iso(toDateOnly(opts.to)) : null;

  return all
    .filter((e) => (!from || e.startDate >= from) && (!to || e.startDate <= to))
    .sort((a, b) => (a.startDate < b.startDate ? -1 : a.startDate > b.startDate ? 1 : 0));
}

export async function publishedCalendar(
  tenantId: string,
  opts: { academicYearId?: string; from?: Date; to?: Date } = {},
): Promise<PublishedCalendarEntry[]> {
  return withTenant(tenantId, (tx) => publishedCalendarInTx(tx, tenantId, opts));
}

// ---------------------------------------------------------------------------
// Campuses (REQ-LP-06)
// ---------------------------------------------------------------------------

export interface CampusInput {
  code: string;
  nameAr: string;
  nameEn: string;
  addressAr?: string | null;
  addressEn?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary?: boolean;
  sortOrder?: number;
}

export async function upsertCampus(
  principal: Principal,
  input: CampusInput,
): Promise<{ id: string }> {
  requirePermission(principal, 'cms.manage');

  const code = input.code?.trim().toUpperCase();
  if (!code) throw new CmsError('A campus needs a code.');
  if (!input.nameAr?.trim() || !input.nameEn?.trim()) {
    throw new CmsError('A campus needs a name in both Arabic and English.');
  }

  const hasLat = input.latitude !== null && input.latitude !== undefined;
  const hasLng = input.longitude !== null && input.longitude !== undefined;
  if (hasLat !== hasLng) {
    throw new CmsError('Give both a latitude and a longitude, or neither. Half a pin is no pin.');
  }
  if (hasLat && (input.latitude! < -90 || input.latitude! > 90)) {
    throw new CmsError(`Latitude ${input.latitude} is outside -90..90.`);
  }
  if (hasLng && (input.longitude! < -180 || input.longitude! > 180)) {
    throw new CmsError(`Longitude ${input.longitude} is outside -180..180.`);
  }

  return withTenant(principal.tenantId, async (tx) => {
    if (input.isPrimary) {
      await tx.campus.updateMany({
        where: { tenantId: principal.tenantId, isPrimary: true, code: { not: code } },
        data: { isPrimary: false },
      });
    }

    const data = {
      nameAr: input.nameAr.trim(),
      nameEn: input.nameEn.trim(),
      addressAr: input.addressAr?.trim() || null,
      addressEn: input.addressEn?.trim() || null,
      city: input.city?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      latitude: hasLat ? input.latitude! : null,
      longitude: hasLng ? input.longitude! : null,
      isPrimary: input.isPrimary ?? false,
      sortOrder: input.sortOrder ?? 0,
    };

    const row = await tx.campus.upsert({
      where: { tenantId_code: { tenantId: principal.tenantId, code } },
      create: { tenantId: principal.tenantId, code, ...data },
      update: data,
      select: { id: true },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'Campus',
      resourceId: row.id,
      after: { code, ...data },
    });
    return row;
  });
}

export async function campusesInTx(tx: Tx, tenantId: string) {
  return tx.campus.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { code: 'asc' }],
    select: {
      code: true,
      nameAr: true,
      nameEn: true,
      addressAr: true,
      addressEn: true,
      city: true,
      phone: true,
      email: true,
      latitude: true,
      longitude: true,
      isPrimary: true,
    },
  });
}

// ---------------------------------------------------------------------------
// The public catalogue (REQ-LP-03)
// ---------------------------------------------------------------------------

export interface PublishProgrammeInput {
  programmeId: string;
  isPubliclyListed: boolean;
  overviewAr?: string | null;
  overviewEn?: string | null;
  careerProspectsAr?: string | null;
  careerProspectsEn?: string | null;
}

/**
 * Put a programme on the public catalogue, or take it off.
 *
 * `cms.manage` rather than `academic.manage`: what the institution advertises
 * to prospective students is a communications decision over an academic fact
 * that already exists. Creating the programme is the registrar's; describing
 * it to the public is not.
 *
 * `is_publicly_listed` defaults to false and there is no bulk "publish all".
 * A programme reaches the catalogue because somebody decided it should, with
 * an overview in both languages — `chk_programme_public_bilingual` — and only
 * while it is still active — `chk_programme_public_active`. A withdrawn
 * programme still advertising intake is a commitment the institution has not
 * made.
 */
export async function setProgrammePublication(
  principal: Principal,
  input: PublishProgrammeInput,
): Promise<void> {
  requirePermission(principal, 'cms.manage');

  await withTenant(principal.tenantId, async (tx) => {
    const before = await tx.programme.findUnique({
      where: { id: input.programmeId },
      select: {
        id: true,
        code: true,
        isActive: true,
        isPubliclyListed: true,
        overviewAr: true,
        overviewEn: true,
      },
    });
    if (!before) throw new CmsError('No such programme.');

    const overviewAr =
      input.overviewAr !== undefined ? input.overviewAr?.trim() || null : before.overviewAr;
    const overviewEn =
      input.overviewEn !== undefined ? input.overviewEn?.trim() || null : before.overviewEn;

    if (input.isPubliclyListed) {
      if (!before.isActive) {
        throw new CmsError(
          `${before.code} is not active. A programme the institution has stopped running ` +
            `must not stay on the public catalogue advertising intake.`,
        );
      }
      if (!overviewAr || !overviewEn) {
        throw new CmsError(
          `${before.code} needs an overview in both Arabic and English before it is listed. ` +
            `Half the people reading the catalogue read it in the other language.`,
        );
      }
    }

    await tx.programme.update({
      where: { id: input.programmeId },
      data: {
        isPubliclyListed: input.isPubliclyListed,
        overviewAr,
        overviewEn,
        ...(input.careerProspectsAr !== undefined
          ? { careerProspectsAr: input.careerProspectsAr?.trim() || null }
          : {}),
        ...(input.careerProspectsEn !== undefined
          ? { careerProspectsEn: input.careerProspectsEn?.trim() || null }
          : {}),
      },
    });

    await audit(tx, principal.tenantId, {
      actorId: principal.userId,
      action: 'UPDATE',
      resourceType: 'Programme',
      resourceId: input.programmeId,
      before: { isPubliclyListed: before.isPubliclyListed },
      after: { isPubliclyListed: input.isPubliclyListed },
    });
  });
}
