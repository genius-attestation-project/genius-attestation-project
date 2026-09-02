import { prisma } from "@/lib/prisma";
import { sidebarNavigation, permissionModules } from "@/features/admin/data/rbac.data";
import { PERMISSION_CONFIGURED_SENTINEL } from "./rbac.service";

/**
 * Asserts that a target user is manageable under the given ownerAdminId workspace.
 */
async function assertUserInOwnerScope(ownerAdminId: string, targetUserId: string) {
  const targetUser = await prisma.user.findFirst({
    where: {
      id: targetUserId,
      OR: [
        { ownerAdminId },
        { id: ownerAdminId },
      ],
    },
    select: { id: true, ownerAdminId: true, role: { select: { name: true } } },
  });

  if (!targetUser) {
    throw new Error("Target user not found or does not belong to your workspace.");
  }

  return targetUser;
}

/**
 * System Operational Modules dynamically derived from sidebar navigation & permission definitions.
 * Provides canonical module keys, display labels, categories, and descriptions for Office Visibility Access.
 */
export function getOperationalModules() {
  const modulesList: Array<{
    key: string;
    label: string;
    href: string;
    description: string;
    category: string;
    subModules?: Array<{ key: string; label: string; href?: string }>;
  }> = [];

  const seenKeys = new Set<string>();

  // Canonical mapping for primary operational modules
  const operationalMap: Record<string, { key: string; label: string; description: string; category: string }> = {
    "/dashboard/revenue-registration": {
      key: "revenue_registration",
      label: "Revenue Registration",
      description: "Customer registration, document intake, and invoice collection",
      category: "Operations",
    },
    "/dashboard/process": {
      key: "process",
      label: "Process Module",
      description: "Document movement between branch offices and assigned processing centers",
      category: "Processing",
    },
    "/dashboard/home": {
      key: "home",
      label: "Home Workflow",
      description: "Document In Hand, Inbound bundles, Outbound bundles, and Movement History",
      category: "Operations",
    },
    "/dashboard/ready-for-delivery": {
      key: "ready_for_delivery",
      label: "Ready For Delivery",
      description: "Final document dispatch, customer delivery, and courier tracking",
      category: "Delivery",
    },
    "/dashboard/search-report": {
      key: "search_report",
      label: "Search / Report",
      description: "General document search, tracking status query, and operational exports",
      category: "Reporting",
    },
    "/dashboard/lead-management": {
      key: "lead_management",
      label: "Lead Management",
      description: "Lead capture, followups, assignment, LOB, and closed deals pipeline",
      category: "Sales",
    },
    "/dashboard/pending-approval": {
      key: "pending_approval",
      label: "Pending Approval",
      description: "Supervisor approval queue for status transitions and document workflow",
      category: "Approvals",
    },
    "/dashboard/account-statements": {
      key: "account_statements",
      label: "Account Statement",
      description: "Client financial ledgers, statement entries, and running balance records",
      category: "Finance",
    },
    "/dashboard/account-panel": {
      key: "account_panel",
      label: "Account Panel",
      description: "Direct accounting vouchers, expense debits, and credit entries",
      category: "Finance",
    },
    "/dashboard/reports": {
      key: "reports",
      label: "Reports & Analytics",
      description: "Centralized analytical reports and executive summary dashboards",
      category: "Reporting",
    },
    "/dashboard/bm-report": {
      key: "bm_report",
      label: "BM Report",
      description: "Real-time document movement tracking center and branch metrics",
      category: "Reporting",
    },
    "/dashboard/welcome-call": {
      key: "welcome_call",
      label: "Welcome Call",
      description: "Customer verification and welcome call onboarding queue",
      category: "Operations",
    },
    "/dashboard/assigned-office": {
      key: "assigned_office",
      label: "Assigned Office",
      description: "External partner processing offices and document dispatch",
      category: "Master Data",
    },
    "/dashboard/master-configuration": {
      key: "master_configuration",
      label: "Master Configuration",
      description: "Document types, categories, process types, and corporate client details",
      category: "Master Data",
    },
    "/dashboard/attendance": {
      key: "attendance",
      label: "Attendance",
      description: "Daily staff attendance records, summaries, and approval workflow",
      category: "HR",
    },
    "/dashboard/leave-management": {
      key: "leave",
      label: "Leave Management",
      description: "Employee leave requests, approvals, and balance management",
      category: "HR",
    },
    "/dashboard/salary-management": {
      key: "salary",
      label: "Salary Management",
      description: "Monthly payroll generation, salary calculator, and payroll reports",
      category: "HR",
    },
    "/dashboard/admin-management": {
      key: "admin_management",
      label: "Admin Management",
      description: "Workspace users, roles, departments, and office locations",
      category: "Administration",
    },
  };

  for (const nav of sidebarNavigation) {
    const config = operationalMap[nav.href];
    const key = config?.key ?? nav.pagePermission.replace(".view", "").replace("-", "_");
    const label = config?.label ?? nav.label;
    const description = config?.description ?? `${nav.label} module office visibility control`;
    const category = config?.category ?? "General";

    if (!seenKeys.has(key)) {
      seenKeys.add(key);

      const subModules = nav.children?.map((c) => ({
        key: `${key}.${c.pagePermission.replace(".view", "").replace("-", "_")}`,
        label: c.label,
        href: c.href,
      }));

      modulesList.push({
        key,
        label,
        href: nav.href,
        description,
        category,
        subModules: subModules && subModules.length > 0 ? subModules : undefined,
      });
    }
  }

  return modulesList;
}

