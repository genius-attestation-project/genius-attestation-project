import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiPermission } from "@/middleware/auth.middleware";
import { createAgencySchema } from "@/features/assigned-agencies/validations/agency.schema";
import bcrypt from "bcrypt";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const errorResponse = await requireApiPermission("assigned_agencies.view");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "10");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "All";
    const packageId = searchParams.get("package") || "All";

    const skip = (page - 1) * pageSize;

    const whereClause: any = {
      ownerAdminId,
      deletedAt: null,
    };

    if (search) {
      whereClause.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
      ];
    }

    if (status !== "All") {
      whereClause.isActive = status === "Active";
    }

    if (packageId !== "All") {
      whereClause.assignedPackages = {
        some: {
          processTypeId: packageId,
        },
      };
    }

    const [total, agencies] = await Promise.all([
      prisma.assignedAgency.count({ where: whereClause }),
      prisma.assignedAgency.findMany({
        where: whereClause,
        include: {
          assignedPackages: {
            include: {
              processType: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      items: agencies,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error) {
    console.error("[ASSIGNED_AGENCIES_GET]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const errorResponse = await requireApiPermission("assigned_agencies.create");
    if (errorResponse) return errorResponse;

    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    const userId = session?.user?.id;
    if (!ownerAdminId || !userId) return NextResponse.json({ message: "Unauthorized." }, { status: 401 });

    const body = await req.json();
    const parsed = createAgencySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid request body.", errors: parsed.error.format() }, { status: 400 });
    }

    const { username, email, password, assignedPackages, isActive } = parsed.data;

    // Check unique username and email in both User and AssignedAgency tables
    const [existingAgencyUsername, existingAgencyEmail, existingUserUsername, existingUserEmail] = await Promise.all([
      prisma.assignedAgency.findUnique({ where: { username } }),
      prisma.assignedAgency.findUnique({ where: { email } }),
      prisma.user.findUnique({ where: { email: username } }),
      prisma.user.findUnique({ where: { email } }),
    ]);

    if (existingAgencyUsername || existingUserUsername) {
      return NextResponse.json({ message: "Username is already taken." }, { status: 400 });
    }

    if (existingAgencyEmail || existingUserEmail) {
      return NextResponse.json({ message: "Email is already in use." }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const agency = await prisma.assignedAgency.create({
      data: {
        username,
        email,
        passwordHash,
        isActive,
        ownerAdminId,
        createdBy: userId,
        assignedPackages: {
          create: assignedPackages.map((id) => ({
            processTypeId: id,
          })),
        },
      },
    });

    return NextResponse.json(agency, { status: 201 });
  } catch (error) {
    console.error("[ASSIGNED_AGENCIES_POST]", error);
    return NextResponse.json({ message: "Internal server error." }, { status: 500 });
  }
}
