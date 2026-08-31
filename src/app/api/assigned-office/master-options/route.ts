import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAssignedOfficeMasterOptions } from "@/features/assigned-office/server/assigned-office.service";
import { requireApiPermission } from "@/middleware/auth.middleware";

export async function GET(req: NextRequest) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.view");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const masterOptions = await getAssignedOfficeMasterOptions(ownerAdminId);
    return NextResponse.json(masterOptions);
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_MASTER_OPTIONS_GET]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 500 });
  }
}
