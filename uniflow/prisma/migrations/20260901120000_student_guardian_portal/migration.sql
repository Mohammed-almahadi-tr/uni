-- Track C3 — the student and guardian self-service portal
-- SRS Module 1: REQ-LP-05. Reads Modules 3, 5, 13, 16 (REQ-AR-04, REQ-CSH-03,
-- REQ-ST-05, REQ-REG-05).
--
-- This phase adds the **third** external audience — after the anonymous
-- visitor (C1) and the applicant (C2) — and the first one that authenticates.
-- It is also the first audience allowed to read another party's rows: a
-- guardian reads their child's account.
--
-- Everything below exists to answer one question: **what stops a portal
-- request reading a student who is not theirs?** The answer is not "the
-- application code remembers to filter". It is that a portal transaction sets
-- `app.portal_student_id` alongside `app.tenant_id`, and a restrictive policy
-- on every table in the database confines it to that one student — or refuses
-- it the table entirely. A missing WHERE in a page component returns no rows
-- rather than somebody else's.

-- ---------------------------------------------------------------------------
-- 1. Who a portal account is.
-- ---------------------------------------------------------------------------
--
-- A separate table from `users`, and deliberately so. A staff user carries
-- roles, permissions, a till, and forty relations naming things they did to
-- the institution's money. A student carries none of that and must never be
-- one role assignment away from carrying it. Two tables cannot be confused by
-- a bug in permission resolution; one table with a "is_student" column can.
--
-- There is no role or permission on this account at all. What a portal
-- account may read is decided by **who it is related to**, in `portal_access`
-- — not by a grant somebody could widen.

CREATE TYPE "PortalRole" AS ENUM ('STUDENT', 'GUARDIAN');

CREATE TABLE "portal_accounts" (
  "id"                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"          UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "email"              TEXT NOT NULL,
  "full_name"          TEXT NOT NULL,
  "password_hash"      TEXT NOT NULL,
  "role"               "PortalRole" NOT NULL,
  "is_active"          BOOLEAN NOT NULL DEFAULT true,
  "session_version"    INTEGER NOT NULL DEFAULT 1,
  "failed_login_count" INTEGER NOT NULL DEFAULT 0,
  "locked_until"       TIMESTAMPTZ(6),
  "last_login_at"      TIMESTAMPTZ(6),
  "created_at"         TIMESTAMPTZ(6) NOT NULL DEFAULT now()
);

COMMENT ON TABLE "portal_accounts" IS
  'A student or guardian login. Holds no role and no permission: what it may '
  'read is decided by the live rows in portal_access.';

-- One account per address per university. The address is stored already
-- lowercased and trimmed, checked here rather than trusted from the caller —
-- two accounts differing only in case is two people who each believe they are
-- the one who can see the account.
CREATE UNIQUE INDEX "portal_accounts_tenant_email_key"
  ON "portal_accounts" ("tenant_id", "email");

ALTER TABLE "portal_accounts"
  ADD CONSTRAINT "chk_portal_account_email_normalised"
  CHECK ("email" = lower(btrim("email")));

ALTER TABLE "portal_accounts"
  ADD CONSTRAINT "chk_portal_account_email_shape"
  CHECK ("email" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$');

ALTER TABLE "portal_accounts"
  ADD CONSTRAINT "chk_portal_account_name_bounds"
  CHECK (char_length(btrim("full_name")) BETWEEN 2 AND 200);

-- A stored password is an Argon2id digest and nothing else. The legacy build
-- compared `Me.txtPassword.Text` against a column in application code; the
-- shape check is what stops a well-meaning import script from putting a
-- cleartext password back into this system.
ALTER TABLE "portal_accounts"
  ADD CONSTRAINT "chk_portal_account_password_hashed"
  CHECK ("password_hash" LIKE '$argon2%');

-- ---------------------------------------------------------------------------
-- 2. What a portal account may see.
-- ---------------------------------------------------------------------------
--
-- The grant. A row here is a relationship, not a permission: it says this
-- account may read this student's record, and nothing else anywhere in the
-- system reads more because of it.
--
-- Revocation is a timestamp rather than a delete, because "who could see this
-- student's account in March" is a question a registry office is asked after
-- a custody dispute, and a deleted row cannot answer it.

CREATE TABLE "portal_access" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"                UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "account_id"               UUID NOT NULL REFERENCES "portal_accounts"("id") ON DELETE CASCADE,
  "student_id"               UUID NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  -- Guardian's stated relationship — mother, father, uncle. NULL for the
  -- student's own account.
  "relationship"             TEXT,
  "granted_at"               TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "granted_via_invitation_id" UUID,
  "revoked_at"               TIMESTAMPTZ(6),
  "revoked_by_id"            UUID REFERENCES "users"("id")
);

