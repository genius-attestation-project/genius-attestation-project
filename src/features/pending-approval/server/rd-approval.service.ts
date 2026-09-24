import { prisma } from "@/lib/prisma";

export interface CreateRDApprovalParams {
  trackingNumbers: string[];
  userId: string;
  userName?: string;
  ownerAdminId: string;
  remarks?: string;
}

export interface ListRDApprovalParams {
  ownerAdminId: string;
  officeId?: string;
  officeName?: string;
  status?: string;
  search?: string;
  allowedOfficeNames?: string[] | null;
  allowedOfficeIds?: string[] | null;
  isSuperAdmin?: boolean;
}

export interface ApproveRDApprovalParams {
  id: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
  approvalRemarks?: string;
  allowedOfficeNames?: string[] | null;
  allowedOfficeIds?: string[] | null;
  isSuperAdmin?: boolean;
}

export interface RejectRDApprovalParams {
  id: string;
  userId: string;
  userName?: string;
  ownerAdminId: string;
  rejectionReason: string;
  allowedOfficeNames?: string[] | null;
  allowedOfficeIds?: string[] | null;
  isSuperAdmin?: boolean;
}

/**
 * Creates RD Approval request(s) for selected tracking number(s).
 * Does NOT move documents to Ready For Delivery directly.
 * Main/Sub Process completion does NOT block this request creation.
 */
export async function createRDApprovalRequest(params: CreateRDApprovalParams) {
  if (!params.trackingNumbers || params.trackingNumbers.length === 0) {
    throw new Error("At least one tracking number must be selected.");
  }

  const results: {
    createdRequests: { trackingNumber: string; deliveryLocation: string; id: string }[];
    rejectedDocuments: { trackingNumber: string; reason: string }[];
  } = {
    createdRequests: [],
    rejectedDocuments: [],
  };

  const db = prisma as any;

  for (const trackingNumber of params.trackingNumbers) {
    try {
      await db.$transaction(async (tx: any) => {
        const reg = await tx.registration.findFirst({
          where: {
            trackingNumber,
            ownerAdminId: params.ownerAdminId,
          },
          include: {
            documentMovements: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { currentOffice: true },
            },
          },
        });

        if (!reg) {
          results.rejectedDocuments.push({
            trackingNumber,
            reason: "Document record not found.",
          });
          return;
        }

        // Check if already delivered
        if (
          reg.trackingStatus === "Delivered" ||
          reg.deliveryStatus === "Delivered" ||
          reg.documentMovements?.[0]?.currentStatus === "Delivered"
        ) {
          results.rejectedDocuments.push({
            trackingNumber,
            reason: "Document is already delivered.",
          });
          return;
        }

        // Validate Delivery Location
        const deliveryLocation = (reg.deliveryLocation || "").trim();
        if (
          !deliveryLocation ||
          deliveryLocation === "-" ||
          deliveryLocation.toLowerCase() === "unassigned"
        ) {
          results.rejectedDocuments.push({
            trackingNumber,
            reason: "Document does not have a valid Delivery Location configured.",
          });
          return;
        }

        // Check for existing pending RD Approval request
        const existingPending = await tx.rDApproval.findFirst({
          where: {
            trackingNumber,
            ownerAdminId: params.ownerAdminId,
            status: "Pending",
          },
        });

        if (existingPending) {
          results.rejectedDocuments.push({
            trackingNumber,
            reason: "An RD Approval request is already pending for this document.",
          });
          return;
        }

        // Resolve delivery location to office record if available
        let deliveryOffice = await tx.officeLocation.findFirst({
          where: {
            ownerAdminId: params.ownerAdminId,
            OR: [
              { id: deliveryLocation },
              { officeName: deliveryLocation },
            ],
          },
          select: { id: true, officeName: true },
        });

        if (!deliveryOffice) {
          const ao = await tx.assignedOffice.findFirst({
            where: {
              ownerAdminId: params.ownerAdminId,
              OR: [
                { id: deliveryLocation },
                { username: deliveryLocation },
              ],
            },
            select: { id: true, username: true },
          });
          if (ao) {
            deliveryOffice = { id: ao.id, officeName: ao.username };
          }
        }

        const destinationOfficeName = deliveryOffice?.officeName || deliveryLocation;
        const currentOfficeName =
          reg.documentMovements?.[0]?.currentOffice?.officeName ||
          reg.regionOfRegistration ||
          "-";

        const newApproval = await tx.rDApproval.create({
          data: {
            registrationId: reg.id,
            trackingNumber: reg.trackingNumber,
            customerName: reg.customerName || "-",
            documentName: reg.documentName || "-",
            documentType: reg.documentType || "-",
            processType: reg.processType || "-",
            registrationOffice: reg.regionOfRegistration || "-",
            currentOffice: currentOfficeName,
            deliveryLocation: destinationOfficeName,
            status: "Pending",
            requestedById: params.userId,
            requestedByName: params.userName || "System User",
            requestedDate: new Date(),
            remarks: params.remarks || `RD Approval requested for delivery to ${destinationOfficeName}`,
            ownerAdminId: params.ownerAdminId,
          },
        });

        // Create audit log and history for request creation
        if (tx.auditTrail) {
          await tx.auditTrail.create({
            data: {
              registrationId: reg.id,
              action: "RD_APPROVAL_REQUESTED",
              performedBy: params.userName || params.userId,
              description: params.remarks || `RD Approval requested for delivery to ${destinationOfficeName}. Request ID: ${newApproval.id}`,
            },
          });
        }

        if (tx.documentWorkflowHistory) {
          await tx.documentWorkflowHistory.create({
            data: {
              documentId: reg.id,
              trackingNumber: reg.trackingNumber,
              workflowStep: "RD Approval Requested",
              status: "Pending RD Approval",
              performedBy: params.userName || params.userId,
              remarks: params.remarks || `RD Approval requested for delivery to ${destinationOfficeName}`,
              ownerAdminId: params.ownerAdminId,
            },
          });
        }

        results.createdRequests.push({
          id: newApproval.id,
          trackingNumber: reg.trackingNumber,
          deliveryLocation: destinationOfficeName,
        });
      }, { timeout: 20000 });
    } catch (err: any) {
      results.rejectedDocuments.push({
        trackingNumber,
        reason: err.message || "Unexpected error while creating RD approval request.",
      });
    }
  }

  return {
    success: results.createdRequests.length > 0,
    total: params.trackingNumbers.length,
    successCount: results.createdRequests.length,
    rejectedCount: results.rejectedDocuments.length,
    createdRequests: results.createdRequests,
    rejectedDocuments: results.rejectedDocuments,
  };
}

