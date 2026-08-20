# Graph Report - .  (2026-08-20)

## Corpus Check
- 118 files · ~189,543 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 729 nodes · 1218 edges · 53 communities (46 shown, 7 thin omitted)
- Extraction: 71% EXTRACTED · 28% INFERRED · 1% AMBIGUOUS · INFERRED: 339 edges (avg confidence: 0.87)
- Token cost: 817,964 input · 71,132 output

## Community Hubs (Navigation)
- Attendance Roster Schema
- Audit Log & DB Client
- Student Profile WinForms UI
- Legacy SQL Discounts & Vouchers
- Runtime Dependencies
- Ribat University Forms
- TypeScript Build Config
- Dev Dependencies & Tooling
- Oasis Financial Subsystem Forms
- Institutional Branding Assets
- Registration & Report Forms
- Fiscal Periods & Cutover
- Money & Posting Primitives
- CRUD Toolbar Icons
- Bilingual RTL & Admissions
- Registration-to-GL Posting
- RBAC & Maker-Checker Approval
- Document Sequencing & Cheques
- Student Registration Forms
- Legacy Registration Module
- Student Accounts & Arrears Reports
- Multi-Tenancy & Audit Trail
- Fee Recognition & Student Lifecycle
- 2012 Software Contract
- UniFlow Architecture Decisions
- VB.NET Project Structure
- Warranty & Optional Modules
- Delivery Phases & Tracks
- Next.js Scaffold Assets
- Arabic Registration System Spec
- Vendor Proposal & Parties
- Embedded Postgres Test Harness
- Legacy Technology Stack
- Login & Shell Forms
- Report Viewer Forms
- Budgeting & Procurement
- Next.js Root Layout
- Role Check CI Script
- ADC Accounting Solution Files
- Student Account Statements
- Oasis Computer Systems Solution
- Agent Rules Generation
- ESLint Config
- Next.js Config
- PostCSS Config
- Role Bootstrap Script
- Query Helper Script

## God Nodes (most connected - your core abstractions)
1. `OasisEUniversity (root namespace / assembly)` - 54 edges
2. `Rebat_University (root namespace / assembly)` - 47 edges
3. `Registration System (subsystem of Oasis E-University)` - 29 edges
4. `Academic Year 2011-2012` - 28 edges
5. `Financial System (subsystem of Oasis E-University)` - 25 edges
6. `scripts` - 17 edges
7. `compilerOptions` - 16 edges
8. `Master Students List (All Colleges) 2011-2012` - 16 edges
9. `Attendance Roster Table Schema` - 14 edges
10. `Phase 0 - Ledger Invariants & Platform Spine` - 13 edges

## Surprising Connections (you probably didn't know these)
- `DiscPerc - Discount Percentage Stored as Text ('100 %')` --semantically_similar_to--> `Money as numeric(19,4) / Decimal (src/lib/money.ts)`  [INFERRED] [semantically similar]
  Nile College System - Ribat Univ/discount view.txt → uniflow/README.md
- `frmMakeGetBill - Receipt (get) bill entry form` --semantically_similar_to--> `frmGetBill - Receipt (get) bill entry form (Rebat_University)`  [INFERRED] [semantically similar]
  Nile College E-University System/Oasis - E-University/obj/Debug/Oasis - E-University.vbproj.FileListAbsolute.txt → Nile College System - Ribat Univ/Rebat University Application/obj/Debug/Rebat University Application.vbproj.FileListAbsolute.txt
- `frmMakePayBill - Payment bill entry form` --semantically_similar_to--> `frmPayBill - Payment bill entry form (Rebat_University)`  [INFERRED] [semantically similar]
  Nile College E-University System/Oasis - E-University/obj/Debug/Oasis - E-University.vbproj.FileListAbsolute.txt → Nile College System - Ribat Univ/Rebat University Application/obj/Debug/Rebat University Application.vbproj.FileListAbsolute.txt
- `frmBillsArchive - Bills archive form` --semantically_similar_to--> `frmArchiveGetBill - Receipt bills archive form (Rebat_University)`  [INFERRED] [semantically similar]
  Nile College E-University System/Oasis - E-University/obj/Debug/Oasis - E-University.vbproj.FileListAbsolute.txt → Nile College System - Ribat Univ/Rebat University Application/obj/Debug/Rebat University Application.vbproj.FileListAbsolute.txt
- `frmChartofAccounts - Chart of accounts form` --semantically_similar_to--> `frmAccounts - Chart of accounts form (Rebat_University)`  [INFERRED] [semantically similar]
  Nile College E-University System/Oasis - E-University/obj/Debug/Oasis - E-University.vbproj.FileListAbsolute.txt → Nile College System - Ribat Univ/Rebat University Application/obj/Debug/Rebat University Application.vbproj.FileListAbsolute.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Phase 0 Ledger Invariant Spine** — implementation_plan_decision_money_numeric, implementation_plan_sequence_allocator, implementation_plan_fiscal_period_lock, implementation_plan_posting_engine, implementation_plan_idempotency, implementation_plan_role_based_tenant_isolation, implementation_plan_audit_log_hash_chain [EXTRACTED 1.00]
