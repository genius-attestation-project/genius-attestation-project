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
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard");
      const isOnLogin = nextUrl.pathname === "/login";

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false;
      } else if (isOnLogin && isLoggedIn) {
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
