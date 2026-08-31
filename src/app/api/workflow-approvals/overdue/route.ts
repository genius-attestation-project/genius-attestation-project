import { NextResponse } from "next/server";
import { getOverdueFollowups } from "@/features/lead/server/workflow-approval.service";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";

export async function GET() {
  const denied = await requireApiPermission("overdueFollowup.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = session?.user?.permissionScopes?.["overdueFollowup.view"] ?? "Own";
    const isSuperAdmin = session?.user?.isSuperAdmin;

    const supervisorId = (isSuperAdmin || scope === "All") ? undefined : session?.user?.id;

    const items = await getOverdueFollowups(ownerAdminId, supervisorId);

    return NextResponse.json({ items });
  } catch (error: any) {
    console.error("Failed to fetch overdue followups", error);
    return NextResponse.json({ error: "Unable to fetch overdue followups." }, { status: 500 });
  }
}
