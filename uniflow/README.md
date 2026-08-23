# UniFlow — University ERP

Multi-tenant university ERP. Replaces the legacy VB.NET/WinForms system (Oasis
E-University at Nile College; the Ribat University Application at Ribat and
UOT). See [`../srs_university_erp.md`](../srs_university_erp.md) for
requirements and [`../implementation_plan.md`](../implementation_plan.md) for
the delivery plan.

**Status: Phase 0 complete · Track A1-A3 complete.** Ledger invariants,
platform spine, auth/RBAC with segregation of duties, the bilingual RTL shell,
a normalised chart of accounts, a four-state maker-checker workflow whose
drafts are never deleted, and a working cashier desk: fee catalog, student
sub-ledger, multi-channel receipts, credit balances, deferred-revenue
recognition and aging. **315 tests across 12 suites; typecheck, lint and
production build clean.**

Tracks A (finance), B (student) and C (public surface) run in parallel from
here.

---

## Getting started

```bash
npm install
npm run db:start      # real PostgreSQL 17, no Docker, no admin install
npm run db:roles      # create the non-superuser application role
npm run db:deploy     # apply migrations
npm test              # 315 tests
```

`db:start` stays in the foreground and holds the server. Run it in its own
terminal.

### Scripts

| Command | What it does |
| :--- | :--- |
| `npm run db:start` | Start local Postgres 17 (downloads binaries on first run) |
| `npm run db:stop` | Stop it |
| `npm run db:reset` | Destroy the cluster and rebuild it empty |
| `npm run db:roles` | Create/refresh the app role and its grants |
| `npm run db:check-roles` | **Assert tenant isolation can bind.** Run in CI against every environment |
| `npm run db:migrate` | Create and apply a migration from schema changes |
| `npm run db:deploy` | Apply pending migrations (non-interactive) |
| `npm test` | Full suite against a throwaway test database |
| `npm run typecheck` | `tsc --noEmit` |

---

## The two database roles

This is the single most important thing to get right in this codebase, and it
is easy to get wrong in a way that fails silently.

| | `DATABASE_URL` | `DIRECT_URL` |
| :--- | :--- | :--- |
| Role | `uniflow_app` | `uniflow` (owner) |
| Superuser | no | yes (locally) |
| BYPASSRLS | no | — |
| Owns tables | no | yes |
| Subject to RLS | **yes** | no |
| Used by | every request-serving query, via `withTenant()` | migrations, seeding, tenant provisioning, `withSystem()` |

PostgreSQL row-level security does not apply to superusers at all, and does not
apply to a table's owner unless the table is `FORCE ROW LEVEL SECURITY`. The
role that runs migrations is necessarily the owner. So if the application
connects with that same role, **every RLS policy in the schema is inert** — and
inert without any error, log line, or degradation. The first symptom would be
one university reading another's student ledger.

An earlier cut of this schema used one role plus an `app.bypass_rls` session
variable. Two things were wrong with it: the local role was a superuser so RLS
never applied at all, and a GUC that any client can set is not a boundary — the
very connection the policies constrained could switch them off. The isolation
suite caught both. Privilege now comes from the role.

`npm run db:check-roles` asserts the split holds. Run it in CI for every
environment including production.

---

## Deploying to Supabase

Supabase runs standard PostgreSQL, and the local cluster is pinned to
PostgreSQL 17 to match. Everything here — RLS, deferred constraint triggers,
`btree_gist` exclusion constraints, `NULLS NOT DISTINCT` indexes — works there
unchanged. Four things need attention.

### 1. Two endpoints, not interchangeable

Supabase exposes a transaction-mode pooler and a direct connection. They map
onto the two URLs this project already uses:

```bash
# Runtime. Transaction pooler on 6543. pgbouncer=true disables prepared
# statements, which transaction-mode pooling cannot support.
DATABASE_URL="postgresql://uniflow_app.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Migrations only. Direct, 5432. DDL, advisory locks and session state do not
# survive a transaction-mode pooler.
DIRECT_URL="postgresql://postgres.<ref>:<pw>@aws-0-<region>.pooler.supabase.com:5432/postgres"
```

Tenant isolation uses `SET LOCAL app.tenant_id`, which is transaction-scoped
and therefore safe behind the pooler. Session-level `SET` would persist on the
physical connection and leak to the next request — belonging to a different
tenant. `withTenant()` never uses session-level `SET`; do not change that.

### 2. Create the app role there too

Supabase's default `postgres` role owns everything in `public`. An app
connecting as `postgres` bypasses its own policies. In the SQL editor:

```sql
CREATE ROLE uniflow_app LOGIN PASSWORD '<strong-password>'
  NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO uniflow_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO uniflow_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO uniflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO uniflow_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO uniflow_app;
REVOKE CREATE ON SCHEMA public FROM uniflow_app;
```

