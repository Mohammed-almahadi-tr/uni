# UniFlow User Manual

> الدليل العربي المحدث: [دليل استخدام نظام جامعة امدرمان الاهلية](user-manual-ar.md)
>
> ملاحظة: القبول العام الذاتي الموضح في النسخة الإنجليزية القديمة موقوف؛
> المسار المعتمد حالياً يبدأ حصراً من كشف الوزارة. راجع الدليل العربي أعلاه.

Version: 1.0  
Applies to: the current UniFlow web application  
Languages: English and Arabic (`/en/...` and `/ar/...`)

## 1. Purpose of this manual

This manual explains how to use every user-facing area currently available in
UniFlow. It is organized by task and user role rather than by source-code
module.

UniFlow has four separate user surfaces:

| Surface | Typical users | Entry point |
| --- | --- | --- |
| Public website | Visitors and prospective applicants | `/en` or `/ar` |
| Application and candidate forms | Applicants and ministry candidates | `/apply`, `/apply/status`, `/candidate/profile` |
| Student Self Service | Registered students and authorized guardians | `/portal/login` |
| Staff Console | University employees | `/login` |

Important: admission is **not** part of Student Self Service. Applicants and
ministry candidates use separate application/candidate forms. Only a person
who has become a student and has been granted portal access can use Student
Self Service.

## 2. General use

### Choose a language

Use **العربية** or **English** in the public-site header. The selected language
changes the interface direction as well as the text. Arabic is right-to-left;
English is left-to-right.

### Sign in as staff

1. Open `/en/login` or `/ar/login`.
2. Enter the staff email address and password.
3. Select **Sign in**.
4. If the requested operation requires additional verification, enter the
   six-digit code from the authenticator application.

The Console displays only areas allowed by the signed-in user's permissions.
Typing the address of a hidden screen does not bypass this restriction.

### Change appearance

Use the appearance control in the Staff Console to select **System**,
**Light**, or **Dark**. System follows the device setting.

### Sign out

Use **Sign out** in the Console or Student Self Service before leaving a
shared computer.

### Understand common messages

- A green message means the operation completed.
- A red message describes an error that must be corrected.
- A warning normally indicates a control such as an approval, hold, capacity
  limit, closed period, or missing document.
- A disabled button means the user lacks authority or a prerequisite is
  incomplete.

## 3. Public website

### Browse programmes

1. Select **Programmes** in the public header.
2. Select a faculty or programme.
3. Review the programme overview and any published tuition information.

If fees are not published for the selected intake, contact the admissions
office. The public website does not calculate or approve individual discounts.

### Read news and calendar events

1. Select **News** to see published posts.
2. Open a post to read its full content.
3. Select **Calendar** to see published university events.

Draft or archived content is not visible publicly.

### Send an enquiry

1. Select **Contact**.
2. Enter the requested contact details and message.
3. Submit the form.

The enquiry enters the staff enquiry queue. Submitting an enquiry does not
create an application or a student account.

## 4. Public admission application

### Start and submit an application

1. Select **Apply** on the public website.
2. Choose the available intake and admission category.
3. Enter identity and contact information.
4. Enter certificate details and results.
5. Rank the available programme choices.
6. Review all entered information.
7. Submit the application.
8. Save the application number and tracking token shown on the receipt.

The form saves progress between steps. Use the form's discard option only when
the draft is no longer needed. A submitted application enters the admissions
workflow and is no longer merely a browser draft.

### Check application status

1. Open `/en/apply/status` or `/ar/apply/status`.
2. Enter the application number and tracking token.
3. Select the lookup button.
4. Review the current state, intake, choices, and offer information if one has
   been issued.

Keep the tracking token private. It is not a password and does not grant
Student Self Service access.

## 5. Ministry candidate process

### Import a ministry roster (staff)

Required permission: `admission.import`.

