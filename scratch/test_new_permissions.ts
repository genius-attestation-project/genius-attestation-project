import { prisma } from "../src/lib/prisma";
import {
  expandEffectivePermissions,
  getSessionAccess,
  hasPermission,
} from "../src/features/admin/server/rbac.service";
import { buildPermissionCatalog } from "../src/features/admin/data/rbac.data";
import {
  setUserPermissions,
  getUserPermissions,
  listUserAccessData,
} from "../src/features/admin/server/user-access.service";
import { createMovementApprovalRequest } from "../src/features/document-movement/server/movement-approval.service";
import {
  createEditRequest,
  listEditRequests,
  approveEditRequest,
  rejectEditRequest,
} from "../src/features/registration/server/registration-edit-request.service";

async function runTests() {
  console.log("=== STARTING RBAC & GRANULAR PERMISSIONS TEST SUITE ===");
  const results: { name: string; passed: boolean; details?: string }[] = [];

  function record(name: string, passed: boolean, details?: string) {
    results.push({ name, passed, details });
    console.log(`[${passed ? "PASS" : "FAIL"}] ${name}${details ? ` -> ${details}` : ""}`);
  }

  try {
    // 1. Check Catalog
    const catalog = buildPermissionCatalog();
    const catalogCodes = new Set(catalog.map((c) => c.code));

    record(
      "Catalog has revenue_registration.movement_request",
      catalogCodes.has("revenue_registration.movement_request"),
      "Found in permission catalog"
    );
    record(
      "Catalog has edit_request.view",
      catalogCodes.has("edit_request.view"),
      "Found in permission catalog"
    );
    record(
      "Catalog has edit_request.approve",
      catalogCodes.has("edit_request.approve"),
      "Found in permission catalog"
    );
    record(
      "Catalog has edit_request.reject",
      catalogCodes.has("edit_request.reject"),
      "Found in permission catalog"
    );

    // 2. Test expandEffectivePermissions
    const expMovReq = expandEffectivePermissions(["revenue_registration.movement_request"]);
    record(
      "expandEffectivePermissions(movement_request) includes view and menu",
      expMovReq.includes("revenue_registration.movement_request") &&
        expMovReq.includes("revenue_registration.view") &&
        expMovReq.includes("menu.revenue-registration"),
      `Expanded: ${JSON.stringify(expMovReq)}`
    );

    const expEditView = expandEffectivePermissions(["edit_request.view"]);
    record(
      "expandEffectivePermissions(edit_request.view) includes pending_approval.view and menu",
      expEditView.includes("edit_request.view") &&
        expEditView.includes("pending_approval.view") &&
        expEditView.includes("menu.lead-management.pending-approval"),
      `Expanded: ${JSON.stringify(expEditView)}`
    );

    const expEditApprove = expandEffectivePermissions(["edit_request.approve"]);
    record(
      "expandEffectivePermissions(edit_request.approve) auto-expands edit_request.view and pending_approval.edit",
      expEditApprove.includes("edit_request.approve") &&
        expEditApprove.includes("edit_request.view") &&
        expEditApprove.includes("pending_approval.view") &&
        expEditApprove.includes("pending_approval.edit") &&
        expEditApprove.includes("menu.lead-management.pending-approval"),
      `Expanded: ${JSON.stringify(expEditApprove)}`
    );

    const expEditReject = expandEffectivePermissions(["edit_request.reject"]);
    record(
      "expandEffectivePermissions(edit_request.reject) auto-expands edit_request.view and pending_approval.edit",
      expEditReject.includes("edit_request.reject") &&
        expEditReject.includes("edit_request.view") &&
        expEditReject.includes("pending_approval.view") &&
        expEditReject.includes("pending_approval.edit") &&
        expEditReject.includes("menu.lead-management.pending-approval"),
      `Expanded: ${JSON.stringify(expEditReject)}`
    );

    // 3. Setup Test User and Test Owner Admin
    const ownerAdmin = await prisma.user.findFirst({
      where: { role: { name: "Super Admin" } },
    });
    if (!ownerAdmin) {
      throw new Error("No Super Admin found in DB to run tests.");
    }

    const testUserEmail = "test.permissions.qa@geniusattestation.local";
    let testUser = await prisma.user.findUnique({
      where: { email: testUserEmail },
    });
    if (!testUser) {
      testUser = await prisma.user.create({
        data: {
          email: testUserEmail,
          name: "Permissions QA Tester",
          passwordHash: "dummy-hash",
          ownerAdminId: ownerAdmin.id,
          isActive: true,
        },
      });
    }

    // 4. Persistence Test: Save and load permissions for user
    await setUserPermissions(ownerAdmin.id, testUser.id, [
      "revenue_registration.movement_request",
      "edit_request.view",
    ]);

    const persistedPerms = await getUserPermissions(ownerAdmin.id, testUser.id);
    record(
      "UserPermission persistence stores exact keys",
      persistedPerms.includes("revenue_registration.movement_request") &&
        persistedPerms.includes("edit_request.view") &&
        !persistedPerms.includes("edit_request.approve"),
      `Persisted: ${JSON.stringify(persistedPerms)}`
    );

    const sessionAccess = await getSessionAccess(testUser.id);
    record(
      "getSessionAccess resolves and expands configured user permissions",
      Boolean(
        sessionAccess &&
          hasPermission(sessionAccess, "revenue_registration.movement_request") &&
          hasPermission(sessionAccess, "revenue_registration.view") &&
          hasPermission(sessionAccess, "edit_request.view") &&
          hasPermission(sessionAccess, "pending_approval.view") &&
          !hasPermission(sessionAccess, "edit_request.approve") &&
          !hasPermission(sessionAccess, "edit_request.reject")
      ),
      `Session permissions count: ${sessionAccess?.permissions?.length}`
    );

    // 5. Test Access Matrix endpoint data format
    const accessData = await listUserAccessData(ownerAdmin.id);
    const listedUser = accessData.users.find((u: any) => u.id === testUser.id);
    record(
      "listUserAccessData returns user with configured permissionKeys",
      Boolean(
        listedUser &&
          listedUser.permissionKeys.includes("revenue_registration.movement_request") &&
          listedUser.permissionKeys.includes("edit_request.view")
      ),
      `Listed user perm keys: ${JSON.stringify(listedUser?.permissionKeys)}`
    );

    // 6. Test Permission Combinations & Enforcement Scenarios:
    // Scenario A: User with No Permissions
    await setUserPermissions(ownerAdmin.id, testUser.id, []);
    const accessNone = await getSessionAccess(testUser.id);
    const canReqMovementA =
      hasPermission(accessNone, "revenue_registration.movement_request") ||
      hasPermission(accessNone, "movement_approval.create");
    const canViewEditA =
      hasPermission(accessNone, "edit_request.view") ||
      hasPermission(accessNone, "edit_request.approve") ||
      hasPermission(accessNone, "edit_request.reject");
    const canApproveEditA = hasPermission(accessNone, "edit_request.approve");
    const canRejectEditA = hasPermission(accessNone, "edit_request.reject");

    record(
      "Scenario A (No perms): Denies Movement Request (403)",
      !canReqMovementA,
      "canReqMovement = false"
    );
    record(
      "Scenario A (No perms): Denies Edit Request View (403)",
      !canViewEditA,
      "canViewEdit = false"
    );
    record(
      "Scenario A (No perms): Denies Edit Request Approve (403)",
      !canApproveEditA,
      "canApproveEdit = false"
    );
    record(
      "Scenario A (No perms): Denies Edit Request Reject (403)",
      !canRejectEditA,
      "canRejectEdit = false"
    );

    // Scenario B: User with revenue_registration.movement_request only
    await setUserPermissions(ownerAdmin.id, testUser.id, [
      "revenue_registration.movement_request",
    ]);
    const accessB = await getSessionAccess(testUser.id);
    const canReqMovementB =
      hasPermission(accessB, "revenue_registration.movement_request") ||
      hasPermission(accessB, "movement_approval.create");
    const canViewEditB =
      hasPermission(accessB, "edit_request.view") ||
      hasPermission(accessB, "edit_request.approve") ||
      hasPermission(accessB, "edit_request.reject");

    record(
      "Scenario B (Movement Request only): Allows Movement Request (200)",
      canReqMovementB,
      "canReqMovement = true"
    );
    record(
      "Scenario B (Movement Request only): Denies Edit Request View (403)",
      !canViewEditB,
      "canViewEdit = false"
    );

    // Scenario C: User with edit_request.view only
    await setUserPermissions(ownerAdmin.id, testUser.id, ["edit_request.view"]);
    const accessC = await getSessionAccess(testUser.id);
    const canViewEditC =
      hasPermission(accessC, "edit_request.view") ||
      hasPermission(accessC, "edit_request.approve") ||
      hasPermission(accessC, "edit_request.reject");
    const canApproveEditC = hasPermission(accessC, "edit_request.approve");
    const canRejectEditC = hasPermission(accessC, "edit_request.reject");

    record(
      "Scenario C (Edit Request View only): Allows View (200)",
      canViewEditC,
      "canViewEdit = true"
    );
    record(
      "Scenario C (Edit Request View only): Denies Approve (403)",
      !canApproveEditC,
      "canApproveEdit = false"
    );
    record(
      "Scenario C (Edit Request View only): Denies Reject (403)",
      !canRejectEditC,
      "canRejectEdit = false"
    );

    // Scenario D: User with edit_request.approve
    await setUserPermissions(ownerAdmin.id, testUser.id, ["edit_request.approve"]);
    const accessD = await getSessionAccess(testUser.id);
    const canViewEditD =
      hasPermission(accessD, "edit_request.view") ||
      hasPermission(accessD, "edit_request.approve") ||
      hasPermission(accessD, "edit_request.reject");
    const canApproveEditD = hasPermission(accessD, "edit_request.approve");
    const canRejectEditD = hasPermission(accessD, "edit_request.reject");

    record(
      "Scenario D (Edit Request Approve): Allows View (Auto-included 200)",
      canViewEditD,
      "canViewEdit = true"
    );
    record(
      "Scenario D (Edit Request Approve): Allows Approve (200)",
      canApproveEditD,
      "canApproveEdit = true"
    );
    record(
      "Scenario D (Edit Request Approve): Denies Reject (403)",
      !canRejectEditD,
      "canRejectEdit = false"
    );

    // Scenario E: User with edit_request.reject
    await setUserPermissions(ownerAdmin.id, testUser.id, ["edit_request.reject"]);
    const accessE = await getSessionAccess(testUser.id);
    const canViewEditE =
      hasPermission(accessE, "edit_request.view") ||
      hasPermission(accessE, "edit_request.approve") ||
      hasPermission(accessE, "edit_request.reject");
    const canApproveEditE = hasPermission(accessE, "edit_request.approve");
    const canRejectEditE = hasPermission(accessE, "edit_request.reject");

    record(
      "Scenario E (Edit Request Reject): Allows View (Auto-included 200)",
      canViewEditE,
      "canViewEdit = true"
    );
    record(
      "Scenario E (Edit Request Reject): Denies Approve (403)",
      !canApproveEditE,
      "canApproveEdit = false"
    );
    record(
      "Scenario E (Edit Request Reject): Allows Reject (200)",
      canRejectEditE,
      "canRejectEdit = true"
    );

    // Scenario F: Super Admin
    const superAdminAccess = await getSessionAccess(ownerAdmin.id);
    record(
      "Scenario F (Super Admin): Unrestricted Access to all actions",
      Boolean(
        superAdminAccess &&
          superAdminAccess.isSuperAdmin &&
          hasPermission(superAdminAccess, "revenue_registration.movement_request") &&
          hasPermission(superAdminAccess, "edit_request.view") &&
          hasPermission(superAdminAccess, "edit_request.approve") &&
          hasPermission(superAdminAccess, "edit_request.reject")
      ),
      "Super admin has full '*' access"
    );

    // Cleanup QA User
    await prisma.userPermission.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } });

    console.log("\n=== TEST SUMMARY ===");
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const failed = total - passed;
    console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Test execution failed with unhandled error:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
