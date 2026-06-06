import { LeadStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  LeadApprovalHistoryResponse,
  LeadApprovalItem,
  LeadApprovalStats,
} from "@/features/lead/types/lead-approval.types";

const approvalRequiredStatuses = new Set<LeadStatus>([
  LeadStatus.Potential_Qualified,
  LeadStatus.Closed,
]);

type LeadApprovalRow = {
  id: string;
  leadId: string;
  leadCode: string;
  leadName: string;
  mobile: string;
  service: string;
  currentStatus: LeadStatus;
  requestedStatus: LeadStatus;
  requestedBy: string;
  supervisorId: string;
  approvalStatus: string;
  approvalReason: string | null;
  rejectionReason: string | null;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
  country: string | null;
  email: string;
  assignedUser: string | null;
  remark: string | null;
};

function formatLeadStatus(status: LeadStatus) {
  if (status === LeadStatus.Pending_Approval) return "Pending Approval";
  if (status === LeadStatus.Potential_Qualified) return "Potential Qualified";
  return status;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function endOfToday() {
  const value = startOfToday();
  value.setDate(value.getDate() + 1);
  return value;
}

async function mapApprovalItems(rows: LeadApprovalRow[]) {
  const userIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.requestedBy, row.supervisorId, row.approvedBy])
        .filter((value): value is string => Boolean(value)),
    ),
  );

  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];

  const userMap = new Map(
    users.map((user) => [user.id, user.name?.trim() || user.email]),
  );

  return rows.map<LeadApprovalItem>((row) => ({
    id: row.id,
    leadId: row.leadId,
    leadCode: row.leadCode,
    leadName: row.leadName,
    mobile: row.mobile,
    service: row.service,
    currentStatus: formatLeadStatus(row.currentStatus),
    requestedStatus: formatLeadStatus(row.requestedStatus),
    requestedBy: userMap.get(row.requestedBy) ?? row.requestedBy,
    supervisorName: userMap.get(row.supervisorId) ?? row.supervisorId,
    approvalStatus: row.approvalStatus as LeadApprovalItem["approvalStatus"],
    approvalReason: row.approvalReason,
    rejectionReason: row.rejectionReason,
    approvedBy: row.approvedBy ? userMap.get(row.approvedBy) ?? row.approvedBy : null,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    requestDate: formatDate(row.createdAt),
    createdAt: row.createdAt.toISOString(),
    country: row.country ?? "-",
    email: row.email,
    assignedUser: row.assignedUser ?? "-",
    remark: row.remark ?? "-",
  }));
}

async function findApprovalRows(where: Prisma.LeadStatusApprovalWhereInput) {
  const approvals = await prisma.leadStatusApproval.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
    include: {
      lead: {
        select: {
          id: true,
          leadCode: true,
          firstName: true,
          lastName: true,
          mobileNumber: true,
          countryCode: true,
          service: true,
          country: true,
          email: true,
          assignedUser: true,
          remark: true,
        },
      },
    },
  });

  return approvals.map<LeadApprovalRow>((approval) => ({
    id: approval.id,
    leadId: approval.leadId,
    leadCode: approval.lead.leadCode,
    leadName: [approval.lead.firstName, approval.lead.lastName].filter(Boolean).join(" "),
    mobile: `${approval.lead.countryCode} ${approval.lead.mobileNumber}`.trim(),
    service: approval.lead.service,
    currentStatus: approval.currentStatus,
    requestedStatus: approval.requestedStatus,
    requestedBy: approval.requestedBy,
    supervisorId: approval.supervisorId,
    approvalStatus: approval.approvalStatus,
    approvalReason: approval.approvalReason,
    rejectionReason: approval.rejectionReason,
    approvedBy: approval.approvedBy,
    approvedAt: approval.approvedAt,
    createdAt: approval.createdAt,
    country: approval.lead.country,
    email: approval.lead.email,
    assignedUser: approval.lead.assignedUser,
    remark: approval.lead.remark,
  }));
}

export function requiresLeadApproval(status: LeadStatus) {
  return approvalRequiredStatuses.has(status);
}

export async function createLeadApprovalRequest(args: {
  ownerAdminId: string;
  leadId: string;
  currentStatus: LeadStatus;
  requestedStatus: LeadStatus;
  requestedBy: string;
}) {
  const requester = await prisma.user.findFirst({
    where: {
      id: args.requestedBy,
      OR: [{ ownerAdminId: args.ownerAdminId }, { id: args.ownerAdminId }],
    },
    select: {
      id: true,
      supervisorUserId: true,
      name: true,
      email: true,
    },
  });

  if (!requester) {
    throw new Error("Requesting user not found.");
  }

  if (!requester.supervisorUserId) {
    throw new Error("Assign a supervisor to this user before requesting approval.");
  }

  const supervisor = await prisma.user.findFirst({
    where: {
      id: requester.supervisorUserId,
      isActive: true,
      OR: [{ ownerAdminId: args.ownerAdminId }, { id: args.ownerAdminId }],
    },
    select: { id: true, name: true, email: true },
  });

  if (!supervisor) {
    throw new Error("Supervisor not found.");
  }

  const existing = await prisma.leadStatusApproval.findFirst({
    where: {
      ownerAdminId: args.ownerAdminId,
      leadId: args.leadId,
      approvalStatus: "Pending",
    },
    select: { id: true },
  });

  const request = existing
    ? await prisma.leadStatusApproval.update({
        where: { id: existing.id },
        data: {
          currentStatus: args.currentStatus,
          requestedStatus: args.requestedStatus,
          requestedBy: args.requestedBy,
          supervisorId: supervisor.id,
          approvalReason: null,
          rejectionReason: null,
          approvedBy: null,
          approvedAt: null,
          createdAt: new Date(),
        },
      })
    : await prisma.leadStatusApproval.create({
        data: {
          leadId: args.leadId,
          currentStatus: args.currentStatus,
          requestedStatus: args.requestedStatus,
          requestedBy: args.requestedBy,
          supervisorId: supervisor.id,
          ownerAdminId: args.ownerAdminId,
        },
      });

  return {
    requestId: request.id,
    supervisorName: supervisor.name?.trim() || supervisor.email,
    notificationMessage: `Approval request sent to ${supervisor.name?.trim() || supervisor.email}.`,
  };
}