Point `DATABASE_URL` at `uniflow_app`, `DIRECT_URL` at `postgres`. Then run
`npm run db:check-roles` against the deployed environment — if it fails,
isolation is not binding and the deploy should be blocked.

### 3. Keep off the reserved schemas

This schema lives entirely in `public` and touches none of Supabase's `auth`,
`storage`, `realtime` or `vault` schemas. Authentication is our own (Argon2id
+ RBAC + segregation of duties per SRS REQ-SOD-01), not Supabase Auth, because
the SoD matrix and the maker-checker workflow are richer than `auth.uid()`
supports. If you later adopt Supabase Auth for the student portal, bridge it —
do not replace the RBAC model with it.

### 4. Extensions

`btree_gist` is required (non-overlapping fiscal periods) and is on Supabase's
allowed list; the migration creates it. `pgcrypto`/`gen_random_uuid()` is
built into PostgreSQL 13+ and needs no extension.

---

## What Phase 0 established

| Concern | Where | Why it exists |
| :--- | :--- | :--- |
| Money as `numeric(19,4)` / `Decimal` | [`src/lib/money.ts`](src/lib/money.ts) | Legacy typed money as VB `Double` and formatted with `"N2"`, hiding accumulated error rather than preventing it |
| Voucher numbering under a row lock | [`src/lib/ledger/sequence.ts`](src/lib/ledger/sequence.ts) | Legacy used `MAX(n)+1` — a lost update under concurrency. Its fixed-asset module also omitted the year filter, colliding with prior years |
| Fiscal period model + posting lock | [`src/lib/ledger/period.ts`](src/lib/ledger/period.ts) | Legacy has no fiscal periods at all, so a mistyped year silently rewrote a closed year |
| One posting engine | [`src/lib/ledger/posting.ts`](src/lib/ledger/posting.ts) | Legacy registration and finance wrote to *different tables* with *different amount columns*, reconciled by hand. Registration posted nothing at all |
| Idempotency keys | [`src/lib/idempotency.ts`](src/lib/idempotency.ts) | A cashier double-pressing Save on a slow link is the expected condition at these campuses |
| Hash-chained audit log | [`src/lib/audit/log.ts`](src/lib/audit/log.ts) | Legacy *deleted* the draft row on approval, destroying the only evidence a voucher was ever reviewed |
| Role-based tenant isolation | [`src/lib/db/client.ts`](src/lib/db/client.ts) | — |
| Argon2id passwords, sessions, TOTP | [`src/lib/auth/`](src/lib/auth/) | Legacy compared **cleartext** passwords in application code, and `sa` credentials were compiled into the executable |
| 52 permissions + 13-pair SoD matrix | [`src/lib/auth/permissions.ts`](src/lib/auth/permissions.ts) | Legacy had *no roles at all* — one Enable/Disable flag, and any user could approve any voucher |
| Arabic تفقيط, Hijri calendar, name search | [`src/lib/i18n/`](src/lib/i18n/) | Legacy printed an English speller with `.Replace("Dollar","Pound")`; Arabic amounts-in-words never worked |
| Database-enforced invariants | [`prisma/migrations/*_ledger_invariants`](prisma/migrations) | Legacy checked balance in the UI only, so any non-UI code path could post a one-sided entry |

### The invariants are in the database

Balanced postings, period locks, immutability, control-account discipline and
tenant isolation are constraints and triggers, not application conventions.
The TypeScript performs the same checks so users get a readable sentence; the
database guarantees correctness whether or not the TypeScript is right.

The test suite asserts this by writing **raw SQL that bypasses the engine
entirely** and requiring the database to refuse.

```
tests/money.test.ts        16  precision, allocation, FX
tests/ledger.test.ts       28  balance, period lock, postability, control
                               accounts, immutability, reversal, aggregates
tests/concurrency.test.ts   7  60 parallel postings → 60 gapless numbers;
                               idempotent retry
tests/isolation.test.ts    15  cross-tenant read/write at the database layer,
                               plus a structural sweep that fails if ANY table
                               is added without a policy
tests/audit.test.ts         9  chain integrity, append-only, tamper detection,
                               jsonb key-order regression
tests/auth.test.ts         38  permissions, SoD matrix, passwords, sessions,
                               authorization, self-approval, TOTP
tests/auth-flow.test.ts    21  login, lockout, revocation, SoD at assignment,
                               MFA replay refusal, user tenant isolation
tests/i18n.test.ts         37  Arabic/English spelling, currency agreement,
                               Hijri round-trip, Arabic search normalisation
tests/i18n-catalogue.test.ts 5 message parity, no untranslated strings
tests/coa.test.ts          27  template integrity, install idempotency, level
                               derivation, sign inheritance, deactivation
tests/voucher.test.ts      56  live balancing, draft numbering, the four-state
                               workflow, self-approval and duplicate-checker
                               refusal, the content freeze, concurrent
                               approval, attachments, reversal
tests/cashiering.test.ts   56  fee catalog, account roles, Arabic student
                               search, gross billing with discounts, the four
                               payment channels, credit balances, same-day
                               cancellation, charge reversal, recognition,
                               instalments, statements, aging, and the
                               sub-ledger/control-account reconciliation
                           ───
                           315
```

