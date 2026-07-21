import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/middleware/auth.middleware";

export async function GET() {
  try {
    const session = await requireAuth("/api/communication/offices");
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }

    const offices = await prisma.officeLocation.findMany({
      where: {
        ownerAdminId: session.user.ownerAdminId,
      },
      select: {
        id: true,
        officeName: true,
      },
      orderBy: {
        officeName: "asc",
      },
    });

    return NextResponse.json({ offices });
  } catch (error) {
    console.error("[OFFICES_GET]", error);
    return NextResponse.json(
      { message: "Internal server error." },
      { status: 500 }
    );
  }
}
