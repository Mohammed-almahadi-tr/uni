import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

/**
 * Prisma 7 configuration.
 *
 * The URL here is used by the CLI only — `prisma migrate`, `prisma db push`,
 * `prisma studio`. It must be a DIRECT connection.
 *
 * The application runtime never reads this file. `src/lib/db/client.ts` builds
 * a `PrismaPg` adapter from DATABASE_URL instead.
 *
 * Why the two differ in production: on Supabase, DATABASE_URL points at the
 * transaction-mode pooler (port 6543), which cannot carry DDL, advisory locks
 * or session-level state. Migrations must therefore use DIRECT_URL (port
 * 5432). Locally both point at the same embedded Postgres, so the distinction
 * is invisible until deploy — which is exactly when it would otherwise bite.
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: env('DIRECT_URL'),
  },
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
});
