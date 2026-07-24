import { NextResponse, NextRequest } from "next/server";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { z } from "zod";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const normalizeStr = (str: any) => (str ? String(str).trim().toLowerCase() : "");
const capitalizeStr = (str: any) => (str ? String(str).trim() : "");

export async function POST(req: NextRequest) {
  try {
    const sessionResponse = await requireApiPermission("revenue_registration.import");
    if (sessionResponse instanceof NextResponse) return sessionResponse; // Access denied

    const session = await auth();
    if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

    const ownerAdminId = session.user.ownerAdminId || session.user.id;

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: "buffer" });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];

    // Read rows
    const rawData = XLSX.utils.sheet_to_json(ws, { defval: "" }) as Record<string, any>[];

    if (rawData.length === 0) {
      return NextResponse.json({ error: "The uploaded file is empty" }, { status: 400 });
    }

    // --- Master Data Preparation ---
    const [existingUsers, existingRegistrations, existingOffices, existingDocTypes] = await Promise.all([
      prisma.user.findMany({ where: { ownerAdminId, isActive: true }, select: { id: true, name: true, email: true } }),
      prisma.registration.findMany({ where: { ownerAdminId }, select: { trackingNumber: true } }),
      prisma.officeLocation.findMany({ where: { ownerAdminId }, select: { id: true, officeName: true } }),
      (prisma as any).masterData.findMany({ where: { ownerAdminId, type: "DOCUMENT_TYPES", isArchived: false }, select: { name: true, category: true } }),
    ]);

    const userMap = new Map<string, string>(); // normalized name -> user id
    existingUsers.forEach((u: { id: string; name: string | null; email: string | null }) => {
      if (u.name) userMap.set(normalizeStr(u.name), u.id);
      if (u.email) userMap.set(normalizeStr(u.email), u.id);
    });

    const officeMap = new Map<string, string>(); // normalized office -> office name
    existingOffices.forEach((o: { id: string; officeName: string }) => {
      officeMap.set(normalizeStr(o.officeName), o.officeName);
    });

    const docTypeSet = new Set<string>();
    existingDocTypes.forEach((dt: { name: string; category: string }) => {
      docTypeSet.add(dt.name.replace(/\s+/g, "").toLowerCase());
    });

    const existingTrackingNumbers = new Set(existingRegistrations.map((r: { trackingNumber: string }) => r.trackingNumber));

    // --- Processing Rows ---
    const processedRows = [];
    let validCount = 0;
    let errorCount = 0;
    let duplicateCount = 0;
    const newMasterData = {
      offices: new Set<string>(),
      processTypes: new Set<string>(),
      documentTypes: new Set<string>(),
      documentTypesMap: {} as Record<string, string>
    };

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const errors = [];
      const warnings = [];

      // Essential field mapping (based on template)
      const customerName = capitalizeStr(row["Customer Name*"] || row["customer_name"] || row["Customer Name"]);
      const mobileNumber = capitalizeStr(row["Mobile Number*"] || row["mobile_number"] || row["Mobile Number"] || row["mobile"]);
      const serviceProcessType = capitalizeStr(row["Service/Process Type*"] || row["process_type"] || row["Service/Process Type"]);
      const subPackage = capitalizeStr(row["Sub Package"] || row["sub_package"]);
      const totalCharges = Number(row["Total Charges*"] || row["total_charges"] || row["Total Charges"] || 0);
      const trackingNumber = capitalizeStr(row["Tracking Number"] || row["tracking_number"]);
      const documentType = capitalizeStr(row["Document Type"]);
      const documentCategory = capitalizeStr(row["Document Category"] || row["Category"] || row["Document Category*"] || "General");
      const deliveryLocation = capitalizeStr(row["Delivery Location"]); // This can be Office Name

      if (!customerName) errors.push("Customer Name is required.");
      if (!mobileNumber) errors.push("Mobile Number is required.");
      if (!serviceProcessType) errors.push("Service/Process Type is required.");
      if (isNaN(totalCharges)) errors.push("Total Charges must be a number.");

      // Check Tracking Number
      let isDuplicate = false;
      if (trackingNumber && existingTrackingNumbers.has(trackingNumber)) {
        isDuplicate = true;
        duplicateCount++;
        warnings.push(`Tracking Number ${trackingNumber} already exists. You must select an action (Skip, Update, Duplicate).`);
      }

      // Master Data Matching
      if (serviceProcessType) newMasterData.processTypes.add(serviceProcessType);
      if (documentType) {
        newMasterData.documentTypes.add(documentType);
        const normDoc = documentType.replace(/\s+/g, "").toLowerCase();
        if (!docTypeSet.has(normDoc)) {
          newMasterData.documentTypesMap[documentType] = documentCategory || "General";
        }
      }

      // Office Matching (Assuming Delivery Location is an Office)
      let resolvedDeliveryLocation = deliveryLocation;
      if (deliveryLocation && !["office delivery", "home delivery", "courier"].includes(normalizeStr(deliveryLocation))) {
        const normOffice = normalizeStr(deliveryLocation);
        if (officeMap.has(normOffice)) {
          resolvedDeliveryLocation = officeMap.get(normOffice)!;
        } else {
          newMasterData.offices.add(deliveryLocation);
          warnings.push(`New Office Location will be created: ${deliveryLocation}`);
        }
      }

      // User Matching
      const commissionToRaw = capitalizeStr(row["Commission To User Name"]);
      let commissionToUserId = null;
      let commissionToName = commissionToRaw;
      if (commissionToRaw) {
        const norm = normalizeStr(commissionToRaw);
        if (userMap.has(norm)) {
          commissionToUserId = userMap.get(norm);
        } else {
          warnings.push(`User not found: ${commissionToRaw}. Will be stored as text only.`);
        }
      }

      const status = errors.length > 0 ? "Error" : (isDuplicate ? "Duplicate" : "Valid");
      if (status === "Error") errorCount++;
      if (status === "Valid") validCount++;

      processedRows.push({
        rowNumber: i + 2, // Excel is 1-indexed, +1 for header
        data: {
          ...row,
          "Customer Name*": customerName,
          "Mobile Number*": mobileNumber,
          "Service/Process Type*": serviceProcessType,
          "Sub Package": subPackage,
          "Total Charges*": totalCharges,
          "Delivery Location": resolvedDeliveryLocation,
          "Tracking Number": trackingNumber,
          commissionToUserId,
          commissionToName
        },
        status,
        errors,
        warnings,
        resolutionAction: isDuplicate ? "Skip" : "Create" // Default action
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rawData.length,
        validCount,
        errorCount,
        duplicateCount,
        newOffices: Array.from(newMasterData.offices),
        newProcessTypes: Array.from(newMasterData.processTypes),
        newDocumentTypes: Array.from(newMasterData.documentTypes),
        newDocumentTypesMap: newMasterData.documentTypesMap
      },
      rows: processedRows
    });
  } catch (error: any) {
    console.error("Preview API Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to parse import file", details: error.message },
      { status: 500 }
    );
  }
}
