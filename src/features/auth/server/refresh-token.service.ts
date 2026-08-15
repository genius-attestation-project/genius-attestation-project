import crypto from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { env } from "@/config/env";

export const REFRESH_TOKEN_COOKIE_NAME = "genius_refresh_token";

function parseDaysFromDuration(durationStr: string): number {
  if (!durationStr) return 30;
  if (durationStr.endsWith("d")) {
    const days = parseInt(durationStr.replace("d", ""), 10);
    return isNaN(days) ? 30 : days;
  }
  if (durationStr.endsWith("h")) {
    const hours = parseInt(durationStr.replace("h", ""), 10);
    return isNaN(hours) ? 30 : hours / 24;
  }
  const days = parseInt(durationStr, 10);
  return isNaN(days) ? 30 : days;
}

const DEFAULT_REFRESH_EXPIRATION_DAYS = parseDaysFromDuration(env.refreshTokenExpires);

/**
 * Computes SHA-256 hash of a raw refresh token.
 * We never store raw refresh tokens in the database.
 */
export function hashRefreshToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

/**
 * Generates a 256-bit cryptographically secure random token string.
 */
export function generateRandomToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Creates a new Refresh Token database record for a user (hashed) and returns the raw token.
 */
export async function createRefreshTokenRecord(params: {
  userId: string;
  userAgent?: string;
  ipAddress?: string;
  expirationDays?: number;
}): Promise<{ rawToken: string; expiresAt: Date }> {
  const { userId, userAgent, ipAddress, expirationDays = DEFAULT_REFRESH_EXPIRATION_DAYS } = params;

  const rawToken = generateRandomToken();
  const tokenHash = hashRefreshToken(rawToken);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  await (prisma as any).refreshToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
      userAgent: userAgent || null,
      ipAddress: ipAddress || null,
    },
  });

  return { rawToken, expiresAt };
}

/**
 * Sets the HttpOnly, secure Refresh Token cookie.
 */
export async function setRefreshTokenCookie(rawToken: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/**
 * Clears the Refresh Token cookie.
 */
export async function clearRefreshTokenCookie() {
  const cookieStore = await cookies();
  cookieStore.set(REFRESH_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(0),
  });
}

/**
 * Validates an active, non-revoked, non-expired refresh token, revokes the old token (Rotation),
 * and creates a new rotated refresh token in the database.
 */
export async function verifyAndRotateRefreshToken(params: {
  rawToken: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<{ userId: string; newRawToken: string; expiresAt: Date }> {
  const { rawToken, userAgent, ipAddress } = params;
  if (!rawToken) {
    throw new Error("Refresh token is required.");
  }

  const tokenHash = hashRefreshToken(rawToken);
  const now = new Date();

  const record = await (prisma as any).refreshToken.findFirst({
    where: {
      tokenHash,
      revokedAt: null,
      expiresAt: { gt: now },
    },
  });

  if (!record) {
    throw new Error("Invalid, revoked, or expired refresh token.");
  }

  // 1. Revoke the old token (Token Rotation)
  await (prisma as any).refreshToken.update({
    where: { id: record.id },
    data: {
      revokedAt: now,
      lastUsedAt: now,
    },
  });

  // 2. Create a new rotated refresh token
  const newSession = await createRefreshTokenRecord({
    userId: record.userId,
    userAgent: userAgent || record.userAgent,
    ipAddress: ipAddress || record.ipAddress,
  });

  return {
    userId: record.userId,
    newRawToken: newSession.rawToken,
    expiresAt: newSession.expiresAt,
  };
}

/**
 * Marks a specific refresh token as revoked in the database.
 */
export async function revokeRefreshToken(rawToken: string): Promise<boolean> {
  if (!rawToken) return false;
  const tokenHash = hashRefreshToken(rawToken);

  try {
    const record = await (prisma as any).refreshToken.findFirst({
      where: { tokenHash, revokedAt: null },
    });

    if (record) {
      await (prisma as any).refreshToken.update({
        where: { id: record.id },
        data: { revokedAt: new Date() },
      });
      return true;
    }
  } catch (error) {
    console.error("[refreshTokenService] Error revoking token:", error);
  }

  return false;
}

/**
 * Revokes all active refresh tokens for a specific user (Logout all devices).
 */
export async function revokeAllUserSessions(userId: string): Promise<void> {
  await (prisma as any).refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Lists all active device sessions for a specific user.
 */
export async function listUserSessions(userId: string) {
  const now = new Date();
  const sessions = await (prisma as any).refreshToken.findMany({
    where: {
      userId,
      revokedAt: null,
      expiresAt: { gt: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      lastUsedAt: true,
      expiresAt: true,
      userAgent: true,
      ipAddress: true,
    },
  });

  return sessions;
}
