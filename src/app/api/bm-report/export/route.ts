import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { getBmLocationTrackingData, type BmTrackingTab } from "@/features/bm-report/server/bm-tracking.service";
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
    const registrationOffice = searchParams.get("registrationOffice") ?? undefined;
    const tab = (searchParams.get("tab") as BmTrackingTab) || "in_hand";
    const search = searchParams.get("search") ?? undefined;

    const sections = await getBmLocationTrackingData({
      ownerAdminId,
      registrationOffice,
      tab,
      search,
    });

    const allDocuments = sections.flatMap((sec) =>
      sec.documents.map((doc) => ({
        locationName: sec.locationName,
        ...doc,
      }))
    );

    if (format === "json") {
      return NextResponse.json(allDocuments);
    }

    const headers = [
      "SL No",
      "Tracking Number",
      "Registration Date",
      "Document Name",
      "Registration Office",
      "Collected Person",
      "Number of Days",
      "Delivery At",
      "Document Type",
      "Process Type",
      "Total Amount",
      "Current Location",
    ];

    const rows = allDocuments.map((doc, idx) => [
      idx + 1,
      doc.trackingNumber,
      doc.registrationDate,
      `"${(doc.documentName || "").replace(/"/g, '""')}"`,
      `"${(doc.registrationOffice || "").replace(/"/g, '""')}"`,
      `"${(doc.collectedPerson || "").replace(/"/g, '""')}"`,
      doc.numberOfDays,
      `"${(doc.deliveryAt || "").replace(/"/g, '""')}"`,
      `"${(doc.documentType || "").replace(/"/g, '""')}"`,
      `"${(doc.processType || "").replace(/"/g, '""')}"`,
      `"${(doc.totalAmount || "").replace(/"/g, '""')}"`,
      `"${(doc.locationName || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="bm_location_tracking_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    console.error("Failed to export BM location tracking report", error);
    return jsonError("Unable to export tracking records.", 500);
  }
}
