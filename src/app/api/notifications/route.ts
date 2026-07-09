import { NextResponse } from "next/server";
import { getUnreadNotificationCount, listNotifications, markAllNotificationsAsRead, markNotificationAsRead } from "@/features/notifications/server/notification.service";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await listNotifications(userId, ownerAdminId);
    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: "Unable to fetch notifications" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, action } = await req.json();

    if (action === "mark_all_read") {
      await markAllNotificationsAsRead(userId, ownerAdminId);
    } else if (action === "mark_read" && id) {
      await markNotificationAsRead(id, userId, ownerAdminId);
    } else {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: "Unable to update notifications" }, { status: 500 });
  }
}
