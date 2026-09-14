-- ===========================================================================
-- Ledger invariants (SRS §4.3)
--
-- These are constraints, not application conventions. Each one exists because
-- the legacy VB.NET system violated it, and each is enforced here so that no
-- code path — present or future, ours or someone else's — can violate it
-- again. The application performs the same checks to produce readable errors;
-- the database guarantees correctness regardless.
--
-- Portability note: immutability is enforced by TRIGGER rather than by
-- REVOKE. On Supabase the application connects as the table owner, and a
-- table owner is not bound by REVOKE. Triggers bind everyone.
-- ===========================================================================


-- ---------------------------------------------------------------------------
-- 0. Extensions. btree_gist lets a GiST exclusion constraint mix uuid equality
--    with daterange overlap (used for non-overlapping fiscal periods).
--    Available on Supabase.
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ---------------------------------------------------------------------------
-- 1. A transaction line has exactly one side, and neither side is negative.
--    A "negative debit" is how sloppy ledgers smuggle in a credit.
-- ---------------------------------------------------------------------------
ALTER TABLE transaction_lines
  ADD CONSTRAINT chk_line_single_side CHECK (
    debit_amount >= 0
    AND credit_amount >= 0
    AND (
      (debit_amount > 0 AND credit_amount = 0)
      OR (credit_amount > 0 AND debit_amount = 0)
    )
  );

ALTER TABLE transaction_lines
  ADD CONSTRAINT chk_line_fx_rate_positive CHECK (fx_rate > 0);

-- A sub-ledger reference is all-or-nothing.
ALTER TABLE transaction_lines
  ADD CONSTRAINT chk_line_subledger_paired CHECK (
    (subledger_type IS NULL AND subledger_id IS NULL)
    OR (subledger_type IS NOT NULL AND subledger_id IS NOT NULL)
  );


-- ---------------------------------------------------------------------------
-- 2. Account tree rules.
--    Only level-5 accounts are postable; a control account must declare the
--    sub-ledger it controls.
-- ---------------------------------------------------------------------------
ALTER TABLE chart_of_accounts
  ADD CONSTRAINT chk_account_level_range CHECK (level BETWEEN 1 AND 5);

ALTER TABLE chart_of_accounts
  ADD CONSTRAINT chk_account_postable_is_leaf CHECK (
    NOT is_postable OR level = 5
  );

ALTER TABLE chart_of_accounts
  ADD CONSTRAINT chk_account_control_declares_subledger CHECK (
    NOT is_control_account OR subledger_type IS NOT NULL
  );

-- Level 1 is a root; every other level must have a parent.
ALTER TABLE chart_of_accounts
  ADD CONSTRAINT chk_account_parent_required CHECK (
    (level = 1 AND parent_id IS NULL) OR (level > 1 AND parent_id IS NOT NULL)
  );


-- ---------------------------------------------------------------------------
-- 3. Fiscal period sanity.
-- ---------------------------------------------------------------------------
ALTER TABLE fiscal_periods
  ADD CONSTRAINT chk_period_dates CHECK (end_date >= start_date);

ALTER TABLE fiscal_years
  ADD CONSTRAINT chk_fiscal_year_dates CHECK (end_date >= start_date);

-- Periods within a year may not overlap.
ALTER TABLE fiscal_periods
  ADD CONSTRAINT excl_period_no_overlap
  EXCLUDE USING gist (
    fiscal_year_id WITH =,
    daterange(start_date, end_date, '[]') WITH &&
  );


-- ---------------------------------------------------------------------------
-- 4. account_period_balances — one row per (account, cost centre, period).
--    A NULL cost centre must collapse to a single row. Postgres treats NULLs
--    as distinct in unique indexes by default, which would silently permit
--    unlimited duplicate balance rows for un-costed accounts.
--    NULLS NOT DISTINCT requires PG15+; Supabase runs 15/17.
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS "account_period_balances_tenant_id_account_id_cost_center_id_key";
DROP INDEX IF EXISTS "account_period_balances_tenant_id_account_id_cost_center_i_key";

CREATE UNIQUE INDEX uq_account_period_balance
  ON account_period_balances (tenant_id, account_id, cost_center_id, fiscal_period_id)
  NULLS NOT DISTINCT;


