

import {
  buildPermissionCatalog,
  defaultRoleDefinitions,
  permissionModules,
  sidebarNavigation,
  type NavigationItemDefinition,
} from "@/features/admin/data/rbac.data";
import type {
  AccessRoleRow,
  PermissionRow,
  RoleOption,
  RolePayload,
  SessionAccess,
  UserAccessRow,
  UserPayload,
} from "@/features/admin/types/rbac.types";
import { prisma } from "@/lib/prisma";

const permissionCatalog = buildPermissionCatalog();
let bootstrapPromise: Promise<void> | null = null;
const safeDashboardNavigation = [sidebarNavigation[0]].filter(Boolean);

type RoleRecord = Awaited<ReturnType<typeof fetchRolesFromDb>>[number];

function rbacLog(message: string, payload?: Record<string, unknown>) {
  console.info("[rbac]", message, payload ?? {});
}

function buildSafeSessionAccess(params: {
  userId: string;
  email: string;
  name: string | null;
  legacyRole: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
}): SessionAccess {
  const role = params.role ?? (params.legacyRole === "ADMIN" ? "Super Admin" : "User");
  const roles = params.roles ?? (role ? [role] : []);
  const permissions = params.permissions ?? [];
  const isSuperAdmin = params.isSuperAdmin ?? (role === "Super Admin" || role === "Admin");

  return {
    id: params.userId,
    name: params.name,
    email: params.email,
    role,
    legacyRole: params.legacyRole,
    roles,
    permissions,
    isSuperAdmin,
  };
}

function formatRelativeTime(date: Date | null) {
  if (!date) return "Never";
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(1, Math.round(diffMs / (1000 * 60)));
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;
  const diffDays = Math.round(diffHours / 24);
  return diffDays === 1 ? "Yesterday" : `${diffDays} days ago`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function ensureRbacBootstrap() {
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        for (const permission of permissionCatalog) {
          await prisma.permission.upsert({
            where: { code: permission.code },
            update: {
              name: permission.name,
              module: permission.module,
              description: permission.description,
            },
            create: permission,
          });
        }
      } catch (error) {
        console.error("[rbac] Failed to bootstrap RBAC data.", error);
        throw error;
      } finally {
        bootstrapPromise = null;
      }
    })();
  }
  await bootstrapPromise;
}

// Ensure default roles exist for a specific admin workspace
export async function ensureAdminRoles(ownerAdminId: string) {
  await ensureRbacBootstrap();

  for (const definition of defaultRoleDefinitions) {
    const roleName = definition.name;
    const existing = await prisma.accessRole.findFirst({
      where: {
        name: roleName,
        ownerAdminId,
      },
    });

    if (!existing) {
      let role;
      try {
        role = await prisma.accessRole.create({
          data: {
            name: roleName,
            description: definition.description,
            isActive: definition.isActive,
            ownerAdminId,
          },
        });
      } catch (error: any) {
        if (error.code === "P2002") {
          // Race condition: another request already created the role, fetch it
          role = await prisma.accessRole.findFirst({
            where: { name: roleName, ownerAdminId },
          });
        } else {
          throw error;
        }
      }

      if (role) {
        const permissions =
          definition.permissions === "*"
            ? await prisma.permission.findMany({ select: { id: true } })
            : await prisma.permission.findMany({
                where: { code: { in: [...definition.permissions] } },
                select: { id: true },
              });

        if (permissions.length > 0) {
          await prisma.rolePermission.createMany({
            data: permissions.map((permission: { id: string }) => ({
              roleId: role!.id,
              permissionId: permission.id,
            })),
            skipDuplicates: true,
          });
        }
      }
    }
  }
}

async function fetchRolesFromDb(ownerAdminId: string) {
  await ensureAdminRoles(ownerAdminId);

  return prisma.accessRole.findMany({
    where: { ownerAdminId },
    orderBy: { createdAt: "asc" },
    include: {
      users: { select: { id: true } },
      rolePermissions: {
        include: {
          permission: { select: { code: true } },
        },
      },
    },
  });
}

function mapRole(role: RoleRecord): AccessRoleRow {
  const permissionCodes = role.rolePermissions.map((item: { permission: { code: string } }) => item.permission.code).sort();

  return {
    id: role.id,
    name: role.name,
    description: role.description ?? "",
    isActive: role.isActive,
    userCount: role.users.length,
    permissions: permissionCodes.filter((code: string) => !code.startsWith("menu.")),
    menuPermissions: permissionCodes.filter((code: string) => code.startsWith("menu.")),
  };
}

