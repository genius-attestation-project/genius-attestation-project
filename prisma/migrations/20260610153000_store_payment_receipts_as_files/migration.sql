ALTER TABLE "payment_update"
ADD COLUMN IF NOT EXISTS "receipt_file_url" TEXT,
ADD COLUMN IF NOT EXISTS "receipt_uploaded_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "receipt_uploaded_by" TEXT;

ALTER TABLE "payment_update"
DROP COLUMN IF EXISTS "receipt_file_data";
