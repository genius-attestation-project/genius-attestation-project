import { randomUUID } from "node:crypto";

import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

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
  DepartmentPayload,
  DepartmentRow,
  OfficeLocationPayload,
  OfficeLocationRow,
} from "@/features/admin/types/rbac.types";
import { prisma } from "@/lib/prisma";

const permissionCatalog = buildPermissionCatalog();
let bootstrapPromise: Promise<void> | null = null;
let rbacBootstrapped = false;
const ensuredAdminRolesSet = new Set<string>();
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
  permissionScopes?: Record<string, string>;
  isSuperAdmin?: boolean;
  allowedOfficeIds?: string[] | null;
  allowedOfficeNames?: string[] | null;
}): SessionAccess {
  const role = params.role ?? (params.legacyRole === "ADMIN" ? "Super Admin" : "User");
  const roles = params.roles ?? (role ? [role] : []);
  const permissions = params.permissions ?? [];
  const permissionScopes = params.permissionScopes ?? {};
  const isSuperAdmin = params.isSuperAdmin ?? (role === "Super Admin" || role === "Admin");

  return {
    id: params.userId,
    name: params.name,
    email: params.email,
    role,
    legacyRole: params.legacyRole,
    roles,
    permissions,
    permissionScopes,
    isSuperAdmin,
    allowedOfficeIds: params.allowedOfficeIds ?? null,
    allowedOfficeNames: params.allowedOfficeNames ?? null,
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

function mapDepartment(department: {
  id: string;
  name: string;
  createdAt: Date;
}): DepartmentRow {
  return {
    id: department.id,
    name: department.name,
    createdDate: formatDate(department.createdAt),
  };
}

function mapOfficeLocation(officeLocation: {
  id: string;
  officeName: string;
  location: string;
  timezone: string;
  employees: number;
  createdAt: Date;
}): OfficeLocationRow {
  return {
    id: officeLocation.id,
    officeName: officeLocation.officeName,
    location: officeLocation.location,
    timezone: officeLocation.timezone,
    employees: officeLocation.employees,
    createdDate: formatDate(officeLocation.createdAt),
  };
}

async function assertUniqueDepartmentName(
  ownerAdminId: string,
  name: string,
  departmentId?: string,
) {
  const duplicates = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM departments
    WHERE owner_admin_id = ${ownerAdminId}
      AND LOWER(name) = LOWER(${name})
      AND (${departmentId ?? ""} = '' OR id <> ${departmentId ?? ""})
    LIMIT 1
  `;

  if (duplicates.length > 0) {
    throw new Error("A department with this name already exists.");
  }
}

async function assertUniqueOfficeName(
  ownerAdminId: string,
  officeName: string,
  officeLocationId?: string,
) {
  const duplicates = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM office_locations
    WHERE owner_admin_id = ${ownerAdminId}
      AND LOWER(office_name) = LOWER(${officeName})
      AND (${officeLocationId ?? ""} = '' OR id <> ${officeLocationId ?? ""})
    LIMIT 1
  `;

  if (duplicates.length > 0) {
    throw new Error("An office location with this name already exists.");
  }
}

export async function ensureRbacBootstrap() {
  if (rbacBootstrapped) return;
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
        rbacBootstrapped = true;
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
  if (ensuredAdminRolesSet.has(ownerAdminId)) return;
  await ensureRbacBootstrap();

  for (const definition of defaultRoleDefinitions) {
    const roleName = definition.name;
    let role = await prisma.accessRole.findFirst({
      where: {
        name: roleName,
        ownerAdminId,
      },
    });

    if (!role) {
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
            roleId: role.id,
            permissionId: permission.id,
          })),
          skipDuplicates: true,
        });
      }
    }
  }
  ensuredAdminRolesSet.add(ownerAdminId);
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
  const permissionCodes: string[] = [];
  const permissionScopes: Record<string, string> = {};

  for (const item of role.rolePermissions) {
    const code = item.permission.code;
    permissionCodes.push(code);
    permissionScopes[code] = (item as any).scope ?? "All";
  }

  permissionCodes.sort();

  return {
    id: role.id,
    name: role.name,
    description: role.description ?? "",
    isActive: role.isActive,
    userCount: role.users.length,
    permissions: permissionCodes.filter((code: string) => !code.startsWith("menu.")),
    permissionScopes,
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

export async function setRolePermissions(ownerAdminId: string, roleId: string, permissionCodes: string[], permissionScopes?: Record<string, string>) {
  await ensureAdminRoles(ownerAdminId);

  const role = await prisma.accessRole.findFirst({
    where: { id: roleId, ownerAdminId },
    select: { id: true },
  });

  if (!role) return null;

  const permissions = await prisma.permission.findMany({
    where: { code: { in: permissionCodes } },
    select: { id: true, code: true },
  });

  await prisma.rolePermission.deleteMany({ where: { roleId } });

  if (permissions.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissions.map((permission: { id: string; code: string }) => ({
        roleId,
        permissionId: permission.id,
        scope: permissionScopes?.[permission.code] ?? "All",
      })),
      skipDuplicates: true,
    });
  }

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
  const departmentName = user.departmentRef?.name ?? user.departmentName ?? "-";
  const officeLocationName =
    user.officeLocationRef?.officeName ?? user.officeLocationName ?? "-";
  const supervisorName = user.supervisorRef?.name ?? user.supervisorRef?.email ?? "-";
  const monthlySalary = user.monthlySalary?.toString() ?? "0";

  return {
    id: user.id,
    name: user.name ?? "Workspace User",
    email: user.email,
    phone: user.phone ?? "-",
    image: user.image ?? "",
    role: roleName,
    roleId: user.roleId,
    departmentId: user.departmentId ?? null,
    department: departmentName,
    officeLocationId: user.officeLocationId ?? null,
    officeLocation: officeLocationName,
    supervisorUserId: user.supervisorUserId ?? null,
    supervisorName,
    monthlySalary,
    status: user.isActive ? "Active" : "Inactive",
    lastLogin: formatRelativeTime(user.lastLoginAt),
    createdDate: formatDate(user.createdAt),
    createdBy: user.createdBy ?? user.ownerAdminId ?? "-",
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
      departmentRef: { select: { id: true, name: true } },
      officeLocationRef: { select: { id: true, officeName: true } },
      supervisorRef: { select: { id: true, name: true, email: true } },
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
      departmentRef: { select: { id: true, name: true } },
      officeLocationRef: { select: { id: true, officeName: true } },
      supervisorRef: { select: { id: true, name: true, email: true } },
    },
  });

  return user ? mapUser(user) : null;
}

