import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function recalculateRunningBalances(
  ownerAdminId: string,
  tx: Prisma.TransactionClient = prisma,
) {
  const entries = await tx.accountStatementEntry.findMany({
    where: {
      ownerAdminId,
      reversedAt: null,
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      credit: true,
      debit: true,
    },
  });

  if (entries.length === 0) return;

  let balance = new Prisma.Decimal(0);
  const updates = entries.map((entry) => {
    balance = balance.plus(entry.credit).minus(entry.debit);
    return { id: entry.id, balance: balance.toNumber() };
  });

  const chunkSize = 1000;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    const caseWhens = chunk.map((u) => `WHEN '${u.id}' THEN ${u.balance}`).join(" ");
    const ids = chunk.map((u) => `'${u.id}'`).join(",");

    const sql = `UPDATE account_statement_entries SET running_balance = CASE id ${caseWhens} END WHERE id IN (${ids})`;
    await tx.$executeRawUnsafe(sql);
  }
}
