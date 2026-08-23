-- CreateEnum
CREATE TYPE "BudgetStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "BudgetControlBasis" AS ENUM ('ANNUAL', 'CUMULATIVE_TO_PERIOD');

-- CreateEnum
CREATE TYPE "BudgetPolicy" AS ENUM ('ADVISORY', 'WARN', 'BLOCK');

-- CreateEnum
CREATE TYPE "EncumbranceStatus" AS ENUM ('OPEN', 'RELEASED', 'CANCELLED', 'LAPSED', 'CARRIED_FORWARD');

-- CreateEnum
CREATE TYPE "EncumbranceAction" AS ENUM ('RESERVE', 'RELEASE', 'CANCEL', 'LAPSE', 'CARRY_FORWARD');

-- CreateEnum
CREATE TYPE "RequisitionState" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PurchaseOrderState" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VendorInvoiceState" AS ENUM ('MATCHED', 'ON_HOLD', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentVoucherState" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'PAID', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BankChangeState" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ProcurementDocType" AS ENUM ('REQUISITION', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'VENDOR_INVOICE', 'PAYMENT_VOUCHER');

-- AlterEnum
ALTER TYPE "AccountRole" ADD VALUE 'GRNI_ACCRUAL';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VoucherType" ADD VALUE 'GOODS_RECEIPT';
ALTER TYPE "VoucherType" ADD VALUE 'VENDOR_INVOICE';

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "version_no" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "status" "BudgetStatus" NOT NULL DEFAULT 'DRAFT',
    "control_basis" "BudgetControlBasis" NOT NULL DEFAULT 'ANNUAL',
    "prepared_by_id" UUID NOT NULL,
    "prepared_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(6),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "decision_note" TEXT,
    "superseded_at" TIMESTAMPTZ(6),

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "budget_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "annual_amount" DECIMAL(19,4) NOT NULL,
    "policy" "BudgetPolicy" NOT NULL DEFAULT 'BLOCK',
    "note" TEXT,

    CONSTRAINT "budget_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_period_allocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "budget_line_id" UUID NOT NULL,
    "fiscal_period_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "budget_period_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encumbrances" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "budget_line_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "purchase_order_line_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "released_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "status" "EncumbranceStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encumbrances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encumbrance_movements" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "encumbrance_id" UUID NOT NULL,
    "action" "EncumbranceAction" NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "reason" TEXT,
    "goods_receipt_id" UUID,
    "actor_id" UUID NOT NULL,
    "occurred_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encumbrance_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name_ar" TEXT NOT NULL,
    "name_en" TEXT NOT NULL,
    "tax_registration_no" TEXT,
    "category" TEXT,
    "contact_name" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "payment_terms_days" INTEGER NOT NULL DEFAULT 30,
    "bank_name" TEXT,
    "bank_account_name" TEXT,
    "bank_account_no" TEXT,
    "bank_iban" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_blocked" BOOLEAN NOT NULL DEFAULT false,
    "block_reason" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_bank_changes" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "proposed_bank_name" TEXT,
    "proposed_bank_account_name" TEXT,
    "proposed_bank_account_no" TEXT,
    "proposed_bank_iban" TEXT,
    "previous_json" JSONB,
    "state" "BankChangeState" NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requested_by_id" UUID NOT NULL,
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_note" TEXT,

    CONSTRAINT "vendor_bank_changes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "procurement_sequences" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "doc_type" "ProcurementDocType" NOT NULL,
    "next_value" INTEGER NOT NULL DEFAULT 1,
    "prefix" TEXT NOT NULL DEFAULT '',
    "padding" INTEGER NOT NULL DEFAULT 6,

    CONSTRAINT "procurement_sequences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_requisitions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "req_no" TEXT NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "requested_on" DATE NOT NULL,
    "justification" TEXT NOT NULL,
    "cost_center_id" UUID,
    "total_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "currency" CHAR(3) NOT NULL,
    "state" "RequisitionState" NOT NULL DEFAULT 'DRAFT',
    "requested_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(6),
    "decided_by_id" UUID,
    "decided_at" TIMESTAMPTZ(6),
    "decision_note" TEXT,

    CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "requisition_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "requisition_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unit_price" DECIMAL(19,4) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "requisition_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "po_no" TEXT NOT NULL,
    "fiscal_year_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "requisition_id" UUID,
    "order_date" DATE NOT NULL,
    "expected_date" DATE,
    "currency" CHAR(3) NOT NULL,
    "terms" TEXT,
    "total_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "state" "PurchaseOrderState" NOT NULL DEFAULT 'DRAFT',
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(6),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "decision_note" TEXT,
    "closed_at" TIMESTAMPTZ(6),
    "closure_reason" TEXT,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unit_price" DECIMAL(19,4) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "received_qty" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "invoiced_qty" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "budget_line_id" UUID,

    CONSTRAINT "purchase_order_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipts" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "grn_no" TEXT NOT NULL,
    "purchase_order_id" UUID NOT NULL,
    "received_on" DATE NOT NULL,
    "note" TEXT,
    "total_amount" DECIMAL(19,4) NOT NULL,
    "posted_header_id" UUID NOT NULL,
    "received_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "goods_receipt_id" UUID NOT NULL,
    "po_line_id" UUID NOT NULL,
    "quantity" DECIMAL(19,4) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "goods_receipt_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_invoices" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "internal_no" TEXT NOT NULL,
    "vendor_invoice_no" TEXT NOT NULL,
    "vendor_id" UUID NOT NULL,
    "purchase_order_id" UUID,
    "invoice_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "total_amount" DECIMAL(19,4) NOT NULL,
    "settled_amount" DECIMAL(19,4) NOT NULL DEFAULT 0,
    "state" "VendorInvoiceState" NOT NULL DEFAULT 'MATCHED',
    "hold_reason" TEXT,
    "posted_header_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "cancellation_header_id" UUID,
    "cancellation_reason" TEXT,

    CONSTRAINT "vendor_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_invoice_lines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "po_line_id" UUID,
    "account_id" UUID NOT NULL,
    "cost_center_id" UUID,
    "quantity" DECIMAL(19,4) NOT NULL,
    "unit_price" DECIMAL(19,4) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "vendor_invoice_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_vouchers" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "pv_no" TEXT NOT NULL,
    "vendor_id" UUID NOT NULL,
    "payment_date" DATE NOT NULL,
    "channel" "PaymentChannel" NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "cheque_no" TEXT,
    "reference" TEXT,
    "currency" CHAR(3) NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,
    "state" "PaymentVoucherState" NOT NULL DEFAULT 'DRAFT',
    "posted_header_id" UUID,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMPTZ(6),
    "approved_by_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "decision_note" TEXT,

    CONSTRAINT "payment_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_allocations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "payment_voucher_id" UUID NOT NULL,
    "invoice_id" UUID NOT NULL,
    "amount" DECIMAL(19,4) NOT NULL,

    CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budgets_tenant_id_fiscal_year_id_status_idx" ON "budgets"("tenant_id", "fiscal_year_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_tenant_id_fiscal_year_id_version_no_key" ON "budgets"("tenant_id", "fiscal_year_id", "version_no");

-- CreateIndex
CREATE INDEX "budget_lines_tenant_id_budget_id_idx" ON "budget_lines"("tenant_id", "budget_id");

-- CreateIndex
CREATE INDEX "budget_lines_tenant_id_account_id_idx" ON "budget_lines"("tenant_id", "account_id");

-- CreateIndex
CREATE INDEX "budget_period_allocations_tenant_id_fiscal_period_id_idx" ON "budget_period_allocations"("tenant_id", "fiscal_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "budget_period_allocations_budget_line_id_fiscal_period_id_key" ON "budget_period_allocations"("budget_line_id", "fiscal_period_id");

-- CreateIndex
CREATE UNIQUE INDEX "encumbrances_purchase_order_line_id_key" ON "encumbrances"("purchase_order_line_id");

-- CreateIndex
CREATE INDEX "encumbrances_tenant_id_budget_line_id_status_idx" ON "encumbrances"("tenant_id", "budget_line_id", "status");

-- CreateIndex
CREATE INDEX "encumbrances_tenant_id_fiscal_year_id_status_idx" ON "encumbrances"("tenant_id", "fiscal_year_id", "status");

-- CreateIndex
CREATE INDEX "encumbrance_movements_encumbrance_id_occurred_at_idx" ON "encumbrance_movements"("encumbrance_id", "occurred_at");

-- CreateIndex
CREATE INDEX "vendors_tenant_id_is_active_idx" ON "vendors"("tenant_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_tenant_id_code_key" ON "vendors"("tenant_id", "code");

-- CreateIndex
CREATE INDEX "vendor_bank_changes_tenant_id_vendor_id_state_idx" ON "vendor_bank_changes"("tenant_id", "vendor_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "procurement_sequences_tenant_id_fiscal_year_id_doc_type_key" ON "procurement_sequences"("tenant_id", "fiscal_year_id", "doc_type");

-- CreateIndex
CREATE INDEX "purchase_requisitions_tenant_id_state_idx" ON "purchase_requisitions"("tenant_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_tenant_id_req_no_key" ON "purchase_requisitions"("tenant_id", "req_no");

-- CreateIndex
CREATE INDEX "requisition_lines_tenant_id_requisition_id_idx" ON "requisition_lines"("tenant_id", "requisition_id");

-- CreateIndex
CREATE UNIQUE INDEX "requisition_lines_requisition_id_line_no_key" ON "requisition_lines"("requisition_id", "line_no");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_vendor_id_state_idx" ON "purchase_orders"("tenant_id", "vendor_id", "state");

-- CreateIndex
CREATE INDEX "purchase_orders_tenant_id_state_idx" ON "purchase_orders"("tenant_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_tenant_id_po_no_key" ON "purchase_orders"("tenant_id", "po_no");

-- CreateIndex
CREATE INDEX "purchase_order_lines_tenant_id_purchase_order_id_idx" ON "purchase_order_lines"("tenant_id", "purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_order_lines_purchase_order_id_line_no_key" ON "purchase_order_lines"("purchase_order_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_posted_header_id_key" ON "goods_receipts"("posted_header_id");

-- CreateIndex
CREATE INDEX "goods_receipts_tenant_id_purchase_order_id_idx" ON "goods_receipts"("tenant_id", "purchase_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipts_tenant_id_grn_no_key" ON "goods_receipts"("tenant_id", "grn_no");

-- CreateIndex
CREATE INDEX "goods_receipt_lines_tenant_id_goods_receipt_id_idx" ON "goods_receipt_lines"("tenant_id", "goods_receipt_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_invoices_posted_header_id_key" ON "vendor_invoices"("posted_header_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_invoices_cancellation_header_id_key" ON "vendor_invoices"("cancellation_header_id");

-- CreateIndex
CREATE INDEX "vendor_invoices_tenant_id_state_due_date_idx" ON "vendor_invoices"("tenant_id", "state", "due_date");

-- CreateIndex
CREATE INDEX "vendor_invoices_tenant_id_vendor_id_idx" ON "vendor_invoices"("tenant_id", "vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_invoices_tenant_id_internal_no_key" ON "vendor_invoices"("tenant_id", "internal_no");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_invoices_tenant_id_vendor_id_vendor_invoice_no_key" ON "vendor_invoices"("tenant_id", "vendor_id", "vendor_invoice_no");

-- CreateIndex
CREATE INDEX "vendor_invoice_lines_tenant_id_invoice_id_idx" ON "vendor_invoice_lines"("tenant_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_invoice_lines_invoice_id_line_no_key" ON "vendor_invoice_lines"("invoice_id", "line_no");

-- CreateIndex
CREATE UNIQUE INDEX "payment_vouchers_posted_header_id_key" ON "payment_vouchers"("posted_header_id");

-- CreateIndex
CREATE INDEX "payment_vouchers_tenant_id_vendor_id_state_idx" ON "payment_vouchers"("tenant_id", "vendor_id", "state");

-- CreateIndex
CREATE UNIQUE INDEX "payment_vouchers_tenant_id_pv_no_key" ON "payment_vouchers"("tenant_id", "pv_no");

-- CreateIndex
CREATE INDEX "payment_allocations_tenant_id_invoice_id_idx" ON "payment_allocations"("tenant_id", "invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_allocations_payment_voucher_id_invoice_id_key" ON "payment_allocations"("payment_voucher_id", "invoice_id");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_prepared_by_id_fkey" FOREIGN KEY ("prepared_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_budget_id_fkey" FOREIGN KEY ("budget_id") REFERENCES "budgets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_lines" ADD CONSTRAINT "budget_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_period_allocations" ADD CONSTRAINT "budget_period_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_period_allocations" ADD CONSTRAINT "budget_period_allocations_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_period_allocations" ADD CONSTRAINT "budget_period_allocations_fiscal_period_id_fkey" FOREIGN KEY ("fiscal_period_id") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_purchase_order_line_id_fkey" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrances" ADD CONSTRAINT "encumbrances_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrance_movements" ADD CONSTRAINT "encumbrance_movements_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrance_movements" ADD CONSTRAINT "encumbrance_movements_encumbrance_id_fkey" FOREIGN KEY ("encumbrance_id") REFERENCES "encumbrances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encumbrance_movements" ADD CONSTRAINT "encumbrance_movements_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bank_changes" ADD CONSTRAINT "vendor_bank_changes_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bank_changes" ADD CONSTRAINT "vendor_bank_changes_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bank_changes" ADD CONSTRAINT "vendor_bank_changes_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_bank_changes" ADD CONSTRAINT "vendor_bank_changes_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_sequences" ADD CONSTRAINT "procurement_sequences_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "procurement_sequences" ADD CONSTRAINT "procurement_sequences_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_decided_by_id_fkey" FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_fiscal_year_id_fkey" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "purchase_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_budget_line_id_fkey" FOREIGN KEY ("budget_line_id") REFERENCES "budget_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_received_by_id_fkey" FOREIGN KEY ("received_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_goods_receipt_id_fkey" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoices" ADD CONSTRAINT "vendor_invoices_cancellation_header_id_fkey" FOREIGN KEY ("cancellation_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "purchase_order_lines"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_invoice_lines" ADD CONSTRAINT "vendor_invoice_lines_cost_center_id_fkey" FOREIGN KEY ("cost_center_id") REFERENCES "cost_centers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_vouchers" ADD CONSTRAINT "payment_vouchers_posted_header_id_fkey" FOREIGN KEY ("posted_header_id") REFERENCES "transaction_headers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_payment_voucher_id_fkey" FOREIGN KEY ("payment_voucher_id") REFERENCES "payment_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_allocations" ADD CONSTRAINT "payment_allocations_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "vendor_invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ===========================================================================
-- Track A6 invariants: budget, encumbrance, procurement and accounts payable.
--
-- Everything below this line is hand-written. Prisma cannot express partial
-- unique indexes, NULLS NOT DISTINCT, CHECK constraints, triggers or RLS
-- policies, and every one of them is load-bearing here.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Budget versions.
--
--    A budget is a version, and exactly one version of a fiscal year's budget
--    is in force at a time. The legacy `AccBudget` had no such notion: rows
--    were inserted and soft-deleted, so "what did we approve in October" was
--    unanswerable and two rows for the same account silently doubled the
--    allocation.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX uq_budget_one_approved_per_year
  ON budgets (tenant_id, fiscal_year_id)
  WHERE status = 'APPROVED';

ALTER TABLE budgets
  ADD CONSTRAINT chk_budget_version_positive CHECK (version_no > 0);

-- Approval is recorded as a whole or not at all, and a superseded version had
-- to have been approved first.
ALTER TABLE budgets
  ADD CONSTRAINT chk_budget_decision_complete CHECK (
    (status IN ('DRAFT', 'PENDING_APPROVAL')
     AND approved_by_id IS NULL AND approved_at IS NULL AND superseded_at IS NULL)
    OR (status = 'REJECTED'
        AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL
        AND decision_note IS NOT NULL AND btrim(decision_note) <> ''
        AND superseded_at IS NULL)
    OR (status = 'APPROVED'
        AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL
        AND superseded_at IS NULL)
    OR (status = 'SUPERSEDED'
        AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL
        AND superseded_at IS NOT NULL)
  );

-- One line per account × cost centre. NULLS NOT DISTINCT so a line with no
-- cost centre collides with another line with no cost centre, which is the
-- whole point — without it "no cost centre" would be a licence to enter the
-- same allocation any number of times.
CREATE UNIQUE INDEX uq_budget_line_account_cc
  ON budget_lines (budget_id, account_id, cost_center_id)
  NULLS NOT DISTINCT;

ALTER TABLE budget_lines
  ADD CONSTRAINT chk_budget_line_amount CHECK (annual_amount >= 0);

ALTER TABLE budget_period_allocations
  ADD CONSTRAINT chk_budget_allocation_amount CHECK (amount >= 0);

-- An approved budget is the authority everything else is measured against.
-- Editing one silently restates every availability check already made.
CREATE OR REPLACE FUNCTION assert_budget_version_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'DRAFT' THEN
      RAISE EXCEPTION 'budget version % has been submitted and cannot be deleted', OLD.version_no
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF (NEW.tenant_id, NEW.fiscal_year_id, NEW.version_no)
     IS DISTINCT FROM (OLD.tenant_id, OLD.fiscal_year_id, OLD.version_no) THEN
    RAISE EXCEPTION 'a budget version belongs to one fiscal year and keeps its number'
      USING ERRCODE = 'check_violation';
  END IF;

  -- The only transitions that exist. Anything else is a bug rather than a
  -- decision somebody took.
  IF OLD.status <> NEW.status THEN
    IF NOT (
      (OLD.status = 'DRAFT'            AND NEW.status IN ('PENDING_APPROVAL', 'REJECTED'))
      OR (OLD.status = 'PENDING_APPROVAL' AND NEW.status IN ('APPROVED', 'REJECTED', 'DRAFT'))
      OR (OLD.status = 'REJECTED'      AND NEW.status = 'DRAFT')
      OR (OLD.status = 'APPROVED'      AND NEW.status = 'SUPERSEDED')
    ) THEN
      RAISE EXCEPTION 'a budget cannot go from % to %', OLD.status, NEW.status
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_budget_version_progress
  BEFORE UPDATE OR DELETE ON budgets
  FOR EACH ROW EXECUTE FUNCTION assert_budget_version_progress();

-- Lines and their phasing are editable only while the version is a draft.
CREATE OR REPLACE FUNCTION assert_budget_line_editable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_budget uuid;
  v_status "BudgetStatus";
BEGIN
  v_budget := COALESCE(NEW.budget_id, OLD.budget_id);
  SELECT status INTO v_status FROM budgets WHERE id = v_budget;

  -- The cascade from deleting a draft budget deletes its lines; the budget
  -- row is already gone by then, so there is nothing left to check.
  IF v_status IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'budget version is % — revise it by creating a new version, not by editing this one', v_status
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_budget_line_editable
  BEFORE INSERT OR UPDATE OR DELETE ON budget_lines
  FOR EACH ROW EXECUTE FUNCTION assert_budget_line_editable();


-- ---------------------------------------------------------------------------
-- 2. Encumbrance.
--
--    Released can never exceed reserved. If it could, a purchase order would
--    hand back more spending authority than it took, and the budget would
--    grow by being spent.
-- ---------------------------------------------------------------------------
ALTER TABLE encumbrances
  ADD CONSTRAINT chk_encumbrance_amounts CHECK (
    amount > 0
    AND released_amount >= 0
    AND released_amount <= amount
  );

-- A closed encumbrance is closed for a reason that is on the record; an open
-- one has not been fully released, or it would not be open.
ALTER TABLE encumbrances
  ADD CONSTRAINT chk_encumbrance_status_consistent CHECK (
    (status = 'OPEN' AND released_amount < amount)
    OR (status = 'RELEASED' AND released_amount = amount)
    OR status IN ('CANCELLED', 'LAPSED', 'CARRIED_FORWARD')
  );

ALTER TABLE encumbrance_movements
  ADD CONSTRAINT chk_encumbrance_movement_amount CHECK (amount > 0);

-- The movement log is what explains released_amount. An editable explanation
-- is not an explanation.
CREATE OR REPLACE FUNCTION assert_encumbrance_movement_append_only()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'encumbrance history is append-only'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_encumbrance_movements_append_only
  BEFORE UPDATE OR DELETE ON encumbrance_movements
  FOR EACH ROW EXECUTE FUNCTION assert_encumbrance_movement_append_only();

-- A commitment belongs to one order line and one budget line, permanently.
-- Repointing it would move spending authority between departments with no
-- trace whatsoever.
CREATE OR REPLACE FUNCTION assert_encumbrance_identity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'an encumbrance is cancelled, never deleted'
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.tenant_id, NEW.budget_line_id, NEW.purchase_order_id,
      NEW.purchase_order_line_id, NEW.fiscal_year_id, NEW.amount)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.budget_line_id, OLD.purchase_order_id,
      OLD.purchase_order_line_id, OLD.fiscal_year_id, OLD.amount) THEN
    RAISE EXCEPTION 'an encumbrance is fixed to its order line, its budget line and its amount'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.released_amount < OLD.released_amount THEN
    RAISE EXCEPTION 'an encumbrance release cannot be taken back'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_encumbrance_identity
  BEFORE UPDATE OR DELETE ON encumbrances
  FOR EACH ROW EXECUTE FUNCTION assert_encumbrance_identity();


-- ---------------------------------------------------------------------------
-- 3. Vendors and their bank details.
--
--    Redirecting a real vendor's payments to an attacker's account needs no
--    forged invoice — only an edit to one row. So the columns that say where
--    money goes cannot be changed by an UPDATE at all; they change only when
--    a `vendor_bank_changes` row is approved, and the trigger recognises that
--    by looking for one.
-- ---------------------------------------------------------------------------
ALTER TABLE vendors
  ADD CONSTRAINT chk_vendor_terms CHECK (payment_terms_days >= 0);

ALTER TABLE vendors
  ADD CONSTRAINT chk_vendor_block_reason CHECK (
    is_blocked = false OR (block_reason IS NOT NULL AND btrim(block_reason) <> '')
  );

CREATE OR REPLACE FUNCTION assert_vendor_bank_change_authorised()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (NEW.bank_name, NEW.bank_account_name, NEW.bank_account_no, NEW.bank_iban)
     IS DISTINCT FROM
     (OLD.bank_name, OLD.bank_account_name, OLD.bank_account_no, OLD.bank_iban)
  THEN
    IF NOT EXISTS (
      SELECT 1 FROM vendor_bank_changes c
       WHERE c.vendor_id = NEW.id
         AND c.state = 'APPROVED'
         AND c.decided_at IS NOT NULL
         AND (c.proposed_bank_name, c.proposed_bank_account_name,
              c.proposed_bank_account_no, c.proposed_bank_iban)
             IS NOT DISTINCT FROM
             (NEW.bank_name, NEW.bank_account_name, NEW.bank_account_no, NEW.bank_iban)
    ) THEN
      RAISE EXCEPTION 'vendor bank details change only through an approved bank-change request — this is how invoice-redirection fraud is stopped'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vendor_bank_change_authorised
  BEFORE UPDATE ON vendors
  FOR EACH ROW EXECUTE FUNCTION assert_vendor_bank_change_authorised();

-- A decided request is history. Re-deciding it, or editing what it proposed
-- after the fact, would let the approved details differ from the approved
-- ones.
CREATE OR REPLACE FUNCTION assert_bank_change_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'a bank-detail change request is part of the audit trail and is not deleted'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.state <> 'PENDING' THEN
    RAISE EXCEPTION 'this bank-detail change has already been %', lower(OLD.state::text)
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.vendor_id, NEW.requested_by_id, NEW.proposed_bank_name,
      NEW.proposed_bank_account_name, NEW.proposed_bank_account_no,
      NEW.proposed_bank_iban)
     IS DISTINCT FROM
     (OLD.vendor_id, OLD.requested_by_id, OLD.proposed_bank_name,
      OLD.proposed_bank_account_name, OLD.proposed_bank_account_no,
      OLD.proposed_bank_iban) THEN
    RAISE EXCEPTION 'what a bank-detail change proposes cannot be edited while it awaits approval'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.state <> 'PENDING' AND (NEW.decided_by_id IS NULL OR NEW.decided_at IS NULL) THEN
    RAISE EXCEPTION 'a decided bank-detail change records who decided it and when'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.decided_by_id IS NOT NULL AND NEW.decided_by_id = OLD.requested_by_id THEN
    RAISE EXCEPTION 'whoever requested a bank-detail change cannot also approve it'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bank_change_progress
  BEFORE UPDATE OR DELETE ON vendor_bank_changes
  FOR EACH ROW EXECUTE FUNCTION assert_bank_change_progress();


-- ---------------------------------------------------------------------------
-- 4. Requisitions and purchase orders.
-- ---------------------------------------------------------------------------
ALTER TABLE requisition_lines
  ADD CONSTRAINT chk_requisition_line_amounts CHECK (
    quantity > 0 AND unit_price >= 0 AND amount >= 0
  );

ALTER TABLE purchase_order_lines
  ADD CONSTRAINT chk_po_line_amounts CHECK (
    quantity > 0 AND unit_price >= 0 AND amount >= 0
  );

-- You cannot receive or invoice more than was ordered. Over-receipt is a real
-- event, but it is a change to the order, not something a receipt clerk does
-- silently by typing a bigger number.
ALTER TABLE purchase_order_lines
  ADD CONSTRAINT chk_po_line_progress CHECK (
    received_qty >= 0 AND received_qty <= quantity
    AND invoiced_qty >= 0 AND invoiced_qty <= quantity
  );

ALTER TABLE purchase_orders
  ADD CONSTRAINT chk_po_total CHECK (total_amount >= 0);

ALTER TABLE purchase_orders
  ADD CONSTRAINT chk_po_approval_complete CHECK (
    (state IN ('DRAFT', 'PENDING_APPROVAL', 'CANCELLED')
     AND approved_by_id IS NULL AND approved_at IS NULL)
    OR (state IN ('APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED')
        AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL)
  );

ALTER TABLE purchase_orders
  ADD CONSTRAINT chk_po_expected_after_order CHECK (
    expected_date IS NULL OR expected_date >= order_date
  );

-- An approved order is what the encumbrance was calculated from and what the
-- vendor was sent. Its lines stop being editable at that moment.
CREATE OR REPLACE FUNCTION assert_po_line_editable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_po uuid;
  v_state "PurchaseOrderState";
BEGIN
  v_po := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  SELECT state INTO v_state FROM purchase_orders WHERE id = v_po;

  IF v_state IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Receiving and invoicing move the two cumulative columns on an approved
  -- order; nothing else about the line may move.
  IF v_state <> 'DRAFT' THEN
    IF TG_OP <> 'UPDATE' THEN
      RAISE EXCEPTION 'purchase order is % — its lines are fixed', v_state
        USING ERRCODE = 'check_violation';
    END IF;
    IF (NEW.purchase_order_id, NEW.line_no, NEW.description, NEW.account_id,
        NEW.cost_center_id, NEW.quantity, NEW.unit_price, NEW.amount)
       IS DISTINCT FROM
       (OLD.purchase_order_id, OLD.line_no, OLD.description, OLD.account_id,
        OLD.cost_center_id, OLD.quantity, OLD.unit_price, OLD.amount) THEN
      RAISE EXCEPTION 'purchase order is % — only received and invoiced quantities may change', v_state
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_po_line_editable
  BEFORE INSERT OR UPDATE OR DELETE ON purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION assert_po_line_editable();

CREATE OR REPLACE FUNCTION assert_po_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state <> 'DRAFT' THEN
      RAISE EXCEPTION 'purchase order % has been submitted and cannot be deleted', OLD.po_no
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF (NEW.tenant_id, NEW.po_no, NEW.fiscal_year_id) IS DISTINCT FROM
     (OLD.tenant_id, OLD.po_no, OLD.fiscal_year_id) THEN
    RAISE EXCEPTION 'a purchase order keeps its number and its fiscal year'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.state <> NEW.state THEN
    IF NOT (
      (OLD.state = 'DRAFT'              AND NEW.state IN ('PENDING_APPROVAL', 'CANCELLED'))
      OR (OLD.state = 'PENDING_APPROVAL'   AND NEW.state IN ('APPROVED', 'DRAFT', 'CANCELLED'))
      OR (OLD.state = 'APPROVED'           AND NEW.state IN ('PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'))
      OR (OLD.state = 'PARTIALLY_RECEIVED' AND NEW.state IN ('PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED'))
      OR (OLD.state = 'RECEIVED'           AND NEW.state = 'CLOSED')
    ) THEN
      RAISE EXCEPTION 'purchase order % cannot go from % to %', OLD.po_no, OLD.state, NEW.state
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  -- An order that has taken delivery cannot be cancelled: the goods are here
  -- and the accrual is posted. Close it instead, which releases only what is
  -- still outstanding.
  IF NEW.state = 'CANCELLED' AND EXISTS (
    SELECT 1 FROM purchase_order_lines l
     WHERE l.purchase_order_id = OLD.id AND l.received_qty > 0
  ) THEN
    RAISE EXCEPTION 'purchase order % has received goods against it — close it rather than cancelling it', OLD.po_no
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_po_progress
  BEFORE UPDATE OR DELETE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION assert_po_progress();


-- ---------------------------------------------------------------------------
-- 5. Goods receipts.
--
--    A receipt is the moment an expense is recognised. It is never edited and
--    never deleted; a mistake is corrected by a reversal, exactly as with any
--    other posting.
-- ---------------------------------------------------------------------------
ALTER TABLE goods_receipts
  ADD CONSTRAINT chk_grn_total CHECK (total_amount > 0);

ALTER TABLE goods_receipt_lines
  ADD CONSTRAINT chk_grn_line_amounts CHECK (quantity > 0 AND amount > 0);

CREATE OR REPLACE FUNCTION assert_goods_receipt_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'a goods receipt has already posted its accrual — correct it by reversal, not by edit'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_goods_receipt_immutable
  BEFORE UPDATE OR DELETE ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION assert_goods_receipt_immutable();

CREATE TRIGGER trg_goods_receipt_line_immutable
  BEFORE UPDATE OR DELETE ON goods_receipt_lines
  FOR EACH ROW EXECUTE FUNCTION assert_goods_receipt_immutable();


-- ---------------------------------------------------------------------------
-- 6. Vendor invoices.
-- ---------------------------------------------------------------------------
ALTER TABLE vendor_invoices
  ADD CONSTRAINT chk_invoice_amounts CHECK (
    total_amount > 0
    AND settled_amount >= 0
    AND settled_amount <= total_amount
  );

ALTER TABLE vendor_invoices
  ADD CONSTRAINT chk_invoice_due_after_date CHECK (due_date >= invoice_date);

-- A held invoice has a reason and has not posted; a live one has posted.
-- The pairing is the whole control: an invoice that is on hold but has
-- somehow reached the ledger is exactly the failure this prevents.
ALTER TABLE vendor_invoices
  ADD CONSTRAINT chk_invoice_state_posting CHECK (
    (state = 'ON_HOLD'
     AND posted_header_id IS NULL
     AND hold_reason IS NOT NULL AND btrim(hold_reason) <> '')
    OR (state IN ('MATCHED', 'APPROVED', 'PARTIALLY_PAID', 'PAID')
        AND posted_header_id IS NOT NULL)
    OR (state = 'CANCELLED')
  );

-- Exception approval names the person who took the risk (SRS REQ-PRC-04).
ALTER TABLE vendor_invoices
  ADD CONSTRAINT chk_invoice_exception_approval CHECK (
    state <> 'APPROVED'
    OR (approved_by_id IS NOT NULL AND approved_at IS NOT NULL)
  );

ALTER TABLE vendor_invoices
  ADD CONSTRAINT chk_invoice_cancellation_complete CHECK (
    (state <> 'CANCELLED' AND cancelled_at IS NULL AND cancellation_reason IS NULL)
    OR (state = 'CANCELLED' AND cancelled_at IS NOT NULL
        AND cancellation_reason IS NOT NULL AND btrim(cancellation_reason) <> '')
  );

ALTER TABLE vendor_invoice_lines
  ADD CONSTRAINT chk_invoice_line_amounts CHECK (
    quantity > 0 AND unit_price >= 0 AND amount > 0
  );

CREATE OR REPLACE FUNCTION assert_invoice_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'vendor invoice % is cancelled, never deleted', OLD.internal_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF (NEW.tenant_id, NEW.internal_no, NEW.vendor_id, NEW.vendor_invoice_no,
      NEW.total_amount, NEW.currency, NEW.invoice_date)
     IS DISTINCT FROM
     (OLD.tenant_id, OLD.internal_no, OLD.vendor_id, OLD.vendor_invoice_no,
      OLD.total_amount, OLD.currency, OLD.invoice_date) THEN
    RAISE EXCEPTION 'a vendor invoice records what the vendor billed — its identity and amount do not change'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.state = 'CANCELLED' THEN
    RAISE EXCEPTION 'vendor invoice % is cancelled', OLD.internal_no
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.state IN ('PAID') AND NEW.state NOT IN ('PAID') THEN
    RAISE EXCEPTION 'vendor invoice % is settled', OLD.internal_no
      USING ERRCODE = 'check_violation';
  END IF;

  -- A posting is not moved off an invoice once it exists.
  IF OLD.posted_header_id IS NOT NULL
     AND NEW.posted_header_id IS DISTINCT FROM OLD.posted_header_id THEN
    RAISE EXCEPTION 'vendor invoice % has already posted to the ledger', OLD.internal_no
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_progress
  BEFORE UPDATE OR DELETE ON vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION assert_invoice_progress();

-- Invoice lines are what the match was run against.
CREATE OR REPLACE FUNCTION assert_invoice_line_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'vendor invoice lines record what was billed and are not edited'
    USING ERRCODE = 'check_violation';
END;
$$;

CREATE TRIGGER trg_invoice_line_immutable
  BEFORE UPDATE OR DELETE ON vendor_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION assert_invoice_line_immutable();


-- ---------------------------------------------------------------------------
-- 7. Payment vouchers.
-- ---------------------------------------------------------------------------
ALTER TABLE payment_vouchers
  ADD CONSTRAINT chk_payment_amount CHECK (amount > 0);

ALTER TABLE payment_vouchers
  ADD CONSTRAINT chk_payment_approval_complete CHECK (
    (state IN ('DRAFT', 'PENDING_APPROVAL', 'CANCELLED')
     AND approved_by_id IS NULL AND approved_at IS NULL AND posted_header_id IS NULL)
    OR (state = 'REJECTED'
        AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL
        AND decision_note IS NOT NULL AND btrim(decision_note) <> ''
        AND posted_header_id IS NULL)
    OR (state = 'PAID'
        AND approved_by_id IS NOT NULL AND approved_at IS NOT NULL
        AND posted_header_id IS NOT NULL)
  );

-- A cheque payment says which cheque. Otherwise the bank reconciliation has
-- nothing to match on, which is exactly the state the legacy system left.
ALTER TABLE payment_vouchers
  ADD CONSTRAINT chk_payment_cheque_no CHECK (
    channel <> 'CHEQUE' OR (cheque_no IS NOT NULL AND btrim(cheque_no) <> '')
  );

-- Money leaves through cash, a bank transfer or a cheque. A payment voucher
-- against a credit balance is a contradiction — nothing moves.
ALTER TABLE payment_vouchers
  ADD CONSTRAINT chk_payment_channel CHECK (
    channel IN ('CASH', 'BANK_TRANSFER', 'CHEQUE')
  );

ALTER TABLE payment_allocations
  ADD CONSTRAINT chk_payment_allocation_amount CHECK (amount > 0);

CREATE OR REPLACE FUNCTION assert_payment_progress()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.state <> 'DRAFT' THEN
      RAISE EXCEPTION 'payment voucher % has been submitted and cannot be deleted', OLD.pv_no
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF (NEW.tenant_id, NEW.pv_no, NEW.vendor_id) IS DISTINCT FROM
     (OLD.tenant_id, OLD.pv_no, OLD.vendor_id) THEN
    RAISE EXCEPTION 'a payment voucher keeps its number and its payee'
      USING ERRCODE = 'check_violation';
  END IF;

  IF OLD.state IN ('PAID', 'REJECTED', 'CANCELLED') AND NEW.state <> OLD.state THEN
    RAISE EXCEPTION 'payment voucher % is % and is final', OLD.pv_no, lower(OLD.state::text)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_progress
  BEFORE UPDATE OR DELETE ON payment_vouchers
  FOR EACH ROW EXECUTE FUNCTION assert_payment_progress();

-- Once the money has gone, what it paid is settled fact.
CREATE OR REPLACE FUNCTION assert_payment_allocation_frozen()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_state "PaymentVoucherState";
BEGIN
  SELECT state INTO v_state FROM payment_vouchers
   WHERE id = COALESCE(NEW.payment_voucher_id, OLD.payment_voucher_id);

  IF v_state IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF v_state <> 'DRAFT' THEN
    RAISE EXCEPTION 'payment voucher is % — what it settles cannot be changed', v_state
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_payment_allocation_frozen
  BEFORE INSERT OR UPDATE OR DELETE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION assert_payment_allocation_frozen();


-- ---------------------------------------------------------------------------
-- 8. Cross-tenant references.
--
--    Foreign keys carry no tenant, and referential-integrity checks run as
--    the table owner rather than as the app role, so RLS does not constrain
--    them. Every reference is checked explicitly.
-- ---------------------------------------------------------------------------
CREATE TRIGGER trg_budget_same_tenant
  BEFORE INSERT OR UPDATE ON budgets
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'fiscal_year_id', 'fiscal_years');

CREATE TRIGGER trg_budget_line_same_tenant
  BEFORE INSERT OR UPDATE ON budget_lines
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'budget_id', 'budgets',
    'account_id', 'chart_of_accounts',
    'cost_center_id', 'cost_centers');

CREATE TRIGGER trg_budget_allocation_same_tenant
  BEFORE INSERT OR UPDATE ON budget_period_allocations
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'budget_line_id', 'budget_lines');

CREATE TRIGGER trg_encumbrance_same_tenant
  BEFORE INSERT OR UPDATE ON encumbrances
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'budget_line_id', 'budget_lines',
    'purchase_order_id', 'purchase_orders',
    'purchase_order_line_id', 'purchase_order_lines',
    'fiscal_year_id', 'fiscal_years');

CREATE TRIGGER trg_encumbrance_movement_same_tenant
  BEFORE INSERT OR UPDATE ON encumbrance_movements
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'encumbrance_id', 'encumbrances',
    'goods_receipt_id', 'goods_receipts');

CREATE TRIGGER trg_bank_change_same_tenant
  BEFORE INSERT OR UPDATE ON vendor_bank_changes
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant('vendor_id', 'vendors');

CREATE TRIGGER trg_requisition_same_tenant
  BEFORE INSERT OR UPDATE ON purchase_requisitions
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'fiscal_year_id', 'fiscal_years',
    'cost_center_id', 'cost_centers');

CREATE TRIGGER trg_requisition_line_same_tenant
  BEFORE INSERT OR UPDATE ON requisition_lines
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'requisition_id', 'purchase_requisitions',
    'account_id', 'chart_of_accounts',
    'cost_center_id', 'cost_centers');

CREATE TRIGGER trg_po_same_tenant
  BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'fiscal_year_id', 'fiscal_years',
    'vendor_id', 'vendors',
    'requisition_id', 'purchase_requisitions');

CREATE TRIGGER trg_po_line_same_tenant
  BEFORE INSERT OR UPDATE ON purchase_order_lines
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'purchase_order_id', 'purchase_orders',
    'account_id', 'chart_of_accounts',
    'cost_center_id', 'cost_centers',
    'budget_line_id', 'budget_lines');

CREATE TRIGGER trg_grn_same_tenant
  BEFORE INSERT OR UPDATE ON goods_receipts
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'purchase_order_id', 'purchase_orders',
    'posted_header_id', 'transaction_headers');

CREATE TRIGGER trg_grn_line_same_tenant
  BEFORE INSERT OR UPDATE ON goods_receipt_lines
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'goods_receipt_id', 'goods_receipts',
    'po_line_id', 'purchase_order_lines');

CREATE TRIGGER trg_invoice_same_tenant
  BEFORE INSERT OR UPDATE ON vendor_invoices
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'vendor_id', 'vendors',
    'purchase_order_id', 'purchase_orders',
    'posted_header_id', 'transaction_headers',
    'cancellation_header_id', 'transaction_headers');

