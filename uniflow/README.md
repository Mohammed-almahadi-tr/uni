# UniFlow — University ERP

Multi-tenant university ERP. Replaces the legacy VB.NET/WinForms system (Oasis
E-University at Nile College; the Ribat University Application at Ribat and
UOT). See [`../srs_university_erp.md`](../srs_university_erp.md) for
requirements and [`../implementation_plan.md`](../implementation_plan.md) for
the delivery plan.

**Status: Phase 0 complete · Track A complete (A1-A7) · Track B under way (B1-B3).** Ledger invariants,
platform spine, auth/RBAC with segregation of duties, the bilingual RTL shell,
a normalised chart of accounts, a four-state maker-checker workflow whose
drafts are never deleted, and a working cashier desk: fee catalog, student
sub-ledger, multi-channel receipts, credit balances, deferred-revenue
recognition, aging, a cheque clearing pipeline that posts at every transition,
a fixed-asset register with an idempotent depreciation batch, budgetary control
with a full procure-to-pay chain, and the financial statements that make all of
it legible — trial balance, balance sheet, income statement, sub-ledger
reconciliation, and their CSV, Excel and print exports — plus the first of
Track B: the academic structure, an effective-dated versioned fee matrix,
admissions with real seat capacity, and the student profile with its document
checklists and medical records. **663 tests across 20 suites; typecheck, lint
and production build clean.**

The finance engine is done. **There is no user interface yet** — one demo route
proving the localisation layer works end to end, and nothing else. Tracks B
(student) and C (public surface), and the application UI over Track A, are the
work that remains.

---

## Getting started

