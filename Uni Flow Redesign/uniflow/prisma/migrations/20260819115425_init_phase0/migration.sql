-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('FUTURE', 'OPEN', 'CLOSED', 'PERMANENTLY_CLOSED');

-- CreateEnum
CREATE TYPE "FiscalYearStatus" AS ENUM ('FUTURE', 'OPEN', 'CLOSED', 'PERMANENTLY_CLOSED');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "SubledgerType" AS ENUM ('STUDENT', 'SPONSOR', 'VENDOR');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('JOURNAL', 'STUDENT_RECEIPT', 'GENERAL_RECEIPT', 'PAYMENT', 'REGISTRATION', 'DEPRECIATION', 'REVENUE_RECOGNITION', 'CHEQUE_MOVEMENT', 'FX_REVALUATION', 'OPENING_BALANCE', 'REVERSAL', 'YEAR_END_CLOSE');

-- CreateEnum
CREATE TYPE "SourceModule" AS ENUM ('MANUAL', 'REGISTRATION', 'CASHIERING', 'CHEQUES', 'FIXED_ASSETS', 'REVENUE_RECOGNITION', 'PROCUREMENT', 'PERIOD_CLOSE', 'ONBOARDING');

-- CreateEnum
CREATE TYPE "DraftState" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PENDING_APPROVAL', 'POSTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('INSERT', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'REVERSE', 'POST', 'LOGIN', 'PERIOD_OPEN', 'PERIOD_CLOSE');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "logo_url" TEXT,
    "theme_config" JSONB,
    "functional_currency" CHAR(3) NOT NULL DEFAULT 'SDG',
    "fiscal_year_start_month" SMALLINT NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "mfa_secret" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "key" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_key" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_key")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "seq" BIGINT NOT NULL,
    "actor_id" UUID,
    "ip" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" "AuditAction" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "prev_hash" TEXT NOT NULL,
    "hash" TEXT NOT NULL,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "key" VARCHAR(255) NOT NULL,
    "tenant_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "response_json" JSONB,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("tenant_id","key")
);

