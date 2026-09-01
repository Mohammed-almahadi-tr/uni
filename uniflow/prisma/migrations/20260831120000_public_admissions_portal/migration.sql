-- Track C2 — the public admissions application flow
-- SRS Module 1: REQ-LP-04. Feeds Module 17 (REQ-ADM-CAP-02/03/05).
--
-- This phase adds the **second** path in the system by which a request
-- carrying no session writes a row. The first, C1's enquiry form, writes to
-- one table holding nothing but what the sender typed. This one writes into
-- the admissions queue a committee acts on, so every bound it needs is here
-- rather than only in the form component — the form component is not what an
-- attacker uses.

-- ---------------------------------------------------------------------------
-- 1. Where an application came from.
-- ---------------------------------------------------------------------------
--
-- Not decoration. A committee reading a certificate score needs to know
-- whether a registrar typed it from a certified document or the applicant
-- typed it about themselves, and REQ-ADM-CAP-05's duplicate surfacing matters
-- far more for the second. The default is STAFF, which is what every row
-- already in the table is.

CREATE TYPE "ApplicationSource" AS ENUM ('STAFF', 'PUBLIC', 'IMPORT');

ALTER TABLE "applications"
  ADD COLUMN "source" "ApplicationSource" NOT NULL DEFAULT 'STAFF',
  ADD COLUMN "tracking_token" TEXT;

COMMENT ON COLUMN "applications"."tracking_token" IS
  'Opaque, unguessable secret an applicant quotes with their application '
  'number to check their own status. A public applicant has no account and no '
  'session; this is the only thing that proves an enquiry about an '
  'application comes from the person who made it.';

-- One token per tenant, and the index only covers rows that have one — a
-- staff-entered application is not trackable and must not collide with
-- another that also is not.
CREATE UNIQUE INDEX "applications_tenant_tracking_token_key"
  ON "applications" ("tenant_id", "tracking_token")
  WHERE "tracking_token" IS NOT NULL;

-- A public application is the only kind that carries a token, and it must
-- carry one: the applicant has no other way back to what they submitted.
-- Expressed as an equivalence so neither half can drift.
ALTER TABLE "applications"
  ADD CONSTRAINT "chk_application_public_is_trackable"
  CHECK (("source" = 'PUBLIC') = ("tracking_token" IS NOT NULL));

-- The token is a secret, so it has to be long enough not to be guessed and
-- is refused if it is not. 32 hex characters, as the registration card's
-- verification token already is.
ALTER TABLE "applications"
  ADD CONSTRAINT "chk_application_tracking_token_shape"
  CHECK ("tracking_token" IS NULL OR "tracking_token" ~ '^[0-9a-f]{32}$');

-- A public applicant types their own name, so the bounds that were the form's
-- business when only staff could reach the table are now the database's.
ALTER TABLE "applications"
  ADD CONSTRAINT "chk_application_name_bounds"
  CHECK (
    char_length(btrim("full_name_ar")) BETWEEN 2 AND 200 AND
    char_length(btrim("full_name_en")) BETWEEN 2 AND 200
  );

-- Room for a plausible certificate year and nothing else. A four-digit year
-- is not a bound; 1899 and 3000 are both wrong in ways that produce a
-- nonsensical age check downstream.
ALTER TABLE "applications"
  ADD CONSTRAINT "chk_application_certificate_year"
  CHECK ("certificate_year" IS NULL OR "certificate_year" BETWEEN 1950 AND 2100);

-- ---------------------------------------------------------------------------
-- 2. When a batch accepts public applications.
-- ---------------------------------------------------------------------------
--
-- Both columns are NULL by default, and NULL means **closed**. A public write
-- surface that is open the moment it is deployed is one nobody decided to
-- open: every existing tenant stays shut until somebody sets a window.
--
-- The alternative considered and rejected was inferring the window from
-- whether the batch has active seat quotas. Seats are declared months before
-- applications open, and closing the portal would then mean deactivating the
-- quotas — which would break the capacity report that the same quotas feed.
-- One fact, one column.

ALTER TABLE "batches"
  ADD COLUMN "applications_open_from" DATE,
  ADD COLUMN "applications_open_to" DATE;

COMMENT ON COLUMN "batches"."applications_open_from" IS
  'Inclusive first day the public application portal accepts applications for '
  'this batch. NULL means the portal is closed for it.';

-- Both or neither: a window with one end is not a window, and whichever end
-- is missing would be read as "forever" by somebody.
ALTER TABLE "batches"
  ADD CONSTRAINT "chk_batch_application_window_complete"
  CHECK (
    ("applications_open_from" IS NULL) = ("applications_open_to" IS NULL)
  );

ALTER TABLE "batches"
  ADD CONSTRAINT "chk_batch_application_window_ordered"
  CHECK (
    "applications_open_from" IS NULL OR
    "applications_open_to" >= "applications_open_from"
  );

-- The portal reads open batches on every page load of the public form, and
-- there will be a handful of batches per tenant — but the predicate is the
-- whole of the query's selectivity, so it is indexed.
CREATE INDEX "batches_tenant_application_window_idx"
  ON "batches" ("tenant_id", "applications_open_from", "applications_open_to")
  WHERE "applications_open_from" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Row-level security.
-- ---------------------------------------------------------------------------
--
-- Nothing to add: `applications`, `application_choices` and `batches` already
-- carry `tenant_isolation` and the app-role grants from the Track B2 and B1
-- migrations. This is worth stating rather than leaving implicit, because the
-- new writer is anonymous and the question "under what confinement" is the
-- first one to ask about it.
--
-- The answer: the public submission runs under `withTenant` as `uniflow_app`
-- — NOSUPERUSER, NOBYPASSRLS — with `app.tenant_id` set from the **resolved
-- host**, never from the form body. A hidden field naming the tenant would
-- let anyone post into any university's admissions queue.