- **Registration-Posts-to-GL Integration Flow** — srs_university_erp_req_reg_02, srs_university_erp_req_csh_01, srs_university_erp_req_per_02, implementation_plan_posting_engine, implementation_plan_a3_cashiering, implementation_plan_b4_registration_engine, implementation_plan_registration_posts_to_gl_milestone [INFERRED 0.85]
- **Modules Added in v2.0.0 to Close Verified Legacy Gaps** — srs_university_erp_module_12_fiscal_calendar, srs_university_erp_module_13_fee_catalog, srs_university_erp_module_14_student_status_lifecycle, srs_university_erp_module_15_sponsors_scholarships, srs_university_erp_module_16_procurement_ap, srs_university_erp_module_17_admissions_capacity, srs_university_erp_module_18_academic_records [EXTRACTED 1.00]
- **Phase 0 Ledger Core Modules** — uniflow_readme_money, uniflow_readme_sequence, uniflow_readme_period, uniflow_readme_posting, uniflow_readme_idempotency, uniflow_readme_audit_log, uniflow_readme_db_client, uniflow_readme_ledger_invariants [EXTRACTED 1.00]
- **Role-Based Tenant Isolation Boundary** — uniflow_readme_two_database_roles, uniflow_readme_row_level_security, uniflow_readme_withtenant, uniflow_readme_withsystem, uniflow_readme_db_client, uniflow_readme_db_check_roles, uniflow_readme_transaction_pooler [EXTRACTED 1.00]
- **Legacy Ribat/Nile Operational Artifacts (views, notes, snapshots)** — nile_college_system___ribat_univ_discount_view_viewdiscount, nile_college_system___ribat_univ_new_text_document_discount_report, nile_college_system___ribat_univ_database_before_old_stud_read_this_note_pre_migration_snapshot, nile_college_system___ribat_univ_backup_taqrir_reviewed_reports_backup, ammar_s_notes_paymenttype [INFERRED 0.75]
- **Oasis E-University voucher lifecycle** — nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmmakevoucher, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmapprovingvouchers, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmvoucherslist, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmvoucherreverse, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_vouchers_rpt, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_receiptvoucher_rpt [INFERRED 0.85]
- **Oasis E-University student registration and fee flow** — nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmstudentregisteration, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmstudentregform, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmtuitionfees, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmstudentprofiles, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_frmtransferstudent, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_stdfile_rpt, nile_college_e_university_system_oasis___e_university_obj_debug_oasis___e_university_vbproj_filelistabsolute_studentsunpaidlist_rpt [INFERRED 0.85]
- **Ribat University receipt-bill lifecycle** — nile_college_system___ribat_univ_rebat_university_application_obj_debug_rebat_university_application_vbproj_filelistabsolute_frmrequestgetbill, nile_college_system___ribat_univ_rebat_university_application_obj_debug_rebat_university_application_vbproj_filelistabsolute_frmgetbill, nile_college_system___ribat_univ_rebat_university_application_obj_debug_rebat_university_application_vbproj_filelistabsolute_frmgetbill2, nile_college_system___ribat_univ_rebat_university_application_obj_debug_rebat_university_application_vbproj_filelistabsolute_frmreversegetbill, nile_college_system___ribat_univ_rebat_university_application_obj_debug_rebat_university_application_vbproj_filelistabsolute_frmarchivegetbill, nile_college_system___ribat_univ_rebat_university_application_obj_debug_rebat_university_application_vbproj_filelistabsolute_frmarchivedeletedgetbills, nile_college_system___ribat_univ_rebat_university_application_obj_debug_rebat_university_application_vbproj_filelistabsolute_frmvouchersserialsno [INFERRED 0.85]
- **Nile College Engagement: Cover Letter, Offer, Contract, Delivery** — graphify_out_converted_cover_letter_financial_system_9b7b35ef_cover_letter, graphify_out_converted_nile_college_offer_financial_system_b5c3093c_offer_document, graphify_out_converted_contract_e73cf820_contract_agreement, graphify_out_converted_nile_college_offer_financial_system_b5c3093c_implementation_and_delivery_plan, graphify_out_converted_contract_e73cf820_payment_schedule_50_25_25 [INFERRED 0.85]
- **Student Registration to Accounting Ledger Flow** — graphify_out_converted____________87e095b7_create_student_file, graphify_out_converted____________87e095b7_academic_year_registration, graphify_out_converted____________87e095b7_automatic_accounting_entry, graphify_out_converted____________87e095b7_students_registration_table, graphify_out_converted____________87e095b7_transactions_table, graphify_out_converted____________87e095b7_student_transfer [EXTRACTED 1.00]
- **Arrears and Registration Reporting Suite** — graphify_out_converted____________87e095b7_student_account_statement_report, graphify_out_converted____________87e095b7_registered_students_by_program_report, graphify_out_converted____________87e095b7_overdue_students_report, graphify_out_converted____________87e095b7_total_college_arrears_report, graphify_out_converted____________87e095b7_program_arrears_details_report [EXTRACTED 1.00]
- **All 2011-2012 Rosters Share One Table Template** — graphify_out_converted_den_1st_y_attendance_2011_2012_2da0b628, graphify_out_converted_group_of_med_1st_y_attendance_2011_2012_8d6e77eb, graphify_out_converted_mis_1st_y_attendance_2011_2012_32b895f2, graphify_out_converted_mis_3rd_y_attendance_2011_2012_c0eed044, graphify_out_converted_mit_1st_y_attendance_2011_2012_3588e6b9, graphify_out_converted_mit_2nd_y_attendance_2011_2012_711fdf9a, graphify_out_converted_mls_1st_y_attendance_2011_2012_120701e8, attendance_roster_schema [INFERRED 0.95]
- **First-Year Intake across Programmes, Semester 1 of 2011-2012** — programme_dentistry, programme_medicine_and_surgery, programme_medical_information, programme_medical_information_systems_diploma, programme_medical_laboratory_sciences, year_of_study_first_year, semester_first, academic_session_2011_2012 [INFERRED 0.85]
- **Roster Column Set: Serial, Name, University ID, Attendance Marks** — roster_field_serial_number, roster_field_student_name, roster_field_university_id, roster_field_attendance_mark_columns, roster_field_course_name, roster_field_instructor_name [EXTRACTED 1.00]
- **Medicine Attendance Roster Series 2011-2012** — graphify_out_converted_med_1st_y_attendance_2011_2012_151bcbad, graphify_out_converted_med_2nd_y_attendance_2011_2012_aabe307c, graphify_out_converted_med_2nd_y_attendance_2011_2012_autosaved_e7258711, graphify_out_converted_med_3rd_y_attendance_2011_2012_48b4c23e, graphify_out_converted_med_4th_y_attendance_2011_2012_c9756b08, graphify_out_converted_med_5th_y_attendance_2011_2012_31b54606, attendance_roster_template [INFERRED 0.95]
- **Five-Year Medicine and Surgery Study Ladder** — year_of_study_first_year, year_of_study_second_year, year_of_study_third_year, year_of_study_fourth_year, year_of_study_fifth_year, programme_medicine_and_surgery [INFERRED 0.95]
- **Odd-Numbered First-Term Semester Sequence (1, 3, 5, 7, 9)** — semester_first, semester_third, semester_fifth, semester_seventh, semester_ninth [INFERRED 0.95]
- **Nursing Programme Attendance Roster Series 2011-2012 (Years 1-4)** — graphify_out_converted_nur_1st_y_attendance_2011_2012_b6e22d21, graphify_out_converted_nur_2nd_y_attendance_2011_2012_7b005f56, graphify_out_converted_nur_3rd_y_attendance_2011_2012_2bc66423, graphify_out_converted_nur_4th_y_attendance_2011_2012_a67bcda4, programme_nursing_sciences, academic_session_2011_2012 [EXTRACTED 1.00]
- **Colleges Covered by the Master Students List** — graphify_out_converted_students_list_ac3381ba, programme_nursing_sciences, programme_pharmacy, programme_medicine, programme_medical_laboratory, programme_mis, programme_diploma_of_mis, programme_dental [EXTRACTED 1.00]
- **Shared Student Record Identity Schema Across Rosters and Master List** — field_university_id, field_student_name, field_college, field_academic_year, field_class_level, schema_attendance_roster_sheet, schema_students_list_sheet [INFERRED 0.85]
- **Student Lifecycle Screen Flow: Create - Search - Register - Update - Transfer** — nile_college_e_university_system_nile_college_screen_shots_createstudentprofile_screen, nile_college_e_university_system_nile_college_screen_shots_searchstudentid_screen, nile_college_e_university_system_nile_college_screen_shots_studentregistration_screen, nile_college_e_university_system_nile_college_screen_shots_updatestudentprofile_screen, nile_college_e_university_system_nile_college_screen_shots_studenttransfer_screen, nile_college_e_university_system_nile_college_createstudentprofile_student_lifecycle_workflow [INFERRED 0.85]
- **Shared Student Identity Spine (StudentIndex / StudentName / Program) Across Screens and Tables** — nile_college_e_university_system_nile_college_screen_shots_studentprofiletable_schema, nile_college_e_university_system_nile_college_screen_shots_studentregistrationtable_schema, nile_college_e_university_system_nile_college_screen_shots_searchstudentid_results_grid, nile_college_e_university_system_nile_college_screen_shots_createstudentprofile_field_university_number, nile_college_e_university_system_nile_college_screen_shots_studentregistrationtable_denormalized_student_copy [INFERRED 0.85]
- **Tuition Fees and Discount Subsystem Spanning Registration, Transfer, and Profile Update** — nile_college_e_university_system_nile_college_screen_shots_studentregistration_student_fees_group, nile_college_e_university_system_nile_college_screen_shots_studentregistrationtable_column_discperc, nile_college_e_university_system_nile_college_screen_shots_studentregistrationtable_column_tuitionfees1, nile_college_e_university_system_nile_college_screen_shots_studentregistrationtable_column_regsfees, nile_college_e_university_system_nile_college_screen_shots_studenttransfer_target_state_panel, nile_college_e_university_system_nile_college_screen_shots_updatestudentprofile_field_prescribed_fees [INFERRED 0.85]
- **Nile College visual identity (crest, bilingual wordmark, E-University chrome)** — documents___images_nilebg_nile_college_e_university_background, documents___images_nilelogin_e_university_login_screen, documents___images_alnile_logo_nile_college_wordmark, documents___images_alnile_001_nile_college_letterhead_scan, nile_college_e_university_system_oasis___e_university_resources_nilebg_nile_college_background, nile_college_shield_crest, nile_college [EXTRACTED 1.00]
- **ADC Acc. App skin (A.D.C crescent logo and diagnostic-center background)** — nile_college_e_university_system_backup_adc_acc__app_resources_bg_adc_background, nile_college_e_university_system_backup_adc_acc__app_resources_logo_adc_crescent_logo_jpg, nile_college_e_university_system_backup_adc_acc__app_resources_logo_adc_crescent_logo_png, adc_acc_app, adc_diagnostic_center [EXTRACTED 1.00]
- **Oasis - E-University Resources carry inherited medical-app assets (byte-identical ADC copies plus Oasis HIS background)** — nile_college_e_university_system_oasis___e_university_resources_bg_adc_background_copy, nile_college_e_university_system_oasis___e_university_resources_logo_adc_crescent_logo_jpg, nile_college_e_university_system_oasis___e_university_resources_logo_adc_crescent_logo_png, nile_college_e_university_system_oasis___e_university_resources_bg_oasis_his_background, oasis_e_university, adc_acc_app [INFERRED 0.85]
- **Oasis Record CRUD Toolbar Icon Set** — nile_college_e_university_system_oasis_e_university_resources_add_icon, nile_college_e_university_system_oasis_e_university_resources_addsub_icon, nile_college_e_university_system_oasis_e_university_resources_delete_icon, nile_college_e_university_system_oasis_e_university_resources_add_concept_crud_toolbar [INFERRED 0.85]
- **Toolbar Icon State-Variant Set** — nile_college_e_university_system_oasis_e_university_resources_add1_icon, nile_college_e_university_system_oasis_e_university_resources_addsub1_icon, nile_college_e_university_system_oasis_e_university_resources_delete1_icon, nile_college_e_university_system_oasis_e_university_resources_add1_concept_icon_state_variant [INFERRED 0.75]
- **Upgrade Report Tree Toggle Pair** — nile_college_e_university_system_upgradereport_files_upgradereport_plus_icon, nile_college_e_university_system_upgradereport_files_upgradereport_minus_icon, nile_college_e_university_system_upgradereport_files_upgradereport_plus_concept_expand_collapse [EXTRACTED 1.00]
- **Ribat University Brand Identity Assets** — nile_college_system___ribat_univ_rebat_university_application_resources_logo_asset, nile_college_system___ribat_univ_rebat_university_application_resources_bg_asset, ribat_visual_identity, national_ribat_university [INFERRED 0.95]
- **Oasis E-University Platform Deployment at Ribat** — nile_college_system___ribat_univ_rebat_university_application_resources_bg1_asset, oasis_computer_systems, oasis_e_university [INFERRED 0.95]
- **Unmodified create-next-app Public Asset Set in uniflow** — uniflow_public_next_asset, uniflow_public_vercel_asset, uniflow_public_file_asset, uniflow_public_globe_asset, uniflow_public_window_asset, nextjs_default_scaffold [EXTRACTED 1.00]