/**
 * Returns module-wise assigned office location IDs for a user.
 * If moduleKey is provided, returns string[] of officeLocationIds for that module.
 * If moduleKey is omitted, returns Record<string, string[]> containing all module-wise mappings.
 */
export async function getUserOfficeVisibility(
  ownerAdminId: string,
  userId: string,
  moduleKey?: string
): Promise<string[] | Record<string, string[]>> {
  await assertUserInOwnerScope(ownerAdminId, userId);

  if (moduleKey) {
    const visibilities = await prisma.userOfficeVisibility.findMany({
      where: { userId, moduleKey },
      select: { officeLocationId: true },
    });
    return visibilities.map((v) => v.officeLocationId);
  }

  const allVisibilities = await prisma.userOfficeVisibility.findMany({
    where: { userId },
    select: { moduleKey: true, officeLocationId: true },
  });

  const moduleOfficeMap: Record<string, string[]> = {};
  for (const v of allVisibilities) {
    const mKey = v.moduleKey || "global";
    if (!moduleOfficeMap[mKey]) {
      moduleOfficeMap[mKey] = [];
    }
    moduleOfficeMap[mKey].push(v.officeLocationId);
  }

  return moduleOfficeMap;
}

/**
 * Saves assigned office location IDs for a target user.
 * Supports saving per-module (moduleKey + officeLocationIds) or bulk (moduleOfficeMap).
 */
