import { prisma } from "@/lib/prisma";
import { jsonError, jsonOk } from "@/utils/response";

export async function GET() {
  try {
    // Detect the actual Lead table name
    const tableNameResult = await prisma.$queryRawUnsafe<{ tablename: string }[]>(
      `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ILIKE 'lead' LIMIT 1;`
    );
    const leadTableName = tableNameResult[0]?.tablename ?? "Lead";

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS lead_status_history (
        id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        lead_id TEXT NOT NULL,
        previous_status "LeadStatus" NOT NULL,
        new_status "LeadStatus" NOT NULL,
        changed_by TEXT,
        owner_admin_id TEXT,
        created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT lead_status_history_pkey PRIMARY KEY (id)
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS lsh_lead_id_idx ON lead_status_history(lead_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS lsh_new_status_idx ON lead_status_history(new_status);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS lsh_owner_idx ON lead_status_history(owner_admin_id);`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS lsh_created_at_idx ON lead_status_history(created_at);`);

    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'lsh_lead_id_fkey'
        ) THEN
          ALTER TABLE lead_status_history
            ADD CONSTRAINT lsh_lead_id_fkey
            FOREIGN KEY (lead_id) REFERENCES "${leadTableName}"(id) ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    return jsonOk({ success: true, message: "Migration complete.", leadTableName });
  } catch (error) {
    console.error(error);
    return jsonError(String(error), 500);
  }
}
