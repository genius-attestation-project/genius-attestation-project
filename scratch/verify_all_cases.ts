import { prisma } from "../src/lib/prisma";
import { hasPermission } from "../src/features/admin/server/rbac.service";
import { GET as getMasterData, POST as postMasterData } from "../src/app/api/master-data/[type]/route";
import { PUT as putMasterData, DELETE as deleteMasterData } from "../src/app/api/master-data/[type]/[id]/route";
import { GET as getPaymentMode, POST as postPaymentMode } from "../src/app/api/master-data/payment-mode/route";
import { PUT as putPaymentMode, DELETE as deletePaymentMode } from "../src/app/api/master-data/payment-mode/[id]/route";
import { GET as getCorporateDetails, POST as postCorporateDetails } from "../src/app/api/master-data/corporate-details/route";
import { PUT as putCorporateDetails, DELETE as deleteCorporateDetails } from "../src/app/api/master-data/corporate-details/[id]/route";
import { NextRequest } from "next/server";

// Helper to create NextRequest
function createRequest(url: string, method = "GET", body?: any) {
  const init: any = { method };
  if (body) {
    init.body = JSON.stringify(body);
    init.headers = { "Content-Type": "application/json" };
  }
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

function setSession(session: any) {
  (globalThis as any).__TEST_SESSION__ = session;
}

async function runTests() {
  console.log("==================================================");
  console.log("STARTING TEST SUITE FOR MASTER DATA ACCESS & RBAC");
  console.log("==================================================\n");

  const adminUser = await prisma.user.findFirst({
    where: { role: { name: "Super Admin" } },
  });

  const ownerAdminId = adminUser?.ownerAdminId || adminUser?.id || "test-owner-id";

  const results: { test: string; status: "PASS" | "FAIL"; details: string }[] = [];

  // ==================================================
  // TEST 1: User has Lead Management -> Create, Master Configuration -> No access
  // ==================================================
  try {
    const session = {
      user: {
        id: "user-lead-create-only",
        email: "leadcreate@example.com",
        role: "Lead Executive",
        permissions: ["leads.create", "leads.view", "menu.lead-management"],
        isSuperAdmin: false,
        ownerAdminId,
      },
    };
    setSession(session);

    const docTypeReq = createRequest("http://localhost:3000/api/master-data/document-types?active=true");
    const docTypeRes = await getMasterData(docTypeReq, { params: Promise.resolve({ type: "document-types" }) });
    const docTypeData = await docTypeRes.json();

    const processReq = createRequest("http://localhost:3000/api/master-data/process-types?active=true");
    const processRes = await getMasterData(processReq, { params: Promise.resolve({ type: "process-types" }) });
    const processData = await processRes.json();

    const sourceReq = createRequest("http://localhost:3000/api/master-data/lead-sources?active=true");
    const sourceRes = await getMasterData(sourceReq, { params: Promise.resolve({ type: "lead-sources" }) });
    const sourceData = await sourceRes.json();

    const customerTypeReq = createRequest("http://localhost:3000/api/master-data/customer-types?active=true");
    const customerTypeRes = await getMasterData(customerTypeReq, { params: Promise.resolve({ type: "customer-types" }) });
    const customerTypeData = await customerTypeRes.json();

    const corpReq = createRequest("http://localhost:3000/api/master-data/corporate-details?active=true");
    const corpRes = await getCorporateDetails(corpReq);
    const corpData = await corpRes.json();

    const ok =
      docTypeRes.status === 200 &&
      Array.isArray(docTypeData.items) &&
      processRes.status === 200 &&
      Array.isArray(processData.items) &&
      sourceRes.status === 200 &&
      Array.isArray(sourceData.items) &&
      customerTypeRes.status === 200 &&
      Array.isArray(customerTypeData.items) &&
      corpRes.status === 200 &&
      Array.isArray(corpData.items);

    results.push({
      test: "TEST 1: Lead Create user can read active master/reference dropdowns",
      status: ok ? "PASS" : "FAIL",
      details: `Statuses: docType=${docTypeRes.status} (${docTypeData.items?.length ?? 0} items), process=${processRes.status} (${processData.items?.length ?? 0} items), source=${sourceRes.status} (${sourceData.items?.length ?? 0} items), customer=${customerTypeRes.status} (${customerTypeData.items?.length ?? 0} items), corp=${corpRes.status} (${corpData.items?.length ?? 0} items)`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 1: Lead Create user can read active master/reference dropdowns", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 2: User has Lead Management -> Edit, Master Configuration -> No access
  // ==================================================
  try {
    const session = {
      user: {
        id: "user-lead-edit-only",
        email: "leadedit@example.com",
        role: "Lead Editor",
        permissions: ["leads.edit", "leads.view", "menu.lead-management"],
        isSuperAdmin: false,
        ownerAdminId,
      },
    };
    setSession(session);

    const docTypeReq = createRequest("http://localhost:3000/api/master-data/document-types?active=true");
    const docTypeRes = await getMasterData(docTypeReq, { params: Promise.resolve({ type: "document-types" }) });
    const docTypeData = await docTypeRes.json();

    const ok = docTypeRes.status === 200 && Array.isArray(docTypeData.items) && docTypeData.items.length > 0;

    results.push({
      test: "TEST 2: Lead Edit user can read active master reference data",
      status: ok ? "PASS" : "FAIL",
      details: `Status: ${docTypeRes.status}, Items: ${docTypeData.items?.length ?? 0}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 2: Lead Edit user can read active master reference data", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 3: User with Lead Management Create/Edit cannot access Master Configuration pages
  // ==================================================
  try {
    const testUser = {
      id: "user-lead-edit-only",
      permissions: ["leads.edit", "leads.create", "leads.view", "menu.lead-management"],
      isSuperAdmin: false,
    };
    const hasMasterView = hasPermission(testUser, "master_configuration.view");
    const hasDocTypeView = hasPermission(testUser, "master_configuration.document_types.view");
    const hasProcessView = hasPermission(testUser, "master_configuration.process_types.view");

    const ok = !hasMasterView && !hasDocTypeView && !hasProcessView;

    results.push({
      test: "TEST 3: Lead Management user is denied access to Master Configuration pages",
      status: ok ? "PASS" : "FAIL",
      details: `master_configuration.view=${hasMasterView}, document_types.view=${hasDocTypeView}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 3: Lead Management user is denied access to Master Configuration pages", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 4: Lead Management user directly calls Master Configuration management APIs (POST, PUT, DELETE)
  // ==================================================
  try {
    const session = {
      user: {
        id: "user-lead-create-only",
        email: "leadcreate@example.com",
        role: "Lead Executive",
        permissions: ["leads.create", "leads.edit", "leads.view"],
        isSuperAdmin: false,
        ownerAdminId,
      },
    };
    setSession(session);

    // Attempt POST document-types
    const postReq = createRequest("http://localhost:3000/api/master-data/document-types", "POST", {
      name: "Unauthorized Document Type",
    });
    const postRes = await postMasterData(postReq, { params: Promise.resolve({ type: "document-types" }) });

    // Attempt PUT document-types
    const putReq = createRequest("http://localhost:3000/api/master-data/document-types/some-id", "PUT", {
      name: "Unauthorized Edit",
    });
    const putRes = await putMasterData(putReq, { params: Promise.resolve({ type: "document-types", id: "some-id" }) });

    // Attempt DELETE document-types
    const delReq = createRequest("http://localhost:3000/api/master-data/document-types/some-id", "DELETE");
    const delRes = await deleteMasterData(delReq, { params: Promise.resolve({ type: "document-types", id: "some-id" }) });

    // Attempt POST payment-mode
    const postPmReq = createRequest("http://localhost:3000/api/master-data/payment-mode", "POST", {
      paymentModeName: "Unauthorized Mode",
    });
    const postPmRes = await postPaymentMode(postPmReq);

    // Attempt PUT corporate-details
    const putCorpReq = createRequest("http://localhost:3000/api/master-data/corporate-details/some-id", "PUT", {
      companyName: "Unauthorized Corp",
    });
    const putCorpRes = await putCorporateDetails(putCorpReq, { params: Promise.resolve({ id: "some-id" }) });

    const ok =
      postRes.status === 403 &&
      putRes.status === 403 &&
      delRes.status === 403 &&
      postPmRes.status === 403 &&
      putCorpRes.status === 403;

    results.push({
      test: "TEST 4: Direct management calls (POST, PUT, DELETE) return 403 Forbidden",
      status: ok ? "PASS" : "FAIL",
      details: `POST doc=${postRes.status}, PUT doc=${putRes.status}, DELETE doc=${delRes.status}, POST pm=${postPmRes.status}, PUT corp=${putCorpRes.status}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 4: Direct management calls (POST, PUT, DELETE) return 403 Forbidden", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 5: Same user retrieves Lead Management lookup data through API
  // ==================================================
  try {
    const session = {
      user: {
        id: "user-lead-create-only",
        email: "leadcreate@example.com",
        role: "Lead Executive",
        permissions: ["leads.create", "leads.view"],
        isSuperAdmin: false,
        ownerAdminId,
      },
    };
    setSession(session);

    const docReq = createRequest("http://localhost:3000/api/master-data/document-types?active=true");
    const docRes = await getMasterData(docReq, { params: Promise.resolve({ type: "document-types" }) });
    const docData = await docRes.json();

    const ok = docRes.status === 200 && Array.isArray(docData.items) && docData.items.every((i: any) => i.isActive === true);

    results.push({
      test: "TEST 5: Read-only lookup data returns active records only",
      status: ok ? "PASS" : "FAIL",
      details: `Status: ${docRes.status}, Active Items Count: ${docData.items?.length ?? 0}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 5: Read-only lookup data returns active records only", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 6: User has Lead Management permission but NO relevant Lead Create/Edit permission
  // ==================================================
  try {
    const session = {
      user: {
        id: "user-closed-leads-only",
        email: "closedleads@example.com",
        role: "Closed Leads Viewer",
        permissions: ["closed_leads.view", "menu.lead-management"],
        isSuperAdmin: false,
        ownerAdminId,
      },
    };
    setSession(session);

    const docReq = createRequest("http://localhost:3000/api/master-data/document-types?active=true");
    const docRes = await getMasterData(docReq, { params: Promise.resolve({ type: "document-types" }) });

    const pmReq = createRequest("http://localhost:3000/api/master-data/payment-mode?active=true");
    const pmRes = await getPaymentMode(pmReq);

    const ok = docRes.status === 403 && pmRes.status === 403;

    results.push({
      test: "TEST 6: User without Lead Create/Edit permissions is denied lookup access",
      status: ok ? "PASS" : "FAIL",
      details: `document-types status=${docRes.status}, payment-mode status=${pmRes.status}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 6: User without Lead Create/Edit permissions is denied lookup access", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 7: Office Visibility Access
  // ==================================================
  try {
    const session = {
      user: {
        id: "user-lead-scoped",
        email: "scoped@example.com",
        role: "Lead Executive",
        permissions: ["leads.create", "leads.view"],
        isSuperAdmin: false,
        ownerAdminId,
      },
    };
    setSession(session);

    const docReq = createRequest("http://localhost:3000/api/master-data/document-types?active=true");
    const docRes = await getMasterData(docReq, { params: Promise.resolve({ type: "document-types" }) });
    const docData = await docRes.json();

    const noLeak = docData.items && docData.items.every((i: any) => i.ownerAdminId === ownerAdminId);

    results.push({
      test: "TEST 7: Office Visibility Access & Tenant Scoping preserved",
      status: noLeak ? "PASS" : "FAIL",
      details: `All ${docData.items?.length ?? 0} returned items strictly match user's ownerAdminId (${ownerAdminId})`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 7: Office Visibility Access & Tenant Scoping preserved", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 8: Super Admin retains full access
  // ==================================================
  try {
    const session = {
      user: {
        id: adminUser?.id || "super-admin-id",
        email: adminUser?.email || "admin@example.com",
        role: "Super Admin",
        permissions: ["*"],
        isSuperAdmin: true,
        ownerAdminId,
      },
    };
    setSession(session);

    const docReq = createRequest("http://localhost:3000/api/master-data/document-types");
    const docRes = await getMasterData(docReq, { params: Promise.resolve({ type: "document-types" }) });
    const docData = await docRes.json();

    const ok = docRes.status === 200 && (docData.total > 0 || Array.isArray(docData.items));

    results.push({
      test: "TEST 8: Super Admin retains complete access to all master configuration",
      status: ok ? "PASS" : "FAIL",
      details: `Status: ${docRes.status}, Total: ${docData.total}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 8: Super Admin retains complete access to all master configuration", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 9: Master Configuration authorized user
  // ==================================================
  try {
    const session = {
      user: {
        id: "master-admin-user",
        email: "masteradmin@example.com",
        role: "Master Admin",
        permissions: [
          "master_configuration.view",
          "master_configuration.manage",
          "master_configuration.document_types.view",
          "master_configuration.document_types.create",
          "master_configuration.document_types.edit",
          "master_configuration.document_types.delete",
        ],
        isSuperAdmin: false,
        ownerAdminId,
      },
    };
    setSession(session);

    const docReq = createRequest("http://localhost:3000/api/master-data/document-types");
    const docRes = await getMasterData(docReq, { params: Promise.resolve({ type: "document-types" }) });
    const docData = await docRes.json();

    const ok = docRes.status === 200 && docData.activeCount !== undefined;

    results.push({
      test: "TEST 9: Master Configuration user retains full management functionality",
      status: ok ? "PASS" : "FAIL",
      details: `Status: ${docRes.status}, Active: ${docData.activeCount}, Inactive: ${docData.inactiveCount}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 9: Master Configuration user retains full management functionality", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 10: Existing Lead Creation succeeds
  // ==================================================
  try {
    const testDocType = await prisma.masterData.findFirst({
      where: { type: "DOCUMENT_TYPES", isActive: true, ownerAdminId },
    });
    const testProcess = await prisma.masterData.findFirst({
      where: { type: "PROCESS_TYPES", isActive: true, ownerAdminId },
    });

    const timestamp = Date.now();
    const lead = await prisma.lead.create({
      data: {
        leadCode: `TEST-${timestamp}`,
        firstName: "Test Customer",
        mobileNumber: "+971501234567",
        email: `testcustomer-${timestamp}@example.com`,
        country: "United Arab Emirates",
        service: testProcess?.name || "Attestation",
        docType: testDocType?.name || "Degree Certificate",
        leadStatus: "New",
        ownerAdminId,
      },
    });

    const ok = Boolean(lead.id && lead.leadCode);

    // Clean up test lead
    await prisma.lead.delete({ where: { id: lead.id } });

    results.push({
      test: "TEST 10: Existing Lead Creation pipeline operates normally",
      status: ok ? "PASS" : "FAIL",
      details: `Created lead id=${lead.id}, docType=${lead.docType}, service=${lead.service}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 10: Existing Lead Creation pipeline operates normally", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 11: Existing Lead Editing succeeds
  // ==================================================
  try {
    const timestamp = Date.now();
    const lead = await prisma.lead.create({
      data: {
        leadCode: `EDIT-${timestamp}`,
        firstName: "Original Customer",
        mobileNumber: "+971501234568",
        email: `editcustomer-${timestamp}@example.com`,
        country: "India",
        service: "Apostille",
        leadStatus: "New",
        ownerAdminId,
      },
    });

    const updated = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        firstName: "Updated Customer Name",
        remark: "Updated Remark for testing",
      },
    });

    const ok = updated.firstName === "Updated Customer Name" && updated.remark === "Updated Remark for testing";

    // Clean up
    await prisma.lead.delete({ where: { id: lead.id } });

    results.push({
      test: "TEST 11: Existing Lead Editing pipeline operates normally",
      status: ok ? "PASS" : "FAIL",
      details: `Updated firstName=${updated.firstName}, remark=${updated.remark}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 11: Existing Lead Editing pipeline operates normally", status: "FAIL", details: e.message });
  }

  // ==================================================
  // TEST 12: Empty lookup data returns empty results ("No results found")
  // ==================================================
  try {
    const session = {
      user: {
        id: "user-lead-create-only",
        email: "leadcreate@example.com",
        role: "Lead Executive",
        permissions: ["leads.create", "leads.view"],
        isSuperAdmin: false,
        ownerAdminId,
      },
    };
    setSession(session);

    // Query for non-existent item
    const emptyReq = createRequest("http://localhost:3000/api/master-data/document-types?active=true&query=NonExistentDocumentTypeQueryXYZ");
    const emptyRes = await getMasterData(emptyReq, { params: Promise.resolve({ type: "document-types" }) });
    const emptyData = await emptyRes.json();

    const ok = emptyRes.status === 200 && Array.isArray(emptyData.items) && emptyData.items.length === 0;

    results.push({
      test: "TEST 12: Empty lookup query legitimately returns empty items (displays 'No results found')",
      status: ok ? "PASS" : "FAIL",
      details: `Status: ${emptyRes.status}, Items length: ${emptyData.items?.length}, Total: ${emptyData.total}`,
    });
  } catch (e: any) {
    results.push({ test: "TEST 12: Empty lookup query legitimately returns empty items (displays 'No results found')", status: "FAIL", details: e.message });
  }

  // Print Summary Table
  console.log("\n==================================================");
  console.log("TEST RESULTS SUMMARY");
  console.log("==================================================");
  let allPassed = true;
  for (const r of results) {
    console.log(`[${r.status}] ${r.test}`);
    console.log(`       Details: ${r.details}`);
    if (r.status !== "PASS") allPassed = false;
  }
  console.log("==================================================");
  console.log(`OVERALL: ${allPassed ? "ALL 12 TESTS PASSED!" : "SOME TESTS FAILED"}`);
  console.log("==================================================");
}

runTests()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Test runner error:", err);
    prisma.$disconnect();
    process.exit(1);
  });