## Communities (53 total, 7 thin omitted)

### Community 0 - "Attendance Roster Schema"
Cohesion: 0.07
Nodes (76): Academic Session 2010-2011, Academic Year 2011-2012, Attendance Roster Column Schema, Attendance Roster Table Schema, Attendance Roster Template, Class Attendance Tracking, Student Enrolment Registry, Enrolment-Year Prefix Convention in University IDs (11-, 10-, 09-, 08-) (+68 more)

### Community 1 - "Audit Log & DB Client"
Cohesion: 0.06
Nodes (52): @prisma/client, @prisma/client, audit(), AuditEntryInput, ChainVerification, computeHash(), GENESIS_HASH, verifyChain() (+44 more)

### Community 2 - "Student Profile WinForms UI"
Cohesion: 0.07
Nodes (48): Create Student Profile in Visual Studio Designer (Oasis - E-University), Sibling Forms Open in IDE: frmUpdateStudentProfile, frmMainReg, frmRptStudAccStatement, frmRptStudentsUnpaidList, Workflow: Student Lifecycle (Create - Search - Register - Update - Transfer), Source Artifact: StudentProfile.vb WinForms Form, Tech Stack: VB.NET WinForms in Visual Studio (Telerik/DevExpress add-ins, 2012), Design Pattern: Arabic RTL WinForms Layout, Field: Address Multiline (العنوان), Field: Phone Number (رقم التلفون) (+40 more)