export async function listRoles(ownerAdminId: string) {
  const roles = await fetchRolesFromDb(ownerAdminId);
  return roles.map(mapRole);
}

export async function listRoleOptions(ownerAdminId: string): Promise<RoleOption[]> {
  const roles = await prisma.accessRole.findMany({
    where: { isActive: true, ownerAdminId },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return roles;
}

export async function listPermissions(): Promise<PermissionRow[]> {
  await ensureRbacBootstrap();

  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { code: "asc" }],
  });

  return permissions.map((permission: { id: string; code: string; name: string; module: string; description: string | null }) => ({
    id: permission.id,
    code: permission.code,
    name: permission.name,
    module: permission.module,
    description: permission.description ?? "",
  }));
}

export async function createRole(ownerAdminId: string, payload: RolePayload) {
  await ensureAdminRoles(ownerAdminId);

  const role = await prisma.accessRole.create({
    data: {
      name: payload.name,
      description: payload.description || null,
      isActive: payload.isActive,
      ownerAdminId,
    },
    include: {
      users: { select: { id: true } },
      rolePermissions: { include: { permission: { select: { code: true } } } },
    },
  });

  return mapRole(role);
}

export async function updateRole(ownerAdminId: string, roleId: string, payload: RolePayload) {
  await ensureAdminRoles(ownerAdminId);

  const existingRole = await prisma.accessRole.findFirst({
    where: { id: roleId, ownerAdminId },
    select: { id: true },
  });

  if (!existingRole) return null;

  const role = await prisma.accessRole.update({
    where: { id: roleId },
    data: {
      name: payload.name,
      description: payload.description || null,
      isActive: payload.isActive,
    },
    include: {
      users: { select: { id: true } },
      rolePermissions: { include: { permission: { select: { code: true } } } },
    },
  });

  return mapRole(role);
}

export async function deleteRole(ownerAdminId: string, roleId: string) {
  await ensureAdminRoles(ownerAdminId);

  const existingRole = await prisma.accessRole.findFirst({
    where: { id: roleId, ownerAdminId },
  });

  if (!existingRole) return false;

  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.accessRole.delete({ where: { id: roleId } });

  return true;
}

export async function setRolePermissions(ownerAdminId: string, roleId: string, permissionCodes: string[]) {
  await ensureAdminRoles(ownerAdminId);

  const role = await prisma.accessRole.findFirst({
    where: { id: roleId, ownerAdminId },
    select: { id: true },
  });

  if (!role) return null;

  const permissions = await prisma.permission.findMany({
    where: { code: { in: permissionCodes } },
    select: { id: true },
  });

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { roleId } }),
    prisma.rolePermission.createMany({
      data: permissions.map((permission: { id: string }) => ({
        roleId,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    }),
  ]);

  const updatedRole = await prisma.accessRole.findUnique({
    where: { id: roleId },
    include: {
      users: { select: { id: true } },
      rolePermissions: { include: { permission: { select: { code: true } } } },
    },
  });

  return updatedRole ? mapRole(updatedRole) : null;
}

function mapUser(user: Awaited<ReturnType<typeof fetchUsersFromDb>>[number]): UserAccessRow {
  const isOwner = user.ownerAdminId === user.id;
  const roleName = isOwner ? "Super Admin" : (user.role?.name ?? "Staff");

  return {
    id: user.id,
    name: user.name ?? "Workspace User",
    email: user.email,
    role: roleName,
    roleId: user.roleId,
    department: user.department ?? "-",
    officeLocation: user.officeLocation ?? "-",
    status: user.isActive ? "Active" : "Inactive",
    lastLogin: formatRelativeTime(user.lastLoginAt),
    createdDate: formatDate(user.createdAt),
  };
}

async function fetchUsersFromDb(ownerAdminId: string) {
  return prisma.user.findMany({
    where: {
      OR: [
        { ownerAdminId },
        { id: ownerAdminId }, // Ensure admin can see themselves
      ]
    },
    orderBy: { createdAt: "desc" },
    include: {
      role: { select: { id: true, name: true } },
    },
  });
}

export async function listUsers(ownerAdminId: string) {
  const users = await fetchUsersFromDb(ownerAdminId);
  return users.map(mapUser);
}

