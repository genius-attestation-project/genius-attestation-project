import { ApprovalRequestType, LeadStatus, WorkflowApprovalStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/features/notifications/server/notification.service";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function createLobWorkflowRequest(args: {
  leadId: string;
  requestedBy: string;
  ownerAdminId: string;
}) {
  const requester = await prisma.user.findFirst({
    where: { id: args.requestedBy },
    select: { supervisorUserId: true },
  });

  if (!requester?.supervisorUserId) {
    throw new Error("Assign a supervisor to request LOB approval.");
  }

  // Check if pending request exists
  const existing = await prisma.leadWorkflowApproval.findFirst({
    where: {
      leadId: args.leadId,
      requestType: ApprovalRequestType.LOB_REQUEST,
      status: WorkflowApprovalStatus.Pending,
    },
  });

  if (existing) {
    throw new Error("A pending LOB request already exists.");
  }

  const approval = await prisma.leadWorkflowApproval.create({
    data: {
      leadId: args.leadId,
      requestType: ApprovalRequestType.LOB_REQUEST,
      requestedBy: args.requestedBy,
      supervisorId: requester.supervisorUserId,
      status: WorkflowApprovalStatus.Pending,
      ownerAdminId: args.ownerAdminId,
    },
  });

  await prisma.approvalAuditLog.create({
    data: {
      approvalId: approval.id,
      leadId: args.leadId,
      action: "Created",
      performedBy: args.requestedBy,
      ownerAdminId: args.ownerAdminId,
      remarks: "LOB Approval Requested",
    },
  });

  await createNotification({
    userId: requester.supervisorUserId,
    title: "LOB Approval Request",
    message: "A new LOB approval request is pending your review.",
    type: "APPROVAL",
    referenceId: approval.id,
    referenceType: "APPROVAL",
    ownerAdminId: args.ownerAdminId,
  });

  return approval;
}

export async function getInactiveLeads(ownerAdminId: string, supervisorId?: string) {
  const tenDaysAgo = new Date();
  tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const whereClause: Prisma.LeadWhereInput = {
    ownerAdminId,
    leadStatus: { notIn: [LeadStatus.Closed, LeadStatus.LOB] },
    updatedAt: { lt: tenDaysAgo },
  };

  // To properly support supervisor filtering without schema modification for `assignedUserRef`,
  // we filter users first.
  let assignedUserIds: string[] | undefined = undefined;
  if (supervisorId) {
    const users = await prisma.user.findMany({
      where: { supervisorUserId: supervisorId },
      select: { id: true },
    });
    assignedUserIds = users.map((u) => u.id);
    whereClause.assignedUserId = { in: assignedUserIds };
  }

  return prisma.lead.findMany({
    where: whereClause,
    include: {
      creator: { select: { name: true, email: true } },
    },
    orderBy: { updatedAt: "asc" },
  });
}

export async function getOverdueFollowups(ownerAdminId: string, supervisorId?: string) {
  const todayStart = startOfToday();

  const whereClause: Prisma.LeadWhereInput = {
    ownerAdminId,
    nextFollowupAt: { lt: todayStart },
    followupStatus: { not: "Completed" },
    leadStatus: { notIn: [LeadStatus.Closed, LeadStatus.LOB] },
  };

  let assignedUserIds: string[] | undefined = undefined;
  if (supervisorId) {
    const users = await prisma.user.findMany({
      where: { supervisorUserId: supervisorId },
      select: { id: true },
    });
    assignedUserIds = users.map((u) => u.id);
    whereClause.assignedUserId = { in: assignedUserIds };
  }

  return prisma.lead.findMany({
    where: whereClause,
    include: {
      creator: { select: { name: true, email: true } },
    },
    orderBy: { nextFollowupAt: "asc" },
  });
}

export async function getPendingLobRequests(ownerAdminId: string, supervisorId?: string) {
  return prisma.leadWorkflowApproval.findMany({
    where: {
      ownerAdminId,
      requestType: ApprovalRequestType.LOB_REQUEST,
      status: WorkflowApprovalStatus.Pending,
      ...(supervisorId ? { supervisorId } : {}),
    },
    include: {
      lead: true,
    },
    orderBy: { requestedAt: "desc" },
  });
}

export async function actionLobRequest(args: {
  approvalId: string;
  action: WorkflowApprovalStatus;
  performedBy: string;
  remarks?: string;
  ownerAdminId: string;
}) {
  const approval = await prisma.leadWorkflowApproval.findUnique({
    where: { id: args.approvalId },
    include: { lead: true },
  });

  if (!approval || approval.status !== WorkflowApprovalStatus.Pending) {
    throw new Error("Invalid or already processed approval request.");
  }

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Update approval
    await tx.leadWorkflowApproval.update({
      where: { id: args.approvalId },
      data: {
        status: args.action,
        approvedBy: args.performedBy,
        approvedAt: now,
        approvalRemarks: args.action === WorkflowApprovalStatus.Approved ? args.remarks : null,
        rejectRemarks: args.action === WorkflowApprovalStatus.Rejected ? args.remarks : null,
        returnRemarks: args.action === WorkflowApprovalStatus.Returned ? args.remarks : null,
      },
    });

    // Update lead if approved
    if (args.action === WorkflowApprovalStatus.Approved) {
      await tx.lead.update({
        where: { id: approval.leadId },
        data: { leadStatus: LeadStatus.LOB },
      });
      
      await tx.leadStatusHistory.create({
        data: {
          leadId: approval.leadId,
          previousStatus: approval.lead.leadStatus,
          newStatus: LeadStatus.LOB,
          changedBy: args.performedBy,
          ownerAdminId: args.ownerAdminId,
        },
      });
    }

    // Audit log
    await tx.approvalAuditLog.create({
      data: {
        approvalId: approval.id,
        leadId: approval.leadId,
        action: args.action,
        performedBy: args.performedBy,
        remarks: args.remarks,
        ownerAdminId: args.ownerAdminId,
      },
    });
  });

  // Notify requester
  if (approval.requestedBy) {
    await createNotification({
      userId: approval.requestedBy,
      title: `LOB Request ${args.action}`,
      message: `Your LOB request for lead ${approval.lead.leadCode} was ${args.action.toLowerCase()}.`,
      type: "APPROVAL",
      referenceId: approval.leadId,
      referenceType: "LEAD",
      ownerAdminId: args.ownerAdminId,
    });
  }
}

