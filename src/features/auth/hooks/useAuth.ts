"use client";

import { useSession } from "next-auth/react";

export function useAuth() {
  const session = useSession();

  return {
    user: session.data?.user ?? null,
    isAuthenticated: session.status === "authenticated",
    isLoading: session.status === "loading",
  };
}
