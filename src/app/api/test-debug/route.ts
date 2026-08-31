import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { listRegistrations } from "@/features/registration/server/registration.service";

export async function GET(request: NextRequest) {
  try {
    const adminUser = await prisma.user.findFirst({
        where: { role: { name: "OWNER_ADMIN" } }
    });
    if (!adminUser) return NextResponse.json({ error: "No admin" });

    const data = await listRegistrations(adminUser.id, {
      page: 1,
      pageSize: 50,
    });
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("DEBUG FATAL ERROR:", error);
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
