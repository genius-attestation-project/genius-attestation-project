import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { exportAssignedOfficesData } from "@/features/assigned-office/server/assigned-office.service";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.export");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const exportData = await exportAssignedOfficesData(ownerAdminId);

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Assigned Offices");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=assigned_offices_${Date.now()}.xlsx`,
      },
    });
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_EXPORT_GET]", error);
    return NextResponse.json({ message: error.message || "Export failed." }, { status: 500 });
  }
}
