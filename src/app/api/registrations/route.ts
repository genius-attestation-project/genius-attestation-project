import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { resolveOfficeLocationName } from "@/lib/office-location";
import { jsonError, jsonOk } from "@/utils/response";
import { createRegistration, listRegistrations } from "@/features/registration/server/registration.service";
import { registrationInputSchema } from "@/features/registration/validations/registration.schema";

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const data = await listRegistrations(ownerAdminId, {
      page: Number(searchParams.get("page") ?? "1"),
      pageSize: Number(searchParams.get("pageSize") ?? "10"),
      query: searchParams.get("query") ?? undefined,
    });

    return jsonOk(data);
  } catch (error) {
    console.error("Failed to fetch registrations", error);
    return jsonError("Unable to fetch registrations.", 500);
  }
}

export async function POST(request: Request) {
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
    });

    if (!sourceOfficeName) {
      return jsonError(
        "Assign a valid office location to the current user before creating registrations.",
        400,
      );
    }

    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const registration = await createRegistration(ownerAdminId, parsed.data, sourceOfficeName, performedBy);
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
