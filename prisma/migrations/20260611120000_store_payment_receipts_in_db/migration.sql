ALTER TABLE "payment_update"
ADD COLUMN IF NOT EXISTS "receipt_file_data" BYTEA;
