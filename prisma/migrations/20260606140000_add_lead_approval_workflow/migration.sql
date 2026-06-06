ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "supervisor_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "users_supervisor_user_id_idx"
ON "users"("supervisor_user_id");

CREATE TABLE IF NOT EXISTS "lead_status_approvals" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "current_status" "LeadStatus" NOT NULL,
  "requested_status" "LeadStatus" NOT NULL,
  "requested_by" TEXT NOT NULL,
  "supervisor_id" TEXT NOT NULL,
  "approval_status" TEXT NOT NULL DEFAULT 'Pending',
  "approval_reason" TEXT,
  "rejection_reason" TEXT,
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "owner_admin_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_status_approvals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lead_status_approvals_lead_id_idx"
ON "lead_status_approvals"("lead_id");

CREATE INDEX IF NOT EXISTS "lead_status_approvals_supervisor_id_idx"
ON "lead_status_approvals"("supervisor_id");

CREATE INDEX IF NOT EXISTS "lead_status_approvals_requested_by_idx"
ON "lead_status_approvals"("requested_by");

CREATE INDEX IF NOT EXISTS "lead_status_approvals_approval_status_idx"
ON "lead_status_approvals"("approval_status");

CREATE INDEX IF NOT EXISTS "lead_status_approvals_owner_admin_id_idx"
ON "lead_status_approvals"("owner_admin_id");

CREATE INDEX IF NOT EXISTS "lead_status_approvals_created_at_idx"
ON "lead_status_approvals"("created_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'lead_status_approvals_lead_id_fkey'
  ) THEN
    ALTER TABLE "lead_status_approvals"
    ADD CONSTRAINT "lead_status_approvals_lead_id_fkey"
    FOREIGN KEY ("lead_id")
    REFERENCES "Lead"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
