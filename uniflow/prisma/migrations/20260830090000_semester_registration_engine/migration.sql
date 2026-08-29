-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING_APPROVAL', 'REGISTERED', 'CANCELLED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "discount_approval_threshold_pct" DECIMAL(7,4) NOT NULL DEFAULT 10;

-- AlterTable
ALTER TABLE "student_charges" ADD COLUMN     "registration_id" UUID;

-- CreateTable
CREATE TABLE "semester_registrations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "registration_no" TEXT NOT NULL,
    "student_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "admission_category_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "academic_term_id" UUID NOT NULL,
    "level_year" INTEGER NOT NULL,
    "registration_date" DATE NOT NULL,
    "fee_schedule_id" UUID NOT NULL,
    "fee_schedule_version_no" INTEGER NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "gross_amount" DECIMAL(19,4) NOT NULL,
    "discount_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(19,4) NOT NULL,
    "discount_pct" DECIMAL(7,4) NOT NULL DEFAULT 0,
    "discount_reason" TEXT,
    "discount_approved_by_id" UUID,
    "discount_approved_at" TIMESTAMPTZ(6),
    "status" "RegistrationStatus" NOT NULL DEFAULT 'REGISTERED',
    "posted_header_id" UUID,
    "reversal_header_id" UUID,
    "cancelled_by_id" UUID,
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_reason" TEXT,
    "verify_token" TEXT NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "semester_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registration_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "registration_id" UUID NOT NULL,
    "fee_item_id" UUID NOT NULL,
    "gross_amount" DECIMAL(19,4) NOT NULL,
    "discount_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "net_amount" DECIMAL(19,4) NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "charge_id" UUID,

    CONSTRAINT "registration_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "semester_registrations_posted_header_id_key" ON "semester_registrations"("posted_header_id");

-- CreateIndex
CREATE INDEX "semester_registrations_tenant_id_student_id_registration_da_idx" ON "semester_registrations"("tenant_id", "student_id", "registration_date");

-- CreateIndex
CREATE INDEX "semester_registrations_tenant_id_academic_term_id_status_idx" ON "semester_registrations"("tenant_id", "academic_term_id", "status");

