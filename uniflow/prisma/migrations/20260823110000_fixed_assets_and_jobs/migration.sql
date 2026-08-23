-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateEnum
CREATE TYPE "DepreciationMethod" AS ENUM ('STRAIGHT_LINE', 'REDUCING_BALANCE', 'NONE');

-- CreateEnum
CREATE TYPE "AssetStatus" AS ENUM ('IN_SERVICE', 'DISPOSED', 'WRITTEN_OFF');

-- AlterEnum
ALTER TYPE "AccountRole" ADD VALUE 'ASSET_DISPOSAL_GAIN_LOSS';

-- CreateTable
CREATE TABLE "job_runs" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "job_type" TEXT NOT NULL,
    "job_key" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'RUNNING',
    "started_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(6),
    "result_json" JSONB,
    "error_text" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "requested_by_id" UUID NOT NULL,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "asset_account_id" UUID NOT NULL,
    "accumulated_account_id" UUID NOT NULL,
    "expense_account_id" UUID NOT NULL,
    "default_method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "default_useful_life_months" INTEGER NOT NULL,
    "default_salvage_rate" DECIMAL(9,6) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_assets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asset_code" TEXT NOT NULL,
    "barcode" TEXT,
    "serial_no" TEXT,
    "category_id" UUID NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "purchase_date" DATE NOT NULL,
    "in_service_date" DATE NOT NULL,
    "purchase_cost" DECIMAL(19,4) NOT NULL,
    "salvage_value" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "method" "DepreciationMethod" NOT NULL DEFAULT 'STRAIGHT_LINE',
    "useful_life_months" INTEGER NOT NULL,
    "cost_center_id" UUID,
    "location" TEXT,
    "custodian_id" UUID,
    "status" "AssetStatus" NOT NULL DEFAULT 'IN_SERVICE',
    "capitalisation_header_id" UUID NOT NULL,
    "disposed_on" DATE,
    "disposal_proceeds" DECIMAL(19,4),
    "disposal_reason" TEXT,
    "disposal_header_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fixed_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "depreciation_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "fiscal_period_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "posted_at" TIMESTAMPTZ(6),
    "posted_header_id" UUID,

    CONSTRAINT "depreciation_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "from_location" TEXT,
    "to_location" TEXT,
    "from_custodian_id" UUID,
    "to_custodian_id" UUID,
    "moved_on" DATE NOT NULL,
    "reason" TEXT,
    "actor_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_movements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_runs_tenant_id_job_type_started_at_idx" ON "job_runs"("tenant_id", "job_type", "started_at");

-- CreateIndex
CREATE UNIQUE INDEX "job_runs_tenant_id_job_key_key" ON "job_runs"("tenant_id", "job_key");

-- CreateIndex
CREATE UNIQUE INDEX "asset_categories_tenant_id_code_key" ON "asset_categories"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_disposal_header_id_key" ON "fixed_assets"("disposal_header_id");

-- CreateIndex
CREATE INDEX "fixed_assets_tenant_id_status_category_id_idx" ON "fixed_assets"("tenant_id", "status", "category_id");

-- CreateIndex
CREATE INDEX "fixed_assets_tenant_id_custodian_id_idx" ON "fixed_assets"("tenant_id", "custodian_id");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_assets_tenant_id_asset_code_key" ON "fixed_assets"("tenant_id", "asset_code");

-- CreateIndex
CREATE INDEX "depreciation_entries_tenant_id_fiscal_period_id_posted_at_idx" ON "depreciation_entries"("tenant_id", "fiscal_period_id", "posted_at");

-- CreateIndex
CREATE UNIQUE INDEX "depreciation_entries_asset_id_fiscal_period_id_key" ON "depreciation_entries"("asset_id", "fiscal_period_id");