### Community 3 - "Legacy SQL Discounts & Vouchers"
Cohesion: 0.08
Nodes (40): Pay and Receive Vouchers (legacy), PaymentType Variable ('C' cash, 'B' bank, 'O' other), Third Payment Method Added 2012-08-26 (consequences unverified; 'the system is working until now'), Abd Al-Hamid Al-Haj (عبد الحميد الحاج), Mohammed Musa (محمد موسى), Backup at End of 10 September (includes reports reviewed through 2 September), Pre-Migration DB Snapshot (before inserting old student records, 5 Sep 2009), dbo.CollegeFees Table (MainFees baseline tuition per college) (+32 more)

### Community 4 - "Runtime Dependencies"
Cohesion: 0.06
Nodes (35): next, pg, prisma, @prisma/adapter-pg, react, react-dom, dependencies, next (+27 more)

### Community 5 - "Ribat University Forms"
Cohesion: 0.11
Nodes (29): Form1 - Default scaffold form (Rebat_University), frmAccounts - Chart of accounts form (Rebat_University), frmAddUser - User administration form (Rebat_University), frmArchiveDeletedGetBills - Deleted receipt bills archive form (Rebat_University), frmArchiveGetBill - Receipt bills archive form (Rebat_University), frmBankTrans - Bank transactions form (Rebat_University), frmCustody - Custody (imprest) management form (Rebat_University), frmGetBill - Receipt (get) bill entry form (Rebat_University) (+21 more)

