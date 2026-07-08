import { auth } from "@/lib/auth";
import { getRegistrationFile, deleteRegistrationFile } from "@/features/registration/server/registration.service";
import { deleteFile } from "@/services/storage/delete";
import { jsonError, jsonOk } from "@/utils/response";

type RouteContext = {
  params: Promise<{ fileId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await auth();
  const ownerAdminId = session?.user?.ownerAdminId;

  if (!ownerAdminId) {
    return Response.json({ message: "No owner admin ID found." }, { status: 401 });
  }

  const { fileId } = await context.params;
  const file = await getRegistrationFile(ownerAdminId, fileId);

  if (!file || !file.fileStorage) {
    return Response.json({ message: "File not found." }, { status: 404 });
  }

  return Response.redirect(file.fileStorage.url);
}

export async function DELETE(_: Request, context: RouteContext) {
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
