import { prisma } from "../src/lib/prisma";
import {
  ensureAccountMenuBootstrap,
  getAccountTree,
  createAccountNode,
  updateAccountOfficeAssignments,
  getAssignedAccountTree,
} from "../src/features/account-menu/server/account-menu.service";

async function runRootVisibilityTests() {
  console.log("====================================================");
  console.log("ACCOUNT PANEL ROOT CATEGORY VISIBILITY TEST CASES");
  console.log("====================================================");

  const ownerAdminId = "96dd9c33-7608-11f1-b655-52dd4f552161"; // Test Dev owner ID

  // Get offices
  const kochi = await prisma.officeLocation.findFirst({
    where: { officeName: "Kochi HQ", ownerAdminId },
  });
  const calicut = await prisma.officeLocation.findFirst({
    where: { officeName: "Calicut Office", ownerAdminId },
  });

  if (!kochi || !calicut) {
    throw new Error("Offices not found for test.");
  }

  // Ensure bootstrap
  await ensureAccountMenuBootstrap(ownerAdminId);
  const fullTree = await getAccountTree(ownerAdminId);
  const debitRoot = fullTree.find((n) => n.name === "DEBIT");

  let electricity = debitRoot?.children?.find((n) => n.name === "Electricity");
  if (!electricity && debitRoot) {
    electricity = await createAccountNode(ownerAdminId, "system", "System", {
      name: "Electricity",
      parentId: debitRoot.id,
      category: "Sub Title",
    });
  }

  const updatedFullTree = await getAccountTree(ownerAdminId);
  const freshElec = updatedFullTree.find((n) => n.name === "DEBIT")?.children?.find((n) => n.name === "Electricity");
  let mobileRecharge = freshElec?.children?.find((n) => n.name === "Mobile Recharge");

  if (!mobileRecharge && freshElec) {
    mobileRecharge = await createAccountNode(ownerAdminId, "system", "System", {
      name: "Mobile Recharge",
      parentId: freshElec.id,
      category: "Leaf",
      code: "1001-MOB",
    });
  }

  // Reset ALL account office assignments for ownerAdminId before Test Case 1
  await prisma.accountOfficeAssignment.deleteMany({
    where: { ownerAdminId },
  });

  // ----------------------------------------------------
  // TEST CASE 1: No office assignments exist.
  // Expected: Account Panel shows CREDIT and DEBIT.
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 1: No office assignments exist ---");
  const tree1 = await getAssignedAccountTree(ownerAdminId, kochi.id);
  const rootNames1 = tree1.map((n) => n.name);
  const totalChildren1 = tree1.reduce((sum, n) => sum + (n.children?.length || 0), 0);

  console.log(`Root categories present: [${rootNames1.join(", ")}]`);
  console.log(`Total child nodes: ${totalChildren1}`);
  const pass1 = rootNames1.includes("CREDIT") && rootNames1.includes("DEBIT") && totalChildren1 === 0;
  console.log(`Test Case 1 Result: ${pass1 ? "PASS ✅" : "FAIL ❌"}`);

  // ----------------------------------------------------
  // TEST CASE 2: Assign one child account (Mobile Recharge) to Kochi HQ.
  // Expected: Kochi HQ user sees CREDIT, DEBIT + assigned child account.
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 2: Assign Mobile Recharge to Kochi HQ ---");
  await updateAccountOfficeAssignments(ownerAdminId, "system", "System", mobileRecharge!.id, [kochi.id]);

  const tree2 = await getAssignedAccountTree(ownerAdminId, kochi.id);
  const rootNames2 = tree2.map((n) => n.name);
  const debitNode2 = tree2.find((n) => n.name === "DEBIT");
  const hasMobile2 = JSON.stringify(debitNode2).includes("Mobile Recharge");

  console.log(`Root categories present: [${rootNames2.join(", ")}]`);
  console.log(`DEBIT contains Mobile Recharge: ${hasMobile2}`);
  const pass2 = rootNames2.includes("CREDIT") && rootNames2.includes("DEBIT") && hasMobile2;
  console.log(`Test Case 2 Result: ${pass2 ? "PASS ✅" : "FAIL ❌"}`);

  // ----------------------------------------------------
  // TEST CASE 3: Another office user (Calicut Office) opens Account Panel.
  // Expected: CREDIT and DEBIT only.
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 3: Calicut Office user opens Account Panel ---");
  const tree3 = await getAssignedAccountTree(ownerAdminId, calicut.id);
  const rootNames3 = tree3.map((n) => n.name);
  const calicutChildrenCount3 = tree3.reduce((sum, n) => sum + (n.children?.length || 0), 0);

  console.log(`Root categories present: [${rootNames3.join(", ")}]`);
  console.log(`Calicut child nodes count: ${calicutChildrenCount3}`);
  const pass3 = rootNames3.includes("CREDIT") && rootNames3.includes("DEBIT") && calicutChildrenCount3 === 0;
  console.log(`Test Case 3 Result: ${pass3 ? "PASS ✅" : "FAIL ❌"}`);

  // ----------------------------------------------------
  // TEST CASE 4: Assign multiple accounts to multiple offices.
  // Expected: Each office sees CREDIT, DEBIT + only its assigned children.
  // ----------------------------------------------------
  console.log("\n--- TEST CASE 4: Assign Mobile Recharge to both Kochi HQ and Calicut Office ---");
  await updateAccountOfficeAssignments(ownerAdminId, "system", "System", mobileRecharge!.id, [kochi.id, calicut.id]);

  const tree4Kochi = await getAssignedAccountTree(ownerAdminId, kochi.id);
  const tree4Calicut = await getAssignedAccountTree(ownerAdminId, calicut.id);

  const hasMobileKochi4 = JSON.stringify(tree4Kochi).includes("Mobile Recharge");
  const hasMobileCalicut4 = JSON.stringify(tree4Calicut).includes("Mobile Recharge");

  console.log(`Kochi sees CREDIT, DEBIT + Mobile Recharge: ${hasMobileKochi4}`);
  console.log(`Calicut sees CREDIT, DEBIT + Mobile Recharge: ${hasMobileCalicut4}`);

  const pass4 =
    tree4Kochi.map((n) => n.name).includes("CREDIT") &&
    tree4Kochi.map((n) => n.name).includes("DEBIT") &&
    hasMobileKochi4 &&
    hasMobileCalicut4;
  console.log(`Test Case 4 Result: ${pass4 ? "PASS ✅" : "FAIL ❌"}`);

  // Cleanup: Reset test assignment
  await updateAccountOfficeAssignments(ownerAdminId, "system", "System", mobileRecharge!.id, []);

  console.log("\n====================================================");
  console.log("ALL 4 ROOT CATEGORY VISIBILITY TESTS COMPLETED!");
  console.log("====================================================");
}

runRootVisibilityTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
