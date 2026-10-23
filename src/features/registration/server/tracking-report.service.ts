import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { SessionAccess } from "@/features/admin/types/rbac.types";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";

export interface TrackingReportParams {
  office: string;
  fromDate?: string;
  toDate?: string;
  trackingNumber?: string;
  customerName?: string;
  mobile?: string;
  registeredPerson?: string;
  collectedPerson?: string;
  documentType?: string;
  processType?: string;
  status?: string;
  hasBalance?: string;
}

export interface TrackingReportItem {
  id: string;
  overallSlNo: number;
  officeSlNo: number;
  trackingNumber: string;
  regDate: string;
  regOffice: string;
  registeredBy: string;
  collectedBy: string;
  customerName: string;
  documentType: string;
  processType: string;
  mobile: string;
  status: string;
  charge: number;
  paid: number;
  balance: number;
  country: string;
}

export interface TrackingReportOfficeGroup {
  officeName: string;
  items: TrackingReportItem[];
  subtotal: {
    charge: number;
    paid: number;
    balance: number;
    count: number;
  };
}

export interface TrackingReportCountrySection {
  country: string;
  offices: TrackingReportOfficeGroup[];
  totalCharge: number;
  totalPaid: number;
  totalBalance: number;
  totalCount: number;
}

export interface TrackingReportSummary {
  totalDocuments: number;
  totalCharges: number;
  totalPaid: number;
  totalBalance: number;
}

export interface TrackingReportResult {
  sections: TrackingReportCountrySection[];
  items: TrackingReportItem[];
  summary: TrackingReportSummary;
}

/**
 * Resolves authoritative country name for an office or registration based on office metadata and registration country.
 */
export function resolveCountry(
  officeName: string,
  officeLocation?: string | null,
  regCountry?: string | null
): string {
  const cleanName = (officeName || "").toLowerCase().trim();
  const cleanLoc = (officeLocation || "").toLowerCase().trim();
  const cleanRegCountry = (regCountry || "").trim();

  if (
    cleanName.includes("dubai") || cleanName.includes("uae") || cleanName.includes("abu dhabi") || cleanName.includes("sharjah") ||
    cleanLoc.includes("dubai") || cleanLoc.includes("uae") || cleanLoc.includes("emirates") || cleanLoc.includes("united arab")
  ) {
    return "UAE";
  }
  if (
    cleanName.includes("qatar") || cleanName.includes("doha") ||
    cleanLoc.includes("qatar") || cleanLoc.includes("doha")
  ) {
    return "Qatar";
  }
  if (cleanName.includes("kuwait") || cleanLoc.includes("kuwait")) {
    return "Kuwait";
  }
  if (cleanName.includes("bahrain") || cleanLoc.includes("bahrain") || cleanLoc.includes("manama")) {
    return "Bahrain";
  }
  if (cleanName.includes("oman") || cleanLoc.includes("oman") || cleanLoc.includes("muscat")) {
    return "Oman";
  }
  if (cleanName.includes("saudi") || cleanLoc.includes("saudi") || cleanLoc.includes("riyadh")) {
    return "Saudi Arabia";
  }
  if (
    cleanName.includes("india") || cleanName.includes("calicut") || cleanName.includes("chennai") ||
    cleanName.includes("kochi") || cleanName.includes("ernakulam") || cleanName.includes("thrissur") ||
    cleanName.includes("delhi") || cleanName.includes("mumbai") || cleanName.includes("bangalore") ||
    cleanName.includes("jeevan bhima") || cleanName.includes("hyderabad") || cleanName.includes("madurai") ||
    cleanName.includes("coimbatore") || cleanName.includes("kollam") || cleanName.includes("kottayam") ||
    cleanName.includes("malappuram") ||
    cleanLoc.includes("india") || cleanLoc.includes("kerala") || cleanLoc.includes("tamilnadu") ||
    cleanLoc.includes("delhi") || cleanLoc.includes("maharashtra") || cleanLoc.includes("bangalore") ||
    cleanLoc.includes("telangana")
  ) {
    return "India";
  }

  if (cleanRegCountry && cleanRegCountry !== "-" && cleanRegCountry !== "N/A") {
    return cleanRegCountry;
  }

  return "India";
}