1. In the Staff Console, open **Registry → Ministry roster import**.
2. Prepare an `.xlsx` workbook of 5 MB or less.
3. Put the headings in the first row. The required headings are:
   `الاسم الرباعي`, `المدرسة`, `الرقم الوطني`, `سنة القبول`, and `الدفعة`.
4. Ensure the workbook contains exactly one batch.
5. Select the workbook and choose **Validate and import roster**.
6. Correct every reported row error and upload the corrected workbook again.

The import is all-or-nothing. It rejects invalid years, unknown/inactive
batches, duplicated national IDs, mixed batches, and a file that was already
imported. Successful rows create **candidates**, not students.

### Issue a candidate profile code (staff)

Required permission: `admission.manage`.

1. Open **Registry → Ministry roster import**.
2. Find the imported candidate in the list.
3. Select **Issue profile code**.
4. Give the displayed 32-character code to the candidate through an approved
   communication channel.
5. Tell the candidate that the code expires after 14 days.

Only one unused code remains valid for a candidate. Issuing another code
revokes the previous unused code. The code is shown once and is not a Student
Self Service invitation.

### Complete the candidate profile (candidate)

1. Open `/en/candidate/profile` or `/ar/candidate/profile`.
2. Enter the profile code supplied by the admissions office.
3. Confirm that the Arabic name and national ID shown belong to you.
4. Enter the full English name, guardian name, email, and telephone number.
5. Submit the profile.

The code becomes unusable after submission. The candidate state becomes
`PROFILE_COMPLETED`. This page does not provide access to student balances,
registrations, documents, or any other student record.

Profile completion is not final enrolment. It only makes the candidate ready
for programme placement and the medical gate.

### Configure faculty medical requirements (medical staff)

Required permission: `medical.manage`.

1. Open **Registry → Candidate medical gate**.
2. Under **Faculty medical requirements**, select a faculty.
3. Enter a stable requirement code and its Arabic and English names.
4. Mark the check as required when every candidate in that faculty must have a
   result before clearance.
5. Select **Add requirement**.

Requirements that are no longer used are deactivated, not deleted. This keeps
older assessments understandable. Every faculty must have at least one active,
required check before a candidate can be medically cleared.

### Assign a candidate to a programme (admissions staff)

Required permission: `admission.manage`.

1. Open **Registry → Candidate medical gate**.
2. Search by Arabic/English name or national ID and select the candidate.
3. Under **Programme placement**, select an active programme.
4. Select **Assign and send to medical**.

The profile must already be complete. Assignment moves the candidate to
`MEDICAL_PENDING` and determines which faculty checklist applies. The
programme cannot be changed after an assessment is recorded.

### Record a candidate medical assessment (medical staff)

Required permission: `medical.manage`.

1. Open the candidate in **Registry → Candidate medical gate**.
2. Enter the examination date and medical officer's name.
3. Record the blood group; it is mandatory for every candidate.
4. Record Pass or Fail for every required faculty check.
5. Choose Fit, Fit with conditions, or Unfit. Add a note for a conditional or
   unfit verdict.
6. Select **Record assessment**.

A Fit verdict cannot be saved when a required check failed. Fit and Fit with
conditions move the candidate to `MEDICALLY_CLEARED`; Unfit leaves the
candidate at the medical gate. Re-examination creates a new append-only record
and supersedes the previous result.

### Send a medically cleared candidate to interview (admissions staff)

Required permission: `admission.manage`.

1. Open the medically cleared candidate.
2. Under **Next admissions step**, select **Send to interview queue**.

The system verifies a current Fit or Fit with conditions assessment and then
moves the candidate to `INTERVIEW_PENDING`. This still does not create a
Student record or Student Self Service account.

### Record the interview decision and financial terms (committee staff)

Required permission: `admission.manage`.

1. Open **Registry → Candidate interviews**.
2. Search for and select a candidate in `INTERVIEW_PENDING`.
3. Choose Accept, Conditional accept, or Reject and enter the optional score.
4. For Conditional accept, enter the acceptance conditions. For Reject, enter
   the committee reason.