---

## What Track A has delivered so far

**A1 — Chart of accounts.** A normalised tree (id, code, parent, derived
level) replacing five denormalised TEXT columns whose hierarchy was rebuilt by
five nested cursors on five separate connections. Ships a 60-account
university template with the three sub-ledger control accounts, accumulated
depreciation as a contra-asset, unearned fees, and FX difference accounts —
none of which the legacy chart had.

**A2 — Journal vouchers and maker-checker.** `DRAFT → PENDING_REVIEW →
PENDING_APPROVAL → POSTED`, with `REJECTED` reachable from either checker
stage and `CANCELLED` for a maker who abandons their own work. What the legacy
system did instead: inserted the lines and then
`DELETE FROM TempVouchers` — no reviewer, no reject path, no comment, no
approver recorded, and the delete destroyed the only evidence a review had
happened.

Four properties are enforced at the table, not by convention, because each is
an attack rather than a mistake:

| Property | Where | What it stops |
| :--- | :--- | :--- |
| Drafts are never deleted | `trg_draft_transition` | The legacy behaviour, exactly |
| Content frozen once submitted | `trg_draft_transition` | Submitting clean, then swapping the lines after review and before approval |
| Approver ≠ maker ≠ reviewer | [`src/lib/voucher/draft.ts`](src/lib/voucher/draft.ts) | One person taking both checks, which the permission matrix cannot see when roles change between stages |
| Approval and posting are one transaction | [`src/lib/voucher/draft.ts`](src/lib/voucher/draft.ts) | A draft marked POSTED whose ledger entry rolled back |

Two supporting pieces worth knowing about. Draft numbers come from **their own
series**, so an abandoned draft never burns a statutory voucher number. And
the balancing rules live in [`src/lib/ledger/lines.ts`](src/lib/ledger/lines.ts),
shared by the voucher grid and the posting engine as one implementation rather
than two specifications — a grid that says "balanced" against a server that
says "out by 0.01" leaves the maker stuck with no way to see why.

**A3 — Fee catalog, student AR and cashiering.** The critical path: where money
actually enters the system. The legacy cashier screen had a fee grid hardcoded
to two rows, resolved accounts by their Arabic *names* while writing English
literals into the grid, numbered receipts with `MAX(MoveNo) + 1`, recognised a
full year's tuition on registration day, and had no student control account at
all.

What replaces it, and why each piece is shaped the way it is:

| Piece | Shape | Because |
| :--- | :--- | :--- |
| [Fee catalog](src/lib/fees/catalog.ts) | 15 heads, each with its own revenue account and deferral behaviour | The grid had two rows, so revenue could not be attributed to what it was for |
| [Account roles](src/lib/coa/mapping.ts) | Modules ask for `STUDENT_AR_CONTROL`, never for code `11211` | The legacy source contained account *names*; renaming an account broke posting, translating one broke it twice |
| [Billing](src/lib/billing/charge.ts) | Gross, with the discount as its own expense line and deferrable fees crediting a liability | Netting the discount off hides scholarship exposure; crediting revenue on day one overstates it for the rest of the term |
| [Cashiering](src/lib/cashier/receipt.ts) | Cash lands in the cashier's own till; unmatched money credits a liability control account | "Which cashier is short today" has to be answerable from the ledger; an overpayment is a debt, not a negative asset |
| [Recognition](src/lib/billing/recognition.ts) | Schedule written at billing time, batch is a lookup | A batch that recalculates can produce a different answer on a re-run |
| [Reconciliation](src/lib/students/account.ts) | Sub-ledger vs control account, both directions | The check the legacy design made impossible |

**The idempotency key on `takeReceipt` is a required argument, not an option.**
A cashier on an unreliable link presses Save, sees nothing, and presses it
again. Making the key optional would mean every future caller decides afresh
whether duplicate receipts matter, and the answer is always the same.

The suite's central assertion: after a scripted term — twelve students, mixed
discounts, cash and bank receipts, an overpayment, a same-day cancellation, a
partly-paid charge reversed, two recognition runs — the student sub-ledger
equals its control accounts **to the cent**.

---

## Next

Track A continues at **A4 — the cheque clearing pipeline**. Cheque receipts
already land in cheques-receivable with their bank, due date and drawer, so the
portfolio exists and is waiting for its state machine. Track B (student) and
Track C (public surface) can run in parallel — see the roadmap in
[`../implementation_plan.md`](../implementation_plan.md). They converge at the
**registration-posts-to-GL** milestone, which is the integration the legacy
system never made.
