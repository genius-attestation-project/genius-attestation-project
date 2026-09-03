import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { hasPermission, hasOfficeAccess } from "@/features/admin/server/rbac.service";
import {
  listDocumentInHand,
  createTransferBundle,
  listInboundBundles,
  listOutboundBundles,
  receiveBundle,
  getMovementHistory,
} from "@/features/home/server/bundle-workflow.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !currentUser.ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(currentUser, "home.view")) {
      return NextResponse.json({ error: "You do not have permission to access Home module." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "document_in_hand";
    const requestedOfficeId = searchParams.get("officeId");
    const isSuperAdmin = Boolean(currentUser.isSuperAdmin || currentUser.role === "Super Admin");
    const search = searchParams.get("search") || undefined;

    let officeId: string | undefined = undefined;

    let allowedOfficeIds = currentUser.allowedOfficeIds;
    let allowedOfficeNames = currentUser.allowedOfficeNames;

    if (!isSuperAdmin && currentUser.moduleOfficeVisibilities?.["home"]) {
      const modConfig = currentUser.moduleOfficeVisibilities["home"];
      allowedOfficeIds = modConfig.officeIds;
      allowedOfficeNames = modConfig.officeNames;
    }

    if (isSuperAdmin) {
      officeId = requestedOfficeId || undefined;
    } else {
      if (requestedOfficeId === "all" || requestedOfficeId === "ALL") {
        return NextResponse.json(
          { error: "Access to 'All Offices' is forbidden for non-Super Admin users." },
          { status: 403 }
        );
      }

      if (requestedOfficeId) {
        if (!hasOfficeAccess(currentUser, requestedOfficeId, "home")) {
          return NextResponse.json(
            { error: "Access to the requested office location is forbidden." },
            { status: 403 }
          );
        }
        officeId = requestedOfficeId;
      } else {
        officeId = currentUser.officeLocationId || allowedOfficeIds?.[0] || undefined;
      }
    }

    if (section === "document_in_hand") {
      if (!hasPermission(currentUser, "home.document_in_hand.view")) {
        return NextResponse.json(
          { error: "Forbidden. You do not have permission to view Document In Hand." },
          { status: 403 }
        );
      }
      const data = await listDocumentInHand({
        ownerAdminId: currentUser.ownerAdminId,
        officeId,
        search,
        isSuperAdmin: currentUser.isSuperAdmin,
        allowedOfficeIds,
        allowedOfficeNames,
      });
      return NextResponse.json({ data });
    }

    if (section === "inbound") {
      if (!hasPermission(currentUser, "home.inbound.view")) {
        return NextResponse.json(
          { error: "Forbidden. You do not have permission to view Inbound Bundles." },
          { status: 403 }
        );
      }
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
      if (!hasPermission(currentUser, "home.outbound.view")) {
        return NextResponse.json(
          { error: "Forbidden. You do not have permission to view Outbound Bundles." },
          { status: 403 }
        );
      }
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
      const canViewHistory =
        hasPermission(currentUser, "home.movement_history.view") ||
        hasPermission(currentUser, "movement_history.view") ||
        hasPermission(currentUser, "document_movement.view");

      if (!canViewHistory) {
        return NextResponse.json(
          { error: "Forbidden. You do not have permission to view Movement History." },
          { status: 403 }
        );
      }

      const data = await getMovementHistory({
        ownerAdminId: currentUser.ownerAdminId,
        officeId,
        search,
      });
      return NextResponse.json({ data });
    }

    return NextResponse.json({ error: "Invalid section" }, { status: 400 });
  } catch (error: any) {
    console.error("Home API GET Error:", error);
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
      const canTransfer =
        hasPermission(currentUser, "home.document_in_hand.transfer") ||
        hasPermission(currentUser, "home.transfer");

      if (!canTransfer) {
        return NextResponse.json(
          { error: "Forbidden. You do not have permission to transfer documents." },
          { status: 403 }
        );
      }
      const { trackingNumbers, fromOfficeId, toOfficeId, remarks } = body;
      const effectiveFromOfficeId = fromOfficeId || currentUser.officeLocationId;

      if (effectiveFromOfficeId && !hasOfficeAccess(currentUser, effectiveFromOfficeId)) {
        return NextResponse.json(
          { error: "Access to the source office location is forbidden." },
          { status: 403 }
        );
      }

      if (toOfficeId && !hasOfficeAccess(currentUser, toOfficeId)) {
        return NextResponse.json(
          { error: "Access to the destination office location is forbidden." },
          { status: 403 }
        );
      }

      const result = await createTransferBundle({
        trackingNumbers,
        fromOfficeId: effectiveFromOfficeId,
        toOfficeId,
        userId: currentUser.id,
        userName: currentUser.name || undefined,
        ownerAdminId: currentUser.ownerAdminId,
        remarks,
      });
      return NextResponse.json({ success: true, bundle: result });
    }

    if (action === "receive") {
      const canReceive =
        hasPermission(currentUser, "home.inbound.receive") ||
        hasPermission(currentUser, "home.receive");

      if (!canReceive) {
        return NextResponse.json(
          { error: "Forbidden. You do not have permission to receive bundles." },
          { status: 403 }
        );
      }
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
    console.error("Home API POST Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process request" },
      { status: 500 }
    );
  }
}
