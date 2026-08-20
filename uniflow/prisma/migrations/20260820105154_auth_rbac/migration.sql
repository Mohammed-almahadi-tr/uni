-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failed_login_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "last_login_at" TIMESTAMPTZ(6),
ADD COLUMN     "locked_until" TIMESTAMPTZ(6),
ADD COLUMN     "mfa_enrolled_at" TIMESTAMPTZ(6),
ADD COLUMN     "mfa_last_step" BIGINT,
ADD COLUMN     "session_version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "recovery_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "code_hash" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(6),

    CONSTRAINT "recovery_codes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recovery_codes_user_id_idx" ON "recovery_codes"("user_id");

-- AddForeignKey
ALTER TABLE "recovery_codes" ADD CONSTRAINT "recovery_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "uq_account_period_balance" RENAME TO "account_period_balances_tenant_id_account_id_cost_center_id_key";

-- ===========================================================================
-- RLS for recovery_codes.
--
-- Reached only through its user, like user_roles. A recovery code bypasses
-- the second factor, so cross-tenant visibility here would be worse than on
-- most tables, not better.
-- ===========================================================================
ALTER TABLE recovery_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON recovery_codes
  USING (EXISTS (SELECT 1 FROM users u
                  WHERE u.id = recovery_codes.user_id
                    AND u.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM users u
                       WHERE u.id = recovery_codes.user_id
                         AND u.tenant_id = current_tenant_id()));

-- The app role needs the new tables; ALTER DEFAULT PRIVILEGES only covers
-- tables created *after* it was set, and bootstrap-role.mjs is re-run on
-- deploy, but granting here keeps a fresh database correct without it.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uniflow_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON recovery_codes TO uniflow_app;
  END IF;
END
$$;
