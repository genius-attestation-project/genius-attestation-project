import { listLeads } from "@/features/lead/server/lead.service";
import { generateLeadExcelBuffer } from "@/features/lead/server/export.service";
import { auth } from "@/lib/auth";
import { jsonError } from "@/utils/response";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) {
      return jsonError("No owner admin ID found.", 401);
    }

    const { searchParams } = new URL(request.url);
    
    // Fetch all records for the export without typical pagination by setting pageSize to a very high number
    const data = await listLeads(session.user, ownerAdminId, {
      page: 1,
      pageSize: 100000,
      query: searchParams.get("query") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      service: searchParams.get("service") ?? undefined,
      assignedUserId: searchParams.get("assignedUserId") ?? undefined,
      createdById: searchParams.get("createdById") ?? undefined,
      country: searchParams.get("country") ?? undefined,
      state: searchParams.get("state") ?? undefined,
      source: searchParams.get("source") ?? undefined,
      followupDate: searchParams.get("followupDate") ?? undefined,
      officeLocationId: searchParams.get("officeLocationId") ?? undefined,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
    });

    const buffer = await generateLeadExcelBuffer(data.items);

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Leads_Export_${dateStr}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/leads/export/excel] FATAL ERROR:", error);
    return jsonError(error?.message || "Unable to export leads to Excel.", 500);
  }
}
