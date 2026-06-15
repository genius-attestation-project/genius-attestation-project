import { getLobSummary } from "@/features/lead/server/lead.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const data = await getLobSummary(ownerAdminId, searchParams.get("officeLocationId") ?? undefined);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch LOB summary", error);
    return jsonError("Unable to fetch line-of-business data.", 500);
  }
}
