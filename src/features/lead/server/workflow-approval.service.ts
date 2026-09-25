import { ApprovalRequestType, FollowupStatus, LeadStatus, WorkflowApprovalStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/features/notifications/server/notification.service";
import { hasPermission, hasOfficeAccess } from "@/features/admin/server/rbac.service";
import { lockUsersWithMissedFollowups, clearLockCacheForUser } from "./followup-lock.service";

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
  // Synchronize lock state detection
  await lockUsersWithMissedFollowups(ownerAdminId);

  const todayStart = startOfToday();

  const whereClause: Prisma.LeadWhereInput = {
    ...(ownerAdminId ? { ownerAdminId } : {}),
    nextFollowupAt: { lt: todayStart },
    followupCompleted: false,
    NOT: [
      { followupStatus: FollowupStatus.Completed },
      { leadStatus: { in: [LeadStatus.Closed, LeadStatus.LOB] } },
    ],
  };

  if (supervisorId) {
    const users = await prisma.user.findMany({
      where: { supervisorUserId: supervisorId },
      select: { id: true },
    });
    const supervisedUserIds = users.map((u) => u.id);
    whereClause.OR = [
      { assignedUserId: { in: supervisedUserIds } },
      { createdById: { in: supervisedUserIds } },
    ];
  }

  const leads = await prisma.lead.findMany({
    where: whereClause,
    include: {
      creator: { select: { id: true, name: true, email: true } },
    },
    orderBy: [{ nextFollowupAt: "asc" }, { updatedAt: "asc" }],
  });

  const missingUserIds = Array.from(
    new Set(
      leads
        .filter((l) => !l.assignedUser?.trim() && (l.assignedUserId || l.createdById))
        .map((l) => l.assignedUserId || l.createdById)
        .filter((id): id is string => Boolean(id))
    )
  );

  const userMap = new Map<string, string>();
  if (missingUserIds.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: missingUserIds } },
      select: { id: true, name: true, email: true },
    });
    for (const u of users) {
      userMap.set(u.id, u.name?.trim() || u.email);
    }
  }

  return leads.map((lead) => {
    const assignedName =
      lead.assignedUser?.trim() ||
      (lead.assignedUserId ? userMap.get(lead.assignedUserId) : null) ||
      (lead.createdById ? userMap.get(lead.createdById) : null) ||
      lead.creator?.name?.trim() ||
      lead.creator?.email ||
      "Unassigned";

    return {
      ...lead,
      assignedUser: assignedName,
    };
  });
}