/**
 * Lists RD Approvals filtered by office visibility on Delivery Location.
 */
export async function listRDApprovals(params: ListRDApprovalParams) {
  const {
    ownerAdminId,
    status = "Pending",
    search,
    allowedOfficeNames,
    allowedOfficeIds,
    isSuperAdmin,
    officeId,
    officeName,
  } = params;

  const db = prisma as any;

  const whereClause: any = {
    ownerAdminId,
  };

  if (status && status !== "ALL" && status !== "all") {
    whereClause.status = status;
  }

  const items = await db.rDApproval.findMany({
    where: whereClause,
    include: {
      registration: {
        select: {
          id: true,
          trackingNumber: true,
          customerName: true,
          documentName: true,
          documentType: true,
          processType: true,
          regionOfRegistration: true,
          deliveryLocation: true,
          trackingStatus: true,
          advancePaid: true,
          totalCharges: true,
          mobile: true,
          documentMovements: {
            take: 1,
            orderBy: { createdAt: "desc" },
            include: {
              currentOffice: true,
            },
          },
        },
      },
    },
    orderBy: { requestedDate: "desc" },
  });

  // Map and resolve office locations
  const allOffices = await db.officeLocation.findMany({
    where: { ownerAdminId },
    select: { id: true, officeName: true },
  });
  const officeIdToName = new Map<string, string>();
  const officeNameToId = new Map<string, string>();
  for (const off of allOffices) {
    if (off.id && off.officeName) {
      officeIdToName.set(off.id, off.officeName);
      officeNameToId.set(off.officeName.toLowerCase(), off.id);
    }
  }

  let mapped = items.map((item: any) => {
    const reg = item.registration;
    const currentMov = reg?.documentMovements?.[0];
    const currentOfficeName =
      currentMov?.currentOffice?.officeName ||
      reg?.regionOfRegistration ||
      item.currentOffice ||
      "-";
    const currentOfficeId = currentMov?.currentOfficeId || currentMov?.currentOffice?.id || null;

    const deliveryLoc = item.deliveryLocation || reg?.deliveryLocation || "-";
    let deliveryOfficeId = officeNameToId.get(deliveryLoc.toLowerCase()) || null;
    let deliveryOfficeName = deliveryLoc;
    if (!deliveryOfficeId && officeIdToName.has(deliveryLoc)) {
      deliveryOfficeId = deliveryLoc;
      deliveryOfficeName = officeIdToName.get(deliveryLoc) || deliveryLoc;
    }

    return {
      id: item.id,
      registrationId: item.registrationId,
      trackingNumber: item.trackingNumber,
      customerName: item.customerName || reg?.customerName || "-",
      documentName: item.documentName || reg?.documentName || "-",
      documentType: item.documentType || reg?.documentType || "-",
      processType: item.processType || reg?.processType || "-",
      registrationOffice: item.registrationOffice || reg?.regionOfRegistration || "-",
      currentOffice: currentOfficeName,
      currentOfficeId,
      deliveryLocation: deliveryOfficeName,
      deliveryOfficeId,
      status: item.status,
      remarks: item.remarks || "",
      approvalRemarks: item.approvalRemarks || null,
      requestedBy: item.requestedByName || "System User",
      requestedById: item.requestedById,
      requestedDate: item.requestedDate ? item.requestedDate.toISOString() : new Date().toISOString(),
      approvedBy: item.approvedByName || null,
      approvedAt: item.approvedAt ? item.approvedAt.toISOString() : null,
      rejectedBy: item.rejectedByName || null,
      rejectedAt: item.rejectedAt ? item.rejectedAt.toISOString() : null,
      rejectionReason: item.rejectionReason || null,
      mobile: reg?.mobile || "-",
      currentWorkflowStatus: reg?.trackingStatus || currentMov?.status || "-",
    };
  });

  // Enforce Office Visibility Access on Delivery Location
  if (!isSuperAdmin && allowedOfficeNames !== undefined && allowedOfficeNames !== null) {
    if (allowedOfficeNames.length === 0 && (!allowedOfficeIds || allowedOfficeIds.length === 0)) {
      return [];
    }

    const permittedNames = allowedOfficeNames.map((n) => n.trim().toLowerCase());
    const permittedIds = (allowedOfficeIds || []).map((id) => id.trim());

    mapped = mapped.filter((item: any) => {
      const locName = (item.deliveryLocation || "").trim().toLowerCase();
      const locId = item.deliveryOfficeId;

      const matchesName = permittedNames.includes(locName);
      const matchesId = locId && permittedIds.includes(locId);

      return Boolean(matchesName || matchesId);
    });
  }

  // Filter by target office if specified
  if (officeId || officeName) {
    const targetName = officeName?.trim().toLowerCase();
    const targetId = officeId?.trim();
    mapped = mapped.filter((item: any) => {
      const matchId = targetId && item.deliveryOfficeId === targetId;
      const matchName = targetName && (item.deliveryLocation || "").trim().toLowerCase() === targetName;
      return Boolean(matchId || matchName);
    });
  }

  // Search filter
  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    mapped = mapped.filter((item: any) => {
      return (
        item.trackingNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.documentName.toLowerCase().includes(q) ||
        item.documentType.toLowerCase().includes(q) ||
        item.processType.toLowerCase().includes(q) ||
        item.registrationOffice.toLowerCase().includes(q) ||
        item.deliveryLocation.toLowerCase().includes(q) ||
        item.currentOffice.toLowerCase().includes(q) ||
        item.requestedBy.toLowerCase().includes(q)
      );
    });
  }

  return mapped;
}

