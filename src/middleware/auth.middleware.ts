import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

export async function requireAuth(callbackUrl = "/dashboard") {
  const session = await auth();

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}