export async function setUserOfficeVisibility(
  ownerAdminId: string,
  targetUserId: string,
  options: {
    moduleKey?: string;
    officeLocationIds?: string[];
    moduleOfficeMap?: Record<string, string[]>;
    createdBy?: string;
  }
): Promise<{ success: boolean; moduleOfficeMap: Record<string, string[]> }> {
  await assertUserInOwnerScope(ownerAdminId, targetUserId);

  // Validate all office location IDs
  const allOfficeIdsToValidate = new Set<string>();
  if (options.officeLocationIds) {
    options.officeLocationIds.forEach((id) => allOfficeIdsToValidate.add(id));
  }
  if (options.moduleOfficeMap) {
    Object.values(options.moduleOfficeMap).forEach((ids) => {
      if (Array.isArray(ids)) {
        ids.forEach((id) => allOfficeIdsToValidate.add(id));
      }
    });
  }

  const uniqueIds = Array.from(allOfficeIdsToValidate).filter(Boolean);

  if (uniqueIds.length > 0) {
    const db = prisma as any;
    const [validGlobalOffices, validAssignedOffices] = await Promise.all([
      prisma.officeLocation.findMany({
        where: {
          id: { in: uniqueIds },
          ownerAdminId,
        },
        select: { id: true },
      }),
      db.assignedOffice
        ? db.assignedOffice.findMany({
            where: {
              id: { in: uniqueIds },
              ownerAdminId,
            },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const validOfficeIds = new Set([
      ...validGlobalOffices.map((o) => o.id),
      ...validAssignedOffices.map((o: any) => o.id),
    ]);

    const invalidIds = uniqueIds.filter((id) => !validOfficeIds.has(id));
    if (invalidIds.length > 0) {
      throw new Error(`One or more selected office locations are invalid or unauthorized.`);
    }
  }

  await prisma.$transaction(async (tx) => {
    if (options.moduleOfficeMap) {
      // Bulk update: replace all module-wise office visibilities for target user
      await tx.userOfficeVisibility.deleteMany({
        where: { userId: targetUserId },
      });

      const recordsToCreate: Array<{
        userId: string;
        moduleKey: string;
        officeLocationId: string;
        createdBy?: string;
      }> = [];

      for (const [mKey, ids] of Object.entries(options.moduleOfficeMap)) {
        if (Array.isArray(ids)) {
          const distinctIds = Array.from(new Set(ids.filter(Boolean)));
          for (const officeLocationId of distinctIds) {
            recordsToCreate.push({
              userId: targetUserId,
              moduleKey: mKey,
              officeLocationId,
              createdBy: options.createdBy,
            });
          }
        }
      }

      if (recordsToCreate.length > 0) {
        await tx.userOfficeVisibility.createMany({
          data: recordsToCreate,
          skipDuplicates: true,
        });
      }
    } else if (options.moduleKey) {
      // Per-module update: replace only the specific module's office visibilities
      const targetModuleKey = options.moduleKey;
      const targetOfficeIds = Array.from(
        new Set((options.officeLocationIds ?? []).filter(Boolean))
      );

      await tx.userOfficeVisibility.deleteMany({
        where: {
          userId: targetUserId,
          moduleKey: targetModuleKey,
        },
      });

      if (targetOfficeIds.length > 0) {
        await tx.userOfficeVisibility.createMany({
          data: targetOfficeIds.map((officeLocationId) => ({
            userId: targetUserId,
            moduleKey: targetModuleKey,
            officeLocationId,
            createdBy: options.createdBy,
          })),
          skipDuplicates: true,
        });
      }
    }
  });

  // Return the latest complete module-wise mapping
  const updatedVis = (await getUserOfficeVisibility(
    ownerAdminId,
    targetUserId
  )) as Record<string, string[]>;

  return { success: true, moduleOfficeMap: updatedVis };
}

/**
 * Copies module-wise office visibility configuration from sourceUserId to targetUserId.
 */
export async function copyUserOfficeVisibility(
  ownerAdminId: string,
  sourceUserId: string,
  targetUserId: string,
  createdBy?: string
): Promise<{ success: boolean; copiedCount: number; moduleCount: number }> {
  await assertUserInOwnerScope(ownerAdminId, sourceUserId);
  await assertUserInOwnerScope(ownerAdminId, targetUserId);

  if (sourceUserId === targetUserId) {
    throw new Error("Source and target user cannot be the same.");
  }

  const sourceMap = (await getUserOfficeVisibility(
    ownerAdminId,
    sourceUserId
  )) as Record<string, string[]>;

  await setUserOfficeVisibility(ownerAdminId, targetUserId, {
    moduleOfficeMap: sourceMap,
    createdBy,
  });

  let totalOfficesCount = 0;
  let moduleCount = 0;
  for (const ids of Object.values(sourceMap)) {
    if (Array.isArray(ids) && ids.length > 0) {
      moduleCount++;
      totalOfficesCount += ids.length;
    }
  }

  return { success: true, copiedCount: totalOfficesCount, moduleCount };
}

/**
 * Returns list of explicit permission keys assigned to a user.
 */
export async function getUserPermissions(ownerAdminId: string, userId: string): Promise<string[]> {
  await assertUserInOwnerScope(ownerAdminId, userId);

  const permissions = await prisma.userPermission.findMany({
    where: { userId },
    select: { permissionKey: true },
  });

  return permissions
    .map((p) => p.permissionKey)
    .filter((k) => k !== PERMISSION_CONFIGURED_SENTINEL);
}

/**
 * Saves module & action permission keys for a target user.
 */
export async function setUserPermissions(
  ownerAdminId: string,
  targetUserId: string,
  permissionKeys: string[]
): Promise<{ success: boolean; permissionKeys: string[] }> {
  await assertUserInOwnerScope(ownerAdminId, targetUserId);

  const sanitizedKeys = Array.from(new Set(permissionKeys.map((k) => k.trim()).filter(Boolean)));
  const keysToSave = Array.from(new Set([...sanitizedKeys, PERMISSION_CONFIGURED_SENTINEL]));

  await prisma.$transaction(async (tx) => {
    await tx.userPermission.deleteMany({
      where: { userId: targetUserId },
    });

    await tx.userPermission.createMany({
      data: keysToSave.map((permissionKey) => ({
        userId: targetUserId,
        permissionKey,
      })),
      skipDuplicates: true,
    });
  });

  return { success: true, permissionKeys: sanitizedKeys };
}

/**
 * Copies module & action permissions from sourceUserId to targetUserId.
 * Office Visibility for targetUserId remains unchanged.
 */
export async function copyUserPermissions(
  ownerAdminId: string,
  sourceUserId: string,
  targetUserId: string
): Promise<{ success: boolean; copiedCount: number }> {
  await assertUserInOwnerScope(ownerAdminId, sourceUserId);
  await assertUserInOwnerScope(ownerAdminId, targetUserId);

  if (sourceUserId === targetUserId) {
    throw new Error("Source and target user cannot be the same.");
  }

  const sourcePermissions = await getUserPermissions(ownerAdminId, sourceUserId);
  await setUserPermissions(ownerAdminId, targetUserId, sourcePermissions);

  return { success: true, copiedCount: sourcePermissions.length };
}

function mapRolePermissionsToMatrixCatalog(rolePermissionCodes: string[]): string[] {
  const catalogKeys = new Set<string>();

  for (const code of rolePermissionCodes) {
    catalogKeys.add(code);

    if (code === "home.view") {
      catalogKeys.add("home.document_in_hand.view");
      catalogKeys.add("home.inbound.view");
      catalogKeys.add("home.outbound.view");
      catalogKeys.add("home.movement_history.view");
    }
    if (code === "home.transfer") catalogKeys.add("home.document_in_hand.transfer");
    if (code === "home.receive") catalogKeys.add("home.inbound.receive");
    if (code === "home.return") catalogKeys.add("home.inbound.return");
    if (code === "home.retrieve") catalogKeys.add("home.outbound.retrieve");

    if (code === "process.view") {
      catalogKeys.add("process.document_in_hand.view");
      catalogKeys.add("process.inbound.view");
      catalogKeys.add("process.outbound.view");
      catalogKeys.add("process.bundle_movement.view");
    }
    if (code === "process.transfer") catalogKeys.add("process.document_in_hand.transfer");
    if (code === "process.create" || code === "process.edit" || code === "process.complete") {
      catalogKeys.add("process.document_in_hand.actions");
    }
    if (code === "process.receive") catalogKeys.add("process.inbound.receive");
    if (code === "process.return") catalogKeys.add("process.inbound.return");
    if (code === "process.retrieve") catalogKeys.add("process.outbound.retrieve");
  }

  return Array.from(catalogKeys);
}

/**
 * Lists all users for ownerAdminId with complete module-wise office visibility and module permissions data.
 */
export async function listUserAccessData(ownerAdminId: string) {
  const db = prisma as any;
  const [users, officeLocations, assignedOffices, visibilities, permissions] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [{ ownerAdminId }, { id: ownerAdminId }],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        roleId: true,
        isActive: true,
        ownerAdminId: true,
        officeLocationId: true,
        officeLocationName: true,
        role: {
          select: {
            id: true,
            name: true,
            rolePermissions: {
              select: {
                permission: {
                  select: { code: true },
                },
              },
            },
          },
        },
      },
    }),
    prisma.officeLocation.findMany({
      where: { ownerAdminId },
      orderBy: { officeName: "asc" },
      select: {
        id: true,
        officeName: true,
        location: true,
        isProcessOffice: true,
      },
    }),
    db.assignedOffice
      ? db.assignedOffice.findMany({
          where: { ownerAdminId, status: true },
          select: {
            id: true,
            username: true,
            email: true,
          },
          orderBy: { username: "asc" },
        })
      : Promise.resolve([]),
    prisma.userOfficeVisibility.findMany({
      where: {
        user: {
          OR: [{ ownerAdminId }, { id: ownerAdminId }],
        },
      },
      select: {
        userId: true,
        moduleKey: true,
        officeLocationId: true,
      },
    }),
    prisma.userPermission.findMany({
      where: {
        user: {
          OR: [{ ownerAdminId }, { id: ownerAdminId }],
        },
      },
      select: {
        userId: true,
        permissionKey: true,
      },
    }),
  ]);

  // Group module-wise office visibilities: userId -> { moduleKey -> officeLocationIds[] }
  const userModuleOfficeMap = new Map<string, Record<string, string[]>>();
  const userTotalOfficesMap = new Map<string, Set<string>>();

  for (const v of visibilities) {
    const mKey = v.moduleKey || "global";
    const userMap = userModuleOfficeMap.get(v.userId) ?? {};
    if (!userMap[mKey]) {
      userMap[mKey] = [];
    }
    userMap[mKey].push(v.officeLocationId);
    userModuleOfficeMap.set(v.userId, userMap);

    const totalSet = userTotalOfficesMap.get(v.userId) ?? new Set<string>();
    totalSet.add(v.officeLocationId);
    userTotalOfficesMap.set(v.userId, totalSet);
  }

  // Group user permissions by userId
  const userPermMap = new Map<string, string[]>();
  for (const p of permissions) {
    const list = userPermMap.get(p.userId) ?? [];
    list.push(p.permissionKey);
    userPermMap.set(p.userId, list);
  }

  const mappedUsers = users.map((u) => {
    const isOwner = u.ownerAdminId === u.id || !u.ownerAdminId;
    const isSuperAdmin = u.role ? u.role.name === "Super Admin" : isOwner;
    const hasExplicitUserPermissions = userPermMap.has(u.id);

    const rawUserPerms = userPermMap.get(u.id) ?? [];
    const cleanUserPerms = rawUserPerms.filter((k) => k !== PERMISSION_CONFIGURED_SENTINEL);

    let effectivePermissionKeys: string[] = [];
    if (hasExplicitUserPermissions) {
      effectivePermissionKeys = cleanUserPerms;
    } else if (u.role?.rolePermissions) {
      const roleCodes = u.role.rolePermissions.map((rp) => rp.permission.code);
      effectivePermissionKeys = mapRolePermissionsToMatrixCatalog(roleCodes);
    }

    const moduleVisMap = userModuleOfficeMap.get(u.id) ?? {};
    const totalConfiguredOffices = userTotalOfficesMap.get(u.id)?.size ?? 0;

    return {
      id: u.id,
      name: u.name ?? "Workspace User",
      email: u.email,
      image: u.image ?? "",
      roleName: u.role?.name ?? (isOwner ? "Super Admin" : "User"),
      isActive: u.isActive,
      isSuperAdmin,
      hasUserPermissions: hasExplicitUserPermissions,
      moduleOfficeVisibilities: moduleVisMap,
      officeLocationIds: Array.from(userTotalOfficesMap.get(u.id) ?? []),
      configuredOfficesCount: totalConfiguredOffices,
      permissionKeys: effectivePermissionKeys,
    };
  });

  const assignedOfficeIds = new Set((assignedOffices as any[]).map((ao: any) => ao.id));

  // Source 2: Dashboard -> Assigned Office (assigned_offices table)
  const assignedList = (assignedOffices as any[]).map((ao: any) => ({
    id: ao.id,
    officeName: ao.username,
    location: "External Processing Office",
    isProcessOffice: true,
    isAssignedOffice: true,
    category: "ASSIGNED_OFFICE" as const,
    sourceType: "ASSIGNED_OFFICE" as const,
  }));

  // Source 1: Admin Management -> Office Location (office_locations table)
  const globalList = officeLocations
    .filter((loc) => !assignedOfficeIds.has(loc.id))
    .map((loc) => ({
      id: loc.id,
      officeName: loc.officeName,
      location: loc.location || "Office Location",
      isProcessOffice: loc.isProcessOffice,
      isAssignedOffice: false,
      category: "GLOBAL_OFFICE" as const,
      sourceType: "GLOBAL_OFFICE" as const,
    }));

  const formattedOffices = [...assignedList, ...globalList].sort((a, b) =>
    a.officeName.localeCompare(b.officeName)
  );

  const operationalModules = getOperationalModules();

  return {
    users: mappedUsers,
    officeLocations: formattedOffices,
    assignedOffices: assignedList.sort((a, b) => a.officeName.localeCompare(b.officeName)),
    globalOffices: globalList.sort((a, b) => a.officeName.localeCompare(b.officeName)),
    modules: operationalModules,
  };
}

