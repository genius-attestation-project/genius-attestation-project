import { NextResponse, NextRequest } from "next/server";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { REGISTRATION_FIELD_DEFINITIONS } from "@/features/registration/server/registration-fields";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const permissionResponse = await requireApiPermission("revenue_registration.downloadTemplate");
    if (permissionResponse instanceof NextResponse) return permissionResponse;

    const ownerAdminId = session.user.ownerAdminId || session.user.id;

    // Fetch active master data options for current tenant to provide realistic sample and reference sheet
    const [offices, docTypes, processTypes, paymentModes, customerTypes] = await Promise.all([
      prisma.officeLocation.findMany({
        where: { ownerAdminId },
        select: { officeName: true },
        orderBy: { officeName: "asc" },
      }),
      (prisma as any).masterData.findMany({
        where: { ownerAdminId, type: "DOCUMENT_TYPES", isArchived: false, isActive: true },
        select: { name: true, category: true },
        orderBy: { name: "asc" },
      }),
      (prisma as any).masterData.findMany({
        where: { ownerAdminId, type: "PROCESS_TYPES", isArchived: false, isActive: true },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      (prisma as any).paymentMode.findMany({
        where: { ownerAdminId, status: "Active" },
        select: { paymentModeName: true },
        orderBy: { paymentModeName: "asc" },
      }).catch(() => []),
      (prisma as any).masterData.findMany({
        where: { ownerAdminId, type: "CUSTOMER_TYPES", isArchived: false, isActive: true },
        select: { name: true },
        orderBy: { name: "asc" },
      }).catch(() => []),
    ]);

    const sampleOffice = offices[0]?.officeName || "Kochi HQ";
    const sampleDocType = docTypes[0]?.name || "Degree Certificate";
    const sampleProcessType = processTypes[0]?.name || "Apostille";
    const samplePaymentMode = paymentModes[0]?.paymentModeName || "Cash";
    const sampleCustomerType = customerTypes[0]?.name || "Individual";

    const importableFields = REGISTRATION_FIELD_DEFINITIONS.filter((f) => f.importable);

    // Headers with asterisk for required fields
    const headers = importableFields.map((f) => (f.required ? `${f.label}*` : f.label));

    // Dynamic sample row referencing real tenant master data where possible
    const sampleRow = importableFields.map((f) => {
      switch (f.key) {
        case "customerName":
          return "John Doe";
        case "mobile":
          return "+919876543210";
        case "email":
          return "john.doe@example.com";
        case "address":
          return "123 Main Street, Suite 400";
        case "country":
          return "India";
        case "state":
          return "Kerala";
        case "city":
          return "Kochi";
        case "customerType":
          return sampleCustomerType;
        case "corporateDetailName":
          return "";
        case "documentType":
          return sampleDocType;
        case "documentName":
          return "Degree Certificate - Computer Science";
        case "documentIssuedCountry":
          return "India";
        case "processType":
          return sampleProcessType;
        case "subPackage":
          return "";
        case "externalProcess":
          return "MEA";
        case "priority":
          return "Normal";
        case "committedDuration":
          return "15 Days";
        case "deliveryLocation":
          return sampleOffice;
        case "totalCharges":
          return 5000;
        case "advancePaid":
          return 1000;
        case "paymentMode":
          return samplePaymentMode;
        case "upiTransactionId":
          return "";
        case "bankName":
          return "";
        case "transactionRefNo":
          return "";
        case "transferDate":
          return "";
        case "chequeNumber":
          return "";
        case "chequeDate":
          return "";
        case "ddNumber":
          return "";
        case "ddDate":
          return "";
        case "cardLast4":
          return "";
        case "approvalCode":
          return "";
        case "paymentGateway":
          return "";
        case "onlineTransactionId":
          return "";
        case "walletName":
          return "";
        case "walletTransactionId":
          return "";
        case "paymentReferenceNo":
          return "";
        case "paymentDescription":
          return "";
        case "collectedPerson":
          return session.user.name || "";
        case "commissionToUser":
          return "";
        case "trackingNumber":
          return ""; // Auto-generated if left blank
        case "createdDate":
          return ""; // Optional - defaults to current import date/time if left blank
        case "registeredPerson":
          return session.user.name || "";
        case "regionOfRegistration":
          return sampleOffice;
        case "approvalStatus":
          return "Pending";
        case "trackingStatus":
          return "Registered";
        case "welcomeCallStatus":
          return "Pending";
        default:
          return f.example || "";
      }
    });

    const wb = XLSX.utils.book_new();

    // Sheet 1: Registration Import Sheet
    const ws = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    ws["!cols"] = headers.map((h, i) => {
      const sampleValStr = String(sampleRow[i] ?? "");
      return { wch: Math.max(h.length + 4, sampleValStr.length + 4, 14) };
    });
    XLSX.utils.book_append_sheet(wb, ws, "Registration Import");

    // Sheet 2: Master Data Reference Sheet (Helps users know valid values)
    const maxMasterRows = Math.max(
      offices.length,
      docTypes.length,
      processTypes.length,
      paymentModes.length,
      1
    );

    const refHeaders = ["Office Locations", "Document Types", "Process Types", "Payment Modes", "Priorities"];
    const refRows: any[][] = [];

    const priorities = ["Normal", "Express", "Super Fast"];

    for (let r = 0; r < maxMasterRows; r++) {
      refRows.push([
        offices[r]?.officeName || "",
        docTypes[r]?.name || "",
        processTypes[r]?.name || "",
        paymentModes[r]?.paymentModeName || "",
        priorities[r] || "",
      ]);
    }

    const refWs = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows]);
    refWs["!cols"] = refHeaders.map(() => ({ wch: 26 }));
    XLSX.utils.book_append_sheet(wb, refWs, "System Master Reference");

    const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="Revenue_Registration_Import_Template.xlsx"`,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (error: any) {
    console.error("[GET /api/registrations/import/template] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate template", details: error.message },
      { status: 500 }
    );
  }
}
