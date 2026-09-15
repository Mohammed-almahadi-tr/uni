-- A ministry candidate is placed into a programme before the medical gate so
-- the applicable examination checklist comes from that programme's faculty.
ALTER TABLE "ministry_candidates"
  ADD COLUMN "programme_id" UUID REFERENCES "programmes"("id");

CREATE INDEX "ministry_candidates_tenant_programme_state_idx"
  ON "ministry_candidates" ("tenant_id", "programme_id", "state");

CREATE TABLE "candidate_medical_requirements" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "faculty_id" UUID NOT NULL REFERENCES "faculties"("id") ON DELETE RESTRICT,
  "code" TEXT NOT NULL,
  "name_ar" TEXT NOT NULL,
  "name_en" TEXT NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "candidate_medical_requirement_name_ar_present"
    CHECK (char_length(btrim("name_ar")) BETWEEN 2 AND 160),
  CONSTRAINT "candidate_medical_requirement_name_en_present"
    CHECK (char_length(btrim("name_en")) BETWEEN 2 AND 160),
  CONSTRAINT "candidate_medical_requirement_code_present"
    CHECK ("code" ~ '^[A-Z0-9_]{2,40}$'),
  CONSTRAINT "candidate_medical_requirements_tenant_faculty_code_key"
    UNIQUE ("tenant_id", "faculty_id", "code")
);

CREATE INDEX "candidate_medical_requirements_tenant_faculty_active_idx"
  ON "candidate_medical_requirements" ("tenant_id", "faculty_id", "is_active");

CREATE TABLE "candidate_medical_assessments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "candidate_id" UUID NOT NULL REFERENCES "ministry_candidates"("id") ON DELETE RESTRICT,
  "exam_date" DATE NOT NULL,
  "blood_group" "BloodGroup" NOT NULL,
  "results" JSONB NOT NULL,
  "verdict" "FitnessVerdict" NOT NULL,
  "verdict_note" TEXT,
  "medical_officer" TEXT NOT NULL,
  "recorded_by_id" UUID NOT NULL REFERENCES "users"("id"),
  "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "superseded_at" TIMESTAMPTZ(6),
  CONSTRAINT "candidate_medical_assessment_officer_present"
    CHECK (char_length(btrim("medical_officer")) BETWEEN 2 AND 160),
  CONSTRAINT "candidate_medical_assessment_results_object"
    CHECK (jsonb_typeof("results") = 'object'),
  CONSTRAINT "candidate_medical_assessment_verdict_note"
    CHECK ("verdict" = 'FIT' OR char_length(btrim(coalesce("verdict_note", ''))) > 0)
);

CREATE INDEX "candidate_medical_assessments_tenant_candidate_recorded_idx"
  ON "candidate_medical_assessments" ("tenant_id", "candidate_id", "recorded_at");
CREATE INDEX "candidate_medical_assessments_tenant_verdict_idx"
  ON "candidate_medical_assessments" ("tenant_id", "verdict");
CREATE UNIQUE INDEX "candidate_medical_assessment_live_candidate_key"
  ON "candidate_medical_assessments" ("candidate_id")
  WHERE "superseded_at" IS NULL;

-- Findings are evidence, not mutable profile data. A new examination may
-- supersede an old one, but recorded clinical fields cannot be changed.
CREATE OR REPLACE FUNCTION protect_candidate_medical_assessment()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."superseded_at" IS NULL
     AND NEW."superseded_at" IS NOT NULL
     AND ROW(OLD."tenant_id", OLD."candidate_id", OLD."exam_date", OLD."blood_group",
             OLD."results", OLD."verdict", OLD."verdict_note", OLD."medical_officer",
             OLD."recorded_by_id", OLD."recorded_at")
         IS NOT DISTINCT FROM
         ROW(NEW."tenant_id", NEW."candidate_id", NEW."exam_date", NEW."blood_group",
             NEW."results", NEW."verdict", NEW."verdict_note", NEW."medical_officer",
             NEW."recorded_by_id", NEW."recorded_at") THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'candidate medical assessments are append-only; supersede with a new assessment';
END;
$$;

CREATE TRIGGER candidate_medical_assessment_append_only
BEFORE UPDATE OR DELETE ON "candidate_medical_assessments"
FOR EACH ROW EXECUTE FUNCTION protect_candidate_medical_assessment();

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['candidate_medical_requirements', 'candidate_medical_assessments']
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
