CREATE TABLE IF NOT EXISTS "payment_invoices" (
  "id" TEXT NOT NULL,
  "invoice_number" TEXT NOT NULL,
  "payment_mode" TEXT NOT NULL,
  "amount_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "payment_date" TIMESTAMP(3) NOT NULL,
  "receipt_file_url" TEXT,
  "receipt_file_name" TEXT,
  "receipt_mime_type" TEXT,
  "receipt_file_size" INTEGER,
  "receipt_file_data" BYTEA,
  "receipt_uploaded_at" TIMESTAMP(3),
  "receipt_uploaded_by" TEXT,
  "submitted_by" TEXT,
  "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approval_status" TEXT NOT NULL DEFAULT 'Pending',
  "approved_by" TEXT,
  "approved_at" TIMESTAMP(3),
  "reset_by" TEXT,
  "reset_at" TIMESTAMP(3),
  "reset_reason" TEXT,
  "owner_admin_id" TEXT NOT NULL,
  CONSTRAINT "payment_invoices_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "payment_update"
ADD COLUMN IF NOT EXISTS "invoice_group_id" TEXT;

INSERT INTO "payment_invoices" (
  "id", "invoice_number", "payment_mode", "amount_paid", "payment_date",
  "receipt_file_url", "receipt_file_name", "receipt_mime_type", "receipt_file_size", "receipt_file_data",
  "receipt_uploaded_at", "receipt_uploaded_by", "submitted_by", "submitted_at", "approval_status",
  "approved_by", "approved_at", "reset_by", "reset_at", "reset_reason", "owner_admin_id"
)
SELECT
  p."id",
  p."invoice_number",
  p."payment_mode",
  p."amount_paid",
  p."payment_date",
  p."receipt_file_url",
  p."receipt_file_name",
  p."receipt_mime_type",
  p."receipt_file_size",
  p."receipt_file_data",
  p."receipt_uploaded_at",
  p."receipt_uploaded_by",
  p."submitted_by",
  p."submitted_at",
  p."approval_status",
  p."approved_by",
  p."approved_at",
  p."reset_by",
  p."reset_at",
  p."reset_reason",
  p."owner_admin_id"
FROM "payment_update" p
INNER JOIN (
  SELECT "id"
  FROM (
    SELECT
      "id",
      ROW_NUMBER() OVER (
        PARTITION BY "owner_admin_id", "invoice_number"
        ORDER BY "submitted_at" ASC, "id" ASC
      ) AS row_number
    FROM "payment_update"
  ) ranked
  WHERE ranked.row_number = 1
) picked ON picked."id" = p."id"
WHERE NOT EXISTS (
  SELECT 1 FROM "payment_invoices" i
  WHERE i."owner_admin_id" = p."owner_admin_id"
    AND i."invoice_number" = p."invoice_number"
);

UPDATE "payment_update" p
SET "invoice_group_id" = i."id"
FROM "payment_invoices" i
WHERE p."invoice_group_id" IS NULL
  AND i."owner_admin_id" = p."owner_admin_id"
  AND i."invoice_number" = p."invoice_number";

CREATE UNIQUE INDEX IF NOT EXISTS "payment_invoices_owner_admin_id_invoice_number_key"
ON "payment_invoices"("owner_admin_id", "invoice_number");
CREATE INDEX IF NOT EXISTS "payment_invoices_owner_admin_id_idx" ON "payment_invoices"("owner_admin_id");
CREATE INDEX IF NOT EXISTS "payment_invoices_invoice_number_idx" ON "payment_invoices"("invoice_number");
CREATE INDEX IF NOT EXISTS "payment_invoices_approval_status_idx" ON "payment_invoices"("approval_status");
CREATE INDEX IF NOT EXISTS "payment_invoices_submitted_at_idx" ON "payment_invoices"("submitted_at");
CREATE INDEX IF NOT EXISTS "payment_update_invoice_group_id_idx" ON "payment_update"("invoice_group_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'payment_update_invoice_group_id_fkey'
      AND table_name = 'payment_update'
  ) THEN
    ALTER TABLE "payment_update"
    ADD CONSTRAINT "payment_update_invoice_group_id_fkey"
    FOREIGN KEY ("invoice_group_id") REFERENCES "payment_invoices"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
