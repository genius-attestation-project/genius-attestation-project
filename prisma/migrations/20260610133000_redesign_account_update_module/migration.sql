CREATE TABLE IF NOT EXISTS "payment_update" (
  "id" TEXT NOT NULL,
  "registration_id" TEXT NOT NULL,
  "tracking_number" TEXT NOT NULL,
  "customer_name" TEXT NOT NULL,
  "process_type" TEXT,
  "total_charges" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "advance_paid" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "balance_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "payment_mode" TEXT NOT NULL,
  "amount_paid" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "invoice_number" TEXT NOT NULL,
  "payment_date" TIMESTAMP(3) NOT NULL,
  "receipt_file_name" TEXT,
  "receipt_mime_type" TEXT,
  "receipt_file_size" INTEGER,
  "receipt_file_data" BYTEA,
  "submitted_by" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approval_status" TEXT NOT NULL DEFAULT 'Pending',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "reset_by" TEXT,
  "reset_at" TIMESTAMP(3),
  "reset_reason" TEXT,
  "owner_admin_id" TEXT NOT NULL,
  CONSTRAINT "payment_update_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_update_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "account_transactions" (
  "id" TEXT NOT NULL,
  "transaction_type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "credit_or_debit" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "voucher_number" TEXT NOT NULL,
  "bill_file_name" TEXT,
  "bill_mime_type" TEXT,
  "bill_file_size" INTEGER,
  "bill_file_data" BYTEA,
  "created_by" TEXT,
  "owner_admin_id" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "account_transactions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "account_statement_entries" (
  "id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "tracking_number" TEXT,
  "invoice_number" TEXT,
  "voucher_number" TEXT,
  "particulars" TEXT NOT NULL,
  "entry_type" TEXT NOT NULL,
  "credit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "debit" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "running_balance" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  "source_type" TEXT NOT NULL,
  "source_id" TEXT,
  "payment_update_id" TEXT,
  "account_transaction_id" TEXT,
  "registration_id" TEXT,
  "owner_admin_id" TEXT NOT NULL,
  "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reversed_at" TIMESTAMP(3),
  "reversed_by" TEXT,
  "reversal_reason" TEXT,
  CONSTRAINT "account_statement_entries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "account_statement_entries_payment_update_id_fkey" FOREIGN KEY ("payment_update_id") REFERENCES "payment_update"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "account_statement_entries_account_transaction_id_fkey" FOREIGN KEY ("account_transaction_id") REFERENCES "account_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "account_statement_entries_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "account_transactions_voucher_number_key" ON "account_transactions"("voucher_number");
CREATE INDEX IF NOT EXISTS "payment_update_owner_admin_id_idx" ON "payment_update"("owner_admin_id");
CREATE INDEX IF NOT EXISTS "payment_update_tracking_number_idx" ON "payment_update"("tracking_number");
CREATE INDEX IF NOT EXISTS "payment_update_invoice_number_idx" ON "payment_update"("invoice_number");
CREATE INDEX IF NOT EXISTS "payment_update_approval_status_idx" ON "payment_update"("approval_status");
CREATE INDEX IF NOT EXISTS "payment_update_submitted_at_idx" ON "payment_update"("submitted_at");
CREATE INDEX IF NOT EXISTS "account_transactions_owner_admin_id_idx" ON "account_transactions"("owner_admin_id");
CREATE INDEX IF NOT EXISTS "account_transactions_credit_or_debit_idx" ON "account_transactions"("credit_or_debit");
CREATE INDEX IF NOT EXISTS "account_transactions_category_idx" ON "account_transactions"("category");
CREATE INDEX IF NOT EXISTS "account_transactions_date_idx" ON "account_transactions"("date");
CREATE INDEX IF NOT EXISTS "account_statement_entries_owner_admin_id_idx" ON "account_statement_entries"("owner_admin_id");
CREATE INDEX IF NOT EXISTS "account_statement_entries_date_idx" ON "account_statement_entries"("date");
CREATE INDEX IF NOT EXISTS "account_statement_entries_tracking_number_idx" ON "account_statement_entries"("tracking_number");
CREATE INDEX IF NOT EXISTS "account_statement_entries_invoice_number_idx" ON "account_statement_entries"("invoice_number");
CREATE INDEX IF NOT EXISTS "account_statement_entries_voucher_number_idx" ON "account_statement_entries"("voucher_number");
CREATE INDEX IF NOT EXISTS "account_statement_entries_source_type_source_id_idx" ON "account_statement_entries"("source_type", "source_id");
