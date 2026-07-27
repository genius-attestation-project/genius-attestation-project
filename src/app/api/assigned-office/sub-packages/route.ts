import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listSubPackageItems,
  processSubPackageAction,
} from "@/features/assigned-office/server/assigned-office.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const officeId = searchParams.get("officeId") || currentUser.officeLocationId || undefined;

    const data = await listSubPackageItems({
      officeId,
      ownerAdminId: currentUser.ownerAdminId,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Sub Package GET Error:", error);
    return NextResponse.json({ error: error.message || "Internal Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { movementIds, action, remarks } = body;

    if (!movementIds || !Array.isArray(movementIds) || movementIds.length === 0) {
      return NextResponse.json(
        { error: "No items selected for action" },
        { status: 400 }
      );
    }

    const result = await processSubPackageAction({
      movementIds,
      action,
      userId: currentUser.id,
      userName: currentUser.name || undefined,
      ownerAdminId: currentUser.ownerAdminId,
      remarks,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Sub Package Action POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process action" },
      { status: 500 }
    );
  }
}