### Community 6 - "TypeScript Build Config"
Cohesion: 0.07
Nodes (28): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+20 more)

### Community 7 - "Dev Dependencies & Tooling"
Cohesion: 0.07
Nodes (27): dotenv, embedded-postgres, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tsx, @types/node (+19 more)

### Community 8 - "Oasis Financial Subsystem Forms"
Cohesion: 0.15
Nodes (27): Financial System (subsystem of Oasis E-University), frmAddAccountOld - Legacy add-account form, frmApprovingVouchers - Voucher approval form, frmBalanceSheetLevels - Balance sheet levels setup form, frmBillsArchive - Bills archive form, frmBudget - Budget entry form, frmChartofAccounts - Chart of accounts form, frmCheqClearingSystem - Cheque clearing system form (+19 more)

### Community 9 - "Institutional Branding Assets"
Cohesion: 0.17
Nodes (26): ADC Acc. App (ADC Accounting Application), A. A. Almannan Diagnostic Center (مركز الحاج عطا المنان التشخيصي), alnile 001.jpg - Nile College Official Letterhead Scan, alnile Logo.jpg - Nile College Bilingual Wordmark, NileBG.jpg - Nile College E-University Application Background, NileLogin.jpg - E-University Login Screen Chrome, The National Ribat University (جامعة الرباط الوطني), Nile College (كلية النيل), Sudan (+18 more)

### Community 10 - "Registration & Report Forms"
Cohesion: 0.09
Nodes (26): frmAdd_Nationality - Nationality lookup setup form, FrmDataEntery - Data entry form, frmdelet - Record deletion form, FrmForm - Generic form host, frmListBatches - Batches list form, FrmMedical - Medical data form, FrmReptColegRegis - College registration report form, frmRptProgramsRegStudents - Programs registered-students report form (+18 more)

### Community 11 - "Fiscal Periods & Cutover"
Cohesion: 0.14
Nodes (20): Cutover - Pilot Faculty, Parallel Run, Period-Boundary Switch, Fiscal Period Model & Posting Lock Trigger, Reconciliation Tests (8.4), Tenant Onboarding & Opening Balances Gate (Plan 10), account_period_balances Aggregate Table, Database-Enforced Ledger Invariants (SRS 4.3), Legacy Defect - Two Divergent Ledger Tables (Transactions / Transactionees), Module 10 - Financial Statements, Reports & BI (+12 more)

### Community 12 - "Money & Posting Primitives"
Cohesion: 0.20
Nodes (15): PostingLine, allocate(), allocateByWeights(), CURRENCY_MINOR_UNITS, isZero(), minorUnits(), money, MoneyInput (+7 more)

### Community 13 - "CRUD Toolbar Icons"
Cohesion: 0.17
Nodes (16): Icon State Variant Convention (1 Suffix), Add Icon State Variant (Add1), Add Record Action (Create), Record CRUD Toolbar, Add Icon (green plus), Add Sub-Item Icon State Variant (AddSub1), Add Sub-Record Action (Create Child Item), Add Sub-Item Icon (green plus with yellow plus overlay) (+8 more)

### Community 14 - "Bilingual RTL & Admissions"
Cohesion: 0.14
Nodes (15): Decision 2 - Bilingual RTL/LTR from the First Commit, Phase 0.9 - Design System & Localization Shell, Localization Tests (8.7), Postgres UTF8 Cluster Initialisation Requirement, Legacy Ribat University Application (Ribat / UOT), Legacy SpellNumber / EgyCurr.CurText Amount Speller, Legacy StudentsVacants Seat Allocation Table, Legacy viewDiscount / UnivDiscountSummary (+7 more)

