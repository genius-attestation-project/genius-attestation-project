import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { listRealtimeDocumentMovements } from "@/features/bm-report/server/bm-tracking.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission("bm_report.view");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? undefined;
    const trackingNumber = searchParams.get("trackingNumber") ?? undefined;
    const customerName = searchParams.get("customerName") ?? undefined;
    const officeId = searchParams.get("officeId") ?? undefined;
    const processType = searchParams.get("processType") ?? undefined;
    const subPackage = searchParams.get("subPackage") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const startDate = searchParams.get("startDate") ?? undefined;
    const endDate = searchParams.get("endDate") ?? undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const isSuperAdmin = session?.user?.isSuperAdmin ?? false;
    const userOfficeLocationId = session?.user?.officeLocationId ?? undefined;

    const result = await listRealtimeDocumentMovements({
      ownerAdminId,
      isSuperAdmin,
      userOfficeLocationId,
      query,
      trackingNumber,
      customerName,
      officeId,
      processType,
      subPackage,
      status,
      startDate,
      endDate,
      page,
      limit,
    });

    return jsonOk(result);
  } catch (error) {
    console.error("Failed to list BM realtime tracking records", error);
    return jsonError("Unable to load document movement tracking records.", 500);
  }
}
