import type { NextAuthConfig } from "next-auth";
import { env } from "@/config/env";

const secret = env.authSecret;

export const authConfig = {
  basePath: "/api/auth",
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: secret,
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAssignedOfficePortalUser = Boolean(
        (auth?.user as any)?.accountType === "ASSIGNED_OFFICE" ||
        auth?.user?.role === "AssignedOffice"
      );
      const officeId = (auth?.user as any)?.assignedOfficeId || auth?.user?.officeId || auth?.user?.id;
      const workspacePath = officeId
        ? `/dashboard/assigned-office/workspace?officeId=${officeId}`
        : `/dashboard/assigned-office/workspace`;

      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnWorkspace = nextUrl.pathname.startsWith("/dashboard/assigned-office");
      const isOnLogin = nextUrl.pathname === "/login";

      console.info("[auth] Middleware authorized check:", {
        path: nextUrl.pathname,
        isLoggedIn,
        userId: auth?.user?.id ?? null,
        isAssignedOffice: auth?.user?.isAssignedOffice ?? false,
        accountType: (auth?.user as any)?.accountType ?? null,
      });

      if (isOnDashboard) {
        if (!isLoggedIn) {
          console.info("[auth] Middleware decision: Redirecting unauthenticated user to login.", {
            destination: "/login",
          });
          return false;
        }
        if (isAssignedOfficePortalUser && !isOnWorkspace) {
          console.info("[auth] Middleware decision: Redirecting AssignedOffice portal user to workspace.", {
            destination: workspacePath,
          });
          return Response.redirect(new URL(workspacePath, nextUrl));
        }
        return true;
      } else if (isOnLogin && isLoggedIn) {
        if (nextUrl.searchParams.has("callbackUrl") || nextUrl.searchParams.has("error")) {
          console.info("[auth] Middleware decision: Allowing /login render due to callbackUrl or error param.", {
            path: nextUrl.pathname,
            searchParams: nextUrl.search,
          });
          return true;
        }

        if (isAssignedOfficePortalUser) {
          console.info("[auth] Middleware decision: Redirecting logged-in AssignedOffice portal user from login.", {
            destination: workspacePath,
          });
          return Response.redirect(new URL(workspacePath, nextUrl));
        }

        console.info("[auth] Middleware decision: Redirecting logged-in user from login to dashboard.", {
          destination: "/dashboard",
        });
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
