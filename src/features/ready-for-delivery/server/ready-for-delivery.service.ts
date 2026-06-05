import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  ReadyForDeliveryDetail,
  ReadyForDeliveryFilters,
  ReadyForDeliveryItem,
  ReadyForDeliveryStats,
} from "@/features/ready-for-delivery/types/ready-for-delivery.types";
import { getRegistrationById } from "@/features/registration/server/registration.service";

type ReadyForDeliveryRow = {
  id: string;
  registrationNumber: string;
  clientName: string | null;
  mobile: string | null;
  email: string | null;
  service: string | null;
  country: string | null;
  state: string | null;
  deliveryLocation: string | null;
  regionOfRegistration: string | null;
  amount: Prisma.Decimal | number | null;
  workingDays: string | null;
  source: string | null;
  leadStatus: string | null;
  clientType: string | null;
  createdBy: string | null;
  acceptedBy: string | null;
  acceptedAt: Date | null;
  createdAt: Date;
  approvalStatus: string;
  bmStatus: string;
  trackingStatus: string;
};

type ReadyForDeliveryQueryParams = {
  search?: string;
  service?: string;
  country?: string;
  officeLocation?: string;
  date?: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isNonEmptyString(value: string | undefined | null): value is string {
  return Boolean(value && value.trim());
}

function mapReadyForDeliveryItem(row: ReadyForDeliveryRow): ReadyForDeliveryItem {
  return {
    id: row.id,
    registrationNumber: row.registrationNumber,
    clientName: row.clientName ?? "-",
    mobile: row.mobile ?? "-",
    email: row.email ?? "-",
    service: row.service ?? "-",
    country: row.country ?? "-",
    state: row.state ?? "-",
    deliveryLocation: row.deliveryLocation ?? "-",
    regionOfRegistration: row.regionOfRegistration ?? "-",
    amount: Number(row.amount ?? 0),
    workingDays: row.workingDays ?? "-",
    source: row.source ?? "-",
    leadStatus: row.leadStatus ?? "-",
    clientType: row.clientType ?? "-",
    createdBy: row.createdBy ?? "-",
    acceptedBy: row.acceptedBy ?? "-",
    acceptedAt: row.acceptedAt ? row.acceptedAt.toISOString() : null,
    acceptedDate: row.acceptedAt ? formatDate(row.acceptedAt) : null,
    createdAt: row.createdAt.toISOString(),
    createdDate: formatDate(row.createdAt),
    approvalStatus: row.approvalStatus,
    bmStatus: row.bmStatus,
    trackingStatus: row.trackingStatus,
  };
}

function rowMatchesFilters(row: ReadyForDeliveryRow, params: ReadyForDeliveryQueryParams) {
  const search = params.search?.trim().toLowerCase();
  const service = normalizeText(params.service);
  const country = normalizeText(params.country);
  const officeLocation = normalizeText(params.officeLocation);
  const date = params.date?.trim();

  if (search) {
    const haystacks = [
      row.registrationNumber,
      row.clientName,
      row.mobile,
      row.email,
      row.service,
      row.country,
      row.state,
      row.deliveryLocation,
      row.regionOfRegistration,
      row.createdBy,
      row.acceptedBy,
    ];

    const matchesSearch = haystacks.some((value) => value?.toLowerCase().includes(search));
    if (!matchesSearch) {
      return false;
    }
  }

  if (service && normalizeText(row.service) !== service) {
    return false;
  }

  if (country && normalizeText(row.country) !== country) {
    return false;
  }

  if (officeLocation) {
    const sourceMatches = normalizeText(row.regionOfRegistration) === officeLocation;
    const deliveryMatches = normalizeText(row.deliveryLocation) === officeLocation;
    if (!sourceMatches && !deliveryMatches) {
      return false;
    }
  }

  if (date) {
    const compareDate = row.acceptedAt ?? row.createdAt;
    if (compareDate.toISOString().slice(0, 10) !== date) {
      return false;
    }
  }

  return true;
}

async function listReadyRows(ownerAdminId: string, officeLocationName: string) {
  return prisma.$queryRaw<ReadyForDeliveryRow[]>(Prisma.sql`
    SELECT
      r.id,
      r.tracking_number AS "registrationNumber",
      r.customer_name AS "clientName",
      r.mobile,
      r.email,
      COALESCE(r.process_type, r.document_type) AS "service",
      r.country,
      r.state,
      r.delivery_location AS "deliveryLocation",
      r.region_of_registration AS "regionOfRegistration",
      r.total_charges AS "amount",
      r.committed_duration AS "workingDays",
      NULL::TEXT AS "source",
      NULL::TEXT AS "leadStatus",
      r.customer_type AS "clientType",
      r.created_by AS "createdBy",
      COALESCE(accepted_user.name, accepted_user.email) AS "acceptedBy",
      r.accepted_at AS "acceptedAt",
      r.created_at AS "createdAt",
      r.approval_status AS "approvalStatus",
      r.bm_status AS "bmStatus",
      r.tracking_status AS "trackingStatus"
    FROM registrations r
    LEFT JOIN users accepted_user ON accepted_user.id = r.accepted_by
    WHERE r.owner_admin_id = ${ownerAdminId}
      AND LOWER(COALESCE(r.delivery_location, '')) = LOWER(${officeLocationName})
      AND (
        r.bm_status = 'Accepted'
        OR r.approval_status = 'Accepted'
      )
    ORDER BY COALESCE(r.accepted_at, r.created_at) DESC, r.created_at DESC
  `);
}

function buildStats(items: ReadyForDeliveryItem[]): ReadyForDeliveryStats {
  const today = new Date().toISOString().slice(0, 10);

  return items.reduce<ReadyForDeliveryStats>(
    (stats, item) => {
      stats.totalReadyForDelivery += 1;

      if ((item.acceptedAt ?? item.createdAt).slice(0, 10) === today) {
        stats.acceptedToday += 1;
      }

      if (item.trackingStatus.toLowerCase() === "delivered") {
        stats.delivered += 1;
      } else {
        stats.pendingDelivery += 1;
      }

      return stats;
    },
    {
      totalReadyForDelivery: 0,
      acceptedToday: 0,
      pendingDelivery: 0,
      delivered: 0,
    },
  );
}

function buildFilters(rows: ReadyForDeliveryRow[]): ReadyForDeliveryFilters {
  return {
    services: Array.from(new Set(rows.map((row) => row.service?.trim()).filter(isNonEmptyString))).sort(),
    countries: Array.from(new Set(rows.map((row) => row.country?.trim()).filter(isNonEmptyString))).sort(),
    officeLocations: Array.from(
      new Set(
        rows
          .flatMap((row) => [row.regionOfRegistration?.trim(), row.deliveryLocation?.trim()])
          .filter(isNonEmptyString),
      ),
    ).sort(),
  };
}

export async function listReadyForDelivery(
  ownerAdminId: string,
  officeLocationName: string,
  params: ReadyForDeliveryQueryParams,
) {
  const rows = await listReadyRows(ownerAdminId, officeLocationName);
  const filteredRows = rows.filter((row) => rowMatchesFilters(row, params));
  const items = filteredRows.map(mapReadyForDeliveryItem);

  return {
    items,
    stats: buildStats(items),
    filters: buildFilters(rows),
  };
}

export async function getReadyForDeliveryById(
  ownerAdminId: string,
  officeLocationName: string,
  id: string,
): Promise<ReadyForDeliveryDetail | null> {
  const registration = await getRegistrationById(ownerAdminId, id);

  if (!registration) {
    return null;
  }

  const deliveryMatches =
    normalizeText(registration.deliveryLocation) === normalizeText(officeLocationName);
  const accepted =
    registration.bmStatus === "Accepted" || registration.approvalStatus === "Accepted";

  if (!deliveryMatches || !accepted) {
    return null;
  }

  const acceptedUser = registration.acceptedBy
    ? await prisma.user.findUnique({
        where: { id: registration.acceptedBy },
        select: { name: true, email: true },
      })
    : null;

  return {
    ...registration,
    acceptedByName: acceptedUser?.name ?? acceptedUser?.email ?? null,
    serviceLabel: registration.processType || registration.documentType || "-",
    amountLabel: registration.totalCharges.toFixed(2),
    workingDaysLabel: registration.committedDuration || "-",
    sourceLabel: "-",
    leadStatusLabel: registration.trackingStatus || "-",
    clientTypeLabel: registration.customerType || "-",
    officeLocationLabel: registration.regionOfRegistration || "-",
  };
}
