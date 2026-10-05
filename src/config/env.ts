const isProduction = process.env.NODE_ENV === "production";
const fallbackDevSecret = "LwohKo6gq7QYj4Y4MK5DdofKcFYdIrj8a31MbqkPJMS";

const resolvedAuthSecret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
if (isProduction && !resolvedAuthSecret) {
  throw new Error("FATAL: AUTH_SECRET or NEXTAUTH_SECRET must be set in production.");
}

export const env = {
  authSecret: resolvedAuthSecret || fallbackDevSecret,
  authUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  refreshTokenExpires: process.env.REFRESH_TOKEN_EXPIRES || "30d",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || resolvedAuthSecret || fallbackDevSecret,
};


