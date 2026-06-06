ALTER TABLE "Lead"
ADD COLUMN IF NOT EXISTS "assigned_user_id" TEXT;

CREATE INDEX IF NOT EXISTS "Lead_assigned_user_id_idx"
ON "Lead"("assigned_user_id");

CREATE TABLE IF NOT EXISTS "lead_assignment_history" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "old_user_id" TEXT,
  "new_user_id" TEXT,
  "changed_by" TEXT,
  "owner_admin_id" TEXT,
  "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "lead_assignment_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lead_assignment_history_lead_id_idx"
ON "lead_assignment_history"("lead_id");

CREATE INDEX IF NOT EXISTS "lead_assignment_history_old_user_id_idx"
ON "lead_assignment_history"("old_user_id");

CREATE INDEX IF NOT EXISTS "lead_assignment_history_new_user_id_idx"
ON "lead_assignment_history"("new_user_id");

CREATE INDEX IF NOT EXISTS "lead_assignment_history_owner_admin_id_idx"
ON "lead_assignment_history"("owner_admin_id");

CREATE INDEX IF NOT EXISTS "lead_assignment_history_changed_at_idx"
ON "lead_assignment_history"("changed_at");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'lead_assignment_history_lead_id_fkey'
  ) THEN
    ALTER TABLE "lead_assignment_history"
    ADD CONSTRAINT "lead_assignment_history_lead_id_fkey"
    FOREIGN KEY ("lead_id")
    REFERENCES "Lead"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;
