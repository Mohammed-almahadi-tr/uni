-- A candidate-profile code is deliberately separate from portal invitations:
-- it gives no login, no student access and expires after use.
CREATE TABLE "candidate_invitations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "candidate_id" UUID NOT NULL REFERENCES "ministry_candidates"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "accepted_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  CONSTRAINT "candidate_invitation_expiry_after_issue" CHECK ("expires_at" > "issued_at")
);

CREATE UNIQUE INDEX "candidate_invitation_live_candidate_key"
  ON "candidate_invitations" ("candidate_id")
  WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
CREATE INDEX "candidate_invitations_tenant_candidate_idx"
  ON "candidate_invitations" ("tenant_id", "candidate_id");

ALTER TABLE "candidate_invitations" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON "candidate_invitations"
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());
CREATE POLICY portal_denied ON "candidate_invitations" AS RESTRICTIVE
  USING (current_portal_student_id() IS NULL)
  WITH CHECK (current_portal_student_id() IS NULL);
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uniflow_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON "candidate_invitations" TO uniflow_app;
  END IF;
END $$;