5. For an accepted candidate, enter the approved discount percentage and
   number of instalments. A rejected candidate cannot receive financial terms.
6. Select **Record final committee decision**.

The decision is immutable and audited. Accepted and conditionally accepted
candidates move to `ACCEPTED`; rejected candidates move to `REJECTED`.

### Finalize admission for registrar processing

Required permission: `admission.manage`.

1. Review the recorded decision and financial terms on the candidate.
2. Select **Finalize and send to registration**.

The candidate moves to `REGISTRATION_PENDING`. This freezes the committee
decision but still does not create a Student record or Student Self Service
account. Student creation, initial registration, fee charging, and applying
the approved instalment terms are the registrar's next controlled step.

## 6. Admissions committee

### Review a cohort

Required permission: `application.read`.

1. Open **Registry → Admissions**.
2. Select a programme and intake batch.
3. Select **Show**.
4. Review ranked applicants, eligibility outcomes, certificate scores,
   committee scores, decisions, offers, and the waiting list.

Applicants who failed automated screening remain visible so the committee can
see and deliberately handle exceptions.

### Re-screen an application

1. Open the relevant programme and batch.
2. Find the application.
3. Run the screening action after correcting source information or rules.
4. Review the new pass/fail result and notes.

### Record a committee score and decision

Required permission: `application.decide`.

1. Find the applicant in the ranked list.
2. Enter the committee score if used by the institution.
3. Choose Accept, Conditional Accept, Waitlist, or Reject.
4. Enter the decision note or rationale.
5. Submit the decision.

Recording a decision does not itself allocate a seat. An offer is a separate
controlled step.

### Issue an offer

Required permission: `application.offer`. Exceeding capacity additionally
requires `admission.override` and a reason.

1. Select an accepted or conditionally accepted application.
2. Choose the programme being offered.
3. Enter the last acceptance date.
4. Enter any conditions and required deposit.
5. If capacity must be exceeded, enter the override reason.
6. Issue the offer.
7. Open the offer letter when a printable copy is required.

Issued offers reserve seats. An unanswered offer remains active until it is
accepted, declined, withdrawn, or marked lapsed.

### Accept, decline, or withdraw an offer

1. Find the issued offer.
2. Choose the appropriate response.
3. Supply a reason for decline or institutional withdrawal.
4. Confirm the action.

### Promote an applicant from the waiting list

1. Confirm that a prior offer has freed a seat.
2. Select the waiting-list applicant.
3. Associate the promotion with the freed offer.
4. Enter the acceptance deadline and conditions.
5. Issue the promoted offer.

### Turn an accepted offer into a student

Required permission: `application.enrol`.

1. Confirm that the offer state is Accepted.
2. Enter the student number.
3. Run the enrol action.
4. Open the new student record in Registry.

This operation creates the student record atomically. Student Self Service is
still not automatic; a separate portal invitation must be issued.

## 7. Student Registry

### Search for a student

Required permission: `student.read` or `student.manage`.

1. Open **Registry → Students**.
2. Search using Arabic or English name, student number, or national ID.
3. Optionally filter by status.
4. Select **Open** on the required student.

### Review a student record

The profile displays placement, account summary, holds, standing history,
registrations, documents, and medical status according to permissions.

Use the action links to register the student, manage holds, change standing,
open documents, open medical records, or print the student card.

### Verify student documents

Required permission: `document.verify`.

1. Open **Registry → Document verification**.
2. Search for and select the student.
3. Review each programme-required document.
4. Select **Verify** for a valid document.
5. Select **Reject** and enter a reason when the document is unacceptable.

The person who uploaded a document cannot verify it. Expired documents remain
outstanding even if they were previously verified.

### Record a medical examination

Required permissions: `medical.read` and/or `medical.manage`.

