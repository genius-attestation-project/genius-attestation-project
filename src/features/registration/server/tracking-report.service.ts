import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { SessionAccess } from "@/features/admin/types/rbac.types";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";

export interface TrackingReportParams {
  office?: string;
  officeIds?: string[];
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
  page?: number;
  pageSize?: number;
  search?: string;
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

export interface CountryAnalyticsItem {
  country: string;
  totalDocuments: number;
  totalCharges: number;
  totalPaid: number;
  totalBalance: number;
}

export interface OfficeAnalyticsItem {
  office: string;
  country: string;
  totalDocuments: number;
  totalCharges: number;
  totalPaid: number;
  totalBalance: number;
}

export interface CountryOfficeAnalyticsItem {
  country: string;
  totalDocuments: number;
  totalCharges: number;
  totalPaid: number;
  totalBalance: number;
  offices: OfficeAnalyticsItem[];
}

export interface TrackingReportResult {
  sections: TrackingReportCountrySection[];
  items: TrackingReportItem[];
  summary: TrackingReportSummary;
  countryAnalytics: CountryAnalyticsItem[];
  officeAnalytics: OfficeAnalyticsItem[];
  countryOfficeAnalytics?: CountryOfficeAnalyticsItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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
 * Builds where criteria enforcing tenant isolation, multi-office visibility, and filters.
 */
async function buildTrackingReportWhere(
  ownerAdminId: string,
  params: TrackingReportParams,
  userAccess?: SessionAccess
): Promise<Prisma.RegistrationWhereInput> {
  const isSuperAdmin = Boolean(userAccess?.isSuperAdmin);

  // Normalize requested offices (from array or comma-separated string)
  let requestedOffices: string[] = [];
  if (Array.isArray(params.officeIds) && params.officeIds.length > 0) {
    requestedOffices = params.officeIds
      .flatMap((id) => (id ? id.split(",") : []))
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (params.office) {
    requestedOffices = params.office
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  if (requestedOffices.length === 0) {
    throw new Error("Office selection is required to generate the revenue report.");
  }

  const isAllOfficesSelected = requestedOffices.some((o) => o.toLowerCase() === "all");

  const andConditions: Prisma.RegistrationWhereInput[] = [
    { ownerAdminId },
  ];

  // 1. Office Security Check & Multiple Office Scope
  let userAllowedIds: string[] | null = null;
  let userAllowedNames: string[] = [];

  if (!isSuperAdmin && userAccess) {
    const modConfig =
      userAccess.moduleOfficeVisibilities?.["revenue_report"] ||
      userAccess.moduleOfficeVisibilities?.["tracking_report"] ||
      userAccess.moduleOfficeVisibilities?.["search_report"];

    if (modConfig) {
      userAllowedIds = modConfig.officeIds;
      userAllowedNames = modConfig.officeNames || [];
    } else if (userAccess.allowedOfficeIds !== undefined) {
      userAllowedIds = userAccess.allowedOfficeIds;
      userAllowedNames = userAccess.allowedOfficeNames ?? [];
    }
  }

  if (isAllOfficesSelected) {
    // If user is restricted to specific offices, scope strictly to allowed offices
    if (!isSuperAdmin && userAllowedIds !== null) {
      if (userAllowedIds.length === 0 && userAllowedNames.length === 0) {
        throw new Error("You do not have authorization for any office.");
      }

      andConditions.push({
        OR: [
          { regionOfRegistrationId: { in: userAllowedIds } },
          { regionOfRegistration: { in: userAllowedNames } },
          { creator: { officeLocationId: { in: userAllowedIds } } },
          { creator: { officeLocationRef: { officeName: { in: userAllowedNames } } } },
        ],
      });
    }
    // SuperAdmin with "all" gets all offices for this ownerAdmin
  } else {
    // Specific office(s) selected: query OfficeLocation to get exact IDs and names
    const officeLocations = await prisma.officeLocation.findMany({
      where: {
        ownerAdminId,
        OR: [
          { id: { in: requestedOffices } },
          { officeName: { in: requestedOffices } },
        ],
      },
      select: { id: true, officeName: true },
    });

    const validOfficeIds: string[] = [];
    const validOfficeNames: string[] = [];

    for (const reqOffice of requestedOffices) {
      const match = officeLocations.find(
        (loc) => loc.id === reqOffice || loc.officeName.toLowerCase() === reqOffice.toLowerCase()
      );

      const targetId = match ? match.id : reqOffice;
      const targetName = match ? match.officeName : reqOffice;

      if (!isSuperAdmin && userAccess) {
        const isAllowed =
          (userAllowedIds !== null && (userAllowedIds.includes(targetId) || userAllowedNames.includes(targetName))) ||
          hasOfficeAccess(userAccess, targetId, "revenue_report") ||
          hasOfficeAccess(userAccess, targetName, "revenue_report") ||
          hasOfficeAccess(userAccess, targetId, "tracking_report") ||
          hasOfficeAccess(userAccess, targetName, "tracking_report") ||
          hasOfficeAccess(userAccess, targetId, "search_report") ||
          hasOfficeAccess(userAccess, targetName, "search_report");

        if (isAllowed) {
          validOfficeIds.push(targetId);
          validOfficeNames.push(targetName);
        }
      } else {
        validOfficeIds.push(targetId);
        validOfficeNames.push(targetName);
      }
    }

    if (!isSuperAdmin && validOfficeIds.length === 0 && validOfficeNames.length === 0) {
      throw new Error("You are not authorized to view revenue reports for the selected office(s).");
    }

    andConditions.push({
      OR: [
        { regionOfRegistrationId: { in: validOfficeIds } },
        { regionOfRegistration: { in: validOfficeNames } },
        { creator: { officeLocationId: { in: validOfficeIds } } },
        { creator: { officeLocationRef: { officeName: { in: validOfficeNames } } } },
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

  // 3. Search / Text Filter
  if (params.search?.trim()) {
    const s = params.search.trim();
    andConditions.push({
      OR: [
        { trackingNumber: { contains: s } },
        { customerName: { contains: s } },
        { mobile: { contains: s } },
        { documentType: { contains: s } },
        { documentName: { contains: s } },
        { registeredPerson: { contains: s } },
        { collectedPerson: { contains: s } },
      ],
    });
  }

  // 4. Additional Report Filters
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
 * Generates the structured Revenue / Tracking Report with country & office analytics and backend pagination.
 */
export async function getTrackingReport(
  ownerAdminId: string,
  params: TrackingReportParams,
  userAccess?: SessionAccess
): Promise<TrackingReportResult> {
  const where = await buildTrackingReportWhere(ownerAdminId, params, userAccess);

  // 1. Fetch lightweight projection for all matching records to compute Summary & Analytics across the entire filtered dataset
  const allRegistrations = await prisma.registration.findMany({
    where,
    select: {
      id: true,
      totalCharges: true,
      advancePaid: true,
      balanceAmount: true,
      country: true,
      regionOfRegistration: true,
      regionOfRegistrationRef: {
        select: { officeName: true, location: true },
      },
      creator: {
        select: {
          officeLocationRef: { select: { officeName: true, location: true } },
        },
      },
    },
  });

  const total = allRegistrations.length;
  let grandTotalCharge = 0;
  let grandTotalPaid = 0;
  let grandTotalBalance = 0;

  const countryAnalyticsMap = new Map<string, { totalDocuments: number; totalCharges: number; totalPaid: number; totalBalance: number }>();
  const officeAnalyticsMap = new Map<string, { country: string; totalDocuments: number; totalCharges: number; totalPaid: number; totalBalance: number }>();
  const countryOfficesMap = new Map<string, Map<string, OfficeAnalyticsItem>>();

  for (const reg of allRegistrations) {
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

    const charge = Number(reg.totalCharges ?? 0);
    const paid = Number(reg.advancePaid ?? 0);
    const balance = Number(reg.balanceAmount ?? 0);

    grandTotalCharge += charge;
    grandTotalPaid += paid;
    grandTotalBalance += balance;

    // Country Analytics Aggregation
    if (!countryAnalyticsMap.has(country)) {
      countryAnalyticsMap.set(country, { totalDocuments: 0, totalCharges: 0, totalPaid: 0, totalBalance: 0 });
    }
    const countryStats = countryAnalyticsMap.get(country)!;
    countryStats.totalDocuments += 1;
    countryStats.totalCharges += charge;
    countryStats.totalPaid += paid;
    countryStats.totalBalance += balance;

    // Office Analytics Aggregation
    if (!officeAnalyticsMap.has(resolvedOffice)) {
      officeAnalyticsMap.set(resolvedOffice, { country, totalDocuments: 0, totalCharges: 0, totalPaid: 0, totalBalance: 0 });
    }
    const officeStats = officeAnalyticsMap.get(resolvedOffice)!;
    officeStats.totalDocuments += 1;
    officeStats.totalCharges += charge;
    officeStats.totalPaid += paid;
    officeStats.totalBalance += balance;

    // Country-Office Map Aggregation
    if (!countryOfficesMap.has(country)) {
      countryOfficesMap.set(country, new Map());
    }
    const officesInCountry = countryOfficesMap.get(country)!;
    if (!officesInCountry.has(resolvedOffice)) {
      officesInCountry.set(resolvedOffice, {
        office: resolvedOffice,
        country,
        totalDocuments: 0,
        totalCharges: 0,
        totalPaid: 0,
        totalBalance: 0,
      });
    }
    const oStats = officesInCountry.get(resolvedOffice)!;
    oStats.totalDocuments += 1;
    oStats.totalCharges += charge;
    oStats.totalPaid += paid;
    oStats.totalBalance += balance;
  }

  const countryAnalytics: CountryAnalyticsItem[] = Array.from(countryAnalyticsMap.entries())
    .map(([country, stats]) => ({
      country,
      ...stats,
    }))
    .sort((a, b) => b.totalCharges - a.totalCharges);

  const officeAnalytics: OfficeAnalyticsItem[] = Array.from(officeAnalyticsMap.entries())
    .map(([office, stats]) => ({
      office,
      country: stats.country,
      totalDocuments: stats.totalDocuments,
      totalCharges: stats.totalCharges,
      totalPaid: stats.totalPaid,
      totalBalance: stats.totalBalance,
    }))
    .sort((a, b) => b.totalCharges - a.totalCharges);

  const countryOfficeAnalytics: CountryOfficeAnalyticsItem[] = Array.from(countryOfficesMap.entries())
    .map(([country, officesMap]) => {
      const offices = Array.from(officesMap.values()).sort((a, b) => b.totalCharges - a.totalCharges);
      const totalDocuments = offices.reduce((sum, o) => sum + o.totalDocuments, 0);
      const totalCharges = offices.reduce((sum, o) => sum + o.totalCharges, 0);
      const totalPaid = offices.reduce((sum, o) => sum + o.totalPaid, 0);
      const totalBalance = offices.reduce((sum, o) => sum + o.totalBalance, 0);

      return {
        country,
        totalDocuments,
        totalCharges,
        totalPaid,
        totalBalance,
        offices,
      };
    })
    .sort((a, b) => b.totalCharges - a.totalCharges);

  // Calculate pagination parameters
  const page = Math.max(1, Number(params.page) || 1);
  const pageSize = Math.max(1, Number(params.pageSize) || 10);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // 2. Fetch paginated records for the current table page
  const paginatedRegistrations = await prisma.registration.findMany({
    where,
    orderBy: [
      { regionOfRegistration: "asc" },
      { createdAt: "desc" },
    ],
    skip,
    take,
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
  let overallCounter = skip;
  const flatItems: TrackingReportItem[] = [];

  for (const reg of paginatedRegistrations) {
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

  // Build structured hierarchy for the paginated page view
  const sections: TrackingReportCountrySection[] = [];

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
      totalDocuments: total,
      totalCharges: grandTotalCharge,
      totalPaid: grandTotalPaid,
      totalBalance: grandTotalBalance,
    },
    countryAnalytics,
    officeAnalytics,
    countryOfficeAnalytics,
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Generates Excel export buffer for Revenue / Tracking Report for all matching records without pagination truncation.
 */
export async function getTrackingReportExport(
  ownerAdminId: string,
  params: TrackingReportParams,
  userAccess?: SessionAccess
): Promise<{ buffer: Buffer; fileName: string }> {
  // Pass large pageSize to export all matching records
  const reportData = await getTrackingReport(
    ownerAdminId,
    {
      ...params,
      page: 1,
      pageSize: 50000,
    },
    userAccess
  );

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
  const safeOffice = (
    params.officeIds && params.officeIds.length > 1
      ? "Multiple_Offices"
      : params.office || "All"
  ).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Revenue_Report_${safeOffice}_${dateStr}.xlsx`;

  return { buffer, fileName };
}
