import { NextResponse, NextRequest } from "next/server";
import { requireApiPermission } from "@/middleware/auth.middleware";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  try {
    const session = await requireApiPermission("revenue_registration.downloadTemplate");
    if (session instanceof NextResponse) return session; // Access denied

    const templateColumns = [
      "Customer Name*",
      "Mobile Number*",
      "Email",
      "Address",
      "Country",
      "State",
      "City",
      "Customer Type",
      "Document Type",
      "Document Category",
      "Document Issued Country",
      "Service/Process Type*",
      "Sub Package",
      "External Process",
      "Priority",
      "Committed Duration",
      "Delivery Location",
      "Total Charges*",
      "Advance Paid",
      "Payment Mode",
      "Payment Status",
      "Finance Approval Status",
      "Commission To User Name",
      "Collected Person Name",
      "Registered Person Name",
      "Region of Registration",
      "BM Status",
      "Approval Status",
      "Tracking Status",
      "Welcome Call Status",
      "Tracking Number"
    ];

    const ws = XLSX.utils.aoa_to_sheet([
      templateColumns,
      // Sample Row
      [
        "John Doe", // Customer Name
        "+919876543210", // Mobile Number
        "john.doe@example.com", // Email
        "123 Main St", // Address
        "India", // Country
        "Kerala", // State
        "Kochi", // City
        "Retail", // Customer Type
        "Degree Certificate", // Document Type
        "Education", // Document Category
        "India", // Document Issued Country
        "Apostille", // Service/Process Type
        "Express", // Sub Package
        "MEA", // External Process
        "Normal", // Priority
        "15 Days", // Committed Duration
        "Office Delivery", // Delivery Location
        "5000", // Total Charges
        "1000", // Advance Paid
        "Cash", // Payment Mode
        "Partial", // Payment Status
        "Pending", // Finance Approval Status
        "", // Commission To
        "", // Collected Person
        "Jane Smith", // Registered Person
        "South", // Region
        "Pending", // BM Status
        "Pending", // Approval Status
        "Registered", // Tracking Status
        "Pending", // Welcome Call Status
        "TRACK-0001" // Tracking Number
      ]
    ]);

    // Add some styling or column widths to make it look professional
    ws["!cols"] = templateColumns.map((col) => ({ wch: col.length + 5 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registration Import Template");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="registration_import_template.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("Error generating import template:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate template", details: error.message },
      { status: 500 }
    );
  }
}