1. Open **Registry → Medical records**.
2. Search for and select the student.
3. Enter examination date and medical officer.
4. Record blood group, Hepatitis B and HIV screening states.
5. Enter allergies, chronic conditions, validity date, and notes where needed.
6. Choose Fit, Fit with conditions, or Unfit.
7. For a conditional or unfit verdict, enter the required explanation.
8. Save the examination.

A new examination supersedes the current one; history is retained. “Not
tested” is different from a negative result.

### Place a hold

Required permission: `hold.manage`.

1. Open **Registry → Holds** and select a student.
2. Choose Financial, Academic, Disciplinary, or Documentary.
3. Enter the effective date and reason.
4. Specify whether it blocks registration.
5. Optionally restrict clearance to a named role.
6. Save the hold.

### Clear a hold

1. Open the student's live holds.
2. Confirm that your role is allowed to clear the hold.
3. Enter a clearance note.
4. Select **Clear**.

The placer cannot clear their own hold. Derived arrears holds disappear when
the underlying arrears are paid.

### Change student standing

Required permission: `student.status`.

1. Open **Registry → Status, transfer and withdrawal**.
2. Select the student.
3. Choose an allowed next status.
4. Read the displayed financial consequence.
5. Enter effective date, reason, requester, approval, refund election, or
   posting date when requested.
6. Confirm the change.

Only transitions allowed from the current state are offered. A status change
may retain charges, reverse term billing, or apply the refund policy.

### Transfer a student to another programme

Required permission: `registration.transfer`.

1. Open **Registry → Status, transfer and withdrawal**.
2. Select the student and destination programme.
3. Select the academic term and year of study.
4. Enter effective date and reason.
5. Confirm the transfer.

The previous programme billing is reversed through a linked voucher and the
new programme is billed using its own approved fee schedule.

## 8. Registration

### Price a registration

Required permission: `registration.create`.

1. Open **Registry → Registration desk**.
2. Search for and select the student.
3. Choose the term, year of study, and registration date.
4. Select optional fee items where appropriate.
5. Enter permitted discounts and reasons.
6. Select **Price it**.
7. Review gross fees, discounts, net amounts, and fee-schedule version.

Pricing is a preview and does not post to the ledger.

### Register the student

1. Complete and review the pricing step.
2. Select **Register**.
3. Record the registration number and voucher number shown.

A discount above the institution threshold creates a pending registration.
Nothing posts until a different user with `discount.approve` approves it.

### Approve a registration discount

Required permission: `discount.approve`.

1. Open **Registry → Registrations**.
2. Open the pending registration.
3. Review the fee lines, discount, reason, and requester.
4. Approve the discount and posting.

The user who applied the discount cannot approve it.

### Cancel a registration

Required permission: `registration.cancel`.

1. Open the registration detail.
2. Enter a cancellation reason.
3. Enter the reversal posting date when required because the original period
   is closed.
4. Confirm cancellation.

The registration remains on file as Cancelled. Billing is corrected through a
linked reversal voucher; the original posting is not deleted.

### Print a registration card

1. Open the registration detail.
2. Select the print/card link.
3. Use the browser print dialog.

The verification address and token allow a recipient to verify the card.

## 9. Student Self Service

### Activate access

Staff first issues an invitation from the student's Registry profile.

1. Open `/portal/activate`.
2. Enter the invitation code.
3. Confirm the student and invitation details.
4. Create a password, or enter the existing password if the email already has
   a portal account.
5. Complete activation.

Invitation codes are one-time, expiring credentials. A guardian invitation
must state the relationship to the student.

### Sign in

1. Open `/portal/login`.
2. Enter portal email and password.
3. Select **Sign in**.

Portal accounts are separate from staff accounts.

### Use the portal

The available tabs are:

- **Overview:** status, holds, balance summary, and recent information.
- **Account:** billed, paid, outstanding, credit balance, and current amount
  due.
