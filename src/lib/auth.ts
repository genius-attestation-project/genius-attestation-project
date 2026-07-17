// import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

import { getSessionAccess } from "@/features/admin/server/rbac.service";
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

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        const passwordHash = user?.passwordHash ?? user?.legacyPasswordHash;

        if (!passwordHash || !user?.isActive) {
          authDebugLog("Login blocked because user is missing password or inactive.", {
            email: parsed.data.email,
            hasPassword: Boolean(passwordHash),
            isActive: user?.isActive ?? null,
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

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        authDebugLog("Credentials login authorized.", {
          userId: user.id,
          email: user.email,
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
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
  // adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  secret: env.authSecret,
  trustHost: true,
  debug: process.env.NODE_ENV === "development",
  pages: {
    signIn: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user, account }) {
      try {
        if (account?.provider === "google") {
          const denyGoogleLogin = () => "/login?error=AccessDenied";

          if (!user.email) {
            authDebugLog("Google login failed: no email provided.");
            console.log("Google email:", user.email);
            console.log("DB user:", undefined);
            console.log("DB role:", undefined);
            console.log("Active:", undefined);
            return denyGoogleLogin();
          }

          const existingUser = await prisma.user.findUnique({
            where: { email: user.email },
            include: {
              role: true,
            },
          });

          console.log("Google email:", user.email);
          console.log("DB user:", existingUser?.email);
          console.log("DB role:", existingUser?.role?.name);
          console.log("Active:", existingUser?.isActive);

          if (!existingUser) {
            authDebugLog("Google login denied: user not registered.", { email: user.email });
            return denyGoogleLogin();
          }

          if (!existingUser.isActive) {
            authDebugLog("Google login denied: user is inactive.", { email: user.email });
            return denyGoogleLogin();
          }

          if (existingUser.role?.name !== "Super Admin") {
            authDebugLog("Google login denied: user is not a Super Admin.", {
              email: user.email,
              role: existingUser.role?.name ?? null,
            });
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

          authDebugLog("Google admin login authorized.", { email: user.email });
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
      const isUpdate = trigger === "update";
      const needsRefresh = !token.id;

      if (!isInitialSignIn && !isUpdate && !needsRefresh) {
        return token;
      }

      try {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            ownerAdminId: true,
            officeLocationId: true,
            officeLocationName: true,
          },
        });

        if (!dbUser) {
          return token;
        }

        const access = await getSessionAccess(dbUser.id);

        token.id = dbUser.id;
        token.name = dbUser.name;
        token.email = dbUser.email;
        token.picture = dbUser.image;

        token.role = access?.role ?? "User";
        token.legacyRole = access?.legacyRole ?? "USER";
        token.isSuperAdmin = access?.isSuperAdmin ?? false;

        token.ownerAdminId = dbUser.ownerAdminId;
        token.officeLocationId = dbUser.officeLocationId;
        token.officeLocationName = dbUser.officeLocationName;

        token.roles = access?.roles ?? [];
        token.permissions = access?.permissions ?? [];

        return token;
      } catch (error) {
        console.error("[auth] jwt callback failed", { email: token.email, error });
        return token;
      }
    },
    async session({ session, token }) {
      try {
        if (session.user && token.id) {
          session.user.id = String(token.id);
        }

        if (session.user) {
          session.user.role =
            typeof token.role === "string" ? token.role : "User";

          session.user.legacyRole =
            typeof token.legacyRole === "string"
              ? token.legacyRole
              : "USER";

          session.user.isSuperAdmin =
            typeof token.isSuperAdmin === "boolean"
              ? token.isSuperAdmin
              : false;

          // ADD THESE
          session.user.roles = Array.isArray(token.roles)
            ? token.roles
            : [];

          session.user.permissions = Array.isArray(token.permissions)
            ? token.permissions
            : [];
        }

        return session;
      } catch (error) {
        console.error("[auth] session callback failed", error);
        return session;
      }
    },
  },
});
