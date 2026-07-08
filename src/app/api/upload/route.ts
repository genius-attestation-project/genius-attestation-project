import { auth } from "@/lib/auth";
import { uploadFile } from "@/services/storage/upload";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const performedBy = session?.user?.name || session?.user?.email;

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const module = formData.get("module") as string;
    const recordId = formData.get("recordId") as string | undefined;

    if (!file) {
      return jsonError("File is required.", 400);
    }
    
    if (!module) {
      return jsonError("Module is required.", 400);
    }

    const uploaded = await uploadFile(file, module, recordId, performedBy || "System");

    return jsonOk(uploaded);
  } catch (error) {
    console.error("Upload error:", error);
    if (error instanceof Error) {
      return jsonError(error.message, 400);
    }
    return jsonError("Internal Server Error", 500);
  }
}