- **Statement:** chronological student-account transactions and balances.
- **Instalments:** instalment plans, due dates, and payment state.
- **Registrations:** registrations and printable registration cards.
- **Documents:** required, pending, verified, rejected, or expired documents.
- **Settings:** change password and sign out.

A guardian linked to more than one student uses the student selector in the
portal header. The selected student remains selected while moving between
tabs.

Student Self Service contains no admissions screens or controls.

## 10. Cashiering and receipts

### Assign a cash till

Required permission: `coa.manage`.

1. Open **Finance → Cash tills**.
2. Select the cashier and cash account.
3. Save the assignment.

A cashier cannot record cash without an appropriate till assignment.

### Take a student payment

Required permission: `receipt.create`.

1. Open **Finance → Cashier desk**.
2. Search for and select the student.
3. Review the outstanding balance and open charges.
4. Select Cash, Bank Transfer, Cheque, or Gateway.
5. Enter amount, date, reference, and channel-specific information.
6. Price/preview allocation when offered.
7. Confirm the receipt.
8. Print or record the receipt number.

The posting and receipt are one transaction. Credit balances are retained on
the student's account rather than disappearing.

### Apply an existing credit balance

1. Select the student in the Cashier desk.
2. Review available credit and unpaid charges.
3. Choose the charges to settle.
4. Apply the credit.

This is not a new cash payment; it reallocates an existing student credit.

### Cancel a receipt

Required permission: `receipt.cancel`.

1. Open **Finance → Receipts**.
2. Open the receipt.
3. Enter the cancellation reason.
4. Confirm cancellation.

Cancellation is restricted and belongs to a supervisor role. It does not
erase audit history.

### Process cheques

Required permissions depend on the action: `cheque.manage` or
`cheque.cancel`.

1. Open **Finance → Cheques**.
2. Use the portfolio filters to find a cheque.
3. Record deposit when it is sent to the bank.
4. Record clearance when the bank confirms payment.
5. Record bounce when the bank refuses it.
6. Return an unpresented cheque to the drawer only through the permitted
   cancellation action.

Cheque status and physical custody are tracked separately. A bounced cheque
unwinds the receipt allocation and may trigger the configured returned-cheque
fee.

## 11. Journal vouchers

### Create and submit a voucher

Required permission: `voucher.create`.

1. Open **Finance → Journal vouchers**.
2. Create a draft and choose voucher type and document date.
3. Enter the description and source reference where relevant.
4. Add debit and credit lines with accounts, amounts, cost centres, and
   sub-ledger identities where required.
5. Save the draft as often as needed.
6. Confirm that total debit equals total credit.
7. Submit for review.

The content freezes after submission. Abandoning a draft marks it Cancelled;
it is not deleted.

### Review and approve a voucher

Required permissions: `voucher.review` for the first check and
`voucher.approve` for final approval/posting.

1. Open **Finance → Approval queue**.
2. Review the document, supporting attachments, lines, balance, date, and
   source.
3. The reviewer selects Review or Reject and supplies comments when required.
4. A different final approver selects Approve and Post or Reject.

The maker, reviewer, and approver must be different users. Approval and ledger
posting occur together.

### Reverse a posted voucher

Required permission: `voucher.reverse`.

1. Open the posted voucher.
2. Select the reversal action.
3. Enter the reason and valid posting date.
4. Confirm.

UniFlow creates a new voucher with equal and opposite entries and links it to
the original. Posted vouchers cannot be edited or deleted.

## 12. Fiscal periods

### Open or close a period

Required permission: `period.close`; viewing uses `period.read`.

1. Open **Finance → Fiscal periods**.
2. Select the relevant fiscal year and period.
3. Change the allowed status.
4. Use the permanent seal only after all checks are complete.

Normal posting into a closed period is refused. Corrections must use a valid
open-period posting date. A permanently closed period cannot be reopened.

## 13. Payment vouchers

