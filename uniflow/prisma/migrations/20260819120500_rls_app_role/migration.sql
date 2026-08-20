-- ===========================================================================
-- Make RLS actually bind.
--
-- The previous migration enabled and FORCED row-level security, then gave the
-- policies a GUC escape hatch (app.bypass_rls) for system work. Two problems
-- surfaced immediately in the isolation suite:
--
--   1. The connecting role was a SUPERUSER. Superusers bypass RLS
--      unconditionally — FORCE does not apply to them — so every policy was
--      inert and no query was confined to its tenant.
--
--   2. Even for a non-superuser, a GUC any client can set is not a boundary.
--      `SET app.bypass_rls = 'on'` was available to the same connection that
--      the policies were supposed to constrain.
--
-- The fix is the standard Postgres separation, and the one Supabase itself
-- uses: privilege comes from the ROLE, not from a session variable.
--
--   owner role  — owns the tables, runs migrations, does platform work.
--                 Bypasses RLS by virtue of ownership (FORCE is dropped).
--   app role    — NOSUPERUSER, NOBYPASSRLS, owns nothing. Confined by RLS.
--
-- scripts/bootstrap-role.mjs creates the app role; db:check-roles asserts the
-- split is intact and is meant to run in CI against every environment,
-- because a misconfigured production role would disable tenant isolation
-- silently.
-- ===========================================================================

-- 1. Drop FORCE, so the owner (migrations, seeds, platform jobs) is exempt.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'tenants', 'users', 'roles', 'audit_log', 'idempotency_keys',
    'document_sequences', 'fiscal_years', 'fiscal_periods',
    'chart_of_accounts', 'cost_centers', 'voucher_drafts', 'approval_events',
    'transaction_headers', 'transaction_lines', 'account_period_balances',
    'exchange_rates', 'user_roles', 'role_permissions'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I NO FORCE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;

-- 2. Rewrite every policy without the GUC escape hatch.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'users', 'roles', 'audit_log', 'idempotency_keys', 'document_sequences',
    'fiscal_years', 'chart_of_accounts', 'cost_centers', 'voucher_drafts',
    'transaction_headers', 'account_period_balances', 'exchange_rates'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %I', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = current_tenant_id())
        WITH CHECK (tenant_id = current_tenant_id())
    $f$, t);
  END LOOP;
END
$$;

DROP POLICY IF EXISTS tenant_isolation ON tenants;
CREATE POLICY tenant_isolation ON tenants
  USING (id = current_tenant_id())
  WITH CHECK (id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation ON fiscal_periods;
CREATE POLICY tenant_isolation ON fiscal_periods
  USING (EXISTS (SELECT 1 FROM fiscal_years fy
                  WHERE fy.id = fiscal_periods.fiscal_year_id
                    AND fy.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM fiscal_years fy
                       WHERE fy.id = fiscal_periods.fiscal_year_id
                         AND fy.tenant_id = current_tenant_id()));

DROP POLICY IF EXISTS tenant_isolation ON transaction_lines;
CREATE POLICY tenant_isolation ON transaction_lines
  USING (EXISTS (SELECT 1 FROM transaction_headers h
                  WHERE h.id = transaction_lines.header_id
                    AND h.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM transaction_headers h
                       WHERE h.id = transaction_lines.header_id
                         AND h.tenant_id = current_tenant_id()));

DROP POLICY IF EXISTS tenant_isolation ON approval_events;
CREATE POLICY tenant_isolation ON approval_events
  USING (EXISTS (SELECT 1 FROM voucher_drafts d
                  WHERE d.id = approval_events.draft_id
                    AND d.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM voucher_drafts d
                       WHERE d.id = approval_events.draft_id
                         AND d.tenant_id = current_tenant_id()));

DROP POLICY IF EXISTS tenant_isolation ON user_roles;
CREATE POLICY tenant_isolation ON user_roles
  USING (EXISTS (SELECT 1 FROM users u
                  WHERE u.id = user_roles.user_id
                    AND u.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM users u
                       WHERE u.id = user_roles.user_id
                         AND u.tenant_id = current_tenant_id()));

DROP POLICY IF EXISTS tenant_isolation ON role_permissions;
CREATE POLICY tenant_isolation ON role_permissions
  USING (EXISTS (SELECT 1 FROM roles r
                  WHERE r.id = role_permissions.role_id
                    AND r.tenant_id = current_tenant_id()))
  WITH CHECK (EXISTS (SELECT 1 FROM roles r
                       WHERE r.id = role_permissions.role_id
                         AND r.tenant_id = current_tenant_id()));

-- 3. rls_bypassed() is gone. Nothing references it any more, and leaving a
--    function named "bypass RLS" lying around invites someone to wire it back
--    into a policy.
DROP FUNCTION IF EXISTS rls_bypassed();

-- 4. The permissions catalogue is global reference data, not tenant data.
--    Readable by all, writable only by the owner.
GRANT SELECT ON permissions TO PUBLIC;
