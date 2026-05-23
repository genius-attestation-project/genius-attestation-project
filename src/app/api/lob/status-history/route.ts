import { getLobStatusHistory } from "@/features/lob/server/lob.service";
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
  const country = searchParams.get("country");
  const previousStatus = searchParams.get("previousStatus");
  const query = searchParams.get("query");
  if (service) filters.service = service;
  if (assignedUser) filters.assignedUser = assignedUser;
  if (country) filters.country = country;
  if (previousStatus) filters.previousStatus = previousStatus;
  if (query) filters.query = query;
  return filters;
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("Authentication required.", 401);

    const filters = parseFilters(request.url);
    const data = await getLobStatusHistory(ownerAdminId, filters);
    return jsonOk({ items: data });
  } catch (error) {
    console.error("Failed to fetch LOB status history", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Unable to fetch LOB status history.";
    return jsonError(message, 500);
  }
}
