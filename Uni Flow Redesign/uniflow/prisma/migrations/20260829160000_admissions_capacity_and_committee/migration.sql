-- CreateEnum
CREATE TYPE "ApplicationState" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'OFFERED', 'WAITLISTED', 'REJECTED', 'WITHDRAWN', 'ENROLLED');

-- CreateEnum
CREATE TYPE "AdmissionDecision" AS ENUM ('ACCEPT', 'CONDITIONAL_ACCEPT', 'WAITLIST', 'REJECT');

-- CreateEnum
CREATE TYPE "OfferState" AS ENUM ('ISSUED', 'ACCEPTED', 'DECLINED', 'LAPSED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EligibilityOutcome" AS ENUM ('NOT_ASSESSED', 'PASS', 'FAIL');

-- CreateTable
CREATE TABLE "certificate_types" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "max_score" DECIMAL(9,3) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "certificate_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seat_quotas" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "admission_category_id" UUID NOT NULL,
    "seats" INTEGER NOT NULL,
    "reserved_seats" INTEGER NOT NULL DEFAULT 0,
    "allow_override" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seat_quotas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eligibility_rules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "certificate_type_id" UUID NOT NULL,
    "min_percentage" DECIMAL(6,3) NOT NULL,
    "required_subjects" TEXT[],
    "min_age" INTEGER,
    "max_age" INTEGER,
    "nationality_category" "NationalityCategory",
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "eligibility_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "applications" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_no" TEXT NOT NULL,
    "batch_id" UUID NOT NULL,
    "admission_category_id" UUID NOT NULL,
    "full_name_ar" TEXT NOT NULL,
    "full_name_en" TEXT NOT NULL,
    "search_key" TEXT NOT NULL,
    "national_id" TEXT,
    "passport_no" TEXT,
    "date_of_birth" DATE,
    "nationality_id" UUID,
    "email" TEXT,
    "phone" TEXT,
    "certificate_type_id" UUID,
    "certificate_score" DECIMAL(9,3),
    "certificate_year" INTEGER,
    "subjects" TEXT[],
    "state" "ApplicationState" NOT NULL DEFAULT 'DRAFT',
    "decision" "AdmissionDecision",
    "decision_note" TEXT,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "committee_score" DECIMAL(9,3),
    "submitted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_id" UUID,

    CONSTRAINT "applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "application_choices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "eligibility" "EligibilityOutcome" NOT NULL DEFAULT 'NOT_ASSESSED',
    "eligibility_notes" TEXT[],
    "assessed_at" TIMESTAMPTZ(6),

    CONSTRAINT "application_choices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_offers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "application_id" UUID NOT NULL,
    "seat_quota_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "state" "OfferState" NOT NULL DEFAULT 'ISSUED',
    "issued_by_id" UUID NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accept_by" DATE NOT NULL,
    "conditions" TEXT,
    "deposit_required" DECIMAL(19,4),
    "deposit_paid_at" TIMESTAMPTZ(6),
    "deposit_receipt_id" UUID,
    "responded_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6),
    "close_reason" TEXT,
    "overrode_capacity" BOOLEAN NOT NULL DEFAULT false,
    "override_reason" TEXT,
    "overridden_by_id" UUID,
    "promoted_from_id" UUID,

    CONSTRAINT "admission_offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "certificate_types_tenant_id_code_key" ON "certificate_types"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "seat_quotas_tenant_id_batch_id_idx" ON "seat_quotas"("tenant_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "seat_quotas_tenant_id_programme_id_batch_id_admission_categ_key" ON "seat_quotas"("tenant_id", "programme_id", "batch_id", "admission_category_id");

-- CreateIndex
CREATE INDEX "eligibility_rules_tenant_id_programme_id_idx" ON "eligibility_rules"("tenant_id", "programme_id");

-- CreateIndex
CREATE UNIQUE INDEX "eligibility_rules_tenant_id_programme_id_certificate_type_i_key" ON "eligibility_rules"("tenant_id", "programme_id", "certificate_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_student_id_key" ON "applications"("student_id");

-- CreateIndex
CREATE INDEX "applications_tenant_id_batch_id_state_idx" ON "applications"("tenant_id", "batch_id", "state");

-- CreateIndex
CREATE INDEX "applications_tenant_id_search_key_idx" ON "applications"("tenant_id", "search_key");

-- CreateIndex
CREATE INDEX "applications_tenant_id_national_id_idx" ON "applications"("tenant_id", "national_id");

-- CreateIndex
CREATE UNIQUE INDEX "applications_tenant_id_application_no_key" ON "applications"("tenant_id", "application_no");

-- CreateIndex
CREATE INDEX "application_choices_tenant_id_programme_id_eligibility_idx" ON "application_choices"("tenant_id", "programme_id", "eligibility");

-- CreateIndex
CREATE UNIQUE INDEX "application_choices_application_id_rank_key" ON "application_choices"("application_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "application_choices_application_id_programme_id_key" ON "application_choices"("application_id", "programme_id");

-- CreateIndex
CREATE INDEX "admission_offers_tenant_id_seat_quota_id_state_idx" ON "admission_offers"("tenant_id", "seat_quota_id", "state");

-- CreateIndex
CREATE INDEX "admission_offers_tenant_id_state_accept_by_idx" ON "admission_offers"("tenant_id", "state", "accept_by");

-- AddForeignKey
ALTER TABLE "certificate_types" ADD CONSTRAINT "certificate_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_quotas" ADD CONSTRAINT "seat_quotas_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_quotas" ADD CONSTRAINT "seat_quotas_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_quotas" ADD CONSTRAINT "seat_quotas_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_quotas" ADD CONSTRAINT "seat_quotas_admission_category_id_fkey" FOREIGN KEY ("admission_category_id") REFERENCES "admission_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seat_quotas" ADD CONSTRAINT "seat_quotas_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eligibility_rules" ADD CONSTRAINT "eligibility_rules_certificate_type_id_fkey" FOREIGN KEY ("certificate_type_id") REFERENCES "certificate_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_admission_category_id_fkey" FOREIGN KEY ("admission_category_id") REFERENCES "admission_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_nationality_id_fkey" FOREIGN KEY ("nationality_id") REFERENCES "nationalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_certificate_type_id_fkey" FOREIGN KEY ("certificate_type_id") REFERENCES "certificate_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "applications" ADD CONSTRAINT "applications_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_choices" ADD CONSTRAINT "application_choices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_choices" ADD CONSTRAINT "application_choices_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "application_choices" ADD CONSTRAINT "application_choices_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "applications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_seat_quota_id_fkey" FOREIGN KEY ("seat_quota_id") REFERENCES "seat_quotas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_issued_by_id_fkey" FOREIGN KEY ("issued_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_overridden_by_id_fkey" FOREIGN KEY ("overridden_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_promoted_from_id_fkey" FOREIGN KEY ("promoted_from_id") REFERENCES "admission_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_offers" ADD CONSTRAINT "admission_offers_deposit_receipt_id_fkey" FOREIGN KEY ("deposit_receipt_id") REFERENCES "student_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===========================================================================
-- Hand-written invariants — Track B2, admissions capacity and committee.
--
-- The legacy seat-quota screen (Ribat/UOT build only) saved like this:
--
--     Delete From StudentsVacants Where College=N'<college>'
--     Insert Into StudentsVacants (College,Batch,Amount) Values (...)
--
-- (frmStudentsVacants.vb:94-98). The DELETE names the college; the INSERT
-- names the college AND the batch. So setting one batch's quota deleted every
-- other batch's quota for that college — the same defect as the fee matrix,
-- in a second screen, which makes it a habit rather than an accident. Two
-- separate ExecuteNonQuery calls on an autocommit connection, so a failure
-- between them left the college with no quota at all.
--
-- Two further findings from the same file, both addressed here by design
-- rather than by constraint:
--
--   · Capacity was never checked when a place was offered. `ViewStudVacants`
--     counted students who had *paid*, from receipt vouchers, after the fact
--     (frmStudentsVacants.vb:141-160). Over-admission was discovered when the
--     money arrived, not when the offer went out.
--   · That report rebuilt its own views at runtime with `ALTER VIEW ... AS
--     SELECT ... AcdYear = N'<dropdown value>'`. The application therefore
--     required DDL rights on the live database, and two people running the
--     report at once silently overwrote each other's view definition — the
--     second user's year decided what the first user saw.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Quotas are non-negative and coherent.
-- ---------------------------------------------------------------------------

ALTER TABLE seat_quotas
  ADD CONSTRAINT chk_seat_quota_seats CHECK (seats >= 0);

ALTER TABLE seat_quotas
  ADD CONSTRAINT chk_seat_quota_reserved CHECK (
    reserved_seats >= 0 AND reserved_seats <= seats);

ALTER TABLE eligibility_rules
  ADD CONSTRAINT chk_eligibility_percentage CHECK (
    min_percentage >= 0 AND min_percentage <= 100);

ALTER TABLE eligibility_rules
  ADD CONSTRAINT chk_eligibility_age CHECK (
    min_age IS NULL OR max_age IS NULL OR max_age >= min_age);

ALTER TABLE certificate_types
  ADD CONSTRAINT chk_certificate_max_score CHECK (max_score > 0);

ALTER TABLE applications
  ADD CONSTRAINT chk_application_score CHECK (
    certificate_score IS NULL OR certificate_score >= 0);

ALTER TABLE application_choices
  ADD CONSTRAINT chk_choice_rank CHECK (rank >= 1);


-- ---------------------------------------------------------------------------
-- 2. One live offer per application.
--
--    An applicant holds at most one place at a time. Two live offers means two
--    seats consumed by one person, and whichever they accept, the other seat
--    stays consumed until somebody notices.
--
--    Partial unique index rather than a constraint, because only the
--    non-terminal states conflict: a lapsed offer and its waitlist replacement
--    must coexist, which is the entire point of keeping offers as rows.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX uq_one_live_offer_per_application
  ON admission_offers (application_id)
  WHERE (state = 'ISSUED');


-- ---------------------------------------------------------------------------
-- 3. An offer's state and its stamps agree.
--
--    The pairing rule A6 learned on purchase orders and B1 repeated on fee
--    schedules: a terminal state must carry when it closed, and a live one
--    must not. Otherwise "when did this offer lapse" is answerable only by
--    reading the audit log and hoping.
-- ---------------------------------------------------------------------------

ALTER TABLE admission_offers
  ADD CONSTRAINT chk_offer_state_stamps CHECK (
    (state = 'ISSUED' AND closed_at IS NULL AND responded_at IS NULL)
 OR (state = 'ACCEPTED' AND responded_at IS NOT NULL AND closed_at IS NOT NULL)
 OR (state = 'DECLINED' AND responded_at IS NOT NULL AND closed_at IS NOT NULL)
 OR (state IN ('LAPSED', 'WITHDRAWN') AND closed_at IS NOT NULL)
  );

-- An override is a decision somebody made. Recording that capacity was
-- exceeded without recording who allowed it, and why, is indistinguishable
-- from a capacity check that never ran.
ALTER TABLE admission_offers
  ADD CONSTRAINT chk_offer_override_evidence CHECK (
    NOT overrode_capacity
 OR (overridden_by_id IS NOT NULL
     AND override_reason IS NOT NULL
     AND btrim(override_reason) <> '')
  );

-- A deposit that has been paid must name the receipt that paid it, so the
-- seat deposit reconciles to the cash the cashier took.
ALTER TABLE admission_offers
  ADD CONSTRAINT chk_offer_deposit_receipt CHECK (
    deposit_paid_at IS NULL OR deposit_receipt_id IS NOT NULL);

ALTER TABLE admission_offers
  ADD CONSTRAINT chk_offer_deposit_amount CHECK (
    deposit_required IS NULL OR deposit_required >= 0);


-- ---------------------------------------------------------------------------
-- 4. A committee decision carries its author and its rationale.
--
--    REQ-ADM-CAP-03 requires a recorded rationale on every decision. A REJECT
--    with no reason is the one an applicant will ask about.
-- ---------------------------------------------------------------------------

ALTER TABLE applications
  ADD CONSTRAINT chk_application_decision_complete CHECK (
    decision IS NULL
 OR (decided_by_id IS NOT NULL
     AND decided_at IS NOT NULL
     AND decision_note IS NOT NULL
     AND btrim(decision_note) <> '')
  );

-- An application that reached a decision state must actually carry one.
ALTER TABLE applications
  ADD CONSTRAINT chk_application_state_decision CHECK (
    state NOT IN ('OFFERED', 'WAITLISTED', 'REJECTED') OR decision IS NOT NULL);

-- Only an enrolled application points at a student, and an enrolled one must.
ALTER TABLE applications
  ADD CONSTRAINT chk_application_enrolled_student CHECK (
    (state = 'ENROLLED' AND student_id IS NOT NULL)
 OR (state <> 'ENROLLED' AND student_id IS NULL)
  );

ALTER TABLE applications
  ADD CONSTRAINT chk_application_submitted CHECK (
    state = 'DRAFT' OR submitted_at IS NOT NULL);


-- ---------------------------------------------------------------------------
-- 5. An offer belongs to the quota it consumes.
--
--    The offer names both a programme and a seat quota. If they disagree, the
--    seat is deducted from one programme and the place is held in another —
--    and the counters would look correct on both sides.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_offer_matches_quota()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  q_programme uuid;
  q_batch uuid;
  q_category uuid;
  a_batch uuid;
  a_category uuid;
BEGIN
  SELECT programme_id, batch_id, admission_category_id
    INTO q_programme, q_batch, q_category
    FROM seat_quotas WHERE id = NEW.seat_quota_id;

  IF q_programme IS DISTINCT FROM NEW.programme_id THEN
    RAISE EXCEPTION
      'offer names programme % but consumes a seat from the quota for programme %. The seat would be taken from one programme and the place held in another',
      NEW.programme_id, q_programme
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT batch_id, admission_category_id
    INTO a_batch, a_category
    FROM applications WHERE id = NEW.application_id;

  IF a_batch IS DISTINCT FROM q_batch THEN
    RAISE EXCEPTION
      'the application is for a different intake batch than the quota it would consume'
      USING ERRCODE = 'check_violation';
  END IF;

  IF a_category IS DISTINCT FROM q_category THEN
    RAISE EXCEPTION
      'the application is under a different admission category than the quota it would consume'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offer_matches_quota
  BEFORE INSERT OR UPDATE ON admission_offers
  FOR EACH ROW EXECUTE FUNCTION assert_offer_matches_quota();


-- ---------------------------------------------------------------------------
-- 6. A closed offer is history.
--
--    Once accepted, declined, lapsed or withdrawn, an offer records what
--    happened. Reopening one would resurrect a seat that has since been given
--    to somebody else — the waitlist promotion has already happened.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_offer_not_reopened()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state <> 'ISSUED' AND NEW.state <> OLD.state THEN
    RAISE EXCEPTION
      'offer is already % and cannot be moved to %. By now the seat may have been promoted to a waitlisted applicant; issue a fresh offer instead',
      OLD.state, NEW.state
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_offer_not_reopened
  BEFORE UPDATE ON admission_offers
  FOR EACH ROW EXECUTE FUNCTION assert_offer_not_reopened();


-- ---------------------------------------------------------------------------
-- 7. A seat quota with live offers against it may not be deleted, and its
--    programme, batch and category are fixed.
--
--    Directly replaces `Delete From StudentsVacants Where College=...`. The
--    dimensions are immutable because moving a quota sideways moves every
--    offer already counted against it, silently.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_seat_quota_no_offers
  BEFORE DELETE ON seat_quotas
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants(
    'admission_offers', 'seat_quota_id', 'seat quota');

CREATE OR REPLACE FUNCTION assert_seat_quota_dimensions_fixed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF (NEW.tenant_id, NEW.programme_id, NEW.batch_id, NEW.admission_category_id)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.programme_id, OLD.batch_id, OLD.admission_category_id)
  THEN
    RAISE EXCEPTION
      'a seat quota cannot be moved to a different programme, batch or admission category. Every offer already counted against it would move with it. Deactivate this quota and create the one you meant'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_seat_quota_dimensions_fixed
  BEFORE UPDATE ON seat_quotas
  FOR EACH ROW EXECUTE FUNCTION assert_seat_quota_dimensions_fixed();

CREATE TRIGGER trg_certificate_type_no_applications
  BEFORE DELETE ON certificate_types
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants(
    'applications', 'certificate_type_id', 'certificate type');


-- ---------------------------------------------------------------------------
-- 8. Cross-table references stay inside one tenant.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_seat_quota_same_tenant
  BEFORE INSERT OR UPDATE ON seat_quotas
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'programme_id', 'programmes',
    'batch_id', 'batches',
    'admission_category_id', 'admission_categories');

CREATE TRIGGER trg_eligibility_rule_same_tenant
  BEFORE INSERT OR UPDATE ON eligibility_rules
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'programme_id', 'programmes',
    'certificate_type_id', 'certificate_types');

CREATE TRIGGER trg_application_same_tenant
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'batch_id', 'batches',
    'admission_category_id', 'admission_categories');

CREATE TRIGGER trg_application_refs_same_tenant
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'nationality_id', 'nationalities',
    'certificate_type_id', 'certificate_types',
    'student_id', 'students');

CREATE TRIGGER trg_application_choice_same_tenant
  BEFORE INSERT OR UPDATE ON application_choices
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'application_id', 'applications',
    'programme_id', 'programmes');

CREATE TRIGGER trg_admission_offer_same_tenant
  BEFORE INSERT OR UPDATE ON admission_offers
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'application_id', 'applications',
    'seat_quota_id', 'seat_quotas');

CREATE TRIGGER trg_admission_offer_refs_same_tenant
  BEFORE INSERT OR UPDATE ON admission_offers
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'programme_id', 'programmes',
    'deposit_receipt_id', 'student_receipts');


-- ---------------------------------------------------------------------------
-- 9. Row-level security and grants.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'certificate_types', 'seat_quotas', 'eligibility_rules',
    'applications', 'application_choices', 'admission_offers'
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
