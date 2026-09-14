-- Ministry-sourced candidates are not students. They must complete the
-- admissions workflow before a registrar creates a Student record and before
-- they can ever be invited into Student Self Service.

CREATE TYPE "MinistryCandidateState" AS ENUM (
  'IMPORTED',
  'PROFILE_COMPLETED',
  'MEDICAL_PENDING',
  'MEDICALLY_CLEARED',
  'INTERVIEW_PENDING',
  'ACCEPTED',
  'REJECTED',
  'REGISTRATION_PENDING',
  'REGISTERED'
);

CREATE TABLE "ministry_imports" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "batch_id" UUID NOT NULL REFERENCES "batches"("id"),
  "file_name" TEXT NOT NULL,
  "file_sha256" CHAR(64) NOT NULL,
  "total_rows" INTEGER NOT NULL,
  "imported_rows" INTEGER NOT NULL,
  "rejected_rows" INTEGER NOT NULL,
  "imported_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ministry_import_counts" CHECK (
    "total_rows" >= 0 AND "imported_rows" >= 0 AND "rejected_rows" >= 0
    AND "imported_rows" + "rejected_rows" = "total_rows"
  )
);

CREATE UNIQUE INDEX "ministry_imports_tenant_sha_key"
  ON "ministry_imports" ("tenant_id", "file_sha256");
CREATE INDEX "ministry_imports_tenant_batch_imported_idx"
  ON "ministry_imports" ("tenant_id", "batch_id", "imported_at");

CREATE TABLE "ministry_candidates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "import_id" UUID NOT NULL REFERENCES "ministry_imports"("id") ON DELETE RESTRICT,
  "batch_id" UUID NOT NULL REFERENCES "batches"("id"),
  "import_row" INTEGER NOT NULL,
  "full_name_ar" TEXT NOT NULL,
  "school" TEXT NOT NULL,
  "national_id" TEXT NOT NULL,
  "admission_year" INTEGER NOT NULL,
  "state" "MinistryCandidateState" NOT NULL DEFAULT 'IMPORTED',
  "full_name_en" TEXT,
  "guardian_name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "profile_completed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  CONSTRAINT "ministry_candidates_import_row_key" UNIQUE ("import_id", "import_row"),
  CONSTRAINT "ministry_candidates_tenant_national_id_key" UNIQUE ("tenant_id", "national_id"),
  CONSTRAINT "ministry_candidates_row_positive" CHECK ("import_row" > 0),
  CONSTRAINT "ministry_candidates_name_bounds" CHECK (char_length(btrim("full_name_ar")) BETWEEN 2 AND 200),
  CONSTRAINT "ministry_candidates_school_bounds" CHECK (char_length(btrim("school")) BETWEEN 2 AND 200),
  CONSTRAINT "ministry_candidates_national_id_present" CHECK (char_length(btrim("national_id")) BETWEEN 3 AND 64),
  CONSTRAINT "ministry_candidates_admission_year_bounds" CHECK ("admission_year" BETWEEN 1900 AND 2200)
);

CREATE INDEX "ministry_candidates_tenant_batch_state_idx"
  ON "ministry_candidates" ("tenant_id", "batch_id", "state");
CREATE INDEX "ministry_candidates_tenant_admission_year_idx"
  ON "ministry_candidates" ("tenant_id", "admission_year");

-- RLS is explicit for every tenant-owned table. Portal requests are denied
-- even if a future programmer accidentally reaches this table from a portal
-- transaction.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['ministry_imports', 'ministry_candidates']
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
