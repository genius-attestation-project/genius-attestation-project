import { ApprovalRequestType, LeadStatus, WorkflowApprovalStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/features/notifications/server/notification.service";
import { hasPermission, hasOfficeAccess } from "@/features/admin/server/rbac.service";

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export async function createLobWorkflowRequest(args: {
  leadId: string;
  requestedBy: string;
  reason?: string;
  ownerAdminId: string;
}) {
  const trimmedReason = args.reason?.trim();
  if (!trimmedReason) {
    throw new Error("Reason is required to request LOB approval.");
  }

  const lead = await prisma.lead.findUnique({
    where: { id: args.leadId },
  });
  if (!lead) {
    throw new Error("Lead not found.");
  }

  const requester = await prisma.user.findFirst({
    where: { id: args.requestedBy },
    include: {
      role: { select: { name: true } },
      officeLocationRef: { select: { officeName: true } },
      supervisorRef: { select: { id: true, name: true, email: true } },
    },
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
    throw new Error("A pending LOB request already exists for this lead.");
  }

  const leadFullName = `${lead.firstName} ${lead.lastName || ""}`.trim();
  const requesterRole = requester.role?.name || "Staff";
  const requesterOffice = requester.officeLocationName || requester.officeLocationRef?.officeName || "N/A";
  const supervisorName = requester.supervisorRef?.name || "Supervisor";

  const approval = await prisma.leadWorkflowApproval.create({
    data: {
      leadId: args.leadId,
      requestType: ApprovalRequestType.LOB_REQUEST,
      requestedBy: args.requestedBy,
      supervisorId: requester.supervisorUserId,
      status: WorkflowApprovalStatus.Pending,
      approvalRemarks: trimmedReason,
      ownerAdminId: args.ownerAdminId,
      metadata: {
        leadId: lead.id,
        leadName: leadFullName,
        leadCode: lead.leadCode,
        currentStatus: lead.leadStatus,
        requestedStatus: "LOB",
        reason: trimmedReason,
        requestedById: requester.id,
        requestedByName: requester.name || requester.email,
        requestedByEmail: requester.email,
        requestedByRole: requesterRole,
        requestedByOffice: requesterOffice,
        supervisorId: requester.supervisorUserId,
        supervisorName: supervisorName,
        createdAt: new Date().toISOString(),
        status: "Pending",
      },
    },
  });

  await prisma.approvalAuditLog.create({
    data: {
      approvalId: approval.id,
      leadId: args.leadId,
      action: "Created",
      performedBy: args.requestedBy,
      ownerAdminId: args.ownerAdminId,
      remarks: `LOB Request Created: ${trimmedReason}`,
    },
  });

  await createNotification({
    userId: requester.supervisorUserId,
    title: "LOB Approval Request",
    message: `A new LOB approval request for lead ${lead.leadCode} (${leadFullName}) is pending your review.`,
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
  const approvals = await prisma.leadWorkflowApproval.findMany({
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

  const userIds = Array.from(new Set(approvals.map((a) => a.requestedBy).filter(Boolean))) as string[];
  const users = userIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          role: { select: { name: true } },
          officeLocationName: true,
          officeLocationRef: { select: { officeName: true } },
        },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return approvals.map((app) => {
    const u = app.requestedBy ? userMap.get(app.requestedBy) : null;
    const meta = (app.metadata as any) || {};
    return {
      ...app,
      requester: u
        ? {
            id: u.id,
            name: u.name || u.email,
            email: u.email,
            role: u.role?.name || meta.requestedByRole || "Staff",
            office: u.officeLocationName || u.officeLocationRef?.officeName || meta.requestedByOffice || "N/A",
          }
        : {
            id: app.requestedBy,
            name: meta.requestedByName || app.requestedBy,
            email: meta.requestedByEmail || "",
            role: meta.requestedByRole || "Staff",
            office: meta.requestedByOffice || "N/A",
          },
      reason: meta.reason || app.approvalRemarks || "",
      currentStatus: meta.currentStatus || app.lead?.leadStatus || "New",
      requestedStatus: meta.requestedStatus || "LOB",
    };
  });
}

export async function actionLobRequest(args: {
  approvalId: string;
  action: WorkflowApprovalStatus;
  performedBy: string;
  remarks?: string;
  ownerAdminId: string;
  userAccess?: any;
}) {
  const approval = await prisma.leadWorkflowApproval.findUnique({
    where: { id: args.approvalId },
    include: { lead: true },
  });

  if (!approval || approval.status !== WorkflowApprovalStatus.Pending) {
    throw new Error("Invalid or already processed approval request.");
  }

  // Authorization check
  if (args.userAccess) {
    const isSuperAdmin = Boolean(args.userAccess.isSuperAdmin);
    const hasApproveAll = hasPermission(args.userAccess, "lobApproval.approve_all");
    const hasApproveAssigned = hasPermission(args.userAccess, "lobApproval.approve_assigned_users");

    if (!isSuperAdmin) {
      if (hasApproveAll) {
        if (args.userAccess.allowedOfficeIds && args.userAccess.allowedOfficeIds.length > 0 && approval.requestedBy) {
          const requesterUser = await prisma.user.findUnique({
            where: { id: approval.requestedBy },
            select: { officeLocationId: true },
          });
          if (requesterUser?.officeLocationId) {
            const allowed = hasOfficeAccess(args.userAccess, requesterUser.officeLocationId, "lobApproval");
            if (!allowed) {
              throw new Error("Forbidden. You do not have office access to this lead's LOB request.");
            }
          }
        }
      } else if (hasApproveAssigned) {
        const requester = approval.requestedBy
          ? await prisma.user.findUnique({
              where: { id: approval.requestedBy },
              select: { supervisorUserId: true },
            })
          : null;
        const isSupervisor =
          approval.supervisorId === args.performedBy ||
          requester?.supervisorUserId === args.performedBy;
        if (!isSupervisor) {
          throw new Error("Forbidden. You can only approve or reject LOB requests for users assigned to you.");
        }
      } else {
        throw new Error("Forbidden. You do not have permission to approve or reject LOB requests.");
      }
    }
  }

  const now = new Date();

  await prisma.$transaction(
    async (tx) => {
    // Re-verify approval status inside transaction to prevent duplicate actions / race conditions
    const currentApproval = await tx.leadWorkflowApproval.findUnique({
      where: { id: args.approvalId },
      select: { status: true, leadId: true, approvalRemarks: true },
    });

    if (!currentApproval || currentApproval.status !== WorkflowApprovalStatus.Pending) {
      throw new Error("Invalid or already processed approval request.");
    }

    // Re-verify lead state inside transaction
    const currentLead = await tx.lead.findUnique({
      where: { id: currentApproval.leadId },
    });

    if (!currentLead) {
      throw new Error("Lead not found.");
    }

    // Update approval
    await tx.leadWorkflowApproval.update({
      where: { id: args.approvalId },
      data: {
        status: args.action,
        approvedBy: args.performedBy,
        approvedAt: now,
        approvalRemarks:
          args.action === WorkflowApprovalStatus.Approved
            ? args.remarks || currentApproval.approvalRemarks
            : currentApproval.approvalRemarks,
        rejectRemarks: args.action === WorkflowApprovalStatus.Rejected ? args.remarks : null,
        returnRemarks: args.action === WorkflowApprovalStatus.Returned ? args.remarks : null,
      },
    });

    // Update lead if approved
    if (args.action === WorkflowApprovalStatus.Approved) {
      await tx.lead.update({
        where: { id: currentApproval.leadId },
        data: { leadStatus: LeadStatus.LOB },
      });

      await tx.leadStatusHistory.create({
        data: {
          leadId: currentApproval.leadId,
          previousStatus: currentLead.leadStatus,
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
        remarks:
          args.remarks ||
          (args.action === WorkflowApprovalStatus.Approved
            ? "LOB Request Approved"
            : "LOB Request Rejected"),
        ownerAdminId: args.ownerAdminId,
      },
    });
  },
  { maxWait: 15000, timeout: 30000 }
  );

  // Notify requester
  if (approval.requestedBy) {
    await createNotification({
      userId: approval.requestedBy,
      title: `LOB Request ${args.action}`,
      message: `Your LOB request for lead ${approval.lead?.leadCode || "Lead"} was ${args.action.toLowerCase()}.${args.remarks ? ` Remarks: ${args.remarks}` : ""}`,
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
