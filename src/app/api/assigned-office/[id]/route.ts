import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { updateOfficeSchema } from "@/features/assigned-office/validations/office.schema";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.view");
    if (errorResponse) return errorResponse;

    const { id } = await params;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;

    const office = await prisma.assignedAgency.findUnique({
      where: { id },
      include: {
        assignedPackages: {
          include: {
            processType: true,
          },
        },
      },
    });

    if (!office || office.ownerAdminId !== ownerAdminId || office.deletedAt !== null) {
      return NextResponse.json({ message: "Assigned office not found." }, { status: 404 });
    }

    return NextResponse.json(office);
  } catch (error) {
    console.error("[ASSIGNED_OFFICE_GET_BY_ID]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.edit");
    if (errorResponse) return errorResponse;
    
    const { id } = await params;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;

    const body = await req.json();
    const parsed = updateOfficeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid request body.", errors: parsed.error.format() }, { status: 400 });
    }

    const existing = await prisma.assignedAgency.findUnique({
      where: { id },
    });

    if (!existing || existing.ownerAdminId !== ownerAdminId || existing.deletedAt !== null) {
      return NextResponse.json({ message: "Assigned office not found." }, { status: 404 });
    }

    const { username, email, assignedPackages, isActive } = parsed.data;

    if (username && username !== existing.username) {
      const [officeConflict, userConflict] = await Promise.all([
        prisma.assignedAgency.findUnique({ where: { username } }),
        prisma.user.findUnique({ where: { email: username } }),
      ]);
      if (officeConflict || userConflict) {
        return NextResponse.json({ message: "Username is already taken." }, { status: 400 });
      }
    }

    if (email && email !== existing.email) {
      const [officeConflict, userConflict] = await Promise.all([
        prisma.assignedAgency.findUnique({ where: { email } }),
        prisma.user.findUnique({ where: { email } }),
      ]);
      if (officeConflict || userConflict) {
        return NextResponse.json({ message: "Email is already in use." }, { status: 400 });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      let dataToUpdate: any = {
        updatedBy: userId,
        isActive: isActive !== undefined ? isActive : existing.isActive,
      };

      if (username) dataToUpdate.username = username;
      if (email) dataToUpdate.email = email;

      const updatedOffice = await tx.assignedAgency.update({
        where: { id },
        data: dataToUpdate,
      });

      if (assignedPackages) {
        await tx.assignedAgencyPackage.deleteMany({
          where: { assignedAgencyId: id },
        });

        await tx.assignedAgencyPackage.createMany({
          data: assignedPackages.map((pid) => ({
            assignedAgencyId: id,
            processTypeId: pid,
          })),
        });
      }

      return updatedOffice;
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[ASSIGNED_OFFICE_PUT]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const errorResponse = await requireApiPermission("assigned_office.delete");
    if (errorResponse) return errorResponse;

    const { id } = await params;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;

    const existing = await prisma.assignedAgency.findUnique({
      where: { id },
    });

    if (!existing || existing.ownerAdminId !== ownerAdminId || existing.deletedAt !== null) {
      return NextResponse.json({ message: "Assigned office not found." }, { status: 404 });
    }

    await prisma.assignedAgency.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        updatedBy: userId,
      },
    });

    return NextResponse.json({ message: "Assigned office deleted successfully." });
  } catch (error) {
    console.error("[ASSIGNED_OFFICE_DELETE]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
