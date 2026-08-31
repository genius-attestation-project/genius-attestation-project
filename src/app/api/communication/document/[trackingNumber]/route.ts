import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ trackingNumber: string }> }
) {
    const params = await context.params;
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
        senderUser: { select: { name: true, role: { select: { name: true } } } },
        parent: {
          select: {
            message: true,
            senderUser: { select: { name: true } }
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
  request: NextRequest,
  context: { params: Promise<{ trackingNumber: string }> }
) {
    const params = await context.params;
  try {
    const session = await requirePermission("communication.view", `/api/communication/document/view`);
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const { user } = session;

    const { trackingNumber } = await params;
    if (!trackingNumber) {
      return NextResponse.json({ message: "Tracking number is required." }, { status: 400 });
    }

    // Mark all as read for this user on this document
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[DOCUMENT_COMM_PUT]", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