-- One live grant per pair. Re-inviting a guardian who already has access must
-- not produce two rows, or revoking one leaves the other.
CREATE UNIQUE INDEX "portal_access_live_key"
  ON "portal_access" ("account_id", "student_id")
  WHERE "revoked_at" IS NULL;

CREATE INDEX "portal_access_student_idx"
  ON "portal_access" ("tenant_id", "student_id")
  WHERE "revoked_at" IS NULL;

-- A revoker without a revocation is a name attached to nothing.
ALTER TABLE "portal_access"
  ADD CONSTRAINT "chk_portal_access_revocation_complete"
  CHECK ("revoked_by_id" IS NULL OR "revoked_at" IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 3. How an account comes to exist.
-- ---------------------------------------------------------------------------
--
-- A registrar grants access; they do **not** choose the password. They issue
-- an invitation and hand over — or read out — a one-time code. The person who
-- accepts it sets their own password, which means no member of staff has ever
-- known it and none can be accused of having used it.
--
-- The code is stored as a SHA-256 digest, unlike C2's application tracking
-- token which is stored as it was issued. The difference is what the secret
-- buys: a tracking token discloses one application's progress, and an
-- invitation mints a credential that reads a student's money for as long as
-- the account lives. A database dump must not contain live invitations.

CREATE TABLE "portal_invitations" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"     UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "student_id"    UUID NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
  "role"          "PortalRole" NOT NULL,
  "email"         TEXT NOT NULL,
  "full_name"     TEXT NOT NULL,
  "relationship"  TEXT,
  "token_hash"    TEXT NOT NULL,
  "issued_by_id"  UUID REFERENCES "users"("id"),
  "issued_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "expires_at"    TIMESTAMPTZ(6) NOT NULL,
  "accepted_at"   TIMESTAMPTZ(6),
  "accepted_account_id" UUID REFERENCES "portal_accounts"("id") ON DELETE SET NULL,
  "revoked_at"    TIMESTAMPTZ(6)
);

ALTER TABLE "portal_access"
  ADD CONSTRAINT "portal_access_invitation_fkey"
  FOREIGN KEY ("granted_via_invitation_id") REFERENCES "portal_invitations"("id");

CREATE UNIQUE INDEX "portal_invitations_token_key"
  ON "portal_invitations" ("token_hash");

CREATE INDEX "portal_invitations_student_idx"
  ON "portal_invitations" ("tenant_id", "student_id");

-- SHA-256, hex. A digest of the wrong length is a code that was stored the
-- way it was typed.
ALTER TABLE "portal_invitations"
  ADD CONSTRAINT "chk_portal_invitation_token_shape"
  CHECK ("token_hash" ~ '^[0-9a-f]{64}$');

-- An invitation that never expires is a credential lying in an inbox.
ALTER TABLE "portal_invitations"
  ADD CONSTRAINT "chk_portal_invitation_expiry_after_issue"
  CHECK ("expires_at" > "issued_at");

ALTER TABLE "portal_invitations"
  ADD CONSTRAINT "chk_portal_invitation_acceptance_complete"
  CHECK (("accepted_at" IS NULL) = ("accepted_account_id" IS NULL));

ALTER TABLE "portal_invitations"
  ADD CONSTRAINT "chk_portal_invitation_email_normalised"
  CHECK ("email" = lower(btrim("email")));

-- A guardian must say who they are to the student; a student is not related
-- to themselves. Expressed as an equivalence so neither half can drift.
ALTER TABLE "portal_invitations"
  ADD CONSTRAINT "chk_portal_invitation_relationship"
  CHECK (("role" = 'GUARDIAN') = ("relationship" IS NOT NULL));

-- ---------------------------------------------------------------------------
-- 4. A grant must not cross a tenant, and a student is one person.
-- ---------------------------------------------------------------------------
--
-- Row-level security already confines every ordinary request to its own
-- tenant, so under the app role these are unreachable states. They are
-- enforced anyway, because the owner role bypasses RLS and a grant that
-- crossed tenants would let a guardian at one university read a student at
-- another — the single worst row this schema could hold. The test suite
-- writes these as the owner and expects the refusal.

