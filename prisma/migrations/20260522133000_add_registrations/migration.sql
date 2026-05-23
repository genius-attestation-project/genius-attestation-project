CREATE TABLE "registrations" (
    "id" TEXT NOT NULL,
    "tracking_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "mobile" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "country" TEXT,
    "state" TEXT,
    "city" TEXT,
    "customer_type" TEXT,
    "document_type" TEXT,
    "document_issued_country" TEXT,
    "process_type" TEXT,
    "external_process" TEXT,
    "priority" TEXT,
    "committed_duration" TEXT,
    "delivery_location" TEXT,
    "total_charges" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "advance_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "balance_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payment_mode" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'Pending',
    "approval_status" TEXT NOT NULL DEFAULT 'Pending',
    "tracking_status" TEXT NOT NULL DEFAULT 'Registered',
    "owner_admin_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "registration_files" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_files_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_trails" (
    "id" TEXT NOT NULL,
    "registration_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "performed_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_trails_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registrations_tracking_number_key" ON "registrations"("tracking_number");
CREATE INDEX "registrations_owner_admin_id_idx" ON "registrations"("owner_admin_id");
CREATE INDEX "registrations_created_at_idx" ON "registrations"("created_at");
CREATE INDEX "registrations_payment_status_idx" ON "registrations"("payment_status");
CREATE INDEX "registrations_approval_status_idx" ON "registrations"("approval_status");
CREATE INDEX "registration_files_registration_id_idx" ON "registration_files"("registration_id");
CREATE INDEX "audit_trails_registration_id_idx" ON "audit_trails"("registration_id");
CREATE INDEX "audit_trails_created_at_idx" ON "audit_trails"("created_at");

ALTER TABLE "registration_files" ADD CONSTRAINT "registration_files_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_trails" ADD CONSTRAINT "audit_trails_registration_id_fkey" FOREIGN KEY ("registration_id") REFERENCES "registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
