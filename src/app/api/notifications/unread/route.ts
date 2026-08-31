import { NextResponse } from "next/server";
import { getUnreadNotificationCount } from "@/features/notifications/server/notification.service";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;

    if (!ownerAdminId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await getUnreadNotificationCount(userId, ownerAdminId);
    return NextResponse.json({ count });
  } catch (error: any) {
    return NextResponse.json({ error: "Unable to fetch notifications count" }, { status: 500 });
  }
}
