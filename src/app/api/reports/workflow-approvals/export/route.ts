import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    const ownerAdminId = session?.user?.ownerAdminId ?? session?.user?.id;
    if (!ownerAdminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvals = await prisma.leadWorkflowApproval.findMany({
      where: {
        status: "Pending"
      },
      include: {
        lead: true
      },
      orderBy: { requestedAt: 'desc' }
    });

    const csvRows = [];
    // Header
    csvRows.push(["Lead Name", "Lead Code", "Request Type", "Status", "Requested By", "Created At"]);

    for (const app of approvals) {
      csvRows.push([
        `"${app.lead ? `${app.lead.firstName} ${app.lead.lastName || ''}`.trim() : ''}"`,
        `"${app.lead?.leadCode || ''}"`,
        `"${app.requestType}"`,
        `"${app.status}"`,
        `"${app.requestedBy}"`,
        `"${app.requestedAt.toISOString()}"`
      ]);
    }

    const csvString = csvRows.map(row => row.join(",")).join("\n");

    return new NextResponse(csvString, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="workflow-approvals-export.csv"',
      },
    });

  } catch (error: any) {
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