### Draft a payment

Required permission: `payment.create`.

1. Open **Finance → Payment vouchers**.
2. Select the payee/vendor, bank account, date, currency, and allocations.
3. Enter payment details and save the draft.
4. Submit for approval.

### Approve and release a payment

Required permission: `payment.approve` and any configured second-factor
verification.

1. Open the pending payment.
2. Confirm the approved invoice, payee, bank details, amount, and evidence.
3. Approve and release, or reject with a reason.

The preparer cannot approve the payment.

## 14. Academic setup

### Maintain faculties, departments, programmes, batches, and categories

Required permission: `academic.manage`; viewing uses `academic.read`.

1. Open **Academic → Faculties and programmes**.
2. Choose the structure type to add.
3. Enter code, Arabic name, English name, and parent structure where required.
4. Save.
5. Use the withdrawal/deactivation action instead of deleting structures that
   have history.

### Open an academic year and manage terms

1. Open **Academic → Faculties and programmes**.
2. Create/open the academic year.
3. Define terms and dates.
4. Change term status through the available controlled action.

### Set the public application window

1. Select the intake batch.
2. Enter application opening and closing dates.
3. Save the window.

With no active window, the public application form does not accept that intake.

### Set programme capacity

Required permission: `admission.capacity`.

1. Open **Academic → Seat quotas**.
2. Select programme, batch, and admission category.
3. Enter total and reserved seats.
4. Choose whether controlled override is permitted.
5. Save.

Capacity is enforced when an offer is issued, not counted retrospectively.

### Create or revise a fee schedule

Required permission: `feematrix.manage`; approval requires
`feematrix.approve` by another authorized user.

1. Open **Academic → Fee matrix**.
2. Select programme, batch, admission category, nationality category, currency,
   and effective date.
3. Add fee items, amounts, recurrence, optional status, and notes.
4. Save the draft.
5. For a change, create a revision rather than editing an approved version.
6. Review the version comparison.
7. Have an independent approver publish the schedule.

Approved schedules are versioned and effective-dated. Publishing a revision
does not rewrite historical registrations.

## 15. Sponsors and scholarships

### Create and activate a sponsor contract

Required permissions include `sponsor.manage` and an independent
`sponsor.approve`.

1. Open **Academic → Sponsors**.
2. Add the sponsor and contact details.
3. Draft a contract with dates, currency, coverage rules, and limits.
4. Submit/activate through the authorized approval action.
5. End the contract through the controlled end action when required.

### Invoice a sponsor and record payment

Required permission: `sponsor.invoice`.

1. Open the sponsor invoicing area.
2. Select covered student charges.
3. Raise the sponsor invoice.
4. Open the invoice detail/print view if a document is required.
5. Record sponsor receipts and allocations.

### Create and award a scholarship

1. Open **Academic → Scholarships**.
2. Add a scheme with eligibility, period, and budget.
3. Select a student and propose an award.
4. Enter amount/coverage and justification.
5. An independent holder of `scholarship.approve` approves or rejects it.

The proposer cannot approve their own award.

## 16. Procurement

### Add and manage a vendor

Required permission: `vendor.manage`.

1. Open **Procurement → Vendors**.
2. Add vendor code, Arabic/English name, tax number, category, payment terms,
   and contact details.
3. Save.
4. Use Block when transactions with the vendor must stop.

### Change vendor bank details

1. Propose the new bank name, account name, account number/IBAN, and reason.
2. A different user with `vendor.approve` reviews the request.
3. Approve or reject it.

Bank details do not change until independently approved.

### Prepare and approve a budget

1. Open **Procurement → Budgets**.
2. Draft a budget version for the fiscal year.
3. Add account/cost-centre lines, allocations, and control policy.
4. Submit the version.
5. A different user with `budget.approve` approves or rejects it.

Budget policies may be Advisory, Warn, or Block. Approved versions are not
edited; revisions are new versions.

