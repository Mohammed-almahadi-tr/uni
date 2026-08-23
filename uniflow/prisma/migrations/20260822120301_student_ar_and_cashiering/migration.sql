-- CreateEnum
CREATE TYPE "AccountRole" AS ENUM ('STUDENT_AR_CONTROL', 'STUDENT_CREDIT_CONTROL', 'SPONSOR_AR_CONTROL', 'VENDOR_AP_CONTROL', 'DEFAULT_CASH', 'DEFAULT_BANK', 'CHEQUES_RECEIVABLE', 'DEFAULT_DISCOUNT_EXPENSE', 'FX_REALISED', 'FX_UNREALISED', 'RETAINED_SURPLUS');

-- CreateEnum
CREATE TYPE "FeeRecurrence" AS ENUM ('PER_TERM', 'PER_YEAR', 'ONE_OFF');

-- CreateEnum
CREATE TYPE "PaymentChannel" AS ENUM ('CASH', 'BANK_TRANSFER', 'CHEQUE', 'GATEWAY', 'CREDIT_BALANCE');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('APPLICANT', 'ADMITTED', 'ACTIVE', 'DEFERRED', 'SUSPENDED', 'WITHDRAWN', 'DISMISSED', 'TRANSFERRED_OUT', 'GRADUATED', 'ALUMNUS');

-- AlterEnum
ALTER TYPE "VoucherType" ADD VALUE 'STUDENT_CHARGE';

-- CreateTable
CREATE TABLE "account_mappings" (
    "tenant_id" UUID NOT NULL,
    "role" "AccountRole" NOT NULL,
    "account_id" UUID NOT NULL,

    CONSTRAINT "account_mappings_pkey" PRIMARY KEY ("tenant_id","role")
);

-- CreateTable
CREATE TABLE "cashier_tills" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "cash_account_id" UUID NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cashier_tills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_items" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "revenue_account_id" UUID NOT NULL,
    "unearned_account_id" UUID,
    "cost_center_id" UUID,
    "is_deferrable" BOOLEAN NOT NULL DEFAULT false,
    "is_discountable" BOOLEAN NOT NULL DEFAULT true,
    "is_refundable" BOOLEAN NOT NULL DEFAULT true,
    "is_taxable" BOOLEAN NOT NULL DEFAULT false,
    "recurrence" "FeeRecurrence" NOT NULL DEFAULT 'PER_TERM',
    "default_amount" DECIMAL(19,4),
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "fee_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_no" TEXT NOT NULL,
    "full_name_ar" TEXT NOT NULL,
    "full_name_en" TEXT NOT NULL,
    "search_key" TEXT NOT NULL,
    "national_id" TEXT,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
    "admitted_on" DATE,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_charges" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "fee_item_id" UUID NOT NULL,
    "term_label" TEXT,
    "doc_date" DATE NOT NULL,
    "due_date" DATE,
    "gross_amount" DECIMAL(19,4) NOT NULL,
    "discount_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(19,4) NOT NULL,
    "settled_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "is_deferred" BOOLEAN NOT NULL DEFAULT false,
    "recognised_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "posted_header_id" UUID NOT NULL,
    "reversed_at" TIMESTAMPTZ(6),
    "reversal_header_id" UUID,
    "reversal_reason" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_charges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_receipts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "receipt_no" TEXT NOT NULL,
    "doc_date" DATE NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "debit_account_id" UUID NOT NULL,
    "reference" TEXT,
    "cheque_no" TEXT,
    "cheque_bank" TEXT,
    "cheque_branch" TEXT,
    "cheque_due_date" DATE,
    "drawer_name" TEXT,
    "allocated_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "posted_header_id" UUID NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_by_id" UUID,
    "cancellation_reason" TEXT,
    "cancellation_header_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "receipt_allocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipt_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recognition_entries" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "fiscal_period_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "recognised_at" TIMESTAMPTZ(6),
    "posted_header_id" UUID,

    CONSTRAINT "recognition_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instalment_plans" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "term_label" TEXT,
    "total_amount" DECIMAL(19,4) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instalment_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instalments" (
    "id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "due_date" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "instalments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cashier_tills_user_id_key" ON "cashier_tills"("user_id");

-- CreateIndex
CREATE INDEX "cashier_tills_tenant_id_idx" ON "cashier_tills"("tenant_id");

