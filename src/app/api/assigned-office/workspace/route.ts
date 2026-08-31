import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getAssignedOfficeWorkspaceStats,
  listWorkspaceDocuments,
  receiveBundleDocuments,
  transferToSubPackage,
  processSubPackageDocumentAction,
  transferBackToProcess,
  listSubPackageItemsForOffice,
  getSubPackagesForProcessType,
  sendDocumentsToInHand,
} from "@/features/assigned-office/server/assigned-office.service";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    // Office ID comes from office user session or query param if admin
    const searchParams = req.nextUrl.searchParams;
    const cookieOfficeId = req.cookies.get("activeAssignedOfficeId")?.value;
    const officeId =
      searchParams.get("officeId") ||
      cookieOfficeId ||
      session.user.officeId ||
      (session.user as any).assignedOfficeId ||
      session.user.id;

    const action = searchParams.get("action"); // 'stats' | 'documents' | 'subpackage_items' | 'subpackages_for_process_type'
    const tab = searchParams.get("tab") || "in_hand";
    const search = searchParams.get("search") || "";
    const processType = searchParams.get("processType") || undefined;

    if (action === "stats") {
      const stats = await getAssignedOfficeWorkspaceStats(officeId, ownerAdminId);
      return NextResponse.json(stats);
    }

    if (action === "subpackage_items") {
      const data = await listSubPackageItemsForOffice({ officeId, ownerAdminId });
      return NextResponse.json(data);
    }

    if (action === "subpackages_for_process_type") {
      const subPackages = await getSubPackagesForProcessType(processType, ownerAdminId, officeId);
      return NextResponse.json({ subPackages });
    }

    const documents = await listWorkspaceDocuments({
      officeId,
      tab,
      ownerAdminId,
      search,
    });

    return NextResponse.json(documents);
  } catch (error: any) {
    console.error("[WORKSPACE_GET]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const ownerAdminId = session.user.ownerAdminId ?? session.user.id;
    const userId = session.user.id;
    const userName = session.user.name || session.user.email || "Office User";

    const body = await req.json();
    const { action, officeId: reqOfficeId } = body;
    const cookieOfficeId = req.cookies.get("activeAssignedOfficeId")?.value;
    const searchOfficeId = req.nextUrl.searchParams.get("officeId");
    const officeId =
      reqOfficeId ||
      searchOfficeId ||
      cookieOfficeId ||
      session.user.officeId ||
      (session.user as any).assignedOfficeId ||
      session.user.id;

    if (action === "receive_bundle") {
      const { bundleId, selectedTrackingNumbers } = body;
      const result = await receiveBundleDocuments({
        bundleId,
        selectedTrackingNumbers,
        officeId,
        userId,
        userName,
        ownerAdminId,
      });
      return NextResponse.json(result);
    }

    if (action === "transfer_to_subpackage") {
      const { items } = body; // Array of { trackingNumber, subPackageId }
      const result = await transferToSubPackage({
        items,
        officeId,
        userId,
        userName,
        ownerAdminId,
      });
      return NextResponse.json(result);
    }

    if (action === "subpackage_action") {
      const { movementIds, subPackageAction, remarks } = body; // subPackageAction: 'complete' | 'return' | 'reject'
      if (subPackageAction === "reject" && !String(remarks || "").trim()) {
        return NextResponse.json({ message: "Rejection reason is required." }, { status: 400 });
      }
      const result = await processSubPackageDocumentAction({
        movementIds,
        action: subPackageAction,
        userId,
        userName,
        ownerAdminId,
        remarks,
      });
      return NextResponse.json(result);
    }

    if (action === "send_to_in_hand") {
      const { trackingNumbers } = body;
      const result = await sendDocumentsToInHand({
        trackingNumbers,
        officeId,
        userId,
        userName,
        ownerAdminId,
      });
      return NextResponse.json(result);
    }

    if (action === "back_to_process") {
      const { trackingNumbers, remarks } = body;
      const result = await transferBackToProcess({
        trackingNumbers,
        officeId,
        userId,
        userName,
        ownerAdminId,
        remarks,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ message: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("[WORKSPACE_POST]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 500 });
  }
}
