import { PrismaClient, LeadStatus, FollowupStatus, WorkflowApprovalStatus } from "@prisma/client";
import { lockUsersWithMissedFollowups, clearLockCacheForUser, getUserLockState } from "../src/features/lead/server/followup-lock.service";
import { getOverdueFollowups, actionOverdueFollowup } from "../src/features/lead/server/workflow-approval.service";

const prisma = new PrismaClient();

async function main() {
  console.log("==================================================");
  console.log("STARTING OVERDUE FOLLOW-UP & ACCOUNT LOCK WORKFLOW TESTS");
  console.log("==================================================");

  const testOwnerAdmin = await prisma.user.findFirst({
    where: { role: { name: "Super Admin" } },
  });

  const ownerAdminId = testOwnerAdmin?.id || "test-owner-admin";

  const supervisorEmail = `test_sup_${Date.now()}@example.com`;
  const staffEmail = `test_staff_${Date.now()}@example.com`;
  const innocentStaffEmail = `test_innocent_${Date.now()}@example.com`;

  const supervisor = await prisma.user.create({
    data: {
      email: supervisorEmail,
      name: "Test Supervisor",
      ownerAdminId,
      isActive: true,
    },
  });

  const staff = await prisma.user.create({
    data: {
      email: staffEmail,
      name: "Test Staff User",
      ownerAdminId,
      supervisorUserId: supervisor.id,
      isActive: true,
    },
  });

  const innocentStaff = await prisma.user.create({
    data: {
      email: innocentStaffEmail,
      name: "Innocent Staff",
      ownerAdminId,
      supervisorUserId: supervisor.id,
      isActive: true,
    },
  });

  const pastDate1 = new Date();
  pastDate1.setDate(pastDate1.getDate() - 2);

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 5);

  // 1. Overdue Lead assigned to staff
  const overdueLead1 = await prisma.lead.create({
    data: {
      leadCode: `TEST-LEAD-1-${Date.now()}`,
      firstName: "John",
      lastName: "Doe",
      mobileNumber: "9999999991",
      email: "john1@example.com",
      country: "India",
      service: "Attestation",
      leadStatus: LeadStatus.Followup,
      followupStatus: FollowupStatus.Pending,
      followupCompleted: false,
      nextFollowupAt: pastDate1,
      assignedUserId: staff.id,
      assignedUser: "Test Staff User",
      createdById: staff.id,
      ownerAdminId,
    },
  });

  // 2. Future Lead assigned to innocent staff (should NOT lock and NOT appear in overdue)
  const futureLead = await prisma.lead.create({
    data: {
      leadCode: `TEST-LEAD-FUTURE-${Date.now()}`,
      firstName: "Future",
      lastName: "Client",
      mobileNumber: "9999999992",
      email: "future@example.com",
      country: "India",
      service: "Attestation",
      leadStatus: LeadStatus.Followup,
      followupStatus: FollowupStatus.Pending,
      followupCompleted: false,
      nextFollowupAt: futureDate,
      assignedUserId: innocentStaff.id,
      assignedUser: "Innocent Staff",
      createdById: innocentStaff.id,
      ownerAdminId,
    },
  });

  console.log("Created test records successfully.");

  try {
    // ----------------------------------------------------
    // TEST CASE 1: Overdue Detection & Account Locking
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 1: Overdue Detection & Account Locking ---");
    clearLockCacheForUser(staff.id, ownerAdminId);
    clearLockCacheForUser(innocentStaff.id, ownerAdminId);

    const lockedCount = await lockUsersWithMissedFollowups(ownerAdminId);
    console.log(`[Test 1] lockUsersWithMissedFollowups locked count: ${lockedCount}`);

    const staffAfterLock = await prisma.user.findUnique({
      where: { id: staff.id },
      select: { id: true, isLocked: true, lockReason: true, lockedFollowupLeadId: true },
    });
    console.log("[Test 1] Staff User status:", staffAfterLock);

    const innocentAfterLock = await prisma.user.findUnique({
      where: { id: innocentStaff.id },
      select: { id: true, isLocked: true },
    });
    console.log("[Test 1] Innocent Staff User status (should be false):", innocentAfterLock);

    if (!staffAfterLock?.isLocked) {
      throw new Error("TEST 1 FAILED: Staff user should be locked!");
    }
    if (innocentAfterLock?.isLocked) {
      throw new Error("TEST 1 FAILED: Innocent staff should NOT be locked!");
    }
    console.log("✓ TEST 1 PASSED: User correctly locked on overdue followup.");

    // ----------------------------------------------------
    // TEST CASE 2: Overdue Followup Appears in Pending Approval
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 2: Overdue Follow-up In Supervisor Queue ---");
    const queueItems = await getOverdueFollowups(ownerAdminId, supervisor.id);
    console.log(`[Test 2] Overdue follow-up queue count for supervisor: ${queueItems.length}`);

    const foundOverdue = queueItems.find((item) => item.id === overdueLead1.id);
    const foundFuture = queueItems.find((item) => item.id === futureLead.id);

    console.log("[Test 2] Overdue lead present in queue:", foundOverdue ? "YES" : "NO");
    console.log("[Test 2] Assigned user display name:", foundOverdue?.assignedUser);
    console.log("[Test 2] Future lead absent in queue:", !foundFuture ? "YES (Correct)" : "NO (Bug)");

    if (!foundOverdue) {
      throw new Error("TEST 2 FAILED: Overdue lead did not appear in supervisor Pending Approval queue!");
    }
    if (foundFuture) {
      throw new Error("TEST 2 FAILED: Future lead incorrectly appeared in overdue queue!");
    }
    console.log("✓ TEST 2 PASSED: Overdue follow-up successfully appeared in supervisor Pending Approval.");

    // ----------------------------------------------------
    // TEST CASE 3: Supervisor Resolution & User Unlock
    // ----------------------------------------------------
    console.log("\n--- TEST CASE 3: Supervisor Resolution & CRM Access Restored ---");
    await actionOverdueFollowup({
      leadId: overdueLead1.id,
      action: WorkflowApprovalStatus.Approved,
      performedBy: supervisor.id,
      remarks: "Supervisor unlocked and extended followup",
      ownerAdminId,
    });

    const staffAfterUnlock = await prisma.user.findUnique({
      where: { id: staff.id },
      select: {
        id: true,
        isLocked: true,
        unlockedAt: true,
        unlockedBy: true,
        unlockReason: true,
        lockedFollowupLeadId: true,
      },
    });
    console.log("[Test 3] Staff User status after supervisor unlock:", staffAfterUnlock);

    const lockStateInCache = await getUserLockState(staff.id);
    console.log("[Test 3] Staff Lock State after cache clearance:", lockStateInCache);

    if (staffAfterUnlock?.isLocked) {
      throw new Error("TEST 3 FAILED: Staff user should be unlocked (isLocked: false)!");
    }
    if (!staffAfterUnlock?.unlockedAt || staffAfterUnlock?.unlockedBy !== supervisor.id) {
      throw new Error("TEST 3 FAILED: Unlock metadata (unlockedAt/unlockedBy) was not set properly!");
    }

    // Check that lead is no longer in overdue queue
    const queueAfterUnlock = await getOverdueFollowups(ownerAdminId, supervisor.id);
    const foundAfterUnlock = queueAfterUnlock.find((item) => item.id === overdueLead1.id);
    console.log("[Test 3] Overdue lead removed from queue after action:", !foundAfterUnlock ? "YES" : "NO");

    if (foundAfterUnlock) {
      throw new Error("TEST 3 FAILED: Overdue lead should no longer appear in queue after supervisor action!");
    }

    console.log("✓ TEST 3 PASSED: Supervisor resolution restored CRM access (User.isLocked = false) and removed item from queue.");

    console.log("\n==================================================");
    console.log("ALL TEST CASES PASSED SUCCESSFULLY!");
    console.log("==================================================");

  } finally {
    // Cleanup
    await prisma.approvalAuditLog.deleteMany({ where: { leadId: { in: [overdueLead1.id, futureLead.id] } } }).catch(() => {});
    await prisma.leadWorkflowApproval.deleteMany({ where: { leadId: { in: [overdueLead1.id, futureLead.id] } } }).catch(() => {});
    await prisma.notification.deleteMany({ where: { userId: { in: [supervisor.id, staff.id, innocentStaff.id] } } }).catch(() => {});
    await prisma.lead.deleteMany({ where: { id: { in: [overdueLead1.id, futureLead.id] } } }).catch(() => {});
    await prisma.user.deleteMany({ where: { id: { in: [staff.id, innocentStaff.id, supervisor.id] } } }).catch(() => {});
    console.log("Cleaned up test data.");
  }
}

main()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
