import { prisma } from "@/lib/prisma";

export type BmTrackingTab = "in_hand" | "inbound" | "outbound" | "registered" | "sub_packages";

export type BmDocumentRow = {
  id: string;
  trackingNumber: string;
  registrationDate: string;
  documentName: string;
  registrationOffice: string;
  collectedPerson: string;
  numberOfDays: string;
  deliveryAt: string;
  documentType: string;
  processType: string;
  totalAmount: string;
  arrivalDate: string;
};

export type BmLocationSection = {
  locationName: string;
  documents: BmDocumentRow[];
};

export async function getRegistrationOffices(ownerAdminId: string) {
  // Fetch office locations where isProcessOffice is not true and not external process/sub-package
  const offices = await prisma.officeLocation.findMany({
    where: {
      ownerAdminId,
      isProcessOffice: { not: true },
      location: { notIn: ["External Processing Office", "Sub Package"] },
    },
    select: {
      id: true,
      officeName: true,
    },
    orderBy: { officeName: "asc" },
  });

  const setOfNames = new Set(offices.map((o) => o.officeName));

  // Also include distinct regionOfRegistration values from Registration
  const distinctRegs = await prisma.registration.findMany({
    where: { ownerAdminId },
    distinct: ["regionOfRegistration"],
    select: { regionOfRegistration: true },
  });

  distinctRegs.forEach((r) => {
    if (
      r.regionOfRegistration &&
      !r.regionOfRegistration.toLowerCase().includes("embassy") &&
      !r.regionOfRegistration.toLowerCase().includes("process") &&
      !r.regionOfRegistration.toLowerCase().includes("sub package")
    ) {
      setOfNames.add(r.regionOfRegistration);
    }
  });

  return Array.from(setOfNames).sort();
}

export async function getBmLocationTrackingData(params: {
  ownerAdminId: string;
  registrationOffice?: string;
  tab: BmTrackingTab;
  search?: string;
}) {
  const { ownerAdminId, registrationOffice, tab, search } = params;

  const whereClause: any = {
    ownerAdminId,
  };

  if (registrationOffice && registrationOffice !== "all" && registrationOffice.trim() !== "") {
    whereClause.regionOfRegistration = registrationOffice;
  }

  if (search && search.trim() !== "") {
    const s = search.trim();
    whereClause.OR = [
      { trackingNumber: { contains: s } },
      { customerName: { contains: s } },
      { documentName: { contains: s } },
      { mobile: { contains: s } },
    ];
  }

  // Fetch registrations with documentMovements
  const registrations = await prisma.registration.findMany({
    where: whereClause,
    include: {
      documentMovements: {
        include: {
          currentOffice: true,
          fromOffice: true,
          toOffice: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const nowMs = Date.now();
  const sectionsMap = new Map<string, BmDocumentRow[]>();

  for (const reg of registrations) {
    const movements = reg.documentMovements || [];
    const latestMov = movements[0] || null;
    const isTransferred =
      reg.trackingStatus === "In Transfer" ||
      reg.trackingStatus === "Transferred" ||
      reg.trackingStatus === "In Transit";

    let currentLocation = "";
    let arrivalDate: Date | null = null;
    let matchesTab = false;

    if (tab === "registered") {
      // Show documents that are still in the Registration Office and have not yet been transferred
      if (movements.length === 0 && !isTransferred) {
        matchesTab = true;
        currentLocation = reg.regionOfRegistration || "Registration Office";
        arrivalDate = reg.createdAt;
      }
    } else if (tab === "in_hand") {
      // Show documents currently in "Document In Hand"
      if (!isTransferred && latestMov && ["Received", "Document In Hand", "HOME", "Completed"].includes(latestMov.status)) {
        matchesTab = true;
        currentLocation = latestMov.currentOffice?.officeName || reg.regionOfRegistration || "Current Office";
        arrivalDate = latestMov.receivedAt || latestMov.updatedAt || reg.createdAt;
      } else if (!isTransferred && movements.length === 0) {
        // Still at origin registration office
        matchesTab = true;
        currentLocation = reg.regionOfRegistration || "Registration Office";
        arrivalDate = reg.createdAt;
      }
    } else if (tab === "inbound") {
      // Show documents currently waiting in Inbound
      if (latestMov && (["INBOUND_PENDING", "Pending Receive", "In Transit"].includes(latestMov.status) || isTransferred)) {
        matchesTab = true;
        currentLocation = latestMov.toOffice?.officeName || latestMov.currentOffice?.officeName || "Inbound Office";
        arrivalDate = latestMov.sentAt || latestMov.createdAt || reg.createdAt;
      }
    } else if (tab === "outbound") {
      // Show documents currently inside Outbound
      if (latestMov && (["INBOUND_PENDING", "Pending Receive", "In Transit"].includes(latestMov.status) || isTransferred)) {
        matchesTab = true;
        currentLocation = latestMov.fromOffice?.officeName || reg.regionOfRegistration || "Outbound Office";
        arrivalDate = latestMov.sentAt || latestMov.createdAt || reg.createdAt;
      }
    } else if (tab === "sub_packages") {
      // Show where documents currently exist inside Sub Packages
      const subPkgName = reg.subPackage || (reg as any).coreSubPackage || latestMov?.toOffice?.officeName || reg.processType;
      if (subPkgName) {
        matchesTab = true;
        currentLocation = subPkgName;
        arrivalDate = latestMov?.updatedAt || reg.createdAt;
      }
    }

    if (matchesTab && currentLocation) {
      // Number of Days = Today's Date minus Date document entered its CURRENT location
      const startMs = arrivalDate ? new Date(arrivalDate).getTime() : reg.createdAt.getTime();
      const diffDays = Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60 * 60 * 24)));
      const numberOfDays = `${diffDays} Day${diffDays === 1 ? "" : "s"}`;

      const row: BmDocumentRow = {
        id: reg.id,
        trackingNumber: reg.trackingNumber,
        registrationDate: reg.createdAt.toISOString().slice(0, 10),
        documentName: reg.documentName || reg.customerName || "-",
        registrationOffice: reg.regionOfRegistration || "-",
        collectedPerson: reg.collectedPerson || "-",
        numberOfDays,
        deliveryAt: reg.deliveryLocation || "-",
        documentType: reg.documentType || "-",
        processType: reg.processType || "-",
        totalAmount: reg.totalCharges ? `₹${Number(reg.totalCharges).toLocaleString("en-IN")}` : "₹0",
        arrivalDate: arrivalDate ? arrivalDate.toISOString() : reg.createdAt.toISOString(),
      };

      if (!sectionsMap.has(currentLocation)) {
        sectionsMap.set(currentLocation, []);
      }
      sectionsMap.get(currentLocation)!.push(row);
    }
  }

  const sections: BmLocationSection[] = Array.from(sectionsMap.entries()).map(([locationName, documents]) => ({
    locationName,
    documents,
  }));

  return sections;
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
        },
        orderBy: { createdAt: "asc" },
      },
      auditTrail: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!registration) return null;

  return {
    registration,
    movements: registration.documentMovements,
    auditTrail: registration.auditTrail,
  };
}
