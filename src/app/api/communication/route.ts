import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

export async function POST(request: NextRequest) {
  try {
    // Basic auth check
    const session = await requirePermission("communication.comment", `/api/communication`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { user } = session;
    const senderOfficeId = user.officeLocationId;
    
    if (!senderOfficeId) {
      return NextResponse.json({ message: "No office assigned to user." }, { status: 400 });
    }

    const body = await request.json();
    const { trackingNumber, message, type, parentId } = body;

    if (!trackingNumber || !message || !type) {
      return NextResponse.json({ message: "Missing required fields." }, { status: 400 });
    }

    if (type !== "Comment" && type !== "Reply" && type !== "Forward") {
      return NextResponse.json({ message: "Invalid message type." }, { status: 400 });
    }

    // Attempt to find Registration to link it
    const registration = await prisma.registration.findUnique({
      where: {
        trackingNumber: trackingNumber,
        ownerAdminId: user.ownerAdminId,
      },
      select: { id: true },
    });

    // @ts-ignore: Stale IDE cache
    const newCommunication = await prisma.documentCommunication.create({
      data: {
        trackingNumber,
        registrationId: registration?.id || null,
        message,
        type,
        parentId: parentId || null,
        senderUserId: user.id,
        ownerAdminId: user.ownerAdminId!,
      },
    });

    // Mark as read for the sender
    // @ts-ignore: Stale IDE cache
    await prisma.documentReadState.upsert({
      where: {
        trackingNumber_userId: {
          trackingNumber,
          userId: user.id,
        }
      },
      create: {
        trackingNumber,
        userId: user.id,
        ownerAdminId: user.ownerAdminId!,
        lastReadAt: new Date(),
      },
      update: {
        lastReadAt: new Date(),
      }
    });

    return NextResponse.json({ success: true, communication: newCommunication });
  } catch (error) {
    console.error("[COMMUNICATION_POST]", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
