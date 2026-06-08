ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "balance_received_amount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "payment_update_status" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS "submitted_by" TEXT,
ADD COLUMN IF NOT EXISTS "submitted_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "finance_approval_status" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS "approved_by" TEXT,
ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;

CREATE INDEX IF NOT EXISTS "registrations_payment_update_status_idx"
ON "registrations"("payment_update_status");

CREATE INDEX IF NOT EXISTS "registrations_finance_approval_status_idx"
ON "registrations"("finance_approval_status");
