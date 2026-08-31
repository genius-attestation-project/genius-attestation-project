import { prisma } from "../src/lib/prisma";
import {
  ensureAccountMenuBootstrap,
  getAccountTree,
  createAccountNode,
  updateAccountOfficeAssignments,
  getAccountOfficeAssignments,
  getAssignedAccountTree,
} from "../src/features/account-menu/server/account-menu.service";

async function runTests() {
  console.log("==========================================");
  console.log("ACCOUNT MENU & PANEL VALIDATION TEST CASES");
  console.log("==========================================");

  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161"; // Test Dev owner ID

  // 1. Setup sample offices if not existing
  let malappuram = await prisma.officeLocation.findFirst({
    where: { officeName: "Malappuram Office", ownerAdminId },
  });
  if (!malappuram) {
    malappuram = await prisma.officeLocation.create({
      data: {
        officeName: "Malappuram Office",
        location: "India",
        timezone: "Asia/Kolkata",
        ownerAdminId,
      },
    });
  }

  let calicut = await prisma.officeLocation.findFirst({
    where: { officeName: "Calicut Office", ownerAdminId },
  });
  if (!calicut) {
    calicut = await prisma.officeLocation.create({
      data: {
        officeName: "Calicut Office",
        location: "India",
        timezone: "Asia/Kolkata",
        ownerAdminId,
      },
    });
  }

  console.log(`Malappuram Office ID: ${malappuram.id}`);
  console.log(`Calicut Office ID: ${calicut.id}`);

  // 2. Ensure bootstrap & fetch tree
  await ensureAccountMenuBootstrap(ownerAdminId);
  const tree = await getAccountTree(ownerAdminId);
  const debitRoot = tree.find((n) => n.name === "DEBIT");

  if (!debitRoot) {
    throw new Error("DEBIT root node not found!");
  }

  // Find or create Electricity sub-node
  let electricity = debitRoot.children?.find((n) => n.name === "Electricity");
  if (!electricity) {
    electricity = await createAccountNode(ownerAdminId, "system", "System", {
      name: "Electricity",
      parentId: debitRoot.id,
      category: "Sub Title",
    });
  }

  // Find or create Mobile Recharge leaf node
  const updatedTree = await getAccountTree(ownerAdminId);
  const freshElectricity = updatedTree.find((n) => n.name === "DEBIT")?.children?.find((n) => n.name === "Electricity");
  let mobileRecharge = freshElectricity?.children?.find((n) => n.name === "Mobile Recharge");

  if (!mobileRecharge) {
    mobileRecharge = await createAccountNode(ownerAdminId, "system", "System", {
      name: "Mobile Recharge",
      parentId: freshElectricity!.id,
      category: "Leaf",
      code: "1001-MOB",
    });
  }

  console.log(`Mobile Recharge Leaf Node ID: ${mobileRecharge.id}`);

  // TEST CASE 1: Admin assigns Mobile Recharge to Malappuram Office.
  console.log("\n--- TEST CASE 1: Assign Mobile Recharge to Malappuram Office ---");
  await updateAccountOfficeAssignments(ownerAdminId, "system", "System", mobileRecharge.id, [malappuram.id]);

  const malappuramTree1 = await getAssignedAccountTree(ownerAdminId, malappuram.id);
  const hasMobileInMalappuram1 = JSON.stringify(malappuramTree1).includes("Mobile Recharge");
  console.log(`Malappuram Account Panel shows Mobile Recharge: ${hasMobileInMalappuram1 ? "PASS ✅" : "FAIL ❌"}`);

  // TEST CASE 2: Admin assigns Mobile Recharge to Calicut Office ONLY.
  console.log("\n--- TEST CASE 2: Assign Mobile Recharge to Calicut Office Only ---");
  await updateAccountOfficeAssignments(ownerAdminId, "system", "System", mobileRecharge.id, [calicut.id]);

  const calicutTree2 = await getAssignedAccountTree(ownerAdminId, calicut.id);
  const malappuramTree2 = await getAssignedAccountTree(ownerAdminId, malappuram.id);
  const hasMobileInCalicut2 = JSON.stringify(calicutTree2).includes("Mobile Recharge");
  const hasMobileInMalappuram2 = JSON.stringify(malappuramTree2).includes("Mobile Recharge");
  console.log(`Calicut sees Mobile Recharge: ${hasMobileInCalicut2 ? "PASS ✅" : "FAIL ❌"}`);
  console.log(`Malappuram does NOT see Mobile Recharge: ${!hasMobileInMalappuram2 ? "PASS ✅" : "FAIL ❌"}`);

  // TEST CASE 3: Create new account node.
  console.log("\n--- TEST CASE 3: Create new account node ---");
  const petrolNode = await createAccountNode(ownerAdminId, "system", "System", {
    name: `Test Petrol ${Date.now()}`,
    parentId: freshElectricity!.id,
    category: "Leaf",
  });
  console.log(`Created new account node "${petrolNode.name}": PASS ✅`);

  // TEST CASE 4: Assign one account to multiple offices.
  console.log("\n--- TEST CASE 4: Assign Mobile Recharge to Multiple Offices (Malappuram + Calicut) ---");
  await updateAccountOfficeAssignments(ownerAdminId, "system", "System", mobileRecharge.id, [malappuram.id, calicut.id]);
  const calicutTree4 = await getAssignedAccountTree(ownerAdminId, calicut.id);
  const malappuramTree4 = await getAssignedAccountTree(ownerAdminId, malappuram.id);
  const hasMobileCalicut4 = JSON.stringify(calicutTree4).includes("Mobile Recharge");
  const hasMobileMalappuram4 = JSON.stringify(malappuramTree4).includes("Mobile Recharge");
  console.log(`Malappuram sees it: ${hasMobileMalappuram4 ? "PASS ✅" : "FAIL ❌"}`);
  console.log(`Calicut sees it: ${hasMobileCalicut4 ? "PASS ✅" : "FAIL ❌"}`);

  // TEST CASE 5: Remove office assignment.
  console.log("\n--- TEST CASE 5: Remove office assignment ---");
  await updateAccountOfficeAssignments(ownerAdminId, "system", "System", mobileRecharge.id, []);
  const malappuramTree5 = await getAssignedAccountTree(ownerAdminId, malappuram.id);
  const hasMobileMalappuram5 = JSON.stringify(malappuramTree5).includes("Mobile Recharge");
  console.log(`Account disappears from office Account Panel: ${!hasMobileMalappuram5 ? "PASS ✅" : "FAIL ❌"}`);

  console.log("\n==========================================");
  console.log("ALL 5 VALIDATION TEST CASES COMPLETED!");
  console.log("==========================================");
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