/**
 * Builds where criteria enforcing tenant isolation, office visibility, and filters.
 */
async function buildTrackingReportWhere(
  ownerAdminId: string,
  params: TrackingReportParams,
  userAccess?: SessionAccess
): Promise<Prisma.RegistrationWhereInput> {
  const officeQuery = (params.office || "").trim();
  const isSuperAdmin = Boolean(userAccess?.isSuperAdmin);

  if (!officeQuery) {
    throw new Error("Office selection is required to generate the tracking report.");
  }

  const isAllOfficesSelected = officeQuery.toLowerCase() === "all";

  const andConditions: Prisma.RegistrationWhereInput[] = [
    { ownerAdminId },
  ];

  // 1. Office Security Check & Scope
  if (isAllOfficesSelected) {
    // If not superadmin and restricted to specific offices, scope query strictly to allowed offices
    if (!isSuperAdmin && userAccess) {
      let allowedIds = userAccess.allowedOfficeIds;
      let allowedNames = userAccess.allowedOfficeNames ?? [];

      const modConfig =
        userAccess.moduleOfficeVisibilities?.["revenue_report"] ||
        userAccess.moduleOfficeVisibilities?.["tracking_report"] ||
        userAccess.moduleOfficeVisibilities?.["search_report"];

      if (modConfig) {
        allowedIds = modConfig.officeIds;
        allowedNames = modConfig.officeNames;
      }

      if (allowedIds !== null && allowedIds !== undefined) {
        if (allowedIds.length === 0 && allowedNames.length === 0) {
          throw new Error("You do not have authorization for any office.");
        }

        andConditions.push({
          OR: [
            { regionOfRegistrationId: { in: allowedIds } },
            { regionOfRegistration: { in: allowedNames } },
            { creator: { officeLocationId: { in: allowedIds } } },
            { creator: { officeLocationRef: { officeName: { in: allowedNames } } } },
          ],
        });
      }
    }
  } else {
    // A specific office is selected: verify authorization for non-superadmins
    if (!isSuperAdmin && userAccess) {
      const isAllowed =
        hasOfficeAccess(userAccess, officeQuery, "revenue_report") ||
        hasOfficeAccess(userAccess, officeQuery, "tracking_report") ||
        hasOfficeAccess(userAccess, officeQuery, "search_report");

      if (!isAllowed) {
        throw new Error("You are not authorized to view revenue reports for this office.");
      }
    }

    const officeLocation = await prisma.officeLocation.findFirst({
      where: {
        ownerAdminId,
        OR: [{ id: officeQuery }, { officeName: officeQuery }],
      },
      select: { id: true, officeName: true },
    });

    const targetOfficeId = officeLocation ? officeLocation.id : officeQuery;
    const targetOfficeName = officeLocation ? officeLocation.officeName : officeQuery;

    andConditions.push({
      OR: [
        { regionOfRegistrationId: targetOfficeId },
        { regionOfRegistration: targetOfficeName },
        { creator: { officeLocationId: targetOfficeId } },
        { creator: { officeLocationRef: { officeName: targetOfficeName } } },
      ],
    });
  }

  // 2. Date Range Filter
  if (params.fromDate && params.toDate && params.fromDate > params.toDate) {
    throw new Error("From Date cannot be later than To Date.");
  }

  if (params.fromDate || params.toDate) {
    const createdAtFilter: Prisma.DateTimeFilter = {};
    if (params.fromDate) {
      createdAtFilter.gte = new Date(`${params.fromDate}T00:00:00.000Z`);
    }
    if (params.toDate) {
      createdAtFilter.lte = new Date(`${params.toDate}T23:59:59.999Z`);
    }
    andConditions.push({ createdAt: createdAtFilter });
  }

  // 3. Additional Report Filters
  if (params.trackingNumber?.trim()) {
    andConditions.push({ trackingNumber: { contains: params.trackingNumber.trim() } });
  }
  if (params.customerName?.trim()) {
    andConditions.push({ customerName: { contains: params.customerName.trim() } });
  }
  if (params.mobile?.trim()) {
    andConditions.push({ mobile: { contains: params.mobile.trim() } });
  }
  if (params.registeredPerson?.trim()) {
    andConditions.push({ registeredPerson: { contains: params.registeredPerson.trim() } });
  }
  if (params.collectedPerson?.trim()) {
    andConditions.push({ collectedPerson: { contains: params.collectedPerson.trim() } });
  }
  if (params.documentType?.trim()) {
    const docQuery = params.documentType.trim();
    andConditions.push({
      OR: [
        { documentType: { contains: docQuery } },
        { documentName: { contains: docQuery } },
      ],
    });
  }
  if (params.processType?.trim()) {
    andConditions.push({ processType: { contains: params.processType.trim() } });
  }
  if (params.status?.trim()) {
    andConditions.push({ trackingStatus: { contains: params.status.trim() } });
  }
  if (params.hasBalance === "true") {
    andConditions.push({ balanceAmount: { gt: 0 } });
  } else if (params.hasBalance === "false") {
    andConditions.push({ balanceAmount: { lte: 0 } });
  }

  return { AND: andConditions };
}