export async function listPendingLeadApprovals(ownerAdminId: string, supervisorId: string) {
  const rows = await findApprovalRows({
    ownerAdminId,
    supervisorId,
    approvalStatus: "Pending",
  });

  const items = await mapApprovalItems(rows);
  return items;
}

export async function listLeadApprovalHistory(
  ownerAdminId: string,
  supervisorId: string,
): Promise<LeadApprovalHistoryResponse> {
  const rows = await findApprovalRows({
    ownerAdminId,
    supervisorId,
    approvalStatus: { in: ["Approved", "Rejected"] },
  });

  const items = await mapApprovalItems(rows);
  const approved = items.filter((item) => item.approvalStatus === "Approved");
  const rejected = items.filter((item) => item.approvalStatus === "Rejected");

  const [pendingCount, approvedToday, rejectedToday, totalRequests] = await Promise.all([
    prisma.leadStatusApproval.count({
      where: {
        ownerAdminId,
        supervisorId,
        approvalStatus: "Pending",
      },
    }),
    prisma.leadStatusApproval.count({
      where: {
        ownerAdminId,
        supervisorId,
        approvalStatus: "Approved",
        approvedAt: {
          gte: startOfToday(),
          lt: endOfToday(),
        },
      },
    }),
    prisma.leadStatusApproval.count({
      where: {
        ownerAdminId,
        supervisorId,
        approvalStatus: "Rejected",
        approvedAt: {
          gte: startOfToday(),
          lt: endOfToday(),
        },
      },
    }),
    prisma.leadStatusApproval.count({
      where: {
        ownerAdminId,
        supervisorId,
      },
    }),
  ]);

  const stats: LeadApprovalStats = {
    pendingApprovals: pendingCount,
    approvedToday,
    rejectedToday,
    totalRequests,
  };

  return { approved, rejected, stats };
}

export async function approveLeadApproval(args: {
  ownerAdminId: string;
  approvalId: string;
  supervisorId: string;
  reason: string;
}) {
  const approval = await prisma.leadStatusApproval.findFirst({
    where: {
      id: args.approvalId,
      ownerAdminId: args.ownerAdminId,
      supervisorId: args.supervisorId,
      approvalStatus: "Pending",
    },
    select: {
      id: true,
      leadId: true,
      currentStatus: true,
      requestedStatus: true,
      requestedBy: true,
    },
  });

  if (!approval) {
    return null;
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.leadStatusApproval.update({
      where: { id: approval.id },
      data: {
        approvalStatus: "Approved",
        approvalReason: args.reason,
        rejectionReason: null,
        approvedBy: args.supervisorId,
        approvedAt: now,
      },
    }),
    prisma.lead.update({
      where: { id: approval.leadId },
      data: {
        leadStatus: approval.requestedStatus,
        closedAt: approval.requestedStatus === LeadStatus.Closed ? now : null,
      },
    }),
    prisma.leadStatusHistory.create({
      data: {
        leadId: approval.leadId,
        previousStatus: approval.currentStatus,
        newStatus: approval.requestedStatus,
        changedBy: args.supervisorId,
        ownerAdminId: args.ownerAdminId,
      },
    }),
  ]);

  const requester = await prisma.user.findUnique({
    where: { id: approval.requestedBy },
    select: { name: true, email: true },
  });

  return {
    notificationMessage: `Approval completed and requester ${requester?.name?.trim() || requester?.email || "user"} notified.`,
  };
}

export async function rejectLeadApproval(args: {
  ownerAdminId: string;
  approvalId: string;
  supervisorId: string;
  reason: string;
}) {
  const approval = await prisma.leadStatusApproval.findFirst({
    where: {
      id: args.approvalId,
      ownerAdminId: args.ownerAdminId,
      supervisorId: args.supervisorId,
      approvalStatus: "Pending",
    },
    select: {
      id: true,
      requestedBy: true,
    },
  });

  if (!approval) {
    return null;
  }

  const now = new Date();
  await prisma.leadStatusApproval.update({
    where: { id: approval.id },
    data: {
      approvalStatus: "Rejected",
      rejectionReason: args.reason,
      approvalReason: null,
      approvedBy: args.supervisorId,
      approvedAt: now,
    },
  });

  const requester = await prisma.user.findUnique({
    where: { id: approval.requestedBy },
    select: { name: true, email: true },
  });

  return {
    notificationMessage: `Request rejected and requester ${requester?.name?.trim() || requester?.email || "user"} notified.`,
  };
}

export async function getOwnerApprovalRequestCount(ownerAdminId: string) {
  return prisma.leadStatusApproval.count({
    where: {
      ownerAdminId,
      approvalStatus: "Pending",
    },
  });
}
