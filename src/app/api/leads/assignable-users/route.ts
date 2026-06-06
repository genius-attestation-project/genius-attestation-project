import { listAssignableLeadUsers } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const users = await listAssignableLeadUsers(ownerAdminId);
    return jsonOk({ users });
  } catch (error) {
    console.error("Failed to fetch assignable lead users", error);
    return jsonError("Unable to fetch assignable lead users.", 500);
  }
}