/**
 * Approves an RD Approval request.
 * Atomically transitions document to Ready For Delivery at its Delivery Location.
 */
export async function approveRDApproval(params: ApproveRDApprovalParams) {
  const { id, userId, userName, ownerAdminId, approvalRemarks, allowedOfficeNames, allowedOfficeIds, isSuperAdmin } = params;
  const db = prisma as any;

  return await db.$transaction(async (tx: any) => {
    const approval = await tx.rDApproval.findFirst({
      where: { id, ownerAdminId },
      include: {
        registration: {
          include: {
            documentMovements: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { currentOffice: true },
            },
          },
        },
      },
    });

    if (!approval) {
      throw new Error("RD Approval request not found.");
    }

    if (approval.status !== "Pending") {
      throw new Error(`RD Approval request is not pending (current status: ${approval.status}).`);
    }

    const reg = approval.registration;
    if (!reg) {
      throw new Error("Associated document record not found.");
    }

    // Determine Delivery Location
    const deliveryLocation = (approval.deliveryLocation || reg.deliveryLocation || "").trim();
    if (!deliveryLocation || deliveryLocation === "-" || deliveryLocation.toLowerCase() === "unassigned") {
      throw new Error("Document does not have a valid Delivery Location configured.");
    }

    // Resolve Delivery Location Office Record
    let deliveryOffice = await tx.officeLocation.findFirst({
      where: {
        ownerAdminId,
        OR: [
          { id: deliveryLocation },
          { officeName: deliveryLocation },
        ],
      },
      select: { id: true, officeName: true },
    });

    if (!deliveryOffice) {
      const ao = await tx.assignedOffice.findFirst({
        where: {
          ownerAdminId,
          OR: [
            { id: deliveryLocation },
            { username: deliveryLocation },
          ],
        },
        select: { id: true, username: true },
      });
      if (ao) {
        deliveryOffice = { id: ao.id, officeName: ao.username };
      }
    }

    const destinationOfficeId = deliveryOffice?.id || reg.documentMovements?.[0]?.currentOfficeId;
    const destinationOfficeName = deliveryOffice?.officeName || deliveryLocation;

    // Verify Office Visibility Access on Delivery Location
    if (!isSuperAdmin && allowedOfficeNames !== undefined && allowedOfficeNames !== null) {
      const permittedNames = allowedOfficeNames.map((n) => n.trim().toLowerCase());
      const permittedIds = (allowedOfficeIds || []).map((i) => i.trim());

      const matchesName = permittedNames.includes(destinationOfficeName.toLowerCase());
      const matchesId = deliveryOffice?.id && permittedIds.includes(deliveryOffice.id);

      if (!matchesName && !matchesId) {
        throw new Error(
          `Forbidden: You do not have RD Approval office visibility for delivery location "${destinationOfficeName}".`
        );
      }
    }

    const currentMovement = reg.documentMovements?.[0];
    const oldStatus = currentMovement?.status || reg.trackingStatus || "Document In Hand";
    const oldOfficeName = currentMovement?.currentOffice?.officeName || reg.regionOfRegistration || null;

    // 1. Update Document Movement
    await tx.documentMovement.updateMany({
      where: { trackingNumber: reg.trackingNumber },
      data: {
        status: "Ready for Delivery",
        currentOfficeId: destinationOfficeId,
        currentModule: "READY_FOR_DELIVERY",
        currentStatus: "READY_FOR_DELIVERY",
        updatedAt: new Date(),
      },
    });

    // 2. Update Registration
    await tx.registration.update({
      where: { id: reg.id },
      data: {
        trackingStatus: "Ready for Delivery",
        bmStatus: "Ready for Delivery",
      },
    });

    // 3. Mark RDApproval as Approved
    const updatedApproval = await tx.rDApproval.update({
      where: { id },
      data: {
        status: "Approved",
        approvedById: userId,
        approvedByName: userName || "Approver",
        approvedAt: new Date(),
        approvalRemarks: approvalRemarks || `Approved RD request for delivery to ${destinationOfficeName}`,
      },
    });

    // 4. Record Document Workflow History
    if (tx.documentWorkflowHistory) {
      await tx.documentWorkflowHistory.create({
        data: {
          documentId: reg.id,
          trackingNumber: reg.trackingNumber,
          workflowStep: "RD Approval - Approved",
          status: "Ready for Delivery",
          performedBy: userName || userId,
          remarks: approvalRemarks || `Approved RD request for delivery to ${destinationOfficeName}`,
          ownerAdminId,
        },
      });
    }

    // 5. Record Movement History
    if (tx.movementHistory) {
      await tx.movementHistory.create({
        data: {
          trackingNumber: reg.trackingNumber,
          action: "RD Approval Approved",
          oldStatus,
          newStatus: "Ready for Delivery",
          oldOffice: oldOfficeName,
          newOffice: destinationOfficeName,
          performedBy: userName || userId,
          remarks: approvalRemarks || `RD Approval approved. Document moved to Ready For Delivery for ${destinationOfficeName}`,
        },
      });
    }

    // 6. Record Audit Trail
    if (tx.auditTrail) {
      await tx.auditTrail.create({
        data: {
          registrationId: reg.id,
          action: "RD_APPROVAL_APPROVED",
          performedBy: userName || userId,
          description: approvalRemarks || `RD Approval approved. Document moved to Ready For Delivery for ${destinationOfficeName}`,
        },
      });
    }

    return {
      success: true,
      approval: updatedApproval,
      trackingNumber: reg.trackingNumber,
      destinationOfficeName,
    };
  }, { timeout: 25000 });
}