CREATE OR REPLACE FUNCTION assert_portal_access_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_account_tenant uuid;
  v_account_role   "PortalRole";
  v_student_tenant uuid;
  v_live           integer;
BEGIN
  SELECT tenant_id, role INTO v_account_tenant, v_account_role
    FROM portal_accounts WHERE id = NEW.account_id;
  SELECT tenant_id INTO v_student_tenant
    FROM students WHERE id = NEW.student_id;

  IF v_account_tenant IS DISTINCT FROM NEW.tenant_id
     OR v_student_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION
      'portal access must not cross tenants: access %, account tenant %, student tenant %',
      NEW.tenant_id, v_account_tenant, v_student_tenant;
  END IF;

  -- A guardian may hold several children. A student is one person, and an
  -- account that says STUDENT while reading two records is either a mistake
  -- or somebody's way in.
  IF v_account_role = 'STUDENT' AND NEW.revoked_at IS NULL THEN
    SELECT count(*) INTO v_live FROM portal_access
      WHERE account_id = NEW.account_id AND revoked_at IS NULL;
    IF v_live > 1 THEN
      RAISE EXCEPTION 'a student portal account may be linked to one student, not %', v_live;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_portal_access_scope
  AFTER INSERT OR UPDATE ON portal_access
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_portal_access_scope();

CREATE OR REPLACE FUNCTION assert_portal_invitation_scope()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_student_tenant uuid;
BEGIN
  SELECT tenant_id INTO v_student_tenant FROM students WHERE id = NEW.student_id;
  IF v_student_tenant IS DISTINCT FROM NEW.tenant_id THEN
    RAISE EXCEPTION 'a portal invitation must name a student of its own tenant';
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_portal_invitation_scope
  AFTER INSERT OR UPDATE ON portal_invitations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_portal_invitation_scope();

-- ---------------------------------------------------------------------------
-- 5. The portal's confinement.
-- ---------------------------------------------------------------------------
--
-- `withPortal(tenantId, studentId, fn)` sets `app.portal_student_id` for the
-- length of one transaction, exactly as `withTenant` sets `app.tenant_id` —
-- SET LOCAL, so it cannot survive onto the next request through a pooled
-- connection.
--
-- Every policy below is RESTRICTIVE, which means it is ANDed with the
-- existing `tenant_isolation` policy rather than ORed beside it. When the GUC
-- is unset — every staff request, every job, every migration — each predicate
-- is `NULL IS NULL`, true, and nothing changes. When it is set, the
-- transaction can see one student's rows on the tables that belong to a
-- student, the reference data needed to name them, and **nothing else in the
-- database**.
--
-- Every one of them also refuses to write: `WITH CHECK
-- (current_portal_student_id() IS NULL)`. A portal transaction is read-only
-- by policy, not by the absence of a call site.

CREATE OR REPLACE FUNCTION current_portal_student_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.portal_student_id', true), '')::uuid;
$$;

COMMENT ON FUNCTION current_portal_student_id() IS
  'The single student a portal transaction is confined to, or NULL for every '
  'other kind of transaction in the system.';

-- 5a. Tables that belong to a student, filtered to the one.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('students',                  'id'),
      ('student_profiles',          'student_id'),
      ('student_charges',           'student_id'),
      ('student_receipts',          'student_id'),
      ('instalment_plans',          'student_id'),
      ('semester_registrations',    'student_id'),
      ('student_documents',         'student_id'),
      ('holds',                     'student_id'),
      ('applications',              'student_id'),
      ('student_status_history',    'student_id'),
      ('student_programme_history', 'student_id'),
      ('scholarship_awards',        'student_id'),
      ('sponsorships',              'student_id')
    ) AS v(tbl, col)
  LOOP
    EXECUTE format($f$
      CREATE POLICY portal_scope ON %I AS RESTRICTIVE
        USING (current_portal_student_id() IS NULL
               OR %I = current_portal_student_id())
        WITH CHECK (current_portal_student_id() IS NULL)
    $f$, r.tbl, r.col);
  END LOOP;
END
$$;

-- 5b. Their children, reached through the parent they hang off. A
--     registration line has no student of its own; the registration it
--     belongs to does.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('registration_lines',  'registration_id', 'semester_registrations'),
      ('receipt_allocations', 'receipt_id',      'student_receipts'),
      ('instalments',         'plan_id',         'instalment_plans'),
      ('application_choices', 'application_id',  'applications')
    ) AS v(tbl, col, parent)
  LOOP
    EXECUTE format($f$
      CREATE POLICY portal_scope ON %I AS RESTRICTIVE
        USING (current_portal_student_id() IS NULL
               OR EXISTS (SELECT 1 FROM %I p WHERE p.id = %I))
        WITH CHECK (current_portal_student_id() IS NULL)
    $f$, r.tbl, r.parent, r.col);
  END LOOP;
