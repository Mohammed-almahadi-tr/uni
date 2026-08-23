-- ===========================================================================
-- Allocations follow a dishonoured receipt as well as a cancelled one.
--
-- `assert_allocation_live` was written in the A3 migration, before dishonour
-- existed as a concept. It froze the allocations of a CANCELLED receipt, on
-- the grounds that money which has left the building cannot go on paying
-- charges. A dishonoured receipt is the same situation arrived at by a
-- different route -- the bank refused the cheque behind it -- and needs the
-- same rule, or an allocation could be inserted afterwards and settle a charge
-- with money that never arrived.
-- ===========================================================================
CREATE OR REPLACE FUNCTION assert_allocation_live()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  r_cancelled   timestamptz;
  r_dishonoured timestamptz;
  r_no          text;
  c_reversed    timestamptz;
  rec           record;
BEGIN
  IF TG_OP = 'DELETE' THEN
    rec := OLD;
  ELSE
    rec := NEW;
  END IF;

  SELECT cancelled_at, dishonoured_at, receipt_no
    INTO r_cancelled, r_dishonoured, r_no
    FROM student_receipts WHERE id = rec.receipt_id;

  IF r_cancelled IS NOT NULL THEN
    RAISE EXCEPTION 'receipt % is cancelled; its allocations are part of the record and cannot change',
      r_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF r_dishonoured IS NOT NULL THEN
    RAISE EXCEPTION 'receipt % was dishonoured; the money never arrived and cannot pay for anything',
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
