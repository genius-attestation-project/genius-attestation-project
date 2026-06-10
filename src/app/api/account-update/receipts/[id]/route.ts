import { auth } from "@/lib/auth";
import { hasPermission } from "@/features/admin/server/rbac.service";
import { getPaymentReceiptForApproval } from "@/features/account-update/server/account-update.service";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const session = await auth();

  if (!session?.user) {
    return Response.json({ message: "Authentication required." }, { status: 401 });
  }

  if (
    !session.user.isSuperAdmin &&
    !hasPermission(session.user, "account_admin_approval.view") &&
    !hasPermission(session.user, "account_approval.view")
  ) {
    return Response.json({ message: "You do not have permission to view receipts." }, { status: 403 });
  }

  const ownerAdminId = session.user.ownerAdminId;
  if (!ownerAdminId) {
    return Response.json({ message: "No owner admin ID found." }, { status: 401 });
  }

  const { id } = await params;
  const receipt = await getPaymentReceiptForApproval(ownerAdminId, id);

  if (!receipt) {
    return Response.json({ message: "Receipt not found." }, { status: 404 });
  }

  const encodedName = encodeURIComponent(receipt.fileName).replace(/['()]/g, escape);

  return new Response(receipt.fileData, {
    headers: {
      "Content-Type": receipt.mimeType,
      "Content-Length": String(receipt.fileSize),
      "Content-Disposition": `inline; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
