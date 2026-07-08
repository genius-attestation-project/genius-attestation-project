import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const authError = await requireApiPermission("reports.view");
    if (authError) return authError;

    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownerAdminId = session.user.ownerAdminId || session.user.id;
    const userRole = typeof session.user.role === 'string' ? session.user.role : (session.user.role as any)?.name || "";
    const isSuperAdmin = userRole === "Super Admin";
    const isOwnerAdmin = !session.user.ownerAdminId || session.user.ownerAdminId === session.user.id;
    
    let userWhere: any = { isActive: true };
    if (isSuperAdmin) {
      // all
    } else if (isOwnerAdmin || userRole === "Admin") {
      userWhere.ownerAdminId = ownerAdminId;
    } else if (userRole === "Manager" || userRole === "Department Admin") {
      userWhere.ownerAdminId = ownerAdminId;
      // You can add departmentId here if needed: if (session.user.departmentId) userWhere.departmentId = session.user.departmentId;
    } else {
      userWhere.id = session.user.id;
    }

    // Fetch master data for dropdowns using Promise.allSettled
    const results = await Promise.allSettled([
      prisma.officeLocation.findMany({
        where: { ownerAdminId },
        select: { id: true, officeName: true, isProcessOffice: true },
      }),
      prisma.department.findMany({
        where: { ownerAdminId },
        select: { id: true, name: true },
      }),
      prisma.user.findMany({
        where: userWhere,
        select: { id: true, name: true, email: true },
      }),
      // Fetch distinct values from Lead
      prisma.lead.findMany({
        where: { ownerAdminId },
        select: { country: true, service: true, source: true },
        distinct: ['country', 'service', 'source'],
      }),
      // Fetch distinct values from Registration
      prisma.registration.findMany({
        where: { ownerAdminId },
        select: { documentType: true, processType: true },
        distinct: ['documentType', 'processType'],
      })
    ]);

    // Logging errors
    const labels = ["Office Locations", "Departments", "Users", "Leads (Distinct)", "Registrations (Distinct)"];
    results.forEach((res, index) => {
      if (res.status === 'rejected') {
        console.error(`[Reports Filter API] Failed to fetch ${labels[index]}:`, res.reason);
      } else {
        console.info(`[Reports Filter API] Successfully fetched ${labels[index]}`);
      }
    });

    const officeLocationsResult = results[0].status === 'fulfilled' ? results[0].value : null;
    const departments = results[1].status === 'fulfilled' ? results[1].value : null;
    const usersList = results[2].status === 'fulfilled' ? results[2].value : null;
    const leads = results[3].status === 'fulfilled' ? results[3].value : null;
    const registrations = results[4].status === 'fulfilled' ? results[4].value : null;

    let users = null;
    if (usersList) {
      const nameCounts = new Map<string, number>();
      usersList.forEach(u => {
         const n = u.name || "Unknown";
         nameCounts.set(n, (nameCounts.get(n) || 0) + 1);
      });
      users = usersList.map(u => {
         const n = u.name || "Unknown";
         if (nameCounts.get(n)! > 1) {
            return { id: u.id, name: `${n} (${u.email})` };
         }
         return { id: u.id, name: n };
      });
    }

    const countries = leads ? Array.from(new Set(leads.map(l => l.country).filter(Boolean))) : null;
    const services = (leads || registrations) ? Array.from(new Set([
      ...(leads ? leads.map(l => l.service) : []),
      ...(registrations ? registrations.map(r => r.processType) : [])
    ].filter(Boolean))) : null;
    const leadSources = leads ? Array.from(new Set(leads.map(l => l.source).filter(Boolean))) : null;
    const documentTypes = registrations ? Array.from(new Set(registrations.map(r => r.documentType).filter(Boolean))) : null;

    return NextResponse.json({
      officeLocations: officeLocationsResult ? officeLocationsResult.map(o => ({ id: o.id, name: o.officeName })) : null,
      processOffices: officeLocationsResult ? officeLocationsResult.filter(o => o.isProcessOffice).map(o => ({ id: o.id, name: o.officeName })) : null,
      departments: departments ? departments.map(d => ({ id: d.id, name: d.name })) : null,
      users: users,
      countries: countries ? countries.map(c => ({ id: c, name: c })) : null,
      services: services ? services.map(s => ({ id: s, name: s })) : null,
      documentTypes: documentTypes ? documentTypes.map(d => ({ id: d, name: d })) : null,
      leadSources: leadSources ? leadSources.map(s => ({ id: s, name: s })) : null,
      leadStatuses: [
        "New", "Followup", "Assigned", "Pending_Approval", 
        "Closed", "Qualified", "Potential_Qualified", "LOB"
      ].map(s => ({ id: s, name: s.replace("_", " ") })),
      paymentStatuses: [
        "Pending", "Partially Paid", "Paid", "Completed"
      ].map(s => ({ id: s, name: s })),
    });
  } catch (error) {
    console.error("[Reports Filter API] Fatal error:", error);
    return NextResponse.json({ error: "Failed to load filter metadata" }, { status: 500 });
  }
}
