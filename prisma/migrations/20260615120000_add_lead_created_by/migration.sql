ALTER TABLE "Lead"
ADD COLUMN IF NOT EXISTS "created_by_id" TEXT;

UPDATE "Lead"
SET "created_by_id" = "owner_admin_id"
WHERE "created_by_id" IS NULL
  AND "owner_admin_id" IS NOT NULL
  AND EXISTS (
    SELECT 1
    FROM "users"
    WHERE "users"."id" = "Lead"."owner_admin_id"
  );

UPDATE "Lead"
SET "created_by_id" = NULL
WHERE "created_by_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "users"
    WHERE "users"."id" = "Lead"."created_by_id"
  );

CREATE INDEX IF NOT EXISTS "Lead_created_by_id_idx"
ON "Lead"("created_by_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'Lead_created_by_id_fkey'
      AND table_name = 'Lead'
  ) THEN
    ALTER TABLE "Lead"
    ADD CONSTRAINT "Lead_created_by_id_fkey"
    FOREIGN KEY ("created_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
