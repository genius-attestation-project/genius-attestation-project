import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProcessItem, ProcessStats, ProcessLocation, ProcessStatus } from "../types/process.types";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export async function getProcessStats(ownerAdminId: string, processType?: string): Promise<ProcessStats> {
  const whereClause = Prisma.sql`
    WHERE owner_admin_id = ${ownerAdminId}
    ${processType ? Prisma.sql`AND process_type = ${processType}` : Prisma.sql``}
  `;

  const rows = await prisma.$queryRaw<Array<{ currentLocation: ProcessLocation }>>(Prisma.sql`
    SELECT current_location AS "currentLocation"
    FROM process_assignments
    ${whereClause}
  `);

  return rows.reduce(
    (acc, row) => {
      acc.total += 1;
      if (row.currentLocation === "INBOUND") acc.inbound += 1;
      if (row.currentLocation === "IN_HAND") acc.inHand += 1;
      if (row.currentLocation === "COMPLETED") acc.completed += 1;
      if (row.currentLocation === "REJECTED") acc.rejected += 1;
      if (row.currentLocation === "OUTBOUND") acc.outbound += 1;
      return acc;
    },
    { inbound: 0, inHand: 0, completed: 0, rejected: 0, outbound: 0, total: 0 }
  );
}

export async function listProcessAssignments(ownerAdminId: string, location: ProcessLocation, processType?: string) {
  const whereClause = Prisma.sql`
    pa.owner_admin_id = ${ownerAdminId}
    AND pa.current_location = ${location}
    ${processType ? Prisma.sql`AND pa.process_type = ${processType}` : Prisma.sql``}
  `;

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      registrationId: string;
      trackingNumber: string;
      clientName: string;
      processType: string;
      currentLocation: ProcessLocation;
      status: ProcessStatus;
      receivedDate: Date;
      daysHeld: number;
      assignedUserId: string | null;
      assignedToName: string | null;
      remarks: string | null;
    }>
  >(Prisma.sql`
    SELECT
      pa.id,
      pa.registration_id AS "registrationId",
      pa.tracking_number AS "trackingNumber",
      r.customer_name AS "clientName",
      pa.process_type AS "processType",
      pa.current_location AS "currentLocation",
      pa.status,
      pa.received_date AS "receivedDate",
      pa.days_held AS "daysHeld",
      pa.assigned_user_id AS "assignedUserId",
      COALESCE(u.name, u.email) AS "assignedToName",
      pa.remarks
    FROM process_assignments pa
    JOIN registrations r ON r.id = pa.registration_id
    LEFT JOIN users u ON u.id = pa.assigned_user_id
    WHERE ${whereClause}
    ORDER BY pa.received_date DESC
  `);

  return rows.map((row) => ({
    ...row,
    receivedDate: formatDate(row.receivedDate),
  })) as ProcessItem[];
}

export async function createProcessAssignment(params: {
  registrationId: string;
  trackingNumber: string;
  processType: string;
  userId: string;
  ownerAdminId: string;
  remarks?: string;
}) {
  return prisma.$transaction(async (tx) => {
    // Check if already assigned to this process
    const existing = await tx.processAssignment.findUnique({
      where: {
        registrationId_processType: {
          registrationId: params.registrationId,
          processType: params.processType,
        },
      },
    });

    if (existing) {
      throw new Error(`Document is already assigned to the ${params.processType} process.`);
    }

    const assignment = await tx.processAssignment.create({
      data: {
        registrationId: params.registrationId,
        trackingNumber: params.trackingNumber,
        processType: params.processType,
        currentLocation: "INBOUND",
        status: "PROCESS_SUBMITTED",
        ownerAdminId: params.ownerAdminId,
        remarks: params.remarks,
      },
    });

    await tx.processHistory.create({
      data: {
        processAssignmentId: assignment.id,
        fromModule: "BM Report",
        toModule: "Process Module",
        action: "Sent to Process",
        userId: params.userId,
        remarks: params.remarks,
        ownerAdminId: params.ownerAdminId,
      },
    });

    // Update Registration Status
    await tx.registration.update({
      where: { id: params.registrationId },
      data: {
        trackingStatus: `In Process: ${params.processType}`,
      },
    });

    return assignment;
  });
}

