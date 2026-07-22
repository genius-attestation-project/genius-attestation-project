import { auth } from "@/lib/auth";
import { jsonError, jsonOk } from "@/utils/response";
import { addRegistrationFile } from "@/features/registration/server/registration.service";
import { NextRequest } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const fileCategories = new Set(["DOCUMENT", "INVOICE", "SUPPORTING_DOCUMENT"]);

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    
    // Expecting JSON now instead of FormData
    const body = await request.json();
    const { fileStorageId, fileCategory = "DOCUMENT" } = body;

    if (!fileStorageId) {
      return jsonError("fileStorageId is required.");
    }

    if (!fileCategories.has(fileCategory)) {
      return jsonError("Invalid file category.");
    }

    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    
    const registration = await addRegistrationFile(
      ownerAdminId,
      id,
      {
        fileStorageId,
        fileCategory,
      },
      performedBy,
    );

    if (!registration) return jsonError("Registration not found.", 404);

    return jsonOk({ registration }, 201);
  } catch (error) {
    console.error("Failed to add registration file", error);
    return jsonError("Unable to associate file.", 500);
  }
}
