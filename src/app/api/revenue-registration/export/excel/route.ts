import { auth } from "@/lib/auth";
import { jsonError } from "@/utils/response";
import { listRegistrations } from "@/features/registration/server/registration.service";
import { generateExcelBuffer } from "@/features/registration/server/export.service";
import { hasPermission } from "@/features/admin/server/rbac.service";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    
    if (!session?.user || !ownerAdminId) {
      return jsonError("Unauthorized.", 401);
    }

    if (!hasPermission(session.user, "revenue_registration.export")) {
      return jsonError("You do not have permission to export revenue registrations.", 403);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? undefined;
    
    // Fetch all records without pagination (using a very large page size)
    const data = await listRegistrations(ownerAdminId, {
      page: 1,
      pageSize: 100000,
      query,
    });

    const buffer = await generateExcelBuffer(data.items);
    
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Revenue_Registrations_${dateStr}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/revenue-registration/export/excel] FATAL ERROR:", error);
    return jsonError(error?.message || "Unable to export registrations to Excel.", 500);
  }
}