/**
 * Resolves allowed office IDs and office names for a specific module and user.
 * For Super Admin: returns unrestricted access ({ isSuperAdmin: true, allowedOfficeIds: null, allowedOfficeNames: null }).
 * For non-Super Admin: returns strictly the permitted offices for that specific moduleKey.
 */
export async function getUserModuleAllowedOffices(
  userId: string,
  moduleKey: string,
  ownerAdminId?: string
): Promise<{
  isSuperAdmin: boolean;
  allowedOfficeIds: string[] | null;
  allowedOfficeNames: string[] | null;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      ownerAdminId: true,
      officeLocationId: true,
      officeLocationName: true,
      role: { select: { name: true } },
    },
  });

  if (!user) {
    return { isSuperAdmin: false, allowedOfficeIds: [], allowedOfficeNames: [] };
  }

  const isOwner = !user.ownerAdminId || user.ownerAdminId === user.id;
  const isSuperAdmin = user.role ? user.role.name === "Super Admin" : isOwner;

  if (isSuperAdmin) {
    return { isSuperAdmin: true, allowedOfficeIds: null, allowedOfficeNames: null };
  }

  // Find module-specific office visibilities
  const moduleVisRows = await prisma.userOfficeVisibility.findMany({
    where: {
      userId,
      OR: [{ moduleKey }, { moduleKey: "global" }],
    },
    include: {
      officeLocation: { select: { id: true, officeName: true } },
    },
  });

  // Filter for exact module matches first, or fallback to global
  const exactModuleRows = moduleVisRows.filter((v) => v.moduleKey === moduleKey);
  const effectiveRows = exactModuleRows.length > 0 ? exactModuleRows : moduleVisRows;

  const allowedIds: string[] = [];
  const allowedNames: string[] = [];

  for (const r of effectiveRows) {
    if (r.officeLocationId && !allowedIds.includes(r.officeLocationId)) {
      allowedIds.push(r.officeLocationId);
    }
    if (r.officeLocation?.officeName && !allowedNames.includes(r.officeLocation.officeName)) {
      allowedNames.push(r.officeLocation.officeName);
    }
  }

  // Include user's primary office if configured and not already present
  if (user.officeLocationId && !allowedIds.includes(user.officeLocationId)) {
    allowedIds.push(user.officeLocationId);
  }
  if (user.officeLocationName && !allowedNames.includes(user.officeLocationName)) {
    allowedNames.push(user.officeLocationName);
  }

  return {
    isSuperAdmin: false,
    allowedOfficeIds: allowedIds,
    allowedOfficeNames: allowedNames,
  };
}