-- CreateIndex
CREATE INDEX "asset_movements_asset_id_occurred_at_idx" ON "asset_movements"("asset_id", "occurred_at");

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_asset_account_id_fkey" FOREIGN KEY ("asset_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_accumulated_account_id_fkey" FOREIGN KEY ("accumulated_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_categories" ADD CONSTRAINT "asset_categories_expense_account_id_fkey" FOREIGN KEY ("expense_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_custodian_id_fkey" FOREIGN KEY ("custodian_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_capitalisation_header_id_fkey" FOREIGN KEY ("capitalisation_header_id") REFERENCES "transaction_headers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_assets" ADD CONSTRAINT "fixed_assets_disposal_header_id_fkey" FOREIGN KEY ("disposal_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "depreciation_entries" ADD CONSTRAINT "depreciation_entries_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_movements" ADD CONSTRAINT "asset_movements_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "fixed_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- Fixed asset and job-run invariants (SRS Module 9, Track A5).
--
-- The legacy "fixed asset register" was a row in the chart of accounts: `Acc`
-- with `Acc1 = 'Fixed Assets'` and a `DeprPerc` column. No purchase date, no
-- in-service date, no salvage value, no useful life, no serial number, no
-- custodian, no location, and no accumulated-depreciation account -- so net
-- book value was not derivable from anything the system held.
--
-- Its depreciation run read `SELECT ISNULL(MAX(MoveNo),0) FROM Transactions`
-- with no filter at all (the other call sites at least filtered by year),
-- posted two lines against the hardcoded English strings 'Fixed Assets' and
-- 'Depreciation Expenses' into a database whose account tree is in Arabic, and
-- had nothing whatsoever to stop a second click posting the whole batch again.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Job runs.
--
--    The unique key on (tenant, job_key) is the whole idempotency mechanism:
--    a repeat invocation collides and replays instead of doing the work twice.
-- ---------------------------------------------------------------------------
ALTER TABLE job_runs
  ADD CONSTRAINT chk_job_finished_state CHECK (
    (status = 'RUNNING' AND finished_at IS NULL)
    OR (status = 'SUCCEEDED' AND finished_at IS NOT NULL AND result_json IS NOT NULL)
    OR (status = 'FAILED' AND finished_at IS NOT NULL)
  );

ALTER TABLE job_runs
  ADD CONSTRAINT chk_job_attempts_positive CHECK (attempts >= 1);

-- A run that succeeded is history. Re-running the batch means a new job key,
-- not editing the record of the last one.
CREATE OR REPLACE FUNCTION assert_job_run_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'job runs are the record that a batch happened and cannot be deleted'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status = 'SUCCEEDED' THEN
    RAISE EXCEPTION 'job % already succeeded; its record is final', OLD.job_key
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.tenant_id, NEW.job_key, NEW.job_type) IS DISTINCT FROM
     (OLD.tenant_id, OLD.job_key, OLD.job_type) THEN
    RAISE EXCEPTION 'job %: identity is fixed', OLD.job_key
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_job_run_progress
  BEFORE UPDATE OR DELETE ON job_runs
  FOR EACH ROW EXECUTE FUNCTION assert_job_run_progress();


-- ---------------------------------------------------------------------------
-- 2. Asset categories and assets.
-- ---------------------------------------------------------------------------
ALTER TABLE asset_categories
  ADD CONSTRAINT chk_category_life_positive CHECK (default_useful_life_months > 0);

ALTER TABLE asset_categories
  ADD CONSTRAINT chk_category_salvage_rate CHECK (
    default_salvage_rate >= 0 AND default_salvage_rate < 1
  );

ALTER TABLE fixed_assets
  ADD CONSTRAINT chk_asset_amounts CHECK (
    purchase_cost > 0
    AND salvage_value >= 0
    AND salvage_value < purchase_cost
  );

-- Depreciation starts when the asset starts being used, and an asset cannot
-- be in service before it was bought.
ALTER TABLE fixed_assets
  ADD CONSTRAINT chk_asset_in_service_after_purchase CHECK (
    in_service_date >= purchase_date
  );

ALTER TABLE fixed_assets
  ADD CONSTRAINT chk_asset_life_positive CHECK (
    (method = 'NONE' AND useful_life_months >= 0)
    OR (method <> 'NONE' AND useful_life_months > 0)
  );

-- A disposal is recorded as a whole or not at all.
ALTER TABLE fixed_assets
  ADD CONSTRAINT chk_asset_disposal_complete CHECK (
    (status = 'IN_SERVICE'
     AND disposed_on IS NULL AND disposal_header_id IS NULL AND disposal_proceeds IS NULL)
    OR (status IN ('DISPOSED', 'WRITTEN_OFF')
        AND disposed_on IS NOT NULL AND disposal_header_id IS NOT NULL
        AND disposal_proceeds IS NOT NULL AND disposal_proceeds >= 0
        AND disposal_reason IS NOT NULL AND btrim(disposal_reason) <> '')
  );

