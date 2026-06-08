import { LeadStatus, Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/utils/response";

type SearchItem = {
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const modules: SearchItem[] = [
  { id: "home", title: "Home", subtitle: "Dashboard overview", href: "/dashboard" },
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
    id: "bm-report",
    title: "BM Report",
    subtitle: "Branch movement reports",
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
    href: "/dashboard/lead-management/pending-approval",
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
  return { contains: query, mode: Prisma.QueryMode.insensitive };
}

function matchesModule(item: SearchItem, query: string) {
  const normalized = `${item.title} ${item.subtitle}`.toLowerCase();
  return normalized.includes(query.toLowerCase());
}

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!ownerAdminId) {
      return jsonError("No owner admin ID found.", 401);
    }

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
      prisma.registration.findMany({
        where: {
          ownerAdminId,
          OR: [
            { trackingNumber: contains(query) },
            { customerName: contains(query) },
            { mobile: contains(query) },
            { email: contains(query) },
            { paymentStatus: contains(query) },
            { trackingStatus: contains(query) },
            { documentType: contains(query) },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 6,
        select: {
          id: true,
          trackingNumber: true,
          customerName: true,
          mobile: true,
          paymentStatus: true,
          trackingStatus: true,
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

    return jsonOk({
      modules: modules.filter((item) => matchesModule(item, query)).slice(0, 6),
      leads: leads.map((lead) => ({
        id: lead.id,
        title: `${lead.firstName} ${lead.lastName ?? ""}`.trim() || lead.leadCode,
        subtitle: `${lead.leadCode} • ${lead.mobileNumber} • ${lead.leadStatus}`,
        href: `/dashboard/lead-management/all-leads?query=${encodeURIComponent(lead.leadCode)}`,
      })),
      registrations: registrations.map((registration) => ({
        id: registration.id,
        title: registration.trackingNumber,
        subtitle: `${registration.customerName} • ${registration.paymentStatus} • ${registration.trackingStatus}`,
        href: `/dashboard/search-report?trackingNumber=${encodeURIComponent(registration.trackingNumber)}`,
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
