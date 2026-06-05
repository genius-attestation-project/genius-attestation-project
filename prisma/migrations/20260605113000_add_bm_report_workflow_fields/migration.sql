ALTER TABLE "registrations"
ADD COLUMN IF NOT EXISTS "bm_status" TEXT NOT NULL DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS "accepted_by" TEXT,
ADD COLUMN IF NOT EXISTS "accepted_at" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "registrations_bm_status_idx" ON "registrations"("bm_status");
