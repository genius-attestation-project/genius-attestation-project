import { NextRequest, NextResponse } from "next/server";

import { getSessionAccess, hasPermission } from "@/features/admin/server/rbac.service";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSignedFileUrl } from "@/services/storage/view";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userAccess = await getSessionAccess(session.user.id);
    const isSuperAdmin = userAccess?.isSuperAdmin || (session.user as any).role?.name === "Super Admin";

    // RBAC Check for file access
    if (!isSuperAdmin && userAccess) {
      const allowed =
        hasPermission(userAccess, "advance_payment_approval.view_receipt") ||
        hasPermission(userAccess, "advance_payment_approval.view") ||
        hasPermission(userAccess, "revenue_registration.view") ||
        hasPermission(userAccess, "registrations.view") ||
        hasPermission(userAccess, "pending_approval.view") ||
        hasPermission(userAccess, "lead_management.view");

      if (!allowed) {
        return NextResponse.json({ error: "Forbidden: Insufficient permissions to view file receipt." }, { status: 403 });
      }
    }

    const { id } = await context.params;

    // Find FileStorage record
    const fileStorage = await (prisma as any).fileStorage.findUnique({
      where: { id },
      include: {
        registrationFiles: {
          include: {
            registration: true,
          },
        },
      },
    });

    if (!fileStorage) {
      return NextResponse.json({ error: "File not found." }, { status: 404 });
    }

    // Resolve bucketKey with backward compatibility for legacy URL records
    let bucketKey = fileStorage.bucketKey;
    if (!bucketKey && fileStorage.url && fileStorage.url.startsWith("http")) {
      try {
        const parsedUrl = new URL(fileStorage.url);
        bucketKey = decodeURIComponent(parsedUrl.pathname.slice(1));
      } catch {
        bucketKey = fileStorage.url;
      }
    }

    if (!bucketKey) {
      return NextResponse.json({ error: "Invalid bucket key for file." }, { status: 400 });
    }

    // Audit Logging
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    const performedBy = session.user.name || session.user.email || "User";

    // Linked registration info for audit trail if present
    const linkedReg = fileStorage.registrationFiles?.[0]?.registration;
    const registrationId = linkedReg?.id || null;

    if (registrationId) {
      await (prisma as any).auditTrail.create({
        data: {
          registrationId,
          action: "Viewed Receipt File",
          description: `User ${performedBy} viewed receipt/file "${fileStorage.originalName}" (ID: ${fileStorage.id}).`,
          performedBy,
        },
      }).catch((err: any) => console.error("Audit log creation error:", err));
    }

    // Generate 15-minute short-lived pre-signed URL (900 seconds)
    const signedUrl = await generateSignedFileUrl({
      bucketKey,
      originalName: fileStorage.originalName,
      mimeType: fileStorage.mimeType,
      expiresInSeconds: 900,
    });

    const { searchParams } = new URL(request.url);
    if (searchParams.get("redirect") === "false") {
      return NextResponse.json({
        url: signedUrl,
        expiresIn: 900,
        originalName: fileStorage.originalName,
        mimeType: fileStorage.mimeType,
      });
    }

    // Redirect browser securely to the pre-signed URL
    return NextResponse.redirect(signedUrl, 307);
  } catch (error: any) {
    console.error("[GET /api/files/[id]/view] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate file view access." },
      { status: 500 },
    );
  }
}
