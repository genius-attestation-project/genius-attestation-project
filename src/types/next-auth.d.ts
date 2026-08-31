import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      roles: string[];
      permissions: string[];
      permissionScopes: Record<string, string>;
      isSuperAdmin: boolean;
      legacyRole: string;
      ownerAdminId?: string;
      officeLocationId?: string;
      officeLocationName?: string;
      isLocked?: boolean;
      lockReason?: string;
      isAgency?: boolean;
      isAssignedOffice?: boolean;
      officeId?: string;
      allowedOfficeIds?: string[] | null;
      allowedOfficeNames?: string[] | null;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: string[];
    permissions?: string[];
    permissionScopes?: Record<string, string>;
    isSuperAdmin?: boolean;
    legacyRole?: string;
    role?: string;
    ownerAdminId?: string;
    officeLocationId?: string;
    officeLocationName?: string;
    isLocked?: boolean;
    lockReason?: string;
    isAgency?: boolean;
    isAssignedOffice?: boolean;
    officeId?: string;
  }
}