```bash
npm install
npm run db:start      # real PostgreSQL 17, no Docker, no admin install
npm run db:roles      # create the non-superuser application role
npm run db:deploy     # apply migrations
npm test              # 663 tests
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
tests/cheques.test.ts      37  the five-state pipeline, custody, batch deposit
                               and clearing, bounce unwinding, returned-cheque
                               fees, repeat-bounce reporting, and one test per
                               legacy defect
tests/assets.test.ts       43  schedule arithmetic, proration, residue,
                               reducing-balance termination, capitalisation,
                               the idempotent batch, disposal gain and loss,
                               custody history, the job runner, and the
                               register/ledger reconciliation
tests/budget.test.ts       17  versioning and supersession, phasing and its
                               residue, the three overrun policies, cumulative
                               control, and the variance report
tests/procurement.test.ts  38  dual-authorised bank details, encumbrance
                               against the budget, the three-way match and its
                               hold, duplicate-invoice refusal, payment
                               approval, AP aging, and the vendor
                               sub-ledger/control-account reconciliation
                           ───
                           450
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

**A6 — Budget, encumbrance and procure-to-pay.** The legacy budget keyed a
line on four *text* account names over a free-form date range, with no
uniqueness, no version and no approval — and nothing anywhere consulted it
before money was committed. It was a report you looked at after you had
overspent. Procurement did not exist at all: no vendor, no order, no receipt,
no invoice, no payable. `frmMakePayBill` debited an expense straight against
cash at payment time, so goods received in March and paid for in June were
reported in June, and in between nothing recorded that the institution owed
anything.

Budgets are now **versions** — exactly one approved at a time, immutable once
approved, revised by a new version — with lines keyed by account id and a
per-line overrun policy of block, warn or advisory. Availability is
$\text{allocated} - \text{encumbered} - \text{actual}$, and it is checked at
purchase-order approval rather than reported afterwards.

The accrual chain is three steps rather than one:

```
receipt   DR Expense / Asset          CR Goods Received Not Invoiced
invoice   DR Goods Received Not Inv.  CR Vendor AP
payment   DR Vendor AP                CR Cash / Bank
```

so an expense keeps the date it was incurred and the payable appears on the day
the bill does. An **encumbrance is deliberately not a ledger posting** — an
approved order has acquired no asset and incurred no liability, and putting it
in the trial balance would mean writing a rule to take it out again.

Vendor bank details cannot be changed by an update at all: a trigger refuses
unless a second person has approved a change request naming exactly those
values. Redirecting a real supplier's payments needs no forged invoice, only an
edit to one row.

**B2 — Admissions, capacity and the committee.** The legacy seat-quota screen
saved with `Delete From StudentsVacants Where College=N'..'` and then inserted a
row naming the college *and* the batch — so setting one batch's quota deleted
every other batch's for that college. The same bug as the fee matrix, in a
second screen, which makes it a habit rather than an accident.

The deeper problem was that nothing consulted the quota when a place was given.
The report rebuilt two SQL views at runtime with `ALTER VIEW` and counted
students who had **paid**, from receipt vouchers. Seats taken meant money
received, so over-admission surfaced when the cash arrived. (Two side effects of
that `ALTER VIEW`: the client needed DDL rights on the live database, and two
people running the report at once overwrote each other's view — the second
user's academic year decided what the first one saw.)

Capacity is now checked **when a place is offered**, under a row lock on the
quota, and the counters are counted from the offers rather than stored. An
unanswered offer holds its seat, because treating it as free is how a programme
discovers it is over-subscribed on deadline day. Exceeding the quota needs a
separate MFA-gated permission, a stated reason and a second person — all three
enforced by constraint.

Around that: eligibility screening that normalises a score against its own
certificate scale before comparing (38 out of the IB's 45 is 84.4%, not 38),
committee scoring and ranked lists, offers with deadlines and a lapse batch,
waitlist promotion that records which seat it came from, duplicate detection
across both applications and enrolled students, and a bulk intake import that
previews before it writes.

One control emerged from the build. The database said an application in state
OFFERED must carry a committee decision; the offer code did not require one, and
eighteen tests failed on the contradiction. The constraint was right — so
allocating a seat now demands a recorded verdict with its rationale. Deciding
and admitting are separate acts, and collapsing them is how the old system
over-admitted.

**B3 — Profile, documents and medical.** One student lived in four tables with
no key joining them, and the four Arabic names were typed **twice**, on two
screens, by two clerks — `FrmStudForm2` into `StdForm`, `FrmDataEntery` into
`StdData`. Nothing reconciled them, and the search dialog read only the second,
so a name corrected on the admission form stayed wrong everywhere it was looked
up. The richer admission screen, `FrmForm.vb`, is 649 lines with its entire
save commented out.

The admission date was manufactured rather than recorded: `dat =
dat1.AddMinutes(10)`, ten minutes after the previous student in that faculty.
The other branch calls `dat.AddMinutes(30)` and throws the result away — `Date`
is a value type — and because `IsNull(Max(RegDate),0)` returns 1900-01-01, the
first student of every new faculty is dated 1900.

The medical form refused to save until all four Arabic name fields were filled
in and then inserted six columns, none of them a name. An unset HIV combo box
was stored as the empty string, so *never screened* and *screened negative*
were the same value. `Employee` held the data-entry clerk, so no record names
who examined anyone, and there was no verdict at all.

The replacement stores four discrete name parts per language — all four or
none, and the displayed name must equal them joined, both by database
constraint. Search runs over a GIN trigram index across every name part in both
languages, so a family name finds a student and أحمد finds احمد; the legacy
query was `Where StdFirName like N'<typed>%'`, a prefix of the *first* name.
Documents supersede rather than replace, one live per type per student, and the
verifier can never be the uploader. Medical records are append-only with one
current record each: a re-examination supersedes, and neither editing nor
deleting is possible even for the database owner — the same rule the ledger
applies to a posted voucher.

The profile is also **seeded from the application** at enrolment, which is what
having admissions and the registry in one database is for.

**B1 — Academic structure and the fee matrix.** The worst defect the legacy
audit has found is four lines apart in one file. The fee grid was loaded
`where Batch=.. and Colleges=.. and Type=..` and saved with
`Delete From TuitionFees Where Batch=N'..'` — college and admission type
dropped from the predicate. Pressing Save on the Medicine/General fee grid
deleted the fee schedules of **every faculty and every admission type in that
batch**, then re-inserted the dozen rows on screen. No transaction, so a
failure partway left the batch priced at nothing. It reported success.

A fee schedule here is versioned and effective-dated, and once approved it is
immutable — refused to every path including the schema owner. Revision creates
a new version; the old one keeps its date range and goes on pricing the days it
was in force. An exclusion constraint refuses two published versions that both
claim a date, so what a student owed on the day they registered has exactly one
answer, permanently. Approving a version closes the previous one the day before
the new one opens: adjacent, never overlapping, never leaving a gap.

The rest of the structure — faculties, programmes, batches, academic years and
terms — is keyed by id rather than by name, which is the same fix A1 applied to
the chart of accounts. The legacy `Programs.ProgramName` was read back with
`SELECT DISTINCT`, a batch list lived in a table called `AcademicYear`, and
`Colleges` was never a table at all.

**A7 — Financial statements.** The legacy trial balance and balance sheet did
not read the same table: `frmTrialBalance` summed `Transactionees`,
`frmBalanceSheetLevels` summed `Transactions`. The institution's two headline
statements were built from different halves of its books. Worse, the trial
balance aliased `Sum(TotalValueIn)-Sum(TotalValueOut)` to *both* its debit and
its credit column — one net figure printed twice — so it always appeared to
balance whatever the ledger contained. And `frmRptIncome`, despite the name, is
a student fee-collection listing: there was no income statement at all.

Every statement here reads one function. Trial balance with opening, movement
and closing at every level; balance sheet L1-L4 at any cutoff date; income
statement with a cost-centre filter and a comparative that can be the same
window a year earlier, because enrolment is seasonal. The trial balance
**asserts** that it balances, and totals are computed before any display filter
so restricting the report to a summary level changes what is shown and never
what is totalled.

Two things had to be built first, both specified in Phase 0 and neither needed
until a statement asked: go-live **opening balances**, posted as one flagged
voucher that lands in the opening columns rather than being reported as January
activity, and the **year-end close**, which zeroes revenue and expense into
retained surplus and is undone by reversal rather than by deletion.

Balance-sheet accounts carry forward by *derivation* rather than by copying
last year's closing figures into this year's opening columns. A copied figure
drifts the first time anyone posts a correction into a reopened period, and
nothing reports the drift; a derived one is recomputed from the same rows the
movement column is built from.

Any cutoff date works without breaking the performance promise: whole periods
come from the maintained aggregates and only a period the report window *cuts*
is read line by line — which, for a report run to a period boundary, is none.

**A5 — Fixed assets, depreciation, and the job runner.** The legacy system had
**no asset entity**: an "asset" was a row in the chart of accounts carrying a
`DeprPerc` column — no dates, no salvage, no useful life, no custodian, and no
accumulated-depreciation account, so net book value was not derivable. Its
batch read `MAX(MoveNo)` with no filter, posted against hardcoded English
strings into an Arabic chart, and would post the whole run again on a second
click.

The schedule is now **persisted at capitalisation**, so the period-end batch is
a lookup — and a lookup cannot produce a different answer on a re-run. The
first period is prorated by days and the last absorbs the rounding residue, so
a schedule sums to exactly cost − salvage.

The **durable job runner** ([`src/lib/jobs/runner.ts`](src/lib/jobs/runner.ts))
was built here because A6 dunning and the automatic late-fee rule need it too.
It runs a batch at most once per key, records when it ran and what it posted,
and lets a *failed* run be retried while making a *succeeded* one final.
Revenue recognition was migrated onto it, so the two period-end batches are one
concept.

**A4 — Cheque clearing.** The legacy implementation was a single `CheqClear`
boolean flipped by a grid click, and it had three defects at once: `0` meant
both "not presented yet" and "refused", so every cheque in the drawer showed as
bounced; clearing posted nothing, so the bank balance never moved; and a bounce
reinstated nothing, so a student whose cheque the bank refused went on showing
as paid. The third is the expensive one, and it is invisible from every side.

`RECEIVED → SENT_TO_BANK → CLEARED`, with `BOUNCED` reachable from either and
`CANCELLED` only before presentation — **and a ledger entry at every
transition**. Cheques on hand and cheques with the bank are separate accounts,
because "how much paper are we holding" and "where is it" are different
questions. A bounce splits its debit exactly as the original receipt split its
credit, which is what keeps the sub-ledger equal to its control accounts.

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

Track A is complete. What it is not is an application: the finance engine is
500 tests deep and has no screens over it. Three things run in parallel from
here.

**The application UI over Track A.** Auth screens, the app shell, and the
operator screens — cashier desk, voucher grid, approvals queue, chart of
accounts, budget, purchase orders, assets, and the statements this track just
finished. Designs exist; the wiring does not.

**Track B — student.** B1 and B2 are done: a cohort can be priced, and a place
can be offered without over-admitting. Next is **B3, the student profile**, then
**B4, the registration engine** — where a registration row and its balanced
ledger entry are created in one transaction or neither is. That is the
convergence milestone with Track A, and B1 built the fee schedule it bills
against while B2 built the path a student arrives by.

**Track C — public surface.** Theme engine and landing CMS, the public
admissions portal, and student/guardian self-service.

Tracks A and B converge at the **registration-posts-to-GL** milestone — the
integration the legacy system never made, where a registration and its balanced
ledger entry are created in one transaction or neither is. See the roadmap in
[`../implementation_plan.md`](../implementation_plan.md).
