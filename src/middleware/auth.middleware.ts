import { cache } from "react";
import { redirect } from "next/navigation";

import { hasPermission } from "@/features/admin/server/rbac.service";
import {
  FOLLOWUP_LOCK_MESSAGE,
  getUserLockState,
  lockUsersWithMissedFollowups,
} from "@/features/lead/server/followup-lock.service";
import { auth } from "@/lib/auth";
import { logServerError } from "@/lib/logger";

function isDynamicUsageError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    error.digest === "DYNAMIC_SERVER_USAGE"
  );
}

function canUserBeLocked(lockState: any, sessionUserId: string) {
  if (!lockState) return false;

  const isSuperAdmin = lockState.role?.name === "Super Admin";
  const isOwner = !lockState.ownerAdminId || lockState.ownerAdminId === sessionUserId;
  const isSelfSupervised = lockState.supervisorUserId === sessionUserId;
  const noSupervisor = !lockState.supervisorUserId;

  return !isSuperAdmin && !isOwner && !isSelfSupervised && !noSupervisor;
}

export const requireAuth = cache(async (callbackUrl = "/dashboard") => {
  let session;

  try {
    session = await auth();
  } catch (error: any) {
    // Next.js internal errors (like redirects, not-found, or dynamic usage) must be re-thrown
    if (
      error?.digest === "DYNAMIC_SERVER_USAGE" ||
      error?.message?.includes("DYNAMIC_SERVER_USAGE") ||
      error?.digest?.startsWith("NEXT_REDIRECT") ||
      error?.message?.includes("NEXT_REDIRECT")
    ) {
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

  await lockUsersWithMissedFollowups(session.user.ownerAdminId ?? session.user.id);
  const lockState = await getUserLockState(session.user.id);
  
  if (lockState?.isLocked && canUserBeLocked(lockState, session.user.id)) {
    return {
      ...session,
      user: {
        ...session.user,
        isLocked: true,
        lockReason: lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE,
      },
    };
  }

  return session;
});

export const requirePermission = cache(async (permission: string, callbackUrl = "/dashboard") => {
  const session = await requireAuth(callbackUrl);

  const isAssignedOfficeUser = Boolean(
    session.user?.isAssignedOffice ||
    (session.user as any)?.accountType === "ASSIGNED_OFFICE" ||
    session.user?.role === "AssignedOffice"
  );

  if (isAssignedOfficeUser) {
    const officeId = (session.user as any)?.assignedOfficeId || session.user?.officeId || session.user?.id;
    redirect(`/dashboard/assigned-office/workspace?officeId=${officeId}`);
  }

  if (!hasPermission(session.user, permission)) {
    return null;
  }

  return session;
});

export async function requireApiPermission(permission: string) {
  let session;

  try {
    session = await auth();
  } catch (error) {
    const errObj = error as any;
    if (
      errObj?.digest === "DYNAMIC_SERVER_USAGE" ||
      errObj?.message?.includes("DYNAMIC_SERVER_USAGE") ||
      errObj?.digest?.startsWith("NEXT_REDIRECT") ||
      errObj?.message?.includes("NEXT_REDIRECT")
    ) {
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

  await lockUsersWithMissedFollowups(session.user.ownerAdminId ?? session.user.id);
  const lockState = await getUserLockState(session.user.id);
  
  if (lockState?.isLocked && canUserBeLocked(lockState, session.user.id)) {
    return Response.json(
      { message: lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE },
      { status: 423 },
    );
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

export async function requireAnyApiPermission(permissions: string[]) {
  let session;

  try {
    session = await auth();
  } catch (error) {
    if (
      (error as any)?.digest === "DYNAMIC_SERVER_USAGE" ||
      (error as any)?.message?.includes("DYNAMIC_SERVER_USAGE") ||
      (error as any)?.digest?.startsWith("NEXT_REDIRECT") ||
      (error as any)?.message?.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }

    console.error("[auth] Failed to resolve session in requireAnyApiPermission.", {
      permissions,
      error,
    });
    return Response.json({ message: "Unable to validate session." }, { status: 500 });
  }

  if (!session?.user) {
    console.warn("[auth] API access denied because no session user was found.", { permissions });
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  await lockUsersWithMissedFollowups(session.user.ownerAdminId ?? session.user.id);
  const lockState = await getUserLockState(session.user.id);
  
  if (lockState?.isLocked && canUserBeLocked(lockState, session.user.id)) {
    return Response.json(
      { message: lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE },
      { status: 423 },
    );
  }

  const hasAccess = permissions.some((permission) => hasPermission(session.user!, permission));

  if (!hasAccess) {
    console.warn("[auth] API access denied because none of the required permissions were found.", {
      permissions,
      userId: session.user.id,
    });
    return Response.json({ message: "You do not have permission to perform this action." }, { status: 403 });
  }

  return null;
}

export async function requireApiAuth() {
  let session;

  try {
    session = await auth();
  } catch (error) {
    if (
      (error as any)?.digest === "DYNAMIC_SERVER_USAGE" ||
      (error as any)?.message?.includes("DYNAMIC_SERVER_USAGE") ||
      (error as any)?.digest?.startsWith("NEXT_REDIRECT") ||
      (error as any)?.message?.includes("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("[auth] Failed to resolve session in requireApiAuth.", { error });
    throw new Error("Unable to validate session.");
  }

  if (!session?.user) {
    throw new Error("Authentication required.");
  }

  await lockUsersWithMissedFollowups(session.user.ownerAdminId ?? session.user.id);
  const lockState = await getUserLockState(session.user.id);
  
  if (lockState?.isLocked && canUserBeLocked(lockState, session.user.id)) {
    throw new Error(lockState.lockReason ?? FOLLOWUP_LOCK_MESSAGE);
  }

  return session;
}