/**
 * Rejects an RD Approval request.
 * Document remains in its current workflow state.
 */
export async function rejectRDApproval(params: RejectRDApprovalParams) {
  const { id, userId, userName, ownerAdminId, rejectionReason, allowedOfficeNames, allowedOfficeIds, isSuperAdmin } = params;
  const db = prisma as any;

  if (!rejectionReason || !rejectionReason.trim()) {
    throw new Error("Rejection reason is required.");
  }

  return await db.$transaction(async (tx: any) => {
    const approval = await tx.rDApproval.findFirst({
      where: { id, ownerAdminId },
      include: {
        registration: {
          include: {
            documentMovements: {
              orderBy: { createdAt: "desc" },
              take: 1,
              include: { currentOffice: true },
            },
          },
        },
      },
    });

    if (!approval) {
      throw new Error("RD Approval request not found.");
    }

    if (approval.status !== "Pending") {
      throw new Error(`RD Approval request is not pending (current status: ${approval.status}).`);
    }

    const reg = approval.registration;
    const deliveryLocation = (approval.deliveryLocation || reg?.deliveryLocation || "").trim();

    // Verify Office Visibility Access on Delivery Location
    if (!isSuperAdmin && allowedOfficeNames !== undefined && allowedOfficeNames !== null) {
      const permittedNames = allowedOfficeNames.map((n) => n.trim().toLowerCase());
      const permittedIds = (allowedOfficeIds || []).map((i) => i.trim());

      let deliveryOffice = await tx.officeLocation.findFirst({
        where: {
          ownerAdminId,
          OR: [
            { id: deliveryLocation },
            { officeName: deliveryLocation },
          ],
        },
        select: { id: true, officeName: true },
      });

      const matchesName = permittedNames.includes(deliveryLocation.toLowerCase()) || (deliveryOffice?.officeName && permittedNames.includes(deliveryOffice.officeName.toLowerCase()));
      const matchesId = deliveryOffice?.id && permittedIds.includes(deliveryOffice.id);

      if (!matchesName && !matchesId) {
        throw new Error(
          `Forbidden: You do not have RD Approval office visibility for delivery location "${deliveryLocation}".`
        );
      }
    }

    // Update RDApproval to Rejected
    const updatedApproval = await tx.rDApproval.update({
      where: { id },
      data: {
        status: "Rejected",
        rejectedById: userId,
        rejectedByName: userName || "Rejector",
        rejectedAt: new Date(),
        rejectionReason: rejectionReason.trim(),
      },
    });

    // Record Audit Trail
    if (reg && tx.auditTrail) {
      await tx.auditTrail.create({
        data: {
          registrationId: reg.id,
          action: "RD_APPROVAL_REJECTED",
          performedBy: userName || userId,
          description: `RD Approval rejected. Reason: ${rejectionReason.trim()}`,
        },
      });
    }

    if (reg && tx.documentWorkflowHistory) {
      await tx.documentWorkflowHistory.create({
        data: {
          documentId: reg.id,
          trackingNumber: reg.trackingNumber,
          workflowStep: "RD Approval - Rejected",
          status: "RD Rejected",
          performedBy: userName || userId,
          remarks: `RD Approval rejected. Reason: ${rejectionReason.trim()}`,
          ownerAdminId,
        },
      });
    }

    return {
      success: true,
      approval: updatedApproval,
      trackingNumber: reg?.trackingNumber,
    };
  }, { timeout: 25000 });
}
