# Admissions and finance delivery plan

## Scope boundary

Student Self Service starts only after a person is a registered student. It
must not expose application, ministry-import, medical-clearance, interview, or
admission-decision screens. A ministry candidate uses a separate, time-limited
candidate link to complete their profile; staff use the console.

The existing public `/apply` journey is also an applicant surface, not Student
Self Service. It stays separate from `/portal` and cannot grant portal access.

## Target workflow

```text
Ministry Excel import
  -> imported candidate
  -> candidate profile completed
  -> programme/faculty assigned
  -> medical requirements completed and cleared
  -> interview and fee decision
  -> accepted or rejected
  -> registrar enrolment
  -> initial payment recorded
  -> registered student / Student Self Service invitation
```

Every transition is server-side, permission-checked, and recorded with the
actor, time, prior state, next state, and reason where a decision is made.

## Delivery slices

### 1. Ministry candidate foundation (this slice)

- Add `MinistryImport` and `MinistryCandidate` records. A candidate is not a
  `Student`, cannot receive portal access, and does not appear in student
  reports.
- Capture the source file identity, import counts, row number, four-part
  Arabic name, school, national ID, admission year, and batch.
- Add the state machine:
  `IMPORTED`, `PROFILE_COMPLETED`, `MEDICAL_PENDING`, `MEDICALLY_CLEARED`,
  `INTERVIEW_PENDING`, `ACCEPTED`, `REJECTED`, `REGISTRATION_PENDING`, and
  `REGISTERED`.
- Build a parser and console import screen for an `.xlsx` template. It must
  preview all rows before commit, reject ambiguous headers and duplicate
  national IDs, retain a row-level error report, and make the commit atomic.

### 2. Candidate profile and medical clearance

- Issue a one-time candidate-profile link after import. It is not a portal
  account and expires/revokes independently.
- Collect English name, guardian, email, telephone, identity and academic
  details; record consent and completion time.
- Add faculty-configurable medical requirements, with blood group compulsory
  for every candidate. Store each result, the medical officer, and the final
  fitness verdict; prohibit the interview transition until all requirements
  are complete and fit/conditionally cleared.

### 3. Interview and approved fee decision

- Add a committee workspace that searches by national ID and displays only
  the data allowed to the committee.
- Record an accept/reject decision, mandatory rationale where relevant, and
  the deciding committee member.
- Record published fee, discount amount/reason, final fee, instalment decision
  and schedule. Reuse the existing fee matrix, discount governance and
  instalment primitives; do not create a second pricing engine.
- Apply new narrowly-scoped permissions and extend the segregation-of-duties
  matrix before exposing the screens.

### 4. Registrar enrolment and academic lifecycle

- Allow the registrar to enrol only an accepted candidate with an approved fee
  decision. Create the `Student` record atomically and retain the candidate ↔
  student link.
- Require the intended academic year, faculty/programme, admission category
  and batch. Raise the approved financial obligation through the existing
  registration/ledger path.
- Mark the candidate registered only after the required payment is recorded.
- Extend student lifecycle transitions for registered, continuing, frozen,
  dismissed, promoted, repeating and graduated. Promotion/repetition must be
  produced by the results process, not an unrestricted status edit.

### 5. Finance documents and accounting immutability

- Verify the five-level account hierarchy in database constraints and every
  chart-maintenance form. Levels 1–4 aggregate; only level 5 is postable.
- Complete receipt and payment voucher presentation/printing, attachments,
  approval evidence and links to posted headers and source transactions.
- Remove any deletion path for posted financial entries. Corrections create a
  linked reverse entry with equal, opposite lines, reason, actor and audit
  event; the original remains visible.

### 6. Security, rollout and verification

- Provide roles for admissions office, medical unit, interview committee,
  registrar, finance, student affairs and results office. Seed only
  conflict-free permission sets.
- Backfill no historical candidate as a student; import historical rosters
  through the same preview/commit pipeline.
- Test each state transition, tenant isolation, duplicate detection, file
  parsing, permission denial, fee approval, registration/payment gate,
  immutable reversal, bilingual UI, and the explicit absence of admissions
  routes/tabs from Student Self Service.

## Acceptance criteria

1. An Excel roster with the required columns can be previewed and atomically
   imported with row-level errors.
2. Imported people cannot sign into Student Self Service or appear as students.
3. A candidate cannot be interviewed before required medical clearance.
4. A registrar cannot enrol a rejected/unapproved candidate, and registration
   does not complete before the required payment is recorded.
5. Finance users cannot delete posted entries; reversals remain traceable to
   their originals.
6. Every admission and financial decision is permission-checked and auditable.
