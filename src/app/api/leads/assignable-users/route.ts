import { listAssignableLeadUsers } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { requireAnyApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  const denied = await requireAnyApiPermission([
    "leads.view",
    "leads.create",
    "leads.edit",
    "assigned_leads.view",
    "assigned_leads.assign",
    "lead_management.view",
  ]);
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const users = await listAssignableLeadUsers(ownerAdminId);
    return jsonOk({ users });
  } catch (error) {
    console.error("Failed to fetch assignable lead users", error);
    return jsonError("Unable to fetch assignable lead users.", 500);
  }
}
