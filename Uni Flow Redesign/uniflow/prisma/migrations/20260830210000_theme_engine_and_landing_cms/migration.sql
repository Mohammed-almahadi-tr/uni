-- Track C1 — Theme engine, tenant hosts and the landing CMS
-- SRS Module 1: REQ-LP-01, REQ-LP-02, REQ-LP-03, REQ-LP-05, REQ-LP-06

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('FACEBOOK', 'X', 'INSTAGRAM', 'YOUTUBE', 'LINKEDIN', 'TELEGRAM', 'WHATSAPP', 'TIKTOK');

-- CreateEnum
CREATE TYPE "LandingSectionKind" AS ENUM ('HERO', 'ABOUT', 'FACULTIES', 'NEWS', 'CALENDAR', 'CAMPUS', 'CONTACT');

-- CreateEnum
CREATE TYPE "HeroMediaKind" AS ENUM ('NONE', 'IMAGE', 'VIDEO');

-- CreateEnum
CREATE TYPE "HeroCtaVariant" AS ENUM ('PRIMARY', 'SECONDARY');

-- CreateEnum
CREATE TYPE "PostKind" AS ENUM ('NEWS', 'ANNOUNCEMENT');

-- CreateEnum
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "CalendarEventKind" AS ENUM ('SEMESTER_START', 'SEMESTER_END', 'REGISTRATION_DEADLINE', 'EXAM', 'HOLIDAY', 'EVENT');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'ACKNOWLEDGED', 'CLOSED');

-- AlterTable
ALTER TABLE "programmes" ADD COLUMN     "career_prospects_ar" TEXT,
ADD COLUMN     "career_prospects_en" TEXT,
ADD COLUMN     "is_publicly_listed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "overview_ar" TEXT,
ADD COLUMN     "overview_en" TEXT;

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "logo_url",
DROP COLUMN "theme_config";

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "host" TEXT NOT NULL,
    "is_canonical" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_branding" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "short_code" TEXT NOT NULL,
    "motto_ar" TEXT,
    "motto_en" TEXT,
    "logo_url" TEXT,
    "logo_dark_url" TEXT,
    "favicon_url" TEXT,
    "primary_h" INTEGER NOT NULL,
    "primary_s" INTEGER NOT NULL,
    "primary_l" INTEGER NOT NULL,
    "secondary_h" INTEGER NOT NULL,
    "secondary_s" INTEGER NOT NULL,
    "secondary_l" INTEGER NOT NULL,
    "accent_h" INTEGER NOT NULL,
    "accent_s" INTEGER NOT NULL,
    "accent_l" INTEGER NOT NULL,
    "heading_font" TEXT NOT NULL DEFAULT 'Cairo',
    "body_font" TEXT NOT NULL DEFAULT 'Cairo',
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_branding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_social_links" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tenant_social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "landing_sections" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "kind" "LandingSectionKind" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL,
    "heading_ar" TEXT,
    "heading_en" TEXT,
    "blurb_ar" TEXT,
    "blurb_en" TEXT,

    CONSTRAINT "landing_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_content" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "headline_ar" TEXT NOT NULL,
    "headline_en" TEXT NOT NULL,
    "subheadline_ar" TEXT,
    "subheadline_en" TEXT,
    "media_kind" "HeroMediaKind" NOT NULL DEFAULT 'NONE',
    "media_url" TEXT,
    "poster_url" TEXT,
    "overlay_pct" INTEGER NOT NULL DEFAULT 45,
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "hero_content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hero_ctas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "hero_id" UUID NOT NULL,
    "label_ar" TEXT NOT NULL,
    "label_en" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "variant" "HeroCtaVariant" NOT NULL DEFAULT 'PRIMARY',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hero_ctas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "news_posts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "PostKind" NOT NULL DEFAULT 'NEWS',
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "excerpt_ar" TEXT,
    "excerpt_en" TEXT,
    "body_ar" TEXT NOT NULL,
    "body_en" TEXT NOT NULL,
    "cover_image_url" TEXT,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "author_id" UUID NOT NULL,
    "published_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "kind" "CalendarEventKind" NOT NULL,
    "title_ar" TEXT NOT NULL,
    "title_en" TEXT NOT NULL,
    "description_ar" TEXT,
    "description_en" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "academic_year_id" UUID,
    "status" "PublishStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "calendar_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "campuses" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "address_ar" TEXT,
    "address_en" TEXT,
    "city" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "campuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inquiries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sender_name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "handled_by_id" UUID,
    "handled_at" TIMESTAMPTZ(6),
    "response_note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_host_key" ON "tenant_domains"("host");

