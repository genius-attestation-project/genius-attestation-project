DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FollowupStatus') THEN
    CREATE TYPE "FollowupStatus" AS ENUM ('Pending', 'Completed', 'Rescheduled');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'FollowupActionType') THEN
    CREATE TYPE "FollowupActionType" AS ENUM ('Created', 'Snoozed', 'Completed', 'Rescheduled');
  END IF;
END $$;

ALTER TABLE "Lead"
ADD COLUMN IF NOT EXISTS "followup_status" "FollowupStatus" NOT NULL DEFAULT 'Pending',
ADD COLUMN IF NOT EXISTS "completion_description" TEXT,
ADD COLUMN IF NOT EXISTS "completed_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "completed_by" TEXT;

CREATE INDEX IF NOT EXISTS "Lead_followup_status_idx"
ON "Lead"("followup_status");

CREATE TABLE IF NOT EXISTS "lead_followup_history" (
  "id" TEXT NOT NULL,
  "lead_id" TEXT NOT NULL,
  "action_type" "FollowupActionType" NOT NULL,
  "old_date" TIMESTAMP(3),
  "new_date" TIMESTAMP(3),
  "description" TEXT,
  "user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "owner_admin_id" TEXT,
  CONSTRAINT "lead_followup_history_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "lead_followup_history_lead_id_idx"
ON "lead_followup_history"("lead_id");

CREATE INDEX IF NOT EXISTS "lead_followup_history_action_type_idx"
ON "lead_followup_history"("action_type");

CREATE INDEX IF NOT EXISTS "lead_followup_history_user_id_idx"
ON "lead_followup_history"("user_id");

CREATE INDEX IF NOT EXISTS "lead_followup_history_created_at_idx"
ON "lead_followup_history"("created_at");

CREATE INDEX IF NOT EXISTS "lead_followup_history_owner_admin_id_idx"
ON "lead_followup_history"("owner_admin_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'lead_followup_history_lead_id_fkey'
  ) THEN
    ALTER TABLE "lead_followup_history"
    ADD CONSTRAINT "lead_followup_history_lead_id_fkey"
    FOREIGN KEY ("lead_id")
    REFERENCES "Lead"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "Lead"
SET "followup_status" = CASE
  WHEN "leadStatus" = 'Closed' THEN 'Completed'::"FollowupStatus"
  WHEN "nextFollowupAt" IS NOT NULL THEN 'Rescheduled'::"FollowupStatus"
  ELSE 'Pending'::"FollowupStatus"
END
WHERE "followup_status" = 'Pending'::"FollowupStatus";

INSERT INTO "lead_followup_history" (
  "id",
  "lead_id",
  "action_type",
  "old_date",
  "new_date",
  "description",
  "user_id",
  "created_at",
  "owner_admin_id"
)
SELECT
  md5("id" || '-followup-created'),
  "id",
  CASE
    WHEN "nextFollowupAt" IS NOT NULL THEN 'Created'::"FollowupActionType"
    ELSE 'Rescheduled'::"FollowupActionType"
  END,
  NULL,
  "nextFollowupAt",
  CASE
    WHEN "nextFollowupAt" IS NOT NULL THEN 'Initial followup scheduled from lead record.'
    ELSE 'Followup status migrated from existing lead data.'
  END,
  "assigned_user_id",
  "createdAt",
  "owner_admin_id"
FROM "Lead"
WHERE "nextFollowupAt" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "lead_followup_history" h
    WHERE h."lead_id" = "Lead"."id"
  );
