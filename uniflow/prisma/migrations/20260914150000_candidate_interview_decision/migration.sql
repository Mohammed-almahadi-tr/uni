CREATE TABLE "candidate_interview_decisions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "candidate_id" UUID NOT NULL UNIQUE REFERENCES "ministry_candidates"("id") ON DELETE RESTRICT,
  "decision" "AdmissionDecision" NOT NULL,
  "score" DECIMAL(6,3),
  "notes" TEXT,
  "conditions" TEXT,
  "discount_pct" DECIMAL(7,4) NOT NULL DEFAULT 0,
  "instalment_count" SMALLINT NOT NULL DEFAULT 1,
  "decided_by_id" UUID NOT NULL REFERENCES "users"("id"),
  "decided_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "finalized_at" TIMESTAMPTZ(6),
  CONSTRAINT "candidate_interview_decision_allowed"
    CHECK ("decision" IN ('ACCEPT', 'CONDITIONAL_ACCEPT', 'REJECT')),
  CONSTRAINT "candidate_interview_score_range"
    CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 100),
  CONSTRAINT "candidate_interview_discount_range"
    CHECK ("discount_pct" BETWEEN 0 AND 100),
  CONSTRAINT "candidate_interview_instalments_range"
    CHECK ("instalment_count" BETWEEN 1 AND 24),
  CONSTRAINT "candidate_interview_conditions_required"
    CHECK ("decision" <> 'CONDITIONAL_ACCEPT' OR char_length(btrim(coalesce("conditions", ''))) > 0),
  CONSTRAINT "candidate_interview_reject_notes_required"
    CHECK ("decision" <> 'REJECT' OR char_length(btrim(coalesce("notes", ''))) > 0)
);

CREATE INDEX "candidate_interview_decisions_tenant_decision_decided_idx"
  ON "candidate_interview_decisions" ("tenant_id", "decision", "decided_at");

-- Committee decisions are historical decisions, not editable candidate fields.
CREATE OR REPLACE FUNCTION protect_candidate_interview_decision()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD."finalized_at" IS NULL
     AND NEW."finalized_at" IS NOT NULL
     AND ROW(OLD."tenant_id", OLD."candidate_id", OLD."decision", OLD."score",
             OLD."notes", OLD."conditions", OLD."discount_pct",
             OLD."instalment_count", OLD."decided_by_id", OLD."decided_at")
         IS NOT DISTINCT FROM
         ROW(NEW."tenant_id", NEW."candidate_id", NEW."decision", NEW."score",
             NEW."notes", NEW."conditions", NEW."discount_pct",
             NEW."instalment_count", NEW."decided_by_id", NEW."decided_at") THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'candidate interview decisions are immutable';
END;
$$;

CREATE TRIGGER candidate_interview_decision_immutable
BEFORE UPDATE OR DELETE ON "candidate_interview_decisions"
FOR EACH ROW EXECUTE FUNCTION protect_candidate_interview_decision();

ALTER TABLE "candidate_interview_decisions" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "candidate_interview_decisions"
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY portal_denied ON "candidate_interview_decisions" AS RESTRICTIVE
  USING (current_portal_student_id() IS NULL)
  WITH CHECK (current_portal_student_id() IS NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uniflow_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "candidate_interview_decisions" TO uniflow_app;
  END IF;
END $$;
