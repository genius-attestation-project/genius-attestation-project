import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  REFRESH_TOKEN_COOKIE_NAME,
  setRefreshTokenCookie,
  verifyAndRotateRefreshToken,
} from "@/features/auth/server/refresh-token.service";
import { jsonError, jsonOk } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

    if (!rawRefreshToken) {
      return jsonError("Refresh token missing.", 401);
    }

    const userAgent = request.headers.get("user-agent") || undefined;
    const ipAddress = request.headers.get("x-forwarded-for")?.split(",")[0] || undefined;

    const rotated = await verifyAndRotateRefreshToken({
      rawToken: rawRefreshToken,
      userAgent,
      ipAddress,
    });

    // Set new rotated HttpOnly cookie
    await setRefreshTokenCookie(rotated.newRawToken, rotated.expiresAt);

    return jsonOk({
      success: true,
      message: "Session token refreshed successfully.",
      userId: rotated.userId,
    });
  } catch (error: any) {
    console.error("[POST /api/auth/refresh] Error:", error);
    return jsonError(error?.message || "Invalid or expired refresh token.", 401);
  }
}
