import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { BmReportItem, BmReportStats } from "@/features/bm-report/types/bm-report.types";

type BmReportRow = {
  id: string;
  registrationNumber: string;
  clientName: string;
  service: string | null;
  sourceOffice: string | null;
  deliveryLocation: string | null;
  createdBy: string | null;
  createdAt: Date;
  status: string;
  approvalStatus: string;
  acceptedAt: Date | null;
  acceptedBy: string | null;
};

function logBmWorkflow(
  message: string,
  payload: Record<string, unknown>,
) {
  console.info(`[bm-report] ${message}`, payload);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function isSameDay(date: Date, compare: Date) {
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth() &&
    date.getDate() === compare.getDate()
  );
}

function mapBmReportItem(row: BmReportRow): BmReportItem {
  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    clientName: row.clientName,
    service: row.service ?? "-",
    sourceOffice: row.sourceOffice ?? "-",
    deliveryLocation: row.deliveryLocation ?? "-",
    createdBy: row.createdBy ?? "-",
    createdDate: formatDate(row.createdAt),
    status: row.status,
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    acceptedDate: row.acceptedAt ? formatDate(row.acceptedAt) : null,
    acceptedBy: row.acceptedBy ?? null,
  };
}

async function listBmRows(
  ownerAdminId: string,
  whereClause: Prisma.Sql,
) {
  return prisma.$queryRaw<BmReportRow[]>(Prisma.sql`
    SELECT
      r.id,
      r.tracking_number AS "registrationNumber",
      r.customer_name AS "clientName",
      COALESCE(r.process_type, r.document_type) AS "service",
      r.region_of_registration AS "sourceOffice",
      r.delivery_location AS "deliveryLocation",
      r.created_by AS "createdBy",
      r.created_at AS "createdAt",
      r.bm_status AS "status",
      r.approval_status AS "approvalStatus",
      r.accepted_at AS "acceptedAt",
      COALESCE(accepted_user.name, accepted_user.email) AS "acceptedBy"
    FROM registrations r
    LEFT JOIN users accepted_user ON accepted_user.id = r.accepted_by
    WHERE r.owner_admin_id = ${ownerAdminId}
      AND ${whereClause}
    ORDER BY COALESCE(r.accepted_at, r.created_at) DESC, r.created_at DESC
  `);
}

export async function getBmReportStats(ownerAdminId: string, officeLocationName: string): Promise<BmReportStats> {
  const rows = await prisma.$queryRaw<Array<{
      deliveryLocation: string | null;
      sourceOffice: string | null;
      status: string;
      approvalStatus: string;
      acceptedAt: Date | null;
  }>>(Prisma.sql`
    SELECT
      delivery_location AS "deliveryLocation",
      region_of_registration AS "sourceOffice",
      bm_status AS "status",
      approval_status AS "approvalStatus",
      accepted_at AS "acceptedAt"
    FROM registrations
    WHERE owner_admin_id = ${ownerAdminId}
      AND COALESCE(delivery_location, '') <> ''
      AND COALESCE(region_of_registration, '') <> ''
  `);

  const today = new Date();

  return rows.reduce<BmReportStats>(
    (stats, row) => {
      const deliveryMatches = row.deliveryLocation?.toLowerCase() === officeLocationName.toLowerCase();
      const sourceMatches = row.sourceOffice?.toLowerCase() === officeLocationName.toLowerCase();
      const crossOffice = Boolean(
        row.deliveryLocation &&
          row.sourceOffice &&
          row.deliveryLocation.toLowerCase() !== row.sourceOffice.toLowerCase(),
      );

      if (deliveryMatches && crossOffice && row.status === "Pending") {
        stats.totalInward += 1;
        stats.pendingInward += 1;
      }

      if (sourceMatches && !deliveryMatches && crossOffice) {
        stats.totalOutward += 1;
      }

      if (deliveryMatches && row.status === "Accepted" && row.acceptedAt && isSameDay(row.acceptedAt, today)) {
        stats.acceptedToday += 1;
      }

      return stats;
    },
    {
      totalInward: 0,
      totalOutward: 0,
      acceptedToday: 0,
      pendingInward: 0,
    },
  );
}

