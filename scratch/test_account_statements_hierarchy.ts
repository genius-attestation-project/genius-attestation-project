import { prisma } from "../src/lib/prisma";
import { ensureAccountMenuBootstrap } from "../src/features/account-menu/server/account-menu.service";
import { getAccountStatements } from "../src/features/account-statements/server/account-statements.service";

async function runHierarchyTests() {
  console.log("====================================================");
  console.log("TESTING ACCOUNT STATEMENTS HIERARCHY DISPLAY MAPPING");
  console.log("====================================================");

  // 1. Get test owner
  const admin = await prisma.user.findFirst({
    where: { isActive: true },
  });

  if (!admin) {
    throw new Error("No active user found for test.");
  }

  const ownerAdminId = admin.ownerAdminId || admin.id;

  // 2. Ensure office location exists
  let office = await prisma.officeLocation.findFirst({
    where: { ownerAdminId },
  });

  if (!office) {
    office = await prisma.officeLocation.create({
      data: {
        officeName: "Test Main Office",
        location: "India",
        timezone: "Asia/Kolkata",
        ownerAdminId,
      },
    });
  }

  const officeName = office.officeName;
  const officeId = office.id;

  console.log(`Using ownerAdminId: ${ownerAdminId}, Office: ${officeName} (${officeId})`);

  // 3. Ensure Bootstrap
  await ensureAccountMenuBootstrap(ownerAdminId);

  const creditRoot = await prisma.accountMenu.findFirst({
    where: { name: "CREDIT", parentId: null, ownerAdminId },
  });
  const debitRoot = await prisma.accountMenu.findFirst({
    where: { name: "DEBIT", parentId: null, ownerAdminId },
  });

  if (!creditRoot || !debitRoot) {
    throw new Error("CREDIT or DEBIT root node missing!");
  }

  // Helper to find or create account node
  async function findOrCreateNode(name: string, parentId: string, category: string, type: string) {
    let node = await prisma.accountMenu.findFirst({
      where: { name, parentId, ownerAdminId },
    });
    if (!node) {
      node = await prisma.accountMenu.create({
        data: {
          name,
          parentId,
          category,
          type,
          ownerAdminId,
          createdBy: admin?.id,
          createdByName: admin?.name || "Admin",
          status: true,
        },
      });
    }
    return node;
  }

  // --- SET UP TEST CASE 1: CASH -> India -> Genius Thrissur (Credit) ---
  console.log("\nSetting up Test Case 1: CASH -> India -> Genius Thrissur (Credit)...");
  const cashNode = await findOrCreateNode("CASH", creditRoot.id, "Main Title", "CREDIT");
  const indiaNode = await findOrCreateNode("India", cashNode.id, "Sub Title", "CREDIT");
  const geniusThrissur = await findOrCreateNode("Genius Thrissur", indiaNode.id, "Leaf", "CREDIT");

  // Assign to office
  await prisma.accountOfficeAssignment.upsert({
    where: { accountNodeId_officeId: { accountNodeId: geniusThrissur.id, officeId } },
    create: { accountNodeId: geniusThrissur.id, officeId, ownerAdminId },
    update: {},
  });

  // --- SET UP TEST CASE 2: Electricity -> Mobile Recharge (Debit) ---
  console.log("Setting up Test Case 2: Electricity -> Mobile Recharge (Debit)...");
  const electricityNode = await findOrCreateNode("Electricity", debitRoot.id, "Main Title", "DEBIT");
  const mobileRecharge = await findOrCreateNode("Mobile Recharge", electricityNode.id, "Leaf", "DEBIT");

  await prisma.accountOfficeAssignment.upsert({
    where: { accountNodeId_officeId: { accountNodeId: mobileRecharge.id, officeId } },
    create: { accountNodeId: mobileRecharge.id, officeId, ownerAdminId },
    update: {},
  });

  // --- SET UP TEST CASE 3: BANK -> HDFC -> HDFC Palarivattom (Credit) ---
  console.log("Setting up Test Case 3: BANK -> HDFC -> HDFC Palarivattom (Credit)...");
  const bankNode = await findOrCreateNode("BANK", creditRoot.id, "Main Title", "CREDIT");
  const hdfcNode = await findOrCreateNode("HDFC", bankNode.id, "Sub Title", "CREDIT");
  const hdfcPalarivattom = await findOrCreateNode("HDFC Palarivattom", hdfcNode.id, "Leaf", "CREDIT");

  await prisma.accountOfficeAssignment.upsert({
    where: { accountNodeId_officeId: { accountNodeId: hdfcPalarivattom.id, officeId } },
    create: { accountNodeId: hdfcPalarivattom.id, officeId, ownerAdminId },
    update: {},
  });

  // Clean old test transactions for these test accounts on test date
  const testDate = new Date("2026-09-25T10:00:00.000Z");
  await prisma.accountPanelTransaction.deleteMany({
    where: {
      accountId: { in: [geniusThrissur.id, mobileRecharge.id, hdfcPalarivattom.id] },
      transactionDate: testDate,
    },
  });

  // Create Transactions
  console.log("\nCreating test transactions...");
  const tx1 = await prisma.accountPanelTransaction.create({
    data: {
      accountId: geniusThrissur.id,
      amount: 500,
      invoiceNumber: "INV-CASH-001",
      transactionDate: testDate,
      narration: "Cash receipt at Thrissur branch",
      officeId,
      ownerAdminId,
      createdBy: admin?.id,
      createdByName: admin?.name || "Admin",
    },
  });

  const tx2 = await prisma.accountPanelTransaction.create({
    data: {
      accountId: mobileRecharge.id,
      amount: 200,
      invoiceNumber: "INV-DEB-002",
      transactionDate: testDate,
      narration: "Office mobile recharge expense",
      officeId,
      ownerAdminId,
      createdBy: admin?.id,
      createdByName: admin?.name || "Admin",
    },
  });

  const tx3 = await prisma.accountPanelTransaction.create({
    data: {
      accountId: hdfcPalarivattom.id,
      amount: 500,
      invoiceNumber: "INV-BANK-003",
      transactionDate: testDate,
      narration: "Client deposit in HDFC Palarivattom",
      officeId,
      ownerAdminId,
      createdBy: admin?.id,
      createdByName: admin?.name || "Admin",
    },
  });

  console.log(`Created test transactions: tx1=${tx1.id}, tx2=${tx2.id}, tx3=${tx3.id}`);

  // Fetch Account Statements
  console.log("\nCalling getAccountStatements()...");
  const statements = await getAccountStatements(
    ownerAdminId,
    {
      office: officeName,
      fromDate: "2026-09-25",
      toDate: "2026-09-25",
      transactionType: "ALL",
    },
    { isSuperAdmin: true }
  );

  console.log("\n====================================================");
  console.log("VERIFYING RESULTS:");
  console.log("====================================================");

  // Verify Test Case 1: Credit CASH -> India -> Genius Thrissur
  const tc1Group = statements.credit.groups?.find(
    (g) => g.accountHierarchy?.join(" -> ") === "CASH -> India -> Genius Thrissur"
  );
  console.log("\n[TEST CASE 1] CASH -> India -> Genius Thrissur:");
  console.log("  Found Group:", Boolean(tc1Group));
  console.log("  Hierarchy:", tc1Group?.accountHierarchy);
  console.log("  Subtotal:", tc1Group?.subTotal, "(Expected: 500)");
  console.log("  Item Account Name:", tc1Group?.items[0]?.accountName);
  console.log("  Item Hierarchy:", tc1Group?.items[0]?.accountHierarchy);
  const tc1Pass =
    Boolean(tc1Group) &&
    JSON.stringify(tc1Group?.accountHierarchy) === JSON.stringify(["CASH", "India", "Genius Thrissur"]) &&
    tc1Group?.subTotal === 500;
  console.log(`  Result: ${tc1Pass ? "PASS ✅" : "FAIL ❌"}`);

  // Verify Test Case 2: Debit Electricity -> Mobile Recharge
  const tc2Group = statements.debit.groups.find(
    (g) => g.accountHierarchy?.join(" -> ") === "Electricity -> Mobile Recharge"
  );
  console.log("\n[TEST CASE 2] Electricity -> Mobile Recharge:");
  console.log("  Found Group:", Boolean(tc2Group));
  console.log("  Hierarchy:", tc2Group?.accountHierarchy);
  console.log("  Subtotal:", tc2Group?.subTotal, "(Expected: 200)");
  console.log("  Item Account Name:", tc2Group?.items[0]?.accountName);
  console.log("  Item Hierarchy:", tc2Group?.items[0]?.accountHierarchy);
  const tc2Pass =
    Boolean(tc2Group) &&
    JSON.stringify(tc2Group?.accountHierarchy) === JSON.stringify(["Electricity", "Mobile Recharge"]) &&
    tc2Group?.subTotal === 200;
  console.log(`  Result: ${tc2Pass ? "PASS ✅" : "FAIL ❌"}`);

  // Verify Test Case 3: Credit BANK -> HDFC -> HDFC Palarivattom
  const tc3Group = statements.credit.groups?.find(
    (g) => g.accountHierarchy?.join(" -> ") === "BANK -> HDFC -> HDFC Palarivattom"
  );
  console.log("\n[TEST CASE 3] BANK -> HDFC -> HDFC Palarivattom:");
  console.log("  Found Group:", Boolean(tc3Group));
  console.log("  Hierarchy:", tc3Group?.accountHierarchy);
  console.log("  Subtotal:", tc3Group?.subTotal, "(Expected: 500)");
  console.log("  Item Account Name:", tc3Group?.items[0]?.accountName);
  console.log("  Item Hierarchy:", tc3Group?.items[0]?.accountHierarchy);
  const tc3Pass =
    Boolean(tc3Group) &&
    JSON.stringify(tc3Group?.accountHierarchy) === JSON.stringify(["BANK", "HDFC", "HDFC Palarivattom"]) &&
    tc3Group?.subTotal === 500;
  console.log(`  Result: ${tc3Pass ? "PASS ✅" : "FAIL ❌"}`);

  // Clean up test transactions
  await prisma.accountPanelTransaction.deleteMany({
    where: { id: { in: [tx1.id, tx2.id, tx3.id] } },
  });

  const allPassed = tc1Pass && tc2Pass && tc3Pass;
  console.log("\n====================================================");
  console.log(`OVERALL TEST RESULT: ${allPassed ? "ALL 3 TEST CASES PASSED! ✅" : "SOME TESTS FAILED! ❌"}`);
  console.log("====================================================");

  if (!allPassed) {
    process.exit(1);
  }
}

runHierarchyTests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  });
