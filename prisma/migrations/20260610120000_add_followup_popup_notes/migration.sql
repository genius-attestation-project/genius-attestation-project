ALTER TABLE "Lead"
ADD COLUMN IF NOT EXISTS "snooze_note" TEXT,
ADD COLUMN IF NOT EXISTS "followup_completion_note" TEXT,
ADD COLUMN IF NOT EXISTS "followup_completed_at" TIMESTAMP(3);