/**
 * Generates the structured Tracking Report grouped by Country and Office.
 */
export async function getTrackingReport(
  ownerAdminId: string,
  params: TrackingReportParams,
  userAccess?: SessionAccess
): Promise<TrackingReportResult> {
  const where = await buildTrackingReportWhere(ownerAdminId, params, userAccess);

  const registrations = await prisma.registration.findMany({
    where,
    orderBy: [
      { regionOfRegistration: "asc" },
      { createdAt: "desc" },
    ],
    take: 10000,
    include: {
      regionOfRegistrationRef: {
        select: { id: true, officeName: true, location: true },
      },
      creator: {
        select: {
          id: true,
          name: true,
          officeLocationRef: { select: { id: true, officeName: true, location: true } },
        },
      },
    },
  });

  const countrySectionsMap = new Map<string, Map<string, TrackingReportItem[]>>();
  let overallCounter = 0;
  const flatItems: TrackingReportItem[] = [];

  for (const reg of registrations) {
    overallCounter++;
    const resolvedOffice =
      reg.regionOfRegistration ||
      reg.regionOfRegistrationRef?.officeName ||
      reg.creator?.officeLocationRef?.officeName ||
      "Unassigned Office";

    const officeLocation =
      reg.regionOfRegistrationRef?.location ||
      reg.creator?.officeLocationRef?.location ||
      null;

    const country = resolveCountry(resolvedOffice, officeLocation, reg.country);

    if (!countrySectionsMap.has(country)) {
      countrySectionsMap.set(country, new Map());
    }
    const officesMap = countrySectionsMap.get(country)!;

    if (!officesMap.has(resolvedOffice)) {
      officesMap.set(resolvedOffice, []);
    }
    const officeItems = officesMap.get(resolvedOffice)!;

    const officeSlNo = officeItems.length + 1;
    const charge = Number(reg.totalCharges ?? 0);
    const paid = Number(reg.advancePaid ?? 0);
    const balance = Number(reg.balanceAmount ?? 0);

    const item: TrackingReportItem = {
      id: reg.id,
      overallSlNo: overallCounter,
      officeSlNo,
      trackingNumber: reg.trackingNumber,
      regDate: reg.createdAt.toISOString().split("T")[0],
      regOffice: resolvedOffice,
      registeredBy: reg.registeredPerson || reg.creator?.name || "-",
      collectedBy: reg.collectedPerson || "-",
      customerName: reg.customerName || "-",
      documentType: reg.documentType || reg.documentName || "-",
      processType: reg.processType || "-",
      mobile: reg.mobile || "-",
      status: reg.trackingStatus || "Registered",
      charge,
      paid,
      balance,
      country,
    };

    officeItems.push(item);
    flatItems.push(item);
  }

  // Build structured hierarchy
  const sections: TrackingReportCountrySection[] = [];
  let grandTotalCharge = 0;
  let grandTotalPaid = 0;
  let grandTotalBalance = 0;

  for (const [country, officesMap] of countrySectionsMap.entries()) {
    const officeGroups: TrackingReportOfficeGroup[] = [];
    let countryTotalCharge = 0;
    let countryTotalPaid = 0;
    let countryTotalBalance = 0;
    let countryTotalCount = 0;

    for (const [officeName, items] of officesMap.entries()) {
      const chargeSum = items.reduce((sum, item) => sum + item.charge, 0);
      const paidSum = items.reduce((sum, item) => sum + item.paid, 0);
      const balanceSum = items.reduce((sum, item) => sum + item.balance, 0);

      countryTotalCharge += chargeSum;
      countryTotalPaid += paidSum;
      countryTotalBalance += balanceSum;
      countryTotalCount += items.length;

      officeGroups.push({
        officeName,
        items,
        subtotal: {
          charge: chargeSum,
          paid: paidSum,
          balance: balanceSum,
          count: items.length,
        },
      });
    }

    grandTotalCharge += countryTotalCharge;
    grandTotalPaid += countryTotalPaid;
    grandTotalBalance += countryTotalBalance;

    sections.push({
      country,
      offices: officeGroups,
      totalCharge: countryTotalCharge,
      totalPaid: countryTotalPaid,
      totalBalance: countryTotalBalance,
      totalCount: countryTotalCount,
    });
  }

  return {
    sections,
    items: flatItems,
    summary: {
      totalDocuments: flatItems.length,
      totalCharges: grandTotalCharge,
      totalPaid: grandTotalPaid,
      totalBalance: grandTotalBalance,
    },
  };
}

