-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('New', 'Followup', 'Assigned', 'Pending_Approval', 'Closed');

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "leadCode" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT '+91',
    "mobileNumber" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "docType" TEXT,
    "noOfDocuments" INTEGER,
    "country" TEXT NOT NULL,
    "state" TEXT,
    "documentIssuedCountry" TEXT,
    "service" TEXT NOT NULL,
    "source" TEXT,
    "leadStatus" "LeadStatus" NOT NULL DEFAULT 'New',
    "clientType" TEXT,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "workingDays" INTEGER,
    "remark" TEXT,
    "assignedUser" TEXT,
    "nextFollowupAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Lead_leadCode_key" ON "Lead"("leadCode");

-- CreateIndex
CREATE INDEX "Lead_leadStatus_idx" ON "Lead"("leadStatus");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_service_idx" ON "Lead"("service");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
