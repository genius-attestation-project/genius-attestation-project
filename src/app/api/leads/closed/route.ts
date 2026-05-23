import { getClosedLeadsTable } from "@/features/closed/server/closed.service";
import type { ClosedFilters } from "@/features/closed/server/closed.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

function parseFilters(url: string): ClosedFilters {
  const { searchParams } = new URL(url);
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
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? 20)));

    const data = await getClosedLeadsTable(ownerAdminId, parseFilters(request.url), page, pageSize);
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch closed leads", error);
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Unable to fetch closed leads.";
    return jsonError(message, 500);
  }
}
