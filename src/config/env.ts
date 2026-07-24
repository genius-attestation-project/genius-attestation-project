export const env = {
  authSecret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "LwohKo6gq7QYj4Y4MK5DdofKcFYdIrj8a31MbqkPJMS",
  authUrl: process.env.AUTH_URL || process.env.NEXTAUTH_URL,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  databaseUrl: process.env.DATABASE_URL,
};
