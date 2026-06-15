ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "is_locked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "lock_reason" TEXT,
ADD COLUMN IF NOT EXISTS "locked_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "locked_followup_lead_id" TEXT,
ADD COLUMN IF NOT EXISTS "locked_followup_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "unlocked_by" TEXT,
ADD COLUMN IF NOT EXISTS "unlock_reason" TEXT,
ADD COLUMN IF NOT EXISTS "unlocked_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "users_is_locked_idx"
ON "users"("is_locked");
