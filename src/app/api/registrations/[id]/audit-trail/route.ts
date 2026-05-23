import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { listRegistrationAuditTrail } from "@/features/registration/server/registration.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const auditTrail = await listRegistrationAuditTrail(ownerAdminId, id);

    if (!auditTrail) return jsonError("Registration not found.", 404);

    return jsonOk({
      auditTrail: auditTrail.map((item) => ({
        ...item,
        createdAt: item.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Failed to fetch audit trail", error);
    return jsonError("Unable to fetch audit trail.", 500);
  }
}
