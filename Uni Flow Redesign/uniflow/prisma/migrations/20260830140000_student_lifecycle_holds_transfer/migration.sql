-- CreateEnum
CREATE TYPE "HoldType" AS ENUM ('FINANCIAL', 'ACADEMIC', 'DISCIPLINARY', 'DOCUMENTARY');

-- CreateEnum
CREATE TYPE "StatusConsequence" AS ENUM ('RETAIN_CHARGES', 'REVERSE_TERM_BILLING', 'APPLY_REFUND_POLICY', 'NONE');

-- CreateEnum
CREATE TYPE "RefundElection" AS ENUM ('RETAIN_AS_CREDIT', 'REFUND');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "arrears_grace_days" INTEGER NOT NULL DEFAULT 14,
ADD COLUMN     "arrears_block_threshold" DECIMAL(19,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "student_status_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "from_status" "StudentStatus",
    "to_status" "StudentStatus" NOT NULL,
    "effective_date" DATE NOT NULL,
    "reason" TEXT NOT NULL,
    "consequence" "StatusConsequence" NOT NULL DEFAULT 'NONE',
    "requested_by" TEXT,
    "document_id" UUID,
    "reversal_header_id" UUID,
    "retention_header_id" UUID,
    "amount_reversed" DECIMAL(19,4),
    "amount_refundable" DECIMAL(19,4),
    "amount_retained" DECIMAL(19,4),
    "refund_election" "RefundElection",
    "approved_by_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holds" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "hold_type" "HoldType" NOT NULL,
    "reason" TEXT NOT NULL,
    "blocks_registration" BOOLEAN NOT NULL DEFAULT true,
    "effective_from" DATE NOT NULL,
    "placed_by_id" UUID NOT NULL,
    "placed_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clearance_role_id" UUID,
    "cleared_by_id" UUID,
    "cleared_at" TIMESTAMPTZ(6),
    "clearance_note" TEXT,

    CONSTRAINT "holds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_programme_history" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "from_programme_id" UUID,
    "to_programme_id" UUID NOT NULL,
    "effective_date" DATE NOT NULL,
    "academic_term_id" UUID,
    "reason" TEXT NOT NULL,
    "reversed_registration_id" UUID,
    "new_registration_id" UUID,
    "approved_by_id" UUID,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_programme_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_policies" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refund_policies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refund_policy_bands" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "within_days" INTEGER NOT NULL,
    "refundable_pct" DECIMAL(7,4) NOT NULL,

    CONSTRAINT "refund_policy_bands_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_status_history_tenant_id_student_id_effective_date_idx" ON "student_status_history"("tenant_id", "student_id", "effective_date");

-- CreateIndex
CREATE INDEX "student_status_history_tenant_id_to_status_effective_date_idx" ON "student_status_history"("tenant_id", "to_status", "effective_date");

-- CreateIndex
CREATE INDEX "holds_tenant_id_student_id_cleared_at_idx" ON "holds"("tenant_id", "student_id", "cleared_at");

-- CreateIndex
CREATE INDEX "holds_tenant_id_hold_type_cleared_at_idx" ON "holds"("tenant_id", "hold_type", "cleared_at");

-- CreateIndex
CREATE UNIQUE INDEX "student_programme_history_reversed_registration_id_key" ON "student_programme_history"("reversed_registration_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_programme_history_new_registration_id_key" ON "student_programme_history"("new_registration_id");

-- CreateIndex
CREATE INDEX "student_programme_history_tenant_id_student_id_effective_da_idx" ON "student_programme_history"("tenant_id", "student_id", "effective_date");

-- CreateIndex
CREATE UNIQUE INDEX "refund_policies_tenant_id_code_key" ON "refund_policies"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "refund_policy_bands_tenant_id_policy_id_idx" ON "refund_policy_bands"("tenant_id", "policy_id");

-- CreateIndex
CREATE UNIQUE INDEX "refund_policy_bands_policy_id_within_days_key" ON "refund_policy_bands"("policy_id", "within_days");

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "student_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_reversal_header_id_fkey" FOREIGN KEY ("reversal_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_retention_header_id_fkey" FOREIGN KEY ("retention_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_status_history" ADD CONSTRAINT "student_status_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_placed_by_id_fkey" FOREIGN KEY ("placed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_cleared_by_id_fkey" FOREIGN KEY ("cleared_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holds" ADD CONSTRAINT "holds_clearance_role_id_fkey" FOREIGN KEY ("clearance_role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_from_programme_id_fkey" FOREIGN KEY ("from_programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_to_programme_id_fkey" FOREIGN KEY ("to_programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_academic_term_id_fkey" FOREIGN KEY ("academic_term_id") REFERENCES "academic_terms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_reversed_registration_id_fkey" FOREIGN KEY ("reversed_registration_id") REFERENCES "semester_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_new_registration_id_fkey" FOREIGN KEY ("new_registration_id") REFERENCES "semester_registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_programme_history" ADD CONSTRAINT "student_programme_history_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_policies" ADD CONSTRAINT "refund_policies_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_policy_bands" ADD CONSTRAINT "refund_policy_bands_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_policy_bands" ADD CONSTRAINT "refund_policy_bands_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "refund_policies"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- ===========================================================================
-- Student lifecycle, holds and transfer invariants
-- (SRS Module 14, REQ-REG-04, REQ-REG-06, REQ-FEE-03 — Track B5)
--
-- Two legacy screens are the baseline here, and between them they lose every
-- fact this migration exists to keep.
--
-- `frmStudentProfiles.vb` decides a student's standing by WHICH TABLE THE ROW
-- IS IN:
--
--     If Me.ComboBox1.Text = "يقبل" Then
--         Delete From StudentsProfilees Where StudentIndex=N'<batch><id>'
--         Insert Into StudentsProfilees (...)
--     Else
--         Delete From StudentsProfilesIndecent Where StudentIndex=N'<id>'
--         Insert Into StudentsProfilesIndecent (..., ReasonofIndecent, ...)
--     End If
--     Update StdForm Set CH=1 Where UnivID=<id>            -- both branches
--
-- (frmStudentProfiles.vb:232-289). Three things follow. Each branch deletes
-- only from the table it is about to write, so a student whose verdict is
-- changed exists in **both** tables at once. The two branches key the row
-- differently — accepted by `TxtYear + txtStdIndex`, the rejected branch's
-- DELETE by `txtStdIndex` alone while its INSERT writes the prefixed value —
-- so the rejected branch's delete never matches its own insert and a student
-- rejected twice gets two rows. And `CH=1` is set either way, so the
-- admission form cannot tell an accepted student from a rejected one.
-- `' Trans.Commit()` is commented out; the connection is on autocommit.
--
-- `frmTransferStudent.vb` moves a student between programmes by destroying
-- the evidence:
--
--     Delete from Registrationees where StudentIndex=.. and Program=.. and AcademicYear=..
--     update StudentsProfilees set Program=@Program Where StudentIndex=@StudentIndex
--
-- (lines 183-190). The registration under the old programme is deleted rather
-- than reversed, and the programme on the student row is overwritten with no
-- effective date and no history — so a prior year's record, read back through
-- the student, reports the programme they transferred *to*.
--
-- Everything below makes those states unrepresentable.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. The status chain is closed, and it is append-only.
--
--    `from_status` must equal the student's standing at the moment the row is
--    written — so history cannot fork, and a transition cannot be invented
--    from a status the student was never in. A transition may not be
--    back-dated before the latest one already recorded, because that would
--    silently rewrite the answer to "who was Active in Fall 2026".
-- ---------------------------------------------------------------------------

ALTER TABLE student_status_history ADD CONSTRAINT chk_status_reasoned CHECK (
  btrim(reason) <> ''
);

ALTER TABLE student_status_history ADD CONSTRAINT chk_status_moves CHECK (
  from_status IS NULL OR from_status <> to_status
);

ALTER TABLE student_status_history ADD CONSTRAINT chk_status_amounts CHECK (
  (amount_reversed   IS NULL OR amount_reversed   >= 0)
  AND (amount_refundable IS NULL OR amount_refundable >= 0)
  AND (amount_retained   IS NULL OR amount_retained   >= 0)
);

CREATE OR REPLACE FUNCTION assert_status_chain()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  current_status text;
  latest         DATE;
  student_no     text;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RAISE EXCEPTION
      'a status change is a record of something that happened and is not edited or deleted. Record the correcting transition instead'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT s.status::text, s.student_no INTO current_status, student_no
    FROM students s WHERE s.id = NEW.student_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no such student' USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.from_status IS NOT NULL AND NEW.from_status::text <> current_status THEN
    RAISE EXCEPTION
      'this transition says % was % but the record says %. A status history that does not chain is a history of nothing',
      student_no, lower(replace(NEW.from_status::text, '_', ' ')),
      lower(replace(current_status, '_', ' '))
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT max(h.effective_date) INTO latest
    FROM student_status_history h WHERE h.student_id = NEW.student_id;

  IF latest IS NOT NULL AND NEW.effective_date < latest THEN
    RAISE EXCEPTION
      'this transition takes effect on %, before the % already on file for %. Back-dating behind a recorded change rewrites who was active in a term that has already been reported',
      NEW.effective_date, latest, student_no
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_status_chain
  BEFORE INSERT OR UPDATE OR DELETE ON student_status_history
  FOR EACH ROW EXECUTE FUNCTION assert_status_chain();


-- ---------------------------------------------------------------------------
-- 2. A withdrawal's arithmetic adds up.
--
--    Refundable + retained is what the term was billed. The legacy transfer
--    screen reversed whatever two numbers happened to be in its text boxes,
--    one of which — the registration fee — is the string literal "1,030.00",
--    written a second time as "1,030,00" in the other loader.
-- ---------------------------------------------------------------------------

ALTER TABLE student_status_history ADD CONSTRAINT chk_refund_split CHECK (
  amount_reversed IS NULL
  OR amount_refundable IS NULL
  OR amount_retained IS NULL
  OR amount_reversed = amount_refundable + amount_retained
);

-- A refund election only means something where a refund was computed.
ALTER TABLE student_status_history ADD CONSTRAINT chk_refund_election CHECK (
  refund_election IS NULL OR consequence = 'APPLY_REFUND_POLICY'
);


-- ---------------------------------------------------------------------------
-- 3. A hold that has been cleared says who cleared it and when.
--
--    Both, or neither. A `cleared_at` with no `cleared_by_id` is the legacy
--    `Employee` column: evidence that something happened and none of who did
--    it.
-- ---------------------------------------------------------------------------

ALTER TABLE holds ADD CONSTRAINT chk_hold_reasoned CHECK (btrim(reason) <> '');

ALTER TABLE holds ADD CONSTRAINT chk_hold_clearance CHECK (
  (cleared_at IS NULL AND cleared_by_id IS NULL)
  OR (cleared_at IS NOT NULL AND cleared_by_id IS NOT NULL)
);

CREATE OR REPLACE FUNCTION assert_hold_not_reopened()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'a hold is not deleted. Clear it — that records who lifted it and why, which is the only evidence that the block was ever satisfied'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.cleared_at IS NOT NULL THEN
    IF NEW.cleared_at IS NULL THEN
      RAISE EXCEPTION
        'this hold was cleared on %. Place a fresh hold rather than reopening one that somebody signed off',
        OLD.cleared_at
        USING ERRCODE = 'check_violation';
    END IF;
    IF (NEW.reason, NEW.hold_type, NEW.student_id, NEW.placed_by_id,
        NEW.cleared_by_id, NEW.cleared_at)
       IS DISTINCT FROM
       (OLD.reason, OLD.hold_type, OLD.student_id, OLD.placed_by_id,
        OLD.cleared_by_id, OLD.cleared_at) THEN
      RAISE EXCEPTION 'a cleared hold is history and cannot be edited'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_hold_not_reopened
  BEFORE UPDATE OR DELETE ON holds
  FOR EACH ROW EXECUTE FUNCTION assert_hold_not_reopened();

-- Whoever placed a hold does not clear it. One person doing both is not a
-- control, it is a note to self — and a financial hold that the person who
-- raised it can lift is exactly the arrears report the legacy build had.
ALTER TABLE holds ADD CONSTRAINT chk_hold_second_signature CHECK (
  cleared_by_id IS NULL OR cleared_by_id <> placed_by_id
);


-- ---------------------------------------------------------------------------
-- 4. A transfer actually moves the student, and is not deleted.
-- ---------------------------------------------------------------------------

ALTER TABLE student_programme_history ADD CONSTRAINT chk_transfer_moves CHECK (
  from_programme_id IS NULL OR from_programme_id <> to_programme_id
);

ALTER TABLE student_programme_history ADD CONSTRAINT chk_transfer_reasoned CHECK (
  btrim(reason) <> ''
);

CREATE OR REPLACE FUNCTION assert_transfer_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'a transfer is not deleted. `frmTransferStudent` deleted the old programme''s registration, which is why no legacy record can be reconciled to the programme it was actually billed under'
      USING ERRCODE = 'check_violation';
  END IF;

  -- The one permitted change: attaching the registration raised under the new
  -- programme, once, after the transfer row exists. The same shape as a
  -- registration line taking its charge id in B4 — a stamp, not an edit.
  IF (NEW.tenant_id, NEW.student_id, NEW.from_programme_id, NEW.to_programme_id,
      NEW.effective_date, NEW.academic_term_id, NEW.reason,
      NEW.reversed_registration_id, NEW.approved_by_id, NEW.created_by_id)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.student_id, OLD.from_programme_id, OLD.to_programme_id,
      OLD.effective_date, OLD.academic_term_id, OLD.reason,
      OLD.reversed_registration_id, OLD.approved_by_id, OLD.created_by_id) THEN
    RAISE EXCEPTION
      'a recorded transfer is not edited. Record the transfer back, so both moves are on file'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.new_registration_id IS NOT NULL
     AND NEW.new_registration_id IS DISTINCT FROM OLD.new_registration_id THEN
    RAISE EXCEPTION
      'this transfer is already attached to a registration. One transfer raises one'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transfer_immutable
  BEFORE UPDATE OR DELETE ON student_programme_history
  FOR EACH ROW EXECUTE FUNCTION assert_transfer_immutable();


-- ---------------------------------------------------------------------------
-- 5. A refund policy is a set of bands that mean something.
-- ---------------------------------------------------------------------------

ALTER TABLE refund_policy_bands ADD CONSTRAINT chk_refund_band CHECK (
  within_days >= 0 AND refundable_pct >= 0 AND refundable_pct <= 100
);

-- One active refund policy per tenant. Two would make "how much comes back"
-- a question with two answers, which is the same defect as two approved fee
-- schedules covering one day.
CREATE UNIQUE INDEX uq_one_active_refund_policy
  ON refund_policies (tenant_id)
  WHERE (is_active);

CREATE OR REPLACE FUNCTION assert_refund_policy_has_bands(p_policy_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  n int;
  active boolean;
BEGIN
  SELECT is_active INTO active FROM refund_policies WHERE id = p_policy_id;
  IF NOT FOUND OR NOT active THEN RETURN; END IF;

  SELECT count(*) INTO n FROM refund_policy_bands WHERE policy_id = p_policy_id;
  IF n = 0 THEN
    RAISE EXCEPTION
      'an active refund policy with no bands refunds nothing to everybody, and looks exactly like a policy'
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_check_refund_policy_bands()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_refund_policy_has_bands(COALESCE(NEW.policy_id, OLD.policy_id));
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_refund_band_present
  AFTER INSERT OR UPDATE OR DELETE ON refund_policy_bands
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_refund_policy_bands();

CREATE OR REPLACE FUNCTION trg_check_refund_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_refund_policy_has_bands(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_refund_policy_banded
  AFTER INSERT OR UPDATE OF is_active ON refund_policies
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_check_refund_policy();


-- ---------------------------------------------------------------------------
-- 6. Cross-table references stay inside one tenant.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_status_history_same_tenant
  BEFORE INSERT OR UPDATE ON student_status_history
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students',
    'document_id', 'student_documents');

CREATE TRIGGER trg_hold_same_tenant
  BEFORE INSERT OR UPDATE ON holds
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students',
    'clearance_role_id', 'roles');

CREATE TRIGGER trg_transfer_same_tenant
  BEFORE INSERT OR UPDATE ON student_programme_history
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students',
    'from_programme_id', 'programmes',
    'to_programme_id', 'programmes',
    'academic_term_id', 'academic_terms',
    'reversed_registration_id', 'semester_registrations',
    'new_registration_id', 'semester_registrations');

CREATE TRIGGER trg_refund_band_same_tenant
  BEFORE INSERT OR UPDATE ON refund_policy_bands
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'policy_id', 'refund_policies');


-- ---------------------------------------------------------------------------
-- 7. Opening status rows for students who predate this module.
--
--    `statusOn(date)` has to be total: every student must have a standing on
--    every day since their record existed, or "who was active in Fall 2026"
--    answers for some of the intake and silently omits the rest. Students
--    created by A3 and B2-B3 have no history, so they get an opening row
--    dated from their admission — `created_by_id` NULL, which is what an
--    opening balance looks like in a history table.
-- ---------------------------------------------------------------------------

INSERT INTO student_status_history
  (id, tenant_id, student_id, from_status, to_status, effective_date, reason,
   consequence, created_by_id, created_at)
SELECT gen_random_uuid(), s.tenant_id, s.id, NULL, s.status,
       COALESCE(s.admitted_on, s.created_at::date), 'Opening record',
       'NONE', NULL, s.created_at
  FROM students s
 WHERE NOT EXISTS (
   SELECT 1 FROM student_status_history h WHERE h.student_id = s.id
 );


-- ---------------------------------------------------------------------------
-- 8. Row-level security and grants.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'student_status_history', 'holds', 'student_programme_history',
    'refund_policies', 'refund_policy_bands'
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
