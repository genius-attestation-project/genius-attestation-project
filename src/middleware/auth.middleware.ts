import { redirect } from "next/navigation";

import { hasPermission } from "@/features/admin/server/rbac.service";
import { auth } from "@/lib/auth";

function isDynamicUsageError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    error.digest === "DYNAMIC_SERVER_USAGE"
  );
}

export async function requireAuth(callbackUrl = "/dashboard") {
  let session;

  try {
    session = await auth();
  } catch (error) {
    if (isDynamicUsageError(error)) {
      throw error;
    }

    console.error("[auth] Failed to resolve session in requireAuth.", {
      callbackUrl,
      error,
    });
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}&error=SessionFailure`);
  }

  if (!session?.user) {
    console.warn("[auth] Missing session user, redirecting to login.", { callbackUrl });
    redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  return session;
}

export async function requirePermission(permission: string, callbackUrl = "/dashboard") {
  const session = await requireAuth(callbackUrl);

  if (!hasPermission(session.user, permission)) {
    return null;
  }

  return session;
}

export async function requireApiPermission(permission: string) {
  let session;

  try {
    session = await auth();
  } catch (error) {
    if (isDynamicUsageError(error)) {
      throw error;
    }

    console.error("[auth] Failed to resolve session in requireApiPermission.", {
      permission,
      error,
    });
    return Response.json({ message: "Unable to validate session." }, { status: 500 });
  }

  if (!session?.user) {
    console.warn("[auth] API access denied because no session user was found.", { permission });
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  if (!hasPermission(session.user, permission)) {
    console.warn("[auth] API access denied because the permission was missing.", {
      permission,
      userId: session.user.id,
    });
    return Response.json({ message: "You do not have permission to perform this action." }, { status: 403 });
  }

  return null;
}
