CREATE TYPE "SalaryPayrollStatus" AS ENUM ('Draft', 'Generated', 'Approved', 'Paid');

ALTER TABLE "users"
ADD COLUMN "monthly_salary" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "salary_holidays" (
    "id" TEXT NOT NULL,
    "holiday_date" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Approved',
    "owner_admin_id" TEXT,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_holidays_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "salary_payrolls" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "payroll_month" INTEGER NOT NULL,
    "payroll_year" INTEGER NOT NULL,
    "period_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "user_name_snapshot" TEXT NOT NULL,
    "user_email_snapshot" TEXT NOT NULL,
    "department_snapshot" TEXT NOT NULL,
    "office_location_snapshot" TEXT NOT NULL,
    "monthly_salary_snapshot" DECIMAL(12,2) NOT NULL,
    "working_days" DECIMAL(5,2) NOT NULL,
    "present_days" DECIMAL(5,2) NOT NULL,
    "paid_leave_days" DECIMAL(5,2) NOT NULL,
    "unpaid_leave_days" DECIMAL(5,2) NOT NULL,
    "leave_days" DECIMAL(5,2) NOT NULL,
    "lop_days" DECIMAL(5,2) NOT NULL,
    "gross_salary" DECIMAL(12,2) NOT NULL,
    "per_day_rate" DECIMAL(12,2) NOT NULL,
    "earned_salary" DECIMAL(12,2) NOT NULL,
    "lop_deduction" DECIMAL(12,2) NOT NULL,
    "net_payable" DECIMAL(12,2) NOT NULL,
    "payroll_status" "SalaryPayrollStatus" NOT NULL DEFAULT 'Draft',
    "generated_by" TEXT,
    "generated_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "paid_by" TEXT,
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "owner_admin_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salary_payrolls_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "salary_holidays_holiday_date_owner_admin_id_key" ON "salary_holidays"("holiday_date", "owner_admin_id");
CREATE INDEX "salary_holidays_owner_admin_id_idx" ON "salary_holidays"("owner_admin_id");
CREATE INDEX "salary_holidays_holiday_date_idx" ON "salary_holidays"("holiday_date");
CREATE INDEX "salary_holidays_status_idx" ON "salary_holidays"("status");

CREATE UNIQUE INDEX "salary_payrolls_user_id_payroll_month_payroll_year_owner_admin_id_key" ON "salary_payrolls"("user_id", "payroll_month", "payroll_year", "owner_admin_id");
CREATE INDEX "salary_payrolls_user_id_idx" ON "salary_payrolls"("user_id");
CREATE INDEX "salary_payrolls_owner_admin_id_idx" ON "salary_payrolls"("owner_admin_id");
CREATE INDEX "salary_payrolls_payroll_month_payroll_year_idx" ON "salary_payrolls"("payroll_month", "payroll_year");
CREATE INDEX "salary_payrolls_payroll_status_idx" ON "salary_payrolls"("payroll_status");

ALTER TABLE "salary_payrolls"
ADD CONSTRAINT "salary_payrolls_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
