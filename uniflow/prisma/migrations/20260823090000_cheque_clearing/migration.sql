-- CreateEnum
CREATE TYPE "ChequeStatus" AS ENUM ('RECEIVED', 'SENT_TO_BANK', 'CLEARED', 'BOUNCED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ChequeCustody" AS ENUM ('VAULT', 'WITH_BANK', 'RETURNED_TO_DRAWER', 'SETTLED');

-- AlterEnum
ALTER TYPE "AccountRole" ADD VALUE 'CHEQUES_WITH_BANK';

-- AlterTable
ALTER TABLE "student_receipts" ADD COLUMN     "dishonour_header_id" UUID,
ADD COLUMN     "dishonoured_at" TIMESTAMPTZ(6),
ADD COLUMN     "dishonoured_by_id" UUID;

-- CreateTable
CREATE TABLE "cheques" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cheque_no" TEXT NOT NULL,
    "bank_name" TEXT,
    "branch" TEXT,
    "drawer_name" TEXT,
    "drawer_key" TEXT NOT NULL,
    "due_date" DATE NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "subledger_type" "SubledgerType" NOT NULL,
    "subledger_id" TEXT NOT NULL,
    "status" "ChequeStatus" NOT NULL DEFAULT 'RECEIVED',
    "custody" "ChequeCustody" NOT NULL DEFAULT 'VAULT',
    "receipt_id" UUID,
    "deposit_account_id" UUID,
    "received_on" DATE NOT NULL,
    "sent_to_bank_on" DATE,
    "settled_on" DATE,
    "bounce_reason_code" TEXT,
    "bounce_reason" TEXT,
    "replaces_cheque_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cheques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cheque_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "cheque_id" UUID NOT NULL,
    "from_status" "ChequeStatus" NOT NULL,
    "to_status" "ChequeStatus" NOT NULL,
    "doc_date" DATE NOT NULL,
    "reason_code" TEXT,
    "comment" TEXT,
    "actor_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_header_id" UUID,

    CONSTRAINT "cheque_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cheques_receipt_id_key" ON "cheques"("receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_replaces_cheque_id_key" ON "cheques"("replaces_cheque_id");

-- CreateIndex
CREATE INDEX "cheques_tenant_id_status_due_date_idx" ON "cheques"("tenant_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "cheques_tenant_id_drawer_key_idx" ON "cheques"("tenant_id", "drawer_key");

-- CreateIndex
CREATE INDEX "cheques_tenant_id_subledger_type_subledger_id_idx" ON "cheques"("tenant_id", "subledger_type", "subledger_id");

-- CreateIndex
CREATE UNIQUE INDEX "cheques_tenant_id_cheque_no_drawer_key_key" ON "cheques"("tenant_id", "cheque_no", "drawer_key");

-- CreateIndex
CREATE INDEX "cheque_events_cheque_id_occurred_at_idx" ON "cheque_events"("cheque_id", "occurred_at");

-- CreateIndex
CREATE INDEX "cheque_events_tenant_id_to_status_doc_date_idx" ON "cheque_events"("tenant_id", "to_status", "doc_date");

-- CreateIndex
CREATE UNIQUE INDEX "student_receipts_dishonour_header_id_key" ON "student_receipts"("dishonour_header_id");

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_dishonoured_by_id_fkey" FOREIGN KEY ("dishonoured_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_receipts" ADD CONSTRAINT "student_receipts_dishonour_header_id_fkey" FOREIGN KEY ("dishonour_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "student_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_deposit_account_id_fkey" FOREIGN KEY ("deposit_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_replaces_cheque_id_fkey" FOREIGN KEY ("replaces_cheque_id") REFERENCES "cheques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheques" ADD CONSTRAINT "cheques_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_events" ADD CONSTRAINT "cheque_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_events" ADD CONSTRAINT "cheque_events_cheque_id_fkey" FOREIGN KEY ("cheque_id") REFERENCES "cheques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cheque_events" ADD CONSTRAINT "cheque_events_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ===========================================================================
-- Cheque clearing invariants (SRS Module 7, Track A4).
--
-- The legacy implementation was a `CheqClear` boolean on the `Transactions`
-- row, toggled by clicking a grid cell, which ran
--
--     UPDATE Transactions SET CheqClear=1 WHERE TransNo = <concatenated>
--
-- and posted nothing (frmCheqClearingSystem.vb:71-95). Three defects followed
-- from that one design decision, and all three were live:
--
--   1. `0` rendered as "Rejected", and `0` was also the initial value, so
--      every cheque that had simply not been presented yet displayed as
--      bounced.
--   2. Clearing a cheque never moved the bank balance, because there was no
--      ledger entry at all.
--   3. A bounced cheque never reinstated the student's debt, so a student
--      whose cheque the bank refused still showed as paid.
--
-- The rules below make each of those impossible rather than merely unlikely.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A cheque is for a positive amount, and its identity is fixed.
-- ---------------------------------------------------------------------------
ALTER TABLE cheques
  ADD CONSTRAINT chk_cheque_amount_positive CHECK (amount > 0);

ALTER TABLE cheques
  ADD CONSTRAINT chk_cheque_no_present CHECK (btrim(cheque_no) <> '');

-- A bounce says why. The bank gives a reason code; keeping it is what makes
-- repeat-bounce reporting (REQ-CHQ-03) possible at all.
ALTER TABLE cheques
  ADD CONSTRAINT chk_cheque_bounce_has_reason CHECK (
    status <> 'BOUNCED'
    OR (bounce_reason IS NOT NULL AND btrim(bounce_reason) <> '')
  );

-- Status and the physical whereabouts of the paper have to agree.
ALTER TABLE cheques
  ADD CONSTRAINT chk_cheque_custody_matches_status CHECK (
    (status = 'RECEIVED'     AND custody = 'VAULT')
    OR (status = 'SENT_TO_BANK' AND custody = 'WITH_BANK')
    OR (status = 'CLEARED'      AND custody = 'SETTLED')
    OR (status IN ('BOUNCED', 'CANCELLED') AND custody = 'RETURNED_TO_DRAWER')
  );

-- A cheque that has been settled one way or the other carries the date it
-- happened; one that has not, does not.
ALTER TABLE cheques
  ADD CONSTRAINT chk_cheque_settled_on CHECK (
    (status IN ('CLEARED', 'BOUNCED', 'CANCELLED') AND settled_on IS NOT NULL)
    OR (status IN ('RECEIVED', 'SENT_TO_BANK') AND settled_on IS NULL)
  );

ALTER TABLE cheques
  ADD CONSTRAINT chk_cheque_deposit_account CHECK (
    status <> 'SENT_TO_BANK' OR deposit_account_id IS NOT NULL
  );

-- A cheque cannot replace itself.
ALTER TABLE cheques
  ADD CONSTRAINT chk_cheque_not_self_replacing CHECK (
    replaces_cheque_id IS NULL OR replaces_cheque_id <> id
  );


-- ---------------------------------------------------------------------------
-- 2. The state machine.
--
--    The legacy grid let you click "Cleared" and then "Rejected" on the same
--    row all afternoon. Here a cheque moves forward only, and a settled cheque
--    is finished: a bank that refuses a cheque and then honours it is issuing
--    a second cheque, not editing the first.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_cheque_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'cheque % cannot be deleted: cancel it, so the record of it survives',
      OLD.cheque_no
      USING ERRCODE = 'check_violation';
  END IF;

  -- Identity and value never move. Correcting a mis-keyed amount means
  -- cancelling the cheque and re-entering it, which leaves a trail.
  IF (NEW.tenant_id, NEW.cheque_no, NEW.amount, NEW.currency, NEW.subledger_type,
      NEW.subledger_id, NEW.receipt_id, NEW.received_on, NEW.created_by_id)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.cheque_no, OLD.amount, OLD.currency, OLD.subledger_type,
      OLD.subledger_id, OLD.receipt_id, OLD.received_on, OLD.created_by_id)
  THEN
    RAISE EXCEPTION 'cheque %: number, amount, payer and originating receipt are fixed once recorded',
      OLD.cheque_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status <> OLD.status THEN
    IF NOT (
         (OLD.status = 'RECEIVED'     AND NEW.status IN ('SENT_TO_BANK', 'BOUNCED', 'CANCELLED'))
      OR (OLD.status = 'SENT_TO_BANK' AND NEW.status IN ('CLEARED', 'BOUNCED'))
    ) THEN
      RAISE EXCEPTION 'cheque %: % -> % is not a legal transition', OLD.cheque_no, OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cheque_transition
  BEFORE UPDATE OR DELETE ON cheques
  FOR EACH ROW EXECUTE FUNCTION assert_cheque_transition();


-- ---------------------------------------------------------------------------
-- 3. The history is append-only, like the audit log and the approval trail.
--    A transition that happened cannot be unmade.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_cheque_event_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'cheque history is append-only'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_cheque_events_append_only
  BEFORE UPDATE OR DELETE ON cheque_events
  FOR EACH ROW EXECUTE FUNCTION assert_cheque_event_append_only();


-- ---------------------------------------------------------------------------
-- 4. A cheque taken over the counter is for exactly what the receipt says.
--
--    Otherwise the ledger holds one figure in cheques-receivable and the
--    portfolio holds another, and the difference is only found when the bank
--    statement refuses to reconcile.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_cheque_matches_receipt()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  r_amount   numeric(19,4);
  r_channel  text;
  r_student  uuid;
BEGIN
  IF NEW.receipt_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT amount, channel::text, student_id
    INTO r_amount, r_channel, r_student
    FROM student_receipts WHERE id = NEW.receipt_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'cheque % references a receipt that does not exist', NEW.cheque_no
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF r_channel <> 'CHEQUE' THEN
    RAISE EXCEPTION 'cheque % is attached to a receipt taken by %, not by cheque',
      NEW.cheque_no, r_channel
      USING ERRCODE = 'check_violation';
  END IF;

  IF r_amount <> NEW.amount THEN
    RAISE EXCEPTION 'cheque % is for % but its receipt is for %',
      NEW.cheque_no, NEW.amount, r_amount
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.subledger_type <> 'STUDENT' OR NEW.subledger_id::uuid <> r_student THEN
    RAISE EXCEPTION 'cheque % names a different payer from its receipt', NEW.cheque_no
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cheque_matches_receipt
  BEFORE INSERT OR UPDATE ON cheques
  FOR EACH ROW EXECUTE FUNCTION assert_cheque_matches_receipt();


-- ---------------------------------------------------------------------------
-- 5. Cross-tenant references, as everywhere else. Foreign keys do not carry a
--    tenant and referential-integrity checks run as the table owner.
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_cheque_same_tenant
  BEFORE INSERT OR UPDATE ON cheques
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'receipt_id', 'student_receipts',
    'deposit_account_id', 'chart_of_accounts',
    'replaces_cheque_id', 'cheques');

CREATE TRIGGER trg_cheque_event_same_tenant
  BEFORE INSERT OR UPDATE ON cheque_events
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'cheque_id', 'cheques',
    'posted_header_id', 'transaction_headers');


-- ---------------------------------------------------------------------------
-- 6. A dishonoured receipt is stamped as a whole, and never unstamped.
--
--    Dishonour is not cancellation: the cashier did nothing wrong, and the
--    receipt keeps its number. But the money never arrived, so the receipt
--    stops counting towards what the student has paid.
-- ---------------------------------------------------------------------------
ALTER TABLE student_receipts
  ADD CONSTRAINT chk_receipt_dishonour_complete CHECK (
    (dishonoured_at IS NULL AND dishonoured_by_id IS NULL AND dishonour_header_id IS NULL)
    OR (dishonoured_at IS NOT NULL AND dishonoured_by_id IS NOT NULL
        AND dishonour_header_id IS NOT NULL)
  );

-- A receipt is cancelled or dishonoured, never both: they are two different
-- accounts of where the money went, and only one of them can be true.
ALTER TABLE student_receipts
  ADD CONSTRAINT chk_receipt_not_both CHECK (
    cancelled_at IS NULL OR dishonoured_at IS NULL
  );

CREATE OR REPLACE FUNCTION assert_receipt_dishonour_once()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.dishonoured_at IS NOT NULL
     AND (NEW.dishonoured_at, NEW.dishonour_header_id) IS DISTINCT FROM
         (OLD.dishonoured_at, OLD.dishonour_header_id) THEN
    RAISE EXCEPTION 'receipt % has already been recorded as dishonoured', OLD.receipt_no
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_receipt_dishonour_once
  BEFORE UPDATE ON student_receipts
  FOR EACH ROW EXECUTE FUNCTION assert_receipt_dishonour_once();


-- ---------------------------------------------------------------------------
-- 7. Row-level security and grants.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['cheques', 'cheque_events']
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
