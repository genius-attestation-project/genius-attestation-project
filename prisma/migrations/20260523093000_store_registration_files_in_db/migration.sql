ALTER TABLE "registration_files" ADD COLUMN "mime_type" TEXT;
ALTER TABLE "registration_files" ADD COLUMN "file_size" INTEGER;
ALTER TABLE "registration_files" ADD COLUMN "file_data" BYTEA;
ALTER TABLE "registration_files" ADD COLUMN "file_category" TEXT;

UPDATE "registration_files"
SET
  "mime_type" = COALESCE("file_type", 'application/octet-stream'),
  "file_size" = 0,
  "file_data" = '\x'::bytea,
  "file_category" = 'DOCUMENT';

ALTER TABLE "registration_files" ALTER COLUMN "mime_type" SET NOT NULL;
ALTER TABLE "registration_files" ALTER COLUMN "file_size" SET NOT NULL;
ALTER TABLE "registration_files" ALTER COLUMN "file_data" SET NOT NULL;
ALTER TABLE "registration_files" ALTER COLUMN "file_category" SET NOT NULL;

DROP INDEX IF EXISTS "registration_files_registration_id_idx";

ALTER TABLE "registration_files" DROP COLUMN "file_url";
ALTER TABLE "registration_files" DROP COLUMN "file_type";

CREATE INDEX "registration_files_registration_id_idx" ON "registration_files"("registration_id");
CREATE INDEX "registration_files_file_category_idx" ON "registration_files"("file_category");
