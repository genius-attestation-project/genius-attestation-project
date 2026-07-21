import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

export async function GET() {
  try {
    const session = await requirePermission("communication.inbox", "/api/communication/inbox");
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { user } = session;
    const officeId = user.officeLocationId;
    
    if (!officeId) {
      return NextResponse.json({ message: "No office assigned to user." }, { status: 400 });
    }

    // 1. Fetch unread counts by tracking number
    // @ts-ignore: Stale IDE cache
    const unreadGroups = await prisma.documentCommunication.groupBy({
      by: ["trackingNumber"],
      where: {
        receiverOfficeId: officeId,
        isRead: false,
        ownerAdminId: user.ownerAdminId,
      },
      _count: {
        id: true,
      },
    });

    const unreadMap = new Map(
      unreadGroups.map((g: { trackingNumber: string; _count: { id: number } }) => [g.trackingNumber, g._count.id])
    );

    // 2. Fetch the latest messages for this office (either sent or received)
    // To get the latest per tracking number, we can fetch the most recent N messages and filter in code, 
    // or use a raw query. We'll use a Prisma workaround: fetch top 100 recent messages for the office.
    // @ts-ignore: Stale IDE cache
    const recentMessages = await prisma.documentCommunication.findMany({
      where: {
        ownerAdminId: user.ownerAdminId,
        OR: [
          { receiverOfficeId: officeId },
          { senderOfficeId: officeId },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
      include: {
        senderOffice: { select: { officeName: true } },
        receiverOffice: { select: { officeName: true } },
        registration: { select: { customerName: true } },
      },
    });

    // Group in memory to get the latest per tracking number
    const uniqueTrackingNumbers = new Set<string>();
    const conversations = [];

    for (const msg of recentMessages) {
      if (!uniqueTrackingNumbers.has(msg.trackingNumber)) {
        uniqueTrackingNumbers.add(msg.trackingNumber);
        
        conversations.push({
          id: msg.id,
          trackingNumber: msg.trackingNumber,
          customerName: msg.registration?.customerName ?? "Unknown",
          message: msg.message,
          senderOfficeName: msg.senderOffice?.officeName ?? "Unknown Office",
          receiverOfficeName: msg.receiverOffice?.officeName ?? "Unknown Office",
          createdAt: msg.createdAt,
          unreadCount: unreadMap.get(msg.trackingNumber) || 0,
        });
      }
    }

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[INBOX_GET]", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
