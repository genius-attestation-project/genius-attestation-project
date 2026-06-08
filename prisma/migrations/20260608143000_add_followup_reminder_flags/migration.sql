ALTER TABLE "Lead"
ADD COLUMN "followup_notified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "followup_completed" BOOLEAN NOT NULL DEFAULT false;