export async function moveProcessAssignment(params: {
  assignmentId: string;
  targetLocation: ProcessLocation;
  userId: string;
  ownerAdminId: string;
  remarks?: string;
  officeLocationName?: string; // Needed if moving OUTBOUND to reset BM Report
}) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.processAssignment.findUnique({
      where: { id: params.assignmentId },
      include: { registration: true },
    });

    if (!assignment) throw new Error("Process assignment not found.");
    if (assignment.ownerAdminId !== params.ownerAdminId) throw new Error("Unauthorized.");

    const fromLocation = assignment.currentLocation;
    const toLocation = params.targetLocation;

    let newStatus: ProcessStatus = "PROCESS_SUBMITTED";
    let completedDate: Date | null = assignment.completedDate;
    let rejectedDate: Date | null = assignment.rejectedDate;
    let sentDate: Date | null = assignment.sentDate;

    if (toLocation === "IN_HAND") newStatus = "IN_HAND";
    if (toLocation === "COMPLETED") {
      newStatus = "COMPLETED";
      completedDate = new Date();
    }
    if (toLocation === "REJECTED") {
      newStatus = "REJECTED";
      rejectedDate = new Date();
    }
    if (toLocation === "OUTBOUND") {
      newStatus = "OUTBOUND";
      sentDate = new Date();
    }

    const updated = await tx.processAssignment.update({
      where: { id: params.assignmentId },
      data: {
        currentLocation: toLocation,
        status: newStatus,
        assignedUserId: toLocation === "IN_HAND" ? params.userId : assignment.assignedUserId,
        completedDate,
        rejectedDate,
        sentDate,
        remarks: params.remarks ?? assignment.remarks,
      },
    });

    await tx.processMovement.create({
      data: {
        processAssignmentId: assignment.id,
        fromLocation,
        toLocation,
        action: `Moved to ${toLocation}`,
        userId: params.userId,
        remarks: params.remarks,
        ownerAdminId: params.ownerAdminId,
      },
    });

    await tx.processHistory.create({
      data: {
        processAssignmentId: assignment.id,
        fromModule: "Process Module",
        toModule: "Process Module",
        action: `Moved to ${toLocation}`,
        userId: params.userId,
        remarks: params.remarks,
        ownerAdminId: params.ownerAdminId,
      },
    });

    if (toLocation === "OUTBOUND") {
      // Return Flow: Make it appear back in BM Report INWARD for the current office
      if (params.officeLocationName) {
        await tx.registration.update({
          where: { id: assignment.registrationId },
          data: {
            bmStatus: "Pending", // Reset to pending to appear in INWARD
            deliveryLocation: params.officeLocationName, // The current office receives it back
            trackingStatus: `Process ${assignment.processType} Completed`,
            approvalStatus: "Pending",
          },
        });
      }
    } else {
      // Update tracking status
      await tx.registration.update({
        where: { id: assignment.registrationId },
        data: {
          trackingStatus: `Process ${assignment.processType}: ${newStatus}`,
        },
      });
    }

    return updated;
  });
}

export async function getProcessHistory(trackingNumber: string, ownerAdminId: string) {
  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      action: string;
      fromModule: string;
      toModule: string;
      remarks: string | null;
      userName: string | null;
      createdAt: Date;
    }>
  >(Prisma.sql`
    SELECT
      ph.id,
      ph.action,
      ph.from_module AS "fromModule",
      ph.to_module AS "toModule",
      ph.remarks,
      COALESCE(u.name, u.email) AS "userName",
      ph.created_at AS "createdAt"
    FROM process_history ph
    JOIN process_assignments pa ON pa.id = ph.process_assignment_id
    LEFT JOIN users u ON u.id = ph.user_id
    WHERE pa.tracking_number = ${trackingNumber}
      AND pa.owner_admin_id = ${ownerAdminId}
    ORDER BY ph.created_at ASC
  `);

  return rows;
}
