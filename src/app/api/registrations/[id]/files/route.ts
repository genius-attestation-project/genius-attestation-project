import { mkdir, writeFile } from "fs/promises";
import path from "path";

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
]);

export async function POST(request: Request, context: RouteContext) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { id } = await context.params;
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("File is required.");
    }

    if (file.type && !allowedTypes.has(file.type)) {
      return jsonError("Unsupported file type.");
    }

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "registrations");
    await mkdir(uploadsDir, { recursive: true });

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const storedName = `${Date.now()}-${safeName}`;
    const filePath = path.join(uploadsDir, storedName);
    const bytes = await file.arrayBuffer();
    await writeFile(filePath, Buffer.from(bytes));

    const performedBy = session.user?.name ?? session.user?.email ?? undefined;
    const registration = await addRegistrationFile(
      ownerAdminId,
      id,
      {
        fileName: file.name,
        fileUrl: `/uploads/registrations/${storedName}`,
        fileType: file.type || "application/octet-stream",
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
