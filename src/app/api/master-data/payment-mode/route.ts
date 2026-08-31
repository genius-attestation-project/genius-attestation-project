import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/middleware/auth.middleware";

const normalizeName = (str: string) => str.replace(/\s+/g, "").toLowerCase();

/**
 * GET /api/master-data/payment-mode
 * List payment modes with search, status filter, pagination, and stats.
 * Also accepts plural slug (?slug=payment-modes) for backward compatibility
 * with RegistrationManager which calls /api/master-data/payment-modes.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission(
      "master_configuration.view",
      "/api/master-data/payment-mode"
    );
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || ""; // "Active" | "Inactive" | ""
    const activeOnly = searchParams.get("active") === "true"; // legacy compat
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") || "50"));
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where: any = {
      ownerAdminId,
      deletedAt: null,
    };

    // Status filtering
    if (activeOnly || statusFilter === "Active") {
      where.status = "Active";
    } else if (statusFilter === "Inactive") {
      where.status = "Inactive";
    }

    // Search
    if (query.trim()) {
      where.OR = [
        { paymentModeName: { contains: query.trim() } },
        { description: { contains: query.trim() } },
        { status: { contains: query.trim() } },
      ];
    }

    // Fetch records + total
    const [items, total] = await Promise.all([
      prisma.paymentMode.findMany({
        where,
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        skip,
        take: pageSize,
      }),
      prisma.paymentMode.count({ where }),
    ]);

    // Statistics (ignoring search filter for full counts)
    const statsWhere = { ownerAdminId, deletedAt: null };
    const [activeCount, inactiveCount] = await Promise.all([
      prisma.paymentMode.count({ where: { ...statsWhere, status: "Active" } }),
      prisma.paymentMode.count({ where: { ...statsWhere, status: "Inactive" } }),
    ]);

    // Map to a consistent shape — expose both `paymentModeName` and `name` alias
    // so RegistrationManager (which maps `.name`) continues to work
    const mappedItems = items.map((item, idx) => ({
      ...item,
      name: item.paymentModeName, // alias for legacy consumers
      slNo: skip + idx + 1,
    }));

    return NextResponse.json({
      items: mappedItems,
      total,
      activeCount,
      inactiveCount,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (error: any) {
    console.error("[GET /api/master-data/payment-mode] Error:", error);
    return NextResponse.json(
      { message: "Failed to fetch payment modes." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/master-data/payment-mode
 * Create a new payment mode.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission(
      "master_configuration.view",
      "/api/master-data/payment-mode"
    );
    if (!session) {
      return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
    }
    const ownerAdminId = session.user.ownerAdminId!;
    const userId = session.user.id;
    const userName =
      (session.user as any).name ||
      (session.user as any).fullName ||
      session.user.email ||
      userId;

    const body = await request.json();
    const { paymentModeName, description, status, displayOrder } = body;

    const trimmedName = (paymentModeName || "").trim();
    if (!trimmedName) {
      return NextResponse.json(
        { message: "Payment Mode Name is required." },
        { status: 400 }
      );
    }
    if (trimmedName.length > 100) {
      return NextResponse.json(
        { message: "Payment Mode Name must be 100 characters or fewer." },
        { status: 400 }
      );
    }

    const validStatus = status === "Inactive" ? "Inactive" : "Active";

    // Duplicate check (case-insensitive, same owner)
    const existing = await prisma.paymentMode.findMany({
      where: { ownerAdminId, deletedAt: null },
      select: { paymentModeName: true },
    });
    const isDuplicate = existing.some(
      (r) => normalizeName(r.paymentModeName) === normalizeName(trimmedName)
    );
    if (isDuplicate) {
      return NextResponse.json(
        { message: "A Payment Mode with this name already exists." },
        { status: 409 }
      );
    }

    const newItem = await prisma.paymentMode.create({
      data: {
        paymentModeName: trimmedName,
        description: (description || "").trim() || null,
        status: validStatus,
        displayOrder: typeof displayOrder === "number" ? displayOrder : 0,
        ownerAdminId,
        createdBy: userName,
        updatedBy: userName,
      },
    });

    // Audit log
    await prisma.paymentModeAuditLog.create({
      data: {
        paymentModeId: newItem.id,
        action: "CREATED",
        performedBy: userId,
        performedByName: userName,
        details: `Payment Mode "${trimmedName}" created with status "${validStatus}".`,
        ownerAdminId,
      },
    });

    return NextResponse.json(
      { item: { ...newItem, name: newItem.paymentModeName } },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[POST /api/master-data/payment-mode] Error:", error);
    if (error.code === "P2002") {
      return NextResponse.json(
        { message: "A Payment Mode with this name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { message: "Failed to create payment mode." },
      { status: 500 }
    );
  }
}