async function findDepartmentById(ownerAdminId: string, departmentId?: string | null) {
  if (!departmentId) {
    return null;
  }

  return prisma.department.findFirst({
    where: { id: departmentId, ownerAdminId },
    select: { id: true, name: true },
  });
}

async function findOfficeLocationById(ownerAdminId: string, officeLocationId?: string | null) {
  if (!officeLocationId) {
    return null;
  }

  return prisma.officeLocation.findFirst({
    where: { id: officeLocationId, ownerAdminId },
    select: { id: true, officeName: true },
  });
}

async function findSupervisorById(ownerAdminId: string, supervisorUserId?: string | null) {
  if (!supervisorUserId) {
    return null;
  }

  return prisma.user.findFirst({
    where: {
      id: supervisorUserId,
      isActive: true,
      OR: [{ ownerAdminId }, { id: ownerAdminId }],
    },
    select: { id: true, name: true, email: true },
  });
}

function assertScopedLookup<T>(record: T | null, label: string, requestedId?: string | null) {
  if (requestedId && !record) {
    throw new Error(`${label} not found.`);
  }
}

async function ensureEmailAvailable(email: string, userId?: string) {
  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existingUser && existingUser.id !== userId) {
    throw new Error("A user with this email already exists.");
  }
}

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function createUser(ownerAdminId: string, payload: UserPayload) {
  await ensureAdminRoles(ownerAdminId);
  await ensureEmailAvailable(payload.email);

  if (!payload.password) {
    throw new Error("Password is required.");
  }

  let roleId = payload.roleId;

  if (!roleId) {
    const staffRole = await prisma.accessRole.findFirst({
      where: { name: "Staff", ownerAdminId },
      select: { id: true },
    });
    if (staffRole) roleId = staffRole.id;
  }

  const [department, officeLocation, supervisor, passwordHash] = await Promise.all([
    findDepartmentById(ownerAdminId, payload.departmentId),
    findOfficeLocationById(ownerAdminId, payload.officeLocationId),
    findSupervisorById(ownerAdminId, payload.supervisorUserId),
    hashPassword(payload.password),
  ]);

  assertScopedLookup(department, "Department", payload.departmentId);
  assertScopedLookup(officeLocation, "Office location", payload.officeLocationId);
  assertScopedLookup(supervisor, "Supervisor", payload.supervisorUserId);

  const user = await prisma.user.create({
    data: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      image: payload.image || null,
      passwordHash,
      legacyPasswordHash: null,
      departmentId: department?.id ?? null,
      departmentName: department?.name ?? null,
      officeLocationId: officeLocation?.id ?? null,
      officeLocationName: officeLocation?.officeName ?? null,
      monthlySalary: new Prisma.Decimal(payload.monthlySalary ?? 0),
      supervisorUserId: supervisor?.id ?? null,
      isActive: payload.isActive ?? true,
      ownerAdminId,
      createdBy: ownerAdminId,
      roleId,
    },
    include: {
      role: { select: { id: true, name: true } },
      departmentRef: { select: { id: true, name: true } },
      officeLocationRef: { select: { id: true, officeName: true } },
      supervisorRef: { select: { id: true, name: true, email: true } },
    },
  });

  return getUserById(ownerAdminId, user.id);
}

