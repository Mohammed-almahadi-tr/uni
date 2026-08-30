import { afterAll, describe, expect, it } from 'vitest';
import {
  asSystem,
  asTenant,
  disconnectAll,
  makePrincipal,
  makeUniversity,
  type University,
} from './helpers';
import {
  addDomain,
  DomainError,
  listDomains,
  normaliseHost,
  removeDomain,
  resolveTenantByHost,
  setCanonicalDomain,
  verifyDomain,
} from '@/lib/cms/hosts';
import {
  ALLOWED_FONTS,
  BrandingError,
  brandingFor,
  DEFAULT_BRANDING,
  inkFor,
  setBranding,
  setSocialLinks,
  themeStyle,
  themeTokens,
} from '@/lib/cms/branding';
import {
  archivePost,
  CmsError,
  createCalendarEvent,
  createPost,
  DEFAULT_SECTION_ORDER,
  publishCalendarEvent,
  publishedCalendar,
  publishPost,
  setHero,
  setProgrammePublication,
  setSection,
  upsertCampus,
} from '@/lib/cms/content';
import { publicCatalogue, publicPost, publicSite } from '@/lib/cms/public';
import {
  handleInquiry,
  InquiryError,
  listInquiries,
  submitInquiry,
} from '@/lib/cms/inquiries';
import { approveFeeSchedule, draftFeeSchedule } from '@/lib/academic/fee-matrix';
import { DEFAULT_ROLES, findSodViolations } from '@/lib/auth/permissions';
import { ForbiddenError } from '@/lib/auth/rbac';
import type { Principal } from '@/lib/auth/rbac';

/**
 * The theme engine and landing CMS (SRS Module 1, Track C1).
 *
 * The legacy baseline is not a defective routine — it is the absence of the
 * concept. Branding was compiled into the executable, so white-labelling meant
 * copying the source tree and swapping the bitmaps in `My Project\Resources`.
 * Two copies of that tree are in this repository and both still carry the
 * wrong institution:
 *
 *     Me.Text = "Oasis Computer Systems"      ' frmMain.designer.vb:233  (Ribat)
 *     Me.Text = "الكلية التكنلوجية"            ' frmMainPanal.Designer.vb:56 (Nile)
 *
 * The Ribat University build titles its main window with the *vendor's* name.
 * The Nile College build titles its main window with a *third institution's*,
 * and ships that institution's icon (`KCT_Logo_A-2.ico`) as project content.
 * No test could have caught either, because there was no per-tenant behaviour
 * to test.
 *
 * The tests below are that negated, plus the two properties C1 adds on top of
 * it: publishing is bilingual or it does not happen, and nothing the system
 * already knows is retyped into the website.
 */

const D = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

afterAll(disconnectAll);

interface Ctx {
  u: University;
  editor: Principal;
  publisher: Principal;
  platform: Principal;
  host: string;
}

let hostCounter = 0;

async function scene(): Promise<Ctx> {
  const u = await makeUniversity();
  hostCounter += 1;
  const host = `t${Date.now().toString(36)}${hostCounter}.example.edu`;

  const editor = await makePrincipal(u.tenantId, ['cms.manage'], { name: 'editor' });
  const publisher = await makePrincipal(u.tenantId, ['cms.publish', 'cms.manage'], {
    name: 'publisher',
  });
  const platform = await makePrincipal(u.tenantId, ['tenant.manage'], { name: 'platform' });

  await addDomain(platform, u.tenantId, { host, canonical: true });

  return { u, editor, publisher, platform, host };
}

// ---------------------------------------------------------------------------
// One host, one university
// ---------------------------------------------------------------------------

