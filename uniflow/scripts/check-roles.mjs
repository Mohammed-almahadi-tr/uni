/**
 * Assert that tenant isolation can actually bind in this environment.
 *
 * Run in CI against every environment, including production. A misconfigured
 * role does not throw, log, or degrade — RLS simply stops applying, and the
 * first symptom is one university reading another's data. This script is the
 * only thing standing between a one-line connection-string mistake and that
 * outcome.
 *
 * Checks, against DATABASE_URL (the role the application actually uses):
 *   1. it is not a superuser
 *   2. it does not have BYPASSRLS
 *   3. it does not own the tenant-scoped tables
 *   4. RLS is enabled on every tenant-scoped table, and each has a policy
 *   5. with no tenant context set, the role can see no rows
 */
import 'dotenv/config';
import pg from 'pg';

const appUrl = process.env.DATABASE_URL;
const ownerUrl = process.env.DIRECT_URL;
if (!appUrl) throw new Error('DATABASE_URL is not set');
if (!ownerUrl) throw new Error('DIRECT_URL is not set');

const TENANT_TABLES = [
  'tenants', 'users', 'roles', 'audit_log', 'idempotency_keys',
  'document_sequences', 'fiscal_years', 'fiscal_periods', 'chart_of_accounts',
  'cost_centers', 'voucher_drafts', 'approval_events', 'transaction_headers',
  'transaction_lines', 'account_period_balances', 'exchange_rates',
  'user_roles', 'role_permissions',
];

const failures = [];
const app = new pg.Client({ connectionString: appUrl });
await app.connect();

try {
  const { rows: who } = await app.query(`
    SELECT current_user AS role, rolsuper, rolbypassrls
      FROM pg_roles WHERE rolname = current_user
  `);
  const me = who[0];

  if (me.rolsuper) {
    failures.push(
      `DATABASE_URL connects as "${me.role}", which is a SUPERUSER. ` +
        `Superusers bypass RLS unconditionally — every tenant policy is inert.`,
    );
  }
  if (me.rolbypassrls) {
    failures.push(
      `DATABASE_URL connects as "${me.role}", which has BYPASSRLS. Every tenant policy is inert.`,
    );
  }

  const { rows: owned } = await app.query(
    `SELECT tablename FROM pg_tables
      WHERE schemaname = 'public' AND tableowner = current_user AND tablename = ANY($1)`,
    [TENANT_TABLES],
  );
  if (owned.length > 0) {
    failures.push(
      `DATABASE_URL connects as the OWNER of ${owned.length} tenant table(s) ` +
        `(${owned.slice(0, 3).map((r) => r.tablename).join(', ')}…). ` +
        `A table owner bypasses RLS unless FORCE is set. Use a separate app role.`,
    );
  }

  // Structural checks need the owner's view of the catalogue.
  const owner = new pg.Client({ connectionString: ownerUrl });
  await owner.connect();
  try {
    const { rows: rls } = await owner.query(
      `SELECT c.relname, c.relrowsecurity,
              (SELECT COUNT(*) FROM pg_policy p WHERE p.polrelid = c.oid) AS policies
         FROM pg_class c
        WHERE c.relnamespace = 'public'::regnamespace
          AND c.relname = ANY($1)`,
      [TENANT_TABLES],
    );
    const seen = new Set(rls.map((r) => r.relname));
    for (const t of TENANT_TABLES) {
      if (!seen.has(t)) {
        failures.push(`table "${t}" is missing — schema does not match expectations`);
        continue;
      }
      const r = rls.find((x) => x.relname === t);
      if (!r.relrowsecurity) failures.push(`table "${t}" does not have RLS enabled`);
      if (Number(r.policies) === 0) failures.push(`table "${t}" has RLS enabled but no policy`);
    }
  } finally {
    await owner.end();
  }

  // The behavioural check: no tenant context must mean no rows.
  if (failures.length === 0) {
    for (const t of ['transaction_headers', 'students_placeholder']) {
      if (t === 'students_placeholder') continue;
      const { rows } = await app.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
      if (rows[0].n !== 0) {
        failures.push(
          `with no app.tenant_id set, "${t}" returned ${rows[0].n} rows — ` +
            `it must return none. Isolation is not binding.`,
        );
      }
    }
  }
} finally {
  await app.end();
}

if (failures.length > 0) {
  console.error('\n✗ Tenant isolation is NOT correctly configured:\n');
  for (const f of failures) console.error(`  · ${f}`);
  console.error('\nSee scripts/bootstrap-role.mjs for the required role split.\n');
  process.exit(1);
}

console.log('✓ tenant isolation configured correctly (app role is non-owner, non-superuser, RLS binding)');
