// import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";

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
      const parsed = loginSchema.safeParse(credentials);

      if (!parsed.success) {
        authDebugLog("Credentials payload failed validation.");
        return null;
      }

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email },
      });

      if (!user?.password || !user.isActive) {
        authDebugLog("Login blocked because user is missing password or inactive.", {
          email: parsed.data.email,
          hasPassword: Boolean(user?.password),
          isActive: user?.isActive ?? null,
        });
        return null;
      }

      const passwordMatches = await bcrypt.compare(
        parsed.data.password,
        user.password,
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
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        if (!user.email) {
          authDebugLog("Google login failed: no email provided.");
          return false;
        }

        const existingUser = await prisma.user.findUnique({
          where: { email: user.email },
        });

        if (existingUser) {
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              name: user.name ?? existingUser.name,
              image: user.image ?? existingUser.image,
              lastLoginAt: new Date(),
              provider: "google",
              // Existing Google admin keeps their ownerAdminId = id
              ownerAdminId: existingUser.ownerAdminId || existingUser.id,
            },
          });
          authDebugLog("Updated existing Google user as ADMIN", { email: user.email });
        } else {
          // Create new user, then update ownerAdminId to be their own ID
          const newUser = await prisma.user.create({
            data: {
              email: user.email,
              name: user.name,
              image: user.image,
              provider: "google",
              isActive: true,
              lastLoginAt: new Date(),
            },
          });
          
          await prisma.user.update({
            where: { id: newUser.id },
            data: { ownerAdminId: newUser.id },
          });
          
          authDebugLog("Created new Google user as ADMIN", { email: user.email });
        }

        return true;
      }

      return true; // allow credentials login
    },
    async jwt({ token, user, account }) {
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          include: {
            role: true,
          }
        });

        if (dbUser) {
          token.id = dbUser.id;
          
          // Compute role
          let computedRole = "User";
          let computedLegacyRole = "USER";
          let isSuperAdmin = false;
          let permissions: string[] = [];
          
          if (dbUser.provider === "google" && dbUser.ownerAdminId === dbUser.id) {
            computedRole = "Super Admin";
            computedLegacyRole = "ADMIN";
            isSuperAdmin = true;
          } else if (dbUser.role) {
            computedRole = dbUser.role.name;
          }
          
          token.role = computedRole;
          token.legacyRole = computedLegacyRole;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.image;
          token.ownerAdminId = dbUser.ownerAdminId || undefined;
          
          token.roles = [computedRole];
          token.permissions = [];
          token.isSuperAdmin = isSuperAdmin;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = String(token.id);
      }

      if (session.user) {
        session.user.role = typeof token.role === "string" ? token.role : "User";
        session.user.legacyRole = typeof token.legacyRole === "string" ? token.legacyRole : "USER";
        session.user.name = typeof token.name === "string" ? token.name : session.user.name;
        session.user.email = typeof token.email === "string" ? token.email : session.user.email;
        session.user.image = typeof token.picture === "string" ? token.picture : session.user.image;
        session.user.ownerAdminId = typeof token.ownerAdminId === "string" ? token.ownerAdminId : undefined;
        
        session.user.roles = Array.isArray(token.roles) ? token.roles : [];
        session.user.permissions = Array.isArray(token.permissions) ? token.permissions : [];
        session.user.isSuperAdmin = typeof token.isSuperAdmin === "boolean" ? token.isSuperAdmin : false;
      }

      return session;
    },
  },
});