### Create and approve a purchase order

1. Open **Procurement → Purchase orders**.
2. Select vendor, order date, expected date, terms, cost centre, and items.
3. Save/submit the order.
4. A different user with `po.approve` approves or rejects it.

Approval creates an encumbrance against the budget. It does not create a
general-ledger expense yet.

### Record goods or services received

Required permission: `grn.create`.

1. Open **Procurement → Goods received**.
2. Select an approved purchase order.
3. Enter received quantities and date.
4. Confirm receipt.

Receipt posts the expense/asset against Goods Received Not Invoiced and
releases the matching encumbrance.

### Record and approve a vendor invoice

Required permission: `apinvoice.record`. A held exception requires an
independent `apinvoice.approve`.

1. Open **Procurement → Vendor invoices**.
2. Select vendor and related order/receipt.
3. Enter invoice number, dates, currency, and lines.
4. Submit.
5. If the three-way match is within tolerance, the invoice posts normally.
6. If outside tolerance, an independent approver reviews and approves or
   rejects the exception.

### Register, depreciate, or dispose of an asset

1. Open **Procurement → Fixed assets**.
2. Maintain asset categories and register assets using the available forms.
3. Select a fiscal period and run depreciation with `asset.depreciate`.
4. For disposal, enter date, method, proceeds, and reason with
   `asset.dispose`.

Depreciation jobs are idempotent: re-running the same completed period does not
post it twice. Disposal calculates and posts gain or loss.

## 17. Reports

### Run a financial or student report

Required permission: `report.financial` and/or `report.student`.

1. Open **Reports**.
2. Choose Trial Balance, Financial Statements, Aged Receivables,
   Reconciliation, Student Statement of Account, or Discount Exposure.
3. Enter the required date, fiscal year, period, student, or grouping filters.
4. Run the report.
5. Review totals and notes before export.

### Export or print

Use the report controls to export CSV, Excel (`.xlsx`), or printable HTML where
offered. Arabic Excel exports are right-to-left. Amounts retain four-decimal
accounting precision even when the display is shorter.

The reconciliation report should be investigated whenever a sub-ledger total
does not equal its control account.

## 18. Website management

### Change branding

Required permission: `cms.manage`.

1. Open **Settings → Branding**.
2. Change approved colors, typography choice, logo/favicon URL, short code,
   motto, and related branding values.
3. Save and review the public site in both languages and themes.
4. Maintain social links in the same area.

### Manage landing content, news, and events

1. Open **Settings → Website content**.
2. Edit bilingual landing sections and hero content.
3. Draft news posts.
4. Publish or archive posts using `cms.publish`.
5. Add calendar events and publish them.

Always supply both Arabic and English content before publishing.

### Handle public enquiries

Required permission: `inquiry.handle`.

1. Open **Settings → Public enquiries**.
2. Open an enquiry.
3. Record the response/handling note.
4. Mark it handled.

## 19. Users, roles, permissions, and audit

### Create a staff user

Required permission: `user.manage`.

1. Open **Settings → Staff accounts**.
2. Enter name, email, and initial credential details requested by the form.
3. Assign an appropriate role.
4. Save.

Use individual accounts. Never share cashier, approver, or administrator
credentials.

### Create or edit a role

Required permission: `role.manage`.

1. Open **Settings → Roles and permissions**.
2. Add a bilingual role name.
3. Select only permissions needed for the job.
4. Save.

UniFlow refuses combinations that violate segregation of duties, such as
voucher maker plus approver, payment preparer plus approver, or discount
requester plus approver.

### Grant a role

1. Open **Settings → Staff accounts**.
2. Find the user.
3. Select the role and grant it.

Permission changes invalidate older session authority; the user may need to
sign in again.

### Review and verify the audit trail

Required permission: `audit.read`.

