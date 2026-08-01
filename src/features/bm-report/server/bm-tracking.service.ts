import { prisma } from "@/lib/prisma";

export type MovementFilterParams = {
  ownerAdminId: string;
  isSuperAdmin?: boolean;
  permissions?: string[];
  userOfficeLocationId?: string;
  query?: string;
  trackingNumber?: string;
  customerName?: string;
  officeId?: string;
  assignedOfficeId?: string;
  fromOfficeId?: string;
  toOfficeId?: string;
  currentLocation?: string;
  movementType?: string;
  processType?: string;
  subPackage?: string;
  corePackage?: string;
  status?: string;
  movementStatus?: string;
  bundleNumber?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
};

export async function getRealtimeMovementStats(
  ownerAdminId: string,
  userOfficeLocationId?: string,
  isSuperAdmin: boolean = true
) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const officeFilter = !isSuperAdmin && userOfficeLocationId ? { currentOfficeId: userOfficeLocationId } : {};

  const [
    totalMovements,
    inTransitCount,
    transferredToday,
    receivedToday,
    returnedCount,
    rejectedCount,
    completedCount,
    pendingCount,
    bundleTransfersCount,
    subPackageTransfersCount,
    registrationsWithDates,
  ] = await Promise.all([
    prisma.movementHistory.count(),

    prisma.documentMovement.count({
      where: {
        registration: { ownerAdminId },
        status: { in: ["In Transit", "INBOUND", "Pending Receive"] },
        ...officeFilter,
      },
    }),

    prisma.movementHistory.count({
      where: {
        performedAt: { gte: todayStart, lte: todayEnd },
        action: { in: ["Sent", "Transferred", "Created", "Transfer"] },
      },
    }),

    prisma.movementHistory.count({
      where: {
        performedAt: { gte: todayStart, lte: todayEnd },
        action: { in: ["Accepted", "Received", "Receive"] },
      },
    }),

    prisma.documentMovement.count({
      where: {
        registration: { ownerAdminId },
        status: "Returned",
        ...officeFilter,
      },
    }),

    prisma.documentMovement.count({
      where: {
        registration: { ownerAdminId },
        status: "Rejected",
        ...officeFilter,
      },
    }),

    prisma.registration.count({
      where: {
        ownerAdminId,
        trackingStatus: { in: ["Completed", "Ready For Delivery", "Delivered"] },
      },
    }),

    prisma.documentMovement.count({
      where: {
        registration: { ownerAdminId },
        status: { in: ["Pending", "Registered", "Document In Hand"] },
        ...officeFilter,
      },
    }),

    prisma.bundle.count({
      where: { ownerAdminId },
    }),

    prisma.subPackageMovement.count({
      where: { ownerAdminId },
    }),

    prisma.registration.findMany({
      where: {
        ownerAdminId,
        trackingStatus: { in: ["Completed", "Delivered"] },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
      take: 100,
    }),
  ]);

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const delayedDocumentsCount = await prisma.documentMovement.count({
    where: {
      registration: { ownerAdminId },
      updatedAt: { lte: threeDaysAgo },
      status: { notIn: ["Completed", "Delivered"] },
      ...officeFilter,
    },
  });

  let avgProcessingTimeDays = 0;
  if (registrationsWithDates.length > 0) {
    const totalMs = registrationsWithDates.reduce((acc, reg) => {
      return acc + (reg.updatedAt.getTime() - reg.createdAt.getTime());
    }, 0);
    avgProcessingTimeDays = Math.round((totalMs / (registrationsWithDates.length * 1000 * 3600 * 24)) * 10) / 10;
  }

  return {
    totalMovements: totalMovements || 0,
    inTransitCount: inTransitCount || 0,
    transferredToday: transferredToday || 0,
    receivedToday: receivedToday || 0,
    returnedCount: returnedCount || 0,
    rejectedCount: rejectedCount || 0,
    completedCount: completedCount || 0,
    pendingCount: pendingCount || 0,
    delayedDocumentsCount: delayedDocumentsCount || 0,
    bundleTransfersCount: bundleTransfersCount || 0,
    subPackageTransfersCount: subPackageTransfersCount || 0,
    avgProcessingTimeDays: avgProcessingTimeDays || 1.5,
  };
}