export async function setUserRole(ownerAdminId: string, userId: string, roleId: string) {
  const [user, role] = await Promise.all([
    prisma.user.findFirst({
      where: { id: userId, ownerAdminId },
      select: { id: true },
    }),
    prisma.accessRole.findFirst({
      where: { id: roleId, ownerAdminId },
      select: { id: true },
    }),
  ]);

  if (!user || !role) return null;

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

  await ensureEmailAvailable(payload.email, userId);

  const [department, officeLocation, supervisor, passwordHash] = await Promise.all([
    findDepartmentById(ownerAdminId, payload.departmentId),
    findOfficeLocationById(ownerAdminId, payload.officeLocationId),
    findSupervisorById(ownerAdminId, payload.supervisorUserId),
    payload.password ? hashPassword(payload.password) : Promise.resolve<string | null>(null),
  ]);

  assertScopedLookup(department, "Department", payload.departmentId);
  assertScopedLookup(officeLocation, "Office location", payload.officeLocationId);
  assertScopedLookup(supervisor, "Supervisor", payload.supervisorUserId);



  await prisma.user.update({
    where: { id: userId },
    data: {
      name: payload.name,
      email: payload.email,
      phone: payload.phone || null,
      image: payload.image || null,
      passwordHash: passwordHash ?? undefined,
      legacyPasswordHash: passwordHash ? null : undefined,
      departmentId: department?.id ?? null,
      departmentName: department?.name ?? null,
      officeLocationId: officeLocation?.id ?? null,
      officeLocationName: officeLocation?.officeName ?? null,
      monthlySalary: new Prisma.Decimal(payload.monthlySalary ?? 0),
      supervisorUserId: supervisor?.id ?? null,
      isActive: payload.isActive ?? true,
      roleId: payload.roleId,
    },
  });

  return getUserById(ownerAdminId, userId);
}

export async function resetUserPassword(ownerAdminId: string, userId: string, password: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, ownerAdminId },
    select: { id: true },
  });

  if (!user) return null;

  const passwordHash = await hashPassword(password);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      legacyPasswordHash: null,
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

  try {
    await (prisma as any).refreshToken.deleteMany({
      where: { userId },
    });
  } catch (e) {
    console.error("[deleteUser] Error cleaning up refresh tokens:", e);
  }

  try {
    await (prisma as any).session.deleteMany({
      where: { userId },
    });
  } catch (e) {
    console.error("[deleteUser] Error cleaning up database sessions:", e);
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  return true;
}

export async function listDepartments(ownerAdminId: string) {
  const departments = await prisma.department.findMany({
    where: { ownerAdminId },
    orderBy: { createdAt: "desc" },
  });

  return departments.map(mapDepartment);
}

