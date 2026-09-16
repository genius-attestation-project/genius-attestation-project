import { createUser, listPaginatedUsers, listRoleOptions, listUsers } from "@/features/admin/server/rbac.service";
import { userSchema } from "@/features/admin/validations/rbac.schema";
import { requireAnyApiPermission, requireApiPermission } from "@/middleware/auth.middleware";
import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requireAnyApiPermission(["users.view", "revenue_registration.create", "revenue_registration.view"]);
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const rawPage = searchParams.get("page");
    const rawPageSize = searchParams.get("pageSize");
    const query = searchParams.get("query") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const roleId = searchParams.get("roleId") ?? undefined;
    const departmentId = searchParams.get("departmentId") ?? undefined;
    const officeLocationId = searchParams.get("officeLocationId") ?? undefined;
    const activeOnly = searchParams.get("active") === "true";

    if (rawPage !== null || rawPageSize !== null) {
      const parsedPage = parseInt(rawPage ?? "1", 10);
      const parsedPageSize = parseInt(rawPageSize ?? "10", 10);
      const page = isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
      const pageSize = isNaN(parsedPageSize) || parsedPageSize < 1 ? 10 : Math.min(parsedPageSize, 1000);

      const [paginatedData, roles] = await Promise.all([
        listPaginatedUsers(ownerAdminId, {
          page,
          pageSize,
          query,
          status,
          roleId,
          departmentId,
          officeLocationId,
          activeOnly,
        }),
        listRoleOptions(ownerAdminId),
      ]);

      return jsonOk({
        users: paginatedData.items,
        items: paginatedData.items,
        data: paginatedData.items,
        roles,
        pagination: paginatedData.pagination,
        page: paginatedData.pagination.page,
        pageSize: paginatedData.pagination.pageSize,
        totalRecords: paginatedData.pagination.totalItems,
        totalPages: paginatedData.pagination.totalPages,
      });
    }

    let [users, roles] = await Promise.all([
      listUsers(ownerAdminId),
      listRoleOptions(ownerAdminId)
    ]);

    if (activeOnly) {
      users = users.filter((user) => user.status === "Active");
    }

    return jsonOk({ users, roles });
  } catch (error) {
    console.error("Failed to fetch users", error);
    return jsonError("Unable to fetch users.", 500);
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireApiPermission("users.create");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json().catch(() => null);
    const parsed = userSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid user payload.");
    }

    const user = await createUser(ownerAdminId, parsed.data);
    return jsonOk({ user }, 201);
  } catch (error) {
    if (error instanceof Error && error.message === "A user with this email already exists.") {
      return jsonError(error.message, 409);
    }

    if (error instanceof Error && error.message === "Password is required.") {
      return jsonError(error.message, 400);
    }

    if (
      error instanceof Error &&
      (
        error.message === "Department not found." ||
        error.message === "Office location not found." ||
        error.message === "Supervisor not found."
      )
    ) {
      return jsonError(error.message, 400);
    }

    console.error("Failed to create user", error);
    return jsonError("Unable to create user.", 500);
  }
}
