import { getClosedTrends } from "@/features/closed/server/closed.service";
import type { ClosedFilters, ClosedTrendInterval } from "@/features/closed/server/closed.service";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const user = session?.user;
    const ownerAdminId = user?.ownerAdminId ?? user?.id;
    if (!ownerAdminId || !user) return jsonError("Authentication required.", 401);

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
    const officeLocationId = searchParams.get("officeLocationId");
    const query = searchParams.get("query");
    const interval = (searchParams.get("interval") ?? "daily") as ClosedTrendInterval;

    if (service) filters.service = service;
    if (assignedUser) filters.assignedUser = assignedUser;
    if (previousStatus) filters.previousStatus = previousStatus;
    if (country) filters.country = country;
    if (officeLocationId) filters.officeLocationId = officeLocationId;
    if (query) filters.query = query;

    if (filters.officeLocationId && !hasOfficeAccess(user, filters.officeLocationId, "lead_management")) {
      return jsonError("Access denied for the requested office.", 403);
    }

    const data = await getClosedTrends(ownerAdminId, filters, interval, user);
    return jsonOk({ items: data });
  } catch (error) {
    console.error(`[GET /api/closed/trends] Database operation failed:`, {
      endpoint: "/api/closed/trends",
      prismaError: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    const message =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Unable to fetch closed trends.";
    return jsonError(message, 500);
  }
}