export async function createDepartment(ownerAdminId: string, payload: DepartmentPayload) {
  await assertUniqueDepartmentName(ownerAdminId, payload.name);

  const department = await prisma.department.create({
    data: {
      name: payload.name,
      ownerAdminId,
    },
  });

  return mapDepartment(department);
}

export async function updateDepartment(
  ownerAdminId: string,
  departmentId: string,
  payload: DepartmentPayload,
) {
  await assertUniqueDepartmentName(ownerAdminId, payload.name, departmentId);

  const existing = await prisma.department.findFirst({
    where: { id: departmentId, ownerAdminId },
  });

  if (!existing) return null;

  const department = await prisma.department.update({
    where: { id: departmentId },
    data: { name: payload.name },
  });

  await prisma.user.updateMany({
    where: { ownerAdminId, departmentId },
    data: { departmentName: payload.name },
  });

  return mapDepartment(department);
}

export async function deleteDepartment(ownerAdminId: string, departmentId: string) {
  const deletedCount = await prisma.$transaction(async (tx) => {
    await tx.user.updateMany({
      where: { ownerAdminId, departmentId },
      data: {
        departmentId: null,
        departmentName: null,
      },
    });

    return tx.$executeRaw`
      DELETE FROM departments
      WHERE id = ${departmentId} AND owner_admin_id = ${ownerAdminId}
    `;
  });

  return deletedCount > 0;
}

export async function listOfficeLocations(ownerAdminId: string): Promise<OfficeLocationRow[]> {
  const officeLocations = await prisma.$queryRaw<Array<{
    id: string;
    officeName: string;
    location: string;
    timezone: string;
    employees: number;
    createdAt: Date;
  }>>`
    SELECT
      id,
      office_name AS "officeName",
      location,
      timezone,
      employees,
      created_at AS "createdAt"
    FROM office_locations
    WHERE owner_admin_id = ${ownerAdminId}
    ORDER BY created_at DESC
  `;

  return officeLocations.map(mapOfficeLocation);
}

export async function createOfficeLocation(
  ownerAdminId: string,
  payload: OfficeLocationPayload,
) {
  await assertUniqueOfficeName(ownerAdminId, payload.officeName);

  const officeLocation = await prisma.officeLocation.create({
    data: {
      officeName: payload.officeName,
      location: payload.location,
      timezone: payload.timezone,
      employees: payload.employees,
      ownerAdminId,
    },
  });

  return mapOfficeLocation(officeLocation);
}

export async function updateOfficeLocation(
  ownerAdminId: string,
  officeLocationId: string,
  payload: OfficeLocationPayload,
) {
  const existingOfficeLocation = await prisma.officeLocation.findFirst({
    where: { id: officeLocationId, ownerAdminId },
    select: { id: true, officeName: true },
  });

  if (!existingOfficeLocation) return null;

  await assertUniqueOfficeName(ownerAdminId, payload.officeName, officeLocationId);

  const officeLocation = await prisma.officeLocation.update({
    where: { id: officeLocationId },
    data: {
      officeName: payload.officeName,
      location: payload.location,
      timezone: payload.timezone,
      employees: payload.employees,
    },
  });

  if (existingOfficeLocation.officeName !== payload.officeName) {
    await prisma.user.updateMany({
      where: { ownerAdminId, officeLocationId },
      data: { officeLocationName: payload.officeName },
    });
  }

  return mapOfficeLocation(officeLocation);
}

export async function deleteOfficeLocation(ownerAdminId: string, officeLocationId: string) {
  const [officeLocation] = await prisma.$queryRaw<Array<{
    id: string;
    officeName: string;
  }>>`
    SELECT id, office_name AS "officeName"
    FROM office_locations
    WHERE id = ${officeLocationId} AND owner_admin_id = ${ownerAdminId}
    LIMIT 1
  `;

  if (!officeLocation) return false;

  await prisma.$transaction([
    prisma.user.updateMany({
      where: { ownerAdminId, officeLocationId },
      data: {
        officeLocationId: null,
        officeLocationName: null,
      },
    }),
    prisma.$executeRaw`
      DELETE FROM office_locations
      WHERE id = ${officeLocationId} AND owner_admin_id = ${ownerAdminId}
    `,
  ]);

  return true;
}

