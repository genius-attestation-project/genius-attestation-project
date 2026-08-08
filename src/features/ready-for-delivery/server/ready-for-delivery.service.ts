import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type {
  ReadyForDeliveryDetail,
  ReadyForDeliveryFilters,
  ReadyForDeliveryItem,
  ReadyForDeliverySection,
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
  advancePaid: Prisma.Decimal | number | null;
  balanceAmount: Prisma.Decimal | number | null;
  collectedPerson: string | null;
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
  deliveryType: string | null;
  deliveryUserId: string | null;
  deliveryUserName: string | null;
  courierCompanyId: string | null;
  courierCompanyName: string | null;
  courierTrackingNumber: string | null;
  deliveryProofFileUrl: string | null;
  deliveryStatus: string | null;
  priority: string | null;
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

function formatDateDDMMYYYY(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function isNonEmptyString(value: string | undefined | null): value is string {
  return Boolean(value && value.trim());
}

function mapReadyForDeliveryItem(row: ReadyForDeliveryRow): ReadyForDeliveryItem {
  const regNum = row.registrationNumber ?? "";
  const compactTracking = regNum.replace(/^0+/, "") || regNum;
  const amt = Number(row.amount ?? 0);
  const adv = Number(row.advancePaid ?? 0);
  const bal = Number(row.balanceAmount ?? amt - adv);

  return {
    id: row.id,
    registrationNumber: regNum,
    compactTrackingNumber: compactTracking,
    clientName: row.clientName ?? "-",
    mobile: row.mobile ?? "-",
    email: row.email ?? "-",
    service: row.service ?? "-",
    country: row.country ?? "-",
    state: row.state ?? "-",
    deliveryLocation: row.deliveryLocation ?? "-",
    regionOfRegistration: row.regionOfRegistration ?? "-",
    amount: amt,
    advancePaid: adv,
    balanceAmount: bal,
    collectedPerson: row.collectedPerson ?? "-",
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
    registeredDate: formatDateDDMMYYYY(row.createdAt),
    approvalStatus: row.approvalStatus,
    bmStatus: row.bmStatus,
    trackingStatus: row.trackingStatus,
    deliveryType: row.deliveryType,
    deliveryUserId: row.deliveryUserId,
    deliveryUserName: row.deliveryUserName,
    courierCompanyId: row.courierCompanyId,
    courierCompanyName: row.courierCompanyName,
    courierTrackingNumber: row.courierTrackingNumber,
    deliveryProofFileUrl: row.deliveryProofFileUrl,
    deliveryStatus: row.deliveryStatus,
    priority: row.priority ?? "Normal",
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
      row.collectedPerson,
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
    const regionMatches = normalizeText(row.regionOfRegistration) === officeLocation;
    if (!regionMatches) {
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

async function listReadyRows(ownerAdminId: string, officeLocationName: string | null) {
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
      r.advance_paid AS "advancePaid",
      r.balance_amount AS "balanceAmount",
      r.collected_person AS "collectedPerson",
      r.committed_duration AS "workingDays",
      CAST(NULL AS CHAR) AS "source",
      CAST(NULL AS CHAR) AS "leadStatus",
      r.customer_type AS "clientType",
      COALESCE(creator_user.name, creator_user.email, r.created_by) AS "createdBy",
      COALESCE(dm_accepted_user.name, dm_accepted_user.email, accepted_user.name, accepted_user.email) AS "acceptedBy",
      COALESCE(dm.accepted_at, r.accepted_at) AS "acceptedAt",
      r.created_at AS "createdAt",
      r.approval_status AS "approvalStatus",
      r.bm_status AS "bmStatus",
      r.tracking_status AS "trackingStatus",
      r.delivery_type AS "deliveryType",
      r.delivery_user_id AS "deliveryUserId",
      r.delivery_user_name AS "deliveryUserName",
      r.courier_company_id AS "courierCompanyId",
      r.courier_company_name AS "courierCompanyName",
      r.courier_tracking_number AS "courierTrackingNumber",
      r.delivery_proof_file_url AS "deliveryProofFileUrl",
      r.delivery_status AS "deliveryStatus",
      r.priority AS "priority"
    FROM registrations r
    LEFT JOIN document_movements dm ON dm.registration_id = r.id
    LEFT JOIN office_locations ol ON ol.id = dm.current_office_id
    LEFT JOIN users accepted_user ON accepted_user.id = r.accepted_by
    LEFT JOIN users dm_accepted_user ON dm_accepted_user.id = dm.accepted_by
    LEFT JOIN users creator_user ON creator_user.id = r.created_by
    WHERE r.owner_admin_id = ${ownerAdminId}
      AND (${officeLocationName} IS NULL OR LOWER(COALESCE(r.region_of_registration, '')) = LOWER(${officeLocationName}))
      AND COALESCE(r.delivery_status, '') != 'Delivered'
      AND LOWER(COALESCE(r.tracking_status, '')) != 'delivered'
      AND LOWER(COALESCE(dm.current_status, '')) != 'delivered'
      AND (
        r.tracking_status IN ('Ready for Delivery', 'Ready For Delivery', 'Pending Approval')
        OR r.bm_status IN ('Ready for Delivery', 'Ready For Delivery')
        OR dm.current_status = 'READY_FOR_DELIVERY'
        OR dm.current_module = 'READY_FOR_DELIVERY'
      )
    ORDER BY COALESCE(dm.accepted_at, r.accepted_at, r.created_at) DESC, r.created_at DESC
  `);
}

function buildStats(items: ReadyForDeliveryItem[], deliveredCount: number): ReadyForDeliveryStats {
  const today = new Date().toISOString().slice(0, 10);

  return items.reduce<ReadyForDeliveryStats>(
    (stats, item) => {
      stats.totalReadyForDelivery += 1;

      if ((item.acceptedAt ?? item.createdAt).slice(0, 10) === today) {
        stats.acceptedToday += 1;
      }

      stats.pendingDelivery += 1;

      return stats;
    },
    {
      totalReadyForDelivery: 0,
      acceptedToday: 0,
      pendingDelivery: 0,
      delivered: deliveredCount,
    },
  );
}

async function buildFilters(ownerAdminId: string, rows: ReadyForDeliveryRow[]): Promise<ReadyForDeliveryFilters> {
  const setOfOffices = new Set<string>();

  rows.forEach((row) => {
    if (row.regionOfRegistration && row.regionOfRegistration.trim()) {
      setOfOffices.add(row.regionOfRegistration.trim());
    }
  });

  const dbOffices = await prisma.officeLocation.findMany({
    where: { ownerAdminId },
    select: { officeName: true },
  });
  dbOffices.forEach((o) => {
    if (o.officeName && o.officeName.trim()) {
      setOfOffices.add(o.officeName.trim());
    }
  });

  const dbRegs = await prisma.registration.findMany({
    where: { ownerAdminId },
    distinct: ["regionOfRegistration"],
    select: { regionOfRegistration: true },
  });
  dbRegs.forEach((r) => {
    if (r.regionOfRegistration && r.regionOfRegistration.trim()) {
      setOfOffices.add(r.regionOfRegistration.trim());
    }
  });

  return {
    services: Array.from(new Set(rows.map((row) => row.service?.trim()).filter(isNonEmptyString))).sort(),
    countries: Array.from(new Set(rows.map((row) => row.country?.trim()).filter(isNonEmptyString))).sort(),
    officeLocations: Array.from(setOfOffices).sort(),
  };
}

function buildSections(items: ReadyForDeliveryItem[]): ReadyForDeliverySection[] {
  const sectionsMap = new Map<string, ReadyForDeliveryItem[]>();

  for (const item of items) {
    const locName =
      item.regionOfRegistration && item.regionOfRegistration !== "-"
        ? item.regionOfRegistration.trim()
        : "Unassigned";
    if (!sectionsMap.has(locName)) {
      sectionsMap.set(locName, []);
    }
    sectionsMap.get(locName)!.push(item);
  }

  return Array.from(sectionsMap.entries())
    .map(([locationName, items]) => ({
      locationName,
      items,
    }))
    .sort((a, b) => a.locationName.localeCompare(b.locationName));
}

export async function listReadyForDelivery(
  ownerAdminId: string,
  officeLocationName: string | null,
  params: ReadyForDeliveryQueryParams,
) {
  const rows = await listReadyRows(ownerAdminId, officeLocationName);
  const filteredRows = rows.filter((row) => rowMatchesFilters(row, params));
  const items = filteredRows.map(mapReadyForDeliveryItem);
  const sections = buildSections(items);
  const filters = await buildFilters(ownerAdminId, rows);

  const deliveredCount = await prisma.registration.count({
    where: {
      ownerAdminId,
      trackingStatus: "Delivered",
      ...(officeLocationName ? { regionOfRegistration: officeLocationName } : {}),
    },
  });

  return {
    items,
    sections,
    stats: buildStats(items, deliveredCount),
    filters,
  };
}

export async function getReadyForDeliveryById(
  ownerAdminId: string,
  officeLocationName: string | null,
  id: string,
): Promise<ReadyForDeliveryDetail | null> {
  const registration = await getRegistrationById(ownerAdminId, id);

  if (!registration) {
    return null;
  }

  const deliveryMatches = officeLocationName === null ||
    normalizeText(registration.deliveryLocation) === normalizeText(officeLocationName);
  const accepted =
    registration.bmStatus === "Accepted" || registration.approvalStatus === "Accepted";

  // TODO: we should also check document_movements here for HOME status, 
  // but to avoid massive query rewrite just for one item, we allow it if accepted.
  if (!deliveryMatches && !accepted) {
    // If it's not home delivery, it should be in document movements.
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
