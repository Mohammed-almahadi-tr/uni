# Vercel deployment

UniFlow runs on Vercel's Node.js runtime and requires an external PostgreSQL
17 database. Supabase is the documented production target because the schema
uses PostgreSQL extensions, deferred triggers, exclusion constraints, and
row-level security.

## 1. Provision PostgreSQL

Create a Supabase project in a region close to the Vercel Function region.
Create the restricted `uniflow_app` role using the SQL in the project README.
Keep two distinct connection strings:

- `DATABASE_URL`: transaction pooler (port 6543), authenticated as
  `uniflow_app`, with `pgbouncer=true&connection_limit=1`.
- `DIRECT_URL`: session/direct pooler (port 5432), authenticated as the schema
  owner. Never use this value for `DATABASE_URL`.

From a trusted workstation, load the production variables and run:

```bash
npm ci
npm run db:deploy
npm run db:check-roles
```

Do not run migrations as part of every Vercel build. Parallel Preview and
Production builds may race, and Preview deployments should not mutate the
Production schema.

## 2. Create the Vercel project

Import the Git repository and use these settings:

- Framework preset: Next.js
- Root directory: `uniflow`
- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: leave unset (Next.js default)
- Function region: the region nearest the database

The build command runs `prisma generate` before `next build`; the generated
client is intentionally not committed.

Add these encrypted environment variables for Production (and for Preview
only if previews use a separate non-production database):

```text
DATABASE_URL
DIRECT_URL
SESSION_SECRET
```

Generate `SESSION_SECRET` with at least 48 random bytes:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## 3. Register the hostname

The tenant is resolved exclusively from the request hostname. After Vercel
assigns the production domain, add that hostname to the tenant's
`tenant_domains` rows and mark the intended hostname canonical. Add both the
Vercel domain and the custom domain if both should serve the tenant.

Set `DEMO_HOST` to the production hostname when running the demo seeder, for
example:

```bash
DEMO_HOST=uniflow.example.edu npm run seed:demo
```

Without a matching database hostname, deployment succeeds but the application
shows the "site not configured" screen.

## 4. Release check

After the first deployment:

1. Open `/en` and `/ar` on the registered hostname.
2. Sign in to the staff console and student portal.
3. Confirm `npm run db:check-roles` passes against Production.
4. Confirm Vercel logs contain no connection exhaustion or RLS errors.
5. Upload a small ministry workbook. Vercel Functions cap request payloads at
   4.5 MB, so the application deliberately limits workbooks to 4 MB, leaving
   room for multipart overhead.
