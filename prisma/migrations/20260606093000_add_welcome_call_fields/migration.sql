ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "welcome_call_status" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS "welcome_called_by" TEXT,
ADD COLUMN IF NOT EXISTS "welcome_called_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "registrations_welcome_call_status_idx"
ON "registrations"("welcome_call_status");
