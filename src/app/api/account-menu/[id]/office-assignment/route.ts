import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import {
  getAvailableOfficesGroupedByCountry,
  getAccountOfficeAssignments,
  updateAccountOfficeAssignments,
} from "@/features/account-menu/server/account-menu.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireApiPermission("account_menu.view");
  if (authError) return authError;

  try {
    const { id } = await params;
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const [groupedOffices, assignedOfficeIds] = await Promise.all([
      getAvailableOfficesGroupedByCountry(ownerAdminId),
      getAccountOfficeAssignments(ownerAdminId, id),
    ]);

    return jsonOk({
      groupedOffices,
      assignedOfficeIds,
    });
  } catch (error: any) {
    console.error("Failed to fetch account office assignments:", error);
    return jsonError(error.message || "Unable to fetch office assignments.", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = await requireApiPermission("account_menu.update");
  if (authError) return authError;

  try {
    const { id } = await params;
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    if (!body || !Array.isArray(body.officeIds)) {
      return jsonError("Invalid payload: officeIds array is required.", 400);
    }

    await updateAccountOfficeAssignments(
      ownerAdminId,
      session?.user?.id,
      session?.user?.name || session?.user?.email || "User",
      id,
      body.officeIds
    );

    return jsonOk({ success: true, message: "Office assignments updated successfully." });
  } catch (error: any) {
    console.error("Failed to update account office assignments:", error);
    return jsonError(error.message || "Unable to update office assignments.", 500);
  }
}
