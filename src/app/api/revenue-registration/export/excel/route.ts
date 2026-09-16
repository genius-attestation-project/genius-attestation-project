import { auth } from "@/lib/auth";
import { jsonError } from "@/utils/response";
import { listRegistrations } from "@/features/registration/server/registration.service";
import { generateExcelBuffer } from "@/features/registration/server/export.service";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    
    if (!session?.user || !ownerAdminId) {
      return jsonError("Unauthorized.", 401);
    }

    if (!hasPermission(session.user, "revenue_registration.export")) {
      return jsonError("You do not have permission to export revenue registrations.", 403);
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") ?? undefined;

    let allowedOfficeIds = session.user.allowedOfficeIds;
    let allowedOfficeNames = session.user.allowedOfficeNames;

    if (!session.user.isSuperAdmin && session.user.moduleOfficeVisibilities?.["revenue_registration"]) {
      const modConfig = session.user.moduleOfficeVisibilities["revenue_registration"];
      allowedOfficeIds = modConfig.officeIds;
      allowedOfficeNames = modConfig.officeNames;
    }

    const rawOfficeLocationIds = searchParams.getAll("officeLocationIds");
    const officeLocationIdsParam = searchParams.get("officeLocationIds");
    const officeLocationParam = searchParams.get("officeLocation");

    let officeLocationIds: string[] = [];
    if (rawOfficeLocationIds.length > 0) {
      for (const item of rawOfficeLocationIds) {
        if (item.includes(",")) {
          officeLocationIds.push(...item.split(",").map((s) => s.trim()).filter(Boolean));
        } else if (item.trim()) {
          officeLocationIds.push(item.trim());
        }
      }
    } else if (officeLocationIdsParam) {
      officeLocationIds = officeLocationIdsParam.split(",").map((s) => s.trim()).filter(Boolean);
    }
    
    // Fetch all records without pagination (using a very large page size)
    const data = await listRegistrations(ownerAdminId, {
      page: 1,
      pageSize: 100000,
      query,
      isSuperAdmin: session.user.isSuperAdmin,
      allowedOfficeIds,
      allowedOfficeNames,
      officeLocationIds: officeLocationIds.length > 0 ? officeLocationIds : undefined,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
      trackingNumber: searchParams.get("trackingNumber") ?? undefined,
      customerName: searchParams.get("customerName") ?? undefined,
      mobile: searchParams.get("mobile") ?? undefined,
      createdBy: searchParams.get("createdBy") ?? undefined,
      collectedPerson: searchParams.get("collectedPerson") ?? undefined,
      registeredPerson: searchParams.get("registeredPerson") ?? undefined,
      officeLocation: officeLocationParam ?? undefined,
      processOffice: searchParams.get("processOffice") ?? undefined,
      service: searchParams.get("service") ?? undefined,
      documentType: searchParams.get("documentType") ?? undefined,
      documentIssuedCountry: searchParams.get("documentIssuedCountry") ?? undefined,
      customerType: searchParams.get("customerType") ?? undefined,
      processType: searchParams.get("processType") ?? undefined,
      priority: searchParams.get("priority") ?? undefined,
      deliveryLocation: searchParams.get("deliveryLocation") ?? undefined,
      paymentStatus: searchParams.get("paymentStatus") ?? undefined,
      paymentMode: searchParams.get("paymentMode") ?? undefined,
      approvalStatus: searchParams.get("approvalStatus") ?? undefined,
      hasBalance: searchParams.get("hasBalance") ?? undefined,
      minTotalCharge: searchParams.get("minTotalCharge") ?? undefined,
      maxTotalCharge: searchParams.get("maxTotalCharge") ?? undefined,
      minAdvancePaid: searchParams.get("minAdvancePaid") ?? undefined,
      maxAdvancePaid: searchParams.get("maxAdvancePaid") ?? undefined,
    });

    const buffer = await generateExcelBuffer(data.items);
    
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Revenue_Registrations_${dateStr}.xlsx`;

    return new Response(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    console.error("[GET /api/revenue-registration/export/excel] FATAL ERROR:", error);
    return jsonError(error?.message || "Unable to export registrations to Excel.", 500);
  }
}
