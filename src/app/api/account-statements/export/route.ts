import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { getAccountStatements } from "@/features/account-statements/server/account-statements.service";
import { accountStatementFiltersSchema } from "@/features/account-statements/validations/account-statements.schema";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireApiPermission("account_statements.export");
  if (denied) return denied;

  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId || !session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawFilters = {
      office: searchParams.get("office") || undefined,
      fromDate: searchParams.get("fromDate") || undefined,
      toDate: searchParams.get("toDate") || undefined,
      search: searchParams.get("search") || undefined,
      transactionType: searchParams.get("transactionType") || "ALL",
    };

    const parseResult = accountStatementFiltersSchema.safeParse(rawFilters);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid filters provided", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { office, fromDate, toDate } = parseResult.data;
    if (!office || office === "All" || !fromDate || !toDate) {
      return NextResponse.json(
        { error: "Office, fromDate, and toDate are required for export." },
        { status: 400 }
      );
    }

    // Verify Office Visibility Access for non-Super Admin
    if (!session.user.isSuperAdmin) {
      const isAllowed = hasOfficeAccess(session.user, office, "account_statements");
      if (!isAllowed) {
        return NextResponse.json(
          { error: "You are not authorized to export account statements for this office." },
          { status: 403 }
        );
      }
    }

    const data = await getAccountStatements(ownerAdminId, parseResult.data, session.user);
    return NextResponse.json({
      success: true,
      exportedAt: new Date().toISOString(),
      data,
    });
  } catch (error: any) {
    console.error("[GET /api/account-statements/export] Error:", error);
    const isAuthErr = error?.message?.includes("not authorized");
    return NextResponse.json(
      { error: error?.message || "Failed to export account statements." },
      { status: isAuthErr ? 403 : 500 }
    );
  }
}
