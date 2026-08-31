import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("\n==================================================");
  console.log(" Genius Attestation - Development Database Reset ");
  console.log("==================================================\n");

  // 1. Environment Safety Verification
  const nodeEnv = process.env.NODE_ENV || "development";
  const dbUrl = process.env.DATABASE_URL || "";
  const resetConfirmed = process.env.RESET_DATABASE?.trim() === "true";

  console.log(`Environment: ${nodeEnv}`);
  
  // Extract host/database info from DATABASE_URL for display without leaking passwords
  const urlMatches = dbUrl.match(/mysql:\/\/([^:]+):([^@]+)@([^:\/]+):?(\d+)?\/(.+)/);
  const dbHost = urlMatches ? urlMatches[3] : "unknown-host";
  const dbName = urlMatches ? urlMatches[5] : "unknown-db";
  console.log(`Target Host: ${dbHost}`);
  console.log(`Target Database: ${dbName}\n`);

  // Production Protection Check
  if (nodeEnv === "production" || dbUrl.includes("production") || dbName.toLowerCase().includes("prod")) {
    console.error("❌ Production database detected.");
    console.error("❌ Database reset aborted for safety.");
    process.exit(1);
  }

  // Confirmation Flag Check
  if (!resetConfirmed) {
    console.error("⚠️  RESET_DATABASE flag is not set to 'true'.");
    console.error("⚠️  Execution aborted.");
    console.error("\nTo execute the reset, run:");
    console.error("   $env:RESET_DATABASE=\"true\"; npx tsx scripts/reset-development-data.ts\n");
    process.exit(1);
  }

  console.log("🔍 Verifying database connection and snapshotting record counts...\n");

  try {
    // 2. Pre-reset Counts
    const prePreserved = {
      users: await prisma.user.count(),
      departments: await prisma.department.count(),
      offices: await prisma.officeLocation.count(),
      roles: await prisma.accessRole.count(),
      permissions: await prisma.permission.count(),
      rolePermissions: await prisma.rolePermission.count(),
      userRoles: await prisma.userRole.count(),
      corporateDetails: await prisma.corporateDetail.count(),
      processTypes: await prisma.processType.count(),
      subPackages: await prisma.subPackage.count(),
      masterData: await prisma.masterData.count(),
      paymentModes: await prisma.paymentMode.count(),
      accountMenus: await prisma.accountMenu.count(),
    };

    const preTransactional = {
      leads: await prisma.lead.count(),
      registrations: await prisma.registration.count(),
      paymentUpdates: await prisma.paymentUpdate.count(),
      paymentInvoices: await prisma.paymentInvoice.count(),
      accountTransactions: await prisma.accountTransaction.count(),
      accountStatementEntries: await prisma.accountStatementEntry.count(),
      processAssignments: await prisma.processAssignment.count(),
      documentMovements: await prisma.documentMovement.count(),
      bundles: await prisma.bundle.count(),
      subPackageMovements: await prisma.subPackageMovement.count(),
      leaveRequests: await prisma.leaveRequest.count(),
      attendanceRecords: await prisma.attendanceRecord.count(),
      salaryPayrolls: await prisma.salaryPayroll.count(),
      notifications: await prisma.notification.count(),
    };

    console.log("📋 Pre-Reset Data Summary:");
    console.log("   Preserved Models:", prePreserved);
    console.log("   Transactional Models:", preTransactional);
    console.log("\n🚀 Starting atomic deletion inside Prisma transaction...\n");

    // 3. Reverse Dependency Atomic Deletion Transaction
    await prisma.$transaction(
      async (tx) => {
        // Step 1: Audit & Communication logs
        await tx.approvalAuditLog.deleteMany({});
        await tx.advancePaymentAuditLog.deleteMany({});
        await tx.auditTrail.deleteMany({});
        await tx.documentReadState.deleteMany({});
        await tx.documentCommunication.deleteMany({});

        // Step 2: Detail records & Invoices
        await tx.registrationFile.deleteMany({});
        await tx.paymentUpdate.deleteMany({});
        await tx.paymentInvoice.deleteMany({});
        await tx.accountStatementEntry.deleteMany({});
        await tx.accountTransaction.deleteMany({});
        await tx.accountPanelTransaction.deleteMany({});

        // Step 3: Approvals & Process records
        await tx.advancePaymentApproval.deleteMany({});
        await tx.movementApproval.deleteMany({});
        await tx.processMovement.deleteMany({});
        await tx.processHistory.deleteMany({});
        await tx.processAssignment.deleteMany({});
        await tx.subPackageMovement.deleteMany({});

        // Step 4: Movement & Bundles
        await tx.bundleItem.deleteMany({});
        await tx.documentMovement.deleteMany({});
        await tx.bundle.deleteMany({});
        await tx.movementHistory.deleteMany({});
        await tx.documentWorkflowHistory.deleteMany({});
        await tx.branchMovementRecord.deleteMany({});
        await tx.importHistory.deleteMany({});

        // Step 5: Core Document Registrations
        await tx.registration.deleteMany({});

        // Step 6: Lead Child Histories & Approvals
        await tx.leadFollowupHistory.deleteMany({});
        await tx.leadStatusHistory.deleteMany({});
        await tx.leadAssignmentHistory.deleteMany({});
        await tx.leadStatusApproval.deleteMany({});
        await tx.leadWorkflowApproval.deleteMany({});

        // Step 7: Core Sales Leads
        await tx.lead.deleteMany({});

        // Step 8: Operational HR & Transient Sessions
        await tx.attendanceDailySummary.deleteMany({});
        await tx.attendanceRecord.deleteMany({});
        await tx.leaveRequest.deleteMany({});
        await tx.salaryPayroll.deleteMany({});
        await tx.notification.deleteMany({});
        await tx.session.deleteMany({});
        await tx.refreshToken.deleteMany({});
        await tx.verificationToken.deleteMany({});
        await tx.assignedOfficeAuditLog.deleteMany({});
        await tx.accountMenuAuditLog.deleteMany({});
        await tx.paymentModeAuditLog.deleteMany({});

        // Step 9: Transactional Storage Files (Preserve corporate files)
        const corporateFiles = await tx.corporateDetail.findMany({
          select: { agreementFileId: true },
        });
        const preservedFileIds = corporateFiles
          .map((c) => c.agreementFileId)
          .filter((id): id is string => Boolean(id));

        await tx.fileStorage.deleteMany({
          where: {
            id: { notIn: preservedFileIds },
            module: { not: "corporate" },
          },
        });
      },
      { timeout: 120000, maxWait: 20000 }
    );

    console.log("✅ Deletion transaction committed successfully.\n");

    // 4. Referential Integrity & Data Preservation Check
    const postPreserved = {
      users: await prisma.user.count(),
      departments: await prisma.department.count(),
      offices: await prisma.officeLocation.count(),
      roles: await prisma.accessRole.count(),
      permissions: await prisma.permission.count(),
      rolePermissions: await prisma.rolePermission.count(),
      userRoles: await prisma.userRole.count(),
      corporateDetails: await prisma.corporateDetail.count(),
      processTypes: await prisma.processType.count(),
      subPackages: await prisma.subPackage.count(),
      masterData: await prisma.masterData.count(),
      paymentModes: await prisma.paymentMode.count(),
      accountMenus: await prisma.accountMenu.count(),
    };

    const postTransactional = {
      leads: await prisma.lead.count(),
      registrations: await prisma.registration.count(),
      paymentUpdates: await prisma.paymentUpdate.count(),
      paymentInvoices: await prisma.paymentInvoice.count(),
      accountTransactions: await prisma.accountTransaction.count(),
      accountStatementEntries: await prisma.accountStatementEntry.count(),
      processAssignments: await prisma.processAssignment.count(),
      documentMovements: await prisma.documentMovement.count(),
      bundles: await prisma.bundle.count(),
      subPackageMovements: await prisma.subPackageMovement.count(),
      leaveRequests: await prisma.leaveRequest.count(),
      attendanceRecords: await prisma.attendanceRecord.count(),
      salaryPayrolls: await prisma.salaryPayroll.count(),
      notifications: await prisma.notification.count(),
    };

    // Verify integrity
    const anyOrphanedTransactional = Object.values(postTransactional).some((c) => c > 0);

    console.log("Development Database Reset");
    console.log("--------------------------");
    console.log(`Environment: ${nodeEnv}`);
    console.log(`Database: ${dbName}\n`);

    console.log("Preserved:");
    console.log(`  ✓ Users: ${postPreserved.users}`);
    console.log(`  ✓ Roles: ${postPreserved.roles}`);
    console.log(`  ✓ Permissions: ${postPreserved.permissions}`);
    console.log(`  ✓ Offices: ${postPreserved.offices}`);
    console.log(`  ✓ Departments: ${postPreserved.departments}`);
    console.log(`  ✓ Process Types: ${postPreserved.processTypes}`);
    console.log(`  ✓ Sub Packages: ${postPreserved.subPackages}`);
    console.log(`  ✓ Master Data: ${postPreserved.masterData}`);
    console.log(`  ✓ Corporate Details: ${postPreserved.corporateDetails}`);
    console.log(`  ✓ Payment Modes: ${postPreserved.paymentModes}`);
    console.log(`  ✓ Account Menus: ${postPreserved.accountMenus}\n`);

    console.log("Deleted:");
    console.log(`  ✓ Leads: ${preTransactional.leads - postTransactional.leads}`);
    console.log(`  ✓ Registrations: ${preTransactional.registrations - postTransactional.registrations}`);
    console.log(`  ✓ Process Assignments: ${preTransactional.processAssignments - postTransactional.processAssignments}`);
    console.log(`  ✓ Document Movements: ${preTransactional.documentMovements - postTransactional.documentMovements}`);
    console.log(`  ✓ Bundles: ${preTransactional.bundles - postTransactional.bundles}`);
    console.log(`  ✓ Sub Package Movements: ${preTransactional.subPackageMovements - postTransactional.subPackageMovements}`);
    console.log(`  ✓ Account Transactions: ${preTransactional.accountTransactions - postTransactional.accountTransactions}`);
    console.log(`  ✓ Account Statement Entries: ${preTransactional.accountStatementEntries - postTransactional.accountStatementEntries}`);
    console.log(`  ✓ HR Attendance & Payroll: ${(preTransactional.attendanceRecords + preTransactional.salaryPayrolls + preTransactional.leaveRequests) - (postTransactional.attendanceRecords + postTransactional.salaryPayrolls + postTransactional.leaveRequests)}`);
    console.log(`  ✓ Notifications: ${preTransactional.notifications - postTransactional.notifications}\n`);

    if (anyOrphanedTransactional) {
      console.warn("⚠️ Warning: Some transactional records still remain!");
    } else {
      console.log("🎉 Database reset completed successfully with zero orphaned records.");
    }
  } catch (error) {
    console.error("❌ Reset Operation Failed!");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
