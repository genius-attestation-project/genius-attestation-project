type LogErrorParams = {
  route: string;
  apiName?: string;
  userId?: string | null;
  ownerAdminId?: string | null;
  error: any;
};

export function logServerError({
  route,
  apiName,
  userId,
  ownerAdminId,
  error,
}: LogErrorParams) {
  const timestamp = new Date().toISOString();
  const errorName = error?.name || "Error";
  const errorMessage = error?.message || String(error);
  const stackTrace = error?.stack || "No stack trace available";
  const prismaCode = error?.code || undefined;

  console.error(`====================================================`);
  console.error(`[SERVER ERROR] [${timestamp}] [${route}]`);
  if (apiName) console.error(`API Name: ${apiName}`);
  console.error(`User ID: ${userId || "Unauthenticated / N/A"}`);
  console.error(`Owner Admin ID: ${ownerAdminId || "N/A"}`);
  console.error(`Error Name: ${errorName}`);
  if (prismaCode) console.error(`Prisma Error Code: ${prismaCode}`);
  console.error(`Message: ${errorMessage}`);
  console.error(`Stack: ${stackTrace}`);
  console.error(`====================================================`);
}
