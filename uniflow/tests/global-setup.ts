/**
 * Creates (or recreates) the test database and applies migrations to it, so
 * the suite never runs against dev data and always runs against the current
 * schema.
 */
import 'dotenv/config';
import { execSync } from 'node:child_process';
import pg from 'pg';

export default async function setup() {
  const testUrl = process.env.TEST_DATABASE_URL;
  const testOwnerUrl = process.env.TEST_DIRECT_URL;
  if (!testUrl) throw new Error('TEST_DATABASE_URL is not set');
  if (!testOwnerUrl) throw new Error('TEST_DIRECT_URL is not set');

  const dbName = new URL(testOwnerUrl).pathname.slice(1);
  const adminUrl = new URL(testOwnerUrl);
  adminUrl.pathname = '/postgres';

  const admin = new pg.Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    // TEMPLATE template0 + explicit UTF8, so the test database is UTF8 even
    // if the cluster template is not. Arabic is the primary language of this
    // system; a WIN1252 database cannot store a single student name.
    await admin.query(
      `CREATE DATABASE "${dbName}" TEMPLATE template0 ENCODING 'UTF8'`,
    );

    const check = new pg.Client({ connectionString: testOwnerUrl });
    await check.connect();
    try {
      const { rows } = await check.query(
        `SELECT pg_encoding_to_char(encoding) AS enc FROM pg_database WHERE datname = current_database()`,
      );
      if (rows[0].enc !== 'UTF8') {
        throw new Error(
          `Test database encoding is ${rows[0].enc}, not UTF8. ` +
            `Run "npm run db:reset" to rebuild the cluster with --encoding=UTF8.`,
        );
      }
    } finally {
      await check.end();
    }
  } finally {
    await admin.end();
  }

  // Migrations run as the OWNER.
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DIRECT_URL: testOwnerUrl, DATABASE_URL: testOwnerUrl },
  });

  // Then create/refresh the non-owner app role and its grants, so the
  // isolation suite exercises the same role split as production.
  execSync('node scripts/bootstrap-role.mjs', {
    stdio: 'inherit',
    env: { ...process.env, DIRECT_URL: testOwnerUrl },
  });
}
