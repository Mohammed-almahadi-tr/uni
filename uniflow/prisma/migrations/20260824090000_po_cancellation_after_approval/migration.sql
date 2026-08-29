-- An approved purchase order that is later cancelled keeps its approver.
--
-- The original constraint required approved_by_id to be NULL in the CANCELLED
-- state, which is right for an order abandoned as a draft and wrong for one
-- cancelled after approval — and the second is the case that matters, because
-- that is the one holding an encumbrance. Erasing the approver to satisfy the
-- constraint would have destroyed the record of who committed the money.
ALTER TABLE purchase_orders
  DROP CONSTRAINT chk_po_approval_complete;

ALTER TABLE purchase_orders
  ADD CONSTRAINT chk_po_approval_complete CHECK (
    (state IN ('DRAFT', 'PENDING_APPROVAL')
     AND approved_by_id IS NULL AND approved_at IS NULL)
    OR (state IN ('APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED')
        AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL)
    -- Cancelled either way: before approval, or after it with the approver
    -- still on the record.
    OR (state = 'CANCELLED'
        AND ((approved_by_id IS NULL AND approved_at IS NULL)
             OR (approved_by_id IS NOT NULL AND approved_at IS NOT NULL)))
  );

-- A cancelled or closed order says why.
ALTER TABLE purchase_orders
  ADD CONSTRAINT chk_po_closure_reason CHECK (
    state NOT IN ('CANCELLED', 'CLOSED')
    OR (closure_reason IS NOT NULL AND btrim(closure_reason) <> ''
        AND closed_at IS NOT NULL)
  );