CREATE TRIGGER trg_invoice_line_same_tenant
  BEFORE INSERT OR UPDATE ON vendor_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'invoice_id', 'vendor_invoices',
    'po_line_id', 'purchase_order_lines',
    'account_id', 'chart_of_accounts',
    'cost_center_id', 'cost_centers');

CREATE TRIGGER trg_payment_same_tenant
  BEFORE INSERT OR UPDATE ON payment_vouchers
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'vendor_id', 'vendors',
    'bank_account_id', 'chart_of_accounts',
    'posted_header_id', 'transaction_headers');

CREATE TRIGGER trg_payment_allocation_same_tenant
  BEFORE INSERT OR UPDATE ON payment_allocations
  FOR EACH ROW EXECUTE FUNCTION assert_ref_same_tenant(
    'payment_voucher_id', 'payment_vouchers',
    'invoice_id', 'vendor_invoices');


-- ---------------------------------------------------------------------------
-- 9. Row-level security and grants.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'budgets', 'budget_lines', 'budget_period_allocations',
    'encumbrances', 'encumbrance_movements',
    'vendors', 'vendor_bank_changes', 'procurement_sequences',
    'purchase_requisitions', 'requisition_lines',
    'purchase_orders', 'purchase_order_lines',
    'goods_receipts', 'goods_receipt_lines',
    'vendor_invoices', 'vendor_invoice_lines',
    'payment_vouchers', 'payment_allocations'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id = current_tenant_id())
        WITH CHECK (tenant_id = current_tenant_id())
    $f$, t);
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'uniflow_app') THEN
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO uniflow_app', t);
    END IF;
  END LOOP;
END
$$;