/**
 * Canonical helper for resolving office visibility options for a user.
 */
export async function getOfficeVisibilityOptions(userId: string, ownerAdminId: string) {
  const db = prisma as any;
  const [user, officeLocations, assignedOffices, visibilities] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        ownerAdminId: true,
        role: { select: { name: true } },
      },
    }),
    prisma.officeLocation.findMany({
      where: { ownerAdminId },
      select: {
        id: true,
        officeName: true,
        location: true,
        isProcessOffice: true,
      },
      orderBy: { officeName: "asc" },
    }),
    db.assignedOffice
      ? db.assignedOffice.findMany({
          where: { ownerAdminId, status: true },
          select: {
            id: true,
            username: true,
            email: true,
          },
          orderBy: { username: "asc" },
        })
      : Promise.resolve([]),
    prisma.userOfficeVisibility.findMany({
      where: { userId },
      select: { officeLocationId: true, moduleKey: true },
    }),
  ]);

  const isOwner = !user?.ownerAdminId || user.ownerAdminId === user.id;
  const isSuperAdmin = user?.role ? user.role.name === "Super Admin" : isOwner;

  const permittedOfficeIds = new Set(visibilities.map((v) => v.officeLocationId));
  const assignedOfficeIds = new Set((assignedOffices as any[]).map((ao: any) => ao.id));

  // Build Assigned Offices list
  const allAssigned = (assignedOffices as any[]).map((ao: any) => ({
    id: ao.id,
    officeName: ao.username,
    location: "External Processing Office",
    isProcessOffice: true,
    isAssignedOffice: true,
    category: "ASSIGNED_OFFICE" as const,
    sourceType: "ASSIGNED_OFFICE" as const,
  }));

  // Build Global Offices list
  const allGlobal = officeLocations
    .filter((loc) => !assignedOfficeIds.has(loc.id))
    .map((loc) => ({
      id: loc.id,
      officeName: loc.officeName,
      location: loc.location || "Office Location",
      isProcessOffice: loc.isProcessOffice,
      isAssignedOffice: false,
      category: "GLOBAL_OFFICE" as const,
      sourceType: "GLOBAL_OFFICE" as const,
    }));

  if (isSuperAdmin) {
    const assigned = allAssigned.sort((a, b) => a.officeName.localeCompare(b.officeName));
    const global = allGlobal.sort((a, b) => a.officeName.localeCompare(b.officeName));
    return {
      assignedOffices: assigned,
      globalOffices: global,
      offices: [...assigned, ...global],
    };
  }

  // Non-Super Admin: filter strictly by permittedOfficeIds
  const permittedAssigned = allAssigned
    .filter((ao) => permittedOfficeIds.has(ao.id))
    .sort((a, b) => a.officeName.localeCompare(b.officeName));

  const permittedGlobal = allGlobal
    .filter((go) => permittedOfficeIds.has(go.id))
    .sort((a, b) => a.officeName.localeCompare(b.officeName));

  return {
    assignedOffices: permittedAssigned,
    globalOffices: permittedGlobal,
    offices: [...permittedAssigned, ...permittedGlobal],
  };
}