export function expandEffectivePermissions(keys: string[]): string[] {
  const result = new Set<string>(keys);

  for (const key of keys) {
    // 1. Revenue Registration
    if (key.startsWith("revenue_registration.")) {
      result.add("revenue_registration.view");
      result.add("menu.revenue-registration");
      if (key === "revenue_registration.import") {
        result.add("revenue_registration.downloadTemplate");
        result.add("revenue_registration.viewImportHistory");
      }
    }

    // 2. Home
    if (key.startsWith("home.")) {
      result.add("home.view");
      result.add("menu.home");

      if (key === "home.document_in_hand.view") {
        result.add("home.view");
      } else if (key === "home.document_in_hand.transfer") {
        result.add("home.transfer");
      } else if (key === "home.inbound.view") {
        result.add("home.view");
      } else if (key === "home.inbound.receive") {
        result.add("home.receive");
      } else if (key === "home.inbound.return") {
        result.add("home.return");
      } else if (key === "home.outbound.view") {
        result.add("home.view");
      } else if (key === "home.outbound.retrieve") {
        result.add("home.retrieve");
      } else if (key === "home.movement_history.view") {
        result.add("movement_history.view");
        result.add("document_movement.view");
      }
    }

    // 3. Process
    if (key.startsWith("process.")) {
      result.add("process.view");
      result.add("menu.process");

      if (key === "process.document_in_hand.view") {
        result.add("process.view");
      } else if (key === "process.document_in_hand.transfer") {
        result.add("process.transfer");
      } else if (key === "process.document_in_hand.actions") {
        result.add("process.create");
        result.add("process.edit");
        result.add("process.move");
        result.add("process.complete");
      } else if (key === "process.inbound.view") {
        result.add("process.view");
      } else if (key === "process.inbound.receive") {
        result.add("process.receive");
      } else if (key === "process.inbound.return") {
        result.add("process.return");
      } else if (key === "process.outbound.view") {
        result.add("process.view");
      } else if (key === "process.outbound.retrieve") {
        result.add("process.retrieve");
      } else if (key === "process.bundle_movement.view") {
        result.add("document_movement.view");
      }
    }

    // 4. Ready For Delivery
    if (key.startsWith("ready_for_delivery.")) {
      result.add("ready_for_delivery.view");
      result.add("menu.ready-for-delivery");
      if (key === "ready_for_delivery.deliver") {
        result.add("ready_for_delivery.undo");
        result.add("ready_for_delivery.view_details");
      }
    }

    // 5. Welcome Call
    if (key.startsWith("welcome_call.")) {
      result.add("welcome_call.view");
      result.add("menu.welcome-call");
    }

    // 6. Lead Management
    if (
      key.startsWith("leads.") ||
      key.startsWith("followups.") ||
      key.startsWith("assigned_leads.") ||
      key.startsWith("lob.") ||
      key.startsWith("closed_leads.") ||
      key.startsWith("lead_management.")
    ) {
      result.add("lead_management.view");
      result.add("menu.lead-management");

      if (key.startsWith("leads.")) {
        result.add("leads.view");
        result.add("menu.lead-management.all-leads");
      } else if (key.startsWith("followups.")) {
        result.add("followups.view");
        result.add("menu.lead-management.followups");
      } else if (key.startsWith("assigned_leads.")) {
        result.add("assigned_leads.view");
        result.add("menu.lead-management.assign-leads");
      } else if (key.startsWith("lob.")) {
        result.add("lob.view");
        result.add("menu.lead-management.lob");
      } else if (key.startsWith("closed_leads.")) {
        result.add("closed_leads.view");
        result.add("menu.lead-management.closed");
      }
    }

    // 7. Pending Approval
    if (key.startsWith("pending_approval.")) {
      result.add("pending_approval.view");
      result.add("menu.lead-management.pending-approval");
    }

    // 8. Search / Report
    if (key.startsWith("search_report.")) {
      result.add("search_report.view");
      result.add("menu.search-report");
      result.add("menu.search-report.general");
    }

    // 9. Reports & Analytics
    if (key.startsWith("reports.")) {
      result.add("reports.view");
      result.add("menu.reports");
    }

    // 10. BM Report
    if (key.startsWith("bm_report.")) {
      result.add("bm_report.view");
      result.add("menu.bm-report");
    }

    // 11. Assigned Office
    if (key.startsWith("assigned_office.")) {
      result.add("assigned_office.view");
      result.add("menu.assigned-office");
    }

    // 12. Account Modules
    if (key.startsWith("account_panel.")) {
      result.add("account_panel.view");
      result.add("menu.account-panel");
    }
    if (key.startsWith("account_statements.")) {
      result.add("account_statements.view");
      result.add("menu.account-statements");
    }

    // 13. Attendance
    if (key.startsWith("attendance.")) {
      result.add("attendance.view");
      result.add("menu.attendance");
      if (key === "attendance.view") {
        result.add("menu.attendance.dashboard");
        result.add("menu.attendance.records");
      } else if (key.startsWith("attendance.check_out.") || key.startsWith("attendance.checkout.")) {
        result.add("attendance.check_out.view");
        result.add("menu.attendance.checkout");
      } else if (key === "attendance.summary.create") {
        result.add("menu.attendance.daily-summary");
      } else if (key === "attendance.summary.view") {
        result.add("menu.attendance.daily-summary-approval");
        result.add("menu.attendance.approval");
      }
    }
    if (key.startsWith("attendance_settings.")) {
      result.add("attendance.view");
      result.add("menu.attendance");
      result.add("menu.attendance.settings");
    }

    // 14. Leave Management
    if (key.startsWith("leave.")) {
      result.add("leave.view");
      result.add("menu.leave-management");
      if (key === "leave.create") {
        result.add("menu.leave-management.apply");
      } else if (key === "leave.view") {
        result.add("menu.leave-management.requests");
      } else if (key === "leave.approve") {
        result.add("menu.leave-management.approval");
      } else if (key === "leave.report") {
        result.add("menu.leave-management.reports");
      }
    }

    // 15. Salary Management
    if (key.startsWith("salary.")) {
      result.add("salary.view");
      result.add("menu.salary-management");
      if (key === "salary.view") {
        result.add("menu.salary-management.dashboard");
      } else if (key === "salary.calculate") {
        result.add("menu.salary-management.calculator");
      } else if (key === "salary.generate") {
        result.add("menu.salary-management.monthly-payroll");
      } else if (key === "salary.report") {
        result.add("menu.salary-management.reports");
      }
    }

    // 16. Master Configuration
    if (key.startsWith("master_configuration.") || key.startsWith("account_menu.")) {
      result.add("master_configuration.view");
      result.add("menu.master-configuration");
      if (key.startsWith("account_menu.")) {
        result.add("account_menu.view");
        result.add("menu.master-configuration.account-menu");
      }
      if (key.startsWith("master_configuration.")) {
        result.add("menu.master-configuration.document-types");
        result.add("menu.master-configuration.document-type-categories");
        result.add("menu.master-configuration.attestation-types");
        result.add("menu.master-configuration.sub-process");
        result.add("menu.master-configuration.customer-types");
        result.add("menu.master-configuration.corporate-details");
        result.add("menu.master-configuration.payment-mode");
        result.add("menu.master-configuration.courier-companies");
      }
    }

    // 17. Admin Management
    if (key.startsWith("users.")) {
      result.add("users.view");
      result.add("admin_management.view");
      result.add("menu.admin-management");
      result.add("menu.admin-management.users");
    }
    if (key.startsWith("departments.")) {
      result.add("departments.view");
      result.add("admin_management.view");
      result.add("menu.admin-management");
      result.add("menu.admin-management.department");
    }
    if (key.startsWith("office_locations.")) {
      result.add("office_locations.view");
      result.add("admin_management.view");
      result.add("menu.admin-management");
      result.add("menu.admin-management.office-location");
    }
    if (key.startsWith("roles.")) {
      result.add("roles.view");
      result.add("admin_management.view");
      result.add("menu.admin-management");
      result.add("menu.admin-management.roles");
    }
  }

  return Array.from(result);
}