/**
 * Generates Excel export buffer for Tracking Report.
 */
export async function getTrackingReportExport(
  ownerAdminId: string,
  params: TrackingReportParams,
  userAccess?: SessionAccess
): Promise<{ buffer: Buffer; fileName: string }> {
  const reportData = await getTrackingReport(ownerAdminId, params, userAccess);

  const exportRows: any[] = [];

  for (const section of reportData.sections) {
    for (const officeGroup of section.offices) {
      for (const item of officeGroup.items) {
        exportRows.push({
          "Sl No": item.overallSlNo,
          "Office Sl No": item.officeSlNo,
          "Track No": item.trackingNumber,
          "Reg.Date": item.regDate,
          "Reg. Office": item.regOffice,
          "Registered By": item.registeredBy,
          "Collected By": item.collectedBy,
          "Customer Name": item.customerName,
          "Document Type": item.documentType,
          "Process Type": item.processType,
          "Mobile": item.mobile,
          "Status": item.status,
          "Charge": item.charge,
          "Paid": item.paid,
          "Balance": item.balance,
          "Country": item.country,
        });
      }

      // Add subtotal row
      exportRows.push({
        "Sl No": "",
        "Office Sl No": "",
        "Track No": "",
        "Reg.Date": "",
        "Reg. Office": `${officeGroup.officeName} Subtotal`,
        "Registered By": "",
        "Collected By": "",
        "Customer Name": "",
        "Document Type": "",
        "Process Type": "",
        "Mobile": "",
        "Status": "",
        "Charge": officeGroup.subtotal.charge,
        "Paid": officeGroup.subtotal.paid,
        "Balance": officeGroup.subtotal.balance,
        "Country": section.country,
      });
    }
  }

  // Grand Total row
  if (exportRows.length > 0) {
    exportRows.push({
      "Sl No": "",
      "Office Sl No": "",
      "Track No": "",
      "Reg.Date": "",
      "Reg. Office": "GRAND TOTAL",
      "Registered By": "",
      "Collected By": "",
      "Customer Name": "",
      "Document Type": "",
      "Process Type": "",
      "Mobile": "",
      "Status": "",
      "Charge": reportData.summary.totalCharges,
      "Paid": reportData.summary.totalPaid,
      "Balance": reportData.summary.totalBalance,
      "Country": "",
    });
  }

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Revenue Report");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const dateStr = new Date().toISOString().split("T")[0];
  const safeOffice = (params.office || "All").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Revenue_Report_${safeOffice}_${dateStr}.xlsx`;

  return { buffer, fileName };
}
