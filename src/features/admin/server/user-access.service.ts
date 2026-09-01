import { prisma } from "@/lib/prisma";
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
    select: { id: true, ownerAdminId: true },
  });

  if (!targetUser) {
    throw new Error("Target user not found or does not belong to your workspace.");
  }

  return targetUser;
}

/**
 * Returns list of assigned office location IDs for a user.
 */
export async function getUserOfficeVisibility(ownerAdminId: string, userId: string): Promise<string[]> {
  await assertUserInOwnerScope(ownerAdminId, userId);

  const visibilities = await prisma.userOfficeVisibility.findMany({
    where: { userId },
    select: { officeLocationId: true },
  });

  return visibilities.map((v) => v.officeLocationId);
}

/**
 * Saves assigned office location IDs for a target user.
 * Validates that all officeLocationIds belong to the current ownerAdminId scope.
 */
export async function setUserOfficeVisibility(
  ownerAdminId: string,
  targetUserId: string,
  officeLocationIds: string[],
): Promise<{ success: boolean; officeLocationIds: string[] }> {
  await assertUserInOwnerScope(ownerAdminId, targetUserId);

  // Validate that all supplied office location IDs belong to the ownerAdminId
  if (officeLocationIds.length > 0) {
    const validOffices = await prisma.officeLocation.findMany({
      where: {
        id: { in: officeLocationIds },
        ownerAdminId,
      },
      select: { id: true },
    });

    const validOfficeIds = new Set(validOffices.map((o) => o.id));
    const invalidIds = officeLocationIds.filter((id) => !validOfficeIds.has(id));

    if (invalidIds.length > 0) {
      throw new Error(`One or more selected office locations are invalid or unauthorized.`);
    }
  }

  // Atomically update user_office_visibility
  await prisma.$transaction(async (tx) => {
    await tx.userOfficeVisibility.deleteMany({
      where: { userId: targetUserId },
    });

    if (officeLocationIds.length > 0) {
      await tx.userOfficeVisibility.createMany({
        data: officeLocationIds.map((officeLocationId) => ({
          userId: targetUserId,
          officeLocationId,
        })),
        skipDuplicates: true,
      });
    }
  });

  return { success: true, officeLocationIds };
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
  permissionKeys: string[],
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
  targetUserId: string,
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
 * Lists all users for ownerAdminId with complete office visibility and module permissions data.
 */
export async function listUserAccessData(ownerAdminId: string) {
  const db = prisma as any;
  const [users, officeLocations, assignedOffices, visibilities, permissions] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [
          { ownerAdminId },
          { id: ownerAdminId },
        ],
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

  // Group office visibilities by userId
  const officeVisMap = new Map<string, string[]>();
  for (const v of visibilities) {
    const list = officeVisMap.get(v.userId) ?? [];
    list.push(v.officeLocationId);
    officeVisMap.set(v.userId, list);
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
    const isSuperAdmin = isOwner || u.role?.name === "Super Admin";
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

    return {
      id: u.id,
      name: u.name ?? "Workspace User",
      email: u.email,
      image: u.image ?? "",
      roleName: isOwner ? "Super Admin" : (u.role?.name ?? "User"),
      isActive: u.isActive,
      isSuperAdmin,
      hasUserPermissions: hasExplicitUserPermissions,
      officeLocationIds: officeVisMap.get(u.id) ?? [],
      permissionKeys: effectivePermissionKeys,
    };
  });

  const assignedOfficeIds = new Set((assignedOffices as any[]).map((ao: any) => ao.id));
  const assignedOfficeNames = new Set((assignedOffices as any[]).map((ao: any) => ao.username.toLowerCase()));

  const officeMap = new Map<
    string,
    {
      id: string;
      officeName: string;
      location: string;
      isProcessOffice?: boolean;
      isAssignedOffice: boolean;
      category: "ASSIGNED_OFFICE" | "GLOBAL_OFFICE";
    }
  >();

  for (const loc of officeLocations) {
    const isAssigned = assignedOfficeIds.has(loc.id) || assignedOfficeNames.has(loc.officeName.toLowerCase());
    const key = loc.officeName.toLowerCase();
    if (!officeMap.has(key) || isAssigned) {
      officeMap.set(key, {
        id: loc.id,
        officeName: loc.officeName,
        location: isAssigned ? (loc.location || "External Processing Office") : (loc.location || "Office Location"),
        isProcessOffice: loc.isProcessOffice,
        isAssignedOffice: isAssigned,
        category: isAssigned ? "ASSIGNED_OFFICE" : "GLOBAL_OFFICE",
      });
    }
  }

  for (const ao of (assignedOffices as any[])) {
    const key = ao.username.toLowerCase();
    if (!officeMap.has(key)) {
      officeMap.set(key, {
        id: ao.id,
        officeName: ao.username,
        location: "External Processing Office",
        isProcessOffice: true,
        isAssignedOffice: true,
        category: "ASSIGNED_OFFICE",
      });
    }
  }

  const formattedOffices = Array.from(officeMap.values()).sort((a, b) =>
    a.officeName.localeCompare(b.officeName)
  );

  return {
    users: mappedUsers,
    officeLocations: formattedOffices,
  };
}
