-- Trigram search over normalised names (REQ-ST-03). The legacy search was
-- `StdFirName like N'<typed>%'` — a prefix match on the FIRST name only, so
-- searching a family name found nothing at all.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "CalendarSystem" AS ENUM ('GREGORIAN', 'HIJRI');

-- CreateEnum
CREATE TYPE "BloodGroup" AS ENUM ('A_POS', 'A_NEG', 'B_POS', 'B_NEG', 'AB_POS', 'AB_NEG', 'O_POS', 'O_NEG');

-- CreateEnum
CREATE TYPE "ScreeningResult" AS ENUM ('NOT_TESTED', 'NEGATIVE', 'POSITIVE');

-- CreateEnum
CREATE TYPE "FitnessVerdict" AS ENUM ('FIT', 'CONDITIONAL', 'UNFIT');

-- CreateEnum
CREATE TYPE "DocumentState" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "name_ar_1" TEXT,
ADD COLUMN     "name_ar_2" TEXT,
ADD COLUMN     "name_ar_3" TEXT,
ADD COLUMN     "name_ar_4" TEXT,
ADD COLUMN     "name_en_1" TEXT,
ADD COLUMN     "name_en_2" TEXT,
ADD COLUMN     "name_en_3" TEXT,
ADD COLUMN     "name_en_4" TEXT;

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "gender" "Gender",
    "date_of_birth" DATE,
    "birth_calendar" "CalendarSystem",
    "place_of_birth" TEXT,
    "religion" TEXT,
    "marital_status" "MaritalStatus",
    "passport_no" TEXT,
    "passport_expiry" DATE,
    "email" TEXT,
    "phone" TEXT,
    "whatsapp" TEXT,
    "address" TEXT,
    "guardian_name" TEXT,
    "guardian_relationship" TEXT,
    "guardian_occupation" TEXT,
    "guardian_phone" TEXT,
    "guardian_address" TEXT,
    "emergency_name" TEXT,
    "emergency_phone" TEXT,
    "school_name" TEXT,
    "certificate_type_id" UUID,
    "certificate_seat_no" TEXT,
    "certificate_year" INTEGER,
    "certificate_score" DECIMAL(9,3),
    "updated_by_id" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_types" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "requires_expiry" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "document_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programme_document_requirements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "programme_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "programme_document_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_documents" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "document_type_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "issued_on" DATE,
    "expires_on" DATE,
    "state" "DocumentState" NOT NULL DEFAULT 'PENDING',
    "verified_by_id" UUID,
    "verified_at" TIMESTAMPTZ(6),
    "rejection_reason" TEXT,
    "superseded_at" TIMESTAMPTZ(6),
    "uploaded_by_id" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "exam_date" DATE NOT NULL,
    "blood_group" "BloodGroup",
    "hepatitis_b" "ScreeningResult" NOT NULL DEFAULT 'NOT_TESTED',
    "hiv" "ScreeningResult" NOT NULL DEFAULT 'NOT_TESTED',
    "vaccinations" TEXT[],
    "chronic_conditions" TEXT,
    "allergies" TEXT,
    "officer_notes" TEXT,
    "verdict" "FitnessVerdict" NOT NULL,
    "verdict_note" TEXT,
    "valid_until" DATE,
    "medical_officer" TEXT NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "recorded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "superseded_at" TIMESTAMPTZ(6),

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_student_id_key" ON "student_profiles"("student_id");

