CREATE TYPE "LeaveRequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Cancelled');

ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'Leave';

ALTER TABLE "attendance_records"
ADD COLUMN "leave_request_id" TEXT;

CREATE TABLE "leave_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "from_date" DATE NOT NULL,
    "to_date" DATE NOT NULL,
    "total_days" DECIMAL(5,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "attachment_url" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'Pending',
    "approval_note" TEXT,
    "rejection_reason" TEXT,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_by" TEXT,
    "rejected_at" TIMESTAMP(3),
    "cancelled_by" TEXT,
    "cancelled_at" TIMESTAMP(3),
    "applied_by" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modified_by" TEXT,
    "modified_at" TIMESTAMP(3) NOT NULL,
    "owner_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "attendance_records_leave_request_id_idx" ON "attendance_records"("leave_request_id");
CREATE INDEX "leave_requests_user_id_idx" ON "leave_requests"("user_id");
CREATE INDEX "leave_requests_owner_admin_id_idx" ON "leave_requests"("owner_admin_id");
CREATE INDEX "leave_requests_status_idx" ON "leave_requests"("status");
CREATE INDEX "leave_requests_from_date_idx" ON "leave_requests"("from_date");
CREATE INDEX "leave_requests_to_date_idx" ON "leave_requests"("to_date");
CREATE INDEX "leave_requests_applied_at_idx" ON "leave_requests"("applied_at");

ALTER TABLE "attendance_records"
ADD CONSTRAINT "attendance_records_leave_request_id_fkey"
FOREIGN KEY ("leave_request_id") REFERENCES "leave_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "leave_requests"
ADD CONSTRAINT "leave_requests_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
