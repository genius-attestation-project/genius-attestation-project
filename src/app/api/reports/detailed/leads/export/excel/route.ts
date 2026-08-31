import { prisma } from "@/lib/prisma";
import { buildReportFilters, applyFiltersToLead } from "@/features/reports/server/report-filters";
import { generateLeadExcelBuffer } from "@/features/lead/server/export.service";
import type { LeadRow } from "@/features/lead/types/lead.types";
import { auth } from "@/lib/auth";
import { NextRequest } from "next/server";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const officeLocationId = searchParams.get("officeLocationId");
    const departmentId = searchParams.get("departmentId");
    const assignedUser = searchParams.get("assignedUser");
    const leadStatus = searchParams.get("leadStatus");

    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    if (!ownerAdminId) {
      return new Response("Owner admin ID not found", { status: 401 });
    }

    const filters = buildReportFilters(searchParams, ownerAdminId);
    const baseWhere = filters.baseWhere;
    const leadWhere = applyFiltersToLead(baseWhere, filters);

    if (assignedUser) baseWhere.assignedUserId = assignedUser;
    if (leadStatus) baseWhere.leadStatus = leadStatus;

    if (officeLocationId || departmentId) {
      baseWhere.creator = {
        ...(officeLocationId ? { officeLocationId } : {}),
        ...(departmentId ? { departmentId } : {})
      };
    }

    // Fetch all records without skip/take limits for export
    const rawLeads = await prisma.lead.findMany({ 
      where: leadWhere,
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { name: true, email: true } },
      }
    });

    // Map to LeadRow structure required by export service
    const mappedLeads: LeadRow[] = rawLeads.map((lead: any) => ({
      ...lead,
      clientName: [lead.firstName, lead.lastName].filter(Boolean).join(" "),
      mobile: `${lead.countryCode} ${lead.mobileNumber}`.trim(),
      createdByName: lead.creator?.name || lead.creator?.email || "",
      createdByEmail: lead.creator?.email || "",
      createdDate: formatDate(lead.createdAt),
      rawAmount: Number(lead.amount),
    }));

    const buffer = await generateLeadExcelBuffer(mappedLeads);

    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Reports_Leads_Export_${dateStr}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/reports/detailed/leads/export/excel] FATAL ERROR:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
