-- CreateEnum
CREATE TYPE "DegreeLevel" AS ENUM ('DIPLOMA', 'BACHELOR', 'MASTER', 'PHD');

-- CreateEnum
CREATE TYPE "TermKind" AS ENUM ('FALL', 'SPRING', 'SUMMER');

-- CreateEnum
CREATE TYPE "AcademicPeriodStatus" AS ENUM ('PLANNED', 'ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "NationalityCategory" AS ENUM ('NATIONAL', 'ARAB', 'FOREIGN');

-- CreateEnum
CREATE TYPE "FeeScheduleStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED');

-- DropIndex
DROP INDEX "uq_budget_line_account_cc";

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "admission_category_id" UUID,
ADD COLUMN     "batch_id" UUID,
ADD COLUMN     "nationality_id" UUID,
ADD COLUMN     "programme_id" UUID;

-- CreateTable
CREATE TABLE "faculties" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "cost_center_id" UUID,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "faculties_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programmes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "faculty_id" UUID NOT NULL,
    "department_id" UUID,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "degree_level" "DegreeLevel" NOT NULL,
    "duration_years" INTEGER NOT NULL,
    "duration_terms" INTEGER NOT NULL,
    "credits_required" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "programmes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_years" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "AcademicPeriodStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academic_terms" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "academic_year_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "kind" "TermKind" NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "registration_closes_on" DATE,
    "status" "AcademicPeriodStatus" NOT NULL DEFAULT 'PLANNED',

    CONSTRAINT "academic_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "admission_year" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admission_categories" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "admission_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nationalities" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "category" "NationalityCategory" NOT NULL DEFAULT 'FOREIGN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "nationalities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_schedules" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "admission_category_id" UUID NOT NULL,
    "nationality_category" "NationalityCategory",
    "currency" CHAR(3) NOT NULL,
    "version_no" INTEGER NOT NULL,
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "status" "FeeScheduleStatus" NOT NULL DEFAULT 'DRAFT',
    "prepared_by_id" UUID NOT NULL,
    "prepared_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "superseded_at" TIMESTAMPTZ(6),
    "note" TEXT,

    CONSTRAINT "fee_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fee_schedule_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fee_schedule_id" UUID NOT NULL,
    "fee_item_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "recurrence" "FeeRecurrence",
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,

    CONSTRAINT "fee_schedule_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faculties_tenant_id_is_active_idx" ON "faculties"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "faculties_tenant_id_code_key" ON "faculties"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "departments_tenant_id_faculty_id_idx" ON "departments"("tenant_id", "faculty_id");

-- CreateIndex
CREATE UNIQUE INDEX "departments_tenant_id_code_key" ON "departments"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "programmes_tenant_id_faculty_id_is_active_idx" ON "programmes"("tenant_id", "faculty_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "programmes_tenant_id_code_key" ON "programmes"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "academic_years_tenant_id_start_date_idx" ON "academic_years"("tenant_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "academic_years_tenant_id_code_key" ON "academic_years"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "academic_terms_tenant_id_start_date_end_date_idx" ON "academic_terms"("tenant_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "academic_terms_academic_year_id_seq_key" ON "academic_terms"("academic_year_id", "seq");

-- CreateIndex
CREATE INDEX "batches_tenant_id_admission_year_idx" ON "batches"("tenant_id", "admission_year");

-- CreateIndex
CREATE UNIQUE INDEX "batches_tenant_id_code_key" ON "batches"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "admission_categories_tenant_id_code_key" ON "admission_categories"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "nationalities_tenant_id_category_idx" ON "nationalities"("tenant_id", "category");

-- CreateIndex
CREATE UNIQUE INDEX "nationalities_tenant_id_code_key" ON "nationalities"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "fee_schedules_tenant_id_programme_id_batch_id_status_idx" ON "fee_schedules"("tenant_id", "programme_id", "batch_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "fee_schedules_tenant_id_programme_id_batch_id_admission_cat_key" ON "fee_schedules"("tenant_id", "programme_id", "batch_id", "admission_category_id", "nationality_category", "version_no");

-- CreateIndex
CREATE INDEX "fee_schedule_lines_tenant_id_fee_item_id_idx" ON "fee_schedule_lines"("tenant_id", "fee_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "fee_schedule_lines_fee_schedule_id_fee_item_id_key" ON "fee_schedule_lines"("fee_schedule_id", "fee_item_id");

-- CreateIndex
CREATE INDEX "students_tenant_id_programme_id_batch_id_idx" ON "students"("tenant_id", "programme_id", "batch_id");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_admission_category_id_fkey" FOREIGN KEY ("admission_category_id") REFERENCES "admission_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_nationality_id_fkey" FOREIGN KEY ("nationality_id") REFERENCES "nationalities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculties" ADD CONSTRAINT "faculties_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "faculties" ADD CONSTRAINT "faculties_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programmes" ADD CONSTRAINT "programmes_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "academic_terms" ADD CONSTRAINT "academic_terms_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admission_categories" ADD CONSTRAINT "admission_categories_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nationalities" ADD CONSTRAINT "nationalities_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_admission_category_id_fkey" FOREIGN KEY ("admission_category_id") REFERENCES "admission_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedule_lines" ADD CONSTRAINT "fee_schedule_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedule_lines" ADD CONSTRAINT "fee_schedule_lines_fee_schedule_id_fkey" FOREIGN KEY ("fee_schedule_id") REFERENCES "fee_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_schedule_lines" ADD CONSTRAINT "fee_schedule_lines_fee_item_id_fkey" FOREIGN KEY ("fee_item_id") REFERENCES "fee_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- Hand-written invariants — Track B1, academic structure and the fee matrix.
--
-- Everything above this line is Prisma's structural diff. Everything below is
-- correctness that Prisma cannot express, and it is the point of the track.
--
-- The legacy fee screen saved like this (frmTuitionFees.vb:89-104):
--
--     Delete From TuitionFees Where Batch=N'<batch>'
--     insert into TuitionFees (Batch,Colleges,Program,TuitionFees,RegFees,...)
--
-- while the grid it re-inserted from was loaded like this (line 48):
--
--     select Distinct Program,TuitionFees,RegFees From TuitionFees
--      where Batch=N'..' and Colleges=N'..' and Type=N'..'
--
-- The DELETE names the batch. The SELECT names the batch, the college AND the
-- admission type. So saving the Medicine/General fee grid deleted the fee
-- schedules of every other faculty and every other admission type in that
-- batch, and re-inserted only the dozen rows on screen. On an autocommit
-- connection, with no transaction, so a failure between the DELETE and the
-- last INSERT left the batch with no fees at all.
--
-- The constraints below make that class of loss unrepresentable: a schedule is
-- never updated in place, never deleted once approved, and two approved
-- versions can never claim the same dates.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. Date sanity.
-- ---------------------------------------------------------------------------

ALTER TABLE academic_years
  ADD CONSTRAINT chk_academic_year_dates CHECK (end_date >= start_date);

ALTER TABLE academic_terms
  ADD CONSTRAINT chk_academic_term_dates CHECK (end_date >= start_date);

-- Registration cannot close before the term opens. It may legitimately close
-- after the term ends: late registration with an override is normal.
ALTER TABLE academic_terms
  ADD CONSTRAINT chk_term_registration_window CHECK (
    registration_closes_on IS NULL OR registration_closes_on >= start_date);

-- Terms within an academic year may not overlap. Same mechanism as fiscal
-- periods: a date that falls in two terms has no answer to "which term is the
-- student registering for".
ALTER TABLE academic_terms
  ADD CONSTRAINT excl_term_no_overlap
  EXCLUDE USING gist (
    academic_year_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  );

ALTER TABLE fee_schedules
  ADD CONSTRAINT chk_fee_schedule_dates CHECK (
    effective_to IS NULL OR effective_to >= effective_from);

ALTER TABLE fee_schedules
  ADD CONSTRAINT chk_fee_schedule_version CHECK (version_no >= 1);

-- A fee cannot be negative. A zero line is legitimate — a waived item that
-- still has to appear on the bill so the student can see it was waived.
ALTER TABLE fee_schedule_lines
  ADD CONSTRAINT chk_fee_schedule_line_amount CHECK (amount >= 0);

ALTER TABLE programmes
  ADD CONSTRAINT chk_programme_duration CHECK (
    duration_years >= 1 AND duration_terms >= 1);

ALTER TABLE batches
  ADD CONSTRAINT chk_batch_admission_year CHECK (
    admission_year BETWEEN 1900 AND 2200);


-- ---------------------------------------------------------------------------
-- 2. Approval state is coherent.
--
--    The pairing rule A6 learned the hard way on purchase orders: a state that
--    claims to be approved must carry who approved it and when, and a state
--    that does not must carry neither. Otherwise "who signed off these fees"
--    is answerable only by asking around.
-- ---------------------------------------------------------------------------

ALTER TABLE fee_schedules
  ADD CONSTRAINT chk_fee_schedule_approval CHECK (
    (status = 'DRAFT'
       AND approved_by_id IS NULL AND approved_at IS NULL AND superseded_at IS NULL)
 OR (status = 'APPROVED'
       AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL AND superseded_at IS NULL)
 OR (status = 'SUPERSEDED'
       AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL AND superseded_at IS NOT NULL)
  );

-- A superseded version must have a closed effective range. An open-ended range
-- on a superseded version is what would let two schedules both claim "today".
ALTER TABLE fee_schedules
  ADD CONSTRAINT chk_fee_schedule_superseded_closed CHECK (
    status <> 'SUPERSEDED' OR effective_to IS NOT NULL);


-- ---------------------------------------------------------------------------
-- 3. One answer per cohort per day.
--
--    This is the constraint the whole track exists for. Two APPROVED schedules
--    for the same programme × batch × admission category × nationality
--    category may not have overlapping effective ranges — so "what did this
--    student owe on the day they registered" has exactly one answer, forever,
--    and a new version cannot silently overwrite the period a prior one
--    already priced.
--
--    DRAFT versions are excluded from the constraint: several may be in
--    preparation at once, and they price nothing until approved. SUPERSEDED
--    ones are NOT excluded. A superseded version still prices the days it was
--    in force — that is the whole point of keeping it — so resolution reads
--    published history by date, and the constraint has to guard that history
--    rather than only the current version.
--
--    `COALESCE(effective_to, 'infinity')` gives an open-ended version an
--    unbounded upper bound, which is what "still in force" means.
--
--    Two constraints rather than one because of the nullable nationality
--    category. NULL is the fallback row and must collide with itself, which a
--    plain `WITH =` will not do — and the obvious fix, keying on
--    `COALESCE(nationality_category::text, '*')`, is rejected outright: casting
--    an enum to text is STABLE, not IMMUTABLE, so it cannot appear in an index
--    expression. Splitting on the null instead keeps both halves exact.
-- ---------------------------------------------------------------------------

-- Schedules priced for a named nationality category.
ALTER TABLE fee_schedules
  ADD CONSTRAINT excl_fee_schedule_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    programme_id WITH =,
    batch_id WITH =,
    admission_category_id WITH =,
    nationality_category WITH =,
    daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
  ) WHERE (status <> 'DRAFT' AND nationality_category IS NOT NULL);

-- And the fallback row that applies to any nationality.
ALTER TABLE fee_schedules
  ADD CONSTRAINT excl_fee_schedule_no_overlap_any
  EXCLUDE USING gist (
    tenant_id WITH =,
    programme_id WITH =,
    batch_id WITH =,
    admission_category_id WITH =,
    daterange(effective_from, COALESCE(effective_to, 'infinity'::date), '[]') WITH &&
  ) WHERE (status <> 'DRAFT' AND nationality_category IS NULL);


-- ---------------------------------------------------------------------------
-- 4. An approved schedule is immutable.
--
--    The direct answer to DELETE-then-reinsert. Once approved, a schedule and
--    its lines cannot be edited or removed by any path. Revision is a new
--    version, and the prior one stays readable beside it — attached to every
--    registration raised under it.
--
--    Superseding is the one permitted transition, and it may touch only the
--    three columns that record it.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_fee_schedule_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION
        'fee schedule %/v% is % and cannot be deleted. A fee schedule that has priced a registration is evidence; supersede it with a new version instead',
        OLD.programme_id, OLD.version_no, OLD.status
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'SUPERSEDED' THEN
    RAISE EXCEPTION
      'fee schedule v% is superseded and is now history. Create a new version rather than editing a closed one',
      OLD.version_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.status = 'APPROVED' THEN
    -- Only the supersession stamp may change, and only into SUPERSEDED.
    IF (NEW.tenant_id, NEW.programme_id, NEW.batch_id, NEW.admission_category_id,
        NEW.nationality_category, NEW.currency, NEW.version_no, NEW.effective_from,
        NEW.prepared_by_id, NEW.approved_by_id, NEW.approved_at)
       IS DISTINCT FROM
       (OLD.tenant_id, OLD.programme_id, OLD.batch_id, OLD.admission_category_id,
        OLD.nationality_category, OLD.currency, OLD.version_no, OLD.effective_from,
        OLD.prepared_by_id, OLD.approved_by_id, OLD.approved_at)
    THEN
      RAISE EXCEPTION
        'fee schedule v% is approved and cannot be edited. Revise it by creating version %, which supersedes this one and leaves it readable',
        OLD.version_no, OLD.version_no + 1
        USING ERRCODE = 'check_violation';
    END IF;

    IF NEW.status NOT IN ('APPROVED', 'SUPERSEDED') THEN
      RAISE EXCEPTION
        'an approved fee schedule cannot return to %. Unapproving it would silently reprice every registration already raised under it',
        NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_fee_schedule_immutable
  BEFORE UPDATE OR DELETE ON fee_schedules
  FOR EACH ROW EXECUTE FUNCTION assert_fee_schedule_immutable();


CREATE OR REPLACE FUNCTION assert_fee_schedule_line_editable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  sched_id uuid;
  sched_status text;
  sched_version int;
BEGIN
  sched_id := COALESCE(NEW.fee_schedule_id, OLD.fee_schedule_id);

  SELECT status::text, version_no INTO sched_status, sched_version
    FROM fee_schedules WHERE id = sched_id;

  -- A cascading delete of a DRAFT parent removes its lines legitimately; a
  -- schedule that no longer exists cannot be protected by this rule.
  IF sched_status IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF sched_status <> 'DRAFT' THEN
    RAISE EXCEPTION
      'fee schedule v% is % — its lines are fixed. This is the rule the legacy DELETE-and-reinsert save had no way to express',
      sched_version, sched_status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_fee_schedule_line_editable
  BEFORE INSERT OR UPDATE OR DELETE ON fee_schedule_lines
  FOR EACH ROW EXECUTE FUNCTION assert_fee_schedule_line_editable();


-- ---------------------------------------------------------------------------
-- 5. An approved schedule must actually price something.
--
--    Deferred to commit, so lines may be added after the header within one
--    transaction — the same shape as the voucher balance check.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_fee_schedule_has_lines()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  IF NEW.status <> 'APPROVED' THEN
    RETURN NEW;
  END IF;

  SELECT count(*) INTO n FROM fee_schedule_lines WHERE fee_schedule_id = NEW.id;
  IF n = 0 THEN
    RAISE EXCEPTION
      'fee schedule v% was approved with no fee lines. An empty schedule bills a student nothing and looks exactly like a correct one',
      NEW.version_no
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_fee_schedule_has_lines
  AFTER INSERT OR UPDATE ON fee_schedules
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION assert_fee_schedule_has_lines();


-- ---------------------------------------------------------------------------
-- 6. Structure is deactivated, never deleted, once anything points at it.
--
--    The legacy batch list ran `Delete From AcademicYear Where Batch=N'..'`
--    (frmListBatches.vb:73) with no check for students admitted under it. The
--    rule here is the one A1 applied to accounts: history keeps its referent.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_no_dependants()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  child_table text := TG_ARGV[0];
  child_column text := TG_ARGV[1];
  label text := TG_ARGV[2];
  n bigint;
BEGIN
  EXECUTE format('SELECT count(*) FROM %I WHERE %I = $1', child_table, child_column)
    INTO n USING OLD.id;

  IF n > 0 THEN
    RAISE EXCEPTION
      'cannot delete this % — % row(s) in % still refer to it. Deactivate it instead; deleting it would orphan records that are still being reported on',
      label, n, child_table
      -- Deliberately check_violation and not foreign_key_violation: the client
      -- driver recognises the latter and replaces this message with its own
      -- generic one, which tells the user nothing about what to do instead.
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_faculty_no_dependants
  BEFORE DELETE ON faculties
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants('programmes', 'faculty_id', 'faculty');

CREATE TRIGGER trg_programme_no_students
  BEFORE DELETE ON programmes
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants('students', 'programme_id', 'programme');

CREATE TRIGGER trg_programme_no_schedules
  BEFORE DELETE ON programmes
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants('fee_schedules', 'programme_id', 'programme');

CREATE TRIGGER trg_batch_no_students
  BEFORE DELETE ON batches
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants('students', 'batch_id', 'batch');

CREATE TRIGGER trg_batch_no_schedules
  BEFORE DELETE ON batches
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants('fee_schedules', 'batch_id', 'batch');

CREATE TRIGGER trg_admission_category_no_students
  BEFORE DELETE ON admission_categories
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants('students', 'admission_category_id', 'admission category');

CREATE TRIGGER trg_nationality_no_students
  BEFORE DELETE ON nationalities
  FOR EACH ROW EXECUTE FUNCTION assert_no_dependants('students', 'nationality_id', 'nationality');


-- ---------------------------------------------------------------------------
-- 7. Cross-table references stay inside one tenant.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_department_same_tenant
  BEFORE INSERT OR UPDATE ON departments
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('faculty_id', 'faculties');

CREATE TRIGGER trg_programme_same_tenant
  BEFORE INSERT OR UPDATE ON programmes
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'faculty_id', 'faculties',
    'department_id', 'departments');

CREATE TRIGGER trg_faculty_same_tenant
  BEFORE INSERT OR UPDATE ON faculties
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('cost_center_id', 'cost_centers');

CREATE TRIGGER trg_academic_term_same_tenant
  BEFORE INSERT OR UPDATE ON academic_terms
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('academic_year_id', 'academic_years');

CREATE TRIGGER trg_fee_schedule_same_tenant
  BEFORE INSERT OR UPDATE ON fee_schedules
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'programme_id', 'programmes',
    'batch_id', 'batches',
    'admission_category_id', 'admission_categories');

CREATE TRIGGER trg_fee_schedule_line_same_tenant
  BEFORE INSERT OR UPDATE ON fee_schedule_lines
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'fee_schedule_id', 'fee_schedules',
    'fee_item_id', 'fee_items');

CREATE TRIGGER trg_student_academic_same_tenant
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'programme_id', 'programmes',
    'batch_id', 'batches');

CREATE TRIGGER trg_student_admission_same_tenant
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'admission_category_id', 'admission_categories',
    'nationality_id', 'nationalities');


-- ---------------------------------------------------------------------------
-- 8. Row-level security and grants.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'faculties', 'departments', 'programmes',
    'academic_years', 'academic_terms', 'batches',
    'admission_categories', 'nationalities',
    'fee_schedules', 'fee_schedule_lines'
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
