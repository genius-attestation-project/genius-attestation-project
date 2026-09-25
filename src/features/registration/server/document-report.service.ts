import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import type { SessionAccess } from "@/features/admin/types/rbac.types";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";

export interface DocumentReportParams {
  office: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface DocumentReportItem {
  id: string;
  slNo: number;
  trackingNumber: string;
  customerName: string;
  documentName: string;
  totalCharges: number;
  advanceAmount: number;
  balanceAmount: number;
  officeName: string;
  createdAt: string;
}

export interface DocumentReportSummary {
  totalDocuments: number;
  totalCharges: number;
  totalAdvance: number;
  totalBalance: number;
}

export interface DocumentReportResult {
  items: DocumentReportItem[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  summary: DocumentReportSummary;
}

/**
 * Builds the where condition for document report based on selected office, date range, and search.
 */
async function buildDocumentReportWhere(
  ownerAdminId: string,
  params: DocumentReportParams,
  userAccess?: SessionAccess
): Promise<Prisma.RegistrationWhereInput> {
  const officeQuery = params.office.trim();

  // 1. Office Security Check (Non-Super Admins)
  if (userAccess && !userAccess.isSuperAdmin) {
    const isAllowed = hasOfficeAccess(userAccess, officeQuery, "search_report");
    if (!isAllowed) {
      throw new Error("You are not authorized to view document reports for this office.");
    }
  }

  // 2. Resolve target office ID & Name
  const officeLocation = await prisma.officeLocation.findFirst({
    where: {
      ownerAdminId,
      OR: [{ id: officeQuery }, { officeName: officeQuery }],
    },
    select: { id: true, officeName: true },
  });

  const targetOfficeId = officeLocation ? officeLocation.id : officeQuery;
  const targetOfficeName = officeLocation ? officeLocation.officeName : officeQuery;

  // 3. Build criteria
  const andConditions: Prisma.RegistrationWhereInput[] = [
    { ownerAdminId },
    {
      OR: [
        { regionOfRegistrationId: targetOfficeId },
        { regionOfRegistration: targetOfficeName },
        { creator: { officeLocationId: targetOfficeId } },
        { creator: { officeLocationRef: { officeName: targetOfficeName } } },
      ],
    },
  ];

  // 4. Date range filter
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

  // 5. Search keyword filter
  if (params.search && params.search.trim()) {
    const q = params.search.trim();
    andConditions.push({
      OR: [
        { trackingNumber: { contains: q } },
        { customerName: { contains: q } },
        { mobile: { contains: q } },
        { documentName: { contains: q } },
      ],
    });
  }

  return { AND: andConditions };
}

/**
 * Retrieves paginated document report records and financial totals matching the office and date range.
 */
export async function getDocumentReport(
  ownerAdminId: string,
  params: DocumentReportParams,
  userAccess?: SessionAccess
): Promise<DocumentReportResult> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.max(1, Math.min(params.pageSize ?? 10, 1000));
  const skip = (page - 1) * pageSize;

  const where = await buildDocumentReportWhere(ownerAdminId, params, userAccess);

  const [registrations, totalItems, summaryAgg] = await Promise.all([
    prisma.registration.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        trackingNumber: true,
        customerName: true,
        documentName: true,
        totalCharges: true,
        advancePaid: true,
        balanceAmount: true,
        createdAt: true,
        regionOfRegistration: true,
        regionOfRegistrationRef: { select: { officeName: true } },
        creator: {
          select: {
            officeLocationRef: { select: { officeName: true } },
          },
        },
      },
    }),
    prisma.registration.count({ where }),
    prisma.registration.aggregate({
      where,
      _sum: {
        totalCharges: true,
        advancePaid: true,
        balanceAmount: true,
      },
      _count: { id: true },
    }),
  ]);

  const items: DocumentReportItem[] = registrations.map((reg, idx) => {
    const slNo = skip + idx + 1;
    const resolvedOffice =
      reg.regionOfRegistration ||
      reg.regionOfRegistrationRef?.officeName ||
      reg.creator?.officeLocationRef?.officeName ||
      params.office;

    return {
      id: reg.id,
      slNo,
      trackingNumber: reg.trackingNumber,
      customerName: reg.customerName || "-",
      documentName: reg.documentName || "-",
      totalCharges: Number(reg.totalCharges ?? 0),
      advanceAmount: Number(reg.advancePaid ?? 0),
      balanceAmount: Number(reg.balanceAmount ?? 0),
      officeName: resolvedOffice,
      createdAt: reg.createdAt.toISOString(),
    };
  });

  return {
    items,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
    summary: {
      totalDocuments: summaryAgg._count.id,
      totalCharges: Number(summaryAgg._sum.totalCharges ?? 0),
      totalAdvance: Number(summaryAgg._sum.advancePaid ?? 0),
      totalBalance: Number(summaryAgg._sum.balanceAmount ?? 0),
    },
  };
}

/**
 * Generates an Excel export buffer for the document report matching the office and date range.
 */
export async function getDocumentReportExport(
  ownerAdminId: string,
  params: DocumentReportParams,
  userAccess?: SessionAccess
): Promise<{ buffer: Buffer; fileName: string }> {
  const where = await buildDocumentReportWhere(ownerAdminId, params, userAccess);

  const registrations = await prisma.registration.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 10000,
    select: {
      id: true,
      trackingNumber: true,
      customerName: true,
      documentName: true,
      totalCharges: true,
      advancePaid: true,
      balanceAmount: true,
      createdAt: true,
      regionOfRegistration: true,
      regionOfRegistrationRef: { select: { officeName: true } },
      creator: {
        select: {
          officeLocationRef: { select: { officeName: true } },
        },
      },
    },
  });

  const exportData = registrations.map((reg, idx) => {
    const resolvedOffice =
      reg.regionOfRegistration ||
      reg.regionOfRegistrationRef?.officeName ||
      reg.creator?.officeLocationRef?.officeName ||
      params.office;

    return {
      "Sl No": idx + 1,
      "Tracking Number": reg.trackingNumber,
      "Customer Name": reg.customerName || "-",
      "Document Name": reg.documentName || "-",
      "Total Charges": Number(reg.totalCharges ?? 0),
      "Advance Amount": Number(reg.advancePaid ?? 0),
      "Balance Amount": Number(reg.balanceAmount ?? 0),
      "Office": resolvedOffice,
      "Created Date": new Date(reg.createdAt).toLocaleDateString("en-IN"),
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Document Report");

  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;
  const dateStr = new Date().toISOString().split("T")[0];
  const safeOffice = params.office.replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `Document_Report_${safeOffice}_${dateStr}.xlsx`;

  return { buffer, fileName };
}