END
$$;

-- 5bb. The vouchers behind this student's own documents, and only those.
--
--      A statement's reversal line is dated from the voucher that reversed
--      the charge, and its dishonour line from the voucher the bank's refusal
--      produced. Denying the portal `transaction_headers` outright therefore
--      does not narrow the statement — it deletes the two lines a student
--      most needs to see, the charge that was taken back and the cheque that
--      bounced.
--
--      So one row of the general ledger's header table is visible when a
--      charge or receipt **this same transaction can already see** points at
--      it. The EXISTS runs under the child table's own portal_scope policy,
--      so "already see" means this student's. `transaction_lines` stays
--      denied: the reference and the date are on the header, and the postings
--      are the institution's books.

CREATE POLICY portal_scope ON transaction_headers AS RESTRICTIVE
  USING (
    current_portal_student_id() IS NULL
    OR EXISTS (
      SELECT 1 FROM student_charges c
       WHERE c.posted_header_id = transaction_headers.id
          OR c.reversal_header_id = transaction_headers.id
    )
    OR EXISTS (
      SELECT 1 FROM student_receipts r
       WHERE r.posted_header_id = transaction_headers.id
          OR r.cancellation_header_id = transaction_headers.id
          OR r.dishonour_header_id = transaction_headers.id
    )
  )
  WITH CHECK (current_portal_student_id() IS NULL);

-- 5c. Reference data. A statement that says "programme 7f3c…" is not a
--     statement. These carry no student and are the same rows every member
--     of the university's public already sees on the prospectus, so the
--     portal reads them tenant-wide — and still cannot write them.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'faculties', 'departments', 'programmes', 'academic_years',
    'academic_terms', 'batches', 'admission_categories', 'nationalities',
    'certificate_types', 'fee_items', 'document_types',
    'programme_document_requirements'
  ]
  LOOP
    EXECUTE format($f$
      CREATE POLICY portal_scope ON %I AS RESTRICTIVE
        USING (true)
        WITH CHECK (current_portal_student_id() IS NULL)
    $f$, t);
  END LOOP;
END
$$;

-- 5d. Everything else in the database, refused outright.
--
--     Enumerating the denials rather than the permissions would be the wrong
--     way round: the list that must not go stale is the short one. So this
--     walks every table that has row-level security enabled and has not
--     already been given a `portal_scope` policy above, and denies it. The
--     medical record, the audit chain, the general ledger, the payroll of
--     vendors, every other student in the university — and, pointedly, the
--     three tables added by this migration: a portal transaction cannot read
--     the credential it authenticated with.
--
--     A table added by a later migration inherits nothing from this loop. The
--     C3 test suite reads pg_policies and fails when an RLS-enabled table has
--     neither policy, which turns "somebody must remember" into a red test.
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public'
       AND c.relkind = 'r'
       AND c.relrowsecurity
       AND NOT EXISTS (
         SELECT 1 FROM pg_policy p
          WHERE p.polrelid = c.oid AND p.polname = 'portal_scope'
       )
  LOOP
    EXECUTE format($f$
      CREATE POLICY portal_denied ON %I AS RESTRICTIVE
        USING (current_portal_student_id() IS NULL)
        WITH CHECK (current_portal_student_id() IS NULL)
    $f$, t);
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 6. Row-level security and grants for the three new tables.
-- ---------------------------------------------------------------------------
--
-- They are read and written under `withTenant` — signing in, accepting an
-- invitation and changing a password are tenant-scoped work, not
-- portal-scoped work, because the account is not yet confined to a student
-- when it is being identified. §5d has already denied all three to a
-- portal-scoped transaction.

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['portal_accounts', 'portal_access', 'portal_invitations']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = current_tenant_id())
        WITH CHECK (tenant_id = current_tenant_id())
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY portal_denied ON %I AS RESTRICTIVE
        USING (current_portal_student_id() IS NULL)
        WITH CHECK (current_portal_student_id() IS NULL)
    $f$, t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uniflow_app') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO uniflow_app', t);
    END IF;
  END LOOP;
END
$$;
