export const env = {
  authSecret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "LwohKo6gq7QYj4Y4MK5DdofKcFYdIrj8a31MbqkPJMS",
  authUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
  accessTokenExpires: process.env.ACCESS_TOKEN_EXPIRES || "15m",
  refreshTokenExpires: process.env.REFRESH_TOKEN_EXPIRES || "30d",
  refreshTokenSecret: process.env.REFRESH_TOKEN_SECRET || process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "LwohKo6gq7QYj4Y4MK5DdofKcFYdIrj8a31MbqkPJMS",
};

