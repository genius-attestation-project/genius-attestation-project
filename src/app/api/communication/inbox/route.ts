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

    // 1. Fetch the user's read states for fast unread comparison
    // @ts-ignore: Stale IDE cache
    const readStates = await prisma.documentReadState.findMany({
      where: {
        userId: user.id,
        ownerAdminId: user.ownerAdminId,
      },
      select: {
        trackingNumber: true,
        lastReadAt: true,
      },
    });

    const readStateMap = new Map(
      readStates.map((rs: { trackingNumber: string; lastReadAt: Date }) => [rs.trackingNumber, rs.lastReadAt])
    );

    // 2. Fetch recent unique conversations for this tenant
    // @ts-ignore: Stale IDE cache
    const recentMessages = await prisma.documentCommunication.findMany({
      where: {
        ownerAdminId: user.ownerAdminId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 200,
      include: {
        registration: { select: { customerName: true } },
      },
    });

    // Group in memory to get the latest per tracking number and count unreads
    const uniqueTrackingNumbers = new Set<string>();
    const conversationsMap = new Map<string, any>();

    for (const msg of recentMessages) {
      const lastRead = readStateMap.get(msg.trackingNumber) || new Date(0);
      const isUnread = msg.createdAt > lastRead && msg.senderUserId !== user.id;

      if (!uniqueTrackingNumbers.has(msg.trackingNumber)) {
        uniqueTrackingNumbers.add(msg.trackingNumber);
        
        conversationsMap.set(msg.trackingNumber, {
          id: msg.id,
          trackingNumber: msg.trackingNumber,
          customerName: msg.registration?.customerName ?? "Unknown",
          message: msg.message,
          createdAt: msg.createdAt,
          unreadCount: isUnread ? 1 : 0,
        });
      } else if (isUnread) {
        // Increment unread count for this conversation
        const conv = conversationsMap.get(msg.trackingNumber);
        conv.unreadCount += 1;
      }
    }

    const conversations = Array.from(conversationsMap.values());

    return NextResponse.json({ conversations });
  } catch (error) {
    console.error("[INBOX_GET]", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
