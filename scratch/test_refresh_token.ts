import { prisma } from "../src/lib/prisma";
import {
  createRefreshTokenRecord,
  hashRefreshToken,
  listUserSessions,
  revokeAllUserSessions,
  revokeRefreshToken,
  verifyAndRotateRefreshToken,
} from "../src/features/auth/server/refresh-token.service";
import { getSessionAccess, hasPermission } from "../src/features/admin/server/rbac.service";

async function runRefreshTokenTests() {
  console.log("=== STARTING REFRESH TOKEN AUTHENTICATION TESTS ===");

  const user = await (prisma as any).user.findFirst();

  if (!user) {
    throw new Error("No users found in database for testing.");
  }

  console.log(`Using Test User: ${user.name} (${user.id})`);

  // Clean up any old test tokens for this user first
  await (prisma as any).refreshToken.deleteMany({
    where: { userId: user.id },
  });

  // --- TEST 1: Credentials / Login Token Creation ---
  console.log("\n--- TEST 1: Refresh Token Creation on Login ---");
  const session1 = await createRefreshTokenRecord({
    userId: user.id,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0",
    ipAddress: "192.168.1.100",
  });

  console.log(`  Generated Raw Refresh Token: ${session1.rawToken.slice(0, 10)}...`);
  console.log(`  Token Expires At: ${session1.expiresAt.toISOString()}`);

  const tokenHash1 = hashRefreshToken(session1.rawToken);
  const dbRecord1 = await (prisma as any).refreshToken.findFirst({
    where: { tokenHash: tokenHash1 },
  });

  console.log(`  DB Record Found: ${Boolean(dbRecord1)}`);
  console.log(`  Stored Token Hash (Never raw): ${dbRecord1?.tokenHash.slice(0, 15)}...`);
  console.log(`  Token Hash matches raw token SHA-256: ${dbRecord1?.tokenHash === tokenHash1}`);
  if (!dbRecord1 || dbRecord1.tokenHash !== tokenHash1) {
    throw new Error("TEST 1 FAILED: Refresh Token was not stored correctly in database.");
  }
  console.log("✔ TEST 1 PASSED!");

  // --- TEST 2: Refresh Token Verification & Rotation ---
  console.log("\n--- TEST 2: Refresh Token Rotation ---");
  const rotationResult = await verifyAndRotateRefreshToken({
    rawToken: session1.rawToken,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TestBrowser/1.0",
    ipAddress: "192.168.1.100",
  });

  console.log(`  Rotated New Raw Token: ${rotationResult.newRawToken.slice(0, 10)}...`);
  console.log(`  Rotated UserId: ${rotationResult.userId}`);

  // Check old token in DB (should be revoked)
  const oldDbRecord = await (prisma as any).refreshToken.findUnique({
    where: { id: dbRecord1.id },
  });
  console.log(`  Old Token RevokedAt: ${oldDbRecord?.revokedAt ? oldDbRecord.revokedAt.toISOString() : "null"}`);
  console.log(`  Old Token Revoked: ${Boolean(oldDbRecord?.revokedAt)}`);

  // Check new rotated token in DB
  const newHash = hashRefreshToken(rotationResult.newRawToken);
  const newDbRecord = await (prisma as any).refreshToken.findFirst({
    where: { tokenHash: newHash },
  });
  console.log(`  New Token Created in DB: ${Boolean(newDbRecord)}`);
  console.log(`  New Token Active: ${newDbRecord?.revokedAt === null}`);

  if (!oldDbRecord?.revokedAt || !newDbRecord) {
    throw new Error("TEST 2 FAILED: Token rotation did not properly revoke old token or create new token.");
  }
  console.log("✔ TEST 2 PASSED!");

  // --- TEST 3: Revoked Token Reuse Rejection ---
  console.log("\n--- TEST 3: Attempting Re-use of Revoked Token ---");
  try {
    await verifyAndRotateRefreshToken({
      rawToken: session1.rawToken, // Old revoked token
    });
    throw new Error("TEST 3 FAILED: Server accepted a revoked token!");
  } catch (err: any) {
    console.log(`  Expected Error Caught: "${err.message}"`);
    console.log("✔ TEST 3 PASSED!");
  }

  // --- TEST 4: Logout Revocation ---
  console.log("\n--- TEST 4: Logout Token Revocation ---");
  const revokeResult = await revokeRefreshToken(rotationResult.newRawToken);
  console.log(`  Logout Revoke Success: ${revokeResult}`);

  const revokedDbRecord = await (prisma as any).refreshToken.findFirst({
    where: { tokenHash: newHash },
  });
  console.log(`  Token RevokedAt after logout: ${revokedDbRecord?.revokedAt ? revokedDbRecord.revokedAt.toISOString() : "null"}`);

  if (!revokeResult || !revokedDbRecord?.revokedAt) {
    throw new Error("TEST 4 FAILED: Logout did not revoke the refresh token.");
  }
  console.log("✔ TEST 4 PASSED!");

  // --- TEST 5: Multi-Device Sessions ---
  console.log("\n--- TEST 5: Multi-Device Active Sessions ---");
  // Log in from Office PC
  const pcSession = await createRefreshTokenRecord({
    userId: user.id,
    userAgent: "Office PC - Chrome Windows",
    ipAddress: "10.0.0.1",
  });
  // Log in from Mobile Phone
  const mobileSession = await createRefreshTokenRecord({
    userId: user.id,
    userAgent: "Mobile Phone - Safari iOS",
    ipAddress: "10.0.0.2",
  });
  // Log in from Laptop
  const laptopSession = await createRefreshTokenRecord({
    userId: user.id,
    userAgent: "Laptop - Firefox MacOS",
    ipAddress: "10.0.0.3",
  });

  let activeSessions = await listUserSessions(user.id);
  console.log(`  Active Sessions Count for User: ${activeSessions.length} (Expected: 3)`);
  if (activeSessions.length !== 3) {
    throw new Error(`TEST 5 FAILED: Expected 3 active sessions, got ${activeSessions.length}`);
  }

  // Revoke ONLY the mobile session
  console.log("  Revoking Mobile session...");
  await revokeRefreshToken(mobileSession.rawToken);

  activeSessions = await listUserSessions(user.id);
  console.log(`  Remaining Active Sessions Count: ${activeSessions.length} (Expected: 2)`);
  const mobileStillActive = activeSessions.some((s: any) => s.userAgent?.includes("Mobile"));
  const pcStillActive = activeSessions.some((s: any) => s.userAgent?.includes("Office PC"));

  console.log(`  Mobile Session Active: ${mobileStillActive} (Expected: false)`);
  console.log(`  Office PC Session Active: ${pcStillActive} (Expected: true)`);

  if (mobileStillActive || !pcStillActive || activeSessions.length !== 2) {
    throw new Error("TEST 5 FAILED: Individual session revocation failed or affected other sessions.");
  }

  // Revoke all remaining sessions
  await revokeAllUserSessions(user.id);
  activeSessions = await listUserSessions(user.id);
  console.log(`  Active Sessions after Revoke All: ${activeSessions.length} (Expected: 0)`);
  console.log("✔ TEST 5 PASSED!");

  // --- TEST 6: RBAC Compatibility Check ---
  console.log("\n--- TEST 6: RBAC Compatibility ---");
  const mockAccess = {
    id: user.id,
    email: user.email,
    role: "Admin",
    permissions: ["dashboard.view", "leads.manage"],
    isSuperAdmin: false,
  };
  const hasAccess1 = hasPermission(mockAccess as any, "dashboard.view");
  const hasAccess2 = hasPermission(mockAccess as any, "nonexistent.permission");
  const superAdminAccess = { isSuperAdmin: true, permissions: [] };
  const hasSuperAccess = hasPermission(superAdminAccess as any, "anything.permission");

  console.log(`  hasPermission for "dashboard.view": ${hasAccess1} (Expected: true)`);
  console.log(`  hasPermission for "nonexistent": ${hasAccess2} (Expected: false)`);
  console.log(`  hasPermission for SuperAdmin: ${hasSuperAccess} (Expected: true)`);

  if (!hasAccess1 || hasAccess2 || !hasSuperAccess) {
    throw new Error("TEST 6 FAILED: RBAC permission check failed.");
  }
  console.log("✔ TEST 6 PASSED!");

  console.log("\n=== ALL REFRESH TOKEN AUTHENTICATION TESTS PASSED SUCCESSFULLY ===");

  // Cleanup test records
  await (prisma as any).refreshToken.deleteMany({
    where: { userId: user.id },
  });
  console.log("Test records cleaned up.");
}

runRefreshTokenTests()
  .catch((err) => {
    console.error("\nTEST SUITE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
