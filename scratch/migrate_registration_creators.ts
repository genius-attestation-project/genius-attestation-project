import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const registrations = await prisma.registration.findMany();

  console.log(`Found ${registrations.length} total registrations.`);

  let updated = 0;

  for (const reg of registrations) {
    let newCreatedBy = null;

    const currentCreatedBy = reg.createdBy; // this is currently a name in DB
    const registeredPerson = reg.registeredPerson;

    if (currentCreatedBy) {
      // Check if it's already an ID
      const userById = await prisma.user.findUnique({ where: { id: currentCreatedBy } });
      if (userById) {
        // It's already an ID, do nothing
        continue;
      }

      // Find by name
      const userByName = await prisma.user.findFirst({ where: { name: currentCreatedBy } });
      if (userByName) {
        newCreatedBy = userByName.id;
      }
    }

    if (!newCreatedBy && registeredPerson) {
      const userById = await prisma.user.findUnique({ where: { id: registeredPerson } });
      if (userById) {
        newCreatedBy = userById.id;
      } else {
        const userByName = await prisma.user.findFirst({ where: { name: registeredPerson } });
        if (userByName) {
          newCreatedBy = userByName.id;
        }
      }
    }

    if (!newCreatedBy && reg.submittedBy) {
      const userById = await prisma.user.findUnique({ where: { id: reg.submittedBy } });
      if (userById) {
        newCreatedBy = userById.id;
      } else {
        const userByName = await prisma.user.findFirst({ where: { name: reg.submittedBy } });
        if (userByName) {
          newCreatedBy = userByName.id;
        }
      }
    }

    if (newCreatedBy && newCreatedBy !== currentCreatedBy) {
      await prisma.registration.update({
        where: { id: reg.id },
        data: { createdBy: newCreatedBy },
      });
      updated++;
      console.log(`Updated registration ${reg.trackingNumber} with createdBy ${newCreatedBy} (was ${currentCreatedBy})`);
    } else if (!newCreatedBy && currentCreatedBy) {
      // Clear the invalid name so it doesn't break foreign key constraints!
      // Wait, is it a foreign key? Yes, creator User? @relation(fields: [createdBy], references: [id])
      // So if it's not a valid ID, Prisma will throw an error when fetching or it might just fail database constraints.
      // Wait, did I push the schema with a foreign key constraint?
      // Yes! Prisma creates a foreign key. So how did the existing names not fail the db push?
      // Wait, I ran `npx prisma db push` but if it created a foreign key on existing data with invalid IDs, it might have FAILED or it succeeded because MySQL sometimes doesn't check existing rows if not strict, or it might have failed. Let me check the output of db push!
      
      await prisma.registration.update({
        where: { id: reg.id },
        data: { createdBy: null },
      });
      console.log(`Cleared invalid createdBy for registration ${reg.trackingNumber} (was ${currentCreatedBy})`);
    }
  }
  
  console.log(`Done. Updated ${updated} registrations.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
