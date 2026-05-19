import { createLead, listLeads } from "@/features/lead/server/lead.service";
import { leadInputSchema } from "@/features/lead/validations/lead.schema";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const data = await listLeads(ownerAdminId, {
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "10"),
      query: searchParams.get("query") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch leads", error);
    return jsonError("Unable to fetch leads.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = leadInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid lead payload.");
    }

    const lead = await createLead(ownerAdminId, parsed.data);
    return jsonOk({ lead }, 201);
  } catch (error) {
    console.error("Failed to create lead", error);
    return jsonError("Unable to create lead.", 500);
  }
}