-- CreateTable
CREATE TABLE "document_sequences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "doc_type" "VoucherType" NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "prefix" TEXT NOT NULL DEFAULT '',
    "padding" INTEGER NOT NULL DEFAULT 6,

    CONSTRAINT "document_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_years" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "FiscalYearStatus" NOT NULL DEFAULT 'FUTURE',

    CONSTRAINT "fiscal_years_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fiscal_periods" (
    "id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'FUTURE',
    "closed_at" TIMESTAMPTZ(6),
    "closed_by_id" UUID,

    CONSTRAINT "fiscal_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "level" SMALLINT NOT NULL,
    "parent_id" UUID,
    "normal_balance" "NormalBalance" NOT NULL,
    "is_postable" BOOLEAN NOT NULL DEFAULT false,
    "is_control_account" BOOLEAN NOT NULL DEFAULT false,
    "subledger_type" "SubledgerType",
    "requires_cost_center" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cost_centers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cost_centers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_drafts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "draft_no" TEXT NOT NULL,
    "voucher_type" "VoucherType" NOT NULL,
    "doc_date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "state" "DraftState" NOT NULL DEFAULT 'DRAFT',
    "lines_json" JSONB NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "posted_header_id" UUID,

    CONSTRAINT "voucher_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_events" (
    "id" UUID NOT NULL,
    "draft_id" UUID NOT NULL,
    "from_state" "DraftState" NOT NULL,
    "to_state" "DraftState" NOT NULL,
    "actor_id" UUID NOT NULL,
    "comment" TEXT,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "approval_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_headers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "fiscal_period_id" UUID NOT NULL,
    "voucher_type" "VoucherType" NOT NULL,
    "voucher_no" INTEGER NOT NULL,
    "voucher_ref" TEXT NOT NULL,
    "doc_date" DATE NOT NULL,
    "posting_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description" TEXT NOT NULL,
    "source_module" "SourceModule" NOT NULL DEFAULT 'MANUAL',
    "source_ref" TEXT,
    "currency" CHAR(3) NOT NULL,
    "total_amount" DECIMAL(19,4) NOT NULL,
    "posted_by_id" UUID,
    "posted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_opening_entry" BOOLEAN NOT NULL DEFAULT false,
    "reversed_at" TIMESTAMPTZ(6),
    "reverses_id" UUID,
    "reversal_reason" TEXT,

    CONSTRAINT "transaction_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaction_lines" (
    "id" UUID NOT NULL,
    "header_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "subledger_type" "SubledgerType",
    "subledger_id" TEXT,
    "txn_currency" CHAR(3) NOT NULL,
    "txn_amount" DECIMAL(19,4) NOT NULL,
    "fx_rate" DECIMAL(19,8) NOT NULL DEFAULT 1,
    "debit_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "credit_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "line_descr" TEXT,

    CONSTRAINT "transaction_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_period_balances" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "fiscal_period_id" UUID NOT NULL,
    "opening_debit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "opening_credit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "movement_debit" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "movement_credit" DECIMAL(19,4) NOT NULL DEFAULT 0,

    CONSTRAINT "account_period_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "from_currency" CHAR(3) NOT NULL,
    "to_currency" CHAR(3) NOT NULL,
    "rate_date" DATE NOT NULL,
    "rate" DECIMAL(19,8) NOT NULL,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "users_tenant_id_idx" ON "users"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_tenant_id_email_key" ON "users"("tenant_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "roles_tenant_id_name_key" ON "roles"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "audit_log_tenant_id_resource_type_resource_id_idx" ON "audit_log"("tenant_id", "resource_type", "resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "audit_log_tenant_id_seq_key" ON "audit_log"("tenant_id", "seq");

-- CreateIndex
CREATE INDEX "idempotency_keys_created_at_idx" ON "idempotency_keys"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "document_sequences_tenant_id_fiscal_year_id_doc_type_key" ON "document_sequences"("tenant_id", "fiscal_year_id", "doc_type");

-- CreateIndex
CREATE INDEX "fiscal_years_tenant_id_start_date_idx" ON "fiscal_years"("tenant_id", "start_date");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_years_tenant_id_name_key" ON "fiscal_years"("tenant_id", "name");

-- CreateIndex
CREATE INDEX "fiscal_periods_fiscal_year_id_start_date_end_date_idx" ON "fiscal_periods"("fiscal_year_id", "start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "fiscal_periods_fiscal_year_id_seq_key" ON "fiscal_periods"("fiscal_year_id", "seq");

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_parent_id_idx" ON "chart_of_accounts"("tenant_id", "parent_id");

-- CreateIndex
CREATE INDEX "chart_of_accounts_tenant_id_level_idx" ON "chart_of_accounts"("tenant_id", "level");

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_tenant_id_code_key" ON "chart_of_accounts"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "cost_centers_tenant_id_code_key" ON "cost_centers"("tenant_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_drafts_posted_header_id_key" ON "voucher_drafts"("posted_header_id");

-- CreateIndex
CREATE INDEX "voucher_drafts_tenant_id_state_idx" ON "voucher_drafts"("tenant_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_drafts_tenant_id_draft_no_key" ON "voucher_drafts"("tenant_id", "draft_no");

-- CreateIndex
CREATE INDEX "approval_events_draft_id_occurred_at_idx" ON "approval_events"("draft_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_headers_reverses_id_key" ON "transaction_headers"("reverses_id");

-- CreateIndex
CREATE INDEX "transaction_headers_tenant_id_doc_date_idx" ON "transaction_headers"("tenant_id", "doc_date");

-- CreateIndex
CREATE INDEX "transaction_headers_tenant_id_fiscal_period_id_idx" ON "transaction_headers"("tenant_id", "fiscal_period_id");

-- CreateIndex
CREATE INDEX "transaction_headers_tenant_id_source_module_source_ref_idx" ON "transaction_headers"("tenant_id", "source_module", "source_ref");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_headers_tenant_id_fiscal_year_id_voucher_type_v_key" ON "transaction_headers"("tenant_id", "fiscal_year_id", "voucher_type", "voucher_no");

-- CreateIndex
CREATE INDEX "transaction_lines_account_id_idx" ON "transaction_lines"("account_id");

-- CreateIndex
CREATE INDEX "transaction_lines_subledger_type_subledger_id_idx" ON "transaction_lines"("subledger_type", "subledger_id");

-- CreateIndex
CREATE UNIQUE INDEX "transaction_lines_header_id_line_no_key" ON "transaction_lines"("header_id", "line_no");

-- CreateIndex
CREATE INDEX "account_period_balances_tenant_id_fiscal_period_id_idx" ON "account_period_balances"("tenant_id", "fiscal_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_period_balances_tenant_id_account_id_cost_center_id_key" ON "account_period_balances"("tenant_id", "account_id", "cost_center_id", "fiscal_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_tenant_id_from_currency_to_currency_rate_dat_key" ON "exchange_rates"("tenant_id", "from_currency", "to_currency", "rate_date");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_key_fkey" FOREIGN KEY ("permission_key") REFERENCES "permissions"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fiscal_years_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cost_centers" ADD CONSTRAINT "cost_centers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_drafts" ADD CONSTRAINT "voucher_drafts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_drafts" ADD CONSTRAINT "voucher_drafts_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_events" ADD CONSTRAINT "approval_events_draft_id_fkey" FOREIGN KEY ("draft_id") REFERENCES "voucher_drafts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_headers" ADD CONSTRAINT "transaction_headers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_headers" ADD CONSTRAINT "transaction_headers_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_headers" ADD CONSTRAINT "transaction_headers_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_headers" ADD CONSTRAINT "transaction_headers_posted_by_id_fkey" FOREIGN KEY ("posted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_headers" ADD CONSTRAINT "transaction_headers_reverses_id_fkey" FOREIGN KEY ("reverses_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_header_id_fkey" FOREIGN KEY ("header_id") REFERENCES "transaction_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaction_lines" ADD CONSTRAINT "transaction_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_period_balances" ADD CONSTRAINT "account_period_balances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_period_balances" ADD CONSTRAINT "account_period_balances_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_period_balances" ADD CONSTRAINT "account_period_balances_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account_period_balances" ADD CONSTRAINT "account_period_balances_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
