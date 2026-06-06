import { prisma } from "@/lib/prisma";
import type {
  WelcomeCallFilters,
  WelcomeCallItem,
  WelcomeCallResponse,
  WelcomeCallStats,
  WelcomeCallStatus,
} from "@/features/welcome-call/types/welcome-call.types";

type WelcomeCallQueryParams = {
  scope?: "today" | "all";
  status?: string;
  search?: string;
};

type WelcomeCallRegistrationRow = {
  id: string;
  trackingNumber: string;
  customerName: string;
  mobile: string;
  processType: string | null;
  documentType: string | null;
  externalProcess: string | null;
  totalCharges: { toString(): string } | number;
  committedDuration: string | null;
  regionOfRegistration: string | null;
  registeredPerson: string | null;
  commissionToName: string | null;
  createdBy: string | null;
  createdAt: Date;
  welcomeCallStatus: string;
  welcomeCalledBy: string | null;
  welcomeCalledAt: Date | null;
  address: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  customerType: string | null;
  priority: string | null;
  paymentStatus: string;
  paymentMode: string | null;
  advancePaid: { toString(): string } | number;
  balanceAmount: { toString(): string } | number;
  trackingStatus: string;
  approvalStatus: string;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getTodayStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getYesterdayRange() {
  const todayStart = getTodayStart();
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(todayStart.getDate() - 1);

  return {
    start: yesterdayStart,
    end: todayStart,
  };
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function toWelcomeCallItem(registration: WelcomeCallRegistrationRow): WelcomeCallItem {
  return {
    id: registration.id,
    registrationNumber: registration.trackingNumber,
    clientName: registration.customerName,
    mobile: registration.mobile,
    processType: registration.processType ?? registration.documentType ?? "-",
    service: registration.documentType ?? registration.externalProcess ?? registration.processType ?? "-",
    totalCharges: Number(registration.totalCharges),
    committedDuration: registration.committedDuration ?? "-",
    officeLocation: registration.regionOfRegistration ?? "-",
    assignedUser:
      registration.registeredPerson ??
      registration.commissionToName ??
      registration.createdBy ??
      "-",
    registrationDate: formatDate(registration.createdAt),
    registrationDateIso: registration.createdAt.toISOString(),
    welcomeCallStatus: registration.welcomeCallStatus,
    welcomeCalledBy: registration.welcomeCalledBy ?? null,
    welcomeCalledAt: registration.welcomeCalledAt?.toISOString() ?? null,
    documentType: registration.documentType ?? "-",
    address: registration.address ?? "-",
    country: registration.country ?? "-",
    state: registration.state ?? "-",
    city: registration.city ?? "-",
    customerType: registration.customerType ?? "-",
    priority: registration.priority ?? "-",
    paymentStatus: registration.paymentStatus,
    paymentMode: registration.paymentMode ?? "-",
    advancePaid: Number(registration.advancePaid),
    balanceAmount: Number(registration.balanceAmount),
    registeredPerson: registration.registeredPerson ?? "-",
    createdBy: registration.createdBy ?? "-",
    trackingStatus: registration.trackingStatus,
    approvalStatus: registration.approvalStatus,
  };
}

function buildStats(items: WelcomeCallItem[]): WelcomeCallStats {
  return items.reduce<WelcomeCallStats>(
    (stats, item) => {
      stats.totalWelcomeCallsToday += 1;

      if (item.welcomeCallStatus === "Completed") {
        stats.completedCalls += 1;
      } else if (item.welcomeCallStatus === "Not Reachable") {
        stats.missedCalls += 1;
      } else {
        stats.pendingCalls += 1;
      }

      return stats;
    },
    {
      totalWelcomeCallsToday: 0,
      completedCalls: 0,
      pendingCalls: 0,
      missedCalls: 0,
    },
  );
}

function buildFilters(): WelcomeCallFilters {
  return {
    statuses: ["Today", "Pending", "Completed", "Not Reachable", "Followup Required", "Called"],
  };
}

function matchesStatus(item: WelcomeCallItem, status?: string) {
  if (!status || status === "Today") {
    return item.welcomeCallStatus !== "Completed";
  }

  return normalize(item.welcomeCallStatus) === normalize(status);
}

function matchesSearch(item: WelcomeCallItem, search?: string) {
  const query = search?.trim().toLowerCase();
  if (!query) return true;

  return [
    item.clientName,
    item.mobile,
    item.registrationNumber,
    item.service,
    item.processType,
  ].some((value) => value.toLowerCase().includes(query));
}

async function listWelcomeCallRegistrations(
  ownerAdminId: string,
  officeLocationName: string,
  scope: "today" | "all",
) {
  const yesterdayRange = getYesterdayRange();

  return prisma.registration.findMany({
    where: {
      ownerAdminId,
      regionOfRegistration: {
        equals: officeLocationName,
        mode: "insensitive",
      },
      ...(scope === "today"
        ? {
            createdAt: {
              gte: yesterdayRange.start,
              lt: yesterdayRange.end,
            },
          }
        : {}),
    },
    select: {
      id: true,
      trackingNumber: true,
      customerName: true,
      mobile: true,
      processType: true,
      documentType: true,
      externalProcess: true,
      totalCharges: true,
      committedDuration: true,
      regionOfRegistration: true,
      registeredPerson: true,
      commissionToName: true,
      createdBy: true,
      createdAt: true,
      welcomeCallStatus: true,
      welcomeCalledBy: true,
      welcomeCalledAt: true,
      address: true,
      country: true,
      state: true,
      city: true,
      customerType: true,
      priority: true,
      paymentStatus: true,
      paymentMode: true,
      advancePaid: true,
      balanceAmount: true,
      trackingStatus: true,
      approvalStatus: true,
    },
    orderBy: [{ createdAt: "desc" }, { trackingNumber: "asc" }],
  });
}

export async function listWelcomeCalls(
  ownerAdminId: string,
  officeLocationName: string,
  params: WelcomeCallQueryParams,
): Promise<WelcomeCallResponse> {
  const scope = params.scope ?? "today";
  const rows = await listWelcomeCallRegistrations(ownerAdminId, officeLocationName, scope);
  const allItems = rows.map(toWelcomeCallItem);
  const items = allItems.filter((item) => matchesStatus(item, params.status) && matchesSearch(item, params.search));
  const { start } = getYesterdayRange();

  return {
    items,
    stats: buildStats(allItems),
    filters: buildFilters(),
    queueDate: start.toISOString(),
  };
}

export async function updateWelcomeCallStatus(args: {
  ownerAdminId: string;
  officeLocationName: string;
  registrationId: string;
  status: WelcomeCallStatus;
  performedBy: string;
}) {
  const { ownerAdminId, officeLocationName, registrationId, status, performedBy } = args;
  const { start, end } = getYesterdayRange();

  const registration = await prisma.registration.findFirst({
    where: {
      id: registrationId,
      ownerAdminId,
      regionOfRegistration: {
        equals: officeLocationName,
        mode: "insensitive",
      },
      createdAt: {
        gte: start,
        lt: end,
      },
    },
    select: {
      id: true,
      trackingNumber: true,
      welcomeCallStatus: true,
    },
  });

  if (!registration) {
    return null;
  }

  const now = new Date();
  const updated = await prisma.registration.update({
    where: { id: registration.id },
    data: {
      welcomeCallStatus: status,
      welcomeCalledBy: performedBy,
      welcomeCalledAt: now,
      auditTrail: {
        create: {
          action: status === "Completed" ? "Welcome call completed" : "Welcome call updated",
          description:
            status === "Completed"
              ? `Welcome call completed for ${registration.trackingNumber}.`
              : `Welcome call status changed to ${status} for ${registration.trackingNumber}.`,
          performedBy,
        },
      },
    },
    select: {
      id: true,
      trackingNumber: true,
      customerName: true,
      mobile: true,
      processType: true,
      documentType: true,
      externalProcess: true,
      totalCharges: true,
      committedDuration: true,
      regionOfRegistration: true,
      registeredPerson: true,
      commissionToName: true,
      createdBy: true,
      createdAt: true,
      welcomeCallStatus: true,
      welcomeCalledBy: true,
      welcomeCalledAt: true,
      address: true,
      country: true,
      state: true,
      city: true,
      customerType: true,
      priority: true,
      paymentStatus: true,
      paymentMode: true,
      advancePaid: true,
      balanceAmount: true,
      trackingStatus: true,
      approvalStatus: true,
    },
  });

  return toWelcomeCallItem(updated);
}
