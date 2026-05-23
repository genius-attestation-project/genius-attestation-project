import { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
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
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = registrationInputSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid registration payload.");
    }

    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const registration = await createRegistration(ownerAdminId, parsed.data, performedBy);
    return jsonOk({ registration }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return jsonError("Tracking number already exists.", 409);
    }

    console.error("Failed to create registration", error);
    return jsonError("Unable to create registration.", 500);
  }
}
