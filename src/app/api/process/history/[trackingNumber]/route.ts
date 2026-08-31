import { getProcessHistory } from "@/features/process/server/process.service";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ trackingNumber: string }>;
};

export async function GET(_: NextRequest, context: { params: Promise<{ trackingNumber: string }> }) {
  const denied = await requireApiPermission("process.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("Unauthorized", 401);
    }

    const { trackingNumber } = await context.params;

    const history = await getProcessHistory(trackingNumber, ownerAdminId);

    return jsonOk({ data: history });
  } catch (error) {
    console.error("Failed to fetch process history", error);
    return jsonError("Unable to fetch process history", 500);
  }
}
