import { LeadStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/utils/response";
import { formatBundleNumber } from "@/utils/format";
import { NextRequest } from "next/server";
import { getSessionAccess, hasOfficeAccess, hasPermission } from "@/features/admin/server/rbac.service";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const modules: SearchItem[] = [
  { id: "home", title: "Dashboard", subtitle: "Dashboard overview", href: "/dashboard" },
  {
    id: "revenue-registration",
    title: "Revenue Registration",
    subtitle: "Create and manage registrations",
    href: "/dashboard/revenue-registration",
  },
  {
    id: "search-report",
    title: "Search / Report",
    subtitle: "Find registrations and tracking records",
    href: "/dashboard/search-report",
  },
  {
    id: "home",
    title: "Home",
    subtitle: "Home workflow and movement tracking center",
    href: "/dashboard/home",
  },
  {
    id: "bm-report",
    title: "BM Report",
    subtitle: "Real-time document movement tracking center",
    href: "/dashboard/bm-report",
  },
  {
    id: "admin-management",
    title: "Admin Management",
    subtitle: "Users, roles, departments, and offices",
    href: "/dashboard/admin-management/users",
  },
  {
    id: "lead-management",
    title: "Lead Management",
    subtitle: "All leads and pipeline actions",
    href: "/dashboard/lead-management/all-leads",
  },
  {
    id: "followups",
    title: "Followups",
    subtitle: "Lead followup calendar",
    href: "/dashboard/lead-management/followups",
  },
  {
    id: "pending-approval",
    title: "Pending Approval",
    subtitle: "Lead approval queue",
    href: "/dashboard/pending-approval",
  },
  {
    id: "office-locations",
    title: "Office Locations",
    subtitle: "Manage office branches",
    href: "/dashboard/admin-management/office-location",
  },
  {
    id: "departments",
    title: "Departments",
    subtitle: "Manage departments",
    href: "/dashboard/admin-management/department",
  },
];

function contains(query: string) {
  return { contains: query };
}

function matchesModule(item: SearchItem, query: string) {
  const normalized = `${item.title} ${item.subtitle}`.toLowerCase();
  return normalized.includes(query.toLowerCase());
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;

    if (!ownerAdminId || !session?.user) {
      return jsonError("Unauthorized access.", 401);
    }

    const access = await getSessionAccess(session.user.id);
    const canSearchRegistrations =
      Boolean(access?.isSuperAdmin) ||
      hasPermission(access, "search_report.search") ||
      hasPermission(access, "search_report.view") ||
      hasPermission(access, "revenue_registration.view");

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q")?.trim() ?? "";

    if (!query) {
      return jsonOk({
        modules: [],
        leads: [],
        registrations: [],
        users: [],
        departments: [],
        officeLocations: [],
      });
    }

    const matchedStatuses = Object.values(LeadStatus).filter((status) =>
      status.toLowerCase().includes(query.toLowerCase().replace(/\s+/g, "_")),
    );

    const [
      leads,
      registrations,
      bundles,
      users,
      departments,
      officeLocations,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: {
          ownerAdminId,
          OR: [
            { leadCode: contains(query) },
            { firstName: contains(query) },
            { lastName: contains(query) },
            { mobileNumber: contains(query) },
            { email: contains(query) },
            { service: contains(query) },
            { country: contains(query) },
            { assignedUser: contains(query) },
            ...(matchedStatuses.length ? [{ leadStatus: { in: matchedStatuses } }] : []),
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          leadCode: true,
          firstName: true,
          lastName: true,
          mobileNumber: true,
          leadStatus: true,
          service: true,
        },
      }),
      canSearchRegistrations
        ? prisma.registration.findMany({
            where: {
              ownerAdminId,
              OR: [
                { trackingNumber: query },
                { trackingNumber: contains(query) },
                { customerName: contains(query) },
                { mobile: contains(query) },
                { email: contains(query) },
                { paymentStatus: contains(query) },
                { trackingStatus: contains(query) },
                { documentType: contains(query) },
                { documentName: contains(query) },
                { processType: contains(query) },
                { subPackage: contains(query) },
                { deliveryLocation: contains(query) },
                { regionOfRegistration: contains(query) },
              ],
            },
            orderBy: { updatedAt: "desc" },
            take: 12,
            select: {
              id: true,
              trackingNumber: true,
              customerName: true,
              mobile: true,
              paymentStatus: true,
              trackingStatus: true,
              approvalStatus: true,
              regionOfRegistration: true,
              officeLocationName: true,
              officeLocationId: true,
            },
          })
        : Promise.resolve([]),
      prisma.bundle.findMany({
        where: {
          ownerAdminId,
          OR: [
            { bundleNumber: contains(query) },
            { status: contains(query) },
            { fromOffice: { officeName: contains(query) } },
            { toOffice: { officeName: contains(query) } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 6,
        include: {
          fromOffice: true,
          toOffice: true,
        },
      }),
      prisma.user.findMany({
        where: {
          OR: [{ ownerAdminId }, { id: ownerAdminId }],
          AND: {
            OR: [
              { name: contains(query) },
              { email: contains(query) },
              { phone: contains(query) },
              { departmentName: contains(query) },
              { officeLocationName: contains(query) },
              { role: { name: contains(query) } },
            ],
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
        },
      }),
      prisma.department.findMany({
        where: {
          ownerAdminId,
          name: contains(query),
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: { id: true, name: true },
      }),
      prisma.officeLocation.findMany({
        where: {
          ownerAdminId,
          OR: [
            { officeName: contains(query) },
            { location: contains(query) },
            { timezone: contains(query) },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          officeName: true,
          location: true,
          timezone: true,
        },
      }),
    ]);

    // Sort registrations: exact tracking number match first, then prefix match
    const sortedRegistrations = [...registrations].sort((a, b) => {
      const cleanQ = query.toLowerCase();
      const aExact = a.trackingNumber.trim().toLowerCase() === cleanQ;
      const bExact = b.trackingNumber.trim().toLowerCase() === cleanQ;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;

      const aStarts = a.trackingNumber.trim().toLowerCase().startsWith(cleanQ);
      const bStarts = b.trackingNumber.trim().toLowerCase().startsWith(cleanQ);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;

      return 0;
    });

    // Office visibility filtering for non-superadmins
    let visibleRegistrations = sortedRegistrations;
    if (access && !access.isSuperAdmin) {
      visibleRegistrations = sortedRegistrations.filter((reg) => {
        const regOffice =
          reg.regionOfRegistration ||
          (reg as any).officeLocationName ||
          (reg as any).officeLocationId;

        if (!regOffice) return true;

        return (
          hasOfficeAccess(access, regOffice, "search_report") ||
          hasOfficeAccess(access, regOffice, "revenue_registration")
        );
      });
    }
    visibleRegistrations = visibleRegistrations.slice(0, 6);

    return jsonOk({
      modules: modules.filter((item) => matchesModule(item, query)).slice(0, 6),
      leads: leads.map((lead) => ({
        id: lead.id,
        title: `${lead.firstName} ${lead.lastName ?? ""}`.trim() || lead.leadCode,
        subtitle: `${lead.leadCode} • ${lead.mobileNumber} • ${lead.leadStatus}`,
        href: `/dashboard/lead-management/all-leads?query=${encodeURIComponent(lead.leadCode)}`,
      })),
      registrations: visibleRegistrations.map((registration) => {
        const customer = registration.customerName?.trim() || "Customer";
        const currentStatus = registration.trackingStatus || "Registered";
        const docStatus = registration.approvalStatus || registration.paymentStatus || "Pending";

        return {
          id: registration.id,
          title: registration.trackingNumber,
          subtitle: `${customer} • ${currentStatus} • ${docStatus}`,
          href: `/dashboard/document-details/${encodeURIComponent(registration.trackingNumber)}`,
        };
      }),
      bundles: bundles.map((bundle) => ({
        id: bundle.id,
        title: formatBundleNumber(bundle.bundleNumber),
        subtitle: `Bundle (${formatBundleNumber(bundle.bundleNumber)}) • ${bundle.fromOffice?.officeName ?? "Origin"} -> ${bundle.toOffice?.officeName ?? "Destination"} • ${bundle.status}`,
        href: `/dashboard/home?search=${encodeURIComponent(bundle.bundleNumber)}`,
      })),
      users: users.map((user) => ({
        id: user.id,
        title: user.name ?? user.email,
        subtitle: `${user.email} • ${user.role?.name ?? "User"}`,
        href: "/dashboard/admin-management/users",
      })),
      departments: departments.map((department) => ({
        id: department.id,
        title: department.name,
        subtitle: "Department",
        href: "/dashboard/admin-management/department",
      })),
      officeLocations: officeLocations.map((office) => ({
        id: office.id,
        title: office.officeName,
        subtitle: `${office.location} • ${office.timezone}`,
        href: "/dashboard/admin-management/office-location",
      })),
    });
  } catch (error) {
    console.error("Failed to run global search", error);
    return jsonError("Unable to run global search.", 500);
  }
}
