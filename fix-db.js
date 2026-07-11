const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(`UPDATE registrations SET created_by = NULL WHERE created_by IS NOT NULL AND created_by NOT IN (SELECT id FROM users)`);
  console.log('Fixed orphan foreign keys');
}

main().catch(console.error).finally(() => prisma.$disconnect());