-- ---------------------------------------------------------------------------
-- 5. Posting gate: period must be OPEN, and the document date must actually
--    fall inside the period it claims.
--
--    The legacy system had no fiscal periods at all, so a mistyped year on a
--    voucher silently rewrote a prior year's results.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_period_open()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  p_status   text;
  p_start    date;
  p_end      date;
  p_year_id  uuid;
BEGIN
  SELECT status::text, start_date, end_date, fiscal_year_id
    INTO p_status, p_start, p_end, p_year_id
    FROM fiscal_periods
   WHERE id = NEW.fiscal_period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'posting rejected: fiscal period % does not exist', NEW.fiscal_period_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF p_status <> 'OPEN' THEN
    RAISE EXCEPTION 'posting rejected: fiscal period is % (must be OPEN)', p_status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.doc_date < p_start OR NEW.doc_date > p_end THEN
    RAISE EXCEPTION 'posting rejected: document date % is outside period % .. %',
      NEW.doc_date, p_start, p_end
      USING ERRCODE = 'check_violation';
  END IF;

  IF p_year_id <> NEW.fiscal_year_id THEN
    RAISE EXCEPTION 'posting rejected: period belongs to fiscal year %, header claims %',
      p_year_id, NEW.fiscal_year_id
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_header_period_open
  BEFORE INSERT ON transaction_headers
  FOR EACH ROW EXECUTE FUNCTION assert_period_open();


-- ---------------------------------------------------------------------------
-- 6. Line-level gate: postable account, matching tenant, sub-ledger identity
--    on control accounts, cost centre where the account demands one.
--
--    Control accounts are the reason the legacy student sub-ledger could
--    drift from the AR balance with nothing detecting it.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_line_postable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  a_postable       boolean;
  a_active         boolean;
  a_level          smallint;
  a_control        boolean;
  a_subledger      text;
  a_requires_cc    boolean;
  a_tenant         uuid;
  a_code           text;
  h_tenant         uuid;
  cc_tenant        uuid;
BEGIN
  SELECT is_postable, is_active, level, is_control_account,
         subledger_type::text, requires_cost_center, tenant_id, code
    INTO a_postable, a_active, a_level, a_control,
         a_subledger, a_requires_cc, a_tenant, a_code
    FROM chart_of_accounts
   WHERE id = NEW.account_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'posting rejected: account % does not exist', NEW.account_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF NOT a_postable OR a_level <> 5 THEN
    RAISE EXCEPTION 'posting rejected: account % is level % and not postable — only level-5 detail accounts receive postings',
      a_code, a_level
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT a_active THEN
    RAISE EXCEPTION 'posting rejected: account % is inactive', a_code
      USING ERRCODE = 'check_violation';
  END IF;

  -- The line's account must belong to the same tenant as its header.
  SELECT tenant_id INTO h_tenant FROM transaction_headers WHERE id = NEW.header_id;
  IF h_tenant IS DISTINCT FROM a_tenant THEN
    RAISE EXCEPTION 'posting rejected: account % belongs to a different tenant than its voucher', a_code
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.cost_center_id IS NOT NULL THEN
    SELECT tenant_id INTO cc_tenant FROM cost_centers WHERE id = NEW.cost_center_id;
    IF cc_tenant IS DISTINCT FROM h_tenant THEN
      RAISE EXCEPTION 'posting rejected: cost centre belongs to a different tenant than its voucher'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF a_control THEN
    IF NEW.subledger_type IS NULL OR NEW.subledger_id IS NULL THEN
      RAISE EXCEPTION 'posting rejected: account % is a control account and requires sub-ledger identity', a_code
        USING ERRCODE = 'check_violation';
    END IF;
    IF NEW.subledger_type::text <> a_subledger THEN
      RAISE EXCEPTION 'posting rejected: account % controls the % sub-ledger, line supplied %',
        a_code, a_subledger, NEW.subledger_type
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF a_requires_cc AND NEW.cost_center_id IS NULL THEN
    RAISE EXCEPTION 'posting rejected: account % requires a cost centre', a_code
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_line_postable
  BEFORE INSERT ON transaction_lines
  FOR EACH ROW EXECUTE FUNCTION assert_line_postable();


