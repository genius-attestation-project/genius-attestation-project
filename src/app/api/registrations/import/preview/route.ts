import { NextResponse, NextRequest } from "next/server";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import {
  REGISTRATION_FIELD_DEFINITIONS,
  findFieldDefinition,
  findClosestMatch,
  normalizeHeader,
  parseDateValue,
  normalizeTrackingNumber,
} from "@/features/registration/server/registration-fields";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit

const normalize = (str: any) => (str !== null && str !== undefined ? String(str).trim().toLowerCase() : "");
const cleanStr = (str: any) => (str !== null && str !== undefined ? String(str).trim() : "");

export interface RowMismatchDetail {
  field: string;
  fieldKey: string;
  value: string;
  status: "Mismatch" | "Error" | "Warning";
  reason: string;
  suggestion?: string | null;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const permissionResponse = await requireApiPermission("revenue_registration.import");
    if (permissionResponse instanceof NextResponse) return permissionResponse;

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
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: false, cellNF: true, cellText: true });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return NextResponse.json({ error: "The uploaded workbook has no sheets." }, { status: 400 });
    }

    // Intelligently find the sheet and row with the most registration headers
    let selectedSheetName = wb.SheetNames[0];
    let bestHeaderRowIdx = 0;
    let bestMappedCount = 0;
    let bestColumnIndexToField = new Map<number, typeof REGISTRATION_FIELD_DEFINITIONS[0]>();
    let bestRawRows: any[][] = [];

    for (const sName of wb.SheetNames) {
      const candidateWs = wb.Sheets[sName];
      if (!candidateWs) continue;
      const sheetRows = XLSX.utils.sheet_to_json(candidateWs, { header: 1, defval: "", raw: true }) as any[][];
      if (sheetRows.length < 2) continue;

      // Scan first 15 rows to find the true header row
      const maxScan = Math.min(sheetRows.length, 15);
      for (let r = 0; r < maxScan; r++) {
        const candidateHeaders = (sheetRows[r] || []).map((h) => String(h || "").trim());
        const candidateMap = new Map<number, typeof REGISTRATION_FIELD_DEFINITIONS[0]>();
        candidateHeaders.forEach((h, idx) => {
          if (!h) return;
          const def = findFieldDefinition(h);
          if (def) candidateMap.set(idx, def);
        });

        if (candidateMap.size > bestMappedCount) {
          bestMappedCount = candidateMap.size;
          bestHeaderRowIdx = r;
          bestColumnIndexToField = candidateMap;
          selectedSheetName = sName;
          bestRawRows = sheetRows;
        }
      }
    }

    if (bestMappedCount === 0 || !bestRawRows || bestRawRows.length <= bestHeaderRowIdx + 1) {
      return NextResponse.json(
        { error: "Could not recognize any valid column headers in the uploaded file. Please ensure the file contains valid headers like 'Tracking Number', 'Customer Name', 'Created Date', etc." },
        { status: 400 }
      );
    }

    const selectedWs = wb.Sheets[selectedSheetName];
    const columnIndexToField = bestColumnIndexToField;
    const rawRows = bestRawRows;
    const headerRowIdx = bestHeaderRowIdx;
    const rawHeaders = (rawRows[headerRowIdx] || []).map((h) => String(h || "").trim());
    const unmappedHeaders: string[] = [];

    rawHeaders.forEach((header, idx) => {
      if (header && !columnIndexToField.has(idx)) {
        unmappedHeaders.push(header);
      }
    });

    // --- Fetch Live System & Master Data for validation ---
    const [
      existingUsers,
      existingRegistrations,
      existingOffices,
      existingDocTypes,
      existingProcessTypes,
      existingSubPackages,
      existingCustomerTypes,
      existingCorporateDetails,
      existingPaymentModes,
    ] = await Promise.all([
      prisma.user.findMany({
        where: { ownerAdminId, isActive: true },
        select: { id: true, name: true, email: true },
      }),
      prisma.registration.findMany({
        where: { ownerAdminId },
        select: { trackingNumber: true },
      }),
      prisma.officeLocation.findMany({
        where: { ownerAdminId },
        select: { id: true, officeName: true, location: true },
      }),
      (prisma as any).masterData.findMany({
        where: { ownerAdminId, type: "DOCUMENT_TYPES", isArchived: false, isActive: true },
        select: { id: true, name: true, category: true },
      }),
      (prisma as any).masterData.findMany({
        where: { ownerAdminId, type: "PROCESS_TYPES", isArchived: false, isActive: true },
        select: { id: true, name: true },
      }),
      (prisma as any).subPackage.findMany({
        where: { ownerAdminId, isActive: true },
        select: { id: true, name: true },
      }).catch(() => []),
      (prisma as any).masterData.findMany({
        where: { ownerAdminId, type: "CUSTOMER_TYPES", isArchived: false, isActive: true },
        select: { id: true, name: true },
      }).catch(() => []),
      (prisma as any).corporateDetail.findMany({
        where: { ownerAdminId, isActive: true },
        select: { id: true, companyName: true },
      }).catch(() => []),
      (prisma as any).paymentMode.findMany({
        where: { ownerAdminId, status: "Active" },
        select: { id: true, paymentModeName: true },
      }).catch(() => []),
    ]);

    // Build Master Data lookup maps and candidate lists for suggestions
    const validOfficeNames = existingOffices.map((o: any) => o.officeName);
    const officeMap = new Map<string, { id: string; name: string }>();
    existingOffices.forEach((o: any) => {
      officeMap.set(normalize(o.officeName), { id: o.id, name: o.officeName });
    });

    const validDocTypeNames = existingDocTypes.map((dt: any) => dt.name);
    const docTypeMap = new Map<string, string>();
    existingDocTypes.forEach((dt: any) => {
      docTypeMap.set(normalize(dt.name), dt.name);
    });

    const validProcessTypeNames = existingProcessTypes.map((pt: any) => pt.name);
    const processTypeMap = new Map<string, string>();
    existingProcessTypes.forEach((pt: any) => {
      processTypeMap.set(normalize(pt.name), pt.name);
    });

    const validSubPackageNames = (existingSubPackages || []).map((sp: any) => sp.name);
    const subPackageMap = new Map<string, string>();
    existingSubPackages.forEach((sp: any) => {
      subPackageMap.set(normalize(sp.name), sp.name);
    });

    const validCustomerTypes = ["Individual", "Corporate", ...existingCustomerTypes.map((ct: any) => ct.name)];
    const customerTypeMap = new Map<string, string>();
    validCustomerTypes.forEach((ct) => {
      customerTypeMap.set(normalize(ct), ct);
    });

    const validCompanyNames = (existingCorporateDetails || []).map((cd: any) => cd.companyName);
    const corporateMap = new Map<string, { id: string; name: string }>();
    existingCorporateDetails.forEach((cd: any) => {
      corporateMap.set(normalize(cd.companyName), { id: cd.id, name: cd.companyName });
    });

    const defaultPaymentModes = ["Cash", "Bank Transfer", "UPI", "Credit Card", "Debit Card", "Cheque", "Demand Draft", "Online Payment", "Wallet", "Other"];
    const validPaymentModes = Array.from(
      new Set([...defaultPaymentModes, ...existingPaymentModes.map((pm: any) => pm.paymentModeName)])
    );
    const paymentModeMap = new Map<string, string>();
    validPaymentModes.forEach((pm) => {
      paymentModeMap.set(normalize(pm), pm);
    });

    const validUserDisplayNames = existingUsers.map((u: any) => u.name || u.email).filter(Boolean);
    const userMap = new Map<string, { id: string; name: string; email: string }>();
    existingUsers.forEach((u: any) => {
      if (u.name) userMap.set(normalize(u.name), { id: u.id, name: u.name, email: u.email || "" });
      if (u.email) userMap.set(normalize(u.email), { id: u.id, name: u.name || u.email, email: u.email });
      userMap.set(normalize(u.id), { id: u.id, name: u.name || u.email, email: u.email || "" });
    });

    const existingTrackingNumbers = new Set(
      existingRegistrations.map((r: { trackingNumber: string }) => r.trackingNumber.trim().toUpperCase())
    );

    // Count occurrences of each tracking number in the uploaded file to detect duplicates within the file
    const fileTrackingCounts = new Map<string, number>();
    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const rowValues = rawRows[r] || [];
      const hasAnyValue = rowValues.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "");
      if (!hasAnyValue) continue;

      let rawT = "";
      columnIndexToField.forEach((def, colIdx) => {
        if (def.key === "trackingNumber") {
          rawT = cleanStr(rowValues[colIdx]);
        }
      });
      const normT = normalizeTrackingNumber(rawT).toUpperCase();
      if (normT) {
        fileTrackingCounts.set(normT, (fileTrackingCounts.get(normT) || 0) + 1);
      }
    }

    // --- Process Rows ---
    const processedRows = [];
    let validCount = 0;
    let mismatchCount = 0;
    let duplicateCount = 0;
    let warningCount = 0;

    for (let r = headerRowIdx + 1; r < rawRows.length; r++) {
      const rowValues = rawRows[r] || [];
      const hasAnyValue = rowValues.some((cell) => cell !== undefined && cell !== null && String(cell).trim() !== "");
      if (!hasAnyValue) {
        continue;
      }

      const rowData: Record<string, any> = {};

      // Map raw row values into canonical keys
      columnIndexToField.forEach((def, colIdx) => {
        const cell = selectedWs ? selectedWs[XLSX.utils.encode_cell({ r, c: colIdx })] : null;
        const cellText = cell?.w ? String(cell.w).trim() : "";
        const rawVal = rowValues[colIdx];

        if (cellText !== "" || (rawVal !== undefined && rawVal !== null && rawVal !== "")) {
          if (def.type === "number") {
            const numVal = cell?.v !== undefined && typeof cell.v === "number" ? cell.v : Number(String(cellText || rawVal).replace(/[^0-9.-]/g, ""));
            rowData[def.key] = isNaN(numVal) ? (cellText || rawVal) : numVal;
          } else if (def.type === "date" || rawVal instanceof Date) {
            // Prioritize formatted cell text (e.g. "01/05/26") for explicit DD/MM/YY parsing
            const dateInput = cellText || rawVal;
            const parsed = parseDateValue(dateInput);
            if (parsed.isValid && parsed.date) {
              rowData[def.key] = parsed.date.toISOString();
            } else {
              rowData[def.key] = cleanStr(cellText || rawVal);
            }
          } else if (def.key === "trackingNumber") {
            const trackingInput = cellText || String(rawVal);
            rowData[def.key] = normalizeTrackingNumber(trackingInput);
          } else {
            rowData[def.key] = cleanStr(cellText || rawVal);
          }
        } else {
          rowData[def.key] = "";
        }
      });

      const mismatches: RowMismatchDetail[] = [];
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Customer Name (Optional)
      rowData.customerName = cleanStr(rowData.customerName);

      // 2. Mobile Number (Optional - validate digits if provided)
      const rawMobile = cleanStr(rowData.mobile);
      if (rawMobile) {
        const digits = rawMobile.replace(/\D/g, "");
        if (digits.length < 7 || digits.length > 15) {
          errors.push(`Invalid Mobile Number (${rawMobile}). Must be 7 to 15 digits.`);
          mismatches.push({
            field: "Mobile Number",
            fieldKey: "mobile",
            value: rawMobile,
            status: "Error",
            reason: "Must be a valid mobile number between 7 and 15 digits.",
          });
        } else {
          // Normalize mobile number
          rowData.mobile = rawMobile.startsWith("+") ? `+${digits}` : digits.length === 10 ? `+91${digits}` : `+${digits}`;
        }
      } else {
        rowData.mobile = "";
      }

      // 3. Email (optional format check)
      const rawEmail = cleanStr(rowData.email);
      if (rawEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(rawEmail)) {
          warnings.push(`Email format appears invalid: "${rawEmail}"`);
          mismatches.push({
            field: "Email",
            fieldKey: "email",
            value: rawEmail,
            status: "Warning",
            reason: "Email format appears unusual.",
          });
        }
      }

      // 4. Duplicate Tracking Number Check (ONLY by Tracking Number)
      const rawTrackingNumber = cleanStr(rowData.trackingNumber);
      const normTrackingNumber = normalizeTrackingNumber(rawTrackingNumber).toUpperCase();
      let isDuplicate = false;
      let duplicateReason = "";

      if (normTrackingNumber) {
        if (existingTrackingNumbers.has(normTrackingNumber)) {
          isDuplicate = true;
          duplicateReason = `Tracking Number ${rawTrackingNumber} already exists in the system.`;
        } else if ((fileTrackingCounts.get(normTrackingNumber) || 0) > 1) {
          isDuplicate = true;
          duplicateReason = `Tracking Number ${rawTrackingNumber} appears multiple times in this import file.`;
        }
      }

      if (isDuplicate) {
        duplicateCount++;
        warnings.push(duplicateReason);
        mismatches.push({
          field: "Tracking Number",
          fieldKey: "trackingNumber",
          value: rawTrackingNumber,
          status: "Warning",
          reason: duplicateReason,
        });
      }

      // 5. Customer Type Validation
      const rawCustomerType = cleanStr(rowData.customerType);
      if (rawCustomerType) {
        const normCt = normalize(rawCustomerType);
        if (customerTypeMap.has(normCt)) {
          rowData.customerType = customerTypeMap.get(normCt)!;
        } else {
          const suggested = findClosestMatch(rawCustomerType, validCustomerTypes);
          mismatches.push({
            field: "Customer Type",
            fieldKey: "customerType",
            value: rawCustomerType,
            status: "Mismatch",
            reason: `Customer Type "${rawCustomerType}" does not exist.`,
            suggestion: suggested,
          });
        }
      } else {
        rowData.customerType = "Individual";
      }

      // 6. Corporate Company Validation
      const rawCompany = cleanStr(rowData.corporateDetailName);
      if (rawCompany) {
        const normCompany = normalize(rawCompany);
        if (corporateMap.has(normCompany)) {
          const matched = corporateMap.get(normCompany)!;
          rowData.corporateDetailId = matched.id;
          rowData.corporateDetailName = matched.name;
        } else {
          const suggested = findClosestMatch(rawCompany, validCompanyNames);
          mismatches.push({
            field: "Company Name",
            fieldKey: "corporateDetailName",
            value: rawCompany,
            status: "Mismatch",
            reason: `Company "${rawCompany}" was not found in Corporate Details master configuration.`,
            suggestion: suggested,
          });
        }
      }

      // 7. Document Type Validation (Master Data)
      const rawDocType = cleanStr(rowData.documentType);
      if (rawDocType) {
        const normDoc = normalize(rawDocType);
        if (docTypeMap.has(normDoc)) {
          rowData.documentType = docTypeMap.get(normDoc)!;
        } else {
          const suggested = findClosestMatch(rawDocType, validDocTypeNames);
          mismatches.push({
            field: "Document Type",
            fieldKey: "documentType",
            value: rawDocType,
            status: "Mismatch",
            reason: `Document Type "${rawDocType}" does not exist in Master Configuration.`,
            suggestion: suggested,
          });
        }
      }

      // 8. Process Type Validation (Master Data)
      const rawProcType = cleanStr(rowData.processType);
      if (rawProcType) {
        const normProc = normalize(rawProcType);
        if (processTypeMap.has(normProc)) {
          rowData.processType = processTypeMap.get(normProc)!;
        } else {
          const suggested = findClosestMatch(rawProcType, validProcessTypeNames);
          mismatches.push({
            field: "Process Type",
            fieldKey: "processType",
            value: rawProcType,
            status: "Mismatch",
            reason: `Process Type "${rawProcType}" does not exist in Master Configuration.`,
            suggestion: suggested,
          });
        }
      }

      // 9. Sub Package Validation (if provided)
      const rawSubPkg = cleanStr(rowData.subPackage);
      if (rawSubPkg) {
        const normSub = normalize(rawSubPkg);
        if (subPackageMap.has(normSub)) {
          rowData.subPackage = subPackageMap.get(normSub)!;
        } else if (validSubPackageNames.length > 0) {
          const suggested = findClosestMatch(rawSubPkg, validSubPackageNames);
          mismatches.push({
            field: "Sub Package",
            fieldKey: "subPackage",
            value: rawSubPkg,
            status: "Mismatch",
            reason: `Sub Package "${rawSubPkg}" is not configured in Master Configuration.`,
            suggestion: suggested,
          });
        }
      }

      // 10. Delivery Location Validation (OfficeLocation / Delivery Type)
      const rawDeliveryLoc = cleanStr(rowData.deliveryLocation);
      if (rawDeliveryLoc) {
        const normDeliv = normalize(rawDeliveryLoc);
        if (["home delivery", "courier", "office delivery", "client delivery", "customer delivery"].includes(normDeliv)) {
          // Standard accepted non-office delivery mode
          rowData.deliveryLocation = rawDeliveryLoc;
        } else if (officeMap.has(normDeliv)) {
          rowData.deliveryLocation = officeMap.get(normDeliv)!.name;
        } else {
          const suggested = findClosestMatch(rawDeliveryLoc, validOfficeNames);
          mismatches.push({
            field: "Delivery Location",
            fieldKey: "deliveryLocation",
            value: rawDeliveryLoc,
            status: "Mismatch",
            reason: `Delivery Location "${rawDeliveryLoc}" does not match any active Office Location.`,
            suggestion: suggested,
          });
        }
      }

      // 11. Registration Office Validation
      const rawRegOffice = cleanStr(rowData.regionOfRegistration);
      if (rawRegOffice) {
        const normRegOff = normalize(rawRegOffice);
        if (officeMap.has(normRegOff)) {
          rowData.regionOfRegistration = officeMap.get(normRegOff)!.name;
        } else {
          const suggested = findClosestMatch(rawRegOffice, validOfficeNames);
          mismatches.push({
            field: "Registration Office",
            fieldKey: "regionOfRegistration",
            value: rawRegOffice,
            status: "Mismatch",
            reason: `Registration Office "${rawRegOffice}" is not an active Office Location in your organization.`,
            suggestion: suggested,
          });
        }
      }

      // 12. Commission To User Validation
      const rawCommUser = cleanStr(rowData.commissionToUser);
      if (rawCommUser) {
        const normComm = normalize(rawCommUser);
        if (userMap.has(normComm)) {
          const matchedUser = userMap.get(normComm)!;
          rowData.commissionToUserId = matchedUser.id;
          rowData.commissionToName = matchedUser.name;
          rowData.commissionToEmail = matchedUser.email;
        } else {
          const suggested = findClosestMatch(rawCommUser, validUserDisplayNames);
          mismatches.push({
            field: "Commission To User",
            fieldKey: "commissionToUser",
            value: rawCommUser,
            status: "Mismatch",
            reason: `No active user "${rawCommUser}" found in your organization scope.`,
            suggestion: suggested,
          });
        }
      }

      // 13. Registered Person / Created By Validation
      const rawRegPerson = cleanStr(rowData.registeredPerson);
      if (rawRegPerson) {
        const normPerson = normalize(rawRegPerson);
        if (userMap.has(normPerson)) {
          rowData.registeredPerson = userMap.get(normPerson)!.name;
        } else {
          // Allowed as display text, but note if user not found
          rowData.registeredPerson = rawRegPerson;
        }
      }

      // 14. Priority Validation
      const rawPriority = cleanStr(rowData.priority);
      if (rawPriority) {
        const validPriorities = ["Normal", "Express", "Super Fast"];
        const match = validPriorities.find((p) => p.toLowerCase() === rawPriority.toLowerCase());
        if (match) {
          rowData.priority = match;
        } else {
          mismatches.push({
            field: "Priority",
            fieldKey: "priority",
            value: rawPriority,
            status: "Mismatch",
            reason: `Invalid Priority "${rawPriority}". Must be Normal, Express, or Super Fast.`,
            suggestion: "Normal",
          });
        }
      } else {
        rowData.priority = "Normal";
      }

      // 15. Payment Mode Validation
      const rawPayMode = cleanStr(rowData.paymentMode);
      if (rawPayMode) {
        const normPay = normalize(rawPayMode);
        if (paymentModeMap.has(normPay)) {
          rowData.paymentMode = paymentModeMap.get(normPay)!;
        } else {
          const suggested = findClosestMatch(rawPayMode, validPaymentModes);
          mismatches.push({
            field: "Payment Mode",
            fieldKey: "paymentMode",
            value: rawPayMode,
            status: "Mismatch",
            reason: `Payment Mode "${rawPayMode}" is not recognized.`,
            suggestion: suggested,
          });
        }
      }

      // 16. Total Charges & Advance Paid Validation
      const totalCharges = Number(rowData.totalCharges || 0);
      const advancePaid = Number(rowData.advancePaid || 0);

      if (isNaN(totalCharges) || totalCharges < 0) {
        errors.push("Total Charges must be a positive number.");
        mismatches.push({
          field: "Total Charges",
          fieldKey: "totalCharges",
          value: String(rowData.totalCharges),
          status: "Error",
          reason: "Total Charges must be a valid non-negative number.",
        });
      }

      if (isNaN(advancePaid) || advancePaid < 0) {
        errors.push("Advance Paid must be a positive number.");
        mismatches.push({
          field: "Advance Paid",
          fieldKey: "advancePaid",
          value: String(rowData.advancePaid),
          status: "Error",
          reason: "Advance Paid must be a valid non-negative number.",
        });
      } else if (totalCharges > 0 && advancePaid > totalCharges) {
        errors.push(`Advance Paid (${advancePaid}) exceeds Total Charges (${totalCharges}).`);
        mismatches.push({
          field: "Advance Paid",
          fieldKey: "advancePaid",
          value: String(advancePaid),
          status: "Error",
          reason: `Advance Paid (${advancePaid}) cannot exceed Total Charges (${totalCharges}).`,
        });
      }

      rowData.totalCharges = isNaN(totalCharges) ? 0 : totalCharges;
      rowData.advancePaid = isNaN(advancePaid) ? 0 : advancePaid;
      rowData.balanceAmount = Math.max(0, rowData.totalCharges - rowData.advancePaid);

      // 17. Created Date Validation (Optional)
      const rawCreatedDate = cleanStr(rowData.createdDate);
      if (rawCreatedDate) {
        const parsedCreatedDate = parseDateValue(rawCreatedDate);
        if (!parsedCreatedDate.isValid || !parsedCreatedDate.date) {
          errors.push(`Invalid Created Date format: "${rawCreatedDate}".`);
          mismatches.push({
            field: "Created Date",
            fieldKey: "createdDate",
            value: rawCreatedDate,
            status: "Error",
            reason: `Invalid Created Date "${rawCreatedDate}". Expected format DD/MM/YYYY or DD/MM/YYYY HH:mm (e.g. 15/07/2025).`,
          });
        } else {
          rowData.createdDate = parsedCreatedDate.date.toISOString();
        }
      } else {
        rowData.createdDate = ""; // Blank is valid, falls back to import timestamp
      }

      // 18. Optional payment dates validation
      if (rowData.transferDate) {
        const p = parseDateValue(rowData.transferDate);
        if (!p.isValid) {
          mismatches.push({
            field: "Transfer Date",
            fieldKey: "transferDate",
            value: String(rowData.transferDate),
            status: "Mismatch",
            reason: "Invalid Date format. Expected DD/MM/YYYY or YYYY-MM-DD.",
          });
        } else if (p.date) {
          rowData.transferDate = p.date.toISOString().split("T")[0];
        }
      }
      if (rowData.chequeDate) {
        const p = parseDateValue(rowData.chequeDate);
        if (!p.isValid) {
          mismatches.push({
            field: "Cheque Date",
            fieldKey: "chequeDate",
            value: String(rowData.chequeDate),
            status: "Mismatch",
            reason: "Invalid Date format. Expected DD/MM/YYYY or YYYY-MM-DD.",
          });
        } else if (p.date) {
          rowData.chequeDate = p.date.toISOString().split("T")[0];
        }
      }
      if (rowData.ddDate) {
        const p = parseDateValue(rowData.ddDate);
        if (!p.isValid) {
          mismatches.push({
            field: "DD Date",
            fieldKey: "ddDate",
            value: String(rowData.ddDate),
            status: "Mismatch",
            reason: "Invalid Date format. Expected DD/MM/YYYY or YYYY-MM-DD.",
          });
        } else if (p.date) {
          rowData.ddDate = p.date.toISOString().split("T")[0];
        }
      }

      // Determine Row Status
      const hasBlockingMismatches = mismatches.some((m) => m.status === "Error" || m.status === "Mismatch");

      let rowStatus: "Valid" | "Warning" | "Mismatch" | "Duplicate";
      if (hasBlockingMismatches) {
        rowStatus = "Mismatch";
        mismatchCount++;
      } else if (isDuplicate) {
        rowStatus = "Duplicate";
      } else if (warnings.length > 0) {
        rowStatus = "Warning";
        warningCount++;
        validCount++;
      } else {
        rowStatus = "Valid";
        validCount++;
      }

      processedRows.push({
        rowNumber: r + 1, // 1-indexed Excel row
        data: rowData,
        status: rowStatus,
        mismatches,
        errors,
        warnings,
        isSelected: rowStatus === "Valid" || rowStatus === "Warning",
        resolutionAction: isDuplicate ? "Skip" : "Create", // "Skip" | "Update" | "Duplicate"
      });
    }

    return NextResponse.json({
      success: true,
      summary: {
        totalRows: rawRows.length - 1,
        validCount,
        mismatchCount,
        duplicateCount,
        warningCount,
        unmappedHeaders,
      },
      rows: processedRows,
    });
  } catch (error: any) {
    console.error("[POST /api/registrations/import/preview] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to parse import file", details: error.message },
      { status: 500 }
    );
  }
}
