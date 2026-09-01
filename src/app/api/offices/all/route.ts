import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getOfficeVisibilityOptions } from "@/features/admin/server/user-access.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assignedOffices, globalOffices, offices } = await getOfficeVisibilityOptions(
      currentUser.id,
      currentUser.ownerAdminId
    );

    return NextResponse.json({
      assignedOffices,
      globalOffices,
      offices,
      data: offices,
    });
  } catch (error: any) {
    console.error("Failed to fetch all offices:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
