-- CreateEnum
CREATE TYPE "SponsorType" AS ENUM ('GOVERNMENT_MINISTRY', 'EMBASSY', 'CORPORATE', 'FOUNDATION', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "SponsorBillingCycle" AS ENUM ('PER_TERM', 'PER_YEAR', 'MONTHLY');

-- CreateEnum
CREATE TYPE "SponsorshipStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ENDED');

-- CreateEnum
CREATE TYPE "SponsorInvoiceStatus" AS ENUM ('ISSUED', 'PARTIALLY_SETTLED', 'SETTLED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ScholarshipAwardStatus" AS ENUM ('PROPOSED', 'APPROVED', 'REJECTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "semester_registrations" ADD COLUMN     "discount_scheme_id" UUID;

-- AlterTable
ALTER TABLE "student_charges" ADD COLUMN     "sponsored_amount" DECIMAL(19,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "sponsors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sponsor_type" "SponsorType" NOT NULL,
    "contact_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "billing_address" TEXT,
    "billing_cycle" "SponsorBillingCycle" NOT NULL DEFAULT 'PER_TERM',
    "payment_term_days" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorships" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sponsor_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "reference" TEXT,
    "valid_from" DATE NOT NULL,
    "valid_to" DATE,
    "cap_amount" DECIMAL(19,4),
    "consumed_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" "SponsorshipStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "ended_at" TIMESTAMPTZ(6),
    "ended_reason" TEXT,

    CONSTRAINT "sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsorship_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sponsorship_id" UUID NOT NULL,
    "fee_item_id" UUID,
    "coverage_pct" DECIMAL(7,4) NOT NULL,
    "cap_amount" DECIMAL(19,4),

    CONSTRAINT "sponsorship_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge_sponsorships" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "charge_id" UUID NOT NULL,
    "sponsorship_id" UUID NOT NULL,
    "sponsor_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "settled_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "written_back_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "invoice_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "charge_sponsorships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_invoices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sponsor_id" UUID NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "period_from" DATE NOT NULL,
    "period_to" DATE NOT NULL,
    "doc_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "total_amount" DECIMAL(19,4) NOT NULL,
    "settled_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" "SponsorInvoiceStatus" NOT NULL DEFAULT 'ISSUED',
    "cancelled_at" TIMESTAMPTZ(6),
    "cancelled_reason" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_receipts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "sponsor_id" UUID NOT NULL,
    "receipt_no" TEXT NOT NULL,
    "doc_date" DATE NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "allocated_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "posted_header_id" UUID NOT NULL,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "reversal_header_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sponsor_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sponsor_receipt_allocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "receipt_id" UUID NOT NULL,
    "charge_sponsorship_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "sponsor_receipt_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_schemes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "academic_year_id" UUID,
    "budget_cap" DECIMAL(19,4),
    "awarded_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "eligibility_note" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scholarship_schemes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scholarship_awards" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "scheme_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "academic_year_id" UUID,
    "amount" DECIMAL(19,4) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ScholarshipAwardStatus" NOT NULL DEFAULT 'PROPOSED',
    "proposed_by_id" UUID NOT NULL,
    "proposed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_note" TEXT,

    CONSTRAINT "scholarship_awards_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sponsors_tenant_id_is_active_idx" ON "sponsors"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "sponsors_tenant_id_code_key" ON "sponsors"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "sponsorships_tenant_id_student_id_status_idx" ON "sponsorships"("tenant_id", "student_id", "status");

-- CreateIndex
CREATE INDEX "sponsorships_tenant_id_sponsor_id_status_idx" ON "sponsorships"("tenant_id", "sponsor_id", "status");

-- CreateIndex
CREATE INDEX "sponsorship_lines_tenant_id_fee_item_id_idx" ON "sponsorship_lines"("tenant_id", "fee_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "sponsorship_lines_sponsorship_id_fee_item_id_key" ON "sponsorship_lines"("sponsorship_id", "fee_item_id");

-- CreateIndex
CREATE INDEX "charge_sponsorships_tenant_id_sponsor_id_settled_amount_idx" ON "charge_sponsorships"("tenant_id", "sponsor_id", "settled_amount");

-- CreateIndex
CREATE INDEX "charge_sponsorships_tenant_id_invoice_id_idx" ON "charge_sponsorships"("tenant_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "charge_sponsorships_charge_id_sponsorship_id_key" ON "charge_sponsorships"("charge_id", "sponsorship_id");

-- CreateIndex
CREATE INDEX "sponsor_invoices_tenant_id_sponsor_id_status_idx" ON "sponsor_invoices"("tenant_id", "sponsor_id", "status");

-- CreateIndex
CREATE INDEX "sponsor_invoices_tenant_id_due_date_idx" ON "sponsor_invoices"("tenant_id", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "sponsor_invoices_tenant_id_invoice_no_key" ON "sponsor_invoices"("tenant_id", "invoice_no");

-- CreateIndex
CREATE INDEX "sponsor_receipts_tenant_id_sponsor_id_doc_date_idx" ON "sponsor_receipts"("tenant_id", "sponsor_id", "doc_date");

-- CreateIndex
CREATE UNIQUE INDEX "sponsor_receipts_tenant_id_receipt_no_key" ON "sponsor_receipts"("tenant_id", "receipt_no");

-- CreateIndex
CREATE INDEX "sponsor_receipt_allocations_tenant_id_charge_sponsorship_id_idx" ON "sponsor_receipt_allocations"("tenant_id", "charge_sponsorship_id");

-- CreateIndex
CREATE UNIQUE INDEX "sponsor_receipt_allocations_receipt_id_charge_sponsorship_i_key" ON "sponsor_receipt_allocations"("receipt_id", "charge_sponsorship_id");

-- CreateIndex
CREATE INDEX "scholarship_schemes_tenant_id_is_active_idx" ON "scholarship_schemes"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "scholarship_schemes_tenant_id_code_key" ON "scholarship_schemes"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "scholarship_awards_tenant_id_scheme_id_status_idx" ON "scholarship_awards"("tenant_id", "scheme_id", "status");

-- CreateIndex
CREATE INDEX "scholarship_awards_tenant_id_student_id_status_idx" ON "scholarship_awards"("tenant_id", "student_id", "status");

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_discount_scheme_id_fkey" FOREIGN KEY ("discount_scheme_id") REFERENCES "scholarship_schemes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsors" ADD CONSTRAINT "sponsors_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorships" ADD CONSTRAINT "sponsorships_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_lines" ADD CONSTRAINT "sponsorship_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_lines" ADD CONSTRAINT "sponsorship_lines_sponsorship_id_fkey" FOREIGN KEY ("sponsorship_id") REFERENCES "sponsorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsorship_lines" ADD CONSTRAINT "sponsorship_lines_fee_item_id_fkey" FOREIGN KEY ("fee_item_id") REFERENCES "fee_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_sponsorships" ADD CONSTRAINT "charge_sponsorships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_sponsorships" ADD CONSTRAINT "charge_sponsorships_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "student_charges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_sponsorships" ADD CONSTRAINT "charge_sponsorships_sponsorship_id_fkey" FOREIGN KEY ("sponsorship_id") REFERENCES "sponsorships"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_sponsorships" ADD CONSTRAINT "charge_sponsorships_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge_sponsorships" ADD CONSTRAINT "charge_sponsorships_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "sponsor_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_invoices" ADD CONSTRAINT "sponsor_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_invoices" ADD CONSTRAINT "sponsor_invoices_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_invoices" ADD CONSTRAINT "sponsor_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_receipts" ADD CONSTRAINT "sponsor_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_receipts" ADD CONSTRAINT "sponsor_receipts_sponsor_id_fkey" FOREIGN KEY ("sponsor_id") REFERENCES "sponsors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_receipts" ADD CONSTRAINT "sponsor_receipts_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_receipts" ADD CONSTRAINT "sponsor_receipts_reversal_header_id_fkey" FOREIGN KEY ("reversal_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_receipts" ADD CONSTRAINT "sponsor_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_receipt_allocations" ADD CONSTRAINT "sponsor_receipt_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_receipt_allocations" ADD CONSTRAINT "sponsor_receipt_allocations_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "sponsor_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sponsor_receipt_allocations" ADD CONSTRAINT "sponsor_receipt_allocations_charge_sponsorship_id_fkey" FOREIGN KEY ("charge_sponsorship_id") REFERENCES "charge_sponsorships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_schemes" ADD CONSTRAINT "scholarship_schemes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_schemes" ADD CONSTRAINT "scholarship_schemes_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_schemes" ADD CONSTRAINT "scholarship_schemes_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_awards" ADD CONSTRAINT "scholarship_awards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_awards" ADD CONSTRAINT "scholarship_awards_scheme_id_fkey" FOREIGN KEY ("scheme_id") REFERENCES "scholarship_schemes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_awards" ADD CONSTRAINT "scholarship_awards_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_awards" ADD CONSTRAINT "scholarship_awards_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_awards" ADD CONSTRAINT "scholarship_awards_proposed_by_id_fkey" FOREIGN KEY ("proposed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scholarship_awards" ADD CONSTRAINT "scholarship_awards_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===========================================================================
-- Sponsors, scholarships and discount governance (SRS Module 15 — Track B6)
--
-- The legacy baseline is one combo box:
--
--     Me.CombAccType.Items.AddRange(New Object() { _
--         "النفقة الخاصة", "أشقاء", "أبناء عاملين", "منحة مجانية", "أبناء شرطة"})
--
-- (frmRegisteration.designer.vb:587). The selected literal is concatenated
-- into an `AcceptType` column on the student row (frmRegisteration.vb:205).
-- There is no sponsor, no contract, no coverage, no cap, no approval and no
-- award register; a sponsored student is one whose text column contains a
-- particular Arabic phrase, and the fees are billed to the student either way.
--
-- Everything below exists so that "how much does the Ministry owe us" and
-- "how much of this scheme's budget is left" are questions with answers the
-- database will stand behind.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A charge's split adds up, and the student is never billed twice.
--
--    `net_amount` is what was billed; `sponsored_amount` is the part a sponsor
--    carries; the student's own debt is the difference. Three rules keep those
--    honest:
--      · a sponsor cannot carry more than the charge;
--      · what the student has paid cannot exceed what the student owes;
--      · the sponsored figure equals the sum of the sponsor sub-ledger rows
--        behind it, less anything written back on default.
-- ---------------------------------------------------------------------------

ALTER TABLE student_charges ADD CONSTRAINT chk_charge_sponsored_within_net CHECK (
  sponsored_amount >= 0 AND sponsored_amount <= net_amount
);

ALTER TABLE student_charges ADD CONSTRAINT chk_charge_settled_within_student_portion CHECK (
  settled_amount <= net_amount - sponsored_amount
);

ALTER TABLE charge_sponsorships ADD CONSTRAINT chk_charge_sponsorship_amounts CHECK (
  amount > 0
  AND settled_amount >= 0
  AND written_back_amount >= 0
  AND settled_amount + written_back_amount <= amount
);

CREATE OR REPLACE FUNCTION assert_charge_split(p_charge_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  c_sponsored numeric(19,4);
  s_total     numeric(19,4);
BEGIN
  SELECT sponsored_amount INTO c_sponsored FROM student_charges WHERE id = p_charge_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount - written_back_amount), 0) INTO s_total
    FROM charge_sponsorships WHERE charge_id = p_charge_id;

  IF s_total <> c_sponsored THEN
    RAISE EXCEPTION
      'charge %: sponsored_amount is % but its sponsor shares total %. A split that does not add up bills somebody twice or nobody at all',
      p_charge_id, c_sponsored, s_total
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_charge_split_from_share()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_charge_split(COALESCE(NEW.charge_id, OLD.charge_id));
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_charge_split_shares
  AFTER INSERT OR UPDATE OR DELETE ON charge_sponsorships
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_charge_split_from_share();

CREATE OR REPLACE FUNCTION trg_check_charge_split_from_charge()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_charge_split(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_charge_split
  AFTER INSERT OR UPDATE OF sponsored_amount ON student_charges
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_charge_split_from_charge();


-- ---------------------------------------------------------------------------
-- 2. A sponsor share's settlement equals its allocations.
--
--    The same rule the student sub-ledger has had since A3, applied to the
--    other counterparty. The denormalised total exists for query cost and is
--    exactly the thing that drifts.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_sponsor_share_settlement(p_share_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  s_settled numeric(19,4);
  a_total   numeric(19,4);
BEGIN
  SELECT settled_amount INTO s_settled
    FROM charge_sponsorships WHERE id = p_share_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO a_total
    FROM sponsor_receipt_allocations WHERE charge_sponsorship_id = p_share_id;

  IF a_total <> s_settled THEN
    RAISE EXCEPTION
      'sponsor share %: settled_amount is % but its allocations total %',
      p_share_id, s_settled, a_total
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION assert_sponsor_receipt_allocation(p_receipt_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r_amount    numeric(19,4);
  r_allocated numeric(19,4);
  a_total     numeric(19,4);
BEGIN
  SELECT amount, allocated_amount INTO r_amount, r_allocated
    FROM sponsor_receipts WHERE id = p_receipt_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO a_total
    FROM sponsor_receipt_allocations WHERE receipt_id = p_receipt_id;

  IF a_total <> r_allocated THEN
    RAISE EXCEPTION
      'sponsor receipt %: allocated_amount is % but its allocations total %',
      p_receipt_id, r_allocated, a_total
      USING ERRCODE = 'check_violation';
  END IF;

  IF r_allocated > r_amount THEN
    RAISE EXCEPTION
      'sponsor receipt %: % allocated against % received. Money cannot pay for more than arrived',
      p_receipt_id, r_allocated, r_amount
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_sponsor_allocation_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_sponsor_share_settlement(
    COALESCE(NEW.charge_sponsorship_id, OLD.charge_sponsorship_id));
  PERFORM assert_sponsor_receipt_allocation(COALESCE(NEW.receipt_id, OLD.receipt_id));
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_sponsor_allocation_totals
  AFTER INSERT OR UPDATE OR DELETE ON sponsor_receipt_allocations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_sponsor_allocation_totals();

CREATE OR REPLACE FUNCTION trg_check_sponsor_share_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_sponsor_share_settlement(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_sponsor_share_totals
  AFTER INSERT OR UPDATE OF settled_amount ON charge_sponsorships
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_sponsor_share_totals();

CREATE OR REPLACE FUNCTION trg_check_sponsor_receipt_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_sponsor_receipt_allocation(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_sponsor_receipt_totals
  AFTER INSERT OR UPDATE OF allocated_amount ON sponsor_receipts
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_sponsor_receipt_totals();

ALTER TABLE sponsor_receipts ADD CONSTRAINT chk_sponsor_receipt_amount CHECK (
  amount > 0 AND allocated_amount >= 0
);

ALTER TABLE sponsor_receipt_allocations ADD CONSTRAINT chk_sponsor_allocation_amount CHECK (
  amount > 0
);


-- ---------------------------------------------------------------------------
-- 3. A contract is coherent, and only an approved one funds anything.
-- ---------------------------------------------------------------------------

ALTER TABLE sponsorships ADD CONSTRAINT chk_sponsorship_range CHECK (
  valid_to IS NULL OR valid_to >= valid_from
);

ALTER TABLE sponsorships ADD CONSTRAINT chk_sponsorship_cap CHECK (
  (cap_amount IS NULL OR cap_amount > 0)
  AND consumed_amount >= 0
  AND (cap_amount IS NULL OR consumed_amount <= cap_amount)
);

ALTER TABLE sponsorships ADD CONSTRAINT chk_sponsorship_approval CHECK (
  status = 'DRAFT'
  OR (approved_by_id IS NOT NULL AND approved_at IS NOT NULL)
);

-- Two signatures. Whoever writes a coverage percentage does not also put it
-- into force — the same rule the fee matrix has, for the same reason: one
-- person could otherwise commit the institution to funding it never agreed.
ALTER TABLE sponsorships ADD CONSTRAINT chk_sponsorship_second_signature CHECK (
  approved_by_id IS NULL OR approved_by_id <> created_by_id
);

ALTER TABLE sponsorship_lines ADD CONSTRAINT chk_sponsorship_line CHECK (
  coverage_pct > 0 AND coverage_pct <= 100
  AND (cap_amount IS NULL OR cap_amount > 0)
);

-- One live contract per sponsor per student per day. Two overlapping
-- contracts from one sponsor make "what does this sponsor cover" a question
-- with two answers — the defect the fee matrix's exclusion constraint exists
-- to prevent, in a second place.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE sponsorships
  ADD CONSTRAINT excl_sponsorship_no_overlap
  EXCLUDE USING gist (
    sponsor_id WITH =,
    student_id WITH =,
    daterange(valid_from, valid_to, '[]') WITH &&
  ) WHERE (status <> 'ENDED');


-- ---------------------------------------------------------------------------
-- 4. A sponsor invoice consolidates; it never posts.
--
--    The Sponsor AR was debited when each charge was split at billing time
--    (REQ-SPN-02). An invoice that posted again would bill the sponsor twice
--    for the same students, which is why this table has no posted_header_id
--    at all — the absence is the design, so it is written down here.
-- ---------------------------------------------------------------------------

ALTER TABLE sponsor_invoices ADD CONSTRAINT chk_sponsor_invoice_period CHECK (
  period_to >= period_from AND due_date >= doc_date
);

ALTER TABLE sponsor_invoices ADD CONSTRAINT chk_sponsor_invoice_amounts CHECK (
  total_amount > 0 AND settled_amount >= 0 AND settled_amount <= total_amount
);

ALTER TABLE sponsor_invoices ADD CONSTRAINT chk_sponsor_invoice_cancelled CHECK (
  (status = 'CANCELLED') = (cancelled_at IS NOT NULL)
);

CREATE OR REPLACE FUNCTION assert_sponsor_invoice_total(p_invoice_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  inv    RECORD;
  s_total numeric(19,4);
  n       int;
BEGIN
  SELECT id, invoice_no, total_amount, status, sponsor_id
    INTO inv FROM sponsor_invoices WHERE id = p_invoice_id;
  IF NOT FOUND THEN RETURN; END IF;
  IF inv.status = 'CANCELLED' THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount - written_back_amount), 0), COUNT(*)
    INTO s_total, n
    FROM charge_sponsorships WHERE invoice_id = p_invoice_id;

  IF n = 0 THEN
    RAISE EXCEPTION
      'sponsor invoice % lists no students. An invoice for nothing looks exactly like an invoice',
      inv.invoice_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF s_total <> inv.total_amount THEN
    RAISE EXCEPTION
      'sponsor invoice % is for % but the shares on it total %',
      inv.invoice_no, inv.total_amount, s_total
      USING ERRCODE = 'check_violation';
  END IF;

  IF EXISTS (
    SELECT 1 FROM charge_sponsorships
     WHERE invoice_id = p_invoice_id AND sponsor_id <> inv.sponsor_id
  ) THEN
    RAISE EXCEPTION
      'sponsor invoice % carries a share belonging to a different sponsor',
      inv.invoice_no
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_sponsor_invoice_from_share()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_id IS NOT NULL THEN
    PERFORM assert_sponsor_invoice_total(NEW.invoice_id);
  END IF;
  IF TG_OP <> 'INSERT' AND OLD.invoice_id IS NOT NULL
     AND OLD.invoice_id IS DISTINCT FROM NEW.invoice_id THEN
    PERFORM assert_sponsor_invoice_total(OLD.invoice_id);
  END IF;
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_sponsor_invoice_shares
  AFTER INSERT OR UPDATE ON charge_sponsorships
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_sponsor_invoice_from_share();

CREATE OR REPLACE FUNCTION trg_check_sponsor_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_sponsor_invoice_total(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_sponsor_invoice_total
  AFTER INSERT OR UPDATE OF total_amount, status ON sponsor_invoices
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_sponsor_invoice();


-- ---------------------------------------------------------------------------
-- 5. A scholarship budget is a control, not a report.
--
--    The third time this system has had to say so: B2 for seat quotas, A6 for
--    budget lines, and here. The legacy build got all three wrong the same
--    way — it computed the number and consulted it nowhere.
-- ---------------------------------------------------------------------------

ALTER TABLE scholarship_schemes ADD CONSTRAINT chk_scheme_budget CHECK (
  (budget_cap IS NULL OR budget_cap > 0)
  AND awarded_amount >= 0
  AND (budget_cap IS NULL OR awarded_amount <= budget_cap)
);

ALTER TABLE scholarship_awards ADD CONSTRAINT chk_award_amount CHECK (
  amount > 0 AND btrim(reason) <> ''
);

ALTER TABLE scholarship_awards ADD CONSTRAINT chk_award_decision CHECK (
  status = 'PROPOSED'
  OR (decided_by_id IS NOT NULL AND decided_at IS NOT NULL)
);

-- Whoever proposes an award does not approve it.
ALTER TABLE scholarship_awards ADD CONSTRAINT chk_award_second_signature CHECK (
  decided_by_id IS NULL OR decided_by_id <> proposed_by_id
);

-- One live award per student per scheme per year. Awarding the same student
-- the same scholarship twice is how a budget is exhausted by a duplicate.
CREATE UNIQUE INDEX uq_one_live_award_per_scheme_year
  ON scholarship_awards (tenant_id, scheme_id, student_id,
                         COALESCE(academic_year_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE (status IN ('PROPOSED', 'APPROVED'));

CREATE OR REPLACE FUNCTION assert_scheme_budget(p_scheme_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  sch     RECORD;
  a_total numeric(19,4);
BEGIN
  SELECT id, code, budget_cap, awarded_amount INTO sch
    FROM scholarship_schemes WHERE id = p_scheme_id;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO a_total
    FROM scholarship_awards
   WHERE scheme_id = p_scheme_id AND status = 'APPROVED';

  IF a_total <> sch.awarded_amount THEN
    RAISE EXCEPTION
      'scheme %: awarded_amount is % but its approved awards total %',
      sch.code, sch.awarded_amount, a_total
      USING ERRCODE = 'check_violation';
  END IF;

  IF sch.budget_cap IS NOT NULL AND a_total > sch.budget_cap THEN
    RAISE EXCEPTION
      'scheme % has awarded % against a budget of %',
      sch.code, a_total, sch.budget_cap
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_scheme_budget_from_award()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_scheme_budget(COALESCE(NEW.scheme_id, OLD.scheme_id));
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_scheme_budget_awards
  AFTER INSERT OR UPDATE OR DELETE ON scholarship_awards
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_scheme_budget_from_award();

CREATE OR REPLACE FUNCTION trg_check_scheme_budget()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_scheme_budget(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_scheme_budget
  AFTER INSERT OR UPDATE OF budget_cap, awarded_amount ON scholarship_schemes
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_scheme_budget();


-- ---------------------------------------------------------------------------
-- 6. Sponsor records are not deleted.
--
--    A sponsor with history is a counterparty in the ledger. Deactivate.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_sponsor_not_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM sponsorships WHERE sponsor_id = OLD.id) THEN
    RAISE EXCEPTION
      'sponsor % has contracts on file and cannot be deleted. Deactivate it — the ledger still refers to it',
      OLD.code
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_sponsor_not_deleted
  BEFORE DELETE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION assert_sponsor_not_deleted();

CREATE OR REPLACE FUNCTION assert_sponsor_share_not_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.settled_amount > 0 THEN
    RAISE EXCEPTION
      'this sponsor share has been paid against and cannot be removed. Write it back to the student instead, which records that the sponsor defaulted'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_sponsor_share_not_deleted
  BEFORE DELETE ON charge_sponsorships
  FOR EACH ROW EXECUTE FUNCTION assert_sponsor_share_not_deleted();


-- ---------------------------------------------------------------------------
-- 7. Cross-table references stay inside one tenant.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_sponsorship_same_tenant
  BEFORE INSERT OR UPDATE ON sponsorships
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'sponsor_id', 'sponsors',
    'student_id', 'students');

CREATE TRIGGER trg_sponsorship_line_same_tenant
  BEFORE INSERT OR UPDATE ON sponsorship_lines
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'sponsorship_id', 'sponsorships',
    'fee_item_id', 'fee_items');

CREATE TRIGGER trg_charge_sponsorship_same_tenant
  BEFORE INSERT OR UPDATE ON charge_sponsorships
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'charge_id', 'student_charges',
    'sponsorship_id', 'sponsorships',
    'sponsor_id', 'sponsors',
    'invoice_id', 'sponsor_invoices');

CREATE TRIGGER trg_sponsor_invoice_same_tenant
  BEFORE INSERT OR UPDATE ON sponsor_invoices
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('sponsor_id', 'sponsors');

CREATE TRIGGER trg_sponsor_receipt_same_tenant
  BEFORE INSERT OR UPDATE ON sponsor_receipts
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('sponsor_id', 'sponsors');

CREATE TRIGGER trg_sponsor_allocation_same_tenant
  BEFORE INSERT OR UPDATE ON sponsor_receipt_allocations
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'receipt_id', 'sponsor_receipts',
    'charge_sponsorship_id', 'charge_sponsorships');

CREATE TRIGGER trg_scheme_same_tenant
  BEFORE INSERT OR UPDATE ON scholarship_schemes
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'academic_year_id', 'academic_years');

CREATE TRIGGER trg_award_same_tenant
  BEFORE INSERT OR UPDATE ON scholarship_awards
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'scheme_id', 'scholarship_schemes',
    'student_id', 'students',
    'academic_year_id', 'academic_years');

CREATE TRIGGER trg_registration_scheme_same_tenant
  BEFORE INSERT OR UPDATE ON semester_registrations
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'discount_scheme_id', 'scholarship_schemes');


-- ---------------------------------------------------------------------------
-- 8. Row-level security and grants.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'sponsors', 'sponsorships', 'sponsorship_lines', 'charge_sponsorships',
    'sponsor_invoices', 'sponsor_receipts', 'sponsor_receipt_allocations',
    'scholarship_schemes', 'scholarship_awards'
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
