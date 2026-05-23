import { auth } from "@/lib/auth";
import { getRegistrationFile } from "@/features/registration/server/registration.service";

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

  if (!file) {
    return Response.json({ message: "File not found." }, { status: 404 });
  }

  const encodedName = encodeURIComponent(file.fileName).replace(/['()]/g, escape);

  return new Response(file.fileData, {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Length": String(file.fileSize),
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
