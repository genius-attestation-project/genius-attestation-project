import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");

    if (!leadId) {
      return NextResponse.json({ error: "Missing leadId" }, { status: 400 });
    }

    const logs = await prisma.approvalAuditLog.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      include: {
        workflowApproval: {
          select: { requestType: true }
        }
      }
    });

    const userIds = Array.from(new Set(logs.map(log => log.performedBy)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    });
    
    const userMap = new Map(users.map(u => [u.id, u.name || u.email || "Unknown User"]));

    const items = logs.map(log => ({
      id: log.id,
      requestType: log.workflowApproval?.requestType || "UNKNOWN",
      action: log.action,
      actorId: log.performedBy,
      actorName: userMap.get(log.performedBy) || "Unknown User",
      remarks: log.remarks,
      createdAt: log.createdAt
    }));

    return NextResponse.json({ items });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to fetch audit logs" }, { status: 500 });
  }
}
