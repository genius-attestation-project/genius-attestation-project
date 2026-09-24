import { createLead, listLeads } from "@/features/lead/server/lead.service";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { leadInputSchema } from "@/features/lead/validations/lead.schema";
import { auth } from "@/lib/auth";
import { requireApiPermission, requireAnyApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireAnyApiPermission([
    "leads.view",
    "leads.view_all",
    "leads.view_own",
    "leads.view_assigned_users",
    "lead_management.view",
  ]);
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const officeLocationId = searchParams.get("officeLocationId") ?? undefined;

    if (officeLocationId && !hasOfficeAccess(session?.user, officeLocationId, "lead_management")) {
      return jsonError("Access denied for the requested office.", 403);
    }

    const rawPage = searchParams.get("page");
    const rawPageSize = searchParams.get("pageSize");
    const parsedPage = parseInt(rawPage ?? "1", 10);
    const parsedPageSize = parseInt(rawPageSize ?? "10", 10);
    const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
    const pageSize = isNaN(parsedPageSize) || parsedPageSize < 1 ? 10 : Math.min(parsedPageSize, 1000);

    const data = await listLeads(session?.user, ownerAdminId, {
      page,
      pageSize,
      query: searchParams.get("query") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      service: searchParams.get("service") ?? undefined,
      assignedUserId: searchParams.get("assignedUserId") ?? undefined,
      createdById: searchParams.get("createdById") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      state: searchParams.get("state") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      followupDate: searchParams.get("followupDate") ?? undefined,
      officeLocationId,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
    });

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch leads", error);
    return jsonError("Unable to fetch leads.", 500);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireApiPermission("leads.create");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = leadInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid lead payload.");
    }

    const lead = await createLead(ownerAdminId, parsed.data, session?.user?.id);
    return jsonOk({ lead }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Assigned user not found.") {
      return jsonError(error.message, 400);
    }

    console.error("Failed to create lead", error);
    return jsonError("Unable to create lead.", 500);
  }
}

