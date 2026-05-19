import { deleteLead, getLeadById, updateLead } from "@/features/lead/server/lead.service";
import { leadInputSchema } from "@/features/lead/validations/lead.schema";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const lead = await getLeadById(ownerAdminId, id);

    if (!lead) {
      return jsonError("Lead not found.", 404);
    }

    return jsonOk({ lead });
  } catch (error) {
    console.error("Failed to fetch lead", error);
    return jsonError("Unable to fetch lead.", 500);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const body = await request.json().catch(() => null);
    const parsed = leadInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid lead payload.");
    }

    const lead = await updateLead(ownerAdminId, id, parsed.data);

    if (!lead) {
      return jsonError("Lead not found.", 404);
    }

    return jsonOk({ lead });
  } catch (error) {
    console.error("Failed to update lead", error);
    return jsonError("Unable to update lead.", 500);
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const deleted = await deleteLead(ownerAdminId, id);

    if (!deleted) {
      return jsonError("Lead not found.", 404);
    }

    return jsonOk({ success: true });
  } catch (error) {
    console.error("Failed to delete lead", error);
    return jsonError("Unable to delete lead.", 500);
  }
}

