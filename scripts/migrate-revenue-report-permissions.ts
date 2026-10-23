import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== Starting Revenue Report Permission & Visibility Migration ===");

  // 1. Ensure new permissions exist in permissions table
  const newPermissions = [
    {
      code: "revenue_report.view",
      name: "Revenue Report View",
      module: "Revenue Report",
      description: "View permission for Revenue Report.",
    },
    {
      code: "revenue_report.search",
      name: "Revenue Report Search",
      module: "Revenue Report",
      description: "Search permission for Revenue Report.",
    },
    {
      code: "revenue_report.export",
      name: "Revenue Report Export",
      module: "Revenue Report",
      description: "Export permission for Revenue Report.",
    },
    {
      code: "menu.revenue-report",
      name: "Revenue Report Menu",
      module: "Menu Visibility",
      description: "Controls visibility for the Revenue Report navigation item.",
    },
  ];

  await prisma.permission.createMany({
    data: newPermissions,
    skipDuplicates: true,
  });
  console.log("✓ Permissions bootstrapped successfully.");

  // Fetch permission IDs
  const allPerms = await prisma.permission.findMany({
    where: {
      code: {
        in: [
          "revenue_report.view",
          "revenue_report.search",
          "revenue_report.export",
          "menu.revenue-report",
          "tracking_report.view",
          "tracking_report.search",
          "tracking_report.export",
          "menu.search-report.tracking",
        ],
      },
    },
  });

  const permByCode = new Map(allPerms.map((p) => [p.code, p.id]));

  const revViewId = permByCode.get("revenue_report.view");
  const revSearchId = permByCode.get("revenue_report.search");
  const revExportId = permByCode.get("revenue_report.export");
  const revMenuId = permByCode.get("menu.revenue-report");

  // 2. Identify roles that should receive revenue_report permissions
  const rolePermissions = await prisma.rolePermission.findMany({
    include: { permission: true },
  });

  const roleViewIds = new Set<string>();
  const roleSearchIds = new Set<string>();
  const roleExportIds = new Set<string>();

  for (const rp of rolePermissions) {
    if (rp.permission.code === "tracking_report.view" || rp.permission.code === "menu.search-report.tracking") {
      roleViewIds.add(rp.roleId);
    }
    if (rp.permission.code === "tracking_report.search") {
      roleSearchIds.add(rp.roleId);
    }
    if (rp.permission.code === "tracking_report.export") {
      roleExportIds.add(rp.roleId);
    }
  }

  // Also include Super Admin, Admin, and Manager roles
  const allRoles = await prisma.accessRole.findMany({
    select: { id: true, name: true },
  });

  for (const r of allRoles) {
    if (r.name === "Super Admin" || r.name === "Admin" || r.name === "Manager") {
      roleViewIds.add(r.id);
      roleSearchIds.add(r.id);
      roleExportIds.add(r.id);
    }
  }

  const rolePermsToCreate: Array<{ roleId: string; permissionId: string }> = [];

  if (revViewId && revMenuId) {
    for (const rId of roleViewIds) {
      rolePermsToCreate.push({ roleId: rId, permissionId: revViewId });
      rolePermsToCreate.push({ roleId: rId, permissionId: revMenuId });
    }
  }
  if (revSearchId) {
    for (const rId of roleSearchIds) {
      rolePermsToCreate.push({ roleId: rId, permissionId: revSearchId });
    }
  }
  if (revExportId) {
    for (const rId of roleExportIds) {
      rolePermsToCreate.push({ roleId: rId, permissionId: revExportId });
    }
  }

  if (rolePermsToCreate.length > 0) {
    await prisma.rolePermission.createMany({
      data: rolePermsToCreate,
      skipDuplicates: true,
    });
  }
  console.log(`✓ Role permissions migrated: ${rolePermsToCreate.length} mappings ensured.`);

  // 3. Migrate User Permissions
  const userPerms = await prisma.userPermission.findMany({
    select: { userId: true, permissionKey: true },
  });

  const userPermMap = new Map<string, Set<string>>();
  for (const up of userPerms) {
    if (!userPermMap.has(up.userId)) {
      userPermMap.set(up.userId, new Set());
    }
    userPermMap.get(up.userId)!.add(up.permissionKey);
  }

  const userPermsToCreate: Array<{ userId: string; permissionKey: string }> = [];

  for (const [userId, keys] of userPermMap.entries()) {
    const hasTrackView =
      keys.has("search_report.tracking_report.view") ||
      keys.has("tracking_report.view") ||
      keys.has("menu.search-report.tracking");
    const hasTrackSearch =
      keys.has("search_report.tracking_report.search") || keys.has("tracking_report.search");
    const hasTrackExport =
      keys.has("search_report.tracking_report.export") || keys.has("tracking_report.export");

    if (hasTrackView && !keys.has("revenue_report.view")) {
      userPermsToCreate.push({ userId, permissionKey: "revenue_report.view" });
    }
    if (hasTrackSearch && !keys.has("revenue_report.search")) {
      userPermsToCreate.push({ userId, permissionKey: "revenue_report.search" });
    }
    if (hasTrackExport && !keys.has("revenue_report.export")) {
      userPermsToCreate.push({ userId, permissionKey: "revenue_report.export" });
    }
  }

  if (userPermsToCreate.length > 0) {
    await prisma.userPermission.createMany({
      data: userPermsToCreate,
      skipDuplicates: true,
    });
  }
  console.log(`✓ User permissions migrated: ${userPermsToCreate.length} records created.`);

  // 4. Migrate User Office Visibility
  const userVisibilities = await prisma.userOfficeVisibility.findMany({
    select: {
      userId: true,
      moduleKey: true,
      officeLocationId: true,
    },
  });

  const existingRevVis = new Set(
    userVisibilities
      .filter((v) => v.moduleKey === "revenue_report")
      .map((v) => `${v.userId}:::${v.officeLocationId}`)
  );

  const visToReplicate = userVisibilities.filter(
    (v) => v.moduleKey === "search_report" || v.moduleKey === "tracking_report"
  );

  const userVisToCreate: Array<{ userId: string; moduleKey: string; officeLocationId: string }> = [];

  for (const vis of visToReplicate) {
    const key = `${vis.userId}:::${vis.officeLocationId}`;
    if (!existingRevVis.has(key)) {
      existingRevVis.add(key);
      userVisToCreate.push({
        userId: vis.userId,
        moduleKey: "revenue_report",
        officeLocationId: vis.officeLocationId,
      });
    }
  }

  if (userVisToCreate.length > 0) {
    await prisma.userOfficeVisibility.createMany({
      data: userVisToCreate,
      skipDuplicates: true,
    });
  }
  console.log(`✓ Replicated ${userVisToCreate.length} office visibility entries to revenue_report.`);

  console.log("=== Migration completed successfully! ===");
  await prisma.$disconnect();
}

main().catch(console.error);