-- CreateIndex
CREATE INDEX "fee_items_tenant_id_is_active_sort_order_idx" ON "fee_items"("tenant_id", "is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "fee_items_tenant_id_code_key" ON "fee_items"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "students_tenant_id_search_key_idx" ON "students"("tenant_id", "search_key");

-- CreateIndex
CREATE INDEX "students_tenant_id_status_idx" ON "students"("tenant_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "students_tenant_id_student_no_key" ON "students"("tenant_id", "student_no");

-- CreateIndex
CREATE INDEX "student_charges_tenant_id_student_id_reversed_at_idx" ON "student_charges"("tenant_id", "student_id", "reversed_at");

-- CreateIndex
CREATE INDEX "student_charges_tenant_id_due_date_idx" ON "student_charges"("tenant_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "student_receipts_posted_header_id_key" ON "student_receipts"("posted_header_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_receipts_cancellation_header_id_key" ON "student_receipts"("cancellation_header_id");

-- CreateIndex
CREATE INDEX "student_receipts_tenant_id_student_id_idx" ON "student_receipts"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "student_receipts_tenant_id_doc_date_created_by_id_idx" ON "student_receipts"("tenant_id", "doc_date", "created_by_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_receipts_tenant_id_receipt_no_key" ON "student_receipts"("tenant_id", "receipt_no");

-- CreateIndex
CREATE INDEX "receipt_allocations_charge_id_idx" ON "receipt_allocations"("charge_id");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_allocations_receipt_id_charge_id_key" ON "receipt_allocations"("receipt_id", "charge_id");

-- CreateIndex
CREATE INDEX "recognition_entries_tenant_id_fiscal_period_id_recognised_a_idx" ON "recognition_entries"("tenant_id", "fiscal_period_id", "recognised_at");

-- CreateIndex
CREATE UNIQUE INDEX "recognition_entries_charge_id_fiscal_period_id_key" ON "recognition_entries"("charge_id", "fiscal_period_id");

-- CreateIndex
CREATE INDEX "instalment_plans_tenant_id_student_id_idx" ON "instalment_plans"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "instalments_due_date_idx" ON "instalments"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "instalments_plan_id_seq_key" ON "instalments"("plan_id", "seq");

-- AddForeignKey
ALTER TABLE "account_mappings" ADD CONSTRAINT "account_mappings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_mappings" ADD CONSTRAINT "account_mappings_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_tills" ADD CONSTRAINT "cashier_tills_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_tills" ADD CONSTRAINT "cashier_tills_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashier_tills" ADD CONSTRAINT "cashier_tills_cash_account_id_fkey" FOREIGN KEY ("cash_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_revenue_account_id_fkey" FOREIGN KEY ("revenue_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_unearned_account_id_fkey" FOREIGN KEY ("unearned_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_items" ADD CONSTRAINT "fee_items_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_fee_item_id_fkey" FOREIGN KEY ("fee_item_id") REFERENCES "fee_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_reversal_header_id_fkey" FOREIGN KEY ("reversal_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_debit_account_id_fkey" FOREIGN KEY ("debit_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_cancellation_header_id_fkey" FOREIGN KEY ("cancellation_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "student_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "receipt_allocations" ADD CONSTRAINT "receipt_allocations_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "student_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recognition_entries" ADD CONSTRAINT "recognition_entries_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recognition_entries" ADD CONSTRAINT "recognition_entries_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "student_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recognition_entries" ADD CONSTRAINT "recognition_entries_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recognition_entries" ADD CONSTRAINT "recognition_entries_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalment_plans" ADD CONSTRAINT "instalment_plans_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalment_plans" ADD CONSTRAINT "instalment_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalment_plans" ADD CONSTRAINT "instalment_plans_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "instalments" ADD CONSTRAINT "instalments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "instalment_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- Student sub-ledger and cashiering invariants (SRS Modules 6 and 13,
-- Track A3).
--
-- The legacy system had no student control account. Its student balances were
-- a `Remain` column on the registration row, maintained by whichever screen
-- happened to touch it, and there was nothing in the database able to notice
-- when they stopped agreeing with the ledger. The constraints below are what
-- make "the sub-ledger equals the control account" a fact rather than a hope.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Fee items.
--
--    A deferrable item that does not say where the unearned balance sits
--    cannot be billed at all, so it may not exist.
-- ---------------------------------------------------------------------------
ALTER TABLE fee_items
  ADD CONSTRAINT chk_fee_deferrable_has_unearned CHECK (
    NOT is_deferrable OR unearned_account_id IS NOT NULL
  );

ALTER TABLE fee_items
  ADD CONSTRAINT chk_fee_default_amount_nonneg CHECK (
    default_amount IS NULL OR default_amount >= 0
  );


-- ---------------------------------------------------------------------------
-- 2. Charges.
--
--    net = gross − discount is arithmetic, not policy, so it belongs here.
--    Settlement can never exceed what is owed: an over-allocated charge is how
--    a sub-ledger silently starts reporting a credit that the ledger does not
--    have.
-- ---------------------------------------------------------------------------
ALTER TABLE student_charges
  ADD CONSTRAINT chk_charge_amounts CHECK (
    gross_amount >= 0
    AND discount_amount >= 0
    AND discount_amount <= gross_amount
    AND net_amount = gross_amount - discount_amount
    AND settled_amount >= 0
    AND settled_amount <= net_amount
    AND recognised_amount >= 0
    AND recognised_amount <= gross_amount
  );

-- A reversal is stamped as a whole or not at all.
ALTER TABLE student_charges
  ADD CONSTRAINT chk_charge_reversal_complete CHECK (
    (reversed_at IS NULL AND reversal_header_id IS NULL AND reversal_reason IS NULL)
    OR (reversed_at IS NOT NULL AND reversal_header_id IS NOT NULL
        AND reversal_reason IS NOT NULL AND btrim(reversal_reason) <> '')
  );


-- ---------------------------------------------------------------------------
-- 3. Receipts.
--
--    A zero receipt is a receipt for nothing; the legacy cashier screen would
--    happily write one. A cheque with no number and no due date cannot enter
--    the clearing pipeline, so it is refused at the till rather than
--    discovered three weeks later.
-- ---------------------------------------------------------------------------
ALTER TABLE student_receipts
  ADD CONSTRAINT chk_receipt_amount_positive CHECK (amount > 0);

ALTER TABLE student_receipts
  ADD CONSTRAINT chk_receipt_allocated_range CHECK (
    allocated_amount >= 0 AND allocated_amount <= amount
  );

ALTER TABLE student_receipts
  ADD CONSTRAINT chk_receipt_cheque_detail CHECK (
    channel <> 'CHEQUE'
    OR (cheque_no IS NOT NULL AND btrim(cheque_no) <> '' AND cheque_due_date IS NOT NULL)
  );

ALTER TABLE student_receipts
  ADD CONSTRAINT chk_receipt_cancellation_complete CHECK (
    (cancelled_at IS NULL AND cancelled_by_id IS NULL
     AND cancellation_reason IS NULL AND cancellation_header_id IS NULL)
    OR (cancelled_at IS NOT NULL AND cancelled_by_id IS NOT NULL
        AND cancellation_reason IS NOT NULL AND btrim(cancellation_reason) <> ''
        AND cancellation_header_id IS NOT NULL)
  );

ALTER TABLE receipt_allocations
  ADD CONSTRAINT chk_allocation_positive CHECK (amount > 0);

ALTER TABLE instalments
  ADD CONSTRAINT chk_instalment_positive CHECK (amount > 0);

ALTER TABLE instalment_plans
  ADD CONSTRAINT chk_plan_total_positive CHECK (total_amount > 0);

ALTER TABLE recognition_entries
  ADD CONSTRAINT chk_recognition_positive CHECK (amount > 0);

ALTER TABLE recognition_entries
  ADD CONSTRAINT chk_recognition_posted_together CHECK (
    (recognised_at IS NULL AND posted_header_id IS NULL)
    OR (recognised_at IS NOT NULL AND posted_header_id IS NOT NULL)
  );


-- ---------------------------------------------------------------------------
-- 4. One national ID per tenant, when it is known.
--
--    Duplicate-applicant detection (SRS Module 17) starts here. A partial
--    index, because most of an intake has no national ID recorded on day one
--    and NULLs must not collide with each other.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX uq_student_national_id
  ON students (tenant_id, national_id)
  WHERE national_id IS NOT NULL;


-- ---------------------------------------------------------------------------
-- 5. Foreign keys do not carry a tenant, so they can point across one.
--
--    A row inserted with another tenant's account id passes the foreign key
--    check — referential integrity triggers run as the table owner and are not
--    bound by row-level security. The ledger already guards this on posting
--    lines (`assert_line_postable`); every new table that references a
--    tenant-scoped row needs the same guard.
--
--    Written once, driven by trigger arguments: pairs of
--    (column, referenced table).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_ref_same_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  i          int;
  col        text;
  ref_table  text;
  ref_id     uuid;
  ref_tenant uuid;
BEGIN
  i := 0;
  WHILE i < array_length(TG_ARGV, 1) LOOP
    col       := TG_ARGV[i];
    ref_table := TG_ARGV[i + 1];

    EXECUTE format('SELECT ($1).%I', col) INTO ref_id USING NEW;

    IF ref_id IS NOT NULL THEN
      EXECUTE format('SELECT tenant_id FROM %I WHERE id = $1', ref_table)
        INTO ref_tenant USING ref_id;

      -- NULL covers both "no such row" and "invisible under this tenant's
      -- row-level security", and both answers are the same answer.
      IF ref_tenant IS DISTINCT FROM NEW.tenant_id THEN
        RAISE EXCEPTION '%.% points at a % row belonging to a different tenant',
          TG_TABLE_NAME, col, ref_table
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;

    i := i + 2;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mapping_same_tenant
  BEFORE INSERT OR UPDATE ON account_mappings
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('account_id', 'chart_of_accounts');

CREATE TRIGGER trg_till_same_tenant
  BEFORE INSERT OR UPDATE ON cashier_tills
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('cash_account_id', 'chart_of_accounts');

CREATE TRIGGER trg_fee_item_same_tenant
  BEFORE INSERT OR UPDATE ON fee_items
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'revenue_account_id', 'chart_of_accounts',
    'unearned_account_id', 'chart_of_accounts',
    'cost_center_id', 'cost_centers');

CREATE TRIGGER trg_charge_same_tenant
  BEFORE INSERT OR UPDATE ON student_charges
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students',
    'fee_item_id', 'fee_items',
    'posted_header_id', 'transaction_headers',
    'reversal_header_id', 'transaction_headers');

CREATE TRIGGER trg_receipt_same_tenant
  BEFORE INSERT OR UPDATE ON student_receipts
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students',
    'debit_account_id', 'chart_of_accounts',
    'posted_header_id', 'transaction_headers',
    'cancellation_header_id', 'transaction_headers');

CREATE TRIGGER trg_allocation_same_tenant
  BEFORE INSERT OR UPDATE ON receipt_allocations
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'receipt_id', 'student_receipts',
    'charge_id', 'student_charges');

CREATE TRIGGER trg_recognition_same_tenant
  BEFORE INSERT OR UPDATE ON recognition_entries
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'charge_id', 'student_charges',
    'posted_header_id', 'transaction_headers');

CREATE TRIGGER trg_plan_same_tenant
  BEFORE INSERT OR UPDATE ON instalment_plans
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('student_id', 'students');


-- ---------------------------------------------------------------------------
-- 6. THE sub-ledger invariant: the denormalised settlement totals equal the
--    allocations that produced them.
--
--    `settled_amount` and `allocated_amount` exist so that a cashier screen
--    listing forty outstanding charges does not aggregate the allocation table
--    forty times. Denormalised totals are exactly the thing that drifts, and a
--    drifted student balance is what the legacy system shipped. Deferred to
--    commit, because a receipt writes its allocations and its totals in one
--    transaction and is inconsistent in between.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_charge_settlement(p_charge_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  c_settled numeric(19,4);
  a_total   numeric(19,4);
BEGIN
  SELECT settled_amount INTO c_settled FROM student_charges WHERE id = p_charge_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO a_total
    FROM receipt_allocations WHERE charge_id = p_charge_id;

  IF a_total <> c_settled THEN
    RAISE EXCEPTION 'charge % : settled_amount is % but its allocations total %',
      p_charge_id, c_settled, a_total
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assert_receipt_allocation(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r_allocated numeric(19,4);
  a_total     numeric(19,4);
BEGIN
  SELECT allocated_amount INTO r_allocated FROM student_receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO a_total
    FROM receipt_allocations WHERE receipt_id = p_receipt_id;

  IF a_total <> r_allocated THEN
    RAISE EXCEPTION 'receipt % : allocated_amount is % but its allocations total %',
      p_receipt_id, r_allocated, a_total
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_allocation_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_charge_settlement(COALESCE(NEW.charge_id, OLD.charge_id));
  PERFORM assert_receipt_allocation(COALESCE(NEW.receipt_id, OLD.receipt_id));
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_allocation_totals
  AFTER INSERT OR UPDATE OR DELETE ON receipt_allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_allocation_totals();

CREATE OR REPLACE FUNCTION trg_check_charge_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_charge_settlement(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_charge_totals
  AFTER INSERT OR UPDATE OF settled_amount ON student_charges
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_charge_totals();

CREATE OR REPLACE FUNCTION trg_check_receipt_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_receipt_allocation(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_receipt_totals
  AFTER INSERT OR UPDATE OF allocated_amount ON student_receipts
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_receipt_totals();


-- ---------------------------------------------------------------------------
-- 7. What may still change once money has moved.
--
--    A charge's billed amount and a receipt's value are history the moment
--    they post. Settlement figures, recognition progress and the reversal /
--    cancellation stamps move; nothing else does. Correction is by reversal,
--    exactly as for a voucher.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_charge_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'a billed charge cannot be deleted: reverse it instead'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.tenant_id, NEW.student_id, NEW.fee_item_id, NEW.gross_amount,
      NEW.discount_amount, NEW.net_amount, NEW.currency, NEW.doc_date,
      NEW.posted_header_id, NEW.is_deferred, NEW.created_by_id)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.student_id, OLD.fee_item_id, OLD.gross_amount,
      OLD.discount_amount, OLD.net_amount, OLD.currency, OLD.doc_date,
      OLD.posted_header_id, OLD.is_deferred, OLD.created_by_id)
  THEN
    RAISE EXCEPTION 'charge % is posted and its billed amount cannot be edited: reverse it instead',
      OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.reversed_at IS NOT NULL
     AND (NEW.reversed_at, NEW.reversal_header_id) IS DISTINCT FROM
         (OLD.reversed_at, OLD.reversal_header_id) THEN
    RAISE EXCEPTION 'charge % has already been reversed', OLD.id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_charge_immutable
  BEFORE UPDATE OR DELETE ON student_charges
  FOR EACH ROW EXECUTE FUNCTION assert_charge_immutable();

CREATE OR REPLACE FUNCTION assert_receipt_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'receipt % cannot be deleted: cancel it, so the number stays on the record',
      OLD.receipt_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.tenant_id, NEW.student_id, NEW.receipt_no, NEW.doc_date, NEW.channel,
      NEW.amount, NEW.currency, NEW.debit_account_id, NEW.posted_header_id,
      NEW.created_by_id)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.student_id, OLD.receipt_no, OLD.doc_date, OLD.channel,
      OLD.amount, OLD.currency, OLD.debit_account_id, OLD.posted_header_id,
      OLD.created_by_id)
  THEN
    RAISE EXCEPTION 'receipt % is issued and cannot be edited: cancel it and take a new one',
      OLD.receipt_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.cancelled_at IS NOT NULL
     AND (NEW.cancelled_at, NEW.cancellation_header_id) IS DISTINCT FROM
         (OLD.cancelled_at, OLD.cancellation_header_id) THEN
    RAISE EXCEPTION 'receipt % has already been cancelled', OLD.receipt_no
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_receipt_immutable
  BEFORE UPDATE OR DELETE ON student_receipts
  FOR EACH ROW EXECUTE FUNCTION assert_receipt_immutable();


-- ---------------------------------------------------------------------------
-- 8. Allocations follow the state of both ends.
--
--    Money from a cancelled receipt has left the building; it cannot go on
--    paying charges. A reversed charge is no longer owed, so nothing can be
--    allocated to it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_allocation_live()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  r_cancelled timestamptz;
  r_no        text;
  c_reversed  timestamptz;
  rec         record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := OLD;
  ELSE
    rec := NEW;
  END IF;

  SELECT cancelled_at, receipt_no INTO r_cancelled, r_no
    FROM student_receipts WHERE id = rec.receipt_id;
  IF r_cancelled IS NOT NULL THEN
    RAISE EXCEPTION 'receipt % is cancelled; its allocations are part of the record and cannot change',
      r_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP <> 'DELETE' THEN
    SELECT reversed_at INTO c_reversed FROM student_charges WHERE id = rec.charge_id;
    IF c_reversed IS NOT NULL THEN
      RAISE EXCEPTION 'charge % has been reversed and is no longer owed; nothing can be allocated to it',
        rec.charge_id
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN rec;
END;
$$;

CREATE TRIGGER trg_allocation_live
  BEFORE INSERT OR UPDATE OR DELETE ON receipt_allocations
  FOR EACH ROW EXECUTE FUNCTION assert_allocation_live();


-- ---------------------------------------------------------------------------
-- 9. Row-level security for the new tables, plus grants for the app role.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'account_mappings', 'cashier_tills', 'fee_items', 'students',
    'student_charges', 'student_receipts', 'receipt_allocations',
    'recognition_entries', 'instalment_plans'
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

-- Reached only through its plan, like fiscal_periods through fiscal_years.
ALTER TABLE instalments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON instalments
  USING (EXISTS (SELECT 1 FROM instalment_plans p
                  WHERE p.id = instalments.plan_id
                    AND p.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM instalment_plans p
                       WHERE p.id = instalments.plan_id
                         AND p.tenant_id = current_tenant_id()));

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uniflow_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON instalments TO uniflow_app;
  END IF;
END
$$;