describe('a hostname resolves to exactly one university', () => {
  it('normalises whatever arrived in the Host header', () => {
    expect(normaliseHost('Nile.Edu.SD')).toBe('nile.edu.sd');
    expect(normaliseHost('https://nile.edu.sd/programmes')).toBe('nile.edu.sd');
    expect(normaliseHost('nile.edu.sd:3000')).toBe('nile.edu.sd');
    expect(normaliseHost('nile.edu.sd.')).toBe('nile.edu.sd');
    expect(normaliseHost('  localhost  ')).toBe('localhost');
    expect(normaliseHost('')).toBeNull();
    expect(normaliseHost(null)).toBeNull();
    expect(normaliseHost('not a host')).toBeNull();
    expect(normaliseHost('nile.edu.sd/../etc')).toBe('nile.edu.sd');
  });

  it('does not fold www into the bare domain', () => {
    // They are different hosts. Folding them would serve a tenant on an
    // address it never claimed.
    expect(normaliseHost('www.nile.edu.sd')).toBe('www.nile.edu.sd');
  });

  it('serves a university on its own host', async () => {
    const c = await scene();
    const resolved = await resolveTenantByHost(c.host);
    expect(resolved?.tenantId).toBe(c.u.tenantId);
    expect(resolved?.isCanonical).toBe(true);
    expect(resolved?.canonicalHost).toBe(c.host);
  });

  it('never serves one university on another university’s host', async () => {
    const a = await scene();
    const b = await scene();

    expect((await resolveTenantByHost(a.host))?.tenantId).toBe(a.u.tenantId);
    expect((await resolveTenantByHost(b.host))?.tenantId).toBe(b.u.tenantId);
    expect((await resolveTenantByHost(a.host))?.tenantId).not.toBe(b.u.tenantId);
  });

  it('refuses a host that already belongs to another university', async () => {
    const a = await scene();
    const b = await scene();
    await expect(addDomain(b.platform, b.u.tenantId, { host: a.host })).rejects.toThrow(
      DomainError,
    );
  });

  it('refuses the duplicate host at the database, not only in code', async () => {
    const a = await scene();
    const b = await scene();
    await expect(
      asSystem((tx) =>
        tx.tenantDomain.create({
          data: { tenantId: b.u.tenantId, host: a.host, isVerified: true },
        }),
      ),
    ).rejects.toThrow();
  });

  it('resolves nothing for an unknown host, rather than guessing', async () => {
    await scene();
    expect(await resolveTenantByHost('nobody.example.edu')).toBeNull();
    expect(await publicSite('nobody.example.edu')).toBeNull();
  });

  it('resolves nothing for a host nobody has verified', async () => {
    const c = await scene();
    const pending = `pending-${hostCounter}.example.edu`;
    await addDomain(c.platform, c.u.tenantId, { host: pending });
    expect(await resolveTenantByHost(pending)).toBeNull();

    await verifyDomain(c.platform, c.u.tenantId, pending);
    expect((await resolveTenantByHost(pending))?.tenantId).toBe(c.u.tenantId);
  });

  it('stops serving a university whose contract has ended', async () => {
    const c = await scene();
    await asSystem((tx) =>
      tx.tenant.update({ where: { id: c.u.tenantId }, data: { isActive: false } }),
    );
    expect(await resolveTenantByHost(c.host)).toBeNull();
    await asSystem((tx) =>
      tx.tenant.update({ where: { id: c.u.tenantId }, data: { isActive: true } }),
    );
  });

  it('refuses to make an unverified host the canonical one', async () => {
    const c = await scene();
    const alt = `alt-${hostCounter}.example.edu`;
    await addDomain(c.platform, c.u.tenantId, { host: alt });
    await expect(setCanonicalDomain(c.platform, c.u.tenantId, alt)).rejects.toThrow(DomainError);
  });

  it('keeps one canonical host per university, by index', async () => {
    const c = await scene();
    const alt = `alt2-${hostCounter}.example.edu`;
    await addDomain(c.platform, c.u.tenantId, { host: alt, verified: true });

    // Written as the owner, which bypasses RLS: the refusal is the index.
    await expect(
      asSystem((tx) =>
        tx.tenantDomain.updateMany({
          where: { tenantId: c.u.tenantId, host: alt },
          data: { isCanonical: true },
        }),
      ),
    ).rejects.toThrow();

    await setCanonicalDomain(c.platform, c.u.tenantId, alt);
    const rows = await listDomains(c.platform, c.u.tenantId);
    expect(rows.filter((r) => r.isCanonical).map((r) => r.host)).toEqual([alt]);
  });

  it('refuses a canonical host that is not verified, at the database', async () => {
    const c = await scene();
    await expect(
      asSystem((tx) =>
        tx.tenantDomain.create({
          data: {
            tenantId: c.u.tenantId,
            host: `bad-${hostCounter}.example.edu`,
            isVerified: false,
            isCanonical: true,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('is a platform act, not a tenant one', async () => {
    const c = await scene();
    // The University Admin role does not carry tenant.manage — a university
    // must not be able to claim a hostname in a namespace it shares.
    expect(DEFAULT_ROLES['University Admin'].permissions).not.toContain('tenant.manage');
    await expect(
      addDomain(c.editor, c.u.tenantId, { host: 'grabbed.example.edu' }),
    ).rejects.toThrow(ForbiddenError);
  });

  it('detaches a host without touching the content behind it', async () => {
    const c = await scene();
    const spare = `spare-${hostCounter}.example.edu`;
    await addDomain(c.platform, c.u.tenantId, { host: spare, verified: true });
    await removeDomain(c.platform, c.u.tenantId, spare);
    expect(await resolveTenantByHost(spare)).toBeNull();
    expect((await resolveTenantByHost(c.host))?.tenantId).toBe(c.u.tenantId);
  });
});

// ---------------------------------------------------------------------------
// Identity is a row
// ---------------------------------------------------------------------------

describe('identity is a row, not a compiled constant', () => {
  it('gives every university its own name on its own site', async () => {
    const a = await scene();
    const b = await scene();

    const siteA = await publicSite(a.host);
    const siteB = await publicSite(b.host);

    expect(siteA!.tenant.nameEn).not.toBe(siteB!.tenant.nameEn);
    expect(siteA!.tenant.nameAr).toMatch(/[؀-ۿ]/);
  });

  it('provisions a branding row at onboarding rather than leaving it blank', async () => {
    const c = await scene();
    const b = await brandingFor(c.u.tenantId);
    expect(b.primary).toEqual(DEFAULT_BRANDING.primary);
    expect(b.shortCode.length).toBeGreaterThan(0);
  });

  it('stores a palette as channels and writes them back as CSS tokens', async () => {
    const c = await scene();
    await setBranding(c.editor, {
      shortCode: 'NC',
      mottoEn: 'Knowledge and service',
      mottoAr: 'علم وخدمة',
      primary: { h: 212, s: 90, l: 24 },
      secondary: { h: 20, s: 40, l: 30 },
      accent: { h: 44, s: 96, l: 50 },
    });

    const b = await brandingFor(c.u.tenantId);
    expect(b.primary).toEqual({ h: 212, s: 90, l: 24 });

    const tokens = themeTokens(b);
    expect(tokens['--primary']).toBe('212 90% 24%');
    expect(tokens['--primary-h']).toBe('212');
    expect(themeStyle(b)).toContain('--primary: 212 90% 24%;');
  });

  it('refuses a hue outside 0-360', async () => {
    const c = await scene();
    await expect(
      setBranding(c.editor, {
        shortCode: 'NC',
        primary: { h: 400, s: 50, l: 40 },
        secondary: { h: 20, s: 40, l: 30 },
        accent: { h: 44, s: 96, l: 50 },
      }),
    ).rejects.toThrow(BrandingError);
  });

  it('refuses it at the database too, where an invalid channel would render as nothing', async () => {
    const c = await scene();
    // A hue of 400 does not fail loudly — it produces an invalid CSS
    // declaration and the page renders in a colour nobody chose.
    await expect(
      asSystem((tx) =>
        tx.tenantBranding.update({
          where: { tenantId: c.u.tenantId },
          data: { primaryH: 400 },
        }),
      ),
    ).rejects.toThrow();

    await expect(
      asSystem((tx) =>
        tx.tenantBranding.update({
          where: { tenantId: c.u.tenantId },
          data: { accentS: 120 },
        }),
      ),
    ).rejects.toThrow();
  });

  it('refuses a font outside the shipped faces, in code and in the database', async () => {
    const c = await scene();
    await expect(
      setBranding(c.editor, {
        shortCode: 'NC',
        primary: { h: 212, s: 90, l: 24 },
        secondary: { h: 20, s: 40, l: 30 },
        accent: { h: 44, s: 96, l: 50 },
        // @ts-expect-error — deliberately outside the allow-list
        headingFont: 'Comic Sans MS',
      }),
    ).rejects.toThrow(BrandingError);

    await expect(
      asSystem((tx) =>
        tx.tenantBranding.update({
          where: { tenantId: c.u.tenantId },
          data: { bodyFont: 'Papyrus' },
        }),
      ),
    ).rejects.toThrow();

    expect(ALLOWED_FONTS).toContain('Cairo');
  });

  it('derives the ink rather than letting a tenant choose it wrongly', () => {
    // A university picks a pale brand colour and then finds its buttons
    // unreadable. The foreground is not theirs to get wrong.
    expect(inkFor(24)).toBe('light');
    expect(inkFor(88)).toBe('dark');
    expect(themeTokens({ ...DEFAULT_BRANDING, primary: { h: 50, s: 90, l: 88 } })[
      '--primary-foreground'
    ]).toBe('222 47% 11%');
  });

  it('renders the shipped palette for a tenant that has none', async () => {
    const c = await scene();
    await asSystem((tx) =>
      tx.tenantBranding.delete({ where: { tenantId: c.u.tenantId } }),
    );
    const b = await brandingFor(c.u.tenantId);
    expect(b.primary).toEqual(DEFAULT_BRANDING.primary);
  });

  it('refuses a short code that would not fit on a certificate', async () => {
    const c = await scene();
    await expect(
      setBranding(c.editor, {
        shortCode: 'this is far too long',
        primary: { h: 212, s: 90, l: 24 },
        secondary: { h: 20, s: 40, l: 30 },
        accent: { h: 44, s: 96, l: 50 },
      }),
    ).rejects.toThrow(BrandingError);
  });

  it('takes only https social links, one per platform', async () => {
    const c = await scene();
    await expect(
      setSocialLinks(c.editor, [{ platform: 'FACEBOOK', url: 'http://insecure.example' }]),
    ).rejects.toThrow(BrandingError);

    await expect(
      setSocialLinks(c.editor, [
        { platform: 'FACEBOOK', url: 'https://facebook.example/a' },
        { platform: 'FACEBOOK', url: 'https://facebook.example/b' },
      ]),
    ).rejects.toThrow(BrandingError);

    await setSocialLinks(c.editor, [
      { platform: 'FACEBOOK', url: 'https://facebook.example/uni' },
      { platform: 'YOUTUBE', url: 'https://youtube.example/uni' },
    ]);
    const site = await publicSite(c.host);
    expect(site!.social.map((s) => s.platform)).toEqual(['FACEBOOK', 'YOUTUBE']);
  });
});

// ---------------------------------------------------------------------------
// The page is assembled from the tenant's own sections
// ---------------------------------------------------------------------------

describe('the landing page is assembled, not hard-coded', () => {
  it('gives a new university the standard sections in the standard order', async () => {
    const c = await scene();
    const site = await publicSite(c.host);
    expect(site!.sections.map((s) => s.kind)).toEqual([...DEFAULT_SECTION_ORDER]);
    expect(site!.sections.every((s) => s.isEnabled)).toBe(true);
  });

  it('lets a university switch a section off', async () => {
    const c = await scene();
    await setSection(c.editor, { kind: 'NEWS', isEnabled: false });
    const site = await publicSite(c.host);
    expect(site!.sections.find((s) => s.kind === 'NEWS')!.isEnabled).toBe(false);
  });

  it('needs a hero headline in both languages', async () => {
    const c = await scene();
    await expect(
      setHero(c.editor, { headlineAr: 'أهلاً بكم', headlineEn: '  ' }),
    ).rejects.toThrow(CmsError);
  });

  it('needs a poster on a video hero', async () => {
    const c = await scene();
    await expect(
      setHero(c.editor, {
        headlineAr: 'أهلاً',
        headlineEn: 'Welcome',
        mediaKind: 'VIDEO',
        mediaUrl: 'https://cdn.example/hero.mp4',
      }),
    ).rejects.toThrow(CmsError);
  });

  it('refuses a call to action that is not a path or an https URL', async () => {
    const c = await scene();
    for (const href of ['javascript:alert(1)', 'data:text/html,x', 'http://insecure.example']) {
      await expect(
        setHero(c.editor, {
          headlineAr: 'أهلاً',
          headlineEn: 'Welcome',
          ctas: [{ labelAr: 'قدّم الآن', labelEn: 'Apply now', href }],
        }),
      ).rejects.toThrow(CmsError);
    }
  });

  it('refuses the same href at the database', async () => {
    const c = await scene();
    await setHero(c.editor, { headlineAr: 'أهلاً', headlineEn: 'Welcome' });
    const hero = await asSystem((tx) =>
      tx.heroContent.findUniqueOrThrow({
        where: { tenantId: c.u.tenantId },
        select: { id: true },
      }),
    );
    await expect(
      asSystem((tx) =>
        tx.heroCta.create({
          data: {
            tenantId: c.u.tenantId,
            heroId: hero.id,
            labelAr: 'اضغط',
            labelEn: 'Click',
            href: 'javascript:alert(1)',
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('publishes the hero and its calls to action in order', async () => {
    const c = await scene();
    await setHero(c.editor, {
      headlineAr: 'ابدأ رحلتك',
      headlineEn: 'Begin your studies',
      subheadlineEn: 'Applications for the 2026 intake are open',
      subheadlineAr: 'القبول لدفعة 2026 مفتوح',
      ctas: [
        { labelAr: 'قدّم الآن', labelEn: 'Apply for admission', href: '/apply' },
        { labelAr: 'بوابة الطالب', labelEn: 'Student portal', href: '/portal' },
      ],
    });
    const site = await publicSite(c.host);
    expect(site!.hero!.headlineEn).toBe('Begin your studies');
    expect(site!.hero!.ctas.map((x) => x.href)).toEqual(['/apply', '/portal']);
    expect(site!.hero!.ctas[0].variant).toBe('PRIMARY');
  });
});

// ---------------------------------------------------------------------------
// Publishing is bilingual or it does not happen
// ---------------------------------------------------------------------------

describe('publishing is bilingual or it does not happen', () => {
  async function draft(c: Ctx, over: Partial<Parameters<typeof createPost>[1]> = {}) {
    return createPost(c.editor, {
      slug: `notice-${Math.random().toString(36).slice(2, 10)}`,
      titleAr: 'تمديد فترة التسجيل',
      titleEn: 'Registration extended',
      bodyAr: 'تم تمديد فترة التسجيل أسبوعًا إضافيًا.',
      bodyEn: 'Registration has been extended by one week.',
      ...over,
    });
  }

  it('refuses to publish a post with one language missing', async () => {
    const c = await scene();
    const post = await draft(c, { bodyEn: '' });
    await expect(publishPost(c.publisher, post.id)).rejects.toThrow(/English body/);
  });

  it('refuses the same state written straight to the database', async () => {
    const c = await scene();
    const post = await draft(c, { bodyAr: '' });
    await expect(
      asSystem((tx) =>
        tx.newsPost.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            publishedById: c.publisher.userId,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('will not publish without a publisher and a time', async () => {
    const c = await scene();
    const post = await draft(c);
    await expect(
      asSystem((tx) =>
        tx.newsPost.update({ where: { id: post.id }, data: { status: 'PUBLISHED' } }),
      ),
    ).rejects.toThrow();
  });

  it('keeps a draft off the public site entirely', async () => {
    const c = await scene();
    const post = await draft(c);
    expect(await publicPost(c.u.tenantId, post.slug)).toBeNull();
    const site = await publicSite(c.host);
    expect(site!.news.map((n) => n.slug)).not.toContain(post.slug);
  });

  it('shows a published post, newest first, pinned above the rest', async () => {
    const c = await scene();
    const older = await draft(c, { titleEn: 'Older notice' });
    const pinned = await draft(c, { titleEn: 'Pinned notice', isPinned: true });

    await publishPost(c.publisher, older.id, { at: D(2026, 1, 10) });
    await publishPost(c.publisher, pinned.id, { at: D(2026, 1, 5) });

    const site = await publicSite(c.host);
    expect(site!.news[0].slug).toBe(pinned.slug);
    expect(site!.news.map((n) => n.slug)).toContain(older.slug);
  });

  it('needs cms.publish, and cms.manage is not enough', async () => {
    const c = await scene();
    const post = await draft(c);
    await expect(publishPost(c.editor, post.id)).rejects.toThrow(ForbiddenError);
  });

  it('still serves an archived post, marked out of date', async () => {
    const c = await scene();
    const post = await draft(c);
    await publishPost(c.publisher, post.id);
    await archivePost(c.publisher, post.id);

    const served = await publicPost(c.u.tenantId, post.slug);
    expect(served).not.toBeNull();
    expect(served!.isArchived).toBe(true);

    // …but it is off the list.
    const site = await publicSite(c.host);
    expect(site!.news.map((n) => n.slug)).not.toContain(post.slug);
  });

  it('refuses to delete a post that has been public', async () => {
    const c = await scene();
    const post = await draft(c);
    await publishPost(c.publisher, post.id);
    await expect(
      asSystem((tx) => tx.newsPost.delete({ where: { id: post.id } })),
    ).rejects.toThrow(/archive/i);
  });

  it('lets a draft that was never public be deleted', async () => {
    const c = await scene();
    const post = await draft(c);
    await asSystem((tx) => tx.newsPost.delete({ where: { id: post.id } }));
    expect(await publicPost(c.u.tenantId, post.slug)).toBeNull();
  });

  it('refuses a slug that would not survive being shared', async () => {
    const c = await scene();
    for (const slug of ['Registration Extended', 'x', 'a--b', 'حفل']) {
      await expect(draft(c, { slug })).rejects.toThrow(CmsError);
    }
  });
});

// ---------------------------------------------------------------------------
// The calendar publishes what the system enforces
// ---------------------------------------------------------------------------

describe('the published calendar is the one the registration engine enforces', () => {
  it('carries the term dates and the deadline without anybody typing them', async () => {
    const c = await scene();
    const entries = await publishedCalendar(c.u.tenantId);

    const deadline = entries.find((e) => e.kind === 'REGISTRATION_DEADLINE');
    expect(deadline).toBeDefined();
    // The fixture's first term closes registration on 28 February 2026.
    expect(deadline!.startDate).toBe('2026-02-28');
    expect(deadline!.derived).toBe(true);

    expect(entries.some((e) => e.kind === 'SEMESTER_START' && e.startDate === '2026-01-01')).toBe(
      true,
    );
  });

  it('follows the registrar when they move the deadline, with no website edit', async () => {
    const c = await scene();
    await asSystem((tx) =>
      tx.academicTerm.update({
        where: { id: c.u.termIds[1] },
        data: { registrationClosesOn: D(2026, 3, 15) },
      }),
    );

    const entries = await publishedCalendar(c.u.tenantId);
    const deadline = entries.find((e) => e.kind === 'REGISTRATION_DEADLINE');
    expect(deadline!.startDate).toBe('2026-03-15');
  });

  it('refuses to let a deadline be typed into the CMS at all', async () => {
    const c = await scene();
    await expect(
      createCalendarEvent(c.editor, {
        kind: 'REGISTRATION_DEADLINE',
        titleAr: 'آخر موعد',
        titleEn: 'Deadline',
        startDate: D(2026, 4, 1),
      }),
    ).rejects.toThrow(/registration engine|academic calendar/i);
  });

  it('refuses it at the database too', async () => {
    const c = await scene();
    await expect(
      asSystem((tx) =>
        tx.calendarEvent.create({
          data: {
            tenantId: c.u.tenantId,
            kind: 'SEMESTER_START',
            titleAr: 'بداية',
            titleEn: 'Start',
            startDate: D(2026, 9, 1),
            createdById: c.u.adminUserId,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('carries what the system has no counterpart for, once published', async () => {
    const c = await scene();
    const exam = await createCalendarEvent(c.editor, {
      kind: 'EXAM',
      titleAr: 'امتحانات نهاية الفصل',
      titleEn: 'End of term examinations',
      startDate: D(2026, 4, 10),
      endDate: D(2026, 4, 24),
    });

    expect((await publishedCalendar(c.u.tenantId)).some((e) => e.kind === 'EXAM')).toBe(false);

    await publishCalendarEvent(c.publisher, exam.id);
    const published = (await publishedCalendar(c.u.tenantId)).find((e) => e.kind === 'EXAM');
    expect(published).toBeDefined();
    expect(published!.derived).toBe(false);
    expect(published!.endDate).toBe('2026-04-24');
  });

  it('refuses an entry that ends before it begins', async () => {
    const c = await scene();
    await expect(
      createCalendarEvent(c.editor, {
        kind: 'HOLIDAY',
        titleAr: 'عطلة',
        titleEn: 'Holiday',
        startDate: D(2026, 5, 10),
        endDate: D(2026, 5, 1),
      }),
    ).rejects.toThrow(CmsError);
  });
});

// ---------------------------------------------------------------------------
// The catalogue publishes the fee the engine bills
// ---------------------------------------------------------------------------

describe('the public catalogue quotes the fee the cashier will charge', () => {
  async function publishTuition(c: Ctx, amount: string, from = D(2026, 1, 1)) {
    const setter = await makePrincipal(c.u.tenantId, ['feematrix.manage'], { name: 'fees' });
    const approver = await makePrincipal(c.u.tenantId, ['feematrix.approve'], { name: 'feeapp' });
    const draft = await draftFeeSchedule(setter, {
      programmeId: c.u.programmeIds.MBBS,
      batchId: c.u.batchId,
      admissionCategoryId: c.u.admissionCategories.GENERAL,
      currency: 'SDG',
      effectiveFrom: from,
      lines: [
        { feeItemId: c.u.feeItems.TUITION, amount, sortOrder: 1 },
        { feeItemId: c.u.feeItems.LAB, amount: '30000.00', isMandatory: false, sortOrder: 2 },
      ],
    });
    await approveFeeSchedule(approver, draft.id);
    return draft.id;
  }

  async function list(c: Ctx) {
    await setProgrammePublication(c.editor, {
      programmeId: c.u.programmeIds.MBBS,
      isPubliclyListed: true,
      overviewAr: 'برنامج بكالوريوس الطب والجراحة، خمس سنوات.',
      overviewEn: 'A five-year Bachelor of Medicine and Surgery.',
    });
  }

  it('lists nothing until somebody decides to list it', async () => {
    const c = await scene();
    expect(await publicCatalogue(c.u.tenantId, D(2026, 2, 1))).toEqual([]);
  });

  it('refuses to list a programme described in only one language', async () => {
    const c = await scene();
    await expect(
      setProgrammePublication(c.editor, {
        programmeId: c.u.programmeIds.MBBS,
        isPubliclyListed: true,
        overviewAr: 'برنامج الطب',
      }),
    ).rejects.toThrow(CmsError);
  });

  it('refuses the same state at the database', async () => {
    const c = await scene();
    await expect(
      asSystem((tx) =>
        tx.programme.update({
          where: { id: c.u.programmeIds.MBBS },
          data: { isPubliclyListed: true },
        }),
      ),
    ).rejects.toThrow();
  });

  it('refuses to advertise a programme that has been withdrawn', async () => {
    const c = await scene();
    await list(c);
    await expect(
      asSystem((tx) =>
        tx.programme.update({
          where: { id: c.u.programmeIds.MBBS },
          data: { isActive: false },
        }),
      ),
    ).rejects.toThrow();
  });

  it('quotes the approved schedule’s mandatory total, not a retyped figure', async () => {
    const c = await scene();
    await publishTuition(c, '1200000.00');
    await list(c);

    const cat = await publicCatalogue(c.u.tenantId, D(2026, 2, 1));
    const mbbs = cat[0].programmes.find((p) => p.code === 'MBBS')!;
    // Tuition is mandatory; the lab fee is optional and is not part of what
    // every student on this cohort is billed.
    expect(mbbs.tuition!.perTerm).toBe('1200000.0000');
    expect(mbbs.tuition!.currency).toBe('SDG');
  });

  it('follows a fee revision with no change to the website', async () => {
    const c = await scene();
    await publishTuition(c, '1200000.00');
    await list(c);

    const setter = await makePrincipal(c.u.tenantId, ['feematrix.manage'], { name: 'fees2' });
    const approver = await makePrincipal(c.u.tenantId, ['feematrix.approve'], { name: 'feeapp2' });
    const revised = await draftFeeSchedule(setter, {
      programmeId: c.u.programmeIds.MBBS,
      batchId: c.u.batchId,
      admissionCategoryId: c.u.admissionCategories.GENERAL,
      currency: 'SDG',
      effectiveFrom: D(2026, 6, 1),
      lines: [{ feeItemId: c.u.feeItems.TUITION, amount: '1500000.00', sortOrder: 1 }],
    });
    await approveFeeSchedule(approver, revised.id);

    const before = await publicCatalogue(c.u.tenantId, D(2026, 2, 1));
    const after = await publicCatalogue(c.u.tenantId, D(2026, 7, 1));
    expect(before[0].programmes[0].tuition!.perTerm).toBe('1200000.0000');
    expect(after[0].programmes[0].tuition!.perTerm).toBe('1500000.0000');
  });

  it('says nothing rather than a stale figure when no schedule is in force', async () => {
    const c = await scene();
    await list(c);
    const cat = await publicCatalogue(c.u.tenantId, D(2026, 2, 1));
    expect(cat[0].programmes[0].tuition).toBeNull();
  });

  it('drops a faculty from the catalogue when its last programme is withdrawn', async () => {
    const c = await scene();
    await list(c);
    expect(await publicCatalogue(c.u.tenantId, D(2026, 2, 1))).toHaveLength(1);

    await setProgrammePublication(c.editor, {
      programmeId: c.u.programmeIds.MBBS,
      isPubliclyListed: false,
    });
    expect(await publicCatalogue(c.u.tenantId, D(2026, 2, 1))).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The one public write path
// ---------------------------------------------------------------------------

describe('the enquiry form is the only thing the public may write', () => {
  const valid = {
    senderName: 'Amal Osman',
    email: 'amal@example.com',
    subject: 'Admission requirements',
    message: 'What are the entry requirements for the medicine programme?',
  };

  it('takes an enquiry with no session at all', async () => {
    const c = await scene();
    const row = await submitInquiry(c.u.tenantId, valid);
    expect(row.id).toBeTruthy();

    const handler = await makePrincipal(c.u.tenantId, ['inquiry.handle'], { name: 'front' });
    const rows = await listInquiries(handler);
    expect(rows.map((r) => r.subject)).toContain('Admission requirements');
    expect(rows[0].status).toBe('NEW');
  });

  it('refuses an enquiry nobody could reply to', async () => {
    const c = await scene();
    await expect(
      submitInquiry(c.u.tenantId, { ...valid, email: null, phone: null }),
    ).rejects.toThrow(InquiryError);
  });

  it('refuses that state at the database as well', async () => {
    const c = await scene();
    await expect(
      asSystem((tx) =>
        tx.inquiry.create({
          data: {
            tenantId: c.u.tenantId,
            senderName: 'Nobody',
            subject: 'Silent',
            message: 'No way to reply to this at all.',
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('bounds what an unauthenticated caller may store', async () => {
    const c = await scene();
    await expect(
      submitInquiry(c.u.tenantId, { ...valid, message: 'x'.repeat(5000) }),
    ).rejects.toThrow(InquiryError);
    await expect(submitInquiry(c.u.tenantId, { ...valid, message: 'short' })).rejects.toThrow(
      InquiryError,
    );
    await expect(
      submitInquiry(c.u.tenantId, { ...valid, email: 'not-an-address' }),
    ).rejects.toThrow(InquiryError);
  });

  it('lands in the university it was sent to and nowhere else', async () => {
    const a = await scene();
    const b = await scene();
    await submitInquiry(a.u.tenantId, { ...valid, subject: 'Meant for A' });

    const handlerB = await makePrincipal(b.u.tenantId, ['inquiry.handle'], { name: 'frontB' });
    expect((await listInquiries(handlerB)).map((r) => r.subject)).not.toContain('Meant for A');
  });

  it('records who dealt with it and when', async () => {
    const c = await scene();
    const row = await submitInquiry(c.u.tenantId, valid);
    const handler = await makePrincipal(c.u.tenantId, ['inquiry.handle'], { name: 'front2' });

    await handleInquiry(handler, row.id, { status: 'CLOSED', note: 'Answered by telephone.' });
    const after = await asTenant(c.u.tenantId, (tx) =>
      tx.inquiry.findUniqueOrThrow({
        where: { id: row.id },
        select: { status: true, handledById: true, handledAt: true },
      }),
    );
    expect(after.status).toBe('CLOSED');
    expect(after.handledById).toBe(handler.userId);
    expect(after.handledAt).not.toBeNull();
  });

  it('refuses "closed by nobody at no time"', async () => {
    const c = await scene();
    const row = await submitInquiry(c.u.tenantId, valid);
    await expect(
      asSystem((tx) =>
        tx.inquiry.update({ where: { id: row.id }, data: { status: 'CLOSED' } }),
      ),
    ).rejects.toThrow();
  });

  it('is not readable without inquiry.handle', async () => {
    const c = await scene();
    await submitInquiry(c.u.tenantId, valid);
    await expect(listInquiries(c.editor)).rejects.toThrow(ForbiddenError);
  });
});

// ---------------------------------------------------------------------------
// Campuses, and the permission catalogue
// ---------------------------------------------------------------------------

describe('campuses and permissions', () => {
  it('keeps one primary campus per university', async () => {
    const c = await scene();
    await upsertCampus(c.editor, {
      code: 'MAIN',
      nameAr: 'المقر الرئيسي',
      nameEn: 'Main campus',
      addressEn: 'Khartoum',
      addressAr: 'الخرطوم',
      phone: '+249 183 000000',
      latitude: 15.5007,
      longitude: 32.5599,
      isPrimary: true,
    });
    await upsertCampus(c.editor, {
      code: 'NORTH',
      nameAr: 'مقر بحري',
      nameEn: 'North campus',
      isPrimary: true,
    });

    const site = await publicSite(c.host);
    expect(site!.campuses.filter((x) => x.isPrimary).map((x) => x.code)).toEqual(['NORTH']);
  });

  it('refuses half a map pin', async () => {
    const c = await scene();
    await expect(
      upsertCampus(c.editor, {
        code: 'HALF',
        nameAr: 'مقر',
        nameEn: 'Campus',
        latitude: 15.5,
      }),
    ).rejects.toThrow(CmsError);

    await expect(
      asSystem((tx) =>
        tx.campus.create({
          data: {
            tenantId: c.u.tenantId,
            code: 'HALF2',
            nameAr: 'مقر',
            nameEn: 'Campus',
            latitude: 15.5,
          },
        }),
      ),
    ).rejects.toThrow();
  });

  it('refuses coordinates that are not on Earth', async () => {
    const c = await scene();
    await expect(
      upsertCampus(c.editor, {
        code: 'MARS',
        nameAr: 'مقر',
        nameEn: 'Campus',
        latitude: 120,
        longitude: 32,
      }),
    ).rejects.toThrow(CmsError);
  });

  it('keeps every shipped role clear of the segregation matrix', () => {
    // The new CMS permissions are not an SoD pair, deliberately — but adding
    // them must not have broken a role that was clean before.
    for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
      expect(findSodViolations(def.permissions), `${name} violates SoD`).toEqual([]);
    }
  });
});
