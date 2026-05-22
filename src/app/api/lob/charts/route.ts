import { getLobCharts } from "@/features/lob/server/lob.service";
import type { LobFilters } from "@/features/lob/server/lob.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

function parseFilters(url: string): LobFilters {
  const { searchParams } = new URL(url);
  const filters: LobFilters = {};
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  if (dateFrom) filters.dateFrom = new Date(dateFrom);
  if (dateTo) filters.dateTo = new Date(dateTo);
  const service = searchParams.get("service");
  const assignedUser = searchParams.get("assignedUser");
  const previousStatus = searchParams.get("previousStatus");
  const country = searchParams.get("country");
  const query = searchParams.get("query");
  if (service) filters.service = service;
  if (assignedUser) filters.assignedUser = assignedUser;
  if (previousStatus) filters.previousStatus = previousStatus;
  if (country) filters.country = country;
  if (query) filters.query = query;
  return filters;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("Authentication required.", 401);

    const filters = parseFilters(request.url);
    const data = await getLobCharts(ownerAdminId, filters);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch LOB charts", error);
    return jsonError("Unable to fetch LOB charts.", 500);
  }
}
