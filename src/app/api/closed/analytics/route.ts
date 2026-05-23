import { getClosedAnalyticsCards } from "@/features/closed/server/closed.service";
import type { ClosedFilters } from "@/features/closed/server/closed.service";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/utils/response";
import { LeadStatus, Prisma } from "@prisma/client";

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

async function getFallbackClosedAnalyticsCards(ownerAdminId: string) {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const where: Prisma.LeadWhereInput = { ownerAdminId, leadStatus: LeadStatus.Closed };

  const [totalClosedLeads, todayClosedLeads, thisMonthClosedLeads, revenue, leads] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: { ...where, closedAt: { gte: todayStart, lt: todayEnd } } }),
    prisma.lead.count({ where: { ...where, closedAt: { gte: monthStart, lt: monthEnd } } }),
    prisma.lead.aggregate({ where, _sum: { amount: true } }),
    prisma.lead.findMany({
      where,
      select: { service: true, assignedUser: true, country: true },
    }),
  ]);

  const services = Array.from(new Set(leads.map((lead) => lead.service).filter(Boolean))).sort();
  const assignedUsers = Array.from(new Set(leads.map((lead) => lead.assignedUser).filter(Boolean))).sort();
  const countries = Array.from(new Set(leads.map((lead) => lead.country).filter(Boolean))).sort();

  const topClosingService =
    Object.entries(
      leads.reduce<Record<string, number>>((acc, lead) => {
        acc[lead.service] = (acc[lead.service] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "None";

  const highestClosingCountry =
    Object.entries(
      leads.reduce<Record<string, number>>((acc, lead) => {
        acc[lead.country] = (acc[lead.country] ?? 0) + 1;
        return acc;
      }, {}),
    ).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "None";

  return {
    totalClosedLeads,
    todayClosedLeads,
    thisMonthClosedLeads,
    totalClosedRevenue: Number(revenue._sum.amount ?? 0),
    topClosingService,
    highestClosingCountry,
    filterOptions: {
      services,
      assignedUsers,
      countries,
      previousStatuses: [],
    },
  };
}

export async function GET(request: Request) {
  let ownerAdminId: string | undefined;

  try {
    const session = await auth();
    ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("Authentication required.", 401);

    const data = await getClosedAnalyticsCards(ownerAdminId, parseFilters(request.url));
    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch closed analytics", error);
    if (!ownerAdminId) {
      return jsonError("Unable to fetch closed analytics.", 500);
    }

    try {
      const data = await getFallbackClosedAnalyticsCards(ownerAdminId);
      return jsonOk(data);
    } catch (fallbackError) {
      console.error("Failed to fetch fallback closed analytics", fallbackError);
      const message =
        process.env.NODE_ENV === "development" && fallbackError instanceof Error
          ? fallbackError.message
          : "Unable to fetch closed analytics.";
      return jsonError(message, 500);
    }
  }
}