-- CreateIndex
CREATE INDEX "student_profiles_tenant_id_idx" ON "student_profiles"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "document_types_tenant_id_code_key" ON "document_types"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "programme_document_requirements_tenant_id_programme_id_docu_key" ON "programme_document_requirements"("tenant_id", "programme_id", "document_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_documents_storage_key_key" ON "student_documents"("storage_key");

-- CreateIndex
CREATE INDEX "student_documents_tenant_id_student_id_idx" ON "student_documents"("tenant_id", "student_id");

-- CreateIndex
CREATE INDEX "student_documents_tenant_id_state_expires_on_idx" ON "student_documents"("tenant_id", "state", "expires_on");

-- CreateIndex
CREATE INDEX "medical_records_tenant_id_student_id_exam_date_idx" ON "medical_records"("tenant_id", "student_id", "exam_date");

-- CreateIndex
CREATE INDEX "students_search_key_idx" ON "students" USING GIN ("search_key" gin_trgm_ops);

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_certificate_type_id_fkey" FOREIGN KEY ("certificate_type_id") REFERENCES "certificate_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_document_requirements" ADD CONSTRAINT "programme_document_requirements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_document_requirements" ADD CONSTRAINT "programme_document_requirements_programme_id_fkey" FOREIGN KEY ("programme_id") REFERENCES "programmes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "programme_document_requirements" ADD CONSTRAINT "programme_document_requirements_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_document_type_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_documents" ADD CONSTRAINT "student_documents_verified_by_id_fkey" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===========================================================================
-- B3 invariants — student profile, documents and medical records.
--
-- Everything below is hand-written: Prisma cannot express CHECK constraints,
-- partial unique indexes, triggers or row-level security. These are the rules
-- that make the tables above mean what their column names claim, and they are
-- enforced for every writer including one holding a direct psql session.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A name is four parts or none, per language — and never blank.
--
--    The legacy code composed names as `x = x1 + " " + x2 + " " + x3 + " " +
--    x4` in four separate screens, over columns that were nullable. In VB a
--    DBNull in that expression throws, so one student missing a fourth name
--    broke the whole list load; where it did not throw it produced a name with
--    a double space in the middle, which then failed every exact-match search.
--
--    Half a name is worse than no name because it invites exactly that.
-- ---------------------------------------------------------------------------

ALTER TABLE students ADD CONSTRAINT chk_student_name_parts_ar CHECK (
  num_nonnulls(name_ar_1, name_ar_2, name_ar_3, name_ar_4) = 0
  OR (num_nonnulls(name_ar_1, name_ar_2, name_ar_3, name_ar_4) = 4
      AND btrim(name_ar_1) <> '' AND btrim(name_ar_2) <> ''
      AND btrim(name_ar_3) <> '' AND btrim(name_ar_4) <> '')
);

ALTER TABLE students ADD CONSTRAINT chk_student_name_parts_en CHECK (
  num_nonnulls(name_en_1, name_en_2, name_en_3, name_en_4) = 0
  OR (num_nonnulls(name_en_1, name_en_2, name_en_3, name_en_4) = 4
      AND btrim(name_en_1) <> '' AND btrim(name_en_2) <> ''
      AND btrim(name_en_3) <> '' AND btrim(name_en_4) <> '')
);


-- ---------------------------------------------------------------------------
-- 2. Where the parts exist, the full name is exactly the parts.
--
--    Two representations of one fact is the shape of every reconciliation
--    problem in this project's legacy audit. The full name stays canonical
--    because receipts, certificates and the sub-ledger quote it and because a
--    student admitted before Track B has no parts; the parts are checked
--    against it rather than the other way round.
--
--    Whitespace is normalised on both sides before comparing, so a name stored
--    with a stray double space is not rejected for a difference nobody can see.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_student_name_composed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  composed text;
  stored   text;
BEGIN
  IF NEW.name_ar_1 IS NOT NULL THEN
    composed := btrim(concat_ws(' ', btrim(NEW.name_ar_1), btrim(NEW.name_ar_2),
                                     btrim(NEW.name_ar_3), btrim(NEW.name_ar_4)));
    stored   := regexp_replace(btrim(NEW.full_name_ar), '\s+', ' ', 'g');
    IF stored IS DISTINCT FROM composed THEN
      RAISE EXCEPTION
        'Arabic full name "%" does not match its four parts, which compose to "%". The displayed name and the parts it is made of cannot disagree',
        NEW.full_name_ar, composed
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.name_en_1 IS NOT NULL THEN
    composed := btrim(concat_ws(' ', btrim(NEW.name_en_1), btrim(NEW.name_en_2),
                                     btrim(NEW.name_en_3), btrim(NEW.name_en_4)));
    stored   := regexp_replace(btrim(NEW.full_name_en), '\s+', ' ', 'g');
    IF stored IS DISTINCT FROM composed THEN
      RAISE EXCEPTION
        'English full name "%" does not match its four parts, which compose to "%". The displayed name and the parts it is made of cannot disagree',
        NEW.full_name_en, composed
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_student_name_composed
  BEFORE INSERT OR UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION assert_student_name_composed();


-- ---------------------------------------------------------------------------
-- 3. The four fee-matrix dimensions may be filled in, never emptied.
--
--    Deferred from B1, resolved here. They stay nullable because A3 created
--    students before Track B existed and a cashier must still be able to take
--    money from one of them; what must not happen is a student who has a
--    programme losing it, because `resolveFeeSchedule` would then silently
--    stop finding the schedule that has been pricing them all year.
--
--    Making them NOT NULL is the wrong fix: it would refuse the backfill
--    itself, which is the only thing that can eventually make them mandatory.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_student_dimensions_not_cleared()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.programme_id IS NOT NULL AND NEW.programme_id IS NULL THEN
    RAISE EXCEPTION 'a student''s programme cannot be cleared once set — transfer them instead, so the change carries an effective date and a reason'
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.batch_id IS NOT NULL AND NEW.batch_id IS NULL THEN
    RAISE EXCEPTION 'a student''s batch cannot be cleared once set — it is what the fee matrix prices them on'
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.admission_category_id IS NOT NULL AND NEW.admission_category_id IS NULL THEN
    RAISE EXCEPTION 'a student''s admission category cannot be cleared once set — it is what the fee matrix prices them on'
      USING ERRCODE = 'check_violation';
  END IF;
  IF OLD.nationality_id IS NOT NULL AND NEW.nationality_id IS NULL THEN
    RAISE EXCEPTION 'a student''s nationality cannot be cleared once set — it is what the fee matrix prices them on'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_student_dimensions_not_cleared
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION assert_student_dimensions_not_cleared();


-- ---------------------------------------------------------------------------
-- 4. One live document per type per student. Re-uploading supersedes.
--
--    The direct answer to `Delete From StudentsProfilees Where StudentIndex=…`
--    followed by an insert, outside any transaction — the third screen in the
--    legacy codebase found doing this. A replaced passport scan is evidence of
--    what was checked last year; deleting it destroys the only record that the
--    check happened.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX uq_one_live_document_per_type
  ON student_documents (tenant_id, student_id, document_type_id)
  WHERE (superseded_at IS NULL);


-- ---------------------------------------------------------------------------
-- 5. A verification carries its evidence, and a rejection carries its reason.
-- ---------------------------------------------------------------------------

ALTER TABLE student_documents ADD CONSTRAINT chk_document_state_evidence CHECK (
  (state <> 'VERIFIED' OR (verified_by_id IS NOT NULL AND verified_at IS NOT NULL))
  AND (state <> 'REJECTED' OR (verified_by_id IS NOT NULL AND verified_at IS NOT NULL
       AND rejection_reason IS NOT NULL AND btrim(rejection_reason) <> ''))
  AND (state <> 'PENDING' OR (verified_by_id IS NULL AND verified_at IS NULL))
);

-- The one control that makes verification mean anything. A certificate
-- uploaded and marked verified by the same person has been checked by nobody,
-- and forging one is the cheapest fraud available against an admissions
-- office. The legacy tables carried a single `Employee` column, overwritten on
-- every save, which recorded neither.
ALTER TABLE student_documents ADD CONSTRAINT chk_document_verifier_not_uploader CHECK (
  verified_by_id IS NULL OR verified_by_id <> uploaded_by_id
);

ALTER TABLE student_documents ADD CONSTRAINT chk_document_dates CHECK (
  expires_on IS NULL OR issued_on IS NULL OR expires_on > issued_on
);

ALTER TABLE student_documents ADD CONSTRAINT chk_document_bytes CHECK (
  byte_size > 0 AND sha256 ~ '^[0-9a-f]{64}$'
);


-- ---------------------------------------------------------------------------
-- 6. A document of a type that expires must say when.
--
--    Cross-table, so a trigger rather than a CHECK. A residence permit with no
--    expiry is a permit nobody will ever be prompted to chase, which is how a
--    university discovers in June that a third of its foreign students are out
--    of status.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_document_expiry_present()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  needs_expiry boolean;
  type_name    text;
BEGIN
  SELECT requires_expiry, name_en INTO needs_expiry, type_name
    FROM document_types WHERE id = NEW.document_type_id;

  IF needs_expiry AND NEW.expires_on IS NULL THEN
    RAISE EXCEPTION
      '% expires, so the document must record when. Without it nothing can tell you the document has lapsed',
      type_name
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_expiry_present
  BEFORE INSERT OR UPDATE ON student_documents
  FOR EACH ROW EXECUTE FUNCTION assert_document_expiry_present();


-- ---------------------------------------------------------------------------
-- 7. A superseded document is frozen, and a checked one is not deleted.
--
--    Deleting a verified document destroys the evidence that a verification
--    took place. Superseding is the replacement path and it keeps both.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION assert_document_history_intact()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state <> 'PENDING' THEN
      RAISE EXCEPTION
        'document % has been % and cannot be deleted. Upload a replacement, which supersedes it and keeps both',
        OLD.file_name, lower(OLD.state::text)
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION
      'document % was superseded on % and is now history. Act on the document that replaced it',
      OLD.file_name, OLD.superseded_at
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.storage_key IS DISTINCT FROM OLD.storage_key
     OR NEW.sha256 IS DISTINCT FROM OLD.sha256 THEN
    RAISE EXCEPTION
      'the bytes behind a document cannot be swapped. Upload a replacement instead — otherwise a verification points at a file nobody verified'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_document_history_intact
  BEFORE UPDATE OR DELETE ON student_documents
  FOR EACH ROW EXECUTE FUNCTION assert_document_history_intact();


-- ---------------------------------------------------------------------------
-- 8. One current medical record per student, and it is append-only.
--
--    `MedicalExamination` had no key at all. The form inserted a fresh row on
--    every save, so a student examined twice had two rows and nothing said
--    which one was current; downstream the profile screen read the table with
--    a `While reader.Read` loop that assigned every row to the same control,
--    leaving whichever happened to come last.
--
--    A re-examination is a new fact, not a correction. A finding recorded on
--    a date is what a decision taken that week was based on, so it is
--    superseded rather than edited — the same rule the ledger applies to a
--    posted voucher.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX uq_one_current_medical_record
  ON medical_records (tenant_id, student_id)
  WHERE (superseded_at IS NULL);

ALTER TABLE medical_records ADD CONSTRAINT chk_medical_verdict_reasoned CHECK (
  verdict = 'FIT'
  OR (verdict_note IS NOT NULL AND btrim(verdict_note) <> '')
);

ALTER TABLE medical_records ADD CONSTRAINT chk_medical_officer_named CHECK (
  btrim(medical_officer) <> ''
);

ALTER TABLE medical_records ADD CONSTRAINT chk_medical_validity CHECK (
  valid_until IS NULL OR valid_until > exam_date
);

CREATE OR REPLACE FUNCTION assert_medical_record_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION
      'a medical record is not deleted. Record a fresh examination, which supersedes this one and leaves both on file'
      USING ERRCODE = 'check_violation';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.exam_date > CURRENT_DATE THEN
      RAISE EXCEPTION
        'examination date % is in the future', NEW.exam_date
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: the only permitted change is retiring the record.
  IF OLD.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'this examination was already superseded on %', OLD.superseded_at
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.exam_date, NEW.blood_group, NEW.hepatitis_b, NEW.hiv, NEW.vaccinations,
      NEW.chronic_conditions, NEW.allergies, NEW.officer_notes, NEW.verdict,
      NEW.verdict_note, NEW.valid_until, NEW.medical_officer, NEW.student_id)
     IS DISTINCT FROM
     (OLD.exam_date, OLD.blood_group, OLD.hepatitis_b, OLD.hiv, OLD.vaccinations,
      OLD.chronic_conditions, OLD.allergies, OLD.officer_notes, OLD.verdict,
      OLD.verdict_note, OLD.valid_until, OLD.medical_officer, OLD.student_id) THEN
    RAISE EXCEPTION
      'a recorded examination cannot be edited — it is what a decision taken that week was based on. Record a new examination instead'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_medical_record_append_only
  BEFORE INSERT OR UPDATE OR DELETE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION assert_medical_record_append_only();


-- ---------------------------------------------------------------------------
-- 9. Cross-table references stay inside one tenant.
-- ---------------------------------------------------------------------------

CREATE TRIGGER trg_student_profile_same_tenant
  BEFORE INSERT OR UPDATE ON student_profiles
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students',
    'certificate_type_id', 'certificate_types');

CREATE TRIGGER trg_document_requirement_same_tenant
  BEFORE INSERT OR UPDATE ON programme_document_requirements
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'programme_id', 'programmes',
    'document_type_id', 'document_types');

CREATE TRIGGER trg_student_document_same_tenant
  BEFORE INSERT OR UPDATE ON student_documents
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students',
    'document_type_id', 'document_types');

CREATE TRIGGER trg_medical_record_same_tenant
  BEFORE INSERT OR UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'student_id', 'students');


-- ---------------------------------------------------------------------------
-- 10. Row-level security and grants.
--
--     Medical records are the most sensitive rows in this database. They are
--     covered by the same tenant policy as everything else; who inside a
--     tenant may read them is `medical.read`, enforced in the application
--     because RLS has no notion of a permission.
-- ---------------------------------------------------------------------------

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'student_profiles', 'document_types', 'programme_document_requirements',
    'student_documents', 'medical_records'
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