### Community 15 - "Registration-to-GL Posting"
Cohesion: 0.22
Nodes (14): A3 - Fee Catalog, Student AR & Cashiering, B4 - Semester Registration Engine, Idempotency Claim-Before-Work Mechanism, Ledger Property Tests (8.1), The Posting Engine post(), Registration-Posts-to-GL Convergence Milestone, idempotency_keys Table, Legacy Defect - Registration Posts No Ledger Entry (+6 more)

### Community 16 - "RBAC & Maker-Checker Approval"
Cohesion: 0.18
Nodes (12): Phase 0.8 - Auth, RBAC and Segregation of Duties Enforcement, Decision 3 - Maker-Checker with Full State History, Track A - Finance, Legacy Defect - Voucher Draft Deleted on Approval, Module 15 - Sponsors & Scholarships, Module 5 - 5-Tier Chart of Accounts & General Ledger, REQ-FIN-01 5-Tier Chart of Accounts, REQ-FIN-03 Multi-Line Journal Vouchers & FX Policy (+4 more)

### Community 17 - "Document Sequencing & Cheques"
Cohesion: 0.21
Nodes (12): Concurrency Tests (8.2), Document Sequence Allocator (Row-Locked Counter), document_sequences Table, Legacy Defect - CheqClear Boolean Conflates Uncleared and Bounced, Legacy Defect - MAX(MoveNo)+1 Voucher Numbering Race, Module 6 - Cashiering, Student Billing & Accounts Receivable, Module 7 - Cheque Management & Clearing Pipeline, REQ-CHQ-02 Cheque Clearing Workflow with GL Consequence (+4 more)

### Community 18 - "Student Registration Forms"
Cohesion: 0.20
Nodes (12): frmAddPrograms - Academic programs setup form, frmSearchStdID - Student ID search form, frmSearchStudID - Student ID search form (duplicate variant), frmStudentProfileUpdate - Student profile update form, frmStudentRegisteration - Student registration form, frmTuitionFees - Tuition fees setup form, frmCollegesFees - College fees setup form (Rebat_University), frmDeleteStudent - Student deletion form (Rebat_University) (+4 more)

### Community 19 - "Legacy Registration Module"
Cohesion: 0.20
Nodes (11): Academic Year Registration (تسجيل للعام الدراسي), Registered Students by Program Report, Students Registration Table, Tuition Fees, Registration Fees and Discount Rate, Registration System Flow, Marks Recording, Online Students Marks (Gift Option), Registration Cycle Automation (+3 more)

### Community 20 - "Student Accounts & Arrears Reports"
Cohesion: 0.22
Nodes (11): Automatic Accounting Entry (Student Debit / College Credit), Entry Reversal on Registration Delete, Overdue Payment Students Report, Program Arrears Details Report (تفاصيل متأخرات البرامج), Student Account Statement Report (كشف حساب طالب), Student Transfer Between Programs (تحويل طالب), Total College Arrears Report (إجمالي متأخرات الكليات), Transactions Table (+3 more)

### Community 21 - "Multi-Tenancy & Audit Trail"
Cohesion: 0.22
Nodes (10): Hash-Chained Append-Only Audit Log, npm run db:check-roles CI Assertion, Decision 1 - Shared DB, tenant_id Partitioning, Defence in Depth, Risk Register, Role-Based Tenant Isolation (RLS Trap Resolution), Tenant Isolation Tests (8.3), audit_log Append-Only Hash-Chained Table, Module 11 - Multi-Tenancy, Security & Administration (+2 more)

### Community 22 - "Fee Recognition & Student Lifecycle"
Cohesion: 0.22
Nodes (10): Module 13 - Fee Item Catalog & Revenue Recognition, Module 14 - Student Status Lifecycle, Module 9 - Fixed Assets Management & Depreciation Engine, REQ-AST-02 Persisted Depreciation Schedule, REQ-AST-03 Idempotent Period-Locked Depreciation Batch, REQ-FEE-02 Revenue Recognition of Deferred Income, REQ-FEE-03 Refunds & Withdrawal Refund Policy, REQ-FEE-04 Student Credit Balances (+2 more)

### Community 23 - "2012 Software Contract"
Cohesion: 0.25
Nodes (9): Administrative Software Design Contract (Jan 29, 2012), Nile College (Second Party), Contract Payment Schedule SDG 14,400 (50/25/25), Professor Mohammed Sukkar, Bilingual Input Language (Arabic/English), Commencement (3 weeks) and Quotation Validity (30 days), Implementation and Delivery Plan (30 man-days), Nile College Offer – Financial System (+1 more)

### Community 24 - "UniFlow Architecture Decisions"
Cohesion: 0.25
Nodes (9): Decision 4 - Money as numeric(19,4) / Prisma.Decimal, Decision 5 - Typed API Layer Alongside Server Actions, Next.js 16.3.1 + React 19.2 Stack Pin, Prisma 7 with prisma.config.ts and PrismaPg Adapter, Technical Architecture (Client / Application / Data Layers), Legacy Defect - Money Held as Floating-Point Double, Legacy Oasis E-University (Nile College VB.NET System), Legacy Defect - SQL Assembled by String Concatenation (+1 more)

