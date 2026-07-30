#!/bin/sh
set -e

# Run Prisma DB Push at container runtime if DATABASE_URL is present
if [ -n "$DATABASE_URL" ]; then
  echo "=> Executing Prisma DB Push..."
  npx prisma db push --skip-generate || echo "=> Prisma DB Push warning emitted."
fi

echo "=> Starting Next.js Standalone Production Server..."
exec node server.js
