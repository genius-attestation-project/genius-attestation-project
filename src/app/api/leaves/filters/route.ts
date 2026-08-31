import { auth } from "@/lib/auth";
import { hasPermission, listDepartments, listOfficeLocations, listUsers } from "@/features/admin/server/rbac.service";
import { LEAVE_TYPES } from "@/features/leave/types/leave.types";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return jsonError("Authentication required.", 401);

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const canViewAll =
      session.user.isSuperAdmin ||
      hasPermission(session.user, "leave.approve") ||
      hasPermission(session.user, "leave.report") ||
      hasPermission(session.user, "attendance_approval.view");

    if (!canViewAll) {
      return jsonOk({ users: [], departments: [], officeLocations: [], leaveTypes: LEAVE_TYPES });
    }

    const [users, departments, officeLocations] = await Promise.all([
      listUsers(ownerAdminId),
      listDepartments(ownerAdminId),
      listOfficeLocations(ownerAdminId),
    ]);

    return jsonOk({ users, departments, officeLocations, leaveTypes: LEAVE_TYPES });
  } catch (error) {
    console.error("[api/leaves/filters] failed", error);
    return jsonError(error instanceof Error ? error.message : "Unable to fetch leave filters.", 500);
  }
}