### Community 25 - "VB.NET Project Structure"
Cohesion: 0.25
Nodes (9): EgyCurr.dll (currency-to-words helper library), Oasis - E-University (VB.NET WinForms project), frmRegistrationForm - Printable registration form (Oasis Computer Systems build), Oasis Computer Systems (alternate project file building Rebat_University), EgyCurr.dll referenced by Rebat University Application, frmRegisteration - Registration form (Rebat_University), frmRegUpdateFin - Financial registration update form (Rebat_University), Rebat University Application (VB.NET WinForms project) (+1 more)

### Community 26 - "Warranty & Optional Modules"
Cohesion: 0.25
Nodes (8): One-Year Technical and Accounting Warranty, Post-Warranty Maintenance Agreement, Student Management System (نظام إدارة الطلاب), Additional Professional Services (Customization, Data Conversion, Reports), Annual Support (Help Desk, Remote Support), Human Resources Management Module (SDG 4,000), Library Management System (Gift Option), Oasis – E-University License to Use

### Community 27 - "Delivery Phases & Tracks"
Cohesion: 0.32
Nodes (8): Phase 0 - Ledger Invariants & Platform Spine, Track B - Student, Track C - Public Surface, Module 18 - Academic Records (Phase 7-8), Module 1 - White-Label Landing Page & CMS Engine, Module 4 - Annual/Semester Registration & Student Lifecycle, REQ-ACD-03 Course Registration Blocked by Financial Hold, REQ-REG-06 Registration Holds

### Community 28 - "Next.js Scaffold Assets"
Cohesion: 0.29
Nodes (8): create-next-app Default Scaffold (unmodified boilerplate), Next.js Framework, File Icon (file.svg, scaffold default), Globe Icon (globe.svg, scaffold default), Next.js Wordmark (next.svg, scaffold default), Vercel Triangle Mark (vercel.svg, scaffold default), Vercel Deployment Platform, Window Icon (window.svg, scaffold default)

### Community 29 - "Arabic Registration System Spec"
Cohesion: 0.43
Nodes (7): Create Student File (إنشاء ملف طالب), Edit Student File (تعديل ملف طالب), GetStdName (Internal Function), GetStdProgram (Internal Function), Registration System – Nile College (نظام التسجيل), Student Basic Data (University Number, Full Name, Program, Phone, Address), Student Search Screen (by name and program)

### Community 30 - "Vendor Proposal & Parties"
Cohesion: 0.29
Nodes (7): First Party Obligations (Install, Test, Train, Deliver Setup), Mohammed Ali Ibrahim Elhussein, Oasis Computer Systems (First Party), College Registration and Financial Activities Management, Cover Letter for Financial System Proposal (Jan 28, 2012), Mohammed A. Elhussein, Executive Director, Oasis – E-University (Proposed Product)

### Community 31 - "Embedded Postgres Test Harness"
Cohesion: 0.57
Nodes (6): DATA_DIR, PORT, reset(), server(), start(), stop()

### Community 32 - "Legacy Technology Stack"
Cohesion: 0.40
Nodes (5): Staff Training on Delivered Programs, Client-Server System Architecture, Microsoft SQL Server 2008, Technical Requirements (Users and IT Staff Skills), Technology Scope: .NET 4, MS SQL Server, Crystal Reports

### Community 33 - "Login & Shell Forms"
Cohesion: 0.40
Nodes (5): frmLogin - Login form, frmMainPanal - Main panel / application shell form, frmMainReg - Registration system main/MDI form, frmMain - Accounting application main form (Release build), frmLogin - Login form (Rebat_University)

### Community 34 - "Report Viewer Forms"
Cohesion: 0.40
Nodes (5): ReportViewer - Embedded report viewer form, frmRptIncomeStatement - Income statement report form (Rebat_University), ReportViewer - Embedded report viewer form (Rebat_University), frmAccReports - Accounting reports launcher form (early project variant), RebatUniversityApplication.vbproj (early/reduced project variant)

### Community 35 - "Budgeting & Procurement"
Cohesion: 0.50
Nodes (5): Module 16 - Procurement & Accounts Payable with Encumbrance, Module 8 - Institutional Budgeting & Financial Control, REQ-BDG-02 Real-Time Budgetary Control, REQ-BDG-03 Budget vs Actual Variance Reporting, REQ-PRC-03 Encumbrance Accounting

### Community 36 - "Next.js Root Layout"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 37 - "Role Check CI Script"
Cohesion: 0.50
Nodes (3): app, failures, TENANT_TABLES

### Community 39 - "Student Account Statements"
Cohesion: 0.67
Nodes (3): frmRptStudAccStatement - Student account statement report form, frmStdFinanceStatment - Student finance statement form, frmRptStudAccStatement - Student account statement report form (Rebat_University)

### Community 41 - "Agent Rules Generation"
Cohesion: 0.67
Nodes (3): generate-agent-files.js (regenerates the AGENTS.md rules block), Next.js Agent Rules Block, CLAUDE.md @AGENTS.md Include

