import type { NextAuthConfig } from "next-auth";

const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "LwohKo6gq7QYj4Y4MK5DdofKcFYdIrj8a31MbqkPJMS";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  secret: secret,
  trustHost: true,
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isAssignedOfficeUser = Boolean(auth?.user?.isAssignedOffice || auth?.user?.isAgency);
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnWorkspace = nextUrl.pathname.startsWith("/dashboard/assigned-office/workspace") || nextUrl.pathname.startsWith("/dashboard/assigned-office/sub-packages");
      const isOnLogin = nextUrl.pathname === "/login";

      if (isOnDashboard) {
        if (!isLoggedIn) return false;
        if (isAssignedOfficeUser && !isOnWorkspace) {
          return Response.redirect(new URL("/dashboard/assigned-office/workspace", nextUrl));
        }
        return true;
      } else if (isOnLogin && isLoggedIn) {
        if (isAssignedOfficeUser) {
          return Response.redirect(new URL("/dashboard/assigned-office/workspace", nextUrl));
        }
        const callbackUrl = nextUrl.searchParams.get("callbackUrl");
        if (callbackUrl) {
          try {
            const parsedUrl = new URL(callbackUrl, nextUrl);
            if (parsedUrl.origin === nextUrl.origin && !parsedUrl.pathname.startsWith("/login")) {
              return Response.redirect(parsedUrl);
            }
          } catch (e) {
            // Fallback to /dashboard
          }
        }
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
