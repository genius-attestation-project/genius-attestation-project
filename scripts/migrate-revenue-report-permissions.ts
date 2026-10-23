import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Starting Revenue Report Migration ===");

  // 1. Ensure Permission records exist
  const requiredPermissions = [
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

  for (const perm of requiredPermissions) {
    await prisma.permission.upsert({
      where: { code: perm.code },
      update: {
        name: perm.name,
        module: perm.module,
        description: perm.description,
      },
      create: perm,
    });
  }
  console.log("Ensured Permission catalog records for Revenue Report.");

  // Fetch all permission IDs for mapping
  const allPermissions = await prisma.permission.findMany({
    select: { id: true, code: true },
  });
  const codeToId = new Map(allPermissions.map((p) => [p.code, p.id]));

  const revViewId = codeToId.get("revenue_report.view")!;
  const revSearchId = codeToId.get("revenue_report.search")!;
  const revExportId = codeToId.get("revenue_report.export")!;
  const revMenuId = codeToId.get("menu.revenue-report")!;

  // 2. Migrate Role Permissions
  // Find roles that have any tracking_report or search_report tracking permissions
  const existingRolePerms = await prisma.rolePermission.findMany({
    include: { permission: { select: { code: true } } },
  });

  const rolesWithTrackingView = new Set<string>();
  const rolesWithTrackingSearch = new Set<string>();
  const rolesWithTrackingExport = new Set<string>();

  for (const rp of existingRolePerms) {
    const code = rp.permission.code;
    if (
      code === "tracking_report.view" ||
      code === "search_report.tracking_report.view" ||
      code === "menu.search-report.tracking"
    ) {
      rolesWithTrackingView.add(rp.roleId);
    }
    if (
      code === "tracking_report.search" ||
      code === "search_report.tracking_report.search"
    ) {
      rolesWithTrackingSearch.add(rp.roleId);
    }
    if (
      code === "tracking_report.export" ||
      code === "search_report.tracking_report.export"
    ) {
      rolesWithTrackingExport.add(rp.roleId);
    }
  }

  // Also include default admin/manager/sales roles if they exist
  const roles = await prisma.accessRole.findMany({ select: { id: true, name: true } });
  for (const r of roles) {
    if (["Super Admin", "Admin", "Manager", "Sales"].includes(r.name)) {
      rolesWithTrackingView.add(r.id);
      rolesWithTrackingSearch.add(r.id);
      rolesWithTrackingExport.add(r.id);
    }
  }

  let rolePermsCreated = 0;
  for (const roleId of rolesWithTrackingView) {
    // grant revenue_report.view and menu.revenue-report
    for (const pId of [revViewId, revMenuId]) {
      try {
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId, permissionId: pId } },
          update: {},
          create: { roleId, permissionId: pId, scope: "All" },
        });
        rolePermsCreated++;
      } catch (e) {
        // ignore duplicate
      }
    }
  }

  for (const roleId of rolesWithTrackingSearch) {
    try {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: revSearchId } },
        update: {},
        create: { roleId, permissionId: revSearchId, scope: "All" },
      });
      rolePermsCreated++;
    } catch (e) {}
  }

  for (const roleId of rolesWithTrackingExport) {
    try {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId, permissionId: revExportId } },
        update: {},
        create: { roleId, permissionId: revExportId, scope: "All" },
      });
      rolePermsCreated++;
    } catch (e) {}
  }

  console.log(`Migrated role permissions (updated ${rolePermsCreated} associations).`);

  // 3. Migrate User Permissions
  const userPerms = await prisma.userPermission.findMany();
  const userIdsWithTrackingView = new Set<string>();
  const userIdsWithTrackingSearch = new Set<string>();
  const userIdsWithTrackingExport = new Set<string>();

  for (const up of userPerms) {
    if (
      up.permissionKey === "search_report.tracking_report.view" ||
      up.permissionKey === "tracking_report.view" ||
      up.permissionKey === "menu.search-report.tracking"
    ) {
      userIdsWithTrackingView.add(up.userId);
    }
    if (
      up.permissionKey === "search_report.tracking_report.search" ||
      up.permissionKey === "tracking_report.search"
    ) {
      userIdsWithTrackingSearch.add(up.userId);
    }
    if (
      up.permissionKey === "search_report.tracking_report.export" ||
      up.permissionKey === "tracking_report.export"
    ) {
      userIdsWithTrackingExport.add(up.userId);
    }
  }

  let userPermsCreated = 0;
  for (const userId of userIdsWithTrackingView) {
    for (const key of ["revenue_report.view", "menu.revenue-report"]) {
      const exists = await prisma.userPermission.findFirst({
        where: { userId, permissionKey: key },
      });
      if (!exists) {
        await prisma.userPermission.create({
          data: { userId, permissionKey: key },
        });
        userPermsCreated++;
      }
    }
  }

  for (const userId of userIdsWithTrackingSearch) {
    const exists = await prisma.userPermission.findFirst({
      where: { userId, permissionKey: "revenue_report.search" },
    });
    if (!exists) {
      await prisma.userPermission.create({
        data: { userId, permissionKey: "revenue_report.search" },
      });
      userPermsCreated++;
    }
  }

  for (const userId of userIdsWithTrackingExport) {
    const exists = await prisma.userPermission.findFirst({
      where: { userId, permissionKey: "revenue_report.export" },
    });
    if (!exists) {
      await prisma.userPermission.create({
        data: { userId, permissionKey: "revenue_report.export" },
      });
      userPermsCreated++;
    }
  }

  console.log(`Migrated user permissions (created ${userPermsCreated} user permissions).`);

  // 4. Migrate UserOfficeVisibility
  // Copy search_report / tracking_report office visibilities to revenue_report
  const sourceUserVisibilities = await prisma.userOfficeVisibility.findMany({
    where: {
      moduleKey: { in: ["search_report", "tracking_report"] },
    },
  });

  const existingRevVisibilities = await prisma.userOfficeVisibility.findMany({
    where: { moduleKey: "revenue_report" },
    select: { userId: true, officeLocationId: true },
  });
  const existingVisSet = new Set(
    existingRevVisibilities.map((v) => `${v.userId}::${v.officeLocationId}`)
  );

  let userVisCreated = 0;
  for (const v of sourceUserVisibilities) {
    const key = `${v.userId}::${v.officeLocationId}`;
    if (!existingVisSet.has(key)) {
      await prisma.userOfficeVisibility.create({
        data: {
          userId: v.userId,
          officeLocationId: v.officeLocationId,
          moduleKey: "revenue_report",
          createdBy: v.createdBy,
        },
      });
      existingVisSet.add(key);
      userVisCreated++;
    }
  }

  console.log(`Migrated UserOfficeVisibility (created ${userVisCreated} rows for revenue_report).`);

  console.log("=== Revenue Report Migration Completed Successfully ===");
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
