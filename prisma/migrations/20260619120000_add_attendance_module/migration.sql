-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('Present', 'Late', 'Absent', 'HalfDay');

-- CreateEnum
CREATE TYPE "AttendanceApprovalStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "attendance_records" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "attendance_date" DATE NOT NULL,
    "checkin_time" TIMESTAMP(3),
    "checkout_time" TIMESTAMP(3),
    "working_hours" DECIMAL(5,2),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'Present',
    "daily_summary" TEXT,
    "checkin_remarks" TEXT,
    "approval_status" "AttendanceApprovalStatus" NOT NULL DEFAULT 'Pending',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "owner_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance_settings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "expected_checkin_time" TEXT NOT NULL,
    "expected_checkout_time" TEXT NOT NULL,
    "owner_admin_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_records_user_id_idx" ON "attendance_records"("user_id");

-- CreateIndex
CREATE INDEX "attendance_records_attendance_date_idx" ON "attendance_records"("attendance_date");

-- CreateIndex
CREATE INDEX "attendance_records_owner_admin_id_idx" ON "attendance_records"("owner_admin_id");

-- CreateIndex
CREATE INDEX "attendance_records_approval_status_idx" ON "attendance_records"("approval_status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_records_user_id_attendance_date_key" ON "attendance_records"("user_id", "attendance_date");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_settings_user_id_key" ON "attendance_settings"("user_id");

-- CreateIndex
CREATE INDEX "attendance_settings_owner_admin_id_idx" ON "attendance_settings"("owner_admin_id");

-- AddForeignKey
ALTER TABLE "attendance_records" ADD CONSTRAINT "attendance_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_settings" ADD CONSTRAINT "attendance_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
