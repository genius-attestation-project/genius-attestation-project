import {
  getAccountTree,
  createAccountNode,
  updateAccountNodeSettings,
  getAccountNodeAuditLogs,
} from "../src/features/account-menu/server/account-menu.service";
import { prisma } from "../src/lib/prisma";

const db = prisma as any;

async function runTests() {
  console.log("🚀 Starting Account Menu Integration Tests...");

  const TEST_OWNER_ID = "test-owner-admin-123";
  const TEST_USER_ID = "test-user-001";
  const TEST_USER_NAME = "Senior Developer";

  try {
    // Clean up previous test data if any
    await db.accountMenuAuditLog.deleteMany({ where: { ownerAdminId: TEST_OWNER_ID } });
    await db.accountMenu.deleteMany({ where: { ownerAdminId: TEST_OWNER_ID } });

    // Test 1: Fetch Tree & Auto-bootstrap Root CREDIT and DEBIT
    console.log("\n--- Test 1: Auto-bootstrapping Root CREDIT and DEBIT ---");
    let tree = await getAccountTree(TEST_OWNER_ID);
    console.log("Root tree count:", tree.length);
    console.log("Root node names:", tree.map((n) => n.name));
    if (tree.length !== 2 || tree[0].name !== "CREDIT" || tree[1].name !== "DEBIT") {
      throw new Error("Test 1 Failed: Root nodes CREDIT & DEBIT were not bootstrapped correctly.");
    }
    console.log("✅ Test 1 Passed!");

    const creditNode = tree.find((n) => n.name === "CREDIT")!;
    const debitNode = tree.find((n) => n.name === "DEBIT")!;

    // Test 2: Create Main Title (Bank under CREDIT, Processing under DEBIT)
    console.log("\n--- Test 2: Create Main Titles (Bank under CREDIT) ---");
    const bankNode = await createAccountNode(TEST_OWNER_ID, TEST_USER_ID, TEST_USER_NAME, {
      name: "Bank",
      parentId: creditNode.id,
    });
    console.log("Created Main Title:", bankNode.name, "| Parent:", bankNode.parentId);

    const processingNode = await createAccountNode(TEST_OWNER_ID, TEST_USER_ID, TEST_USER_NAME, {
      name: "Processing",
      parentId: debitNode.id,
    });
    console.log("Created Main Title:", processingNode.name, "| Parent:", processingNode.parentId);
    console.log("✅ Test 2 Passed!");

    // Test 3: Multi-level Nesting (Emirates NBD under Bank -> SAHID ENBD under Emirates NBD)
    console.log("\n--- Test 3: Multi-level nesting (Bank -> Emirates NBD -> SAHID ENBD) ---");
    const enbdNode = await createAccountNode(TEST_OWNER_ID, TEST_USER_ID, TEST_USER_NAME, {
      name: "Emirates NBD",
      parentId: bankNode.id,
    });
    console.log("Created Sub Title level 2:", enbdNode.name);

    const sahidNode = await createAccountNode(TEST_OWNER_ID, TEST_USER_ID, TEST_USER_NAME, {
      name: "SAHID ENBD",
      parentId: enbdNode.id,
      code: "ENBD-001",
      ledgerMapping: "LEDGER-SAHID",
    });
    console.log("Created Sub Title level 3:", sahidNode.name);
    console.log("✅ Test 3 Passed!");

    // Test 4: Verify Folder vs Leaf status rule
    console.log("\n--- Test 4: Verify Folder vs Leaf status rule ---");
    tree = await getAccountTree(TEST_OWNER_ID);

    // Helper to find node in tree
    const findNodeInTree = (nodes: any[], name: string): any => {
      for (const n of nodes) {
        if (n.name === name) return n;
        if (n.children) {
          const found = findNodeInTree(n.children, name);
          if (found) return found;
        }
      }
      return null;
    };

    const treeBank = findNodeInTree(tree, "Bank");
    const treeENBD = findNodeInTree(tree, "Emirates NBD");
    const treeSahid = findNodeInTree(tree, "SAHID ENBD");

    console.log("Bank -> isLeaf:", treeBank.isLeaf, "| childCount:", treeBank.childCount);
    console.log("Emirates NBD -> isLeaf:", treeENBD.isLeaf, "| childCount:", treeENBD.childCount);
    console.log("SAHID ENBD -> isLeaf:", treeSahid.isLeaf, "| childCount:", treeSahid.childCount);

    if (treeBank.isLeaf !== false || treeENBD.isLeaf !== false || treeSahid.isLeaf !== true) {
      throw new Error("Test 4 Failed: Leaf node logic failed. Folder nodes with children must be isLeaf = false!");
    }
    console.log("✅ Test 4 Passed!");

    // Test 5: Settings constraint (Only leaf nodes can have settings updated)
    console.log("\n--- Test 5: Leaf settings updates ---");
    // Attempting settings update on folder Bank (should fail)
    try {
      await updateAccountNodeSettings(TEST_OWNER_ID, TEST_USER_ID, TEST_USER_NAME, bankNode.id, {
        accountCode: "BANK-FAIL",
      });
      throw new Error("Test 5 Failed: Expected error updating settings on folder node.");
    } catch (err: any) {
      if (err.message.includes("leaf nodes")) {
        console.log("Correctly rejected settings update on folder node:", err.message);
      } else {
        throw err;
      }
    }

    // Settings update on leaf SAHID ENBD (should succeed)
    const updatedSahid = await updateAccountNodeSettings(
      TEST_OWNER_ID,
      TEST_USER_ID,
      TEST_USER_NAME,
      sahidNode.id,
      {
        accountCode: "ACC-ENBD-SAHID",
        ledgerMapping: "GL-10029",
        description: "Sahid ENBD Primary Account",
        customSettings: { taxExempt: true },
      }
    );
    console.log("Updated Leaf Settings:", updatedSahid.code, "| Ledger:", updatedSahid.ledgerMapping);
    console.log("✅ Test 5 Passed!");

    // Test 6: Audit log history
    console.log("\n--- Test 6: Audit Logs ---");
    const auditLogs = await getAccountNodeAuditLogs(TEST_OWNER_ID);
    console.log("Total audit logs recorded:", auditLogs.length);
    console.log("Log actions:", auditLogs.map((l) => `${l.action} on "${l.nodeName}"`));
    if (auditLogs.length < 5) {
      throw new Error("Test 6 Failed: Audit logs were not recorded properly.");
    }
    console.log("✅ Test 6 Passed!");

    console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
  } catch (err) {
    console.error("❌ Test execution failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
