import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { resetOfficePasswordSchema } from "@/features/assigned-office/validations/office.schema";
import { resetOfficePassword } from "@/features/assigned-office/server/assigned-office.service";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.reset_password");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    const userName = session?.user?.name || session?.user?.email || "Admin";

    if (!ownerAdminId || !userId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const parsed = resetOfficePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid password format.", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await resetOfficePassword(id, parsed.data.password, userId, userName, ownerAdminId);
    return NextResponse.json({ message: "Password reset successfully.", id: updated.id });
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_RESET_PASSWORD_POST]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 400 });
  }
}