-- CreateIndex
CREATE INDEX "semester_registrations_tenant_id_programme_id_batch_id_stat_idx" ON "semester_registrations"("tenant_id", "programme_id", "batch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "semester_registrations_tenant_id_registration_no_key" ON "semester_registrations"("tenant_id", "registration_no");

-- CreateIndex
CREATE UNIQUE INDEX "semester_registrations_tenant_id_verify_token_key" ON "semester_registrations"("tenant_id", "verify_token");

-- CreateIndex
CREATE UNIQUE INDEX "registration_lines_charge_id_key" ON "registration_lines"("charge_id");

-- CreateIndex
CREATE INDEX "registration_lines_tenant_id_fee_item_id_idx" ON "registration_lines"("tenant_id", "fee_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "registration_lines_registration_id_fee_item_id_key" ON "registration_lines"("registration_id", "fee_item_id");

-- CreateIndex
CREATE INDEX "student_charges_tenant_id_registration_id_idx" ON "student_charges"("tenant_id", "registration_id");

-- AddForeignKey
ALTER TABLE "student_charges" ADD CONSTRAINT "student_charges_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "semester_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_admission_category_id_fkey" FOREIGN KEY ("admission_category_id") REFERENCES "admission_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_fee_schedule_id_fkey" FOREIGN KEY ("fee_schedule_id") REFERENCES "fee_schedules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_reversal_header_id_fkey" FOREIGN KEY ("reversal_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_discount_approved_by_id_fkey" FOREIGN KEY ("discount_approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "semester_registrations" ADD CONSTRAINT "semester_registrations_cancelled_by_id_fkey" FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_lines" ADD CONSTRAINT "registration_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_lines" ADD CONSTRAINT "registration_lines_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "semester_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_lines" ADD CONSTRAINT "registration_lines_fee_item_id_fkey" FOREIGN KEY ("fee_item_id") REFERENCES "fee_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_lines" ADD CONSTRAINT "registration_lines_charge_id_fkey" FOREIGN KEY ("charge_id") REFERENCES "student_charges"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===========================================================================
-- Semester registration invariants (SRS Module 4, Track B4)
--
-- The convergence milestone with Track A. `frmStudentRegisteration.vb` is the
-- screen these constraints are written against, and it fails in five separate
-- ways that a database can refuse outright:
--
--   1. It bills the ledger the GROSS while recording the NET on the
--      registration row (`txtTuitionFees` against `ttxtTuitionFeesafterdiscount`,
--      lines 365/373 vs 470-517), so every discounted student is a permanent
--      divergence between the registration and the accounts.
--   2. The whole posting sits behind `If CheckBox1.Checked = False Then` — a
--      registration can exist with no ledger entry at all, which is the state
--      the entire legacy install is in.
--   3. It allocates `MoveNo` from `Max(MoveNo)+1 from Transactions` and writes
--      it into `Transactionees` — numbering from a counter that does not count
--      the rows being numbered.
--   4. Its duplicate check (lines 171-197) reads `Registrations` on a second
--      connection, outside the transaction, with the semester predicate
--      commented out —
--      so it catches nothing under concurrency and, when it does fire, refuses
--      a legitimate second-semester registration.
--   5. `Calculate()` (lines 845-847) computes the instalment remainder as
--      `CInt(y) - CInt(afterdiscount)` where `y` was assigned that same value
--      on the line above. It is always zero, and `CInt` truncates money to whole
--      pounds on the way past.
--
-- Every rule below is one of those, negated, and enforced where the
-- application cannot route around it.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. The arithmetic holds, on the registration and on every line.
--
--    net = gross − discount, in the database. The legacy row held only
--    `TuitionFees1` (net) and `DiscPerc` (a percentage typed on a form), and
--    the two disagreed with the ledger by construction.
-- ---------------------------------------------------------------------------

ALTER TABLE semester_registrations ADD CONSTRAINT chk_registration_amounts CHECK (
  gross_amount > 0
  AND discount_amount >= 0
  AND discount_amount <= gross_amount
  AND net_amount = gross_amount - discount_amount
  AND discount_pct >= 0
  AND discount_pct <= 100
);

ALTER TABLE registration_lines ADD CONSTRAINT chk_registration_line_amounts CHECK (
  gross_amount > 0
  AND discount_amount >= 0
  AND discount_amount <= gross_amount
  AND net_amount = gross_amount - discount_amount
);

ALTER TABLE semester_registrations ADD CONSTRAINT chk_registration_level CHECK (
  level_year >= 1 AND level_year <= 12
);

-- A discount with no stated reason is what `DiscDescr` was: a free-text column
-- nothing required and nobody filled in, which is why the legacy build cannot
-- say why any individual student paid less.
ALTER TABLE semester_registrations ADD CONSTRAINT chk_registration_discount_reasoned CHECK (
  discount_amount = 0
  OR (discount_reason IS NOT NULL AND btrim(discount_reason) <> '')
);


-- ---------------------------------------------------------------------------
-- 2. A registered registration HAS a ledger entry. This is the checkbox.
--
--    `If CheckBox1.Checked = False Then` wrapped the entire posting block, so
--    a registration with no accounting entry was one click away and looked
--    identical to a correct one. Here it is not representable: REGISTERED
--    without `posted_header_id` is refused, and PENDING_APPROVAL with one is
--    refused too — a discount awaiting a second signature must not have
--    reached the accounts yet.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_registration_posting_coherent(p_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r RECORD;
BEGIN
  -- Re-read by id rather than trusting the trigger's NEW tuple. A deferred
  -- AFTER trigger is handed the row as it was at the triggering statement,
  -- not as it stands at COMMIT, and this row is deliberately written twice
  -- inside one transaction: created, then attached to the voucher it raised.
  SELECT * INTO r FROM semester_registrations WHERE id = p_registration_id;
  IF NOT FOUND THEN RETURN; END IF;

  IF r.status = 'PENDING_APPROVAL' THEN
    IF r.posted_header_id IS NOT NULL OR r.reversal_header_id IS NOT NULL
       OR r.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION
        'registration % is awaiting approval and must not have reached the ledger',
        r.registration_no
        USING ERRCODE = 'check_violation';
    END IF;

  ELSIF r.status = 'REGISTERED' THEN
    IF r.posted_header_id IS NULL THEN
      RAISE EXCEPTION
        'registration % is registered but has no ledger entry. A registration that bills nobody looks exactly like a correct one — which is the state every legacy registration is in',
        r.registration_no
        USING ERRCODE = 'check_violation';
    END IF;
    IF r.reversal_header_id IS NOT NULL OR r.cancelled_at IS NOT NULL THEN
      RAISE EXCEPTION
        'registration % is registered but carries a cancellation', r.registration_no
        USING ERRCODE = 'check_violation';
    END IF;

  ELSE -- CANCELLED
    IF r.cancelled_at IS NULL OR r.cancelled_by_id IS NULL
       OR r.cancellation_reason IS NULL OR btrim(r.cancellation_reason) = '' THEN
      RAISE EXCEPTION
        'registration % was cancelled with no record of who did it or why',
        r.registration_no
        USING ERRCODE = 'check_violation';
    END IF;
    -- A cancellation that had posted carries its linked reversal; one
    -- cancelled while still pending never posted and has neither.
    IF (r.posted_header_id IS NULL) <> (r.reversal_header_id IS NULL) THEN
      RAISE EXCEPTION
        'registration % was posted but not reversed, or reversed without ever having posted',
        r.registration_no
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_registration_posting()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_registration_posting_coherent(NEW.id);
  RETURN NULL;
END;
$$;

-- DEFERRED, and that is the point. The registration row must exist before its
-- charges can reference it, and the voucher those charges post cannot exist
-- until they do. Checking at statement time would make the atomicity this
-- module is built for impossible to express; checking at COMMIT states the
-- invariant that actually matters — when this transaction ends, a registered
-- registration has a balanced ledger entry, or nothing happened at all.
CREATE CONSTRAINT TRIGGER trg_registration_posting_coherent
  AFTER INSERT OR UPDATE ON semester_registrations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_registration_posting();


-- ---------------------------------------------------------------------------
-- 3. One live registration per student per TERM.
--
--    The legacy check was:
--
--        'Select Count(*) From StudentsRegistration Where AcademicYear=..
--        '   And StudentIndex=.. And Semester=..            <- commented out
--        Select Count(*) From Registrations Where AcademicYear=N'..'
--            And StudentIndex=N'..'
--
--    read on `cnn1`, a second connection, outside the transaction the insert
--    then ran in. Two defects in six lines: the semester predicate was dropped,
--    so a student could not register for the second semester of a year at all;
--    and check-then-act across two connections catches nothing when two
--    registrars press Save at once.
--
--    A partial unique index answers both. Cancelled rows are excluded, so a
--    cancelled registration can be re-raised.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX uq_one_live_registration_per_term
  ON semester_registrations (tenant_id, student_id, academic_term_id)
  WHERE (status <> 'CANCELLED');


-- ---------------------------------------------------------------------------
-- 4. The registration totals equal the sum of its lines.
--
--    Deferred to commit, because the header is inserted before the lines that
--    make it up. Without this the header is a number somebody typed; with it
--    the header is the lines.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_registration_totals(p_registration_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  reg   RECORD;
  agg   RECORD;
BEGIN
  SELECT id, registration_no, gross_amount, discount_amount, net_amount, status
    INTO reg
    FROM semester_registrations WHERE id = p_registration_id;

  -- Gone by the time the constraint fires: cascade-deleted with its lines.
  IF NOT FOUND THEN RETURN; END IF;

  SELECT COALESCE(SUM(gross_amount), 0)    AS gross,
         COALESCE(SUM(discount_amount), 0) AS discount,
         COALESCE(SUM(net_amount), 0)      AS net,
         COUNT(*)                          AS n
    INTO agg
    FROM registration_lines WHERE registration_id = p_registration_id;

  IF agg.n = 0 THEN
    RAISE EXCEPTION
      'registration % has no fee lines. A registration that bills nothing looks exactly like a correct one',
      reg.registration_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF (reg.gross_amount, reg.discount_amount, reg.net_amount)
     IS DISTINCT FROM (agg.gross, agg.discount, agg.net) THEN
    RAISE EXCEPTION
      'registration % totals %/%/% (gross/discount/net) but its lines total %/%/%',
      reg.registration_no, reg.gross_amount, reg.discount_amount, reg.net_amount,
      agg.gross, agg.discount, agg.net
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_registration_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_registration_totals(COALESCE(NEW.registration_id, OLD.registration_id));
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_registration_line_totals
  AFTER INSERT OR UPDATE OR DELETE ON registration_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_registration_totals();

CREATE OR REPLACE FUNCTION trg_check_registration_header_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_registration_totals(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_registration_totals
  AFTER INSERT OR UPDATE OF gross_amount, discount_amount, net_amount
  ON semester_registrations
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_registration_header_totals();


-- ---------------------------------------------------------------------------
-- 5. The schedule billed is this cohort's schedule, and it was in force.
--
--    B1 versions the fee matrix so that "what did this student owe when they
--    registered" has one permanent answer. That guarantee is worth nothing if
--    a registration can name a version belonging to another programme, another
--    batch, or a range that does not cover the registration date. The
--    application resolves the schedule correctly; this is the check that the
--    application was not bypassed.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_registration_schedule_applies()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  fs RECORD;
BEGIN
  SELECT programme_id, batch_id, admission_category_id, version_no, status,
         effective_from, effective_to, currency
    INTO fs
    FROM fee_schedules WHERE id = NEW.fee_schedule_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'fee schedule % does not exist', NEW.fee_schedule_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF fs.status = 'DRAFT' THEN
    RAISE EXCEPTION
      'fee schedule version % is still a draft. A draft prices nothing and must not bill anybody',
      fs.version_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF (fs.programme_id, fs.batch_id, fs.admission_category_id)
     IS DISTINCT FROM (NEW.programme_id, NEW.batch_id, NEW.admission_category_id) THEN
    RAISE EXCEPTION
      'registration % is billed against a fee schedule for a different cohort. The schedule prices one programme, batch and admission category, and they are not this student''s',
      NEW.registration_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.registration_date < fs.effective_from
     OR (fs.effective_to IS NOT NULL AND NEW.registration_date > fs.effective_to) THEN
    RAISE EXCEPTION
      'fee schedule version % is in force % to %, which does not cover the registration date %',
      fs.version_no, fs.effective_from, COALESCE(fs.effective_to::text, 'open'),
      NEW.registration_date
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.fee_schedule_version_no <> fs.version_no THEN
    RAISE EXCEPTION
      'registration % records fee schedule version % against a schedule that is version %',
      NEW.registration_no, NEW.fee_schedule_version_no, fs.version_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF btrim(NEW.currency) <> btrim(fs.currency) THEN
    RAISE EXCEPTION
      'registration % is in % but the fee schedule prices in %',
      NEW.registration_no, btrim(NEW.currency), btrim(fs.currency)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registration_schedule_applies
  BEFORE INSERT OR UPDATE ON semester_registrations
  FOR EACH ROW EXECUTE FUNCTION assert_registration_schedule_applies();


-- ---------------------------------------------------------------------------
-- 6. The term is the student's own year, and registration has not closed.
--
--    `CombAcdYear` and `CombSemester` were free-standing combo boxes filled
--    from `SELECT DISTINCT` over text columns; nothing tied the semester
--    chosen to the year chosen, and the semester was ultimately dropped from
--    the insert altogether.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_registration_term_open()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  t RECORD;
BEGIN
  SELECT academic_year_id, name_en, start_date, end_date,
         registration_closes_on, status
    INTO t
    FROM academic_terms WHERE id = NEW.academic_term_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'academic term % does not exist', NEW.academic_term_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF t.academic_year_id <> NEW.academic_year_id THEN
    RAISE EXCEPTION
      'term % belongs to a different academic year than the one on this registration',
      t.name_en
      USING ERRCODE = 'check_violation';
  END IF;

  IF t.status = 'CLOSED' THEN
    RAISE EXCEPTION
      'term % is closed. Registering into a closed term is how a prior year silently gains students',
      t.name_en
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.registration_date > t.end_date THEN
    RAISE EXCEPTION
      'registration date % falls after term % ends on %',
      NEW.registration_date, t.name_en, t.end_date
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registration_term_open
  BEFORE INSERT ON semester_registrations
  FOR EACH ROW EXECUTE FUNCTION assert_registration_term_open();


-- ---------------------------------------------------------------------------
-- 7. A discount above the tenant threshold needs a second signature.
--
--    SRS REQ-SPN-04: approval comes BEFORE the registration can post. The
--    application refuses it; this refuses it again where a role assignment
--    cannot be argued with, and adds the part an application check tends to
--    forget — the approver is not the person who applied the discount.
--
--    The legacy `DiscPerc` had no approval of any kind. Any registrar could
--    enter 100 and the row saved.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_registration_discount_approved()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  threshold numeric;
BEGIN
  IF NEW.status <> 'REGISTERED' OR NEW.discount_amount = 0 THEN
    RETURN NEW;
  END IF;

  SELECT discount_approval_threshold_pct INTO threshold
    FROM tenants WHERE id = NEW.tenant_id;

  IF NEW.discount_pct > threshold THEN
    IF NEW.discount_approved_by_id IS NULL THEN
      RAISE EXCEPTION
        'a discount of %%% on registration % is above the %%% this university lets a registrar apply alone, and it has not been approved',
        NEW.discount_pct, NEW.registration_no, threshold
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.discount_approved_by_id = NEW.created_by_id THEN
      RAISE EXCEPTION
        'registration % was approved by the person who raised it. A discount must be approved by someone else, or the approval is a formality',
        NEW.registration_no
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registration_discount_approved
  BEFORE INSERT OR UPDATE ON semester_registrations
  FOR EACH ROW EXECUTE FUNCTION assert_registration_discount_approved();


-- ---------------------------------------------------------------------------
-- 8. A posted registration is not edited, and none is ever deleted.
--
--    Correction is by cancellation and a linked reversal (REQ-REG-03), the
--    same rule the ledger applies to a voucher. The legacy transfer screen
--    rewrote registration rows in place, which is why no Nile College
--    registration can be reconciled to the term it was actually billed for.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_registration_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'registration % is not deleted. Cancel it — that raises the linked reversal and leaves both on file',
      OLD.registration_no
      USING ERRCODE = 'check_violation';
  END IF;

  -- What a registration IS never changes, in any state.
  IF (NEW.tenant_id, NEW.student_id, NEW.registration_no, NEW.academic_term_id,
      NEW.academic_year_id, NEW.programme_id, NEW.batch_id, NEW.admission_category_id,
      NEW.registration_date, NEW.fee_schedule_id, NEW.fee_schedule_version_no,
      NEW.currency, NEW.created_by_id, NEW.verify_token)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.student_id, OLD.registration_no, OLD.academic_term_id,
      OLD.academic_year_id, OLD.programme_id, OLD.batch_id, OLD.admission_category_id,
      OLD.registration_date, OLD.fee_schedule_id, OLD.fee_schedule_version_no,
      OLD.currency, OLD.created_by_id, OLD.verify_token) THEN
    RAISE EXCEPTION
      'registration % cannot be re-pointed at a different student, term, cohort or fee schedule. Cancel it and raise a new one',
      OLD.registration_no
      USING ERRCODE = 'check_violation';
  END IF;

  -- Money changes only while the registration is still awaiting approval.
  IF OLD.status <> 'PENDING_APPROVAL'
     AND (NEW.gross_amount, NEW.discount_amount, NEW.net_amount, NEW.discount_pct)
         IS DISTINCT FROM
         (OLD.gross_amount, OLD.discount_amount, OLD.net_amount, OLD.discount_pct) THEN
    RAISE EXCEPTION
      'registration % has been posted. Its amounts are in the ledger and cannot be edited behind it',
      OLD.registration_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.posted_header_id IS NOT NULL
     AND NEW.posted_header_id IS DISTINCT FROM OLD.posted_header_id THEN
    RAISE EXCEPTION
      'registration % is already attached to voucher %. One registration bills once',
      OLD.registration_no, OLD.posted_header_id
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status = 'CANCELLED' AND NEW.status <> 'CANCELLED' THEN
    RAISE EXCEPTION
      'registration % was cancelled on %. Raise a fresh registration rather than reviving this one',
      OLD.registration_no, OLD.cancelled_at
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status = 'REGISTERED' AND NEW.status = 'PENDING_APPROVAL' THEN
    RAISE EXCEPTION
      'registration % has posted and cannot go back to awaiting approval',
      OLD.registration_no
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registration_immutable
  BEFORE UPDATE OR DELETE ON semester_registrations
  FOR EACH ROW EXECUTE FUNCTION assert_registration_immutable();


-- ---------------------------------------------------------------------------
-- 9. A line that has billed is frozen, and its charge is attached once.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_registration_line_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.charge_id IS NOT NULL THEN
      RAISE EXCEPTION
        'this fee line has been billed and cannot be removed. Cancel the registration instead'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.charge_id IS NOT NULL THEN
    IF NEW.charge_id IS DISTINCT FROM OLD.charge_id THEN
      RAISE EXCEPTION
        'this fee line is already attached to charge %. A line bills once',
        OLD.charge_id
        USING ERRCODE = 'check_violation';
    END IF;
    IF (NEW.fee_item_id, NEW.gross_amount, NEW.discount_amount, NEW.net_amount)
       IS DISTINCT FROM
       (OLD.fee_item_id, OLD.gross_amount, OLD.discount_amount, OLD.net_amount) THEN
      RAISE EXCEPTION
        'this fee line has been billed. Editing it would leave the sub-ledger saying one thing and the registration another — which is the legacy defect this table exists to prevent'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_registration_line_immutable
  BEFORE UPDATE OR DELETE ON registration_lines
  FOR EACH ROW EXECUTE FUNCTION assert_registration_line_immutable();


-- ---------------------------------------------------------------------------
-- 10. Cross-table references stay inside one tenant.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_registration_same_tenant
  BEFORE INSERT OR UPDATE ON semester_registrations
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students',
    'programme_id', 'programmes',
    'batch_id', 'batches',
    'admission_category_id', 'admission_categories',
    'academic_year_id', 'academic_years',
    'academic_term_id', 'academic_terms',
    'fee_schedule_id', 'fee_schedules');

CREATE TRIGGER trg_registration_line_same_tenant
  BEFORE INSERT OR UPDATE ON registration_lines
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'registration_id', 'semester_registrations',
    'fee_item_id', 'fee_items',
    'charge_id', 'student_charges');


-- ---------------------------------------------------------------------------
-- 11. Row-level security and grants.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['semester_registrations', 'registration_lines']
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
