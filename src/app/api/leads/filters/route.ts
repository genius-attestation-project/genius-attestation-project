import { getLeadFilterOptions } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const filters = await getLeadFilterOptions(ownerAdminId);
    return jsonOk(filters);
  } catch (error) {
    console.error("Failed to fetch lead filters", error);
    return jsonError("Unable to fetch lead filters.", 500);
  }
}
