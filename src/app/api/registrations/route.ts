import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { jsonError, jsonOk } from "@/utils/response";
import { createRegistration, listRegistrations } from "@/features/registration/server/registration.service";
import { registrationInputSchema } from "@/features/registration/validations/registration.schema";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  console.log("[GET /api/registrations] Request received:", request.url);
  try {
    const session = await auth();
    console.log("[GET /api/registrations] Session retrieved for user:", session?.user?.email);
    
    const ownerAdminId = session?.user?.ownerAdminId;
    console.log("[GET /api/registrations] ownerAdminId lookup:", ownerAdminId);
    
    if (!ownerAdminId) {
      console.warn("[GET /api/registrations] Unauthorized: No owner admin ID found.");
      return jsonError("No owner admin ID found.", 401);
    }

    const { searchParams } = new URL(request.url);
    const rawPage = searchParams.get("page");
    const rawPageSize = searchParams.get("pageSize");
    const query = searchParams.get("query") ?? undefined;
    
    console.log("[GET /api/registrations] Search Params - rawPage:", rawPage, "rawPageSize:", rawPageSize, "query:", query);
    
    const parsedPage = parseInt(rawPage ?? "1", 10);
    const parsedPageSize = parseInt(rawPageSize ?? "10", 10);
    
    const page = isNaN(parsedPage) ? 1 : parsedPage;
    const pageSize = isNaN(parsedPageSize) ? 10 : parsedPageSize;
    
    console.log("[GET /api/registrations] Parsed Pagination - page:", page, "pageSize:", pageSize);

    const data = await listRegistrations(ownerAdminId, {
      page,
      pageSize,
      query,
      fromDate: searchParams.get("fromDate") ?? undefined,
      toDate: searchParams.get("toDate") ?? undefined,
      trackingNumber: searchParams.get("trackingNumber") ?? undefined,
      customerName: searchParams.get("customerName") ?? undefined,
      mobile: searchParams.get("mobile") ?? undefined,
      createdBy: searchParams.get("createdBy") ?? undefined,
      collectedPerson: searchParams.get("collectedPerson") ?? undefined,
      registeredPerson: searchParams.get("registeredPerson") ?? undefined,
      officeLocation: searchParams.get("officeLocation") ?? undefined,
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
      status: searchParams.get("status") ?? searchParams.get("trackingStatus") ?? undefined,
      trackingStatus: searchParams.get("trackingStatus") ?? searchParams.get("status") ?? undefined,
      hasBalance: searchParams.get("hasBalance") ?? undefined,
      minTotalCharge: searchParams.get("minTotalCharge") ?? undefined,
      maxTotalCharge: searchParams.get("maxTotalCharge") ?? undefined,
      minAdvancePaid: searchParams.get("minAdvancePaid") ?? undefined,
      maxAdvancePaid: searchParams.get("maxAdvancePaid") ?? undefined,
    });
    
    console.log("[GET /api/registrations] Success! Response items length:", data.items.length);
    return jsonOk(data);
  } catch (error: any) {
    console.error("[GET /api/registrations] FATAL ERROR:", error);
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[GET /api/registrations] Prisma error code:", error.code, "meta:", error.meta);
    }
    return jsonError(error?.message || "Unable to fetch registrations.", 500);
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const parsed = registrationInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid registration payload.");
    }

    const sourceOfficeName = await resolveOfficeLocationName({
      ownerAdminId,
      officeLocationId: session.user?.officeLocationId,
      officeLocationName: session.user?.officeLocationName,
      userId: session.user?.id,
    });

    if (!sourceOfficeName) {
      return jsonError(
        "Assign a valid office location to the current user before creating registrations.",
        400,
      );
    }

    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const userId = session.user?.id;
    const registration = await createRegistration(ownerAdminId, parsed.data, sourceOfficeName, performedBy, userId);
    return jsonOk({ registration }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "Office location is required to create a registration.") {
      return jsonError(error.message, 400);
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Tracking number already exists.", 409);
    }

    const message = error instanceof Error ? error.message : "Unable to create registration.";
    console.error("Failed to create registration", {
      error,
      payload: body,
    });
    return jsonError(message, 500);
  }
}