export async function getUserById(ownerAdminId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      OR: [
        { ownerAdminId },
        { id: ownerAdminId },
      ]
    },
    include: {
      role: { select: { id: true, name: true } },
    },
  });

  return user ? mapUser(user) : null;
}

export async function createUser(ownerAdminId: string, payload: UserPayload) {
  await ensureAdminRoles(ownerAdminId);
  
  let roleId = payload.roleId;

  if (!roleId) {
    const staffRole = await prisma.accessRole.findFirst({
      where: { name: "Staff", ownerAdminId },
      select: { id: true },
    });
    if (staffRole) roleId = staffRole.id;
  }

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      department: payload.department || null,
      officeLocation: payload.officeLocation || null,
      isActive: payload.isActive ?? true,
      ownerAdminId,
      createdBy: ownerAdminId,
      roleId,
    },
    include: {
      role: { select: { id: true, name: true } },
    },
  });

  return getUserById(ownerAdminId, user.id);
}

export async function setUserRole(ownerAdminId: string, userId: string, roleId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ownerAdminId },
    select: { id: true },
  });

  if (!user) return null;

  await prisma.user.update({
    where: { id: userId },
    data: { roleId },
  });

  return getUserById(ownerAdminId, userId);
}

export async function updateUser(ownerAdminId: string, userId: string, payload: UserPayload) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ownerAdminId },
    select: { id: true },
  });

  if (!user) return null;

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: payload.name,
      email: payload.email,
      department: payload.department || null,
      officeLocation: payload.officeLocation || null,
      isActive: payload.isActive ?? true,
      roleId: payload.roleId,
    },
  });

  return getUserById(ownerAdminId, userId);
}

export async function deleteUser(ownerAdminId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ownerAdminId },
    select: { id: true },
  });

  if (!user || user.id === ownerAdminId) {
    return false; // Cannot delete oneself or unauthorized
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return true;
}

export async function getSessionAccess(userId: string): Promise<SessionAccess | null> {
  try {
    await ensureRbacBootstrap();
  } catch (error) {
    console.error("[rbac] Bootstrap failed before session access lookup.", { userId, error });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: { select: { code: true } } },
          },
        },
      },
    },
  });

  if (!user) return null;

  const isOwner = user.ownerAdminId === user.id && user.provider === "google";
  
  // Super Admin always has access to everything
  const isSuperAdmin = isOwner;
  const roleName = isOwner ? "Super Admin" : (user.role?.name ?? "User");
  
  const permissions = isSuperAdmin 
    ? [] // We handle super admin access directly in hasPermission
    : (user.role?.rolePermissions.map((rp: { permission: { code: string } }) => rp.permission.code) ?? []);

  const access = buildSafeSessionAccess({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: roleName,
    legacyRole: "USER",
    roles: [roleName],
    permissions,
    isSuperAdmin,
  });

  return access;
}

export function hasPermission(access: SessionAccess | { permissions: string[]; isSuperAdmin?: boolean }, code: string) {
  if (access.isSuperAdmin) {
    return true;
  }
  return access.permissions.includes(code);
}

export function filterNavigationByPermissions(
  items: NavigationItemDefinition[],
  permissions: string[],
  isSuperAdmin = false,
): NavigationItemDefinition[] {
  return items.flatMap((item) => {
    const visibleChildren = item.children
      ? filterNavigationByPermissions(item.children, permissions, isSuperAdmin)
      : undefined;
    const canSeeSelf =
      isSuperAdmin ||
      permissions.includes(item.menuPermission) ||
      permissions.includes(item.pagePermission);
    const canSeeByChildren = Boolean(visibleChildren && visibleChildren.length > 0);

    if (!canSeeSelf && !canSeeByChildren) return [];

    return [
      {
        ...item,
        children: visibleChildren,
      },
    ];
  });
}

export async function getSidebarNavigationForUser(userId: string) {
  const access = await getSessionAccess(userId);

  if (!access) return safeDashboardNavigation;

  const navigation = filterNavigationByPermissions(
    sidebarNavigation,
    Array.isArray(access.permissions) ? access.permissions : [],
    access.isSuperAdmin,
  );

  return navigation.length === 0 ? safeDashboardNavigation : navigation;
}

export function getPermissionModules() {
  return permissionModules;
}
