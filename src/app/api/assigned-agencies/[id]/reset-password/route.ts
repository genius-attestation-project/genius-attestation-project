import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { resetAgencyPasswordSchema } from "@/features/assigned-agencies/validations/agency.schema";
import bcrypt from "bcrypt";
import { auth } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const errorResponse = await requireApiPermission("assigned_agencies.reset_password");
    if (errorResponse) return errorResponse;

    const { id } = await params;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;

    const body = await req.json();
    const parsed = resetAgencyPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid request body.", errors: parsed.error.format() }, { status: 400 });
    }

    const existing = await prisma.assignedAgency.findUnique({
      where: { id },
    });

    if (!existing || existing.ownerAdminId !== ownerAdminId || existing.deletedAt !== null) {
      return NextResponse.json({ message: "Agency not found." }, { status: 404 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(parsed.data.password, salt);

    await prisma.assignedAgency.update({
      where: { id },
      data: {
        passwordHash,
        updatedBy: userId,
      },
    });

    return NextResponse.json({ message: "Password reset successfully." });
  } catch (error) {
    console.error("[ASSIGNED_AGENCY_RESET_PASSWORD]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
