import { getClosedRevenue } from "@/features/closed/server/closed.service";
import type { ClosedFilters, ClosedTrendInterval } from "@/features/closed/server/closed.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("Authentication required.", 401);

    const { searchParams } = new URL(request.url);
    const filters: ClosedFilters = {};

    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);

    const service = searchParams.get("service");
    const assignedUser = searchParams.get("assignedUser");
    const previousStatus = searchParams.get("previousStatus");
    const country = searchParams.get("country");
    const query = searchParams.get("query");
    const interval = (searchParams.get("interval") ?? "monthly") as ClosedTrendInterval;

    if (service) filters.service = service;
    if (assignedUser) filters.assignedUser = assignedUser;
    if (previousStatus) filters.previousStatus = previousStatus;
    if (country) filters.country = country;
    if (query) filters.query = query;

    const data = await getClosedRevenue(ownerAdminId, filters, interval);
    return jsonOk({ items: data });
  } catch (error) {
    console.error("Failed to fetch closed revenue", error);
    return jsonError("Unable to fetch closed revenue.", 500);
  }
}
