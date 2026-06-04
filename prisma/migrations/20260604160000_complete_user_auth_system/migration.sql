-- Expand the users table for password-based auth and richer user management.
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "password_hash" TEXT,
ADD COLUMN IF NOT EXISTS "phone" TEXT,
ADD COLUMN IF NOT EXISTS "department_id" TEXT,
ADD COLUMN IF NOT EXISTS "office_location_id" TEXT;

-- Preserve existing credential hashes by moving legacy values into password_hash.
UPDATE "users"
SET "password_hash" = COALESCE("password_hash", "password")
WHERE "password_hash" IS NULL
  AND "password" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "users_department_id_idx" ON "users"("department_id");
CREATE INDEX IF NOT EXISTS "users_office_location_id_idx" ON "users"("office_location_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'users_department_id_fkey'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_department_id_fkey"
    FOREIGN KEY ("department_id")
    REFERENCES "departments"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'users_office_location_id_fkey'
      AND table_name = 'users'
  ) THEN
    ALTER TABLE "users"
    ADD CONSTRAINT "users_office_location_id_fkey"
    FOREIGN KEY ("office_location_id")
    REFERENCES "office_locations"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;