export async function getPendingLobRequests(
  params:
    | {
        ownerAdminId: string;
        supervisorId?: string;
        isSuperAdmin?: boolean;
        hasApproveAll?: boolean;
        allowedOfficeIds?: string[] | null;
      }
    | string,
  maybeSupervisorId?: string,
) {
  let ownerAdminId: string;
  let supervisorId: string | undefined;
  let isSuperAdmin = false;
  let hasApproveAll = false;
  let allowedOfficeIds: string[] | null | undefined = undefined;

  if (typeof params === "string") {
    ownerAdminId = params;
    supervisorId = maybeSupervisorId;
  } else {
    ownerAdminId = params.ownerAdminId;
    supervisorId = params.supervisorId;
    isSuperAdmin = Boolean(params.isSuperAdmin);
    hasApproveAll = Boolean(params.hasApproveAll);
    allowedOfficeIds = params.allowedOfficeIds;
  }

  // If user is not super admin and does not have approve_all, and allowedOfficeIds is empty -> return []
  if (!isSuperAdmin && !hasApproveAll && Array.isArray(allowedOfficeIds) && allowedOfficeIds.length === 0) {
    return [];
  }

  const whereClause: Prisma.LeadWorkflowApprovalWhereInput = {
    ownerAdminId,
    requestType: ApprovalRequestType.LOB_REQUEST,
    status: WorkflowApprovalStatus.Pending,
    ...(supervisorId ? { supervisorId } : {}),
  };

  // Office scoping when not super admin and not global approval
  if (!isSuperAdmin && !hasApproveAll && Array.isArray(allowedOfficeIds) && allowedOfficeIds.length > 0) {
    const requesterUsersInOffices = await prisma.user.findMany({
      where: {
        officeLocationId: { in: allowedOfficeIds },
        OR: [{ ownerAdminId }, { id: ownerAdminId }],
      },
      select: { id: true },
    });
    const requesterUserIds = requesterUsersInOffices.map((u) => u.id);

    whereClause.OR = [
      {
        lead: {
          creator: {
            officeLocationId: { in: allowedOfficeIds },
          },
        },
      },
      ...(requesterUserIds.length > 0
        ? [
            {
              requestedBy: { in: requesterUserIds },
            },
          ]
        : []),
    ];
  }

  const approvals = await prisma.leadWorkflowApproval.findMany({
    where: whereClause,
    include: {
      lead: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              officeLocationId: true,
              officeLocationName: true,
              officeLocationRef: { select: { id: true, officeName: true } },
            },
          },
        },
      },
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
          officeLocationId: true,
          officeLocationName: true,
          officeLocationRef: { select: { id: true, officeName: true } },
        },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return approvals.map((app) => {
    const u = app.requestedBy ? userMap.get(app.requestedBy) : null;
    const meta = (app.metadata as any) || {};
    const leadOffice =
      app.lead?.creator?.officeLocationRef?.officeName ||
      app.lead?.creator?.officeLocationName ||
      u?.officeLocationRef?.officeName ||
      u?.officeLocationName ||
      meta.requestedByOffice ||
      "N/A";

    return {
      ...app,
      requester: u
        ? {
            id: u.id,
            name: u.name || u.email,
            email: u.email,
            role: u.role?.name || meta.requestedByRole || "Staff",
            office: leadOffice,
          }
        : {
            id: app.requestedBy,
            name: meta.requestedByName || app.requestedBy,
            email: meta.requestedByEmail || "",
            role: meta.requestedByRole || "Staff",
            office: leadOffice,
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
    include: {
      lead: {
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              officeLocationId: true,
              officeLocationName: true,
              officeLocationRef: { select: { id: true, officeName: true } },
            },
          },
        },
      },
    },
  });

  if (!approval || approval.status !== WorkflowApprovalStatus.Pending) {
    throw new Error("Invalid or already processed approval request.");
  }

  const actionKey =
    args.action === WorkflowApprovalStatus.Approved
      ? "approve"
      : args.action === WorkflowApprovalStatus.Rejected
      ? "reject"
      : "return";

  // Authorization check
  if (args.userAccess) {
    const isSuperAdmin = Boolean(args.userAccess.isSuperAdmin);
    const hasApproveAll = hasPermission(args.userAccess, "lobApproval.approve_all");
    const hasApproveAssigned = hasPermission(args.userAccess, "lobApproval.approve_assigned_users");
    const hasActionPerm =
      hasPermission(args.userAccess, `lobApproval.${actionKey}`) ||
      (actionKey === "approve" && hasPermission(args.userAccess, "lobApproval.approve"));

    if (!isSuperAdmin) {
      if (hasApproveAll) {
        // Global approval scope -> completely bypasses Pending Approval Office Visibility!
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
      } else if (hasActionPerm) {
        // Normal Action (Approve / Reject / Return) -> Restricted strictly by Pending Approval Office Visibility!
        let requestOfficeId = approval.lead?.creator?.officeLocationId;
        if (!requestOfficeId && approval.requestedBy) {
          const requesterUser = await prisma.user.findUnique({
            where: { id: approval.requestedBy },
            select: { officeLocationId: true },
          });
          requestOfficeId = requesterUser?.officeLocationId || null;
        }

        const authorizedOfficeIds =
          args.userAccess.moduleOfficeVisibilities?.["pending_approval"]?.officeIds ??
          args.userAccess.allowedOfficeIds ??
          [];

        if (
          !Array.isArray(authorizedOfficeIds) ||
          authorizedOfficeIds.length === 0 ||
          !requestOfficeId ||
          !authorizedOfficeIds.includes(requestOfficeId)
        ) {
          throw new Error("Forbidden. You do not have office access to this LOB request.");
        }
      } else {
        throw new Error(`Forbidden. You do not have permission to ${actionKey} LOB requests.`);
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

  const targetUserIds = Array.from(
    new Set([lead.assignedUserId, lead.createdById].filter((id): id is string => Boolean(id)))
  );

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

    // Unlock the affected user(s) who were locked for this overdue followup
    const unlockWhere: Prisma.UserWhereInput = {
      isLocked: true,
      OR: [
        { lockedFollowupLeadId: args.leadId },
        ...(targetUserIds.length > 0 ? [{ id: { in: targetUserIds } }] : []),
      ],
    };

    const lockedUsers = await tx.user.findMany({
      where: unlockWhere,
      select: { id: true },
    });

    if (lockedUsers.length > 0) {
      await tx.user.updateMany({
        where: { id: { in: lockedUsers.map((u) => u.id) } },
        data: {
          isLocked: false,
          lockReason: null,
          lockedAt: null,
          lockedFollowupLeadId: null,
          lockedFollowupAt: null,
          unlockedBy: args.performedBy,
          unlockReason:
            args.remarks?.trim() ||
            (args.action === WorkflowApprovalStatus.Approved
              ? "Overdue follow-up unlocked by supervisor"
              : "Overdue follow-up returned by supervisor"),
          unlockedAt: now,
        },
      });
    }
  });

  // Invalidate memory lock cache for unlocked users
  for (const uid of targetUserIds) {
    clearLockCacheForUser(uid, args.ownerAdminId);
  }

  const notifyUserId = lead.assignedUserId ?? lead.createdById;
  if (notifyUserId) {
    await createNotification({
      userId: notifyUserId,
      title: `Overdue Followup Reviewed`,
      message: `Supervisor reviewed your overdue followup for ${lead.leadCode}. Result: ${args.action}. Account access restored.`,
      type: "SYSTEM",
      referenceId: lead.id,
      referenceType: "LEAD",
      ownerAdminId: args.ownerAdminId,
    });
  }
}