export async function actionInactiveLead(args: {
  leadId: string;
  action: WorkflowApprovalStatus; // Approved (Move to LOB), Rejected, Returned
  performedBy: string;
  remarks?: string;
  ownerAdminId: string;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: args.leadId } });
  if (!lead) throw new Error("Lead not found.");

  const now = new Date();

  // We create a one-off LeadWorkflowApproval to log the action
  const approval = await prisma.leadWorkflowApproval.create({
    data: {
      leadId: args.leadId,
      requestType: ApprovalRequestType.INACTIVE_LEAD,
      requestedBy: "SYSTEM",
      supervisorId: args.performedBy,
      status: args.action,
      approvedBy: args.performedBy,
      approvedAt: now,
      approvalRemarks: args.action === WorkflowApprovalStatus.Approved ? args.remarks : null,
      rejectRemarks: args.action === WorkflowApprovalStatus.Rejected ? args.remarks : null,
      returnRemarks: args.action === WorkflowApprovalStatus.Returned ? args.remarks : null,
      ownerAdminId: args.ownerAdminId,
    },
  });

  await prisma.$transaction(async (tx) => {
    // Audit log
    await tx.approvalAuditLog.create({
      data: {
        approvalId: approval.id,
        leadId: args.leadId,
        action: args.action,
        performedBy: args.performedBy,
        remarks: args.remarks,
        ownerAdminId: args.ownerAdminId,
      },
    });

    if (args.action === WorkflowApprovalStatus.Approved) {
      await tx.lead.update({
        where: { id: args.leadId },
        data: { leadStatus: LeadStatus.LOB, updatedAt: now },
      });
      await tx.leadStatusHistory.create({
        data: {
          leadId: args.leadId,
          previousStatus: lead.leadStatus,
          newStatus: LeadStatus.LOB,
          changedBy: args.performedBy,
          ownerAdminId: args.ownerAdminId,
        },
      });
    } else {
      // Just touch the updatedAt to drop it from the 10-days queue
      await tx.lead.update({
        where: { id: args.leadId },
        data: { updatedAt: now },
      });
    }
  });

  // Notifications
  if (lead.assignedUserId) {
    await createNotification({
      userId: lead.assignedUserId,
      title: `Inactive Lead Reviewed`,
      message: `Supervisor reviewed inactive lead ${lead.leadCode}. Result: ${args.action}.`,
      type: "SYSTEM",
      referenceId: lead.id,
      referenceType: "LEAD",
      ownerAdminId: args.ownerAdminId,
    });
  }
}

export async function actionOverdueFollowup(args: {
  leadId: string;
  action: WorkflowApprovalStatus; // Approved, Rejected, Returned
  performedBy: string;
  remarks?: string;
  ownerAdminId: string;
}) {
  const lead = await prisma.lead.findUnique({ where: { id: args.leadId } });
  if (!lead) throw new Error("Lead not found.");

  const now = new Date();

  // We create a one-off LeadWorkflowApproval to log the action
  const approval = await prisma.leadWorkflowApproval.create({
    data: {
      leadId: args.leadId,
      requestType: ApprovalRequestType.OVERDUE_FOLLOWUP,
      requestedBy: "SYSTEM",
      supervisorId: args.performedBy,
      status: args.action,
      approvedBy: args.performedBy,
      approvedAt: now,
      approvalRemarks: args.action === WorkflowApprovalStatus.Approved ? args.remarks : null,
      rejectRemarks: args.action === WorkflowApprovalStatus.Rejected ? args.remarks : null,
      returnRemarks: args.action === WorkflowApprovalStatus.Returned ? args.remarks : null,
      ownerAdminId: args.ownerAdminId,
    },
  });

  await prisma.$transaction(async (tx) => {
    // Audit log
    await tx.approvalAuditLog.create({
      data: {
        approvalId: approval.id,
        leadId: args.leadId,
        action: args.action,
        performedBy: args.performedBy,
        remarks: args.remarks,
        ownerAdminId: args.ownerAdminId,
      },
    });

    // We "unlock" the overdue followup by bumping nextFollowupAt to now
    // so it doesn't appear in overdue anymore. The assigned user must act today.
    await tx.lead.update({
      where: { id: args.leadId },
      data: { nextFollowupAt: now, followupNotified: false },
    });
  });

  if (lead.assignedUserId) {
    await createNotification({
      userId: lead.assignedUserId,
      title: `Overdue Followup Reviewed`,
      message: `Supervisor reviewed your overdue followup for ${lead.leadCode}. Result: ${args.action}.`,
      type: "SYSTEM",
      referenceId: lead.id,
      referenceType: "LEAD",
      ownerAdminId: args.ownerAdminId,
    });
  }
}
