import { NextRequest, NextResponse } from "next/server";

import { deleteRegistrationFile, getRegistrationFile } from "@/features/registration/server/registration.service";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/services/storage/delete";
import { generateSignedFileUrl } from "@/services/storage/view";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET(request: NextRequest, context: { params: Promise<{ fileId: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;

    if (!session || !ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { fileId } = await context.params;
    const file = await getRegistrationFile(ownerAdminId, fileId);

    if (!file || !file.fileStorage) {
      return NextResponse.json({ message: "File not found." }, { status: 404 });
    }

    const fileStorage = file.fileStorage;

    // Resolve bucketKey safely
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
      return NextResponse.json({ message: "Invalid bucket key for file." }, { status: 400 });
    }

    // Audit log viewing
    const performedBy = session.user?.name || session.user?.email || "User";
    if (file.registrationId) {
      await (prisma as any).auditTrail.create({
        data: {
          registrationId: file.registrationId,
          action: "Viewed Registration File",
          description: `User ${performedBy} viewed file "${fileStorage.originalName}".`,
          performedBy,
        },
      }).catch((err: any) => console.error("Audit log error:", err));
    }

    // Generate 15-minute signed URL (900 seconds)
    const signedUrl = await generateSignedFileUrl({
      bucketKey,
      originalName: fileStorage.originalName,
      mimeType: fileStorage.mimeType,
      expiresInSeconds: 900,
    });

    return NextResponse.redirect(signedUrl, 307);
  } catch (error: any) {
    console.error("[GET /api/registrations/files/[fileId]] Error:", error);
    return NextResponse.json({ message: error.message || "Failed to retrieve file." }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ fileId: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { fileId } = await context.params;
    const performedBy = session.user?.name ?? session.user?.email ?? undefined;

    // Remove from Registration and Audit Trail
    const result = await deleteRegistrationFile(ownerAdminId, fileId, performedBy);
    
    if (!result) {
      return jsonError("File not found or access denied.", 404);
    }

    if (result.fileStorageId) {
      try {
        await deleteFile(result.fileStorageId);
      } catch (err) {
        console.error("Failed to delete from Wasabi:", err);
      }
    }

    return jsonOk({ success: true, registration: result.registration }, 200);
  } catch (error) {
    console.error("Delete file error:", error);
    return jsonError("Failed to delete file.", 500);
  }
}
