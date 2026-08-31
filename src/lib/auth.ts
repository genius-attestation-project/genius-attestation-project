// import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { authConfig } from "@/auth.config";
import { getSessionAccess } from "@/features/admin/server/rbac.service";
import { createRefreshTokenRecord, setRefreshTokenCookie } from "@/features/auth/server/refresh-token.service";
import { env } from "@/config/env";
import { loginSchema } from "@/features/auth/validations/auth.schema";
import { prisma } from "@/lib/prisma";

function authDebugLog(message: string, payload?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[auth]", message, payload ?? {});
}

const providers = [
  Credentials({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      try {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          authDebugLog("Credentials payload failed validation.");
          return null;
        }

        let user: any = await (prisma as any).user.findUnique({
          where: { email: parsed.data.email },
          include: {
            officeLocationRef: true,
          },
        });

        let isAgency = false;
        let isAssignedOffice = false;
        let isAssignedOfficeTableUser = false;

        if (!user) {
          user = await (prisma as any).assignedOffice.findUnique({
            where: { email: parsed.data.email },
          });
          if (!user) {
            user = await (prisma as any).assignedOffice.findUnique({
              where: { username: parsed.data.email },
            });
          }
          if (user) {
            isAssignedOffice = true;
            isAgency = true;
            isAssignedOfficeTableUser = true;
          }
        }

        if (!user) {
          user = await (prisma as any).assignedAgency.findUnique({
            where: { email: parsed.data.email },
          });
          if (!user) {
            user = await (prisma as any).assignedAgency.findUnique({
              where: { username: parsed.data.email },
            });
          }
          if (user) isAgency = true;
        }

        const passwordHash = user?.passwordHash ?? user?.legacyPasswordHash;
        const isActive = isAssignedOfficeTableUser ? (user?.status ?? user?.isActive) : user?.isActive;

        if (!passwordHash || !isActive) {
          authDebugLog("Login blocked because user is missing password or inactive.", {
            email: parsed.data.email,
            hasPassword: Boolean(passwordHash),
            isActive: isActive ?? null,
          });
          return null;
        }

        const passwordMatches = await bcrypt.compare(
          parsed.data.password,
          passwordHash,
        );

        if (!passwordMatches) {
          authDebugLog("Login blocked because password did not match.", {
            email: parsed.data.email,
          });
          return null;
        }

        const officeLocationId = user?.officeLocationId ?? user?.officeLocationRef?.id ?? null;
        const officeLocationName = user?.officeLocationRef?.officeName ?? user?.officeLocationName ?? null;
        const region = user?.officeLocationRef?.location ?? officeLocationName ?? null;
        if (!isAssignedOfficeTableUser && user) {
          isAssignedOffice = Boolean(officeLocationId || user.officeLocationRef || officeLocationName);
        }

        if (isAssignedOfficeTableUser) {
          await (prisma as any).assignedOffice.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });
        } else if (isAgency) {
          await (prisma as any).assignedAgency.update({
            where: { id: user.id },
            data: { lastLogin: new Date() },
          });
        } else {
          await (prisma as any).user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          });
        }

        console.info("[auth] Credentials login authorized.", {
          "user.id": user.id,
          userId: user.id,
          email: user.email,
          officeLocationId: officeLocationId,
          "officeLocation.name": officeLocationName,
          officeLocationName: officeLocationName,
          region: region,
          isAssignedOffice: isAssignedOffice,
        });

        return {
          id: user.id,
          name: (isAssignedOfficeTableUser || isAgency) ? user.username : user.name,
          email: user.email,
          image: (isAssignedOfficeTableUser || isAgency) ? null : user.image,
          isAgency,
          isAssignedOffice,
          accountType: isAssignedOfficeTableUser ? "ASSIGNED_OFFICE" : (isAgency ? "AGENCY" : undefined),
          ownerAdminId: user.ownerAdminId,
          officeLocationId,
          officeLocationName,
        } as any;
      } catch (error) {
        console.error("[auth] Credentials authorize failed", error);
        return null;
      }
    },
  }),
  ...(env.googleClientId && env.googleClientSecret
    ? [
      Google({
        clientId: env.googleClientId,
        clientSecret: env.googleClientSecret,
      }),
    ]
    : []),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  secret: env.authSecret,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async signIn({ user, account }) {
      try {
        if (account?.provider === "google") {
          const denyGoogleLogin = () => "/login?error=AccessDenied";

          if (!user.email) {
            authDebugLog("Google login failed: no email provided.");
            return denyGoogleLogin();
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: {
              role: true,
            },
          });

          if (!existingUser || !existingUser.isActive || existingUser.role?.name !== "Super Admin") {
            return denyGoogleLogin();
          }

          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: user.name ?? existingUser.name,
              image: user.image ?? existingUser.image,
              lastLoginAt: new Date(),
            },
          });

          return true;
        }

        return true;
      } catch (error) {
        console.error("[auth] signIn callback failed", error);
        return "/login?error=AuthCallbackFailure";
      }
    },
    async jwt({ token, user, trigger }) {
      if (!token.email) {
        return token;
      }

      const isInitialSignIn = !!user;

      // Create refresh token record and set HttpOnly cookie on initial sign-in
      if (isInitialSignIn && user?.id) {
        try {
          const { rawToken, expiresAt } = await createRefreshTokenRecord({
            userId: user.id,
          });
          await setRefreshTokenCookie(rawToken, expiresAt);
          console.info("[auth] Issued Refresh Token cookie on initial sign-in:", { userId: user.id });
        } catch (refErr) {
          console.error("[auth] Failed to set refresh token cookie on initial sign-in", refErr);
        }
      }

      try {
        if (user && (user as any).accountType === "ASSIGNED_OFFICE") {
          token.id = user.id;
          token.name = user.name;
          token.email = user.email;
          token.isAgency = true;
          token.isAssignedOffice = true;
          token.officeId = user.id;
          token.assignedOfficeId = user.id;
          token.accountType = "ASSIGNED_OFFICE";
          token.ownerAdminId = (user as any).ownerAdminId;
          token.role = "AssignedOffice";
          token.isSuperAdmin = false;
          token.roles = ["AssignedOffice"];

          console.info("[auth] JWT Payload (AssignedOffice):", {
            "user.id": token.id,
            email: token.email,
            isAssignedOffice: token.isAssignedOffice,
            accountType: token.accountType,
          });
          return token;
        }

        if (user && (user as any).accountType === "AGENCY") {
          token.id = user.id;
          token.name = user.name;
          token.email = user.email;
          token.isAgency = true;
          token.isAssignedOffice = false;
          token.accountType = "AGENCY";
          token.ownerAdminId = (user as any).ownerAdminId;
          return token;
        }

        if (token.accountType === "ASSIGNED_OFFICE") {
          const office = await (prisma as any).assignedOffice.findUnique({
            where: { id: String(token.id) },
            select: { id: true, status: true },
          });

          if (!office || office.status === false) {
            console.warn("[auth] Invalidating session for deleted or inactive AssignedOffice:", { id: token.id });
            return {} as any;
          }

          return token;
        }

        if (token.accountType === "AGENCY") {
          const agency = await (prisma as any).assignedAgency.findUnique({
            where: { id: String(token.id) },
            select: { id: true, isActive: true, deletedAt: true },
          });

          if (!agency || !agency.isActive || agency.deletedAt) {
            console.warn("[auth] Invalidating session for deleted or inactive Agency:", { id: token.id });
            return {} as any;
          }

          return token;
        }

        const dbUser = await prisma.user.findUnique({
          where: token.id ? { id: String(token.id) } : { email: token.email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            isActive: true,
            ownerAdminId: true,
            officeLocationId: true,
            officeLocationName: true,
            officeLocationRef: {
              select: {
                id: true,
                officeName: true,
                location: true,
              },
            },
          },
        });

        if (!dbUser || !dbUser.isActive) {
          console.warn("[auth] Invalidating session for deleted or inactive user:", {
            email: token.email,
            id: token.id,
            userExists: Boolean(dbUser),
            isActive: dbUser?.isActive ?? false,
          });
          return {} as any;
        }

        const access = await getSessionAccess(dbUser.id);

        const officeLocationId = dbUser.officeLocationId ?? dbUser.officeLocationRef?.id ?? null;
        const officeLocationName = dbUser.officeLocationRef?.officeName ?? dbUser.officeLocationName ?? null;
        const region = dbUser.officeLocationRef?.location ?? officeLocationName ?? null;
        const isAssignedOffice = Boolean(officeLocationId || dbUser.officeLocationRef || officeLocationName);

        token.id = dbUser.id;
        token.name = dbUser.name;
        token.email = dbUser.email;
        token.picture = dbUser.image;

        token.role = access?.role ?? "User";
        token.legacyRole = access?.legacyRole ?? "USER";
        token.isSuperAdmin = access?.isSuperAdmin ?? false;

        token.ownerAdminId = dbUser.ownerAdminId;
        token.officeLocationId = officeLocationId;
        token.officeLocationName = officeLocationName;
        token.isAssignedOffice = isAssignedOffice;
        token.roles = access?.roles ?? [];

        // Omit full permissions array from JWT token to prevent cookie bloat (stored in DB, fetched on demand in session callback)

        console.info("[auth] JWT Payload (Slimmed):", {
          "user.id": dbUser.id,
          email: dbUser.email,
          role: token.role,
          officeLocationId: officeLocationId,
          isAssignedOffice: isAssignedOffice,
        });

        return token;
      } catch (error) {
        console.error("[auth] jwt callback failed", { email: token.email, error });
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (!token || !token.id || !token.email) {
          console.info("[auth] Session callback returning empty session for invalidated token.");
          return {
            ...session,
            user: undefined as any,
          };
        }
        if (session.user && token.id) {
          session.user.id = String(token.id);
        }

        if (session.user) {
          session.user.name =
            typeof token.name === "string" ? token.name : session.user.name;

          session.user.email =
            typeof token.email === "string" ? token.email : session.user.email;

          session.user.image =
            typeof token.picture === "string" ? token.picture : session.user.image;

          session.user.isAgency =
            typeof token.isAgency === "boolean" ? token.isAgency : false;

          session.user.isAssignedOffice =
            typeof token.isAssignedOffice === "boolean" ? token.isAssignedOffice : false;

          (session.user as any).accountType =
            typeof token.accountType === "string" ? token.accountType : undefined;

          (session.user as any).assignedOfficeId =
            typeof token.assignedOfficeId === "string" ? token.assignedOfficeId : token.officeId;

          session.user.officeId =
            typeof token.officeId === "string" ? token.officeId : undefined;

          session.user.role =
            typeof token.role === "string" ? token.role : "User";

          session.user.legacyRole =
            typeof token.legacyRole === "string"
              ? token.legacyRole
              : "USER";

          session.user.ownerAdminId =
            typeof token.ownerAdminId === "string"
              ? token.ownerAdminId
              : undefined;

          session.user.officeLocationId =
            typeof token.officeLocationId === "string"
              ? token.officeLocationId
              : undefined;

          session.user.officeLocationName =
            typeof token.officeLocationName === "string"
              ? token.officeLocationName
              : undefined;

          session.user.roles = Array.isArray(token.roles)
            ? token.roles
            : [];

          session.user.isSuperAdmin =
            typeof token.isSuperAdmin === "boolean"
              ? token.isSuperAdmin
              : false;

          // Load real-time session access permissions for server-side evaluation
          if (token.id && token.accountType !== "ASSIGNED_OFFICE") {
            const access = await getSessionAccess(String(token.id));
            if (access) {
              session.user.permissions = access.permissions;
              session.user.roles = access.roles;
              session.user.isSuperAdmin = access.isSuperAdmin;
              session.user.allowedOfficeIds = access.allowedOfficeIds;
              session.user.allowedOfficeNames = access.allowedOfficeNames;
            } else {
              session.user.permissions = [];
              session.user.allowedOfficeIds = [];
              session.user.allowedOfficeNames = [];
            }
          } else if (token.accountType === "ASSIGNED_OFFICE") {
            session.user.permissions = ["menu.assigned-office", "assigned_office.view"];
            session.user.allowedOfficeIds = null;
            session.user.allowedOfficeNames = null;
          } else {
            session.user.permissions = [];
            session.user.allowedOfficeIds = [];
            session.user.allowedOfficeNames = [];
          }

          console.info("[auth] Session Payload:", {
            "user.id": session.user.id,
            email: session.user.email,
            role: session.user.role,
            permissionCount: session.user.permissions.length,
            isAssignedOffice: session.user.isAssignedOffice,
          });
        }

        return session;
      } catch (error) {
        console.error("[auth] session callback failed", error);
        return session;
      }
    },
  },
});

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user as any;
}
