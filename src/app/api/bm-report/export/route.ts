import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { listRealtimeDocumentMovements } from "@/features/bm-report/server/bm-tracking.service";
import { jsonError } from "@/utils/response";

export async function GET(request: NextRequest) {
  const denied = await requireApiPermission("bm_report.export");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "csv";
    const query = searchParams.get("query") ?? undefined;
    const processType = searchParams.get("processType") ?? undefined;
    const subPackage = searchParams.get("subPackage") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const result = await listRealtimeDocumentMovements({
      ownerAdminId,
      query,
      processType,
      subPackage,
      status,
      page: 1,
      limit: 1000,
    });

    if (format === "json") {
      return NextResponse.json(result.data);
    }

    const headers = [
      "Tracking Number",
      "Customer Name",
      "Mobile",
      "Process Type",
      "Current Office",
      "Current Module",
      "Sub Package",
      "Current Status",
      "Last Movement",
      "Current Holder",
      "Last Updated",
    ];

    const rows = result.data.map((item) => [
      item.trackingNumber,
      `"${item.customerName.replace(/"/g, '""')}"`,
      item.mobile || "",
      item.processType,
      `"${item.currentOffice.replace(/"/g, '""')}"`,
      item.currentModule,
      item.currentSubPackage,
      item.currentStatus,
      `"${item.lastMovement.replace(/"/g, '""')}"`,
      `"${item.currentHolder.replace(/"/g, '""')}"`,
      new Date(item.lastUpdated).toISOString(),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bm_report_movements_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export BM report movements", error);
    return jsonError("Unable to export tracking records.", 500);
  }
}
