import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  listDocumentInHand,
  createTransferBundle,
  listInboundBundles,
  listOutboundBundles,
  receiveBundle,
  getMovementHistory,
} from "@/features/bm-report/server/bundle-workflow.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "document_in_hand";
    const officeId = searchParams.get("officeId") || currentUser.officeLocationId || undefined;
    const search = searchParams.get("search") || undefined;

    if (section === "document_in_hand") {
      const data = await listDocumentInHand({
        ownerAdminId: currentUser.ownerAdminId,
        officeId,
        search,
      });
      return NextResponse.json({ data });
    }

    if (section === "inbound") {
      if (!officeId) {
        return NextResponse.json({ data: [] });
      }
      const data = await listInboundBundles({
        toOfficeId: officeId,
        ownerAdminId: currentUser.ownerAdminId,
      });
      return NextResponse.json({ data });
    }

    if (section === "outbound") {
      if (!officeId) {
        return NextResponse.json({ data: [] });
      }
      const data = await listOutboundBundles({
        fromOfficeId: officeId,
        ownerAdminId: currentUser.ownerAdminId,
      });
      return NextResponse.json({ data });
    }

    if (section === "history") {
      const data = await getMovementHistory({
        ownerAdminId: currentUser.ownerAdminId,
        officeId,
        search,
      });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch (error: any) {
    console.error("BM Report GET Error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
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

    if (action === "transfer") {
      const { trackingNumbers, fromOfficeId, toOfficeId, remarks } = body;
      const result = await createTransferBundle({
        trackingNumbers,
        fromOfficeId: fromOfficeId || currentUser.officeLocationId,
        toOfficeId,
        userId: currentUser.id,
        userName: currentUser.name || undefined,
        ownerAdminId: currentUser.ownerAdminId,
        remarks,
      });
      return NextResponse.json({ success: true, bundle: result });
    }

    if (action === "receive") {
      const { bundleId, receivedTrackingNumbers, remarks } = body;
      const result = await receiveBundle({
        bundleId,
        receivedTrackingNumbers,
        userId: currentUser.id,
        userName: currentUser.name || undefined,
        ownerAdminId: currentUser.ownerAdminId,
        remarks,
      });
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("BM Report POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