-- CreateIndex
CREATE INDEX "tenant_domains_tenant_id_idx" ON "tenant_domains"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_branding_tenant_id_key" ON "tenant_branding"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_social_links_tenant_id_platform_key" ON "tenant_social_links"("tenant_id", "platform");

-- CreateIndex
CREATE INDEX "landing_sections_tenant_id_sort_order_idx" ON "landing_sections"("tenant_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "landing_sections_tenant_id_kind_key" ON "landing_sections"("tenant_id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "hero_content_tenant_id_key" ON "hero_content"("tenant_id");

-- CreateIndex
CREATE INDEX "hero_ctas_hero_id_sort_order_idx" ON "hero_ctas"("hero_id", "sort_order");

-- CreateIndex
CREATE INDEX "news_posts_tenant_id_status_published_at_idx" ON "news_posts"("tenant_id", "status", "published_at");

-- CreateIndex
CREATE UNIQUE INDEX "news_posts_tenant_id_slug_key" ON "news_posts"("tenant_id", "slug");

-- CreateIndex
CREATE INDEX "calendar_events_tenant_id_status_start_date_idx" ON "calendar_events"("tenant_id", "status", "start_date");

-- CreateIndex
CREATE INDEX "campuses_tenant_id_is_active_sort_order_idx" ON "campuses"("tenant_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "campuses_tenant_id_code_key" ON "campuses"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "inquiries_tenant_id_status_created_at_idx" ON "inquiries"("tenant_id", "status", "created_at");

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_branding" ADD CONSTRAINT "tenant_branding_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_social_links" ADD CONSTRAINT "tenant_social_links_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "landing_sections" ADD CONSTRAINT "landing_sections_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_content" ADD CONSTRAINT "hero_content_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_content" ADD CONSTRAINT "hero_content_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_ctas" ADD CONSTRAINT "hero_ctas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hero_ctas" ADD CONSTRAINT "hero_ctas_hero_id_fkey" FOREIGN KEY ("hero_id") REFERENCES "hero_content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "news_posts" ADD CONSTRAINT "news_posts_published_by_id_fkey" FOREIGN KEY ("published_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "campuses" ADD CONSTRAINT "campuses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_handled_by_id_fkey" FOREIGN KEY ("handled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===========================================================================
-- Track C1 — constraints, triggers, RLS and the default-branding backfill.
--
-- The legacy system white-labelled by copying the source tree and swapping
-- the bitmaps in `My Project\Resources`. Two copies of that tree survive in
-- this repository, and both still carry the wrong institution's identity:
--
--   Me.Text = "Oasis Computer Systems"     ' frmMain.designer.vb:233  (Ribat)
--   Me.Text = "الكلية التكنلوجية"           ' frmMainPanal.Designer.vb:56 (Nile)
--
-- The Ribat build's main window is titled with the *vendor's* name; the Nile
-- build's is titled with a *third institution's* name, left behind by whoever
-- copied the folder. A third, `KCT_Logo_A-2.ico`, ships as <Content> in the
-- Nile project file. None of this is a bug that could be found by testing,
-- because there is no per-tenant behaviour to test — identity was a constant.
--
-- Everything below exists so that identity is a row with a tenant on it, and
-- so that the row cannot say something the page cannot render.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Hosts. One host, one tenant, globally.
--
-- `tenant_domains_host_key` (created above) is the whole cross-tenant
-- guarantee for the public surface: two universities cannot both claim
-- `nilecollege.edu.sd`, so a request arriving on a host resolves to exactly
-- one tenant or to none. There is no ambiguity to resolve in application code
-- and therefore no bug to write there.
-- ---------------------------------------------------------------------------

ALTER TABLE tenant_domains ADD CONSTRAINT chk_domain_host_shape CHECK (
  host = lower(host)
  AND host !~ '[[:space:]/:@]'
  AND host ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$'
  AND length(host) BETWEEN 1 AND 253
);

COMMENT ON CONSTRAINT chk_domain_host_shape ON tenant_domains IS
  'A bare hostname: lowercase, no scheme, no port, no path. Normalisation happens on the way in so the lookup is an equality test; this refuses anything that got past it.';

-- One address is the real one; the rest redirect to it.
CREATE UNIQUE INDEX uq_one_canonical_domain_per_tenant
  ON tenant_domains (tenant_id)
  WHERE is_canonical;

-- A host nobody has proved control of cannot be the address the site
-- advertises. Claiming a domain must not be enough to be served on it.
ALTER TABLE tenant_domains ADD CONSTRAINT chk_canonical_is_verified CHECK (
  NOT is_canonical OR is_verified
);


-- ---------------------------------------------------------------------------
-- 2. Branding. A palette the page can actually render.
--
-- HSL channels are range-checked because they are written straight into CSS
-- custom properties. A hue of 400 does not fail loudly — it produces an
-- invalid declaration, the custom property falls back to its initial value,
-- and the university's site renders in whatever colour the browser felt like.
-- That is precisely the class of failure a white-label product cannot notice
-- on its own, because nobody at the vendor ever loads the customer's site.
-- ---------------------------------------------------------------------------

ALTER TABLE tenant_branding ADD CONSTRAINT chk_branding_hsl CHECK (
  primary_h   BETWEEN 0 AND 360 AND primary_s   BETWEEN 0 AND 100 AND primary_l   BETWEEN 0 AND 100
  AND secondary_h BETWEEN 0 AND 360 AND secondary_s BETWEEN 0 AND 100 AND secondary_l BETWEEN 0 AND 100
  AND accent_h    BETWEEN 0 AND 360 AND accent_s    BETWEEN 0 AND 100 AND accent_l    BETWEEN 0 AND 100
);

ALTER TABLE tenant_branding ADD CONSTRAINT chk_branding_short_code CHECK (
  short_code ~ '^[A-Z0-9][A-Z0-9-]{0,11}$'
);

-- The font name is interpolated into a CSS font-family declaration. An
-- allow-list, not free text: the set of faces that ship with the application
-- and are known to carry a complete Arabic range. A face without one renders
-- Arabic in a fallback with different metrics, which is the "looks like a
-- defect to whoever signs it" failure the layout comments already describe.
ALTER TABLE tenant_branding ADD CONSTRAINT chk_branding_fonts CHECK (
  heading_font IN ('Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'Noto Naskh Arabic')
  AND body_font IN ('Cairo', 'Tajawal', 'IBM Plex Sans Arabic', 'Noto Naskh Arabic')
);

ALTER TABLE tenant_social_links ADD CONSTRAINT chk_social_url_https CHECK (
  url ~ '^https://[^[:space:]]+$'
);


-- ---------------------------------------------------------------------------
-- 3. Hero and sections.
-- ---------------------------------------------------------------------------

ALTER TABLE landing_sections ADD CONSTRAINT chk_landing_sort_order CHECK (sort_order >= 0);

ALTER TABLE hero_content ADD CONSTRAINT chk_hero_overlay_pct CHECK (
  overlay_pct BETWEEN 0 AND 100
);

ALTER TABLE hero_content ADD CONSTRAINT chk_hero_headline CHECK (
  btrim(headline_ar) <> '' AND btrim(headline_en) <> ''
);

ALTER TABLE hero_content ADD CONSTRAINT chk_hero_media CHECK (
  (media_kind = 'NONE'  AND media_url IS NULL)
  OR (media_kind = 'IMAGE' AND media_url IS NOT NULL)
  -- A video hero must carry a poster. Without one the headline sits on an
  -- empty rectangle until several megabytes have arrived, which on the
  -- connections these applicants have is most of the visit.
  OR (media_kind = 'VIDEO' AND media_url IS NOT NULL AND poster_url IS NOT NULL)
);

-- A call to action is the one link on the page every visitor is invited to
-- click. Relative path or https only — never javascript:, never data:.
ALTER TABLE hero_ctas ADD CONSTRAINT chk_hero_cta_href CHECK (
  href ~ '^/[^[:space:]]*$' OR href ~ '^https://[^[:space:]]+$'
);


-- ---------------------------------------------------------------------------
-- 4. Publishing is bilingual or it does not happen.
--
-- These institutions publish in Arabic and English, and the locale is chosen
-- by the reader, not by the author. A post published with only one language
-- filled in renders as an empty page to half the audience — and renders
-- *successfully*, with a 200, so nothing reports it. The database refuses the
-- state instead.
-- ---------------------------------------------------------------------------

ALTER TABLE news_posts ADD CONSTRAINT chk_post_slug CHECK (
  slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(slug) BETWEEN 3 AND 120
);

ALTER TABLE news_posts ADD CONSTRAINT chk_post_published_complete CHECK (
  status <> 'PUBLISHED'
  OR (
    published_at IS NOT NULL
    AND published_by_id IS NOT NULL
    AND btrim(title_ar) <> '' AND btrim(title_en) <> ''
    AND btrim(body_ar)  <> '' AND btrim(body_en)  <> ''
  )
);

ALTER TABLE news_posts ADD CONSTRAINT chk_post_draft_unpublished CHECK (
  status <> 'DRAFT' OR (published_at IS NULL AND published_by_id IS NULL)
);

CREATE OR REPLACE FUNCTION assert_post_not_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status <> 'DRAFT' THEN
    RAISE EXCEPTION
      'post "%" has been published and cannot be deleted. Archive it — a URL that was public and is now a 404 is worse than a notice marked out of date',
      OLD.slug
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_post_not_deleted
  BEFORE DELETE ON news_posts
  FOR EACH ROW EXECUTE FUNCTION assert_post_not_deleted();


-- ---------------------------------------------------------------------------
-- 5. The calendar publishes the dates the system enforces.
--
-- REQ-LP-05 asks for "semester start dates, examination schedules, and
-- registration deadlines". Three of those four already exist as columns on
-- `academic_terms` — start_date, end_date and registration_closes_on — and
-- the registration engine refuses a late registration against that last one
-- (B4, assert_registration_term_open).
--
-- So they are not stored here. A CMS field for "registration deadline" is a
-- second copy of a figure the engine already enforces, and the two disagree
-- the first time a registrar extends the deadline without telling the person
-- who edits the website. The published calendar is assembled by reading the
-- terms; this table carries only what has no counterpart in the system —
-- examinations, holidays, ceremonies.
-- ---------------------------------------------------------------------------

ALTER TABLE calendar_events ADD CONSTRAINT chk_calendar_event_not_derived CHECK (
  kind NOT IN ('SEMESTER_START', 'SEMESTER_END', 'REGISTRATION_DEADLINE')
);

COMMENT ON CONSTRAINT chk_calendar_event_not_derived ON calendar_events IS
  'Semester dates and the registration deadline are read from academic_terms, never retyped. The enum carries those kinds because the assembled calendar returns them; the table refuses to store them.';

ALTER TABLE calendar_events ADD CONSTRAINT chk_calendar_dates CHECK (
  end_date IS NULL OR end_date >= start_date
);

ALTER TABLE calendar_events ADD CONSTRAINT chk_calendar_published_bilingual CHECK (
  status <> 'PUBLISHED' OR (btrim(title_ar) <> '' AND btrim(title_en) <> '')
);


-- ---------------------------------------------------------------------------
-- 6. Campuses.
-- ---------------------------------------------------------------------------

ALTER TABLE campuses ADD CONSTRAINT chk_campus_coords CHECK (
  (latitude IS NULL) = (longitude IS NULL)
  AND (latitude IS NULL OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);

CREATE UNIQUE INDEX uq_one_primary_campus_per_tenant
  ON campuses (tenant_id)
  WHERE is_primary;

ALTER TABLE campuses ADD CONSTRAINT chk_campus_email CHECK (
  email IS NULL OR email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
);


-- ---------------------------------------------------------------------------
-- 7. Enquiries — the one public write path.
--
-- Anything the internet may INSERT into needs its bounds in the database
-- rather than only in the form component, because the form component is not
-- what an attacker uses.
-- ---------------------------------------------------------------------------

ALTER TABLE inquiries ADD CONSTRAINT chk_inquiry_reachable CHECK (
  email IS NOT NULL OR phone IS NOT NULL
);

COMMENT ON CONSTRAINT chk_inquiry_reachable ON inquiries IS
  'An enquiry nobody can reply to is a support queue that only grows. One of the two must be present.';

ALTER TABLE inquiries ADD CONSTRAINT chk_inquiry_email CHECK (
  email IS NULL OR email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
);

ALTER TABLE inquiries ADD CONSTRAINT chk_inquiry_bounds CHECK (
  length(btrim(sender_name)) BETWEEN 2 AND 120
  AND length(btrim(subject)) BETWEEN 3 AND 200
  AND length(btrim(message)) BETWEEN 10 AND 4000
  AND (phone IS NULL OR length(btrim(phone)) BETWEEN 6 AND 32)
);

ALTER TABLE inquiries ADD CONSTRAINT chk_inquiry_handled CHECK (
  status = 'NEW' OR (handled_by_id IS NOT NULL AND handled_at IS NOT NULL)
);


-- ---------------------------------------------------------------------------
-- 8. A programme is published deliberately, completely, and in both languages.
-- ---------------------------------------------------------------------------

ALTER TABLE programmes ADD CONSTRAINT chk_programme_public_bilingual CHECK (
  NOT is_publicly_listed
  OR (
    overview_ar IS NOT NULL AND btrim(overview_ar) <> ''
    AND overview_en IS NOT NULL AND btrim(overview_en) <> ''
  )
);

ALTER TABLE programmes ADD CONSTRAINT chk_programme_public_active CHECK (
  NOT is_publicly_listed OR is_active
);

COMMENT ON CONSTRAINT chk_programme_public_active ON programmes IS
  'A programme the institution has stopped running must not stay on the public catalogue advertising intake. Deactivating it withdraws it.';


-- ---------------------------------------------------------------------------
-- 9. Cross-table references stay inside one tenant.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_hero_cta_same_tenant
  BEFORE INSERT OR UPDATE ON hero_ctas
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('hero_id', 'hero_content');

CREATE TRIGGER trg_calendar_event_same_tenant
  BEFORE INSERT OR UPDATE ON calendar_events
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('academic_year_id', 'academic_years');


-- ---------------------------------------------------------------------------
-- 10. Default branding for tenants that already exist.
--
-- `tenant_branding` has no nullable palette, so an existing tenant would
-- otherwise have no row and fall back to the shipped default at render time.
-- That fallback exists and is tested, but a tenant with no row cannot be
-- edited into one through the normal path without the editor first inventing
-- a palette. Give every existing tenant the deep teal the design system
-- already ships with, and a short code derived from its slug.
-- ---------------------------------------------------------------------------

INSERT INTO tenant_branding (
  id, tenant_id, short_code, primary_h, primary_s, primary_l,
  secondary_h, secondary_s, secondary_l, accent_h, accent_s, accent_l,
  heading_font, body_font, updated_at
)
SELECT gen_random_uuid(),
       t.id,
       upper(regexp_replace(left(t.slug, 8), '[^A-Za-z0-9-]', '', 'g')),
       176, 82, 27,   -- primary: the shipped teal, see globals.css
       222, 47, 11,   -- secondary: the foreground ink, used for dark surfaces
       38, 92, 42,    -- accent: the warning amber, the only warm token shipped
       'Cairo', 'Cairo', now()
  FROM tenants t
 WHERE NOT EXISTS (SELECT 1 FROM tenant_branding b WHERE b.tenant_id = t.id)
   AND regexp_replace(left(t.slug, 8), '[^A-Za-z0-9-]', '', 'g') <> '';


-- ---------------------------------------------------------------------------
-- 11. Row-level security and grants.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenant_domains', 'tenant_branding', 'tenant_social_links',
    'landing_sections', 'hero_content', 'hero_ctas',
    'news_posts', 'calendar_events', 'campuses', 'inquiries'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = current_tenant_id())
        WITH CHECK (tenant_id = current_tenant_id())
    $f$, t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uniflow_app') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO uniflow_app', t);
    END IF;
  END LOOP;
END
$$;

-- `tenant_domains` is the one table read *before* a tenant is known: the
-- resolver turns a hostname into a tenant id, and at that moment there is no
-- `app.tenant_id` to filter on. That lookup therefore runs as the owner (see
-- resolveTenantByHost), exactly as the sessionless registration-card
-- verification does — a single-row read of a public fact, returning nothing
-- but the tenant it belongs to. The RLS policy above still governs every
-- request-facing query against the table.
