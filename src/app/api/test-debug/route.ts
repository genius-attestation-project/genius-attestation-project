import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { listRegistrations } from "@/features/registration/server/registration.service";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const session = await auth();
  const isSuperAdmin = session?.user?.isSuperAdmin || (session?.user as any)?.role === "Super Admin" || (session?.user as any)?.role?.name === "Super Admin";

  if (!session?.user || !isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden: Super Admin access required." }, { status: 403 });
  }

  try {
    const adminUser = await prisma.user.findFirst({
      where: { role: { name: "OWNER_ADMIN" } },
    });
    if (!adminUser) return NextResponse.json({ error: "No admin" });

    const data = await listRegistrations(adminUser.id, {
      page: 1,
      pageSize: 50,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error("DEBUG FATAL ERROR:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