ALTER TABLE depreciation_entries
  ADD CONSTRAINT chk_depreciation_amount_positive CHECK (amount > 0);

ALTER TABLE depreciation_entries
  ADD CONSTRAINT chk_depreciation_posted_together CHECK (
    (posted_at IS NULL AND posted_header_id IS NULL)
    OR (posted_at IS NOT NULL AND posted_header_id IS NOT NULL)
  );


-- ---------------------------------------------------------------------------
-- 3. Cost, and the schedule that consumes it, are history once posted.
--
--    Editing the cost of a capitalised asset would silently restate every
--    depreciation charge already taken against it. Correction is by disposal
--    and re-capitalisation, which leaves a trail.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_asset_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'asset % cannot be deleted: dispose of it, so the register keeps the history',
      OLD.asset_code
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.tenant_id, NEW.asset_code, NEW.category_id, NEW.purchase_cost,
      NEW.salvage_value, NEW.currency, NEW.purchase_date, NEW.in_service_date,
      NEW.method, NEW.useful_life_months, NEW.capitalisation_header_id)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.asset_code, OLD.category_id, OLD.purchase_cost,
      OLD.salvage_value, OLD.currency, OLD.purchase_date, OLD.in_service_date,
      OLD.method, OLD.useful_life_months, OLD.capitalisation_header_id)
  THEN
    RAISE EXCEPTION 'asset %: cost, dates and depreciation basis are fixed once capitalised — every charge already taken depends on them',
      OLD.asset_code
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status <> 'IN_SERVICE' AND NEW.status <> OLD.status THEN
    RAISE EXCEPTION 'asset % is % and cannot be disposed of again', OLD.asset_code, OLD.status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_asset_immutable
  BEFORE UPDATE OR DELETE ON fixed_assets
  FOR EACH ROW EXECUTE FUNCTION assert_asset_immutable();

-- A posted schedule row is a posted journal entry. It does not move, and it
-- does not get deleted when a disposal cancels the rest of the schedule.
CREATE OR REPLACE FUNCTION assert_depreciation_entry_sane()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.posted_at IS NOT NULL THEN
      RAISE EXCEPTION 'a posted depreciation charge cannot be deleted'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.posted_at IS NOT NULL THEN
    RAISE EXCEPTION 'depreciation for this period has already been posted'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.asset_id, NEW.fiscal_period_id) IS DISTINCT FROM (OLD.asset_id, OLD.fiscal_period_id) THEN
    RAISE EXCEPTION 'a depreciation entry belongs to one asset and one period'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_depreciation_entry_sane
  BEFORE UPDATE OR DELETE ON depreciation_entries
  FOR EACH ROW EXECUTE FUNCTION assert_depreciation_entry_sane();


-- ---------------------------------------------------------------------------
-- 4. Movement history is append-only. "Where was it in March" is the question
--    a physical count asks, and an editable answer is no answer.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_asset_movement_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'asset movement history is append-only'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_asset_movements_append_only
  BEFORE UPDATE OR DELETE ON asset_movements
  FOR EACH ROW EXECUTE FUNCTION assert_asset_movement_append_only();


-- ---------------------------------------------------------------------------
-- 5. Cross-tenant references.
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_asset_category_same_tenant
  BEFORE INSERT OR UPDATE ON asset_categories
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'asset_account_id', 'chart_of_accounts',
    'accumulated_account_id', 'chart_of_accounts',
    'expense_account_id', 'chart_of_accounts');

CREATE TRIGGER trg_asset_same_tenant
  BEFORE INSERT OR UPDATE ON fixed_assets
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'category_id', 'asset_categories',
    'cost_center_id', 'cost_centers',
    'capitalisation_header_id', 'transaction_headers',
    'disposal_header_id', 'transaction_headers');

CREATE TRIGGER trg_depreciation_same_tenant
  BEFORE INSERT OR UPDATE ON depreciation_entries
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'asset_id', 'fixed_assets',
    'posted_header_id', 'transaction_headers');

CREATE TRIGGER trg_asset_movement_same_tenant
  BEFORE INSERT OR UPDATE ON asset_movements
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('asset_id', 'fixed_assets');


-- ---------------------------------------------------------------------------
-- 6. Row-level security and grants.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'job_runs', 'asset_categories', 'fixed_assets', 'depreciation_entries',
    'asset_movements'
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
