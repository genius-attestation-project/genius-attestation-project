import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { updateOfficeSchema } from "@/features/assigned-office/validations/office.schema";
import {
  getAssignedOfficeById,
  updateAssignedOffice,
  deleteAssignedOffice,
} from "@/features/assigned-office/server/assigned-office.service";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.view");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const { id } = await context.params;
    const office = await getAssignedOfficeById(id, ownerAdminId);

    if (!office) {
      return NextResponse.json({ message: "Assigned Office not found." }, { status: 404 });
    }

    return NextResponse.json(office);
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_ID_GET]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.edit");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    const userName = session?.user?.name || session?.user?.email || "Admin";

    if (!ownerAdminId || !userId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const { id } = await context.params;
    const body = await req.json();
    const parsed = updateOfficeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid form data.", errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const updated = await updateAssignedOffice(id, parsed.data, userId, userName, ownerAdminId);
    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_ID_PUT]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.delete");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    const userName = session?.user?.name || session?.user?.email || "Admin";

    if (!ownerAdminId || !userId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const { id } = await context.params;
    await deleteAssignedOffice(id, userId, userName, ownerAdminId);

    return NextResponse.json({ message: "Assigned Office deleted successfully." });
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_ID_DELETE]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 400 });
  }
}