1. Open **Settings → Audit trail**.
2. Filter by date, actor, action, resource type, or resource ID.
3. Review before/after information and the named actor.
4. Use **Verify chain** to check audit-log integrity.

The audit trail is append-only and hash chained. A failed verification must be
escalated immediately and not “fixed” by deleting records.

## 20. Operational controls users must follow

### Never delete financial history

Posted vouchers, charges, receipts, registrations, approvals, and audit facts
must remain available. Use their cancellation, supersession, or reversal
actions.

### Respect maker-checker handoffs

When an operation says it needs another approver, sign out and hand it to the
authorized colleague. Do not exchange passwords or assign conflicting roles
to avoid the handoff.

### Check dates before posting

The document date determines the fiscal period. If the intended period is
closed, use the authorized reversal/correction process and a valid open-period
posting date.

### Protect sensitive data

- Do not send application tracking tokens, portal invitations, or candidate
  codes through public channels.
- Do not expose medical data to staff without medical permissions.
- Confirm the selected student before taking payment, changing standing, or
  viewing guardian-linked records.

## 21. Troubleshooting

| Problem | What to do |
| --- | --- |
| A Console menu item is missing | Ask an administrator to review the required permission. Do not use another person's account. |
| Sign-in keeps failing | Check email/password and keyboard language. After repeated failures, wait for the temporary lock to expire or contact an administrator. |
| MFA code is refused | Use the current six-digit code; a code already used cannot be replayed. Check device time. |
| Application intake is unavailable | The application window may be closed or no seats/programmes are publicly configured. |
| Candidate profile code fails | Check all 32 characters. The code may be expired, used, or replaced; ask admissions to issue another. |
| Excel roster fails | Use `.xlsx`, keep it under 5 MB, use the exact required columns, one active batch, matching year, and unique national IDs. |
| Student cannot register | Review holds, arrears, documents, medical status, student placement, approved fee schedule, and current standing. |
| Registration is pending | An above-threshold discount needs independent approval. |
| Voucher cannot submit | Ensure the date is valid, all required dimensions exist, level-5 accounts are used, and total debits equal credits. |
| Voucher cannot be approved | Confirm different users performed maker/reviewer/approver stages and required MFA is complete. |
| Posting date is refused | The fiscal period is closed or permanently closed. Choose an authorized open-period date. |
| Receipt cannot be taken | Confirm the student, payment amount/channel, open period, and cashier till assignment. |
| Purchase order is blocked | Review approved budget availability and the budget line's control policy. |
| Vendor invoice is held | Resolve the order/receipt/invoice mismatch or obtain independent exception approval. |
| Portal shows no student | The portal account lacks active access; Registry must issue or restore the correct invitation/access. |
| Guardian sees the wrong child | Use the student selector in the portal header and confirm the displayed name and student number. |
| Report export is unavailable | Confirm report permissions and run the report with valid filters first. |

## 22. Quick role reference

| Role | Main work |
| --- | --- |
| University Admin | Users, roles, academic setup, website, audit/report access |
| Registrar | Admissions, ministry candidates, student records, registration, holds and lifecycle |
| Medical Officer | Student examinations plus faculty requirements and medical clearance for ministry candidates |
| Cashier | Student receipts and payment allocation |
| Cashier Supervisor | Receipt cancellation and cheque supervision |
| Senior Accountant | Accounts, voucher preparation, budgets, assets and invoice recording |
| Financial Auditor | Voucher review, financial reports and audit |
| Financial Controller | Final approvals, reversals, periods and financial control |
| Dean | Read academic/student/admission information and controlled admission override |
| Procurement Officer | Vendors, requisitions/orders and budget visibility |
| Stores Officer | Goods and services receipt |
| Student/Guardian | Student Self Service only for explicitly linked student records |
| Applicant/Ministry Candidate | Separate application or candidate-profile process; no Student Self Service admission access |

Actual access is determined by permissions assigned to the user's roles, so a
tenant may use different role names while preserving the same controls.