-- ---------------------------------------------------------------------------
-- 7. THE invariant: a posted voucher balances.
--
--    Deferred to commit time, because lines are inserted one at a time and a
--    voucher is only meaningfully balanced once all of them are in. The
--    legacy system checked this in the UI only, so any code path that was not
--    the voucher screen — and there were several — could post a one-sided
--    entry.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_header_balanced(p_header_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  d           numeric(19,4);
  c           numeric(19,4);
  n           integer;
  v_ref       text;
BEGIN
  -- The header may have been deleted in this transaction (cascade); nothing
  -- to assert about a voucher that no longer exists.
  SELECT voucher_ref INTO v_ref FROM transaction_headers WHERE id = p_header_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(debit_amount), 0),
         COALESCE(SUM(credit_amount), 0),
         COUNT(*)
    INTO d, c, n
    FROM transaction_lines
   WHERE header_id = p_header_id;

  IF n < 2 THEN
    RAISE EXCEPTION 'voucher % rejected: a double entry needs at least two lines, found %', v_ref, n
      USING ERRCODE = 'check_violation';
  END IF;

  IF d <> c THEN
    RAISE EXCEPTION 'voucher % rejected: debits % <> credits % (out by %)',
      v_ref, d, c, (d - c)
      USING ERRCODE = 'check_violation';
  END IF;

  IF d = 0 THEN
    RAISE EXCEPTION 'voucher % rejected: a voucher totalling zero carries no information', v_ref
      USING ERRCODE = 'check_violation';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION trg_assert_balanced_from_line()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_header_balanced(COALESCE(NEW.header_id, OLD.header_id));
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION trg_assert_balanced_from_header()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM assert_header_balanced(NEW.id);
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER trg_lines_balanced
  AFTER INSERT OR UPDATE OR DELETE ON transaction_lines
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_assert_balanced_from_line();

-- Catches the header inserted with no lines at all, which the line-level
-- trigger by definition never fires for.
CREATE CONSTRAINT TRIGGER trg_header_balanced
  AFTER INSERT ON transaction_headers
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION trg_assert_balanced_from_header();


-- ---------------------------------------------------------------------------
-- 8. Immutability. A posted voucher is never edited and never deleted;
--    correction is by linked reversal only (SRS REQ-FIN-05, REQ-NFR-06).
--
--    The one permitted mutation is stamping the original with its reversal —
--    reversed_at and reversal_reason. Everything else raises.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_header_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'voucher % cannot be deleted: posted entries are immutable, reverse it instead', OLD.voucher_ref
      USING ERRCODE = 'check_violation';
  END IF;

  IF (to_jsonb(NEW) - 'reversed_at' - 'reversal_reason')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'reversed_at' - 'reversal_reason') THEN
    RAISE EXCEPTION 'voucher % cannot be edited: posted entries are immutable, reverse it instead', OLD.voucher_ref
      USING ERRCODE = 'check_violation';
  END IF;

  -- A reversal stamp is applied once and never unwound.
  IF OLD.reversed_at IS NOT NULL AND NEW.reversed_at IS DISTINCT FROM OLD.reversed_at THEN
    RAISE EXCEPTION 'voucher % has already been reversed', OLD.voucher_ref
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_header_immutable
  BEFORE UPDATE OR DELETE ON transaction_headers
  FOR EACH ROW EXECUTE FUNCTION assert_header_immutable();

CREATE OR REPLACE FUNCTION assert_line_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Lines vanish only when their header is cascade-deleted, and headers
  -- cannot be deleted, so this is unconditional.
  RAISE EXCEPTION 'transaction lines are immutable: reverse the voucher instead'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_line_immutable
  BEFORE UPDATE OR DELETE ON transaction_lines
  FOR EACH ROW EXECUTE FUNCTION assert_line_immutable();


-- ---------------------------------------------------------------------------
-- 9. A reversal reverses exactly one voucher, in its own tenant, and is not
--    itself reversible. (reverses_id UNIQUE already caps it at one reversal
--    per voucher; this adds the tenant and self-reference checks.)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_reversal_sane()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  o_tenant   uuid;
  o_reverses uuid;
BEGIN
  IF NEW.reverses_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.reverses_id = NEW.id THEN
    RAISE EXCEPTION 'a voucher cannot reverse itself'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT tenant_id, reverses_id INTO o_tenant, o_reverses
    FROM transaction_headers WHERE id = NEW.reverses_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'reversal target % does not exist', NEW.reverses_id
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  IF o_tenant <> NEW.tenant_id THEN
    RAISE EXCEPTION 'a voucher cannot reverse another tenant''s voucher'
      USING ERRCODE = 'check_violation';
  END IF;

  IF o_reverses IS NOT NULL THEN
    RAISE EXCEPTION 'a reversal cannot itself be reversed — post a fresh correcting entry'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.reversal_reason IS NULL OR btrim(NEW.reversal_reason) = '' THEN
    RAISE EXCEPTION 'a reversal requires a stated reason'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_reversal_sane
  BEFORE INSERT ON transaction_headers
  FOR EACH ROW EXECUTE FUNCTION assert_reversal_sane();


