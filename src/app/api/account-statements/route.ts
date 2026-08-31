import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAccountStatements } from "@/features/account-statements/server/account-statements.service";
import { accountStatementFiltersSchema } from "@/features/account-statements/validations/account-statements.schema";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) {
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
      return NextResponse.json({
        office: office || "",
        fromDate: fromDate || "",
        toDate: toDate || "",
        openingBalance: 0,
        credit: {
          advances: [],
          advancesTotal: 0,
          moreAdvances: [],
          moreAdvancesTotal: 0,
          panelCredits: [],
          panelCreditsTotal: 0,
          creditTotal: 0,
        },
        debit: {
          groups: [],
          debitTotal: 0,
        },
        cashInHand: 0,
      });
    }

    const data = await getAccountStatements(ownerAdminId, parseResult.data);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[GET /api/account-statements] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch account statements." },
      { status: 500 }
    );
  }
}