export const PERMISSION_CONFIGURED_SENTINEL = "__user_permissions_configured__";

export async function getSessionAccess(userId: string): Promise<SessionAccess | null> {
  const [user, userPermRows, officeVisRows] = await Promise.all([
    prisma.user.findUnique({
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
    }),
    prisma.userPermission.findMany({
      where: { userId },
      select: { permissionKey: true },
    }),
    prisma.userOfficeVisibility.findMany({
      where: { userId },
      include: {
        officeLocation: { select: { id: true, officeName: true } },
      },
    }),
  ]);

  if (!user) return null;

  const ownerAdminId = user.ownerAdminId ?? user.id;

  if (!rbacBootstrapped || !ensuredAdminRolesSet.has(ownerAdminId)) {
    try {
      await ensureAdminRoles(ownerAdminId);
    } catch (error) {
      console.error("[rbac] Role sync failed before session access lookup.", { userId, error });
    }
  }

  const isOwner = user.ownerAdminId === user.id || !user.ownerAdminId;
  const isSuperAdmin = isOwner || user.role?.name === "Super Admin";
  const roleName = isOwner ? "Super Admin" : (user.role?.name ?? "User");
  
  const permissions: string[] = [];
  const permissionScopes: Record<string, string> = {};

  if (isSuperAdmin) {
    permissions.push("*");
  } else {
    let rawKeys: string[] = [];
    const isExplicitlyConfigured = userPermRows.length > 0;

    if (isExplicitlyConfigured) {
      // User permissions have been explicitly configured by Super Admin.
      // Use ONLY explicit permissions (excluding sentinel). Do NOT fall back to role defaults!
      rawKeys = userPermRows
        .map((up) => up.permissionKey)
        .filter((k) => k !== PERMISSION_CONFIGURED_SENTINEL);
    } else if (user.role?.rolePermissions) {
      // Fallback to role permissions ONLY for unconfigured users
      rawKeys = user.role.rolePermissions.map((rp) => rp.permission.code);
    }

    const expanded = expandEffectivePermissions(rawKeys);
    for (const code of expanded) {
      permissions.push(code);
      permissionScopes[code] = "All";
    }
  }

  const allowedOfficeIds = isSuperAdmin ? null : officeVisRows.map((v) => v.officeLocationId);
  const allowedOfficeNames = isSuperAdmin ? null : officeVisRows.map((v) => v.officeLocation.officeName);

  const access = buildSafeSessionAccess({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: roleName,
    legacyRole: "USER",
    roles: [roleName],
    permissions,
    permissionScopes,
    isSuperAdmin,
    allowedOfficeIds,
    allowedOfficeNames,
  });

  return access;
}

