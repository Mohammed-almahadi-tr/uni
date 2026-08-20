/**
 * Redirect the application's default database clients at the test database.
 *
 * Runs as a Vitest `setupFile`, i.e. before the test module (and therefore
 * before `src/lib/db/client.ts`) is imported, so the module-scope clients are
 * constructed against the test database from the outset.
 *
 * Why this rather than passing a client into every function: application code
 * should not carry an injectable client parameter purely so tests can reach a
 * different database. Without this, any module that calls `withTenant()`
 * without an explicit client silently writes to the DEV database while the
 * fixtures live in the TEST one — which surfaces as baffling foreign-key
 * violations rather than as an obvious misconfiguration.
 */
import 'dotenv/config';

if (!process.env.TEST_DATABASE_URL || !process.env.TEST_DIRECT_URL) {
  throw new Error('TEST_DATABASE_URL and TEST_DIRECT_URL must be set to run the suite');
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DIRECT_URL;
process.env.SESSION_SECRET ??= 'test-only-session-secret-at-least-32-characters-long';
