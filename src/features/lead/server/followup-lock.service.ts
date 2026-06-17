import { FollowupStatus, LeadStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const FOLLOWUP_LOCK_MESSAGE =
  "Your account has been locked because a scheduled followup was missed. Please contact your supervisor.";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function lockUsersWithMissedFollowups(ownerAdminId?: string) {
  const todayStart = startOfToday();

  const missedLeads = await prisma.lead.findMany({
    where: {
      ...(ownerAdminId ? { ownerAdminId } : {}),
      nextFollowupAt: { lt: todayStart },
      followupCompleted: false,
      NOT: [
        { followupStatus: FollowupStatus.Completed },
        { leadStatus: { in: [LeadStatus.Closed, LeadStatus.LOB] } },
      ],
    },
    orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "asc" }],
    select: {
      id: true,
      ownerAdminId: true,
      createdById: true,
      assignedUserId: true,
      nextFollowupAt: true,
    },
  });

  const lockedUserIds = new Set<string>();

  for (const lead of missedLeads) {
    const userId = lead.assignedUserId ?? lead.createdById;
    if (!userId || lockedUserIds.has(userId)) {
      continue;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });

    if (!user || user.isLocked) {
      continue;
    }

    const isSuperAdmin = user.role?.name === "Super Admin";
    const isOwner = !user.ownerAdminId || user.id === user.ownerAdminId;
    const isSelfSupervised = user.supervisorUserId === user.id;
    const noSupervisor = !user.supervisorUserId;

    if (isSuperAdmin || isOwner || isSelfSupervised || noSupervisor) {
      continue;
    }

    const startOfCurrentDay = startOfToday();
    if (user.unlockedAt && user.unlockedAt >= startOfCurrentDay) {
      continue;
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        isLocked: true,
        lockReason: FOLLOWUP_LOCK_MESSAGE,
        lockedAt: new Date(),
        lockedFollowupLeadId: lead.id,
        lockedFollowupAt: lead.nextFollowupAt,
        unlockedBy: null,
        unlockReason: null,
        unlockedAt: null,
      },
    });

    lockedUserIds.add(userId);
  }

  return lockedUserIds.size;
}

export async function getUserLockState(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      isLocked: true,
      lockReason: true,
      supervisorUserId: true,
      ownerAdminId: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });
}

export async function listMissedFollowupLocks(args: {
  ownerAdminId: string;
  viewerId: string;
  isSuperAdmin?: boolean;
}) {
  await lockUsersWithMissedFollowups(args.isSuperAdmin ? undefined : args.ownerAdminId);

  const users = await prisma.user.findMany({
    where: {
      isLocked: true,
      ...(args.isSuperAdmin
        ? {}
        : {
            OR: [
              { ownerAdminId: args.ownerAdminId },
              { id: args.ownerAdminId },
            ],
          }),
      ...(args.isSuperAdmin ? {} : { supervisorUserId: args.viewerId }),
    },
    orderBy: [{ lockedAt: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      officeLocationName: true,
      officeLocationRef: {
        select: {
          officeName: true,
          location: true,
        },
      },
      lockedAt: true,
      lockedFollowupAt: true,
      lockedFollowupLeadId: true,
    },
  });

  const leadIds = users
    .map((user) => user.lockedFollowupLeadId)
    .filter((value): value is string => Boolean(value));
  const leads = leadIds.length
    ? await prisma.lead.findMany({
        where: { id: { in: leadIds } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          leadCode: true,
        },
      })
    : [];
  const leadMap = new Map(leads.map((lead) => [lead.id, lead]));

  return users.map((user) => {
    const lead = user.lockedFollowupLeadId ? leadMap.get(user.lockedFollowupLeadId) : null;

    return {
      userId: user.id,
      userName: user.name?.trim() || user.email,
      userEmail: user.email,
      officeLocation:
        user.officeLocationName?.trim() ||
        [user.officeLocationRef?.officeName, user.officeLocationRef?.location]
          .filter(Boolean)
          .join(" - ") ||
        "-",
      leadName: lead
        ? `${[lead.firstName, lead.lastName].filter(Boolean).join(" ")} (${lead.leadCode})`
        : "-",
      missedFollowupDate: user.lockedFollowupAt?.toISOString() ?? null,
      lockedDate: user.lockedAt?.toISOString() ?? null,
    };
  });
}

export async function unlockMissedFollowupUser(args: {
  ownerAdminId: string;
  viewerId: string;
  userId: string;
  reason: string;
  isSuperAdmin?: boolean;
}) {
  const lockedUser = await prisma.user.findFirst({
    where: {
      id: args.userId,
      isLocked: true,
      ...(args.isSuperAdmin
        ? {}
        : {
            OR: [
              { ownerAdminId: args.ownerAdminId },
              { id: args.ownerAdminId },
            ],
          }),
      ...(args.isSuperAdmin ? {} : { supervisorUserId: args.viewerId }),
    },
    select: { id: true },
  });

  if (!lockedUser) {
    return null;
  }

  return prisma.user.update({
    where: { id: lockedUser.id },
    data: {
      isLocked: false,
      lockReason: null,
      lockedAt: null,
      lockedFollowupLeadId: null,
      lockedFollowupAt: null,
      unlockedBy: args.viewerId,
      unlockReason: args.reason,
      unlockedAt: new Date(),
    },
    select: { id: true },
  });
}