export function hasOfficeAccess(
  access: SessionAccess | { isSuperAdmin?: boolean; allowedOfficeIds?: string[] | null; allowedOfficeNames?: string[] | null } | null | undefined,
  officeIdOrName?: string | null,
): boolean {
  if (!access) return false;
  if (access.isSuperAdmin || access.allowedOfficeIds === null || access.allowedOfficeNames === null) return true;
  if (!officeIdOrName) return false;
  return (
    (access.allowedOfficeIds ?? []).includes(officeIdOrName) ||
    (access.allowedOfficeNames ?? []).includes(officeIdOrName)
  );
}

export function hasPermission(
  access: SessionAccess | { permissions: string[]; isSuperAdmin?: boolean } | null | undefined,
  code: string,
): boolean {
  if (!access) return false;
  if (access.isSuperAdmin) {
    return true;
  }
  if (!Array.isArray(access.permissions)) {
    return false;
  }
  if (access.permissions.includes(code) || access.permissions.includes("*")) {
    return true;
  }

  const expandedRequested = expandEffectivePermissions([code]);
  return expandedRequested.some((exp) => access.permissions.includes(exp));
}

export function getPermissionScope(
  access: SessionAccess | { isSuperAdmin?: boolean; permissionScopes?: Record<string, string> } | null | undefined,
  code: string,
): string {
  if (!access) return "None";
  if (access.isSuperAdmin) {
    return "All";
  }
  return access.permissionScopes?.[code] ?? "None";
}

export function filterNavigationByPermissions(
  items: NavigationItemDefinition[],
  permissions: string[],
  isSuperAdmin = false,
): NavigationItemDefinition[] {
  return items.flatMap((item) => {
    if (item.superAdminOnly && !isSuperAdmin) {
      return [];
    }

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


