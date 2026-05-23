import { getClosedTrends } from "@/features/closed/server/closed.service";
import type { ClosedFilters, ClosedTrendInterval } from "@/features/closed/server/closed.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
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
    const interval = (searchParams.get("interval") ?? "daily") as ClosedTrendInterval;

    if (service) filters.service = service;
    if (assignedUser) filters.assignedUser = assignedUser;
    if (previousStatus) filters.previousStatus = previousStatus;
    if (country) filters.country = country;
    if (query) filters.query = query;

    const data = await getClosedTrends(ownerAdminId, filters, interval);
    return jsonOk({ items: data });
  } catch (error) {
    console.error("Failed to fetch closed trends", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Unable to fetch closed trends.";
    return jsonError(message, 500);
  }
}
