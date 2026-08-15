import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import {
  clearRefreshTokenCookie,
  REFRESH_TOKEN_COOKIE_NAME,
  revokeRefreshToken,
} from "@/features/auth/server/refresh-token.service";
import { jsonOk } from "@/utils/response";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const rawRefreshToken = cookieStore.get(REFRESH_TOKEN_COOKIE_NAME)?.value;

    if (rawRefreshToken) {
      await revokeRefreshToken(rawRefreshToken);
    }

    // Clear Refresh Token cookie
    await clearRefreshTokenCookie();

    return jsonOk({
      success: true,
      message: "Logged out successfully and session revoked.",
    });
  } catch (error: any) {
    console.error("[POST /api/auth/logout] Error:", error);
    // Even if error occurs, clear cookies to protect user
    await clearRefreshTokenCookie();
    return jsonOk({
      success: true,
      message: "Logged out.",
    });
  }
}
