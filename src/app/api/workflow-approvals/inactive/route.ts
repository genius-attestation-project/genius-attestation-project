import { NextResponse } from "next/server";
import { getInactiveLeads } from "@/features/lead/server/workflow-approval.service";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";

export async function GET() {
  const denied = await requireApiPermission("inactiveLead.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const scope = session?.user?.permissionScopes?.["inactiveLead.view"] ?? "Own";
    const isSuperAdmin = session?.user?.isSuperAdmin;

    // If scope is All or user is SuperAdmin, they see all inactive leads.
    // Otherwise, they see leads belonging to their reporting hierarchy.
    const supervisorId = (isSuperAdmin || scope === "All") ? undefined : session?.user?.id;

    const leads = await getInactiveLeads(ownerAdminId, supervisorId);

    return NextResponse.json({ items: leads });
  } catch (error: any) {
    console.error("Failed to fetch inactive leads", error);
    return NextResponse.json({ error: "Unable to fetch inactive leads." }, { status: 500 });
  }
}
