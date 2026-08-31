import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { listUserSessions, revokeAllUserSessions } from "@/features/auth/server/refresh-token.service";
import { jsonError, jsonOk } from "@/utils/response";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const activeSessions = await listUserSessions(userId);

    return jsonOk({
      success: true,
      sessions: activeSessions,
    });
  } catch (error: any) {
    console.error("[GET /api/auth/sessions] Error:", error);
    return jsonError("Failed to fetch active sessions.", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (!userId) {
      return jsonError("Unauthorized", 401);
    }

    const body = await request.json().catch(() => ({}));
    const { sessionId, revokeAll } = body;

    if (revokeAll) {
      await revokeAllUserSessions(userId);
      return jsonOk({
        success: true,
        message: "All sessions revoked.",
      });
    }

    if (sessionId) {
      await (prisma as any).refreshToken.updateMany({
        where: { id: sessionId, userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      return jsonOk({
        success: true,
        message: "Session revoked successfully.",
      });
    }

    return jsonError("Session ID or revokeAll parameter required.", 400);
  } catch (error: any) {
    console.error("[DELETE /api/auth/sessions] Error:", error);
    return jsonError("Failed to revoke session.", 500);
  }
}
