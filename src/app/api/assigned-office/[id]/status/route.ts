import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { toggleOfficeStatus } from "@/features/assigned-office/server/assigned-office.service";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    const userName = session?.user?.name || session?.user?.email || "Admin";

    if (!ownerAdminId || !userId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const body = await req.json();
    const { status } = body;

    const perm = status ? "assigned_office.activate" : "assigned_office.deactivate";
    const errorResponse = await requireApiPermission(perm);
    if (errorResponse) return errorResponse;

    const { id } = await context.params;
    const updated = await toggleOfficeStatus(id, Boolean(status), userId, userName, ownerAdminId);

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_STATUS_PATCH]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 400 });
  }
}
