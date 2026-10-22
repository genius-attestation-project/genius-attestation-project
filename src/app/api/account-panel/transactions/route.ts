import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { jsonError, jsonOk } from "@/utils/response";
import { createAccountPanelTransactionSchema } from "@/features/account-panel/validations/account-panel-transaction.schema";
import {
  createAccountPanelTransaction,
  getAccountTransactions,
  getAvailableAdvanceForTracking,
} from "@/features/account-panel/server/account-panel-transaction.service";
import { resolveOfficeLocationId } from "@/lib/office-location";
import { hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const authError = await requireApiPermission("account_panel.create");
  if (authError) return authError;

  const session = await auth();

  try {
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const body = await request.json();

    // Validate payload
    const parsed = createAccountPanelTransactionSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues.map((i) => i.message).join(", ");
      return jsonError(errorMsg || "Invalid transaction input.", 400);
    }

    // Resolve and authorize office location
    const isSuperAdmin = Boolean(
      session?.user?.isSuperAdmin || session?.user?.role === "Super Admin"
    );
    let officeId: string | null = null;

    if (parsed.data.officeId && parsed.data.officeId.trim()) {
      const requestedOffice = parsed.data.officeId.trim();
      const officeRecord = await prisma.officeLocation.findFirst({
        where: {
          ownerAdminId,
          OR: [{ id: requestedOffice }, { officeName: requestedOffice }],
        },
        select: { id: true, officeName: true },
      });

      if (!officeRecord) {
        return jsonError("Specified office location does not exist.", 400);
      }

      if (!isSuperAdmin) {
        const isAllowed =
          hasOfficeAccess(session?.user, officeRecord.id, "account_panel") ||
          hasOfficeAccess(session?.user, officeRecord.officeName, "account_panel");
        if (!isAllowed) {
          return jsonError(
            "You are not authorized to create transactions for this office.",
            403
          );
        }
      }

      officeId = officeRecord.id;
    } else {
      officeId = await resolveOfficeLocationId({
        ownerAdminId,
        userId: session?.user?.id,
        officeLocationId: session?.user?.officeLocationId,
        officeLocationName: session?.user?.officeLocationName,
      });
    }

    if (!officeId) {
      return jsonError(
        "An office location is required to create a transaction. Please ensure an active office is assigned or selected.",
        400
      );
    }

    const userId = session?.user?.id;
    const userName = session?.user?.name || session?.user?.email || undefined;

    const transaction = await createAccountPanelTransaction(
      ownerAdminId,
      userId,
      userName,
      {
        ...parsed.data,
        officeId,
      }
    );

    return jsonOk(
      {
        success: true,
        transaction,
        message: "Transaction created successfully.",
      },
      201
    );
  } catch (error: any) {
    console.error("Failed to create account panel transaction:", error);
    return jsonError(error.message || "Unable to save transaction.", 400);
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireApiPermission("account_panel.view");
  if (authError) return authError;

  const session = await auth();

  try {
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return jsonError("No owner admin ID found.", 401);

    const { searchParams } = new URL(request.url);
    const checkTracking = searchParams.get("checkTracking") || searchParams.get("trackingNumber");

    if (checkTracking) {
      const advanceInfo = await getAvailableAdvanceForTracking(ownerAdminId, checkTracking);
      return jsonOk(advanceInfo);
    }

    const accountId = searchParams.get("accountId");
    if (!accountId) {
      return jsonError("Account ID or trackingNumber query parameter is required.", 400);
    }

    const officeId = searchParams.get("officeId") || undefined;
    const transactions = await getAccountTransactions(ownerAdminId, accountId, officeId);
    return jsonOk({ transactions });
  } catch (error: any) {
    console.error("Failed to fetch account transactions:", error);
    return jsonError(error.message || "Unable to fetch transactions.", 500);
  }
}