## Ambiguous Edges - Review These
- `Legacy VB.NET/WinForms System (Oasis E-University at Nile College; Ribat University Application at Ribat and UOT)` → `Abd Al-Hamid Al-Haj (عبد الحميد الحاج)`  [AMBIGUOUS]
  Documents & Images/New Text Document.txt · relation: conceptually_related_to
- `Pay and Receive Vouchers (legacy)` → `dbo.Transactions Table (StudName, College, Batch, AcdYear, TuitionFees, DiscPerc, DiscDescr)`  [AMBIGUOUS]
  Nile College System - Ribat Univ/discount view.txt · relation: shares_data_with
- `Abd Al-Hamid Al-Haj (عبد الحميد الحاج)` → `Mohammed Musa (محمد موسى)`  [AMBIGUOUS]
  Documents & Images/New Text Document.txt · relation: conceptually_related_to
- `Discount Ratios Report for All Colleges and Students` → `Backup at End of 10 September (includes reports reviewed through 2 September)`  [AMBIGUOUS]
  Nile College System - Ribat Univ/Backup/التقارير الموزونة حتى 2 سبتمبر/تقرير.txt · relation: conceptually_related_to
- `Administrative Software Design Contract (Jan 29, 2012)` → `Implementation and Delivery Plan (30 man-days)`  [AMBIGUOUS]
  graphify-out/converted/Nile College Offer - Financial System_b5c3093c.md · relation: conceptually_related_to
- `Medicine Year 1 Group Attendance Roster 2011-2012` → `Medical Laboratory Sciences Year 1 Attendance Roster 2011-2012`  [AMBIGUOUS]
  graphify-out/converted/MLS.1st.Y.Attendance 2011-2012_120701e8.md · relation: shares_data_with
- `Academic Year 2011-2012` → `Nursing 4th Year Attendance Roster 2011-2012`  [AMBIGUOUS]
  graphify-out/converted/Nur.4th.Y.Attendance 2011-2012_a67bcda4.md · relation: references
- `Search Student ID Screen (بحث رقم طالب)` → `Student Transfer Screen (تحويل طالب/طالبة)`  [AMBIGUOUS]
  Nile College E-University System/Nile College Screen shots/SearchStudentID.JPG · relation: conceptually_related_to
- `Academic Year Registration Screen (تسجيل للعام الدراسي)` → `Sibling Forms Open in IDE: frmUpdateStudentProfile, frmMainReg, frmRptStudAccStatement, frmRptStudentsUnpaidList`  [AMBIGUOUS]
  Nile College E-University System/Nile college/CreateStudentProfile.png · relation: conceptually_related_to
- `Column: TuitionFees1 (float)` → `Field: Prescribed Fees (الرسوم المقررة)`  [AMBIGUOUS]
  Nile College E-University System/Nile College Screen shots/UpdatestudentProfile.JPG · relation: conceptually_related_to
- `Oasis E-University BG.jpg - ADC Background Copy` → `Oasis - E-University Application`  [AMBIGUOUS]
  Nile College E-University System/Oasis - E-University/Resources/BG.jpg · relation: conceptually_related_to
- `Oasis E-University BG.png - Oasis HIS / Wad Medani Heart Center Background` → `Oasis - E-University Application`  [AMBIGUOUS]
  Nile College E-University System/Oasis - E-University/Resources/BG.png · relation: conceptually_related_to
- `Oasis E-University Logo.png - A.D.C Crescent Logo Copy (PNG)` → `Oasis - E-University Application`  [AMBIGUOUS]
  Nile College E-University System/Oasis - E-University/Resources/Logo.png · relation: conceptually_related_to
- `Print Action` → `Record CRUD Toolbar`  [AMBIGUOUS]
  Nile College System - Ribat Univ/Rebat University Application/Resources/Printer.gif · relation: conceptually_related_to

## Knowledge Gaps
- **154 isolated node(s):** `ADC Acc App - Setup`, `RebatUni`, `eslintConfig`, `nextConfig`, `name` (+149 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Legacy VB.NET/WinForms System (Oasis E-University at Nile College; Ribat University Application at Ribat and UOT)` and `Abd Al-Hamid Al-Haj (عبد الحميد الحاج)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Pay and Receive Vouchers (legacy)` and `dbo.Transactions Table (StudName, College, Batch, AcdYear, TuitionFees, DiscPerc, DiscDescr)`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `Abd Al-Hamid Al-Haj (عبد الحميد الحاج)` and `Mohammed Musa (محمد موسى)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Discount Ratios Report for All Colleges and Students` and `Backup at End of 10 September (includes reports reviewed through 2 September)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Administrative Software Design Contract (Jan 29, 2012)` and `Implementation and Delivery Plan (30 man-days)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Medicine Year 1 Group Attendance Roster 2011-2012` and `Medical Laboratory Sciences Year 1 Attendance Roster 2011-2012`?**
  _Edge tagged AMBIGUOUS (relation: shares_data_with) - confidence is low._
- **What is the exact relationship between `Academic Year 2011-2012` and `Nursing 4th Year Attendance Roster 2011-2012`?**
  _Edge tagged AMBIGUOUS (relation: references) - confidence is low._