import type { LeadFormValues } from "@/features/lead/data/lead.data";

export type AccessRoleRow = {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  userCount: number;
  permissions: string[];
  menuPermissions: string[];
};

export type PermissionRow = {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
};

export type UserAccessRow = {
  id: string;
  name: string;
  email: string;
  phone: string;
  image: string;
  role: string;
  roleId: string | null;
  departmentId: string | null;
  department: string;
  officeLocationId: string | null;
  officeLocation: string;
  supervisorUserId: string | null;
  supervisorName: string;
  status: "Active" | "Inactive";
  lastLogin: string;
  createdDate: string;
  createdBy: string;
};

export type SessionAccess = {
  id: string;
  name: string | null;
  email: string;
  role: string;
  legacyRole: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin: boolean;
};

export type RolePayload = {
  name: string;
  description: string;
  isActive: boolean;
};

export type RolePermissionPayload = {
  permissionCodes: string[];
};

export type UserPayload = {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  image?: string;
  departmentId?: string | null;
  officeLocationId?: string | null;
  supervisorUserId?: string | null;
  isActive?: boolean;
  roleId?: string | null;
};

export type UserPasswordResetPayload = {
  password: string;
};

export type RoleOption = {
  id: string;
  name: string;
};

export type DepartmentRow = {
  id: string;
  name: string;
  createdDate: string;
};

export type DepartmentPayload = {
  name: string;
};

export type OfficeLocationRow = {
  id: string;
  officeName: string;
  location: string;
  timezone: string;
  employees: number;
  createdDate: string;
};

export type OfficeLocationPayload = {
  officeName: string;
  location: string;
  timezone: string;
  employees: number;
};
