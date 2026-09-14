/*
  Warnings:

  - Added the required column `fiscal_year_id` to the `voucher_drafts` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "DraftState" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "voucher_drafts" ADD COLUMN     "fiscal_year_id" UUID NOT NULL,
ADD COLUMN     "source_module" "SourceModule" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "source_ref" TEXT,
ADD COLUMN     "total_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
ADD COLUMN     "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "draft_sequences" (
    "tenant_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "prefix" TEXT NOT NULL DEFAULT 'DFT-',
    "padding" INTEGER NOT NULL DEFAULT 6,

    CONSTRAINT "draft_sequences_pkey" PRIMARY KEY ("tenant_id","fiscal_year_id")
);

-- CreateTable
CREATE TABLE "voucher_attachments" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "draft_id" UUID NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "byte_size" INTEGER NOT NULL,
    "storage_key" TEXT NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "uploaded_by_id" UUID NOT NULL,
    "uploaded_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voucher_attachments_storage_key_key" ON "voucher_attachments"("storage_key");

-- CreateIndex
CREATE INDEX "voucher_attachments_draft_id_idx" ON "voucher_attachments"("draft_id");

-- CreateIndex
CREATE INDEX "voucher_drafts_tenant_id_created_by_id_state_idx" ON "voucher_drafts"("tenant_id", "created_by_id", "state");

-- AddForeignKey
ALTER TABLE "voucher_drafts" ADD CONSTRAINT "voucher_drafts_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_sequences" ADD CONSTRAINT "draft_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "draft_sequences" ADD CONSTRAINT "draft_sequences_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_attachments" ADD CONSTRAINT "voucher_attachments_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_attachments" ADD CONSTRAINT "voucher_attachments_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "voucher_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_attachments" ADD CONSTRAINT "voucher_attachments_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ===========================================================================
-- Maker-checker invariants (SRS REQ-FIN-04, Track A2).
--
-- The legacy approval flow was two states and a DELETE: approving a voucher
-- inserted its lines into `Transactionees` and then ran
-- `DELETE FROM TempVouchers WHERE ...` (frmApprovingVouchers.vb:941-991).
-- Nothing recorded who approved it, nothing recorded that a review had ever
-- happened, and there was no reject path at all -- a voucher you disagreed
-- with was simply left in the table forever, or deleted.
--
-- Everything below is stated as a constraint rather than a convention,
-- because the control is worth exactly as much as its weakest code path.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 1. A draft in POSTED state points at its voucher; one in any other state
--    does not. This is what makes "has this been posted?" answerable without
--    trusting the state column alone.
-- ---------------------------------------------------------------------------
ALTER TABLE voucher_drafts
  ADD CONSTRAINT chk_draft_posted_link CHECK (
    (state = 'POSTED' AND posted_header_id IS NOT NULL)
    OR (state <> 'POSTED' AND posted_header_id IS NULL)
  );

ALTER TABLE voucher_drafts
  ADD CONSTRAINT chk_draft_total_nonneg CHECK (total_amount >= 0);


-- ---------------------------------------------------------------------------
-- 2. A rejection carries a reason.
--
--    A checker who can reject with no comment sends the voucher back to a
--    maker who now has to guess what was wrong. Every rejection in this
--    system says why, and the comment is part of the permanent record.
-- ---------------------------------------------------------------------------
ALTER TABLE approval_events
  ADD CONSTRAINT chk_rejection_has_comment CHECK (
    to_state <> 'REJECTED' OR (comment IS NOT NULL AND btrim(comment) <> '')
  );


-- ---------------------------------------------------------------------------
-- 3. Approval history is append-only, for the same reason the audit log is.
--    A rejection comment that can be edited afterwards is not evidence.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_approval_event_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'approval history is append-only: a transition that happened cannot be unmade'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_approval_events_append_only
  BEFORE UPDATE OR DELETE ON approval_events
  FOR EACH ROW EXECUTE FUNCTION assert_approval_event_append_only();


-- ---------------------------------------------------------------------------
-- 4. The draft state machine, and the content freeze.
--
--    The freeze is the important half. Without it a maker can submit a clean
--    voucher, wait for the reviewer to pass it, then edit the lines and let
--    the approver post something nobody reviewed. That is the standard attack
--    on a maker-checker workflow, and it is defeated at the table rather than
--    in whichever code path happens to call the update.
--
--    Drafts are never deleted. That is the single behaviour this whole module
--    exists to replace.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_draft_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'draft % cannot be deleted: the record that a voucher was reviewed is the point of this table',
      OLD.draft_no
      USING ERRCODE = 'check_violation';
  END IF;

  -- Terminal states.
  IF OLD.state IN ('POSTED', 'CANCELLED') THEN
    RAISE EXCEPTION 'draft % is % and can no longer be changed', OLD.draft_no, OLD.state
      USING ERRCODE = 'check_violation';
  END IF;

  -- Content freeze: editable only before it has been submitted for review.
  IF OLD.state NOT IN ('DRAFT', 'REJECTED') THEN
    IF (NEW.lines_json, NEW.doc_date, NEW.description, NEW.voucher_type,
        NEW.total_amount, NEW.fiscal_year_id, NEW.source_module, NEW.source_ref)
       IS DISTINCT FROM
       (OLD.lines_json, OLD.doc_date, OLD.description, OLD.voucher_type,
        OLD.total_amount, OLD.fiscal_year_id, OLD.source_module, OLD.source_ref)
    THEN
      RAISE EXCEPTION 'draft % has been submitted for review and its content is frozen: a checker approves what they were shown',
        OLD.draft_no
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- Identity never moves.
  IF NEW.id <> OLD.id OR NEW.tenant_id <> OLD.tenant_id
     OR NEW.draft_no <> OLD.draft_no OR NEW.created_by_id <> OLD.created_by_id THEN
    RAISE EXCEPTION 'draft %: id, tenant, number and maker are immutable', OLD.draft_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.state <> OLD.state THEN
    IF NOT (
         (OLD.state = 'DRAFT'            AND NEW.state IN ('PENDING_REVIEW', 'CANCELLED'))
      OR (OLD.state = 'REJECTED'         AND NEW.state IN ('PENDING_REVIEW', 'CANCELLED'))
      OR (OLD.state = 'PENDING_REVIEW'   AND NEW.state IN ('PENDING_APPROVAL', 'REJECTED'))
      OR (OLD.state = 'PENDING_APPROVAL' AND NEW.state IN ('POSTED', 'REJECTED'))
    ) THEN
      RAISE EXCEPTION 'draft %: % -> % is not a legal transition', OLD.draft_no, OLD.state, NEW.state
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_draft_transition
  BEFORE UPDATE OR DELETE ON voucher_drafts
  FOR EACH ROW EXECUTE FUNCTION assert_draft_transition();


-- ---------------------------------------------------------------------------
-- 5. Attachments follow the draft. Evidence may be added while the maker is
--    still working; once a checker has been asked to look at it, the bundle
--    is fixed.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_attachment_mutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  d_state  text;
  d_tenant uuid;
  d_no     text;
  r        record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    r := OLD;
  ELSE
    r := NEW;
  END IF;

  SELECT state::text, tenant_id, draft_no INTO d_state, d_tenant, d_no
    FROM voucher_drafts WHERE id = r.draft_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'attachment references a draft that does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF d_tenant IS DISTINCT FROM r.tenant_id THEN
    RAISE EXCEPTION 'attachment belongs to a different tenant than its draft'
      USING ERRCODE = 'check_violation';
  END IF;

  IF d_state NOT IN ('DRAFT', 'REJECTED') THEN
    RAISE EXCEPTION 'draft % is %: its attachments are part of what was reviewed and cannot be changed',
      d_no, d_state
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN r;
END;
$$;

CREATE TRIGGER trg_attachment_mutable
  BEFORE INSERT OR UPDATE OR DELETE ON voucher_attachments
  FOR EACH ROW EXECUTE FUNCTION assert_attachment_mutable();


-- ---------------------------------------------------------------------------
-- 6. Row-level security for the two new tables, plus grants for the app role.
-- ---------------------------------------------------------------------------
ALTER TABLE draft_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON draft_sequences
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

ALTER TABLE voucher_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON voucher_attachments
  USING (tenant_id = current_tenant_id())
  WITH CHECK (tenant_id = current_tenant_id());

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uniflow_app') THEN
    GRANT SELECT, INSERT, UPDATE, DELETE ON draft_sequences TO uniflow_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON voucher_attachments TO uniflow_app;
  END IF;
END
$$;
