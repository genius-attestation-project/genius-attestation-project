import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { addRegistrationFile } from "@/features/registration/server/registration.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const fileCategories = new Set(["DOCUMENT", "INVOICE", "SUPPORTING_DOCUMENT"]);

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");
    const fileCategory = String(formData.get("fileCategory") ?? "DOCUMENT");

    if (!(file instanceof File)) {
      return jsonError("File is required.");
    }

    if (!fileCategories.has(fileCategory)) {
      return jsonError("Invalid file category.");
    }

    if (file.type && !allowedTypes.has(file.type)) {
      return jsonError("Unsupported file type.");
    }

    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const bytes = await file.arrayBuffer();
    const registration = await addRegistrationFile(
      ownerAdminId,
      id,
      {
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        fileSize: file.size,
        fileData: new Uint8Array(bytes),
        fileCategory,
      },
      performedBy,
    );

    if (!registration) return jsonError("Registration not found.", 404);

    return jsonOk({ registration }, 201);
  } catch (error) {
    console.error("Failed to upload registration file", error);
    return jsonError("Unable to upload file.", 500);
  }
}