-- ---------------------------------------------------------------------------
-- 10. Audit log is append-only and hash-chained (SRS REQ-ADM-03).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_audit_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'the audit log is append-only'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_audit_append_only
  BEFORE UPDATE OR DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION assert_audit_append_only();


-- ---------------------------------------------------------------------------
-- 11. Row-Level Security.
--
--     app.tenant_id is set with SET LOCAL inside the request transaction, so
--     it is transaction-scoped and cannot leak across a pooled connection —
--     which is exactly the failure mode that makes session-level SET unusable
--     behind Supabase's transaction-mode pooler.
--
--     FORCE is required: on Supabase the application connects as the table
--     owner, and owners bypass plain RLS.
--
--     When app.tenant_id is unset, current_setting(...) returns NULL, the
--     predicate is NULL, and no rows are visible. Closed by default.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION rls_bypassed()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(current_setting('app.bypass_rls', true), 'off') = 'on';
$$;

-- Tenant-scoped tables carrying tenant_id directly.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'roles', 'audit_log', 'idempotency_keys', 'document_sequences',
    'fiscal_years', 'chart_of_accounts', 'cost_centers', 'voucher_drafts',
    'transaction_headers', 'account_period_balances', 'exchange_rates'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (rls_bypassed() OR tenant_id = current_tenant_id())
        WITH CHECK (rls_bypassed() OR tenant_id = current_tenant_id())
    $f$, t);
  END LOOP;
END;
$$;

-- The tenants table keys on id rather than tenant_id.
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON tenants
  USING (rls_bypassed() OR id = current_tenant_id())
  WITH CHECK (rls_bypassed() OR id = current_tenant_id());

-- Child tables reached only through a tenant-scoped parent.
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON fiscal_periods
  USING (rls_bypassed() OR EXISTS (
    SELECT 1 FROM fiscal_years fy
     WHERE fy.id = fiscal_periods.fiscal_year_id
       AND fy.tenant_id = current_tenant_id()))
  WITH CHECK (rls_bypassed() OR EXISTS (
    SELECT 1 FROM fiscal_years fy
     WHERE fy.id = fiscal_periods.fiscal_year_id
       AND fy.tenant_id = current_tenant_id()));

ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON transaction_lines
  USING (rls_bypassed() OR EXISTS (
    SELECT 1 FROM transaction_headers h
     WHERE h.id = transaction_lines.header_id
       AND h.tenant_id = current_tenant_id()))
  WITH CHECK (rls_bypassed() OR EXISTS (
    SELECT 1 FROM transaction_headers h
     WHERE h.id = transaction_lines.header_id
       AND h.tenant_id = current_tenant_id()));

ALTER TABLE approval_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE approval_events FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON approval_events
  USING (rls_bypassed() OR EXISTS (
    SELECT 1 FROM voucher_drafts d
     WHERE d.id = approval_events.draft_id
       AND d.tenant_id = current_tenant_id()))
  WITH CHECK (rls_bypassed() OR EXISTS (
    SELECT 1 FROM voucher_drafts d
     WHERE d.id = approval_events.draft_id
       AND d.tenant_id = current_tenant_id()));

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON user_roles
  USING (rls_bypassed() OR EXISTS (
    SELECT 1 FROM users u
     WHERE u.id = user_roles.user_id
       AND u.tenant_id = current_tenant_id()))
  WITH CHECK (rls_bypassed() OR EXISTS (
    SELECT 1 FROM users u
     WHERE u.id = user_roles.user_id
       AND u.tenant_id = current_tenant_id()));

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON role_permissions
  USING (rls_bypassed() OR EXISTS (
    SELECT 1 FROM roles r
     WHERE r.id = role_permissions.role_id
       AND r.tenant_id = current_tenant_id()))
  WITH CHECK (rls_bypassed() OR EXISTS (
    SELECT 1 FROM roles r
     WHERE r.id = role_permissions.role_id
       AND r.tenant_id = current_tenant_id()));

-- `permissions` is a global catalogue of capability keys, not tenant data.
-- It is intentionally left readable to all tenants.
