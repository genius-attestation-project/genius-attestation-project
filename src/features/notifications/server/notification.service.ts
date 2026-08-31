import { prisma } from "@/lib/prisma";

export async function createNotification(args: {
  userId: string;
  title: string;
  message: string;
  type: string;
  referenceId?: string;
  referenceType?: string;
  ownerAdminId: string;
}) {
  return prisma.notification.create({
    data: {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      referenceId: args.referenceId,
      referenceType: args.referenceType,
      ownerAdminId: args.ownerAdminId,
    },
  });
}

export async function listNotifications(userId: string, ownerAdminId: string, limit = 50) {
  return prisma.notification.findMany({
    where: {
      userId,
      ownerAdminId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadNotificationCount(userId: string, ownerAdminId: string) {
  return prisma.notification.count({
    where: {
      userId,
      ownerAdminId,
      isRead: false,
    },
  });
}

export async function markNotificationAsRead(id: string, userId: string, ownerAdminId: string) {
  return prisma.notification.updateMany({
    where: { id, userId, ownerAdminId },
    data: { isRead: true },
  });
}

export async function markAllNotificationsAsRead(userId: string, ownerAdminId: string) {
  return prisma.notification.updateMany({
    where: { userId, ownerAdminId, isRead: false },
    data: { isRead: true },
  });
}
