import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  try {
    console.log("Deleting conflicting data to allow schema migration...");
    await prisma.rolePermission.deleteMany({});
    await prisma.userRole.deleteMany({});
    await prisma.accessRole.deleteMany({});
    console.log("Success! Now we can run db push.");
  } catch (e) {
    console.error("Prisma Error:", e);
  } finally {
    await prisma.$disconnect()
  }
}

main()
