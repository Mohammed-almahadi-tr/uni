/**
 * Create the application database role.
 *
 * Why this exists
 * ---------------
 * PostgreSQL row-level security does not apply to superusers, and does not
 * apply to a table's owner unless the table is declared FORCE ROW LEVEL
 * SECURITY. The role that runs migrations is necessarily the owner, so if the
 * application connects with that same role, every RLS policy in the schema is
 * inert — and inert silently. The isolation tests catch it here; in
 * production nobody would notice until one university read another's ledger.
 *
 * So there are two roles, and they are not interchangeable:
 *
 *   owner  (uniflow)      — owns the schema, runs migrations, used by
 *                           withSystem() for platform-level work. Bypasses RLS
 *                           because it owns the tables.
 *
 *   app    (uniflow_app)  — NOSUPERUSER, NOBYPASSRLS, owns nothing. Every
 *                           request-serving query uses this role and is
 *                           therefore confined by RLS.
 *
 * On Supabase, do the same thing. The default `postgres` role owns everything
 * in `public`, so an app connecting as `postgres` is unconstrained by its own
 * policies. Create an equivalent app role there and point DATABASE_URL at it;
 * keep DIRECT_URL on the owner for migrations. `npm run db:check-roles`
 * asserts the split is intact and should run in CI against every environment.
 *
 * Idempotent — safe to run repeatedly.
 */
import 'dotenv/config';
import pg from 'pg';

const APP_ROLE = process.env.APP_DB_ROLE ?? 'uniflow_app';
const APP_PASSWORD = process.env.APP_DB_PASSWORD ?? 'uniflow_local_dev';

const ownerUrl = process.env.DIRECT_URL;
if (!ownerUrl) throw new Error('DIRECT_URL is not set');

const targets = [ownerUrl];
if (process.env.TEST_DIRECT_URL) targets.push(process.env.TEST_DIRECT_URL);

for (const url of targets) {
  const dbName = new URL(url).pathname.slice(1);
  const c = new pg.Client({ connectionString: url });
  await c.connect();
  try {
    // Roles are cluster-level, so create once; grants are per database.
    await c.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${APP_ROLE}') THEN
          CREATE ROLE ${APP_ROLE} LOGIN PASSWORD '${APP_PASSWORD}'
            NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        ELSE
          ALTER ROLE ${APP_ROLE} NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
        END IF;
      END
      $$;
    `);

    await c.query(`GRANT CONNECT ON DATABASE "${dbName}" TO ${APP_ROLE}`);
    await c.query(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`);
    await c.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${APP_ROLE}`,
    );
    await c.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${APP_ROLE}`);
    // Tables created by future migrations get the same grants automatically.
    await c.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${APP_ROLE}
    `);
    await c.query(`
      ALTER DEFAULT PRIVILEGES IN SCHEMA public
        GRANT USAGE, SELECT ON SEQUENCES TO ${APP_ROLE}
    `);

    // The app must never be able to alter the ledger's shape or its rules.
    await c.query(`REVOKE CREATE ON SCHEMA public FROM ${APP_ROLE}`);

    const { rows } = await c.query(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`,
      [APP_ROLE],
    );
    if (rows[0].rolsuper || rows[0].rolbypassrls) {
      throw new Error(
        `${APP_ROLE} has rolsuper=${rows[0].rolsuper} rolbypassrls=${rows[0].rolbypassrls}; ` +
          `it must have neither or RLS is inert.`,
      );
    }

    console.log(`· ${dbName}: role ${APP_ROLE} ready (NOSUPERUSER, NOBYPASSRLS)`);
  } finally {
    await c.end();
  }
}
