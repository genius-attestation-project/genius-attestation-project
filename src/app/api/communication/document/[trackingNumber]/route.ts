import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const session = await requirePermission("communication.view", `/api/communication/document/view`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { trackingNumber } = await params;
    if (!trackingNumber) {
      return NextResponse.json({ message: "Tracking number is required." }, { status: 400 });
    }

    // @ts-ignore: Stale IDE cache
    const messages = await prisma.documentCommunication.findMany({
      where: {
        trackingNumber,
        ownerAdminId: session.user.ownerAdminId,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        senderUser: { select: { name: true } },
        senderOffice: { select: { officeName: true } },
        receiverOffice: { select: { officeName: true } },
        parent: {
          select: {
            message: true,
            senderOffice: { select: { officeName: true } }
          }
        }
      },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("[DOCUMENT_COMM_GET]", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ trackingNumber: string }> }
) {
  try {
    const session = await requirePermission("communication.view", `/api/communication/document/view`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { user } = session;
    const officeId = user.officeLocationId;
    
    if (!officeId) {
      return NextResponse.json({ message: "No office assigned to user." }, { status: 400 });
    }

    const { trackingNumber } = await params;
    if (!trackingNumber) {
      return NextResponse.json({ message: "Tracking number is required." }, { status: 400 });
    }

    // Mark as read any unread message sent TO this office for this tracking number
    // @ts-ignore: Stale IDE cache
    await prisma.documentCommunication.updateMany({
      where: {
        trackingNumber,
        receiverOfficeId: officeId,
        isRead: false,
        ownerAdminId: user.ownerAdminId,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DOCUMENT_COMM_PUT]", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
