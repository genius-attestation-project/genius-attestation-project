import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { createOfficeSchema } from "@/features/assigned-office/validations/office.schema";
import {
  listAssignedOffices,
  createAssignedOffice,
} from "@/features/assigned-office/server/assigned-office.service";

export async function GET(req: NextRequest) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.view");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "All";
    const processTypeId = searchParams.get("processTypeId") || "All";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = (searchParams.get("sortOrder") as "asc" | "desc") || "desc";

    const result = await listAssignedOffices({
      ownerAdminId,
      page,
      pageSize,
      search,
      status,
      processTypeId,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_GET]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.create");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    const userName = session?.user?.name || session?.user?.email || "Admin";

    if (!ownerAdminId || !userId) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createOfficeSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues?.[0];
      const detailMsg = firstIssue
        ? `${firstIssue.path.join(".") ? `${firstIssue.path.join(".")}: ` : ""}${firstIssue.message}`
        : "Invalid form data.";
      return NextResponse.json(
        { message: `Invalid form data. ${detailMsg}`, errors: parsed.error.format() },
        { status: 400 }
      );
    }

    const office = await createAssignedOffice(parsed.data, userId, userName, ownerAdminId);
    return NextResponse.json(office, { status: 201 });
  } catch (error: any) {
    console.error("[ASSIGNED_OFFICE_POST]", error);
    return NextResponse.json({ message: error.message || "Internal server error." }, { status: 400 });
  }
}
