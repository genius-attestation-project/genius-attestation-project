import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      roles: string[];
      permissions: string[];
      isSuperAdmin: boolean;
      legacyRole: string;
      ownerAdminId?: string;
      officeLocationId?: string;
      officeLocationName?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    roles?: string[];
    permissions?: string[];
    isSuperAdmin?: boolean;
    legacyRole?: string;
    role?: string;
    ownerAdminId?: string;
    officeLocationId?: string;
    officeLocationName?: string;
  }
}
