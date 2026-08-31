import { auth } from "@/lib/auth";
import { uploadFile } from "@/services/storage/upload";
import { jsonError, jsonOk } from "@/utils/response";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const performedBy = session?.user?.name || session?.user?.email;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawModule = (formData.get("module") || formData.get("moduleName")) as string | null;
    const category = formData.get("category") as string | null;
    const referenceId = (formData.get("referenceId") || formData.get("recordId")) as string | null;

    if (!file) {
      return jsonError("File is required for upload.", 400);
    }
    
    if (!rawModule || !rawModule.trim()) {
      return jsonError("Module is required.", 400);
    }

    const moduleName = rawModule.trim();
    const recordId = referenceId?.trim() || undefined;
    const cat = category?.trim() || undefined;

    const uploaded = await uploadFile(file, moduleName, recordId, performedBy || "System", cat);

    return jsonOk({
      success: true,
      file: uploaded,
      id: uploaded.id,
      url: uploaded.url,
      fileStorageId: uploaded.id,
      message: "File uploaded successfully.",
    });
  } catch (error) {
    console.error("Upload API error:", error);
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }
    return jsonError("Internal Server Error during file upload.", 500);
  }
}
