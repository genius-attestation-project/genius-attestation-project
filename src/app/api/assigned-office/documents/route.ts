import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  getAssignedOfficeWorkspaceStats,
  listWorkspaceDocuments,
  transferToSubPackage,
} from "@/features/assigned-office/server/assigned-office.service";
import { createTransferBundle } from "@/features/home/server/bundle-workflow.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const officeId = searchParams.get("officeId") || currentUser.officeId || currentUser.officeLocationId;
    const tab = searchParams.get("tab") || "in_hand";
    const search = searchParams.get("search") || undefined;

    if (!officeId) {
      return NextResponse.json({ stats: null, documents: [] });
    }

    const stats = await getAssignedOfficeWorkspaceStats(officeId, currentUser.ownerAdminId);
    const documents = await listWorkspaceDocuments({
      officeId,
      tab,
      ownerAdminId: currentUser.ownerAdminId,
      search,
    });

    return NextResponse.json({ stats, documents });
  } catch (error: any) {
    console.error("Assigned Office GET Error:", error);
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
    const { action } = body;

    if (action === "transfer_to_subpackage") {
      const { items, officeId } = body;
      const result = await transferToSubPackage({
        items,
        officeId: officeId || currentUser.officeId || currentUser.officeLocationId,
        userId: currentUser.id,
        userName: currentUser.name || undefined,
        ownerAdminId: currentUser.ownerAdminId,
      });
      return NextResponse.json(result);
    }

    if (action === "back_to_process") {
      const { trackingNumbers, officeId, remarks } = body;
      const { transferBackToProcess } = await import("@/features/assigned-office/server/assigned-office.service");
      const result = await transferBackToProcess({
        trackingNumbers,
        officeId: officeId || currentUser.officeId || currentUser.officeLocationId,
        userId: currentUser.id,
        userName: currentUser.name || undefined,
        ownerAdminId: currentUser.ownerAdminId,
        remarks,
      });
      return NextResponse.json({ success: true, bundle: result });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("Assigned Office POST Error:", error);
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 });
  }
}