export async function listBmInward(ownerAdminId: string, officeLocationName: string) {
  const rows = await listBmRows(
    ownerAdminId,
    Prisma.sql`
      LOWER(COALESCE(r.delivery_location, '')) = LOWER(${officeLocationName})
      AND LOWER(COALESCE(r.region_of_registration, '')) <> LOWER(${officeLocationName})
      AND r.bm_status = 'Pending'
    `,
  );

  logBmWorkflow("Loaded inward queue.", {
    currentUserOffice: officeLocationName,
    totalRows: rows.length,
    records: rows.map((row) => ({
      trackingNumber: row.registrationNumber,
      regionOfRegistration: row.sourceOffice,
      deliveryLocation: row.deliveryLocation,
      approvalStatus: row.approvalStatus,
      bmStatus: row.status,
    })),
  });

  return rows.map(mapBmReportItem);
}

export async function listBmHome(ownerAdminId: string, officeLocationName: string) {
  const rows = await listBmRows(
    ownerAdminId,
    Prisma.sql`
      LOWER(COALESCE(r.delivery_location, '')) = LOWER(${officeLocationName})
      AND r.bm_status = 'Accepted'
    `,
  );

  logBmWorkflow("Loaded home queue.", {
    currentUserOffice: officeLocationName,
    totalRows: rows.length,
    records: rows.map((row) => ({
      trackingNumber: row.registrationNumber,
      regionOfRegistration: row.sourceOffice,
      deliveryLocation: row.deliveryLocation,
      approvalStatus: row.approvalStatus,
      bmStatus: row.status,
    })),
  });

  return rows.map(mapBmReportItem);
}

export async function listBmOutward(ownerAdminId: string, officeLocationName: string) {
  const rows = await listBmRows(
    ownerAdminId,
    Prisma.sql`
      LOWER(COALESCE(r.region_of_registration, '')) = LOWER(${officeLocationName})
      AND LOWER(COALESCE(r.delivery_location, '')) <> LOWER(${officeLocationName})
    `,
  );

  logBmWorkflow("Loaded outward queue.", {
    currentUserOffice: officeLocationName,
    totalRows: rows.length,
    records: rows.map((row) => ({
      trackingNumber: row.registrationNumber,
      regionOfRegistration: row.sourceOffice,
      deliveryLocation: row.deliveryLocation,
      approvalStatus: row.approvalStatus,
      bmStatus: row.status,
    })),
  });

  return rows.map(mapBmReportItem);
}

export async function acceptBmRegistration(params: {
  id: string;
  ownerAdminId: string;
  officeLocationName: string;
  acceptedByUserId: string;
  acceptedByName?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string; trackingNumber: string }>>(Prisma.sql`
      SELECT id, tracking_number AS "trackingNumber"
      FROM registrations
      WHERE id = ${params.id}
        AND owner_admin_id = ${params.ownerAdminId}
        AND LOWER(COALESCE(delivery_location, '')) = LOWER(${params.officeLocationName})
        AND LOWER(COALESCE(region_of_registration, '')) <> LOWER(${params.officeLocationName})
        AND bm_status = 'Pending'
      LIMIT 1
    `);

    const record = rows[0];

    if (!record) {
      return null;
    }

    const updatedRows = await tx.$queryRaw<
      Array<{
        trackingNumber: string;
        sourceOffice: string | null;
        deliveryLocation: string | null;
        bmStatus: string;
        approvalStatus: string;
        acceptedBy: string | null;
        acceptedAt: Date | null;
      }>
    >(Prisma.sql`
      UPDATE registrations
      SET
        bm_status = 'Accepted',
        approval_status = 'Accepted',
        accepted_by = ${params.acceptedByUserId},
        accepted_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${record.id}
      RETURNING
        tracking_number AS "trackingNumber",
        region_of_registration AS "sourceOffice",
        delivery_location AS "deliveryLocation",
        bm_status AS "bmStatus",
        approval_status AS "approvalStatus",
        accepted_by AS "acceptedBy",
        accepted_at AS "acceptedAt"
    `);

    const updatedRecord = updatedRows[0];

    await tx.auditTrail.create({
      data: {
        registrationId: record.id,
        action: "BM document accepted",
        description: `Registration ${record.trackingNumber} was accepted by ${params.acceptedByName ?? "the destination office"}.`,
        performedBy: params.acceptedByName ?? params.acceptedByUserId,
      },
    });

    if (updatedRecord) {
      logBmWorkflow("Accepted inward document.", {
        currentUserOffice: params.officeLocationName,
        trackingNumber: updatedRecord.trackingNumber,
        regionOfRegistration: updatedRecord.sourceOffice,
        deliveryLocation: updatedRecord.deliveryLocation,
        approvalStatus: updatedRecord.approvalStatus,
        bmStatus: updatedRecord.bmStatus,
        acceptedBy: updatedRecord.acceptedBy,
        acceptedAt: updatedRecord.acceptedAt?.toISOString() ?? null,
      });
    }

    return record;
  });
}
