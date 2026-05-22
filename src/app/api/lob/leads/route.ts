import { getLobLeadsTable } from "@/features/lob/server/lob.service";
import type { LobFilters } from "@/features/lob/server/lob.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("Authentication required.", 401);

    const { searchParams } = new URL(request.url);
    const filters: LobFilters = {};

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    const service = searchParams.get("service");
    const assignedUser = searchParams.get("assignedUser");
    const country = searchParams.get("country");
    const previousStatus = searchParams.get("previousStatus");
    const query = searchParams.get("query");
    if (service) filters.service = service;
    if (assignedUser) filters.assignedUser = assignedUser;
    if (country) filters.country = country;
    if (previousStatus) filters.previousStatus = previousStatus;
    if (query) filters.query = query;

    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));

    const data = await getLobLeadsTable(ownerAdminId, filters, page, pageSize);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch LOB leads", error);
    return jsonError("Unable to fetch LOB leads.", 500);
  }
}