export async function listRealtimeDocumentMovements(params: MovementFilterParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const limit = params.limit && params.limit > 0 ? params.limit : 20;
  const skip = (page - 1) * limit;

  const whereClause: any = {
    ownerAdminId: params.ownerAdminId,
  };

  if (params.query) {
    const q = params.query.trim();
    whereClause.OR = [
      { trackingNumber: { contains: q } },
      { customerName: { contains: q } },
      { processType: { contains: q } },
      { subPackage: { contains: q } },
      { regionOfRegistration: { contains: q } },
      { deliveryLocation: { contains: q } },
    ];
  }

  if (params.trackingNumber) {
    whereClause.trackingNumber = { contains: params.trackingNumber.trim() };
  }

  if (params.customerName) {
    whereClause.customerName = { contains: params.customerName.trim() };
  }

  if (params.processType) {
    whereClause.processType = params.processType;
  }

  if (params.subPackage) {
    whereClause.subPackage = params.subPackage;
  }

  if (params.startDate || params.endDate) {
    whereClause.createdAt = {};
    if (params.startDate) {
      whereClause.createdAt.gte = new Date(params.startDate);
    }
    if (params.endDate) {
      const end = new Date(params.endDate);
      end.setHours(23, 59, 59, 999);
      whereClause.createdAt.lte = end;
    }
  }

  if (params.status) {
    whereClause.trackingStatus = params.status;
  }

  const [total, registrations] = await Promise.all([
    prisma.registration.count({ where: whereClause }),
    prisma.registration.findMany({
      where: whereClause,
      include: {
        documentMovements: {
          include: {
            currentOffice: true,
            fromOffice: true,
            toOffice: true,
            bundle: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
        processAssignments: {
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const items = await Promise.all(
    registrations.map(async (reg) => {
      const currentMov = reg.documentMovements[0] || null;
      const processAssignment = reg.processAssignments[0] || null;

      const latestSubPackageMov = await prisma.subPackageMovement.findFirst({
        where: { trackingNumber: reg.trackingNumber },
        orderBy: { updatedAt: "desc" },
      });

      const latestHistory = await prisma.movementHistory.findFirst({
        where: { trackingNumber: reg.trackingNumber },
        orderBy: { performedAt: "desc" },
      });

      const currentOfficeName =
        currentMov?.currentOffice?.officeName ??
        reg.regionOfRegistration ??
        reg.deliveryLocation ??
        "Main Office";

      const currentModule =
        currentMov?.currentModule ??
        (processAssignment ? "Process Module" : "Revenue Registration");

      let currentSubPackageName = reg.subPackage || "-";
      if (!currentSubPackageName || currentSubPackageName === "-" || (currentSubPackageName.startsWith("c") && currentSubPackageName.length > 20)) {
        if (latestSubPackageMov?.subPackageId && !latestSubPackageMov.subPackageId.startsWith("c")) {
          currentSubPackageName = latestSubPackageMov.subPackageId;
        } else {
          currentSubPackageName = "-";
        }
      }

      const currentHolder =
        currentMov?.acceptedBy ??
        currentMov?.createdBy ??
        reg.registeredPerson ??
        "Unassigned";

      return {
        id: reg.id,
        trackingNumber: reg.trackingNumber,
        customerName: reg.customerName,
        mobile: reg.mobile,
        processType: reg.processType ?? reg.documentType ?? "Standard",
        currentOffice: currentOfficeName,
        currentModule: currentModule,
        currentSubPackage: currentSubPackageName,
        currentStatus: currentMov?.status ?? reg.trackingStatus,
        movementStatus: currentMov?.status ?? reg.trackingStatus,
        lastMovement: latestHistory ? `${latestHistory.action} (${latestHistory.oldOffice || "Origin"} → ${latestHistory.newOffice || currentOfficeName})` : "Registered",
        lastMovementDate: latestHistory?.performedAt ?? reg.updatedAt,
        currentHolder: currentHolder,
        lastUpdated: reg.updatedAt,
        bundleNumber: currentMov?.bundle?.bundleNumber ?? null,
        priority: reg.priority || "Normal",
      };
    })
  );

  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    data: items,
  };
}

export async function getDocumentMovementDetails(ownerAdminId: string, trackingNumber: string) {
  const registration = await prisma.registration.findFirst({
    where: { trackingNumber, ownerAdminId },
    include: {
      documentMovements: {
        include: {
          currentOffice: true,
          fromOffice: true,
          toOffice: true,
          bundle: true,
        },
      },
      processAssignments: {
        include: {
          movements: true,
          history: true,
        },
      },
      files: true,
      auditTrail: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!registration) {
    throw new Error("Document tracking record not found.");
  }

  const [
    branchRecords,
    movementHistories,
    subPackageMovements,
    workflowHistories,
    bundleItems,
  ] = await Promise.all([
    prisma.branchMovementRecord.findMany({
      where: { trackingNumber, ownerAdminId },
      orderBy: { transferDateTime: "asc" },
    }),

    prisma.movementHistory.findMany({
      where: { trackingNumber },
      orderBy: { performedAt: "asc" },
    }),

    prisma.subPackageMovement.findMany({
      where: { trackingNumber, ownerAdminId },
      include: { assignedOffice: true },
      orderBy: { startedAt: "asc" },
    }),

    prisma.documentWorkflowHistory.findMany({
      where: { trackingNumber, ownerAdminId },
      orderBy: { performedAt: "asc" },
    }),

    prisma.bundleItem.findMany({
      where: { trackingNumber },
      include: {
        bundle: {
          include: {
            fromOffice: true,
            toOffice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Build unified chronological timeline (newest first for timeline list)
  const timeline: Array<{
    id: string;
    step: string;
    fromLocation: string;
    toLocation: string;
    module: string;
    status: string;
    performedBy: string;
    timestamp: Date;
    remarks?: string | null;
    courierNumber?: string | null;
  }> = [];

function cleanOfficeName(name?: string | null): string {
  if (!name || name === "-" || name === "null") return "Main Office";
  const lower = name.toLowerCase().trim();
  if (lower === "uaeembassy" || lower === "uae_embassy") return "UAE Embassy";
  if (lower === "kochihq" || lower === "kochi_hq" || lower === "kochi") return "Kochi HQ";
  if (lower === "mala" || lower === "mala_office") return "Mala Office";
  if (lower === "delhi" || lower === "delhi_office") return "Delhi Office";
  if (lower === "oman" || lower === "oman_embassy") return "Oman Embassy";
  return name.replace(/_/g, " ");
}

function cleanUserName(user?: string | null): string {
  if (!user || user === "-" || user === "null") return "Staff User";
  if (user.includes("-") && user.length > 25 && /^[0-9a-fA-F-]+$/.test(user)) {
    return "System Admin";
  }
  return user;
}

function cleanSubPackageId(spId?: string | null): string {
  if (!spId || spId === "-") return "-";
  if (spId.startsWith("c") && spId.length > 20) {
    return "Embassy Sub Package";
  }
  return spId;
}

  timeline.push({
    id: `reg-${registration.id}`,
    step: "Revenue Registration Created",
    fromLocation: "Client / Lead",
    toLocation: cleanOfficeName(registration.regionOfRegistration),
    module: "Revenue Registration",
    status: "Registered",
    performedBy: cleanUserName(registration.registeredPerson || registration.createdBy),
    timestamp: registration.createdAt,
    remarks: `Registered for customer ${registration.customerName}`,
  });

  branchRecords.forEach((rec) => {
    timeline.push({
      id: `bm-${rec.id}`,
      step: `Branch Movement (${rec.movementStatus})`,
      fromLocation: cleanOfficeName(rec.sourceOffice),
      toLocation: cleanOfficeName(rec.destinationOffice),
      module: "BM Movement",
      status: rec.movementStatus,
      performedBy: cleanUserName(rec.transferredBy || rec.receivedBy),
      timestamp: rec.transferDateTime,
      remarks: rec.remarks,
      courierNumber: rec.courierNumber,
    });
  });

  registration.processAssignments.flatMap((pa) => pa.movements).forEach((pm) => {
    timeline.push({
      id: `proc-${pm.id}`,
      step: `Process Step (${pm.action})`,
      fromLocation: cleanOfficeName(pm.fromLocation),
      toLocation: cleanOfficeName(pm.toLocation),
      module: "Process Module",
      status: pm.action,
      performedBy: cleanUserName(pm.userId),
      timestamp: pm.createdAt,
      remarks: pm.remarks,
    });
  });

  subPackageMovements.forEach((spm) => {
    const officeName = cleanOfficeName(spm.assignedOffice?.officeName);
    timeline.push({
      id: `spm-${spm.id}`,
      step: `Sub Package Workflow (${spm.status})`,
      fromLocation: officeName,
      toLocation: officeName,
      module: "Sub Package",
      status: spm.status,
      performedBy: cleanUserName(spm.createdBy),
      timestamp: spm.startedAt,
      remarks: `Sub Package: ${cleanSubPackageId(spm.subPackageId)}`,
    });
  });

  movementHistories.forEach((mh) => {
    timeline.push({
      id: `mh-${mh.id}`,
      step: mh.action,
      fromLocation: cleanOfficeName(mh.oldOffice),
      toLocation: cleanOfficeName(mh.newOffice),
      module: "Document Movement",
      status: mh.newStatus || mh.action,
      performedBy: cleanUserName(mh.performedBy),
      timestamp: mh.performedAt,
      remarks: mh.remarks,
    });
  });

  timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Build Dynamic Sequential Movement Path Nodes (oldest to newest: 1 -> 2 -> 3 -> 4...)
  type PathNode = {
    stepNumber: number;
    officeName: string;
    moduleName: string;
    section: string;
    status: string;
    timestamp: Date;
    performedBy: string;
    currentHolder?: string;
    remarks?: string;
    isCurrent: boolean;
  };

  const rawPathEvents: Array<{
    officeName: string;
    moduleName: string;
    section: string;
    status: string;
    timestamp: Date;
    performedBy: string;
    remarks?: string;
  }> = [];

  // Step 1: Initial Registration Event
  const originOffice = registration.regionOfRegistration || "Main Office";
  rawPathEvents.push({
    officeName: originOffice,
    moduleName: "Revenue Registration",
    section: "Inbound",
    status: "Received",
    timestamp: registration.createdAt,
    performedBy: registration.registeredPerson || registration.createdBy || "System",
    remarks: `Registered in ${originOffice}`,
  });

  // Branch Transfer Events
  branchRecords.forEach((br) => {
    if (br.sourceOffice) {
      rawPathEvents.push({
        officeName: br.sourceOffice,
        moduleName: "BM Office",
        section: "Outbound",
        status: "Transferred",
        timestamp: br.transferDateTime,
        performedBy: br.transferredBy || "Office Admin",
        remarks: br.remarks || undefined,
      });
    }
    if (br.destinationOffice) {
      rawPathEvents.push({
        officeName: br.destinationOffice,
        moduleName: "BM Office",
        section: br.movementStatus === "Received" ? "Document In Hand" : "Inbound",
        status: br.movementStatus || "Received",
        timestamp: br.receiveDateTime || br.transferDateTime,
        performedBy: br.receivedBy || br.transferredBy || "Office Admin",
        remarks: br.remarks || undefined,
      });
    }
  });

  // Process Assignments
  registration.processAssignments.flatMap((pa) => pa.movements).forEach((pm) => {
    rawPathEvents.push({
      officeName: pm.toLocation || pm.fromLocation || "Process Module",
      moduleName: "Process Module",
      section: pm.action === "RETURN" ? "Returned" : pm.action === "REJECTED" ? "Rejected" : "Document In Hand",
      status: pm.action,
      timestamp: pm.createdAt,
      performedBy: pm.userId,
      remarks: pm.remarks || undefined,
    });
  });

  // Sub Package Movements
  subPackageMovements.forEach((spm) => {
    const officeName = spm.assignedOffice?.officeName || registration.regionOfRegistration || "Assigned Office";
    rawPathEvents.push({
      officeName: `${officeName} (Sub Package)`,
      moduleName: "Sub Package",
      section: "Sub Package",
      status: "In Progress",
      timestamp: spm.startedAt,
      performedBy: spm.createdBy || "Staff",
      remarks: `Sub Package ${spm.subPackageId}`,
    });

    if (spm.completedAt) {
      rawPathEvents.push({
        officeName: officeName,
        moduleName: "Sub Package",
        section: "Document Completed",
        status: "Completed",
        timestamp: spm.completedAt,
        performedBy: spm.createdBy || "Staff",
        remarks: `Completed Sub Package ${spm.subPackageId}`,
      });
    }

    if (spm.returnedAt) {
      rawPathEvents.push({
        officeName: officeName,
        moduleName: "Assigned Office",
        section: "Returned",
        status: "Returned",
        timestamp: spm.returnedAt,
        performedBy: spm.createdBy || "Staff",
        remarks: `Returned to ${officeName}`,
      });
    }
  });

  // General Movement Histories
  movementHistories.forEach((mh) => {
    rawPathEvents.push({
      officeName: mh.newOffice || mh.oldOffice || originOffice,
      moduleName: mh.action.includes("Bundle") ? "Bundle Transfer" : "Document Movement",
      section: mh.newStatus || mh.action,
      status: mh.newStatus || mh.action,
      timestamp: mh.performedAt,
      performedBy: mh.performedBy || "System",
      remarks: mh.remarks || undefined,
    });
  });

  // If tracking status is Ready For Delivery or Delivered
  if (registration.trackingStatus === "Ready For Delivery" || registration.trackingStatus === "Delivered") {
    rawPathEvents.push({
      officeName: registration.deliveryLocation || originOffice,
      moduleName: "Ready For Delivery",
      section: registration.trackingStatus === "Delivered" ? "Delivered" : "Ready For Delivery",
      status: registration.trackingStatus,
      timestamp: registration.updatedAt,
      performedBy: registration.registeredPerson || "Delivery Dept",
    });
  }

  // Sort rawPathEvents chronologically asc
  rawPathEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

  // Build final movementPathNodes
  const movementPathNodes: PathNode[] = rawPathEvents.map((evt, index) => ({
    stepNumber: index + 1,
    officeName: evt.officeName,
    moduleName: evt.moduleName,
    section: evt.section,
    status: evt.status,
    timestamp: evt.timestamp,
    performedBy: evt.performedBy,
    currentHolder: evt.performedBy,
    remarks: evt.remarks,
    isCurrent: false,
  }));

  // Ensure at least one node exists
  if (movementPathNodes.length === 0) {
    movementPathNodes.push({
      stepNumber: 1,
      officeName: originOffice,
      moduleName: "Revenue Registration",
      section: "Document In Hand",
      status: registration.trackingStatus || "Registered",
      timestamp: registration.createdAt,
      performedBy: registration.registeredPerson || "System",
      currentHolder: registration.registeredPerson || "System",
      isCurrent: true,
    });
  } else {
    // Mark latest node as current
    movementPathNodes[movementPathNodes.length - 1].isCurrent = true;
  }

  // Build Movement History Table Rows (1-indexed for visual table below map)
  const historyTableRows = movementPathNodes.map((node) => ({
    stepNumber: node.stepNumber,
    fromOffice: node.stepNumber > 1 ? movementPathNodes[node.stepNumber - 2].officeName : "Origin",
    toOffice: node.officeName,
    module: node.moduleName,
    section: node.section,
    movementType: node.section,
    status: node.status,
    transferredOn: node.timestamp,
    transferredBy: node.performedBy,
    documentsCount: 1,
    remarks: node.remarks || "-",
  }));

  const latestBundleItem = bundleItems[0] || null;
  const primaryBundle = latestBundleItem?.bundle || null;

  const bundleDetails = {
    bundleNumber: primaryBundle?.bundleNumber ?? `BND-${new Date(registration.createdAt).getFullYear()}-0001`,
    totalDocuments: 1,
    packageType: registration.processType || registration.documentType || "Standard Package",
    createdOn: primaryBundle?.createdAt ?? registration.createdAt,
    createdBy: primaryBundle?.createdBy ?? registration.registeredPerson ?? "System",
    priority: "Normal",
    currentStatus: primaryBundle?.status ?? registration.trackingStatus,
  };

  const isCorePackageCompleted =
    registration.trackingStatus === "Completed" ||
    registration.trackingStatus === "Ready For Delivery" ||
    registration.trackingStatus === "Delivered" ||
    subPackageMovements.some((s) => s.status === "Completed");

  return {
    registration: {
      id: registration.id,
      trackingNumber: registration.trackingNumber,
      customerName: registration.customerName,
      mobile: registration.mobile,
      email: registration.email,
      address: registration.address,
      country: registration.country,
      documentType: registration.documentType,
      processType: registration.processType,
      subPackage: registration.subPackage,
      regionOfRegistration: registration.regionOfRegistration,
      deliveryLocation: registration.deliveryLocation,
      trackingStatus: registration.trackingStatus,
      paymentStatus: registration.paymentStatus,
      priority: registration.priority || "Normal",
      createdAt: registration.createdAt,
      updatedAt: registration.updatedAt,
    },
    timeline,
    movementPathNodes,
    historyTableRows,
    bundleDetails,
    bundleHistory: bundleItems.map((bi) => ({
      bundleId: bi.bundle.id,
      bundleNumber: bi.bundle.bundleNumber,
      fromOffice: bi.bundle.fromOffice.officeName,
      toOffice: bi.bundle.toOffice.officeName,
      status: bi.bundle.status,
      itemStatus: bi.status,
      transferredBy: bi.bundle.createdBy || "Admin",
      transferredTime: bi.bundle.createdAt,
      receivedBy: bi.receivedBy,
      receivedTime: bi.receivedAt,
    })),
    subPackageHistory: subPackageMovements.map((spm) => ({
      id: spm.id,
      subPackageId: spm.subPackageId,
      assignedOffice: spm.assignedOffice?.officeName || "Assigned Office",
      status: spm.status,
      startedAt: spm.startedAt,
      completedAt: spm.completedAt,
      returnedAt: spm.returnedAt,
      rejectedAt: spm.rejectedAt,
      createdBy: spm.createdBy,
    })),
    corePackageStatus: {
      isCompleted: isCorePackageCompleted,
      statusLabel: isCorePackageCompleted ? "Completed" : "Pending Main Process Verification",
      completedAt: registration.updatedAt,
    },
    auditTrail: registration.auditTrail,
  };
}
