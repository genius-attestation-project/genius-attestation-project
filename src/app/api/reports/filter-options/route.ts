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
        where: { ownerAdminId, isActive: true },
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
    const users = results[2].status === 'fulfilled' ? results[2].value : null;
    const leads = results[3].status === 'fulfilled' ? results[3].value : null;
    const registrations = results[4].status === 'fulfilled' ? results[4].value : null;

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
      users: users ? users.map(u => ({ id: u.id, name: u.name || u.email })) : null,
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
